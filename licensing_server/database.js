
// licensing_server/database.js
const { Pool } = require('pg');

// Use the DATABASE_URL environment variable provided by Render
const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
    console.error("CRITICAL ERROR: DATABASE_URL environment variable is missing.");
    console.error("Please create a PostgreSQL database on Render and link it.");
    // We don't exit here to allow the script to load, but initDb will fail.
}

// Create a connection pool
const pool = new Pool({
    connectionString: connectionString,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

const initDb = () => {
    console.log('Connecting to PostgreSQL database...');
    
    // Licenses Table
    const createLicensesTable = `
        CREATE TABLE IF NOT EXISTS licenses (
            id SERIAL PRIMARY KEY,
            purchase_code TEXT UNIQUE NOT NULL,
            domain TEXT,
            license_token_hash TEXT,
            item_name TEXT,
            buyer TEXT,
            license_type TEXT,
            supported_until TEXT,
            activated_at TEXT,
            status TEXT DEFAULT 'active'
        );
    `;

    // Settings Table
    const createSettingsTable = `
        CREATE TABLE IF NOT EXISTS system_settings (
            key TEXT PRIMARY KEY,
            value TEXT
        );
    `;

    // Insert default setting if not exists
    const insertDefaultSetting = `
        INSERT INTO system_settings (key, value) 
        VALUES ('server_mode', 'live') 
        ON CONFLICT (key) DO NOTHING;
    `;

    pool.query(createLicensesTable)
        .then(() => pool.query(createSettingsTable))
        .then(() => pool.query(insertDefaultSetting))
        .then(() => console.log('Database tables initialized successfully.'))
        .catch(err => console.error('Error initializing database tables:', err));

    return pool;
};

// --- Helper for query execution ---
// Unlike SQLite, pg uses $1, $2 for parameterized queries instead of ?

const getLicenseByCode = async (db, code) => {
    const sql = "SELECT * FROM licenses WHERE purchase_code = $1";
    const res = await db.query(sql, [code]);
    return res.rows[0];
};

const getLicenseByDomain = async (db, domain) => {
    const sql = "SELECT * FROM licenses WHERE domain = $1";
    const res = await db.query(sql, [domain]);
    return res.rows[0];
};

const getAllLicenses = async (db) => {
    const sql = "SELECT * FROM licenses ORDER BY activated_at DESC";
    const res = await db.query(sql);
    return res.rows;
};

const addLicense = async (db, license) => {
    const sql = `
        INSERT INTO licenses (purchase_code, domain, license_token_hash, item_name, buyer, license_type, supported_until, activated_at, status)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'active')
        RETURNING id
    `;
    const params = [
        license.purchase_code, license.domain, license.license_token_hash, 
        license.item_name, license.buyer, license.license_type, 
        license.supported_until, license.activated_at
    ];
    
    const res = await db.query(sql, params);
    return { id: res.rows[0].id };
};

const updateLicenseStatus = async (db, id, status) => {
    const sql = "UPDATE licenses SET status = $1 WHERE id = $2";
    const res = await db.query(sql, [status, id]);
    return { changes: res.rowCount };
};

const resetLicenseDomain = async (db, id) => {
    const sql = "UPDATE licenses SET domain = NULL WHERE id = $1";
    const res = await db.query(sql, [id]);
    return { changes: res.rowCount };
};

const deleteLicense = async (db, id) => {
    const sql = "DELETE FROM licenses WHERE id = $1";
    const res = await db.query(sql, [id]);
    return { changes: res.rowCount };
};

// --- Settings Functions ---

const getSetting = async (db, key) => {
    const sql = "SELECT value FROM system_settings WHERE key = $1";
    const res = await db.query(sql, [key]);
    return res.rows[0] ? res.rows[0].value : null;
};

const updateSetting = async (db, key, value) => {
    const sql = `
        INSERT INTO system_settings (key, value) 
        VALUES ($1, $2) 
        ON CONFLICT(key) DO UPDATE SET value = $2
    `;
    const res = await db.query(sql, [key, value]);
    return { changes: res.rowCount };
};

module.exports = {
    initDb,
    getLicenseByCode,
    getLicenseByDomain,
    getAllLicenses,
    addLicense,
    updateLicenseStatus,
    resetLicenseDomain,
    deleteLicense,
    getSetting,
    updateSetting
};
