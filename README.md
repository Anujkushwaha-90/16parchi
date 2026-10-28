# 🎴 16 PARCHI — Online Real-Time Multiplayer Web Game

An authentic, production-grade, real-time multiplayer implementation of the traditional Indian slips collection table game **“16 PARCHI”**. Players can sign in with Google, add friends, create private rooms with shareable codes, play the authoritative 4-identical-parchi collection game, and receive final podium rankings similar to Ludo.

---

## 🌟 Key Features

### 1. Premium Gaming Aesthetic & Sound
- **Table Felt & Gold Accents**: Dark charcoal background (`#080c0e`), rich emerald table felt (`#0d3827`), warm gold foils, and subtle ivory.
- **Realistic Parchi Cards**: Folded parchment styling with wax seal crests (Raja, Rani, Chor, Sipahi) and 3D hover/tilt effects.
- **Synthesized Web Audio Engine**: Zero external audio asset dependencies. Synthesizes card swooshes, paper taps, clockwork timer ticks, trumpet fanfares, and golden win chords with master mute and volume controls.
- **Confetti Celebrations**: Dynamic canvas confetti bursts on winning declarations.

### 2. Exact 16 Parchi Game Rules & Clockwise Transfer
- **Deck Setup**: Exactly 16 parchis total — 4 distinct identities $\times$ 4 copies each.
- **Themes**:
  - `👑 Royal Court`: Raja (King), Rani (Queen), Chor (Thief), Sipahi (Guard)
  - `🌸 Four Seasons`: Spring, Summer, Autumn, Winter
  - `🔥 Primal Elements`: Agni (Fire), Jal (Water), Prithvi (Earth), Vayu (Air)
  - `🦁 Jungle Beasts`: Lion, Eagle, Tiger, Elephant
- **Authoritative Dealing**: Shuffled using cryptographically secure `crypto.randomBytes` Fisher-Yates shuffle. Exactly 4 cards dealt to each of the 4 players.
- **Circular Clockwise Passing**: Player $i$ chooses 1 unwanted parchi and passes it to $(i + 1) \pmod 4$.
- **Set Completion & Declaration**:
  - A player completes a set when holding 4 identical parchis (e.g. 4x Raja).
  - The player declares **"16 PARCHI!"** and claims their rank (1st Place 🏆, 2nd Place 🥈, 3rd Place 🥉).
  - The remaining 4th player automatically receives 4th place.

### 3. Server-Authoritative Anti-Cheat & Zero-Leak Security
- **No Client Cheats**: Only the authenticated player's own cards are sent over the wire.
- **Hidden Hands**: Other players' hands appear only as card counts (`cardCount: 4`) with face-down cards. No hidden identities exist in HTML attributes, network payloads, or Redux/React states.
- **Atomic Validation**: Transfers validate sender turn, hand ownership, clockwise recipient, and enforce rate limits against replay attacks.

### 4. Friends & Presence System
- Search players by username or unique friend code (e.g. `PARCHI-7892`).
- Send, accept, decline, or cancel friend requests.
- Live online/in-game presence indicator.
- Send instant private room invitations to online friends with 1-click links and automatic expiration.

### 5. Private Rooms & AI Bot Support
- Generate unique 6-character room codes (e.g. `PR8K2M`).
- 1-click copy code & direct join link (`?room=PR8K2M`).
- Configurable turn timer (15s, 20s, 30s) and card themes.
- **AI Bot Fill**: Hosts can fill open seats with smart AI bots (`Chanakya`, `Birbal`, `Tenali`, `Vikram`) to practice or test the game anytime with 1–4 players!

---

## 🛠️ Technology Stack

| Layer | Technologies |
|---|---|
| **Frontend** | React 19, TypeScript, Vite, Tailwind CSS, Lucide Icons, Canvas Confetti |
| **Backend** | Node.js, Express, Socket.IO, TypeScript, tsx |
| **Database** | SQLite (with Prisma ORM) — easily switched to PostgreSQL |
| **Authentication** | Firebase Authentication (Google OAuth) + Local JWT Session Verification |
| **Audio** | Native Web Audio API Synthesizer (Zero asset latency) |
| **Testing** | Vitest unit and integration test suite |

---

## 🚀 Quick Start Guide

### Prerequisites
- Node.js (v18+)
- npm

### 1. Clone & Install Dependencies
```bash
# In the root repository directory
cd server
npm install

cd ../client
npm install
```

### 2. Configure Environment Variables

**Server (`server/.env`)**:
```env
DATABASE_URL="file:./dev.db"
PORT=4000
CLIENT_URL="http://localhost:5173"
JWT_SECRET="parchi_dev_jwt_secret_token_key_16_parchi"
NODE_ENV="development"
# Optional: Path to Firebase Service Account if using live Firebase Admin
# FIREBASE_SERVICE_ACCOUNT_PATH="./firebase-admin-key.json"
```

**Client (`client/.env`)**:
```env
VITE_API_BASE="http://localhost:4000/api"
VITE_SOCKET_URL="http://localhost:4000"

# Optional: Add your Firebase web configuration for live Google Sign-In
# VITE_FIREBASE_API_KEY="your-api-key"
# VITE_FIREBASE_AUTH_DOMAIN="your-project.firebaseapp.com"
# VITE_FIREBASE_PROJECT_ID="your-project"
# VITE_FIREBASE_STORAGE_BUCKET="your-project.appspot.com"
# VITE_FIREBASE_MESSAGING_SENDER_ID="your-sender-id"
# VITE_FIREBASE_APP_ID="your-app-id"
```

### 3. Initialize Database
```bash
cd server
npx prisma generate
npx prisma db push
```

### 4. Run Development Servers
Open two terminals or run concurrently:

**Terminal 1 (Backend Server)**:
```bash
cd server
npm run dev
# Server listening on http://localhost:4000
```

**Terminal 2 (Frontend Client)**:
```bash
cd client
npm run dev
# Client running on http://localhost:5173
```

Visit **http://localhost:5173** in your browser!

---

## 🧪 Automated Testing

Run the full automated test suite verifying deck composition, security hand isolation, circular turns, and win detection:

```bash
cd server
npm test
```

Test Results:
- `✓ generates a valid 16-parchi deck with exactly 4 identities and 4 copies each`
- `✓ generates alternative valid themes (seasons, elements, animals)`
- `✓ deals exactly 4 cards to each of the 4 players on start`
- `✓ strictly hides secret hands in public state (Zero-Leak Security)`
- `✓ enforces circular clockwise transfer (Seat 0 -> Seat 1)`
- `✓ rejects duplicate or replayed transfers in the same turn cycle`
- `✓ rejects declaration if player does NOT have 4 identical cards`
- `✓ correctly assigns 1st, 2nd, 3rd, and 4th place in authoritative event order`

---

## 🖥️ Production Build & Deployment

### Build Server
```bash
cd server
npm run build
npm start
```

### Build Client
```bash
cd client
npm run build
# Serves optimized static assets in dist/
```

### Deploying Database to PostgreSQL
To switch from SQLite to PostgreSQL on Supabase, Neon, or AWS RDS:
1. Update `server/prisma/schema.prisma`:
   ```prisma
   datasource db {
     provider = "postgresql"
     url      = env("DATABASE_URL")
   }
   ```
2. Update `server/.env` with your PostgreSQL connection string:
   ```env
   DATABASE_URL="postgresql://user:password@host:5432/16parchi"
   ```
3. Run `npx prisma db push`.
