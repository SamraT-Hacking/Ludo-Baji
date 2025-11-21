// licensing_server/server.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = 'jsonwebtoken'; // This is a placeholder, as the user did not provide a JWT library.
const { v4: uuidv4 } = require('uuid');
const { initDb, getLicenseByCode, getLicenseByToken, addLicense } = require('./database');

const app = express();
const PORT = process.env.PORT || 4000;
const ENVATO_TOKEN = process.env.ENVATO_PERSONAL_TOKEN;
const ITEM_ID = process.env.CODECANYON_ITEM_ID;
const JWT_SECRET = process.env.JWT_SECRET || 'default-secret-key-please-change';

if (!ENVATO_TOKEN || !ITEM_ID) {
    console.error("FATAL ERROR: ENVATO_PERSONAL_TOKEN and CODECANYON_ITEM_ID must be set in the .env file.");
    process.exit(1);
}

// --- Middleware ---
app.use(cors());
app.use(express.json());

// --- Database Initialization ---
const db = initDb();

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
        // 1. Verify with Envato API
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
        
        // 2. Check if the purchase is for the correct item
        if (sale.item?.id?.toString() !== ITEM_ID) {
            return res.status(400).json({ message: 'This purchase code is for a different product.' });
        }

        // 3. Check local database for existing activation
        const existingLicense = await getLicenseByCode(db, purchase_code);

        if (existingLicense) {
            // Code already used, check if it's for the same domain
            if (existingLicense.domain !== domain) {
                return res.status(403).json({ message: 'This purchase code has already been activated on another domain.' });
            }
            // If same domain, re-issue the token (or just confirm activation)
            return res.status(200).json({ 
                message: 'License already active on this domain.', 
                license_token: existingLicense.license_token 
            });
        }

        // 4. New activation: Generate token and store in DB
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

        // 5. Return the unhashed token to the client
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
        
        // Check domain lock
        if (foundLicense.domain !== domain) {
            return res.status(403).json({ valid: false, message: 'License is not valid for this domain.' });
        }

        res.status(200).json({ valid: true, message: 'License is valid.' });

    } catch (error) {
        console.error('Verification Error:', error);
        res.status(500).json({ valid: false, message: 'An internal server error occurred during verification.' });
    }
});

/**
 * @route GET /api/version
 * @desc Placeholder for auto-update functionality.
 */
app.get('/api/version', (req, res) => {
    // In a real scenario, you'd read this from a file or config
    res.json({
        latest_version: "1.0.0",
        release_notes_url: "https://your-website.com/changelog"
    });
});

app.listen(PORT, () => {
    console.log(`Licensing server running on http://localhost:${PORT}`);
});
