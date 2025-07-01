# 📘 AutoForwardX Fullstack Architecture & UI Development Guide

> A complete implementation plan for integrating the Telegram Bot, User Dashboard, and Admin Panel for AutoForwardX. This guide aligns directly with the backend features already present, such as message forwarding, session management, analytics, and subscription-based feature gating. It also outlines a fast, clean, dark-themed UI using Vite + React (no Next.js).

---

## 📦 SYSTEM ARCHITECTURE OVERVIEW

### 🧠 Core Components

```
[ Telegram Bot ] ⟷ [ FastAPI Backend ] ⟷ [ Vite + React + Tailwind Dashboard ]
                               ⬑ Admin Panel (Role-based routing)
```

---

## 🔌 BOT ↔ DASHBOARD ↔ BACKEND CONNECTION

### ✅ Telegram Bot (python-telegram-bot or Pyrogram):

- Controls OTP authentication
- Manages Telegram/Discord sessions
- Sends real-time notifications, pair status, system health

### ✅ Backend (FastAPI):

- REST API with JWT auth
- Feature-gating by plan (Free/Pro/Elite)
- Redis queue + Celery workers
- PostgreSQL + SQLAlchemy for persistence
- WebSocket real-time status

### ✅ Frontend (Vite + React + Tailwind CSS):

- Clean, mobile-responsive UI
- API calls via Axios with JWT headers
- Real-time updates via WebSocket
- Dark mode enabled by default

---

## 🔐 USER LOGIN FLOW (PHONE + OTP)

1. **User enters phone number** in the web dashboard
2. Calls `POST /telegram/send-otp`
3. Telegram bot sends the OTP to user
4. User enters OTP in web
5. Calls `POST /telegram/verify-otp` → receives JWT token
6. Token is stored and used to authenticate all API calls

### Auth State Handling:

- `AuthContext` on frontend stores and verifies JWT
- Automatically logs out on token expiry
- Telegram bot uses same session to sync accounts and commands

---

## 💎 PLAN-BASED FEATURE ACCESS (Backend & UI Sync)

| Feature                   | Free  | Pro | Elite  |
| ------------------------- | ----- | --- | ------ |
| Telegram → Telegram       | ✅     | ✅   | ✅      |
| Telegram → Discord        | ❌     | ✅   | ✅      |
| Discord → Telegram        | ❌     | ✅   | ✅      |
| Real-time Delay (0s)      | ❌     | ✅   | ✅      |
| Bulk Operations           | ❌     | ✅   | ✅      |
| Multi-Account Sessions    | 1     | 2   | ∞      |
| API Access & Webhooks     | ❌     | ❌   | ✅      |
| Analytics & Export        | Basic | Pro | Elite+ |
| Custom Filters (keywords) | ❌     | ✅   | ✅      |
| Scheduled Forwarding      | ❌     | ❌   | ✅      |
| Message Transformation    | ❌     | ❌   | ✅      |

### Backend Enforcement:

```python
@requires_plan("Pro")
def create_pair(...):
```

### Frontend Enforcement:

- Disabled buttons with lock icon and tooltip
- Upgrade prompts with CTA: "Unlock with Pro/Elite"

---

## 👥 MULTI-SESSION HANDLING

### Storage:

- Telegram sessions: `telegram_accounts`
- Discord sessions: `discord_accounts`

### UI Flow:

- **Accounts Panel**
  - ➕ Add Telegram/Discord Account
  - 🔁 Switch Account
  - ❌ Remove Session
  - 🧠 Health status: online/offline indicator

### Backend:

- Sessions persist in DB
- Redis + Celery handle per-session queues
- Health-check every few mins, auto-reconnect if needed

---

## 🎨 UI DESIGN SYSTEM

### 📌 Tech Stack:

- **Vite + React + TypeScript**
- **Tailwind CSS** for utility-first styling
- **ShadCN UI** for clean accessible components
- **Framer Motion** for smooth transitions
- **Recharts** for data visualization

### 🖤 Theme: Dark Mode First

- Uses Tailwind’s `dark:` variants
- Toggle with `darkMode` state in context

### ✨ Fonts & Styles:

- Font: `Inter`, `Roboto`, or `DM Sans`
- Heading size: `text-2xl` to `text-4xl`
- Button style:

```html
<Button className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 px-4 rounded-2xl shadow">
  Add Pair
</Button>
```

- Charts: Recharts line and pie charts with animated tooltips

### 📂 Folder Structure

```
/src
├── components/Buttons, Cards, Inputs
├── pages/login, dashboard, admin
├── api/axiosInstance.ts
├── context/AuthContext.tsx
├── hooks/useAuth.ts, useWebSocket.ts
├── layouts/DashboardLayout.tsx
├── styles/tailwind.config.js
```

---

## 🛠 USER DASHBOARD MODULES

### 🔐 Login Page:

- Phone input with OTP request
- OTP entry form → auto-focus and paste detection
- Error validation + resend OTP
- On success, redirect to `/dashboard`

### 🧭 Main Dashboard:

- Quick Stats: active pairs, accounts, health
- Real-time System Monitor (WebSocket)
- Pairs Panel: List, toggle, pause, delete
- Analytics Page: Bar & pie charts, CSV export
- Plan Info + Upgrade Button

### ⚙️ Settings:

- Dark/light toggle
- Notification settings
- Delete account

---

## ⚡ HIGH-RESOURCE FEATURES (Elite Only)

| Feature                 | Resource Usage                       |
| ----------------------- | ------------------------------------ |
| WebSocket Status Stream | Persistent socket connection         |
| Bulk Forwarding Tasks   | Parallel Celery queue processing     |
| Smart Routing/Filters   | Regex, keyword NLP                   |
| API/Webhooks            | External syncing load                |
| AI Signal Parsing       | OCR + NLP (planned)                  |
| Export Reports (PDF)    | Graph rendering, document generation |
| Health Monitor          | Live backend checks per user         |

---

## 🛡 ADMIN PANEL (Role-Based Access)

### Path: `/admin`

- User Table: ban/unban, usage stats, plan tier
- System Status Page: Redis, Celery, PostgreSQL
- Maintenance Toggle
- Logs Viewer (latest errors)

---

## 🪜 STEP-BY-STEP: BUILD & CONNECT

1. **Build frontend with Vite + React**
2. Implement `AuthContext` + phone login via OTP APIs
3. Add dashboard pages: stats, pairs, sessions, analytics
4. Protect routes with `PrivateRoute` wrapper
5. Add WebSocket for system health
6. Implement admin routes with role-based guards

---

## ✅ FINAL THOUGHTS

With this updated guide, your system will:

- Fully sync Telegram Bot, Dashboard, and Backend
- Provide enterprise-grade multi-session forwarding
- Deliver a clean, fast, modern UI without Next.js
- Enforce features dynamically by subscription tier
- Be competitive with top forwarding bots in UX & scalability

📩 Ready to begin? Ask for your custom boilerplate UI.

