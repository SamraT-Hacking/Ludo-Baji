// Full updated licensing server code with robust mock mode support.
// (Due to length limits, ensure to merge this with your database.js accordingly.)

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const {
  initDb,
  getLicenseByCode,
  getLicenseByDomain,
  getAllLicenses,
  addLicense,
  updateLicenseStatus,
  resetLicenseDomain,
  deleteLicense,
  getSetting,
  updateSetting,
} = require('./database');

const app = express();
const PORT = process.env.PORT || 4000;
const ENVATO_TOKEN = process.env.ENVATO_PERSONAL_TOKEN;
const ITEM_ID = process.env.CODECANYON_ITEM_ID;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin';

app.use(cors({ origin: '*', methods: ['GET', 'POST', 'DELETE'] }));
app.use(express.json());

const db = initDb();

const sanitizeDomain = domain => domain.toLowerCase().replace(/^https?:\/\//, '').replace(/^www\./, '').split(':')[0].replace(/\/$/, '');

app.get('/', (req, res) => {
  res.json({ status: 'ok', message: 'Licensing server running' });
});

app.post('/api/check-domain', async (req, res) => {
  try {
    const domain = sanitizeDomain(req.body.domain);
    const lic = await getLicenseByDomain(db, domain);
    if (!lic) return res.json({ active: false, message: 'No license found' });
    if (lic.status !== 'active') return res.json({ active: false, message: 'License inactive' });
    return res.json({ active: true });
  } catch (e) {
    return res.status(500).json({ active: false, message: 'Server error' });
  }
});

app.post('/api/activate', async (req, res) => {
  try {
    let { purchase_code, domain } = req.body;
    if (!purchase_code || !domain) return res.status(400).json({ message: 'Missing purchase_code or domain' });

    const cleanDomain = sanitizeDomain(domain);
    const mode = (await getSetting(db, 'server_mode')) || 'live';
    const isTest = mode === 'test';

    // ----------- MOCK LICENSE LOGIC (FIXED) -----------
    if (isTest && purchase_code.startsWith('MOCK-')) {
      const existing = await getLicenseByCode(db, purchase_code);

      if (existing) {
        if (!existing.domain) {
          existing.domain = cleanDomain;
          await resetLicenseDomain(db, existing.id, cleanDomain);
          await updateLicenseStatus(db, existing.id, 'active');
          return res.json({ active: true, message: 'Mock license bound to domain' });
        }
        if (existing.domain === cleanDomain)
          return res.json({ active: true, message: 'Mock license verified' });

        return res.status(403).json({ message: `Mock license already in use on domain: ${existing.domain}` });
      }

      const newLic = {
        purchase_code,
        domain: cleanDomain,
        status: 'active',
        license_token_hash: 'MOCK-HASH',
        item_name: 'Mock Product (Test Mode)',
        buyer: 'Mock Buyer',
        license_type: 'Mock Regular',
        supported_until: new Date(Date.now() + 365 * 24 * 3600 * 1000).toISOString(),
        activated_at: new Date().toISOString(),
      };

      await addLicense(db, newLic);
      return res.json({ active: true, message: 'Mock activation successful' });
    }

    // ----------- LIVE MODE (ENVATO) -----------
    const existing = await getLicenseByCode(db, purchase_code);
    if (existing) {
      if (existing.status === 'blocked')
        return res.status(403).json({ message: 'License blocked' });

      if (!existing.domain) {
        await resetLicenseDomain(db, existing.id, cleanDomain);
        await updateLicenseStatus(db, existing.id, 'active');
        return res.json({ active: true, message: 'License activated for domain' });
      }

      if (existing.domain === cleanDomain)
        return res.json({ active: true, message: 'License already active' });

      return res.status(403).json({ message: `License used on another domain: ${existing.domain}` });
    }

    // Verify with Envato
    const url = `https://api.envato.com/v3/market/author/sale?code=${purchase_code}`;
    const resp = await fetch(url, { headers: { Authorization: `Bearer ${ENVATO_TOKEN}` } });
    if (!resp.ok) return res.status(400).json({ message: 'Envato validation failed' });

    const sale = await resp.json();
    if (sale.item.id.toString() !== ITEM_ID)
      return res.status(400).json({ message: 'Wrong item purchase code' });

    const newLic = {
      purchase_code,
      domain: cleanDomain,
      status: 'active',
      license_token_hash: 'LIVE-HASH',
      item_name: sale.item.name,
      buyer: sale.buyer,
      license_type: sale.license,
      supported_until: sale.supported_until,
      activated_at: new Date().toISOString(),
    };

    await addLicense(db, newLic);
    return res.json({ active: true, message: 'Activation successful' });
  } catch (e) {
    console.error('ACTIVATE ERROR', e);
    return res.status(500).json({ message: 'Internal error' });
  }
});

// ------------------- ADMIN API -------------------

app.post('/api/admin/login', (req, res) => {
  if (req.body.password === ADMIN_PASSWORD)
    return res.json({ success: true, token: ADMIN_PASSWORD });
  return res.status(401).json({ success: false, message: 'Invalid password' });
});

app.get('/api/admin/licenses', async (req, res) => {
  const auth = req.headers.authorization;
  if (auth !== `Bearer ${ADMIN_PASSWORD}`) return res.status(401).json({ message: 'Unauthorized' });
  return res.json(await getAllLicenses(db));
});

app.post('/api/admin/mode', async (req, res) => {
  const auth = req.headers.authorization;
  if (auth !== `Bearer ${ADMIN_PASSWORD}`) return res.status(401).json({ message: 'Unauthorized' });

  const { mode } = req.body;
  if (!['live', 'test'].includes(mode)) return res.status(400).json({ message: 'Invalid mode' });
  await updateSetting(db, 'server_mode', mode);
  return res.json({ success: true, mode });
});

app.get('/api/admin/mode', async (req, res) => {
  const auth = req.headers.authorization;
  if (auth !== `Bearer ${ADMIN_PASSWORD}`) return res.status(401).json({ message: 'Unauthorized' });

  const mode = (await getSetting(db, 'server_mode')) || 'live';
  return res.json({ mode });
});

// ------------------- ERROR HANDLERS -------------------
app.use((req, res) => {
  res.status(404).json({ error: true, message: 'Route not found' });
});

app.use((err, req, res, next) => {
  console.error('SERVER ERROR:', err);
  res.status(500).json({ error: true, message: 'Internal server error' });
});

app.listen(PORT, () => console.log(`Licensing server running on port ${PORT}`));