# Getting Started with Nacho: Zero to Hero

Welcome to **Nacho**, the universal runtime platform that turns your browser into a powerful operating system. This guide will take you from your first boot to running advanced applications.

## 🚀 Quick Start

1.  **Open the Launcher**: Navigate to the main dashboard.
2.  **No Installation Required**: Nacho runs entirely in your browser using WebAssembly.
3.  **Your First App**:
    *   Open the "Terminal" app.
    *   Type `help` to see available commands.
    *   Type `doom` (if installed) or drag-and-drop a game file to play!

## 💾 Storage: Local vs. Cloud

Nacho uses a unique "Local-First" approach:

### Local Storage (Default)
*   **What it is**: Files are saved directly to your device's browser database (IndexedDB).
*   **Pros**: Instant access, works offline, no cloud quota usage.
*   **How to use**: Simply drag and drop a file (ISO, EXE, APK) onto the desktop. It installs instantly!
*   **Privacy**: Your files never leave your device.

### Cloud Storage (Optional)
*   **What it is**: Encrypted storage on the Nacho Cloud (Telegram-backed).
*   **Pros**: Access your files from any device, share with friends.
*   **How to use**: Right-click a local file and select "Upload to Cloud".

## 🎮 Running Apps

Nacho supports a wide variety of formats:
*   **Windows**: `.exe` files (via Box86/Wine emulation).
*   **DOS**: `.com` and `.exe` (via DOSBox).
*   **Game Boy**: `.gba`, `.gb` (via VBA).
*   **PlayStation**: `.iso`, `.bin` (via PCSX).

**Just drag, drop, and double-click!**

## 🔧 Troubleshooting

*   **App won't start?** Check if you have the correct file format.
*   **"Manifest 404"?** This usually means a cloud file is missing. Try re-uploading or using a local copy.
*   **Slow performance?** Close other browser tabs to free up memory for the emulator.
