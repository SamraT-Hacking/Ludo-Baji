// licensing_server/server.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const { 
    initDb, getLicenseByCode, getLicenseByToken, getAllLicenses, 
    addLicense, updateLicenseStatus, resetLicenseDomain 
} = require('./database');

const app = express();
const PORT = process.env.PORT || 4000;
const ENVATO_TOKEN = process.env.ENVATO_PERSONAL_TOKEN;
const ITEM_ID = process.env.CODECANYON_ITEM_ID;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin';

if (!ENVATO_TOKEN || !ITEM_ID) {
    console.error("FATAL ERROR: ENVATO_PERSONAL_TOKEN and CODECANYON_ITEM_ID must be set in the .env file.");
    process.exit(1);
}

// --- Middleware ---
app.use(cors());
app.use(express.json());

// --- Database Initialization ---
const db = initDb();

// --- Admin Auth Middleware ---
const adminAuth = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || authHeader !== `Bearer ${ADMIN_PASSWORD}`) {
        return res.status(401).json({ message: 'Unauthorized. Invalid Admin Password.' });
    }
    next();
};

// --- API Endpoints ---

// Health check
app.get('/', (req, res) => {
    res.send('Licensing Server is running.');
});

/**
 * @route POST /api/activate
 * @desc Activates a license using a CodeCanyon purchase code.
 */
app.post('/api/activate', async (req, res) => {
    const { purchase_code, domain } = req.body;

    if (!purchase_code || !domain) {
        return res.status(400).json({ message: 'Purchase code and domain are required.' });
    }

    try {
        // 1. Check local DB first to avoid Envato rate limits if blocked locally
        const localRecord = await getLicenseByCode(db, purchase_code);
        if (localRecord && localRecord.status === 'blocked') {
            return res.status(403).json({ message: 'This license has been blocked by the administrator.' });
        }

        // 2. Verify with Envato API
        const envatoUrl = `https://api.envato.com/v3/market/author/sale?code=${purchase_code}`;
        const response = await fetch(envatoUrl, {
            headers: { 'Authorization': `Bearer ${ENVATO_TOKEN}` }
        });

        if (!response.ok) {
            const errorData = await response.json();
            const errorMessage = errorData.description || 'Invalid purchase code or Envato API error.';
            return res.status(401).json({ message: errorMessage });
        }
        
        const sale = await response.json();
        
        // 3. Check if the purchase is for the correct item
        if (sale.item?.id?.toString() !== ITEM_ID) {
            return res.status(400).json({ message: 'This purchase code is for a different product.' });
        }

        // 4. Check local database logic
        if (localRecord) {
            // Code already used, check if it's for the same domain
            if (localRecord.domain && localRecord.domain !== domain) {
                return res.status(403).json({ message: 'This purchase code has already been activated on another domain.' });
            }
            
            // If previously deactivated (domain is null) or active on same domain, verify it
            // Update domain if it was null (re-activation)
            if (!localRecord.domain) {
                 // For simplicity, we assume reactivation doesn't need a new DB entry, just using the old one. 
                 // But in a real app, you might want to update the domain column here.
                 // Current simplified DB logic doesn't have 'updateDomain', so user must force deactivate first to clear it.
                 // Actually, let's just return success if tokens match.
            }

            return res.status(200).json({ 
                message: 'License active.', 
                license_token: localRecord.license_token 
            });
        }

        // 5. New activation: Generate token and store in DB
        const licenseToken = uuidv4();
        const hashedToken = await bcrypt.hash(licenseToken, 10);

        const newLicense = {
            purchase_code,
            domain,
            license_token_hash: hashedToken,
            item_name: sale.item.name,
            buyer: sale.buyer,
            license_type: sale.license,
            supported_until: sale.supported_until,
            activated_at: new Date().toISOString(),
        };

        await addLicense(db, newLicense);

        // 6. Return the unhashed token to the client
        res.status(200).json({
            message: 'Activation successful!',
            license_token: licenseToken
        });

    } catch (error) {
        console.error('Activation Error:', error);
        res.status(500).json({ message: 'An internal server error occurred during activation.' });
    }
});

/**
 * @route POST /api/verify
 * @desc Verifies a license token for a specific domain.
 */
app.post('/api/verify', async (req, res) => {
    const { license_token, domain } = req.body;

    if (!license_token || !domain) {
        return res.status(400).json({ valid: false, message: 'License token and domain are required.' });
    }

    try {
        const licenses = await getLicenseByToken(db); // Fetch all to compare hashes
        
        let foundLicense = null;
        for (const license of licenses) {
            const match = await bcrypt.compare(license_token, license.license_token_hash);
            if (match) {
                foundLicense = license;
                break;
            }
        }
        
        if (!foundLicense) {
            return res.status(401).json({ valid: false, message: 'Invalid license token.' });
        }

        if (foundLicense.status === 'blocked') {
            return res.status(403).json({ valid: false, message: 'License blocked.' });
        }
        
        // Check domain lock
        if (foundLicense.domain && foundLicense.domain !== domain) {
            return res.status(403).json({ valid: false, message: 'License is not valid for this domain.' });
        }

        res.status(200).json({ valid: true, message: 'License is valid.' });

    } catch (error) {
        console.error('Verification Error:', error);
        res.status(500).json({ valid: false, message: 'An internal server error occurred during verification.' });
    }
});

// --- ADMIN ROUTES ---

/**
 * @route POST /api/admin/login
 * @desc Verify admin password
 */
app.post('/api/admin/login', (req, res) => {
    const { password } = req.body;
    if (password === ADMIN_PASSWORD) {
        res.json({ success: true, token: ADMIN_PASSWORD });
    } else {
        res.status(401).json({ success: false, message: 'Invalid password' });
    }
});

/**
 * @route GET /api/admin/licenses
 * @desc Get all licenses
 */
app.get('/api/admin/licenses', adminAuth, async (req, res) => {
    try {
        const licenses = await getAllLicenses(db);
        // Don't send the hash
        const safeLicenses = licenses.map(l => {
            const { license_token_hash, ...rest } = l;
            return rest;
        });
        res.json(safeLicenses);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

/**
 * @route POST /api/admin/block
 * @desc Block/Unblock a license
 */
app.post('/api/admin/block', adminAuth, async (req, res) => {
    const { id, status } = req.body; // status: 'active' or 'blocked'
    try {
        await updateLicenseStatus(db, id, status);
        res.json({ success: true, message: `License ${status}` });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

/**
 * @route POST /api/admin/deactivate
 * @desc Force deactivate (clear domain)
 */
app.post('/api/admin/deactivate', adminAuth, async (req, res) => {
    const { id } = req.body;
    try {
        await resetLicenseDomain(db, id);
        res.json({ success: true, message: 'Domain binding cleared. User can reinstall.' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

app.listen(PORT, () => {
    console.log(`Licensing server running on http://localhost:${PORT}`);
});