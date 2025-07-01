# 🛠 AutoForwardX Dashboard Development Guide

> This guide details how to design, develop, and structure the **User Dashboard** for AutoForwardX using **Vite + React + Tailwind CSS** (without Next.js). The dashboard connects to the FastAPI backend via REST APIs and WebSocket, provides full control of forwarding features, and offers plan-based access.

---

## 📦 Tech Stack Summary

- **Frontend Framework:** React + Vite
- **Styling:** Tailwind CSS + ShadCN UI
- **Routing:** React Router DOM
- **Animations:** Framer Motion
- **Charts:** Recharts
- **Auth Handling:** JWT-based with Context
- **API Client:** Axios

---

## 🗂 Folder Structure

```
/src
├── api/axiosInstance.ts         // Axios setup with token injection
├── assets/                      // Static files, logos, images
├── components/                  // UI components (buttons, cards)
├── context/AuthContext.tsx     // Auth provider and logic
├── hooks/useAuth.ts            // Auth-related hooks
├── layouts/DashboardLayout.tsx // Shared layout for protected pages
├── pages/                      // Page views (login, dashboard, etc.)
├── router/index.tsx            // App routes
├── styles/tailwind.config.js   // Tailwind configuration
```

---

## 🎨 UI Design Guidelines

### ✨ Fonts & Colors

- **Font:** `Inter`, `Roboto`, or `DM Sans`
- **Default Text:** `text-gray-300`
- **Headings:** `text-white`, `font-bold`, `text-2xl` to `4xl`
- **Primary Buttons:** Indigo theme

```tsx
<button className="bg-indigo-600 hover:bg-indigo-700 text-white py-2 px-4 rounded-xl shadow">
  + Add Pair
</button>
```

- **Dark Mode:**
  - Tailwind `dark:` variants
  - Store preference in `localStorage`

### ✨ Component Library (Optional)

- **ShadCN UI**: Modal, Tabs, Dialogs
- **Framer Motion**: Page transitions, loading animations

### ✨ Icons

- **Lucide Icons** or **Tabler Icons** for clean, consistent design

---

## 🔐 Login Page Implementation

### Steps:

1. Input phone number → `POST /telegram/send-otp`
2. Receive OTP via Telegram
3. User inputs OTP → `POST /telegram/verify-otp`
4. Save JWT to `localStorage`
5. Set context in `AuthContext`
6. Redirect to `/dashboard`

### Components:

- `PhoneInput.tsx`
- `OTPVerification.tsx`
- Toast/alert system for feedback

---

## 📊 Dashboard Home Page

### Quick Info Cards:

| Card            | Example                    |
| --------------- | -------------------------- |
| Total Pairs     | 6 Active                   |
| Active Sessions | Telegram (✅), Discord (⚠️) |
| Current Plan    | Pro / Upgrade ➕            |

### Sections:

- **System Health Panel:**
  - WebSocket live indicators for Redis, DB, Celery
- **Analytics Graphs:**
  - Messages Forwarded per day (bar chart)
  - Success vs Error rate (pie chart)
- **Forwarding Pairs Table:**
  - List with:
    - Source → Target
    - Status: Active / Paused
    - Delay: 0s / 10s / custom
    - Edit / Pause / Delete buttons

### Actions:

- ➕ Add Forwarding Pair (opens modal wizard)
- 🔁 Bulk Resume / Pause / Delete

---

## 👤 Accounts Management Page

- List of connected Telegram and Discord accounts
- For each:
  - ✅ Health (online/offline)
  - 📦 Plan limits check
  - 🔄 Switch / ❌ Remove / ➕ Add new
- Trigger bot-assisted session login

---

## 📄 Analytics & Exports

### Pages:

- `/analytics`
  - Message volume over time (line chart)
  - Success/error breakdown (pie)
  - Export CSV / PDF

---

## ⚙️ Settings Page

### Features:

- Dark/light mode toggle
- Notification toggles
- Account deletion
- Plan upgrade link (billing)

---

## 🚧 Error Handling & Edge Cases

- JWT expiration → auto logout
- API failures → retry or display toast
- Account/session offline → show warning badge
- WebSocket disconnect → reconnect attempt every 5s

---

## ✅ Final Tips

- Use Tailwind’s `@apply` directive to clean repetitive styles
- Maintain consistent spacing and component padding
- Optimize dashboard for mobile (Tailwind `sm:`, `md:`, `lg:` breakpoints)
- Extract all API endpoints to `api/endpoints.ts`
- Include loading skeletons using `react-loading-skeleton`

---

## 📌 What’s Next

Once the dashboard is built:

- Bind bot actions (like Add Account) using `telegram_auth` API
- Add Role Guards (admin vs user)
- Enable plan-based frontend feature lock

---

By following this guide, you’ll build a lightning-fast, modern, and fully responsive dashboard for AutoForwardX users that connects smoothly with the backend and bot.

