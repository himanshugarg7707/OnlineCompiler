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
- Node.js (v18 or higher)
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

---

## 📦 Build for Production

```bash
npm run build
```

---

## 📄 License
MIT License
