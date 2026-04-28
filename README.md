# ShuttleQueue | Badminton Queueing Manager

A professional-grade badminton club management application built with **Next.js 15**, **Tailwind CSS**, and **Firebase**.

## 🚀 Quick Start & Setup

### **1. Firebase Project Connection**
The app is configured to connect to:
- **Project ID**: `studio-8289009920-31c2b`

### **2. Enabling Admin Features**
Security rules prevent client-side elevation to Admin. To enable admin controls for a user:
1. Log into the app to create your account.
2. Go to the **Firebase Console** > **Firestore**.
3. Create a collection named `admin_roles`.
4. Create a document where the **ID** is your **Auth UID**.
5. Add a field `uid` (string) with your UID as the value.

---

## ✨ Core Features

### **🏟️ Queue & Court Management**
- **FIFO Logic**: Real-time player bench management with position tracking.
- **Session-Based Isolation**: Matches and players are isolated by unique session codes.
- **Live Court Status**: High-visibility "Command Center" dashboard for active court monitoring.

### **🏆 Tournament-Grade Matching**
- **Win-by-2 Logic**: Automated deuce enforcement and scoring validation.
- **Match Timers**: Live tracking of match duration on every court.
- **Smart Result Flow**: Automated bench return and court clearing on match completion.

### **👤 Player Experience**
- **Auth-First Gateway**: Secure login/signup system with role-based access.
- **Skill Tier System**: 7-level skill categorization (Beginner to Expert).
- **Session Code Access**: Dynamic session joining for daily club events.

### **💰 Financials & Settings**
- **Fee Calculator**: Per-player split calculation for shuttle and court fees.
- **QR Payment Support**: Manage and display multiple payment QR codes.
- **Theme Support**: Full Light/Dark mode with fluid typography for maximum readability.

---
*Built for TheBreakfastClub Community.*