# CodeForge AI — AI-Powered Online Compiler & IDE

A state-of-the-art, dark-themed, AI-powered online compiler and IDE built with **React**, **Monaco Editor**, **WebAssembly Pyodide**, and the **Wandbox Execution API**.

![CodeForge AI Screenshot](https://github.com/user-attachments/assets/screenshot-preview.png)

---

## 🚀 Key Features

- **🌐 19 Industry-Demanded Languages**:
  - Python 3, Java, C++, C, JavaScript, TypeScript, C#, Kotlin, Swift, Go, Rust, PHP, Ruby, R, Perl, Scala, SQL, HTML5, CSS3.
- **⚡ Dual Execution Engine**:
  - **In-Browser WebAssembly**: Instant CPython execution with **NumPy**, **SciPy**, and **Pandas** support.
  - **Cloud Compilers**: Powered by Wandbox (GCC 13, OpenJDK 22, Node.js, Rustc, SQLite 3, .NET, Go, etc.) with real `stdout`, `stderr`, and execution metrics.
- **📂 VS Code-Style Multi-File Management**:
  - Open multiple file tabs simultaneously (`main.py`, `helper.js`, `index.html`, `styles.css`, etc.).
  - Add, rename, switch, and close files with automatic extension mapping and code isolation.
- **🌐 Live HTML/CSS Browser Tab Launcher**:
  - Click **Run** on HTML or CSS files to instantly bundle styles and scripts into a live webpage rendered in a new browser tab.
- **↔️ Adjustable Editor & Terminal Split Window**:
  - Drag the vertical splitter bar to resize the Monaco editor and terminal output panel to your preference.
- **💾 Real-Time Auto-Save Persistence**:
  - Zero data loss on refresh. All open tabs, code buffers, and stdin inputs are saved automatically to `localStorage`.
- **⌨️ IntelliSense & Rich Snippets**:
  - VS Code-style completions (`pr` + Enter for print statements, loops, conditionals, functions, classes, and standard library methods).
- **🤖 AI Superpowers**:
  - **Auto Input Generator**: Detects matrix/array input needs and generates formatted standard input automatically.
  - **Plain English Error Explanations**: Translates compiler stack traces into plain English.
  - **Logic Hint Mode**: Explains conceptual algorithms without spoiling complete solutions.
  - **Interactive AI Chat Sidebar**: Full assistant with 1-click code analysis, optimization, and bug fixing.

---

## 🛠️ Getting Started

### Prerequisites
- Node.js 22 or newer
- npm or yarn

### Installation
```bash
# Clone the repository
git clone https://github.com/himanshugarg7707/OnlineCompiler.git

# Navigate to project directory
cd OnlineCompiler

# Install dependencies
npm install

# Start local development server
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

## Deploy the frontend, backend, and Postgres on Render

OnlineCompiler uses PostgreSQL for server-side accounts and cloud workspace
snapshots. Deploy the Vite frontend as a Render Static Site, the Express API as
a Render Web Service, and create a Render Postgres database in the same region.
The database URL and session credentials belong only in the backend's private
environment variables. SQL Studio's sample databases use a separate local
browser fallback when the app is hosted.

### 1. Create the Render Postgres database

1. In Render, choose **New → Postgres**.
2. Choose the same region as the API service and create the database.
3. From its **Connect** page, copy the **Internal Database URL**. Keep it
   private and use it only in the API service's environment.

### 2. Deploy the Express backend to Render

Create a **Web Service** from this repository. Select **Node**, keep the root
directory blank, use `npm ci` as the build command, and `npm run server:start`
as the start command. Render supplies `PORT`.

Set these environment variables in the Render service:

| Variable | Value |
| --- | --- |
| `DATABASE_URL` | The Render Postgres internal database URL. Never use a `VITE_` name. |
| `CORS_ORIGIN` | Exact frontend origin, for example `https://onlinecompiler.onrender.com` (no trailing slash). |
| `NODE_ENV` | `production` |
| `GEMINI_API_KEY` | Optional server-side Gemini key for Lucia, if enabled. |

Do not add the database URL to the frontend. Render sets `RENDER=true`; hosted
mode uses this to disable server filesystem access, shell execution, and the
local SQLite API. The compiler runs in the browser/client runner, while account
and workspace data use Postgres. The backend uses secure, HttpOnly session
cookies and only accepts the configured frontend origin.

### 3. Deploy the frontend as a Render Static Site

Create a **Static Site** from the same repository and branch. Use
`npm ci && npm run build` as the build command and `dist` as the publish
directory. Add a rewrite from `/*` to `/index.html` for client-side routes.
Set `VITE_API_BASE_URL=https://<your-api-service>.onrender.com` as a build
environment variable. Vite embeds it in the frontend bundle, so changing it
requires a rebuild.

Set the API's `CORS_ORIGIN` to the Static Site's exact public URL, then redeploy
the API. Check `https://<your-api-service>.onrender.com/api/health`. The response
should report `workspaceDatabase.connected: true`. Schema migrations run
automatically on backend startup and are recorded in `schema_migrations`.

### Accounts, workspaces, and offline behavior

Account records, scrypt password hashes, expiring sessions, and cloud workspaces
are stored in Render Postgres. Workspace access is scoped to the authenticated
user on the server; browser-supplied owner IDs are not trusted. Passwords must
be at least 10 characters. Old browser-only profiles are not server accounts;
sign up again to create a database-backed account. Existing code remains in the
browser and can be adopted by the newly created account.

The editor continues saving locally in the browser (including IndexedDB for
large projects). Cloud sync runs when the backend and database are reachable;
sync failures are reported and leave the local workspace intact. Guest work is
local-only until an account signs in.

For local PostgreSQL development, copy `.env.example` to `.env` and run:

```bash
docker compose -f docker-compose.backend.yml up --build
```

---

## 📦 Build for Production

```bash
npm run build
```

---

## 📄 License
MIT License
