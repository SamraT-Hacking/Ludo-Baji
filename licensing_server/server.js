
// licensing_server/server.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const { 
    initDb, getLicenseByCode, getLicenseByToken, getAllLicenses, 
    addLicense, updateLicenseStatus, resetLicenseDomain, deleteLicense,
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
// Allow all origins for easier testing, especially with localhost ports
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'DELETE', 'OPTIONS']
}));
app.use(express.json());

// Request Logger
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    next();
});

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
    // --- DETAILED DEBUG LOGGING ---
    console.log("------------------------------------------------");
    console.log("INCOMING ACTIVATION REQUEST");
    console.log("Body Received:", req.body);
    console.log("Headers:", req.headers);
    console.log("------------------------------------------------");

    const { purchase_code, domain } = req.body;

    if (!purchase_code || !domain) {
        console.error("Error: Missing purchase_code or domain in body.");
        return res.status(400).json({ message: 'Purchase code and domain are required.' });
    }

    try {
        // 0. Check Server Mode
        const serverMode = await getSetting(db, 'server_mode') || 'live';
        const isTestMode = serverMode === 'test';
        
        console.log(`Server Mode: ${serverMode}`);

        // --- TEST MODE LOGIC ---
        if (isTestMode) {
            // 1. Developer Bypass
            if (purchase_code === 'TEST-CODE') {
                return res.status(200).json({
                    message: 'Test Activation Successful (Dev Bypass)',
                    license_token: 'TEST-TOKEN-FOR-DEVELOPMENT'
                });
            }

            // 2. MOCK Simulation (For testing flow without owning a sold item)
            if (purchase_code.startsWith('MOCK-')) {
                // Simulate a database entry without calling Envato
                const mockLicenseToken = uuidv4();
                const hashedToken = await bcrypt.hash(mockLicenseToken, 10);
                
                const existing = await getLicenseByCode(db, purchase_code);
                if (existing) {
                     return res.status(200).json({ 
                        message: 'Mock License active (Already Existed).', 
                        license_token: existing.license_token_hash 
                    });
                }

                const newLicense = {
                    purchase_code,
                    domain,
                    license_token_hash: hashedToken,
                    item_name: "Mock Product (Test Mode)",
                    buyer: "Mock Buyer",
                    license_type: "Regular License (Mock)",
                    supported_until: new Date(Date.now() + 365*24*60*60*1000).toISOString(),
                    activated_at: new Date().toISOString(),
                };

                await addLicense(db, newLicense);

                return res.status(200).json({
                    message: 'Mock Activation Successful! (Test Mode)',
                    license_token: mockLicenseToken
                });
            }
        }

        // --- STANDARD VALIDATION FLOW ---

        // 1. Check local DB first
        const localRecord = await getLicenseByCode(db, purchase_code);
        if (localRecord && localRecord.status === 'blocked') {
            return res.status(403).json({ message: 'This license has been blocked by the administrator.' });
        }

        // 2. Verify with Envato API
        console.log(`Verifying with Envato API for code: ${purchase_code}`);
        const envatoUrl = `https://api.envato.com/v3/market/author/sale?code=${purchase_code}`;
        const response = await fetch(envatoUrl, {
            headers: { 'Authorization': `Bearer ${ENVATO_TOKEN}` }
        });

        if (!response.ok) {
            const errorData = await response.json();
            const description = errorData.description || 'Unknown error';
            console.error("Envato API Error:", description);
            
            // Provide clear feedback if user tries to verify a bought code instead of sold code
            if (description.includes('No sale belonging to the current user')) {
                return res.status(404).json({ 
                    message: `Envato Verification Failed. \n\nReason: The API could not find a sale for this code in your account.\n\nNote: You can only verify codes for items YOU SOLD as an author. You cannot verify items you BOUGHT from others.` 
                });
            }

            return res.status(401).json({ message: `Envato API Error: ${description}` });
        }
        
        const sale = await response.json();
        console.log("Envato Sale Found:", sale.item.name);
        
        // 3. Item ID Check
        // In TEST MODE, we allow any Item ID (so you can test with other purchase codes you sold)
        // In LIVE MODE, strict check.
        if (!isTestMode && sale.item?.id?.toString() !== ITEM_ID) {
            console.error(`Item ID Mismatch. Expected: ${ITEM_ID}, Got: ${sale.item?.id}`);
            return res.status(400).json({ message: 'This purchase code is for a different product.' });
        }

        // 4. Local Database Logic (Domain Locking)
        if (localRecord) {
            if (localRecord.domain && localRecord.domain !== domain) {
                console.warn(`Domain mismatch. Locked to: ${localRecord.domain}, Request from: ${domain}`);
                return res.status(403).json({ message: `This purchase code is already active on: ${localRecord.domain}` });
            }
            
            return res.status(200).json({ 
                message: 'License already active for this domain.', 
                license_token: "EXISTING_ACTIVATION" 
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
        console.log("New license activated successfully.");

        res.status(200).json({
            message: `Activation successful! (${isTestMode ? 'Test Mode' : 'Live'})`,
            license_token: licenseToken
        });

    } catch (error) {
        console.error('Activation Exception:', error);
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
    
    if (license_token === 'EXISTING_ACTIVATION') {
         return res.status(200).json({ valid: true, message: 'Re-verified existing session.' });
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

// NEW: Delete License Endpoint
app.delete('/api/admin/license/:id', adminAuth, async (req, res) => {
    const { id } = req.params;
    try {
        await deleteLicense(db, id);
        res.json({ success: true, message: 'License deleted successfully.' });
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
