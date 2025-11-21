# Dream Ludo - WebSocket Server Setup Guide

This guide provides a complete blueprint for creating the Node.js WebSocket server required to run the Dream Ludo game.

## 1. Core Responsibilities

Your server must handle:
- **WebSocket Connections:** Accepting and managing client connections.
- **Authentication:** Verifying players using Supabase JWTs sent by the client.
- **Game Rooms:** Creating, managing, and cleaning up game sessions.
- **Game Logic:** Processing player actions (rolling dice, moving pieces).
- **State Synchronization:** Broadcasting the updated game state to all players in a room after every action.
- **Chat:** Relaying chat messages between players in a room.

---

## 2. Recommended File Structure

```
/dream-ludo-server
├── .env
├── game.js
├── package.json
└── server.js
```

- **`server.js`**: The main entry point. Handles server setup and WebSocket connections.
- **`game.js`**: Contains all the core Ludo game logic (creating games, handling moves, etc.).
- **`package.json`**: Defines project dependencies and scripts.
- **`.env`**: Stores secret keys and environment variables.

---

## 3. `package.json`

This file lists the essential libraries you'll need. Create this file and run `npm install`.

```json
{
  "name": "dream-ludo-server",
  "version": "1.0.0",
  "description": "WebSocket server for Dream Ludo",
  "main": "server.js",
  "scripts": {
    "start": "node server.js"
  },
  "dependencies": {
    "@supabase/supabase-js": "^2.0.0",
    "dotenv": "^16.0.0",
    "express": "^4.18.0",
    "uuid": "^9.0.0",
    "ws": "^8.10.0"
  }
}
```

---

## 4. Environment Variables (`.env`)

Create a `.env` file in the root of your server project. **Do not commit this file to Git.**

```
PORT=8080
SUPABASE_URL="YOUR_SUPABASE_URL"
SUPABASE_ANON_KEY="YOUR_SUPABASE_ANON_KEY"
SUPABASE_JWT_SECRET="YOUR_SUPABASE_JWT_SECRET_FROM_SETTINGS"
```
You can find your JWT Secret in your Supabase project settings under `API > JWT Settings`.

---

## 5. Server Logic (`server.js`)

Here is a high-level structure and explanation for your `server.js`.

```javascript
// server.js
require('dotenv').config();
const express = require('express');
const { createServer } = require('http');
const { WebSocketServer } = require('ws');
const { createClient } = require('@supabase/supabase-js');
const { v4: uuidv4 } = require('uuid');
// You will need to create the game logic in game.js
// const { createNewGame, handlePlayerAction } = require('./game');

// --- Server & Supabase Setup ---
const PORT = process.env.PORT || 8080;
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

const app = express();
const server = createServer(app);
const wss = new WebSocketServer({ server });

// Simple health check endpoint for Render
app.get('/health', (req, res) => res.send('OK'));

// In-memory storage for active games. In production, consider Redis.
const games = new Map();

// --- WebSocket Server Logic ---
wss.on('connection', (ws, req) => {
    const gameCode = req.url.slice(1); // Get game code from URL: /<code>
    
    // 1. Await Authentication
    ws.on('message', async (message) => {
        const { action, payload } = JSON.parse(message);

        if (action === 'AUTH') {
            try {
                // 2. Verify JWT from Supabase
                const { data: { user }, error } = await supabase.auth.getUser(payload.token);
                if (error || !user) {
                    ws.send(JSON.stringify({ type: 'AUTH_FAILURE', payload: { message: 'Invalid token.' } }));
                    ws.close();
                    return;
                }
                
                // Attach user info to the WebSocket connection
                ws.userId = user.id;
                ws.send(JSON.stringify({ type: 'AUTH_SUCCESS' }));

                // 3. Add player to the game room
                let game = games.get(gameCode);
                // If the game doesn't exist, this is where you'd create it
                // based on your game creation logic (e.g., from a tournament).
                if (!game) {
                    // This logic needs to be robust. For now, let's assume game is created elsewhere.
                    ws.close(); return;
                }
                
                game.players.set(ws.userId, ws); // Add player WebSocket to the room
                
                // 4. Broadcast the updated game state to everyone in the room
                broadcastGameState(gameCode);

            } catch (err) {
                ws.send(JSON.stringify({ type: 'AUTH_FAILURE', payload: { message: 'Auth error.' } }));
                ws.close();
            }
        } else {
            // Handle other game actions (ROLL_DICE, MOVE_PIECE, etc.)
            // These should only be processed AFTER a user is authenticated.
            if (!ws.userId) return; // Ignore messages from unauthenticated clients

            // You would call your game logic handler here
            // const updatedGameState = handlePlayerAction(gameCode, ws.userId, action, payload);
            // games.set(gameCode, updatedGameState);
            
            // And broadcast the new state
            broadcastGameState(gameCode);
        }
    });

    ws.on('close', () => {
        // Handle player disconnection
        // Remove player from the game room and notify others.
        let game = games.get(gameCode);
        if (game && ws.userId) {
            game.players.delete(ws.userId);
            // You might want to update the game state to mark player as disconnected
            broadcastGameState(gameCode);
        }
    });
});

function broadcastGameState(gameCode) {
    const game = games.get(gameCode);
    if (!game) return;

    const statePayload = JSON.stringify({
        type: 'GAME_STATE_UPDATE',
        payload: game.state // `game.state` should be the GameState object
    });

    for (const client of game.players.values()) {
        if (client.readyState === client.OPEN) {
            client.send(statePayload);
        }
    }
}

server.listen(PORT, () => console.log(`Server listening on port ${PORT}`));
```

---

## 6. Deployment on Render

1.  Push your server code to a GitHub repository.
2.  On Render, create a new "Web Service".
3.  Connect it to your server's GitHub repository.
4.  **Environment**: Node.
5.  **Build Command**: `npm install`.
6.  **Start Command**: `npm start`.
7.  **Environment Variables**: Go to the "Environment" tab and add the `PORT`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `SUPABASE_JWT_SECRET` from your `.env` file.
8.  Deploy! Your server URL will look like `https://your-app-name.onrender.com`. Use this in your frontend's `config.ts` file with `wss://`.

This guide should provide everything you need to get your server running correctly.
