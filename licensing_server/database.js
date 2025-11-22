// licensing_server/database.js
const sqlite3 = require('sqlite3').verbose();

const DB_SOURCE = "licenses.db";

let db = new sqlite3.Database(DB_SOURCE, (err) => {
    if (err) {
        // Cannot open database
        console.error(err.message);
        throw err;
    } else {
        console.log('Connected to the SQLite database.');
        
        // Licenses Table
        db.run(`
            CREATE TABLE IF NOT EXISTS licenses (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                purchase_code TEXT UNIQUE NOT NULL,
                domain TEXT,
                license_token_hash TEXT NOT NULL,
                item_name TEXT,
                buyer TEXT,
                license_type TEXT,
                supported_until TEXT,
                activated_at TEXT,
                status TEXT DEFAULT 'active'
            )
        `, (err) => {
            if (err) console.error("Error creating licenses table:", err.message);
        });

        // Settings Table (For Test/Live Mode)
        db.run(`
            CREATE TABLE IF NOT EXISTS system_settings (
                key TEXT PRIMARY KEY,
                value TEXT
            )
        `, (err) => {
            if (!err) {
                // Insert default mode if not exists
                const insert = "INSERT OR IGNORE INTO system_settings (key, value) VALUES (?, ?)";
                db.run(insert, ["server_mode", "live"]);
            }
        });
    }
});

// --- License Functions ---

const getLicenseByCode = (db, code) => {
    return new Promise((resolve, reject) => {
        const sql = "SELECT * FROM licenses WHERE purchase_code = ?";
        db.get(sql, [code], (err, row) => {
            if (err) reject(err);
            resolve(row);
        });
    });
};

const getLicenseByToken = (db) => {
    return new Promise((resolve, reject) => {
        const sql = "SELECT * FROM licenses";
        db.all(sql, [], (err, rows) => {
            if (err) reject(err);
            resolve(rows);
        });
    });
};

const getAllLicenses = (db) => {
    return new Promise((resolve, reject) => {
        const sql = "SELECT * FROM licenses ORDER BY activated_at DESC";
        db.all(sql, [], (err, rows) => {
            if (err) reject(err);
            resolve(rows);
        });
    });
};

const addLicense = (db, license) => {
    return new Promise((resolve, reject) => {
        const sql = `
            INSERT INTO licenses (purchase_code, domain, license_token_hash, item_name, buyer, license_type, supported_until, activated_at, status)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'active')
        `;
        const params = [
            license.purchase_code, license.domain, license.license_token_hash, 
            license.item_name, license.buyer, license.license_type, 
            license.supported_until, license.activated_at
        ];
        db.run(sql, params, function(err) {
            if (err) reject(err);
            resolve({ id: this.lastID });
        });
    });
};

const updateLicenseTokenHash = (db, purchaseCode, newHash) => {
    return new Promise((resolve, reject) => {
        const sql = "UPDATE licenses SET license_token_hash = ? WHERE purchase_code = ?";
        db.run(sql, [newHash, purchaseCode], function(err) {
            if (err) reject(err);
            resolve({ changes: this.changes });
        });
    });
};

const updateLicenseStatus = (db, id, status) => {
    return new Promise((resolve, reject) => {
        const sql = "UPDATE licenses SET status = ? WHERE id = ?";
        db.run(sql, [status, id], function(err) {
            if (err) reject(err);
            resolve({ changes: this.changes });
        });
    });
};

const resetLicenseDomain = (db, id) => {
    return new Promise((resolve, reject) => {
        const sql = "UPDATE licenses SET domain = NULL WHERE id = ?";
        db.run(sql, [id], function(err) {
            if (err) reject(err);
            resolve({ changes: this.changes });
        });
    });
};

const deleteLicense = (db, id) => {
    return new Promise((resolve, reject) => {
        const sql = "DELETE FROM licenses WHERE id = ?";
        db.run(sql, [id], function(err) {
            if (err) reject(err);
            resolve({ changes: this.changes });
        });
    });
};

// --- Settings Functions ---

const getSetting = (db, key) => {
    return new Promise((resolve, reject) => {
        const sql = "SELECT value FROM system_settings WHERE key = ?";
        db.get(sql, [key], (err, row) => {
            if (err) reject(err);
            resolve(row ? row.value : null);
        });
    });
};

const updateSetting = (db, key, value) => {
    return new Promise((resolve, reject) => {
        const sql = "INSERT INTO system_settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = ?";
        db.run(sql, [key, value, value], function(err) {
            if (err) reject(err);
            resolve({ changes: this.changes });
        });
    });
};

module.exports = {
    initDb: () => db,
    getLicenseByCode,
    getLicenseByToken,
    getAllLicenses,
    addLicense,
    updateLicenseTokenHash,
    updateLicenseStatus,
    resetLicenseDomain,
    deleteLicense,
    getSetting,
    updateSetting
};