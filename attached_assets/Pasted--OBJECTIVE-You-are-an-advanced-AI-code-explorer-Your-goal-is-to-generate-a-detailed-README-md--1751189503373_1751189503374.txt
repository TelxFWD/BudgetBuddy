📌 OBJECTIVE:
You are an advanced AI code explorer. Your goal is to generate a detailed `README.md` file from this project by deeply analyzing every file and its purpose.

📁 PROJECT STRUCTURE:
This is a full-stack web app (frontend, backend, auth). You may encounter:
- React / Vue frontend files (`.js`, `.ts`, `.jsx`, `.tsx`)
- Express / Fastify / Flask backend (`.js`, `.ts`, `.py`)
- Config files (`.env`, `package.json`, `vite.config.js`, etc.)
- UI components and CSS (Tailwind, SCSS, etc.)

🧠 TASKS TO PERFORM FOR EACH FILE:
1. **Identify Purpose** – What role does this file play? (route, component, helper, config, etc.)
2. **Understand Logic** – If a route/controller, what does it handle? What input/output? What error cases?
3. **Frontend Behavior** – Explain how form elements, buttons, and conditional rendering work.
4. **UI Issues** – Spot any common bugs, e.g., disabled buttons due to missing handlers or broken validation logic.
5. **Security Flaws** – If any credentials are hardcoded, or insecure logic exists, call it out.

📄 OUTPUT:
Once all files are scanned (or after each batch if memory is limited), generate a `README.md` with:

### Project Overview
Briefly describe what the app does.

### Tech Stack
List of languages, frameworks, and libraries used.

### Folder & File Structure
Tree + descriptions (auto-generated from folders)

### API Routes
List every backend route with:
- Method
- Path
- Description
- Example input/output
- Common errors

### Frontend Components
List important frontend files with:
- Their role (e.g., Login, OTP Verification)
- What state they handle
- What events they manage (e.g., input, submit)

### Bug & Issue List
Identify:
- Buttons that stay disabled
- Validation issues
- Missing hooks or handlers

### How to Run
Install dependencies, configure `.env`, and start frontend/backend servers.

### Fix Suggestions
Suggest fixes for broken flows (like the disabled "Send Verification Code" button).

---
🔁 PROCESSING LIMIT:
If you can only read a few files at a time, repeat the above steps in **batches** and combine results at the end.
