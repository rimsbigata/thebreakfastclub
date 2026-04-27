# TheBreakfastClub | Badminton Club Management

A professional-grade badminton club management application built with **Next.js 15**, **Tailwind CSS**, and **Firebase**. Designed for live court queuing, deterministic matchmaking, and daily financial tracking.

## 🚀 Summarized Features

- **Live Command Center**: Real-time monitoring of all courts with live timers and status indicators.
- **Automated Match Flow**: One-click "Auto-Advance" pulls the next game from the queue (#1 FIFO) onto an available court instantly.
- **Deterministic Matchmaking**: AI-driven engine that prioritizes wait time (FIFO) while balancing skill gaps and penalizing repeat partners.
- **Tournament Scoring**: 
    - **Win-by-2 Logic**: Enforces standard badminton deuce rules (e.g., must win 22-20).
    - **Zero-Score Safety**: Confirmation prompts to prevent accidental "0" score entries.
    - **Win Shortcuts**: One-tap "T1/T2 Win" buttons with automated score assignment.
- **High-Contrast Skill Tiers**: A standardized 7-level skill system with accessible, theme-aware color coding.
- **Dynamic Leaderboards**: Daily and Monthly rankings based on wins, win rate, and point difference.
- **Bench Management**: Visual FIFO queue with flexible sorting options (Skill, Name, Wait Time) that don't break logic integrity.
- **Financial Tracking**: Daily split calculator for shuttle, court, and entry fees with real-time payment status tracking.
- **Responsive "Dark Mode"**: Professional UI with fluid typography (`clamp()`) that scales perfectly from mobile to wall-mounted displays.

## 🛠️ Tech Stack
- **Framework**: Next.js 15 (App Router)
- **Styling**: Tailwind CSS + ShadCN UI
- **Storage**: Real-time LocalStorage persistence with Firebase integration.
- **Icons**: Lucide React
- **Typography**: Inter (Fluid scaling via CSS clamp)

---
*Built with ❤️ for TheBreakfastClub Badminton Community.*
