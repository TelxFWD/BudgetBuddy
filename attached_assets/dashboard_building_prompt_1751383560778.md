# 🧭 AutoForwardX Dashboard Build Prompt

> A full prompt-style technical breakdown to help you build a connected, responsive, professional, and clean UI dashboard for AutoForwardX. Includes complete sections, components, required features, conditional logic, and integration hooks for FastAPI backend.

---

## 🖥️ Tech Stack

- **Frontend Framework:** React + Vite + TypeScript
- **UI Styling:** Tailwind CSS + ShadCN UI + Lucide Icons
- **Routing:** React Router DOM
- **Animations:** Framer Motion
- **Charts:** Recharts
- **Auth & State:** JWT + Context + Protected Routes
- **Data Fetching:** Axios with interceptors
- **Real-Time:** WebSocket `/ws` from FastAPI

---

## 🧩 Dashboard Core Pages

### `/login`

- Phone input field + OTP modal
- Axios: `POST /telegram/send-otp` & `POST /telegram/verify-otp`
- Store JWT in `localStorage`, set AuthContext
- On success, redirect to `/dashboard`

---

### `/dashboard`

- Summary Cards:
  - 🔁 Forwarding Pairs
  - 👤 Sessions (Telegram/Discord)
  - 💎 Current Plan + Upgrade Button
  - 📊 Graphs: Message volume, errors, success

---

## ➕ Add Pair UI (Unified & Clean)

| Section        | Detail                                                                 |
| -------------- | ---------------------------------------------------------------------- |
| Add Pair Modal | Opens on ➕ button from Dashboard                                       |
| Input Fields   | Source Platform + Source ID, Destination Platform + ID, Delay (slider) |
| Platform Modes | Dropdown: `Telegram→Telegram`, `Telegram→Discord`, `Discord→Telegram`  |
| Validation     | Call `/forwarding/validate` (optional helper)                          |
| Submission     | `POST /forwarding/pairs`                                               |
| Conditions     | If plan limit reached → show modal "Upgrade to Elite"                  |

- Pair Type Icons: Use platform icons (Telegram/Discord)
- Styled Buttons:

```tsx
<Button className="bg-indigo-600 text-white rounded-xl px-4 py-2 hover:bg-indigo-700">
  ➕ Add Pair
</Button>
```

- Accordion UI to switch between "Telegram → Discord" and "Discord → Telegram"

---

## 🔄 Pair List View

- Table or Card layout
- Each row/pair includes:
  - Status: ✅ Active / ⏸ Paused
  - Delay: Live or custom (in seconds)
  - Edit/Delete/Pause Buttons
  - Source → Destination tags
- Button: 🗂 Bulk Delete / Pause All / Resume All
- Backend Calls:
  - `GET /forwarding/pairs`
  - `PUT /forwarding/pairs/{id}`
  - `DELETE /forwarding/pairs/{id}`

---

## 👥 Account Manager

- Tabs: Telegram / Discord
- Each account shows:
  - Username, status ✅/⚠️, session type
  - Add New (starts bot login wizard)
  - Remove, Switch, Reconnect
- Plan Check:
  - If plan = Free & already 1 Telegram session → block new adds

---

## 📊 Analytics Page `/analytics`

- Charts:
  - Message Volume by Date (Bar)
  - Success vs Error (Pie)
- Filters: Date Range, Platform, Channel
- Export Buttons:

```tsx
<Button className="bg-green-500 text-white rounded px-3 py-1">Export CSV</Button>
<Button className="bg-purple-500 text-white ml-2 rounded px-3 py-1">Export PDF</Button>
```

- Backend Routes:
  - `GET /analytics/dashboard`
  - `GET /analytics/messages`
  - `GET /analytics/export`

---

## 🧠 Feature Access Control (Plan-Based UI)

| Feature               | UI Visibility Condition           |
| --------------------- | --------------------------------- |
| Add > 1 pair          | plan !== "Free"                   |
| Telegram → Discord    | plan !== "Free"                   |
| Copy Mode, Scheduling | plan === "Elite"                  |
| Image Block Toggle    | plan === "Elite"                  |
| Pair limit reached    | disable Add button + show upgrade |

---

## 🛠 Utility Features

- Real-time Health: Use `/ws` WebSocket to show:
  - Redis, Celery, Database, Sessions
  - Animated badges: green (🟢), yellow (🟡), red (🔴)
- Notifications:
  - Connection failure, session expired, queue backlog
- Theme Switcher:

```tsx
<Switch id="theme-toggle" onCheckedChange={toggleDarkMode} />
```

---

## 🧪 Protected Route Logic

```tsx
<Route path="/dashboard" element={<RequireAuth><Dashboard /></RequireAuth>} />
```

- Redirect to `/login` if no token
- Validate token against `/auth/me`

---

## 🧼 Styling Practices

- Font: `Inter` or `DM Sans`
- Button radius: `rounded-xl`
- Shadows: `shadow-md hover:shadow-lg`
- Text classes: `text-gray-300` body, `text-white` headings
- Grid layout for dashboard sections

---

## 🎯 Final Deliverables

- 📦 Auth flow (Phone + OTP)
- 📋 Pair manager UI (Add/Edit/Delete)
- 📊 Analytics + Health
- 👥 Account handler
- 🧩 Session-aware dashboard
- 🎨 Plan-based UI feature gating

Would you like me to now generate the actual code for the `/dashboard` or `/add-pair` page based on this prompt?

