1. [README.md]:
   - Hero & Badges: Tech stack badges (React 19, Vite 8, Express 5, Socket.io, Google Gemini, MySQL, Three.js) and branded header.
   - Game Flow: From user authentication to progressive disclosure lobby, genre voting, tie-breakers, 3-tier round elimination, and podium awards.
     -System Architecture: Interaction between frontend components, WebSocket server, Express auth sessions, MySQL pool, and Google Gemini AI engine with fallback banks.
   - Feature Highlights:
     - Real-time multiplayer rooms with 6-character lobby codes & auto-start countdowns.
     - Google Gemini AI dynamic question generation + resilient offline fallback question bank.
     - Interactive genre voting wheel with audio cues and sudden-death tie-breakers.
     - 3-Round tournament elimination mechanics (Easy ➔ Medium ➔ Hard).
     - Solo/Practice **Play vs. AI Bots** mode with configurable bot counts and distinct personality traits.
     - Custom Quiz Creator & interactive **Live Host Spectator Dashboard**.
     - Level ladder (1,000 XP/level), persistent medals (Gold, Silver, Bronze), and win/loss tracking.
     - Three.js 3D interactive particle background & neo-brutalist gaming aesthetics.
   - Quick Start & Installation: Detailed steps to clone, configure environment variables, and run full-stack with `npm run dev`.
   - Database Setup Note: Explains how `backend/db.js` automatically creates the `quiz_game` database, required tables, and auto-migrates missing columns on startup.
   - Scoring Reference Table: Speed bonus calculation breakdown (up to 10 points per question).
   - API & WebSocket Reference: Complete table of Express REST endpoints and core Socket.IO event payloads.

2. [backend/.env.example]:
   - Safe environment template with placeholders for `PORT`, `GEMINI_API_KEY`, `DB_HOST`, `DB_USER`, `DB_PASSWORD`, `DB_PORT`, and `DB_NAME`.

3. [.gitignore]:
   - Added `!.env.example` exception so the template can be tracked in Git while keeping real credentials secure.
