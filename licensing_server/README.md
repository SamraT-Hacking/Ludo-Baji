
# CodeCanyon Product Licensing Server (Supabase/PostgreSQL Version)

This server activates and validates your purchase. It is configured to connect to a **Supabase PostgreSQL** database for robust, free, and persistent data storage.

## 🚀 Setup Instructions

### Step 1: Supabase Setup (Database)

1.  Go to [Supabase](https://supabase.com/) and create a new project.
2.  Once created, go to **Project Settings (Gear Icon) -> Database**.
3.  Scroll down to **Connection parameters**.
4.  **IMPORTANT:** We recommend using the **Direct Connection** (Port 5432) or **Session Mode** (Port 5432) for this server to ensure table creation works correctly.
5.  Copy the **URI**. It looks like:
    `postgres://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:5432/postgres`
6.  Replace `[password]` with the database password you created in step 1.

### Step 2: Deploy Licensing Server to Render

1.  Push this `licensing_server` folder code to GitHub.
2.  Create a **New Web Service** on Render connected to that repo.
3.  **Environment Variables**:
    *   `PORT`: `4000`
    *   `ENVATO_PERSONAL_TOKEN`: (Your Envato Token)
    *   `CODECANYON_ITEM_ID`: (Your Item ID)
    *   `DATABASE_URL`: (Paste the Supabase URI from Step 1)
4.  **Build Command**: `npm install`
5.  **Start Command**: `npm start`

The server will automatically create the `licenses` and `system_settings` tables in your Supabase database when it starts.

### Step 3: Frontend Configuration

Update your React App's `src/App.tsx` (or `App.tsx` root) to point to your Render URL:

```javascript
const LICENSE_SERVER_URL = 'https://your-web-service-name.onrender.com';
```

## 📋 Prerequisites

*   **Node.js**
*   **Supabase Account** (Free Tier is sufficient)
*   **Envato Personal Token**

## Features

- **Persistent Data**: Uses Supabase PostgreSQL.
- **Easy Management**: You can view/edit the `licenses` table directly in the Supabase Table Editor if needed.
- **Envato Verification**: Checks purchase codes against the official API.
- **Domain Locking**: Restricts license usage to one active domain.
