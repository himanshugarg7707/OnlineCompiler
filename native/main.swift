import Cocoa
import WebKit
import UserNotifications

// ─────────────────────────────────────────────────────────────────────────────
// FullCode — Professional Native macOS IDE & Menu Bar Host
// Real Local Compilers, Native Terminal Bridge, Folder Chooser & Website Hub
// ─────────────────────────────────────────────────────────────────────────────

class AppDelegate: NSObject, NSApplicationDelegate, NSWindowDelegate, WKNavigationDelegate, WKScriptMessageHandler {
    var window: NSWindow!
    var webView: WKWebView!
    var statusItem: NSStatusItem!
    var statusHeaderItem: NSMenuItem!
    var statusFileItem: NSMenuItem!
    var statusRunItem: NSMenuItem!
    var statusEngineItem: NSMenuItem!

    var loadingOverlay: NSView?
    var loadingSpinner: NSProgressIndicator?
    var loadingLabel: NSTextField?

    var serverProcess: Process?
    var startedServerMyself = false

    let appUrlString = "http://localhost:5173"
    var isCompiling = false
    var currentFileName = "main.py"
    var currentLanguage = "Python"
    var currentEngine = "Local (⚡️ Native Mac)"
    var currentZoom: CGFloat = 1.0
    var isAlwaysOnTop = false
    var openFilesList: [(id: String, name: String)] = []
    var activeFileId = ""
    var activeWorkspacePath: String = ""

    var projectDirectory: String {
        if !activeWorkspacePath.isEmpty {
            return activeWorkspacePath
        }
        if let dir = Bundle.main.object(forInfoDictionaryKey: "PROJECT_DIR") as? String, !dir.isEmpty {
            return dir
        }
        let bundlePath = Bundle.main.bundleURL.path
        if bundlePath.contains("/native/") {
            return URL(fileURLWithPath: bundlePath).deletingLastPathComponent().deletingLastPathComponent().path
        }
        return "/Users/himanshugarg/Documents/Work/CU/OnlineCompiler"
    }

    func applicationDidFinishLaunching(_ notification: Notification) {
        NSApp.setActivationPolicy(.regular)

        // 1. Setup Notifications authorization
        setupNotifications()

        // 2. Setup Application Icon from resources
        setupAppIcon()

        // 3. Restore saved preferences (Zoom, Always-on-top)
        restorePreferences()

        // 4. Setup System Menu Bar (File, Edit, Run, Terminal, Website, View, Window)
        setupMainMenu()

        // 5. Setup macOS Menu Bar Status Item (Top Taskbar Companion)
        setupStatusItem()

        // 6. Setup Native Main Window
        setupMainWindow()

        // 7. Setup WebKit & Loading View
        setupWebView()
        setupLoadingOverlay()

        // 8. Present Window immediately
        showWindow()

        // 9. Ensure Dev Services are running (Auto-launch if not running)
        ensureServicesAndLoad()
    }

    // ── Preferences Restoration ──────────────────────────────────────────────
    private func restorePreferences() {
        let savedZoom = UserDefaults.standard.double(forKey: "FullCodePageZoom")
        if savedZoom >= 0.4 && savedZoom <= 3.0 {
            currentZoom = CGFloat(savedZoom)
        } else {
            currentZoom = 1.0
        }
        isAlwaysOnTop = UserDefaults.standard.bool(forKey: "FullCodeAlwaysOnTop")
    }

    private func setupNotifications() {
        UNUserNotificationCenter.current().requestAuthorization(options: [.alert, .sound]) { _, _ in }
    }

    // ── Application Icon ──────────────────────────────────────────────────────
    private func setupAppIcon() {
        if let iconUrl = Bundle.main.url(forResource: "AppIcon", withExtension: "icns"),
           let iconImg = NSImage(contentsOf: iconUrl) {
            NSApp.applicationIconImage = iconImg
        }
    }

    // ── Window Setup ─────────────────────────────────────────────────────────
    private func setupMainWindow() {
        let screen = NSScreen.main?.visibleFrame ?? NSRect(x: 0, y: 0, width: 1440, height: 900)
        let defaultWidth: CGFloat = min(1400, screen.width * 0.90)
        let defaultHeight: CGFloat = min(900, screen.height * 0.92)
        let rect = NSRect(
            x: screen.midX - (defaultWidth / 2),
            y: screen.midY - (defaultHeight / 2),
            width: defaultWidth,
            height: defaultHeight
        )

        window = NSWindow(
            contentRect: rect,
            styleMask: [.titled, .closable, .miniaturizable, .resizable, .fullSizeContentView],
            backing: .buffered,
            defer: false
        )

        window.title = "FullCode — Native IDE"
        window.titlebarAppearsTransparent = true
        window.titleVisibility = .hidden
        window.backgroundColor = NSColor(red: 0.07, green: 0.07, blue: 0.10, alpha: 1.0)
        window.collectionBehavior = [.fullScreenPrimary]
        window.minSize = NSSize(width: 860, height: 540)
        window.isReleasedWhenClosed = false
        window.delegate = self
        window.level = isAlwaysOnTop ? .floating : .normal
        window.setFrameAutosaveName("FullCodeMainWindow")
    }

    // ── WebKit Configuration ─────────────────────────────────────────────────
    private func setupWebView() {
        let config = WKWebViewConfiguration()
        config.preferences.setValue(true, forKey: "developerExtrasEnabled")
        config.preferences.setValue(true, forKey: "allowFileAccessFromFileURLs")
        config.websiteDataStore = WKWebsiteDataStore.default()

        // Enable media playback and performance enhancements
        config.allowsAirPlayForMediaPlayback = false
        config.mediaTypesRequiringUserActionForPlayback = []

        let contentController = WKUserContentController()
        contentController.add(self, name: "nativeHost")
        config.userContentController = contentController

        webView = WKWebView(frame: .zero, configuration: config)
        webView.navigationDelegate = self
        webView.setValue(false, forKey: "drawsBackground") // Prevents white flash while loading
        webView.translatesAutoresizingMaskIntoConstraints = false
        webView.pageZoom = currentZoom
        webView.customUserAgent = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) FullCodeNativeIDE/1.5.0"

        window.contentView!.addSubview(webView)
        NSLayoutConstraint.activate([
            webView.topAnchor.constraint(equalTo: window.contentView!.topAnchor),
            webView.bottomAnchor.constraint(equalTo: window.contentView!.bottomAnchor),
            webView.leadingAnchor.constraint(equalTo: window.contentView!.leadingAnchor),
            webView.trailingAnchor.constraint(equalTo: window.contentView!.trailingAnchor),
        ])
    }

    // ── Loading Overlay ──────────────────────────────────────────────────────
    private func setupLoadingOverlay() {
        if loadingOverlay != nil { return }

        let overlay = NSView(frame: window.contentView!.bounds)
        overlay.wantsLayer = true
        overlay.layer?.backgroundColor = CGColor(red: 0.07, green: 0.07, blue: 0.10, alpha: 1.0)
        overlay.translatesAutoresizingMaskIntoConstraints = false

        let container = NSStackView()
        container.orientation = .vertical
        container.alignment = .centerX
        container.spacing = 16
        container.translatesAutoresizingMaskIntoConstraints = false
        overlay.addSubview(container)

        if let iconUrl = Bundle.main.url(forResource: "AppIcon", withExtension: "icns"),
           let iconImg = NSImage(contentsOf: iconUrl) {
            let iconView = NSImageView(image: iconImg)
            iconView.translatesAutoresizingMaskIntoConstraints = false
            NSLayoutConstraint.activate([
                iconView.widthAnchor.constraint(equalToConstant: 80),
                iconView.heightAnchor.constraint(equalToConstant: 80),
            ])
            container.addArrangedSubview(iconView)
        }

        let titleLabel = NSTextField(labelWithString: "FullCode IDE")
        titleLabel.font = NSFont.systemFont(ofSize: 22, weight: .bold)
        titleLabel.textColor = .white
        titleLabel.alignment = .center
        container.addArrangedSubview(titleLabel)

        let subtitleLabel = NSTextField(labelWithString: "Native macOS High-Performance Polyglot Environment")
        subtitleLabel.font = NSFont.systemFont(ofSize: 12, weight: .medium)
        subtitleLabel.textColor = NSColor(red: 0.0, green: 0.83, blue: 1.0, alpha: 0.9)
        subtitleLabel.alignment = .center
        container.addArrangedSubview(subtitleLabel)

        let spinner = NSProgressIndicator()
        spinner.style = .spinning
        spinner.controlSize = .regular
        spinner.startAnimation(nil)
        container.addArrangedSubview(spinner)
        self.loadingSpinner = spinner

        let statusLabel = NSTextField(labelWithString: "Initializing local compilers & workspace services…")
        statusLabel.font = NSFont.systemFont(ofSize: 13, weight: .regular)
        statusLabel.textColor = NSColor(white: 0.65, alpha: 1.0)
        statusLabel.alignment = .center
        container.addArrangedSubview(statusLabel)
        self.loadingLabel = statusLabel

        window.contentView!.addSubview(overlay)
        NSLayoutConstraint.activate([
            overlay.topAnchor.constraint(equalTo: window.contentView!.topAnchor),
            overlay.bottomAnchor.constraint(equalTo: window.contentView!.bottomAnchor),
            overlay.leadingAnchor.constraint(equalTo: window.contentView!.leadingAnchor),
            overlay.trailingAnchor.constraint(equalTo: window.contentView!.trailingAnchor),
            container.centerXAnchor.constraint(equalTo: overlay.centerXAnchor),
            container.centerYAnchor.constraint(equalTo: overlay.centerYAnchor),
        ])

        self.loadingOverlay = overlay
    }

    private func hideLoadingOverlay() {
        guard let overlay = self.loadingOverlay else { return }
        NSAnimationContext.runAnimationGroup({ ctx in
            ctx.duration = 0.35
            overlay.animator().alphaValue = 0.0
        }, completionHandler: {
            overlay.removeFromSuperview()
            self.loadingOverlay = nil
            self.loadingSpinner = nil
            self.loadingLabel = nil
        })
    }

    // ── Auto-Start Local Services ────────────────────────────────────────────
    private func ensureServicesAndLoad() {
        checkServerReachable { [weak self] isRunning in
            guard let self = self else { return }
            if isRunning {
                DispatchQueue.main.async {
                    self.loadAppUrl()
                }
            } else {
                DispatchQueue.main.async {
                    self.loadingLabel?.stringValue = "Launching local dev & native compiler server…"
                }
                self.startBackgroundServer {
                    DispatchQueue.main.async {
                        self.loadAppUrl()
                    }
                }
            }
        }
    }

    private func checkServerReachable(completion: @escaping (Bool) -> Void) {
        guard let url = URL(string: appUrlString) else {
            completion(false)
            return
        }
        var request = URLRequest(url: url)
        request.httpMethod = "HEAD"
        request.timeoutInterval = 0.8

        let task = URLSession.shared.dataTask(with: request) { _, response, error in
            if let http = response as? HTTPURLResponse, (200...399).contains(http.statusCode) {
                completion(true)
            } else {
                completion(false)
            }
        }
        task.resume()
    }

    private func startBackgroundServer(completion: @escaping () -> Void) {
        self.startedServerMyself = true
        let projDir = self.projectDirectory

        let proc = Process()
        proc.executableURL = URL(fileURLWithPath: "/bin/zsh")
        proc.arguments = ["-l", "-c", "cd '\(projDir)' && npm run dev"]

        var env = ProcessInfo.processInfo.environment
        let pathsToAdd = "/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin:$HOME/.nvm/versions/node/$(ls $HOME/.nvm/versions/node 2>/dev/null | tail -n 1)/bin"
        if let currentPath = env["PATH"] {
            env["PATH"] = "\(pathsToAdd):\(currentPath)"
        } else {
            env["PATH"] = pathsToAdd
        }
        proc.environment = env

        do {
            try proc.run()
            self.serverProcess = proc
        } catch {
            print("Failed to auto-spawn npm run dev: \(error)")
        }

        var attempts = 0
        Timer.scheduledTimer(withTimeInterval: 0.5, repeats: true) { timer in
            attempts += 1
            self.checkServerReachable { isLive in
                if isLive || attempts >= 40 {
                    timer.invalidate()
                    completion()
                }
            }
        }
    }

    private func loadAppUrl() {
        if let url = URL(string: appUrlString) {
            webView.load(URLRequest(url: url))
        }
    }

    func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
        webView.pageZoom = currentZoom
        hideLoadingOverlay()
    }

    func webView(_ webView: WKWebView, didFailProvisionalNavigation navigation: WKNavigation!, withError error: Error) {
        DispatchQueue.main.asyncAfter(deadline: .now() + 1.0) { [weak self] in
            self?.loadAppUrl()
        }
    }

    // ── Task Bar / Menu Bar Status Item ──────────────────────────────────────
    private func setupStatusItem() {
        statusItem = NSStatusBar.system.statusItem(withLength: NSStatusItem.variableLength)

        if let button = statusItem.button {
            button.image = createStatusBarTemplateIcon()
            button.imagePosition = .imageOnly
            button.toolTip = "FullCode — Quick IDE Actions"
        }

        rebuildStatusMenu()
    }

    private func createStatusBarTemplateIcon() -> NSImage {
        let size = NSSize(width: 20, height: 16)
        let img = NSImage(size: size, flipped: false) { _ in
            let path = NSBezierPath()
            // Left Chevron <
            path.move(to: NSPoint(x: 5.0, y: 12.0))
            path.line(to: NSPoint(x: 1.5, y: 8.0))
            path.line(to: NSPoint(x: 5.0, y: 4.0))

            // Forward Slash /
            path.move(to: NSPoint(x: 8.5, y: 3.0))
            path.line(to: NSPoint(x: 12.0, y: 13.0))

            // Right Chevron >
            path.move(to: NSPoint(x: 15.0, y: 12.0))
            path.line(to: NSPoint(x: 18.5, y: 8.0))
            path.line(to: NSPoint(x: 15.0, y: 4.0))

            path.lineWidth = 1.75
            path.lineCapStyle = .round
            path.lineJoinStyle = .round
            NSColor.black.setStroke()
            path.stroke()
            return true
        }
        img.isTemplate = true
        return img
    }

    private func rebuildStatusMenu() {
        let menu = NSMenu()

        // 1. Header with dynamic status dot
        let headerTitle = isCompiling ? "⚡️ FullCode — Compiling..." : "🟢 FullCode — Local Engine Active"
        statusHeaderItem = NSMenuItem(title: headerTitle, action: nil, keyEquivalent: "")
        statusHeaderItem.isEnabled = false
        menu.addItem(statusHeaderItem)

        // 2. Active file indicator
        statusFileItem = NSMenuItem(title: "   📄 \(currentFileName) (\(currentLanguage))", action: nil, keyEquivalent: "")
        statusFileItem.isEnabled = false
        menu.addItem(statusFileItem)

        menu.addItem(NSMenuItem.separator())

        // 3. Show / Bring to Front
        let showItem = NSMenuItem(title: "Open / Focus FullCode IDE", action: #selector(showWindow), keyEquivalent: "o")
        showItem.target = self
        menu.addItem(showItem)

        let hideItem = NSMenuItem(title: "Hide to Task Bar", action: #selector(hideWindow), keyEquivalent: "h")
        hideItem.target = self
        menu.addItem(hideItem)

        let onTopItem = NSMenuItem(title: "📌 Always on Top", action: #selector(handleToggleAlwaysOnTop), keyEquivalent: "p")
        onTopItem.keyEquivalentModifierMask = [.command, .shift]
        onTopItem.state = isAlwaysOnTop ? .on : .off
        onTopItem.target = self
        menu.addItem(onTopItem)

        menu.addItem(NSMenuItem.separator())

        // 4. Quick Actions
        statusRunItem = NSMenuItem(title: "⚡️ Run Active Code", action: #selector(handleRunCode), keyEquivalent: "\r")
        statusRunItem.target = self
        menu.addItem(statusRunItem)

        let openFolderItem = NSMenuItem(title: "📂 Open Project Folder...", action: #selector(handleOpenLocalFolder), keyEquivalent: "O")
        openFolderItem.keyEquivalentModifierMask = [.command, .shift]
        openFolderItem.target = self
        menu.addItem(openFolderItem)

        let openTerminalItem = NSMenuItem(title: "💻 Open macOS Terminal Here", action: #selector(handleOpenMacOSTerminal), keyEquivalent: "t")
        openTerminalItem.keyEquivalentModifierMask = [.command, .option]
        openTerminalItem.target = self
        menu.addItem(openTerminalItem)

        let openWebItem = NSMenuItem(title: "🌐 Open Website in Browser (Safari / Chrome)", action: #selector(handleOpenWebsite), keyEquivalent: "b")
        openWebItem.target = self
        menu.addItem(openWebItem)

        let newFileItem = NSMenuItem(title: "📝 New Scratchpad File", action: #selector(handleNewFile), keyEquivalent: "n")
        newFileItem.target = self
        menu.addItem(newFileItem)

        let clearOutItem = NSMenuItem(title: "🧹 Clear Output & Console", action: #selector(handleClearOutput), keyEquivalent: "l")
        clearOutItem.keyEquivalentModifierMask = [.control]
        clearOutItem.target = self
        menu.addItem(clearOutItem)

        let copyCodeItem = NSMenuItem(title: "📋 Copy Code to Clipboard", action: #selector(handleCopyCode), keyEquivalent: "c")
        copyCodeItem.keyEquivalentModifierMask = [.command, .shift]
        copyCodeItem.target = self
        menu.addItem(copyCodeItem)

        menu.addItem(NSMenuItem.separator())

        // 5. Open Files Tab Switcher
        if !openFilesList.isEmpty {
            let filesSubmenu = NSMenu()
            for f in openFilesList {
                let fItem = NSMenuItem(title: f.name, action: #selector(handleSwitchFile(_:)), keyEquivalent: "")
                fItem.target = self
                fItem.representedObject = f.id
                if f.id == activeFileId {
                    fItem.state = .on
                }
                filesSubmenu.addItem(fItem)
            }
            let openFilesMenuItem = NSMenuItem(title: "📂 Open Files (\(openFilesList.count))...", action: nil, keyEquivalent: "")
            openFilesMenuItem.submenu = filesSubmenu
            menu.addItem(openFilesMenuItem)
        }

        // 6. Quick Language Selector Submenu
        let langSubmenu = NSMenu()
        let languages: [(String, String)] = [
            ("Python 3", "python"),
            ("C++ (clang++)", "cpp"),
            ("C (clang)", "c"),
            ("Java (JDK)", "java"),
            ("JavaScript (Node)", "javascript"),
            ("TypeScript", "typescript"),
            ("Go", "go"),
            ("Swift", "swift"),
            ("Rust", "rust"),
            ("SQL (SQLite)", "sql"),
            ("HTML / CSS", "html")
        ]

        for (label, langCode) in languages {
            let item = NSMenuItem(title: label, action: #selector(handleSelectLanguage(_:)), keyEquivalent: "")
            item.target = self
            item.representedObject = langCode
            if langCode.lowercased() == currentLanguage.lowercased() {
                item.state = .on
            }
            langSubmenu.addItem(item)
        }

        let langMenuItem = NSMenuItem(title: "🔀 New File with Language...", action: nil, keyEquivalent: "")
        langMenuItem.submenu = langSubmenu
        menu.addItem(langMenuItem)

        menu.addItem(NSMenuItem.separator())

        // 7. Zoom Menu
        let zoomPercent = Int(round(currentZoom * 100))
        let zoomSubmenu = NSMenu()

        let zoomInItem = NSMenuItem(title: "Zoom In (⌘+)", action: #selector(handleZoomIn), keyEquivalent: "=")
        zoomInItem.target = self
        zoomSubmenu.addItem(zoomInItem)

        let zoomOutItem = NSMenuItem(title: "Zoom Out (⌘-)", action: #selector(handleZoomOut), keyEquivalent: "-")
        zoomOutItem.target = self
        zoomSubmenu.addItem(zoomOutItem)

        let resetZoomItem = NSMenuItem(title: "Actual Size 100% (⌘0)", action: #selector(handleActualSize), keyEquivalent: "0")
        resetZoomItem.target = self
        zoomSubmenu.addItem(resetZoomItem)

        zoomSubmenu.addItem(NSMenuItem.separator())
        let zoomLevels: [CGFloat] = [0.5, 0.75, 1.0, 1.25, 1.5, 1.75, 2.0]
        for lvl in zoomLevels {
            let p = Int(round(lvl * 100))
            let pItem = NSMenuItem(title: "\(p)%", action: #selector(handleSetZoomLevel(_:)), keyEquivalent: "")
            pItem.target = self
            pItem.representedObject = lvl
            if abs(currentZoom - lvl) < 0.05 {
                pItem.state = .on
            }
            zoomSubmenu.addItem(pItem)
        }

        let zoomParent = NSMenuItem(title: "🔍 Zoom (\(zoomPercent)%)", action: nil, keyEquivalent: "")
        zoomParent.submenu = zoomSubmenu
        menu.addItem(zoomParent)

        // 8. Workspace Controls
        let toggleThemeItem = NSMenuItem(title: "🌓 Toggle Theme", action: #selector(handleToggleTheme), keyEquivalent: "t")
        toggleThemeItem.keyEquivalentModifierMask = [.command, .shift]
        toggleThemeItem.target = self
        menu.addItem(toggleThemeItem)

        let reloadItem = NSMenuItem(title: "🔄 Reload Workspace", action: #selector(handleReload), keyEquivalent: "r")
        reloadItem.target = self
        menu.addItem(reloadItem)

        let restartServerItem = NSMenuItem(title: "⚡️ Restart Local Services", action: #selector(handleRestartServer), keyEquivalent: "")
        restartServerItem.target = self
        menu.addItem(restartServerItem)

        let fullscreenItem = NSMenuItem(title: "🖥 Toggle Fullscreen", action: #selector(handleToggleFullscreen), keyEquivalent: "f")
        fullscreenItem.keyEquivalentModifierMask = [.control, .command]
        fullscreenItem.target = self
        menu.addItem(fullscreenItem)

        menu.addItem(NSMenuItem.separator())

        // 9. Info & Quit
        let aboutItem = NSMenuItem(title: "ℹ️ About FullCode IDE", action: #selector(handleAbout), keyEquivalent: "")
        aboutItem.target = self
        menu.addItem(aboutItem)

        menu.addItem(NSMenuItem.separator())

        let quitItem = NSMenuItem(title: "🚪 Quit FullCode", action: #selector(handleQuit), keyEquivalent: "q")
        quitItem.target = self
        menu.addItem(quitItem)

        statusItem.menu = menu
    }

    // ── Standard macOS Application Main Menu ────────────────────────────────
    private func setupMainMenu() {
        let mainMenu = NSMenu()

        // 1. App Menu
        let appMenuItem = NSMenuItem()
        mainMenu.addItem(appMenuItem)
        let appMenu = NSMenu()
        appMenuItem.submenu = appMenu

        let aboutItem = NSMenuItem(title: "About FullCode IDE", action: #selector(handleAbout), keyEquivalent: "")
        aboutItem.target = self
        appMenu.addItem(aboutItem)
        appMenu.addItem(NSMenuItem.separator())

        let hideAppItem = NSMenuItem(title: "Hide FullCode", action: #selector(NSApplication.hide(_:)), keyEquivalent: "h")
        appMenu.addItem(hideAppItem)

        let hideOthersItem = NSMenuItem(title: "Hide Others", action: #selector(NSApplication.hideOtherApplications(_:)), keyEquivalent: "h")
        hideOthersItem.keyEquivalentModifierMask = [.command, .option]
        appMenu.addItem(hideOthersItem)

        let showAllItem = NSMenuItem(title: "Show All", action: #selector(NSApplication.unhideAllApplications(_:)), keyEquivalent: "")
        appMenu.addItem(showAllItem)
        appMenu.addItem(NSMenuItem.separator())

        let quitAppItem = NSMenuItem(title: "Quit FullCode", action: #selector(handleQuit), keyEquivalent: "q")
        quitAppItem.target = self
        appMenu.addItem(quitAppItem)

        // 2. File Menu
        let fileMenuItem = NSMenuItem()
        mainMenu.addItem(fileMenuItem)
        let fileMenu = NSMenu(title: "File")
        fileMenuItem.submenu = fileMenu

        let newFile = NSMenuItem(title: "New File", action: #selector(handleNewFile), keyEquivalent: "n")
        newFile.target = self
        fileMenu.addItem(newFile)

        let openFile = NSMenuItem(title: "Open File...", action: #selector(handleOpenLocalFile), keyEquivalent: "o")
        openFile.target = self
        fileMenu.addItem(openFile)

        let openFolder = NSMenuItem(title: "Open Project Folder...", action: #selector(handleOpenLocalFolder), keyEquivalent: "O")
        openFolder.keyEquivalentModifierMask = [.command, .shift]
        openFolder.target = self
        fileMenu.addItem(openFolder)

        fileMenu.addItem(NSMenuItem.separator())

        let saveFile = NSMenuItem(title: "Save", action: #selector(handleSaveFile), keyEquivalent: "s")
        saveFile.target = self
        fileMenu.addItem(saveFile)

        let saveFileAs = NSMenuItem(title: "Save As...", action: #selector(handleSaveFileAs), keyEquivalent: "S")
        saveFileAs.keyEquivalentModifierMask = [.command, .shift]
        saveFileAs.target = self
        fileMenu.addItem(saveFileAs)

        fileMenu.addItem(NSMenuItem.separator())

        let revealFinder = NSMenuItem(title: "Reveal in Finder", action: #selector(handleRevealInFinder), keyEquivalent: "r")
        revealFinder.keyEquivalentModifierMask = [.command, .option]
        revealFinder.target = self
        fileMenu.addItem(revealFinder)

        let exportZip = NSMenuItem(title: "Export Project as ZIP...", action: #selector(handleExportZip), keyEquivalent: "e")
        exportZip.keyEquivalentModifierMask = [.command, .shift]
        exportZip.target = self
        fileMenu.addItem(exportZip)

        fileMenu.addItem(NSMenuItem.separator())

        let closeWindow = NSMenuItem(title: "Close Tab", action: #selector(handleCloseTab), keyEquivalent: "w")
        closeWindow.target = self
        fileMenu.addItem(closeWindow)

        // 3. Edit Menu (Standard macOS Copy/Paste/Undo/Redo for WebKit)
        let editMenuItem = NSMenuItem()
        mainMenu.addItem(editMenuItem)
        let editMenu = NSMenu(title: "Edit")
        editMenuItem.submenu = editMenu

        editMenu.addItem(NSMenuItem(title: "Undo", action: Selector(("undo:")), keyEquivalent: "z"))
        let redoItem = NSMenuItem(title: "Redo", action: Selector(("redo:")), keyEquivalent: "Z")
        redoItem.keyEquivalentModifierMask = [.command, .shift]
        editMenu.addItem(redoItem)
        editMenu.addItem(NSMenuItem.separator())

        editMenu.addItem(NSMenuItem(title: "Cut", action: Selector(("cut:")), keyEquivalent: "x"))
        editMenu.addItem(NSMenuItem(title: "Copy", action: Selector(("copy:")), keyEquivalent: "c"))
        editMenu.addItem(NSMenuItem(title: "Paste", action: Selector(("paste:")), keyEquivalent: "v"))
        editMenu.addItem(NSMenuItem(title: "Select All", action: Selector(("selectAll:")), keyEquivalent: "a"))
        editMenu.addItem(NSMenuItem.separator())

        let formatCode = NSMenuItem(title: "Format Document", action: #selector(handleFormatCode), keyEquivalent: "F")
        formatCode.keyEquivalentModifierMask = [.command, .shift, .option]
        formatCode.target = self
        editMenu.addItem(formatCode)

        // 4. Run Menu
        let runMenuItem = NSMenuItem()
        mainMenu.addItem(runMenuItem)
        let runMenu = NSMenu(title: "Run")
        runMenuItem.submenu = runMenu

        let runCode = NSMenuItem(title: "Run Active Code", action: #selector(handleRunCode), keyEquivalent: "\r")
        runCode.target = self
        runMenu.addItem(runCode)

        let toggleEngine = NSMenuItem(title: "Toggle Engine (Local ⚡️ / Cloud 🌐)", action: #selector(handleToggleEngine), keyEquivalent: "m")
        toggleEngine.keyEquivalentModifierMask = [.command, .shift]
        toggleEngine.target = self
        runMenu.addItem(toggleEngine)

        let clearOutput = NSMenuItem(title: "Clear Console Output", action: #selector(handleClearOutput), keyEquivalent: "l")
        clearOutput.keyEquivalentModifierMask = [.control]
        clearOutput.target = self
        runMenu.addItem(clearOutput)

        // 5. Terminal Menu (Dedicated Real Terminal Support)
        let termMenuItem = NSMenuItem()
        mainMenu.addItem(termMenuItem)
        let termMenu = NSMenu(title: "Terminal")
        termMenuItem.submenu = termMenu

        let toggleTerm = NSMenuItem(title: "Toggle Integrated Terminal", action: #selector(handleToggleTerminal), keyEquivalent: "`")
        toggleTerm.keyEquivalentModifierMask = [.command]
        toggleTerm.target = self
        termMenu.addItem(toggleTerm)

        let openMacTerm = NSMenuItem(title: "Open in macOS Terminal.app", action: #selector(handleOpenMacOSTerminal), keyEquivalent: "t")
        openMacTerm.keyEquivalentModifierMask = [.command, .option]
        openMacTerm.target = self
        termMenu.addItem(openMacTerm)

        let clearTerm = NSMenuItem(title: "Clear Terminal Screen", action: #selector(handleClearTerminal), keyEquivalent: "k")
        clearTerm.keyEquivalentModifierMask = [.command]
        clearTerm.target = self
        termMenu.addItem(clearTerm)

        // 6. Website Menu (Dedicated Separate Website Features)
        let webMenuItem = NSMenuItem()
        mainMenu.addItem(webMenuItem)
        let webMenu = NSMenu(title: "Website")
        webMenuItem.submenu = webMenu

        let openWebBrowser = NSMenuItem(title: "Open Website Version in Safari / Chrome", action: #selector(handleOpenWebsite), keyEquivalent: "b")
        openWebBrowser.target = self
        webMenu.addItem(openWebBrowser)

        let copyWebUrl = NSMenuItem(title: "Copy Web URL to Clipboard", action: #selector(handleCopyWebUrl), keyEquivalent: "")
        copyWebUrl.target = self
        webMenu.addItem(copyWebUrl)

        let toggleWebPreview = NSMenuItem(title: "Toggle Live Web Preview Tab", action: #selector(handleToggleWebPreview), keyEquivalent: "p")
        toggleWebPreview.keyEquivalentModifierMask = [.command, .option]
        toggleWebPreview.target = self
        webMenu.addItem(toggleWebPreview)

        // 7. View Menu (Zooming, Always on Top, Fullscreen)
        let viewMenuItem = NSMenuItem()
        mainMenu.addItem(viewMenuItem)
        let viewMenu = NSMenu(title: "View")
        viewMenuItem.submenu = viewMenu

        let toggleExplorer = NSMenuItem(title: "Toggle File Explorer", action: #selector(handleToggleExplorer), keyEquivalent: "e")
        toggleExplorer.keyEquivalentModifierMask = [.command, .shift]
        toggleExplorer.target = self
        viewMenu.addItem(toggleExplorer)

        let toggleZen = NSMenuItem(title: "Toggle Zen / Focus Mode", action: #selector(handleToggleZenMode), keyEquivalent: "z")
        toggleZen.keyEquivalentModifierMask = [.option]
        toggleZen.target = self
        viewMenu.addItem(toggleZen)

        let reload = NSMenuItem(title: "Reload IDE", action: #selector(handleReload), keyEquivalent: "r")
        reload.target = self
        viewMenu.addItem(reload)

        viewMenu.addItem(NSMenuItem.separator())

        // Smooth Zooming Items
        let zoomInItem = NSMenuItem(title: "Zoom In", action: #selector(handleZoomIn), keyEquivalent: "=")
        zoomInItem.target = self
        viewMenu.addItem(zoomInItem)

        let zoomOutItem = NSMenuItem(title: "Zoom Out", action: #selector(handleZoomOut), keyEquivalent: "-")
        zoomOutItem.target = self
        viewMenu.addItem(zoomOutItem)

        let actualSizeItem = NSMenuItem(title: "Actual Size (Reset Zoom)", action: #selector(handleActualSize), keyEquivalent: "0")
        actualSizeItem.target = self
        viewMenu.addItem(actualSizeItem)

        viewMenu.addItem(NSMenuItem.separator())

        let alwaysOnTopItem = NSMenuItem(title: "Always on Top", action: #selector(handleToggleAlwaysOnTop), keyEquivalent: "p")
        alwaysOnTopItem.keyEquivalentModifierMask = [.command, .shift]
        alwaysOnTopItem.state = isAlwaysOnTop ? .on : .off
        alwaysOnTopItem.target = self
        viewMenu.addItem(alwaysOnTopItem)

        let toggleFullscreen = NSMenuItem(title: "Toggle Full Screen", action: #selector(handleToggleFullscreen), keyEquivalent: "f")
        toggleFullscreen.keyEquivalentModifierMask = [.control, .command]
        toggleFullscreen.target = self
        viewMenu.addItem(toggleFullscreen)

        let devTools = NSMenuItem(title: "Inspect Element / DevTools", action: #selector(handleInspect), keyEquivalent: "i")
        devTools.keyEquivalentModifierMask = [.command, .option]
        devTools.target = self
        viewMenu.addItem(devTools)

        // 8. Window Menu
        let windowMenuItem = NSMenuItem()
        mainMenu.addItem(windowMenuItem)
        let windowMenu = NSMenu(title: "Window")
        windowMenuItem.submenu = windowMenu

        let minItem = NSMenuItem(title: "Minimize", action: #selector(NSWindow.performMiniaturize(_:)), keyEquivalent: "m")
        windowMenu.addItem(minItem)

        let bringAllItem = NSMenuItem(title: "Bring All to Front", action: #selector(NSApplication.arrangeInFront(_:)), keyEquivalent: "")
        windowMenu.addItem(bringAllItem)

        NSApp.mainMenu = mainMenu
    }

    // ── Dock Menu Actions ────────────────────────────────────────────────────
    func applicationDockMenu(_ sender: NSApplication) -> NSMenu? {
        let dockMenu = NSMenu()

        let showItem = NSMenuItem(title: "Show FullCode", action: #selector(showWindow), keyEquivalent: "")
        showItem.target = self
        dockMenu.addItem(showItem)

        let runItem = NSMenuItem(title: "⚡️ Run Active Code", action: #selector(handleRunCode), keyEquivalent: "")
        runItem.target = self
        dockMenu.addItem(runItem)

        let openFolder = NSMenuItem(title: "📂 Open Project Folder...", action: #selector(handleOpenLocalFolder), keyEquivalent: "")
        openFolder.target = self
        dockMenu.addItem(openFolder)

        let newItem = NSMenuItem(title: "📝 New File", action: #selector(handleNewFile), keyEquivalent: "")
        newItem.target = self
        dockMenu.addItem(newItem)

        let openWeb = NSMenuItem(title: "🌐 Open Website in Browser", action: #selector(handleOpenWebsite), keyEquivalent: "")
        openWeb.target = self
        dockMenu.addItem(openWeb)

        dockMenu.addItem(NSMenuItem.separator())

        let reloadItem = NSMenuItem(title: "🔄 Reload IDE", action: #selector(handleReload), keyEquivalent: "")
        reloadItem.target = self
        dockMenu.addItem(reloadItem)

        return dockMenu
    }

    // ── Native File & Folder Dialogs ─────────────────────────────────────────
    @objc func handleOpenLocalFolder() {
        showWindow()
        let panel = NSOpenPanel()
        panel.canChooseFiles = false
        panel.canChooseDirectories = true
        panel.canCreateDirectories = true
        panel.allowsMultipleSelection = false
        panel.prompt = "Open Project Folder"
        panel.message = "Select a workspace folder to open in FullCode IDE"

        panel.beginSheetModal(for: window) { [weak self] response in
            guard let self = self, response == .OK, let folderUrl = panel.url else { return }
            self.activeWorkspacePath = folderUrl.path
            self.loadDirectoryIntoWorkspace(folderUrl: folderUrl)
        }
    }

    private func loadDirectoryIntoWorkspace(folderUrl: URL) {
        DispatchQueue.global(qos: .userInitiated).async { [weak self] in
            guard let self = self else { return }
            let fileManager = FileManager.default
            let folderName = folderUrl.lastPathComponent
            var scannedFiles: [[String: String]] = []

            let ignoredDirs: Set<String> = [".git", "node_modules", "dist", ".DS_Store", ".idea", ".vscode", "build", "__pycache__", ".vercel", "scratch"]
            let enumerator = fileManager.enumerator(
                at: folderUrl,
                includingPropertiesForKeys: [.isRegularFileKey, .fileSizeKey],
                options: [.skipsHiddenFiles]
            )

            while let fileUrl = enumerator?.nextObject() as? URL {
                let pathParts = fileUrl.pathComponents
                if pathParts.contains(where: { ignoredDirs.contains($0) }) {
                    continue
                }

                guard let resourceValues = try? fileUrl.resourceValues(forKeys: [.isRegularFileKey, .fileSizeKey]),
                      resourceValues.isRegularFile == true,
                      let size = resourceValues.fileSize,
                      size < 1_500_000 else {
                    continue
                }

                // Check extension
                let ext = fileUrl.pathExtension.lowercased()
                let textExtensions: Set<String> = [
                    "py", "js", "jsx", "ts", "tsx", "c", "cpp", "h", "hpp", "java",
                    "go", "rs", "swift", "sql", "html", "css", "json", "md", "txt", "sh", "zsh", "yaml", "yml", "xml", "csv"
                ]
                if !textExtensions.contains(ext) && !ext.isEmpty {
                    continue
                }

                let relativePath = fileUrl.path.replacingOccurrences(of: folderUrl.path + "/", with: "")
                if let content = try? String(contentsOf: fileUrl, encoding: .utf8) {
                    scannedFiles.append(["name": relativePath, "content": content])
                }

                if scannedFiles.count >= 250 {
                    break // Prevent crashing on huge repos
                }
            }

            DispatchQueue.main.async {
                self.dispatchNativeFolderLoad(folderName: folderName, folderPath: folderUrl.path, files: scannedFiles)
            }
        }
    }

    private func dispatchNativeFolderLoad(folderName: String, folderPath: String, files: [[String: String]]) {
        var payload: [String: Any] = [
            "type": "load-local-folder",
            "folderName": folderName,
            "folderPath": folderPath,
            "files": files
        ]
        if let data = try? JSONSerialization.data(withJSONObject: payload),
           let jsonStr = String(data: data, encoding: .utf8) {
            let js = "window.dispatchEvent(new CustomEvent('onlinecompiler-native-action', { detail: \(jsonStr) }));"
            webView.evaluateJavaScript(js, completionHandler: nil)
        }
    }

    @objc func handleOpenLocalFile() {
        showWindow()
        let panel = NSOpenPanel()
        panel.canChooseFiles = true
        panel.canChooseDirectories = false
        panel.allowsMultipleSelection = true
        panel.prompt = "Open File"

        panel.beginSheetModal(for: window) { [weak self] response in
            guard let self = self, response == .OK else { return }
            for url in panel.urls {
                guard let content = try? String(contentsOf: url, encoding: .utf8) else { continue }
                let name = url.lastPathComponent
                let payload: [String: Any] = [
                    "type": "load-local-file",
                    "name": name,
                    "path": url.path,
                    "content": content
                ]
                if let data = try? JSONSerialization.data(withJSONObject: payload),
                   let jsonStr = String(data: data, encoding: .utf8) {
                    let js = "window.dispatchEvent(new CustomEvent('onlinecompiler-native-action', { detail: \(jsonStr) }));"
                    self.webView.evaluateJavaScript(js, completionHandler: nil)
                }
            }
        }
    }

    @objc func handleSaveFileAs() {
        let panel = NSSavePanel()
        panel.prompt = "Save File"
        panel.nameFieldStringValue = currentFileName

        panel.beginSheetModal(for: window) { [weak self] response in
            guard let self = self, response == .OK, let saveUrl = panel.url else { return }
            // Request active code from WebKit to save to this path
            let js = "(() => { const code = window.__FULLCODE_GET_ACTIVE_CODE ? window.__FULLCODE_GET_ACTIVE_CODE() : ''; window.webkit.messageHandlers.nativeHost.postMessage({ type: 'save_to_path', path: '\(saveUrl.path)', code: code }); return true; })()"
            self.webView.evaluateJavaScript(js, completionHandler: nil)
        }
    }

    @objc func handleRevealInFinder() {
        let targetPath = activeWorkspacePath.isEmpty ? projectDirectory : activeWorkspacePath
        let url = URL(fileURLWithPath: targetPath)
        NSWorkspace.shared.activateFileViewerSelecting([url])
    }

    @objc func handleOpenMacOSTerminal() {
        let targetPath = activeWorkspacePath.isEmpty ? projectDirectory : activeWorkspacePath
        let proc = Process()
        proc.executableURL = URL(fileURLWithPath: "/usr/bin/open")
        proc.arguments = ["-a", "Terminal", targetPath]
        try? proc.run()
    }

    @objc func handleOpenWebsite() {
        if let url = URL(string: appUrlString) {
            NSWorkspace.shared.open(url)
        }
    }

    @objc func handleCopyWebUrl() {
        let pb = NSPasteboard.general
        pb.clearContents()
        pb.setString(appUrlString, forType: .string)
        dispatchNativeAction("toast", extra: ["message": "Web URL copied to clipboard: \(appUrlString) 🌐"])
    }

    @objc func handleToggleEngine() {
        dispatchNativeAction("toggle-engine")
    }

    @objc func handleToggleTerminal() {
        dispatchNativeAction("toggle-terminal")
    }

    @objc func handleClearTerminal() {
        dispatchNativeAction("clear-terminal")
    }

    @objc func handleToggleWebPreview() {
        dispatchNativeAction("toggle-web-preview")
    }

    @objc func handleToggleExplorer() {
        dispatchNativeAction("toggle-explorer")
    }

    @objc func handleToggleZenMode() {
        dispatchNativeAction("toggle-zen")
    }

    @objc func handleFormatCode() {
        dispatchNativeAction("format-code")
    }

    @objc func handleExportZip() {
        dispatchNativeAction("export-zip")
    }

    @objc func handleCloseTab() {
        dispatchNativeAction("close-tab")
    }

    // ── Zoom Management ──────────────────────────────────────────────────────
    @objc func handleZoomIn() {
        setZoom(min(currentZoom + 0.15, 3.0))
    }

    @objc func handleZoomOut() {
        setZoom(max(currentZoom - 0.15, 0.4))
    }

    @objc func handleActualSize() {
        setZoom(1.0)
    }

    @objc func handleSetZoomLevel(_ sender: NSMenuItem) {
        guard let lvl = sender.representedObject as? CGFloat else { return }
        setZoom(lvl)
    }

    func setZoom(_ zoom: CGFloat) {
        currentZoom = zoom
        webView.pageZoom = zoom
        UserDefaults.standard.set(Double(zoom), forKey: "FullCodePageZoom")
        let percent = Int(round(zoom * 100))
        dispatchNativeAction("zoom-change", extra: ["percent": "\(percent)"])
        rebuildStatusMenu()
    }

    // ── Actions & Event Dispatching to Web App ──────────────────────────────
    @objc func showWindow() {
        if window.isMiniaturized {
            window.deminiaturize(nil)
        }
        window.makeKeyAndOrderFront(nil)
        NSApp.activate(ignoringOtherApps: true)
    }

    @objc func hideWindow() {
        window.orderOut(nil)
    }

    @objc func handleToggleAlwaysOnTop() {
        isAlwaysOnTop.toggle()
        window.level = isAlwaysOnTop ? .floating : .normal
        UserDefaults.standard.set(isAlwaysOnTop, forKey: "FullCodeAlwaysOnTop")
        rebuildStatusMenu()
        setupMainMenu()
    }

    @objc func handleRunCode() {
        dispatchNativeAction("run")
        showWindow()
    }

    @objc func handleNewFile() {
        dispatchNativeAction("new-file")
        showWindow()
    }

    @objc func handleClearOutput() {
        dispatchNativeAction("clear-output")
    }

    @objc func handleSaveFile() {
        dispatchNativeAction("save")
    }

    @objc func handleCopyCode() {
        let js = "(() => { window.dispatchEvent(new CustomEvent('onlinecompiler-native-action', { detail: { type: 'copy-code' } })); return true; })()"
        webView.evaluateJavaScript(js, completionHandler: nil)
    }

    @objc func handleSwitchFile(_ sender: NSMenuItem) {
        guard let fileId = sender.representedObject as? String else { return }
        dispatchNativeAction("switch-file", extra: ["fileId": fileId])
        showWindow()
    }

    @objc func handleSelectLanguage(_ sender: NSMenuItem) {
        guard let lang = sender.representedObject as? String else { return }
        dispatchNativeAction("new-file-lang", extra: ["language": lang])
        showWindow()
    }

    @objc func handleToggleTheme() {
        dispatchNativeAction("toggle-theme")
    }

    @objc func handleReload() {
        webView.reload()
    }

    @objc func handleRestartServer() {
        setupLoadingOverlay()
        loadingLabel?.stringValue = "Restarting local compiler & terminal services…"

        let killProc = Process()
        killProc.executableURL = URL(fileURLWithPath: "/bin/zsh")
        killProc.arguments = ["-c", "lsof -ti :5173,:5001 | xargs kill -9 2>/dev/null || true"]
        try? killProc.run()
        killProc.waitUntilExit()

        startBackgroundServer { [weak self] in
            DispatchQueue.main.async {
                self?.loadAppUrl()
            }
        }
    }

    @objc func handleToggleFullscreen() {
        window.toggleFullScreen(nil)
    }

    @objc func handleInspect() {
        webView.evaluateJavaScript("console.log('FullCode native inspect requested')", completionHandler: nil)
    }

    @objc func handleAbout() {
        let alert = NSAlert()
        alert.messageText = "FullCode IDE"
        alert.informativeText = "Version 1.5.0 (Native macOS Silicon/Intel)\n\n⚡️ Local Fast Engine: Sub-millisecond compilation with Mac CPU\n💻 Native Terminal Bridge: Integrated zsh/bash execution\n📂 Full Workspace Management: Open local folders & files\n🌐 Dedicated Website Function: Live preview & Safari integration"
        alert.alertStyle = .informational
        if let iconUrl = Bundle.main.url(forResource: "AppIcon", withExtension: "icns"),
           let iconImg = NSImage(contentsOf: iconUrl) {
            alert.icon = iconImg
        }
        alert.addButton(withTitle: "OK")
        alert.runModal()
    }

    @objc func handleQuit() {
        NSApp.terminate(nil)
    }

    private func dispatchNativeAction(_ type: String, extra: [String: String] = [:]) {
        var payload: [String: Any] = ["type": type]
        for (k, v) in extra { payload[k] = v }
        if let data = try? JSONSerialization.data(withJSONObject: payload),
           let jsonStr = String(data: data, encoding: .utf8) {
            let js = "window.dispatchEvent(new CustomEvent('onlinecompiler-native-action', { detail: \(jsonStr) }));"
            webView.evaluateJavaScript(js, completionHandler: nil)
        }
    }

    private func sendExecutionNotification(status: String, executionTime: String?, error: String?) {
        guard !NSApp.isActive else { return }

        let content = UNMutableNotificationContent()
        if status == "success" {
            content.title = "FullCode — Execution Succeeded ✅"
            let timeStr = (executionTime != nil && !executionTime!.isEmpty) ? "Completed in \(executionTime!)s" : "Completed successfully"
            content.body = "\(currentFileName) (\(currentLanguage)) • \(timeStr)"
        } else if status == "error" {
            content.title = "FullCode — Execution Error ❌"
            content.body = error?.prefix(120).trimmingCharacters(in: .whitespacesAndNewlines) ?? "Error executing \(currentFileName)"
        } else {
            return
        }
        content.sound = UNNotificationSound.default
        let req = UNNotificationRequest(identifier: UUID().uuidString, content: content, trigger: nil)
        UNUserNotificationCenter.current().add(req, withCompletionHandler: nil)
    }

    // ── Script Message Handler from Web App ─────────────────────────────────
    func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage) {
        guard message.name == "nativeHost",
              let dict = message.body as? [String: Any] else { return }

        let msgType = dict["type"] as? String ?? ""

        switch msgType {
        case "zoom_in":
            handleZoomIn()

        case "zoom_out":
            handleZoomOut()

        case "zoom_reset":
            handleActualSize()

        case "open_local_folder":
            handleOpenLocalFolder()

        case "open_local_file":
            handleOpenLocalFile()

        case "open_website":
            handleOpenWebsite()

        case "open_terminal":
            handleOpenMacOSTerminal()

        case "reveal_in_finder":
            handleRevealInFinder()

        case "save_to_path":
            if let path = dict["path"] as? String, let code = dict["code"] as? String {
                do {
                    try code.write(toFile: path, atomically: true, encoding: .utf8)
                    dispatchNativeAction("toast", extra: ["message": "Saved to \(URL(fileURLWithPath: path).lastPathComponent) 💾"])
                } catch {
                    dispatchNativeAction("toast", extra: ["message": "Save failed: \(error.localizedDescription) ❌"])
                }
            }

        case "status_update":
            if let status = dict["status"] as? String {
                let wasCompiling = self.isCompiling
                self.isCompiling = (status == "compiling" || status == "running")
                if wasCompiling && (status == "success" || status == "error") {
                    let execTime = dict["executionTime"] as? String
                    let errPreview = dict["error"] as? String
                    sendExecutionNotification(status: status, executionTime: execTime, error: errPreview)
                }
            }
            if let filename = dict["filename"] as? String, !filename.isEmpty {
                self.currentFileName = filename
            }
            if let lang = dict["language"] as? String, !lang.isEmpty {
                self.currentLanguage = lang
            }
            if let activeId = dict["activeId"] as? String {
                self.activeFileId = activeId
            }
            if let rawFiles = dict["files"] as? [[String: String]] {
                self.openFilesList = rawFiles.compactMap {
                    guard let id = $0["id"], let name = $0["name"] else { return nil }
                    return (id: id, name: name)
                }
            }
            DispatchQueue.main.async {
                self.rebuildStatusMenu()
            }

        case "copy_clipboard":
            if let text = dict["text"] as? String {
                let pb = NSPasteboard.general
                pb.clearContents()
                pb.setString(text, forType: .string)
            }

        default:
            break
        }
    }

    // ── Window & App Delegate Callbacks ──────────────────────────────────────
    func windowShouldClose(_ sender: NSWindow) -> Bool {
        sender.orderOut(nil)
        return false
    }

    func applicationShouldHandleReopen(_ sender: NSApplication, hasVisibleWindows flag: Bool) -> Bool {
        showWindow()
        return true
    }

    func applicationWillTerminate(_ notification: Notification) {
        if startedServerMyself, let proc = serverProcess, proc.isRunning {
            proc.terminate()
            let killProc = Process()
            killProc.executableURL = URL(fileURLWithPath: "/bin/zsh")
            killProc.arguments = ["-c", "lsof -ti :5173,:5001 | xargs kill -9 2>/dev/null || true"]
            try? killProc.run()
        }
    }
}

// ── Application Entry Point ─────────────────────────────────────────────────
let app = NSApplication.shared
let delegate = AppDelegate()
app.delegate = delegate
app.run()
