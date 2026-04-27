# TheBreakfastClub | Badminton Club Management

A professional-grade badminton club management application built with **Next.js 15**, **Tailwind CSS**, and **Firebase**. Designed for live court queuing, deterministic matchmaking, and daily financial tracking.

## 🚀 Key Features

### 🏟️ Live Dashboard
- **Real-time Court Status**: Monitor active matches and available courts.
- **Match Timers**: Track live play duration for every court.
- **Live Player Swapping**: Replace any player in an active match with someone from the queue without stopping the game.
- **Quick Match**: Instant matchmaking with one click.
- **Waiting Match Queue**: Create matches even when courts are busy and assign them later.

### 🧠 Matchmaking Engine (Pure Logic)
Unlike simple FIFO systems, our deterministic engine ensures fair and socially diverse games:
- **Priority Selection**: Always picks players based on the fewest games played today, using **Bench Time** as the primary tie-breaker.
- **Skill Balancing**: Minimizes the skill gap between teams.
- **Social Variety (Repeat Partner Penalty)**: Strictly discourages repeat partnerships.
  - **100pt Penalty** if players were partners in the immediate last game.
  - **25pt Penalty** if they were partners 2 games ago.

### 🏆 Daily Rankings & Players
- **Win Rate Leaderboard**: Rankings are calculated daily based on `Wins / Games Played`.
- **Skill Tracking**: Player levels range from `1 - Novice` to `7 - Elite`.
- **Roster Management**: Easily add, edit, or remove players from the club database.

### 💰 Financials & Fees
- **Daily Split Calculator**: Enter shuttle, court, and entry fees to automatically calculate the per-player split.
- **Payment Tracking**: Mark players as "Paid" or "Pending" in real-time.
- **QR Code Payments**: Upload your club's GCash, Maya, or Bank QR codes in Settings.

### 🎨 Customization
- **Club Branding**: Upload your club's official logo in Settings.
- **Appearance**: Full support for **Light Mode** and **Dark Mode**.

## 🛠️ Tech Stack
- **Framework**: Next.js 15 (App Router)
- **Styling**: Tailwind CSS + ShadCN UI
- **Storage**: Browser LocalStorage (Real-time reactive state)
- **Icons**: Lucide React
- **Animations**: Tailwind CSS Animate

---
*Built with ❤️ for TheBreakfastClub Badminton Community.*
