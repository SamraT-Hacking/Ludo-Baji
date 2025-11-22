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
        const sql = `
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
        `;
        db.run(sql, (err) => {
            if (err) {
                console.error("Error creating table:", err.message);
            } else {
                // Migration: Attempt to add status column if it doesn't exist (for existing dbs)
                const alter = "ALTER TABLE licenses ADD COLUMN status TEXT DEFAULT 'active'";
                db.run(alter, (err) => {
                    // Ignore error if column already exists
                });
            }
        });
    }
});

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


module.exports = {
    initDb: () => db,
    getLicenseByCode,
    getLicenseByToken,
    getAllLicenses,
    addLicense,
    updateLicenseStatus,
    resetLicenseDomain
};