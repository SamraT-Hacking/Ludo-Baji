
# License Management Admin Panel

This is the administrative dashboard for managing your CodeCanyon licenses. It connects to your **Licensing Server** to view buyers, block licenses, and reset domain locks.

## 📋 Prerequisites

*   **Node.js** (v14 or higher)
*   The **Licensing Server** must be running.

## 🚀 Setup Instructions

### 1. Installation

Open your terminal, navigate to this folder, and install dependencies:

```bash
cd license_admin_panel
npm install
```

### 2. Configuration

By default, the panel assumes your Licensing Server is running at `http://localhost:4000`.

If your server is running on a different port or a live domain (e.g., on Render/Vercel), open `src/App.jsx` and update the `API_URL` constant at the top:

```javascript
// src/App.jsx
const API_URL = 'https://your-live-server-url.com/api'; 
```

### 3. Running for Development

Start the development server:

```bash
npm run dev
```

Open your browser to the URL shown (usually `http://localhost:5174`).

### 4. Building for Production

To create a static build for deployment (e.g., to a static host like Netlify or Vercel):

```bash
npm run build
```

The output files will be in the `dist` folder.

## 🔑 Login

Use the **Admin Password** you defined in the `.env` file of your **Licensing Server** (`ADMIN_PASSWORD`).
