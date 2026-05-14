# ShuttleQueue | TheBreakfastClub Badminton Manager

A professional-grade badminton club management application built with **Next.js 15**, **Tailwind CSS**, **Firebase**, and **Genkit AI**.

## 🏗️ Architecture & Logic

### **Smart Persistence Layer**
- **Wait-Time Preservation**: Unlike simple FIFO queues, ShuttleQueue preserves a player's "Available" timestamp even if a match is cancelled or they are removed from a draft. This ensures fair rotation and rewards long wait times.
- **Auto-Rest Logic**: Configurable "Auto-Rest after Match" trigger that automatically moves players to "Resting" status upon match completion, preventing burnout and allowing water breaks.
- **Hybrid Auth**: Supports both permanent registered accounts (for career stats) and session-scoped Guest Access.

### **Financials**
- **PHP Currency Support**: All fees, splits, and payment tracking are standardized in **Philippine Peso (₱)**.
- **Daily Split Calculator**: Real-time division of shuttle, court, and entrance fees across the current session roster.

---

## ✨ Core Features

### **🏟️ Command Center (Dashboard)**
- **Real-Time Monitoring**: Live tracking of active matches and queued groups.
- **Queue Wait Tracking**: Live timers showing exactly how long a group has been waiting for a court assignment.
- **Inline Court Management**: Admins can instantly rename courts (e.g., "Court 1" → "Main Court") directly from the card.
- **Drag-and-Drop Matchmaking**: Seamlessly move players from the Bench to the Queue or directly onto an available Court.

### **👤 Player & Admin Profiles**
- **Global Identity**: Edit your name and Skill Tier (1-7) to update your record across all club activities.
- **Session Intelligence**: View your specific dues, current status, and total games played in the active session.
- **Admin Inclusivity**: Administrators have full player profiles, acknowledging that they are often active participants in the games they manage.

### **🏆 Tournament & Rankings**
- **Enhanced Leaderboards**: Hall of Fame rankings now include **Games Played (GP)** alongside wins and point differentials for better context.
- **History Access**: Administrators can view detailed match history for any player via the Roster panel to resolve disputes or analyze performance.

### **🚪 Access & Entry**
- **Guest Access**: Join sessions anonymously with a single click. Guest data is scoped strictly to the session they join and does not clutter the global club database.
- **QR Entry**: Players can scan a session-specific QR code to jump directly into the active queue.

---

## 🚀 Technical Setup

### **1. Environment Variables**
Create a `.env.local` file in the project root:

```env
# Firebase Configuration
NEXT_PUBLIC_FIREBASE_API_KEY=...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...
NEXT_PUBLIC_FIREBASE_PROJECT_ID=...
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=...
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
NEXT_PUBLIC_FIREBASE_APP_ID=...

# VAPID Key (for web push notifications)
NEXT_PUBLIC_FIREBASE_VAPID_KEY=...

# Supabase (for image storage - QR codes and logos)
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
```

### **2. Firebase Services Used**
- **Firestore**: Real-time database for sessions, matches, and players.
- **Authentication**: Email/Password for members, Anonymous for guests.
- **Cloud Messaging (FCM)**: Browser-based push alerts for court assignments.

### **3. Supabase Storage**
- Create a public bucket named `payment-qr-codes`.
- Configure RLS policies to allow authenticated/anon uploads as described in the configuration docs.

---

*Built with care for TheBreakfastClub Community.*