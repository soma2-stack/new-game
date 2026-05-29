# Dead Bell - Multiplayer Server Setup

## 1. Install server dependencies
```bash
npm install express socket.io uuid
```

## 2. Start the server
```bash
npm run server
```
Runs on port 3001 by default.

## 3. Start the game client (separate terminal)
```bash
npm run dev
```

## 4. Configure environment
Copy `.env.example` to `.env` - keep `VITE_SERVER_URL=http://localhost:3001` for local play.

## How it works
- Host clicks **Host Game** -> gets a 6-char room code
- Others click **Join Game** -> enter the room code
- Host clicks **Start Game** -> launches for all players
- Up to 4 players per room

## Deploy the server
- Railway, Render, or Fly.io all work great for free hosting
- Update VITE_SERVER_URL in .env to your deployed URL
