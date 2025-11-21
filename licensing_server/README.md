# CodeCanyon Product Licensing Server

This server is required to activate and validate your purchase of the script. It connects to the official Envato API to verify purchase codes and locks each license to a single domain to prevent unauthorized redistribution.

## Features

- **Envato API Verification**: Securely validates purchase codes.
- **Domain Locking**: Ties a license to the domain it was activated on.
- **SQLite Database**: Self-contained, file-based database. No external database setup is required.
- **Simple Setup**: Can be deployed on any Node.js hosting service (like Render, Vercel, etc.) or a traditional VPS.

---

## 🚀 Setup Instructions

Follow these steps to get your licensing server running.

### Step 1: Get Your Envato Personal Token

1.  Go to the [Envato API personal tokens page](https://build.envato.com/my-tokens).
2.  Click **"Create a new token"**.
3.  Give your token a name (e.g., "My App License Server").
4.  Under "Permissions needed", make sure to check the following box:
    *   **View and search Envato sites**
    *   **View your Envato Account username**
    *   **Verify purchases of your items**
5.  Accept the terms and click **"Create Token"**.
6.  **Important**: Copy your token immediately. You will **not** be able to see it again.

### Step 2: Configure Environment Variables

Create a file named `.env` in this `licensing_server` directory. Copy the contents of `.env.example` into it and fill in the values:

```env
# Server Port
PORT=4000

# Your Envato Personal Token from Step 1
ENVATO_PERSONAL_TOKEN=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# The Item ID of the product on CodeCanyon.
# You can find this in the URL of the item page. (e.g., for https://codecanyon.net/item/my-script/12345, the ID is 12345)
CODECANYON_ITEM_ID=12345678
```

### Step 3: Install Dependencies

Open your terminal in the `licensing_server` directory and run:

```bash
npm install
```

### Step 4: Run the Server

Start the server with:

```bash
npm start
```

You should see the message: `Licensing server running on http://localhost:4000`.

---

## 📦 Deployment

You can deploy this server to any Node.js hosting provider.

### Example: Deploying on Render.com (Free Tier available)

1.  Push this `licensing_server` directory to its own GitHub repository.
2.  On Render, create a new **"Web Service"**.
3.  Connect it to your new GitHub repository.
4.  Configure the service:
    *   **Name**: `my-license-server` (or anything you like)
    *   **Environment**: Node
    *   **Build Command**: `npm install`
    *   **Start Command**: `npm start`
5.  Go to the **"Environment"** tab for your new service.
6.  Add the environment variables from your `.env` file (`PORT`, `ENVATO_PERSONAL_TOKEN`, `CODECANYON_ITEM_ID`).
7.  Click **"Create Web Service"**.

Render will automatically deploy your server. Once it's live, you will get a URL like `https://my-license-server.onrender.com`.

### Final Step: Update Frontend Configuration

After deploying your licensing server, you must update the URL in your main React application.

Open `src/App.tsx` (or `App.tsx` in the root) and change the `LICENSE_SERVER_URL` constant to your live server URL:

```javascript
// In App.tsx
const LICENSE_SERVER_URL = 'https://my-license-server.onrender.com';
```

Your application is now fully protected!
