// licensing_server/server.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const { 
    initDb, getLicenseByCode, getLicenseByToken, getAllLicenses, 
    addLicense, updateLicenseStatus, resetLicenseDomain,
    getSetting, updateSetting
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
        // 0. Check Server Mode
        const serverMode = await getSetting(db, 'server_mode') || 'live';
        const isTestMode = serverMode === 'test';

        // --- TEST MODE BYPASS ---
        if (isTestMode && purchase_code === 'TEST-CODE') {
            return res.status(200).json({
                message: 'Test Activation Successful (Bypass)',
                license_token: 'TEST-TOKEN-FOR-DEVELOPMENT'
            });
        }

        // 1. Check local DB first
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
            
            // In Test Mode, we strictly test the API. If API fails, we fail.
            // Unless using the magic 'TEST-CODE' above.
            return res.status(401).json({ message: `Envato API Error: ${errorMessage}` });
        }
        
        const sale = await response.json();
        
        // 3. Item ID Check
        // In TEST MODE, we allow any Item ID (so you can test with other purchase codes you own)
        // In LIVE MODE, strict check.
        if (!isTestMode && sale.item?.id?.toString() !== ITEM_ID) {
            return res.status(400).json({ message: 'This purchase code is for a different product.' });
        }

        // 4. Local Database Logic
        if (localRecord) {
            if (localRecord.domain && localRecord.domain !== domain) {
                // In Test Mode, optionally allow domain switching easily?
                // For now, keep domain lock behavior consistent to test the logic.
                return res.status(403).json({ message: 'This purchase code has already been activated on another domain.' });
            }
            
            return res.status(200).json({ 
                message: 'License active.', 
                license_token: localRecord.license_token 
            });
        }

        // 5. New Activation
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

        res.status(200).json({
            message: `Activation successful! (${isTestMode ? 'Test Mode' : 'Live'})`,
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

    // Special handling for Test Token
    if (license_token === 'TEST-TOKEN-FOR-DEVELOPMENT') {
        const serverMode = await getSetting(db, 'server_mode');
        if (serverMode === 'test') {
            return res.status(200).json({ valid: true, message: 'Valid Test Token' });
        } else {
            return res.status(401).json({ valid: false, message: 'Test tokens are not allowed in Live mode.' });
        }
    }

    try {
        const licenses = await getLicenseByToken(db);
        
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

app.post('/api/admin/login', (req, res) => {
    const { password } = req.body;
    if (password === ADMIN_PASSWORD) {
        res.json({ success: true, token: ADMIN_PASSWORD });
    } else {
        res.status(401).json({ success: false, message: 'Invalid password' });
    }
});

app.get('/api/admin/licenses', adminAuth, async (req, res) => {
    try {
        const licenses = await getAllLicenses(db);
        const safeLicenses = licenses.map(l => {
            const { license_token_hash, ...rest } = l;
            return rest;
        });
        res.json(safeLicenses);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

app.post('/api/admin/block', adminAuth, async (req, res) => {
    const { id, status } = req.body;
    try {
        await updateLicenseStatus(db, id, status);
        res.json({ success: true, message: `License ${status}` });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

app.post('/api/admin/deactivate', adminAuth, async (req, res) => {
    const { id } = req.body;
    try {
        await resetLicenseDomain(db, id);
        res.json({ success: true, message: 'Domain binding cleared.' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// --- NEW: System Mode Routes ---

app.get('/api/admin/mode', adminAuth, async (req, res) => {
    try {
        const mode = await getSetting(db, 'server_mode') || 'live';
        res.json({ mode });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

app.post('/api/admin/mode', adminAuth, async (req, res) => {
    const { mode } = req.body; // 'live' or 'test'
    if (!['live', 'test'].includes(mode)) {
        return res.status(400).json({ message: 'Invalid mode. Use "live" or "test".' });
    }
    try {
        await updateSetting(db, 'server_mode', mode);
        res.json({ success: true, mode });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

app.listen(PORT, () => {
    console.log(`Licensing server running on http://localhost:${PORT}`);
});