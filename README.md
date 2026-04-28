# TheBreakfastClub | Badminton Club Management

A professional-grade badminton club management application built with **Next.js 15**, **Tailwind CSS**, and **Firebase**. Designed for live court queuing, deterministic matchmaking, and daily financial tracking.

## 🚀 Key Features

### 🏟️ Live Command Center
- **Real-time Court Status**: Monitor active matches and available courts with high-visibility indicators.
- **Automated Match Flow (Auto-Advance)**: When a match completes, the system automatically pulls the next game from the queue (#1 FIFO) onto the court.
- **Match Timers**: Track live play duration for every court to manage session rotations.
- **Live Player Swapping**: Replace any player in an active match with someone from the bench instantly.
- **Tournament-Grade Scoring**: 
  - **Live Score Tracking**: Large, tactile inputs for real-time updates.
  - **Win-by-2 Logic**: Automatically enforces standard badminton deuce rules.
  - **Zero-Score Safety**: Confirmation prompts to prevent accidental "0" score entries.
  - **Winner Shortcut**: One-tap "T1 Win" or "T2 Win" buttons with automated score assignment.

### 🧠 Matchmaking Engine (Pure Logic)
Our deterministic engine ensures fair and socially diverse games:
- **Priority Selection**: Always picks players based on the fewest games played today, using **Wait Time** as the primary tie-breaker.
- **Skill Balancing**: Minimizes the skill gap between teams while respecting partner history.
- **Social Variety (Repeat Partner Penalty)**:
  - **100pt Penalty** if players were partners in the immediate last game.
  - **25pt Penalty** if they were partners 2 games ago.

### 🏆 Player Roster & Rankings
- **High-Contrast Skill Tiers**: 7-level system (1-Beginner to 7-Expert) with accessible, theme-aware color coding.
- **Win Rate Leaderboard**: Rankings calculated daily and monthly based on `Wins`, `Win Rate`, and `Point Difference`.
- **Bench Management**: Sorting options for the bench (Skill, Name, Wait Time) without breaking FIFO priority.

### 💰 Financials & Fees
- **Daily Split Calculator**: Enter shuttle, court, and entry fees to automatically calculate the per-player split.
- **Payment Tracking**: Real-time roster to mark players as "Paid" or "Pending".
- **QR Code Payments**: Manage and display multiple QR codes (GCash, Maya, Bank) for quick club settlements.

### 🎨 Design & UX
- **Responsive Fluid Typography**: Uses CSS `clamp()` to ensure perfect readability from mobile to large command center displays.
- **Dark Mode Support**: Full theme awareness with high-contrast UI and desaturated colors for low-light court environments.
- **Branding**: Customizable club logo and default winning scores.

## 🛠️ Tech Stack
- **Framework**: Next.js 15 (App Router)
- **Styling**: Tailwind CSS + ShadCN UI
- **Storage**: Real-time LocalStorage persistence with Firebase integration.
- **Icons**: Lucide React
- **Animations**: Tailwind CSS Animate + Custom Transitions

---
*Built with ❤️ for TheBreakfastClub Badminton Community.*
