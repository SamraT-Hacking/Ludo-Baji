
# CodeCanyon Product Licensing Server (PostgreSQL Version)

This server activates and validates your purchase using a PostgreSQL database to ensure data persistence on cloud platforms like Render.

## 🚀 Setup Instructions

### Step 1: Render PostgreSQL Setup

1.  Log in to your **Render Dashboard**.
2.  Click **New +** and select **PostgreSQL**.
3.  Name it (e.g., `license-db`), select the region, and choose the **Free** plan.
4.  Click **Create Database**.
5.  Once created, copy the **Internal Connection String**. It looks like: `postgres://user:password@hostname/dbname`.

### Step 2: Deploy Licensing Server

1.  Push this `licensing_server` code to GitHub.
2.  Create a **New Web Service** on Render connected to that repo.
3.  **Environment Variables**:
    *   `PORT`: `4000`
    *   `ENVATO_PERSONAL_TOKEN`: (Your Envato Token)
    *   `CODECANYON_ITEM_ID`: (Your Item ID)
    *   `DATABASE_URL`: (Paste the connection string from Step 1)
4.  **Build Command**: `npm install`
5.  **Start Command**: `npm start`

### Step 3: Frontend Configuration

Update your React App's `src/App.tsx` (or `App.tsx` root):

```javascript
const LICENSE_SERVER_URL = 'https://your-web-service-name.onrender.com';
```

## 📋 Prerequisites

*   **Node.js**
*   **PostgreSQL Database** (Render Free Tier recommended)
*   **Envato Personal Token**

## Features

- **Persistent Data**: Uses PostgreSQL, so data is safe even if the server restarts.
- **Envato Verification**: Checks purchase codes against the official API.
- **Domain Locking**: Restricts license usage to one active domain.
