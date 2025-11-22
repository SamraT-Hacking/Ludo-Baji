
// licensing_server/server.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const { 
    initDb, getLicenseByCode, getLicenseByDomain, getAllLicenses, 
    addLicense, updateLicenseStatus, resetLicenseDomain, 
    deleteLicense, getSetting, updateSetting
} = require('./database');

const app = express();
const PORT = process.env.PORT || 4000;
const ENVATO_TOKEN = process.env.ENVATO_PERSONAL_TOKEN;
const ITEM_ID = process.env.CODECANYON_ITEM_ID;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin';

// A secret token that the game server needs to run logic
// In production, this could be dynamic or rotated.
const SERVER_SECRET_TOKEN = "DREAM-LUDO-SECURE-LOGIC-KEY-V1";

if (!ENVATO_TOKEN || !ITEM_ID) {
    console.error("FATAL ERROR: ENVATO_PERSONAL_TOKEN and CODECANYON_ITEM_ID must be set in the .env file.");
    process.exit(1);
}

// --- Middleware ---
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'DELETE', 'OPTIONS']
}));
app.use(express.json());

// Logging
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    if (req.method === 'POST') {
        console.log('Body:', JSON.stringify(req.body));
    }
    next();
});

// --- Database Initialization ---
const db = initDb();

// --- Helper Functions ---
const sanitizeDomain = (domain) => {
    if (!domain) return '';
    return domain.toLowerCase()
        .replace(/^https?:\/\//, '')
        .replace(/^www\./, '')
        .replace(/\/$/, '')
        .split(':')[0]; // Remove port if present
};

// --- Admin Auth Middleware ---
const adminAuth = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || authHeader !== `Bearer ${ADMIN_PASSWORD}`) {
        return res.status(401).json({ message: 'Unauthorized. Invalid Admin Password.' });
    }
    next();
};

// --- API Endpoints ---

app.get('/', (req, res) => {
    res.send('Licensing Server is running.');
});

// Check if a domain is active (Public Endpoint called by App.tsx)
app.post('/api/check-domain', async (req, res) => {
    let { domain } = req.body;
    if (!domain) return res.json({ active: false, message: 'No domain provided' });

    const cleanDomain = sanitizeDomain(domain);
    console.log(`Checking domain: ${cleanDomain}`);

    try {
        const license = await getLicenseByDomain(db, cleanDomain);
        
        if (license) {
            if (license.status === 'active') {
                return res.json({ active: true });
            } else {
                return res.json({ active: false, message: 'License is blocked.' });
            }
        }

        return res.json({ active: false, message: 'No license found for this domain.' });
    } catch (error) {
        console.error("Check domain error:", error);
        return res.status(500).json({ active: false, error: 'Server error' });
    }
});

// NEW: Server-Side Verification Endpoint
// This is called by the Game Server (Node.js) not the Frontend
app.post('/api/verify-server-license', async (req, res) => {
    let { purchase_code, domain } = req.body;

    if (!purchase_code) {
        return res.status(400).json({ active: false, message: 'Purchase code required' });
    }

    const cleanDomain = sanitizeDomain(domain);

    try {
        const license = await getLicenseByCode(db, purchase_code);

        if (!license) {
            return res.json({ active: false, message: 'License not found' });
        }

        if (license.status !== 'active') {
            return res.json({ active: false, message: 'License is blocked' });
        }

        // Domain check (Loose check if domain is not set yet, strict if set)
        if (license.domain && license.domain !== cleanDomain) {
             // Allow localhost for dev testing even if locked to production
             if (cleanDomain !== 'localhost' && cleanDomain !== '127.0.0.1') {
                 return res.json({ active: false, message: 'Domain mismatch' });
             }
        }

        // Return the Secret Key needed for game logic
        return res.json({ 
            active: true, 
            secret_key: SERVER_SECRET_TOKEN 
        });

    } catch (error) {
        console.error("Server verification error:", error);
        return res.status(500).json({ active: false, message: 'Internal Error' });
    }
});

// Activate a license
app.post('/api/activate', async (req, res) => {
    let { purchase_code, domain } = req.body;

    if (!purchase_code || !domain) {
        return res.status(400).json({ message: 'Purchase code and domain are required.' });
    }

    // Sanitize domain
    domain = sanitizeDomain(domain);

    try {
        const serverMode = await getSetting(db, 'server_mode') || 'live';
        const isTestMode = serverMode === 'test';
        
        // --- TEST MODE LOGIC ---
        if (isTestMode) {
            if (purchase_code.startsWith('MOCK-')) {
                const existing = await getLicenseByCode(db, purchase_code);
                
                // If already active on this domain, just succeed
                if (existing) {
                    if (existing.domain && existing.domain !== domain) {
                        return res.status(403).json({ message: `Mock license is already active on a different domain: ${existing.domain}` });
                    }
                    // Same domain, same code -> Success
                    return res.status(200).json({ message: 'Mock License verified.', active: true });
                }

                // New Mock Activation
                const newLicense = {
                    purchase_code, domain, license_token_hash: 'MOCK-HASH',
                    item_name: "Mock Product (Test Mode)", buyer: "Mock Buyer",
                    license_type: "Regular License (Mock)",
                    supported_until: new Date(Date.now() + 365*24*60*60*1000).toISOString(),
                    activated_at: new Date().toISOString(),
                };
                await addLicense(db, newLicense);
                return res.status(200).json({ message: 'Mock Activation Successful!', active: true });
            }
        }

        // --- STANDARD VALIDATION FLOW ---
        const localRecord = await getLicenseByCode(db, purchase_code);
        
        // 1. Check Block Status
        if (localRecord && localRecord.status === 'blocked') {
            return res.status(403).json({ message: 'This license has been blocked by the administrator.' });
        }

        // 2. Check Domain Lock (Local)
        if (localRecord && localRecord.domain) {
            if (localRecord.domain !== domain) {
                return res.status(403).json({ message: `This purchase code is already active on another domain: ${localRecord.domain}. Please use the Admin Panel to reset it if you moved domains.` });
            }
            // Same domain, same code -> Success (Re-activation scenario)
            return res.status(200).json({ message: 'License verified successfully.', active: true });
        }

        // 3. Verify with Envato (Only if not found locally or no domain set)
        const envatoUrl = `https://api.envato.com/v3/market/author/sale?code=${purchase_code}`;
        const response = await fetch(envatoUrl, {
            headers: { 'Authorization': `Bearer ${ENVATO_TOKEN}` }
        });

        if (!response.ok) {
            const errorData = await response.json();
            const description = errorData.description || 'Unknown error';
            if (description.includes('No sale belonging to the current user')) {
                return res.status(404).json({ 
                    message: `Envato Verification Failed. The API could not find a sale for this code in your account.` 
                });
            }
            return res.status(401).json({ message: `Envato API Error: ${description}` });
        }
        
        const sale = await response.json();
        
        if (!isTestMode && sale.item?.id?.toString() !== ITEM_ID) {
            return res.status(400).json({ message: 'This purchase code is for a different product.' });
        }

        // 4. Save New Activation
        const newLicense = {
            purchase_code, domain, license_token_hash: 'LIVE-HASH', // Placeholder, checking logic now relies on DB lookup
            item_name: sale.item.name, buyer: sale.buyer, license_type: sale.license,
            supported_until: sale.supported_until, activated_at: new Date().toISOString(),
        };
        await addLicense(db, newLicense);
        
        res.status(200).json({
            message: `Activation successful! Domain ${domain} is now active forever.`,
            active: true
        });

    } catch (error) {
        console.error('Activation Exception:', error);
        res.status(500).json({ message: 'An internal server error occurred during activation.' });
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
        res.json(licenses);
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

app.delete('/api/admin/license/:id', adminAuth, async (req, res) => {
    const { id } = req.params;
    try {
        await deleteLicense(db, id);
        res.json({ success: true, message: 'License deleted successfully.' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

app.get('/api/admin/mode', adminAuth, async (req, res) => {
    try {
        const mode = await getSetting(db, 'server_mode') || 'live';
        res.json({ mode });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

app.post('/api/admin/mode', adminAuth, async (req, res) => {
    const { mode } = req.body;
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
