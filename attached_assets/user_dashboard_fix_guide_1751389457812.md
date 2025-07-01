# 🧰 AutoForwardX: Complete Guide to Fix & Build the User Dashboard

> This guide provides an end-to-end fix and construction strategy for your AutoForwardX dashboard UI using React, Vite, Tailwind, and FastAPI. It includes folder structure, page layout diagrams, component behaviors, feature restrictions, and best practices.

---

## 📁 1. Folder & File Structure

```
src/
├── App.tsx
├── index.tsx
├── pages/
│   ├── DashboardHome.tsx
│   ├── ForwardingPairs.tsx
│   ├── AccountsPage.tsx
│   ├── AnalyticsPage.tsx
│   └── SettingsPage.tsx
├── components/
│   ├── PairCard.tsx
│   ├── AddPairModal.tsx
│   ├── SystemStatus.tsx
│   ├── SessionCard.tsx
│   ├── Navbar.tsx
│   └── Sidebar.tsx
├── context/
│   └── AuthContext.tsx
├── api/
│   ├── axiosInstance.ts
│   └── endpoints.ts
├── hooks/
│   └── useAuth.ts
├── layouts/
│   └── DashboardLayout.tsx
└── styles/
    └── index.css
```

---

## 🧠 2. Global Architecture

Each page uses `DashboardLayout`, which includes:

- Sidebar (navigation links)
- Topbar (User info, Plan, Logout)
- Content area (rendered via route)

---

## 🖼 3. Layout Design & Page UIs

### 🏠 `/dashboard` — DashboardHome.tsx

```
[ Summary Cards Grid ]
 ├─ 🔁 Forwarding Pairs Count
 ├─ 👤 Active Sessions (T/D)
 ├─ 💎 Plan Tier: Pro | Elite
 └─ ⚙️ Backend Status: Redis / Celery

[ Add Pair Button - top right ]
[ AddPairModal trigger ]
```

### 🔁 `/forwarding` — ForwardingPairs.tsx

```
[ ➕ Add Pair Button ]  [ Search Box ]

[ PairCard[] ]:
 ├─ Source → Target ID
 ├─ Delay: Real-time / 24h
 ├─ Buttons: [⏸ Pause] [🛠 Edit] [❌ Delete]
 └─ Status Indicator (Green / Yellow / Red)

[ Bulk Actions: ⏸ Pause All | ▶ Resume All | 🗑 Delete All ]
```

### 👥 `/accounts` — AccountsPage.tsx

```
Tabs: [ Telegram Sessions ] [ Discord Sessions ]

Each SessionCard:
 ├─ Platform Icon (Telegram / Discord)
 ├─ Username + Plan tag
 ├─ Status: ✅ / ⚠️ / ❌
 ├─ [🔄 Reconnect] [🔁 Switch] [❌ Remove]

➕ Add Session Button (top right)
🚫 Show “Upgrade to Elite” if session limit reached
```

### 📊 `/analytics` — AnalyticsPage.tsx

```
Filters:
 ├─ Date Picker
 ├─ Platform Dropdown
 ├─ Channel Filter

[ 📈 Charts ]
 ├─ Volume (BarChart)
 ├─ Success/Failure Ratio (PieChart)

[ Export Buttons ]
 ├─ [📄 Export CSV]
 ├─ [🖨 Export PDF] (Elite only)
```

### ⚙️ `/settings` — SettingsPage.tsx

```
[ Toggle: Dark/Light Mode ]
[ Notifications: On/Off ]
[ Delete My Account Button ]
[ Plan Upgrade Button ]
```

---

## 🎨 4. Component Details & Styling

### 🔘 Buttons

- `AddPair`: `bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl`
- `Pause`, `Edit`, `Delete`: use `text-white` with icon buttons (Lucide)
- Bulk: `rounded-md border-indigo-500 border-2 hover:bg-indigo-100 text-indigo-700`

### 🧱 Cards

- `PairCard` & `SessionCard`
  - `rounded-xl shadow-md px-4 py-3 bg-gray-800`
  - Use grid or flex layout

### 📊 Charts

- Use `Recharts`:
  - BarChart: `volume over time`
  - PieChart: `success vs failed`

---

## 🔐 5. Authentication (LoginPage.tsx)

1. Phone number input
2. `POST /telegram/send-otp`
3. OTP input modal
4. `POST /telegram/verify-otp`
5. Store JWT in `localStorage`, set user context
6. Redirect to `/dashboard`

---

## 🚀 6. Real-Time WebSocket (SystemStatus.tsx)

Connect to `/ws`:

- Use `useWebSocket` hook
- Show backend statuses (Redis / DB / Celery)
- Use live badge component (`🟢`, `🟡`, `🔴`)

---

## 🚫 7. Plan-Based Feature Control

| Feature                             | Free | Pro | Elite      |
| ----------------------------------- | ---- | --- | ---------- |
| Add > 1 Pair                        | ❌    | ✅   | ✅          |
| Telegram→Discord / Discord→Telegram | ❌    | ✅   | ✅ (50 Max) |
| Scheduled Forwarding                | ❌    | ❌   | ✅          |
| Copy Mode / Image Blocking          | ❌    | ❌   | ✅          |
| Export PDF                          | ❌    | ❌   | ✅          |
| Session Limit (T/D)                 | 1/0  | 2/1 | 3/3        |

Use conditional UI hiding and lock messages:

```tsx
if (plan === 'Free' && pairs.length >= 1) {
  showUpgradeModal()
}
```

---

## 🧪 8. Testing Checklist

- ✅ AddPair modal opens, submits, validates
- ✅ PairList loads with actions
- ✅ Account sessions display and toggle
- ✅ Charts render & export
- ✅ Auth context sets correctly
- ✅ System status updates live
- ✅ Mobile responsive UI

---

## 🛠 9. Build & Serve

```bash
npm install
npm run dev        # local test
npm run build      # production build
npm run preview    # view built version
```

---

## 📌 10. Troubleshooting

| Problem                | Fix                                                     |
| ---------------------- | ------------------------------------------------------- |
| Modal doesn’t open     | Check `useState` and trigger bindings                   |
| Auth fails             | Confirm API `/verify-otp` response, JWT storage         |
| Dashboard shows blank  | Verify route is wrapped in `RequireAuth`                |
| Chart not rendering    | Ensure `Recharts` has proper data shape and is imported |
| Session limits ignored | Validate logic for plan-check conditions                |

---

- Add skeleton loaders for PairCards
- Apply transitions via Framer Motion



