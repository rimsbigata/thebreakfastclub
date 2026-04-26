# TheBreakfastClub | Badminton Club Management

A professional-grade badminton club management application built with **Next.js 15**, **Tailwind CSS**, and **Firebase**. Designed for live court queuing, deterministic matchmaking, and daily financial tracking.

## 🚀 Key Features

### 🏟️ Live Dashboard
- **Real-time Court Status**: Monitor active matches and available courts.
- **Match Timers**: Track live play duration for every court.
- **Live Player Swapping**: Replace any player in an active match with someone from the queue without stopping the game.
- **Quick Match**: Instant matchmaking with one click.

### 🧠 Matchmaking Engine (Pure Logic)
Unlike simple FIFO systems, our deterministic engine ensures fair and socially diverse games:
- **Priority Selection**: Always picks the 4 players with the fewest games played today.
- **Skill Balancing**: Minimizes the skill gap between teams (Goal: perfect 10 vs 10 matches).
- **Social Variety (Repeat Partner Penalty)**: Strictly discourages repeat partnerships.
  - **100pt Penalty** if players were partners in the immediate last game.
  - **25pt Penalty** if they were partners 2 games ago.
- **Result**: The algorithm prioritizes social diversity over perfect skill balance when a repeat partner is detected.

### 🏆 Daily Rankings & Players
- **Win Rate Leaderboard**: Rankings are calculated daily based on `Wins / Games Played`.
- **Skill Tracking**: Player levels range from `1 - Novice` to `7 - Elite`.
- **Roster Management**: Easily add or remove players from the club database.

### 💰 Financials & Fees
- **Daily Split Calculator**: Enter shuttle, court, and entry fees to automatically calculate the per-player split.
- **Payment Tracking**: Mark players as "Paid" or "Pending" in real-time.
- **QR Code Payments**: Upload your club's GCash, Maya, or Bank QR codes in Settings for quick scan-to-pay access.
- **CSV Export**: Export the day's payment records for external bookkeeping.

### 🎨 Customization
- **Club Branding**: Upload your club's official logo in Settings to brand the entire app dashboard and splash screen.
- **Appearance**: Toggle between **Light Mode** and **Dark Mode** based on your environment.

## 🛠️ Tech Stack
- **Framework**: Next.js 15 (App Router)
- **Styling**: Tailwind CSS + ShadCN UI
- **Database**: Firebase Firestore (Offline-ready with LocalStorage caching)
- **Auth**: Firebase Anonymous Auth (Zero-friction local admin access)
- **Icons**: Lucide React
- **Charts**: Recharts

## 🏁 Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
```

Open [http://localhost:9002](http://localhost:9002) with your browser to see the results.

---
*Built with ❤️ for TheBreakfastClub Badminton Community.*
