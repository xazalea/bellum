# NachoOS User Guide

Welcome to NachoOS, a full operating system emulation platform running entirely in your browser!

## Getting Started

### System Requirements

**Minimum:**
- Modern browser (Chrome 113+, Edge 113+, Safari 16.4+)
- 4GB RAM
- Decent GPU with WebGPU support
- Stable internet connection

**Recommended:**
- Chrome/Edge latest
- 8GB+ RAM
- Dedicated GPU
- Fast internet connection

### First Time Setup

1. **Open NachoOS** in your browser
2. **Allow permissions** for camera, microphone (if using TikTok/Roblox)
3. **Wait for initialization** (first load takes 10-20 seconds)
4. **You're ready!** Start installing apps

## Installing Apps

### Method 1: Upload APK/EXE

1. Click **"Library"** in the navigation
2. Click **"Upload App"**
3. Select your `.apk` (Android) or `.exe` (Windows) file
4. Wait for the app to install
5. Click **"Launch"** to run the app

### Method 2: Cloud Library

1. Go to **"Library"**
2. Browse available apps
3. Click **"Download"** on any app
4. Click **"Launch"** once downloaded

## Running Apps

### Launching an App

1. Go to **"Library"**
2. Find your installed app
3. Click **"Launch"**
4. Wait for the app to boot (5-15 seconds)

### App Controls

**HUD Controls:**
- 🎮 **Fullscreen**: Toggle fullscreen mode
- 📊 **Performance**: Show FPS and memory usage
- 📸 **Screenshot**: Take a screenshot
- 💾 **Export**: Export app as standalone HTML
- ❌ **Close**: Stop and exit the app

### Performance Tips

1. **Lower graphics quality** if FPS is low
2. **Close other browser tabs** to free up memory
3. **Use fullscreen mode** for better performance
4. **Reduce render distance** in 3D games

## Supported Apps

### ✅ Fully Supported

**Minecraft (Bedrock Edition)**
- Create and load worlds
- Multiplayer support
- Save/load game state
- Expected FPS: 30+

**Roblox**
- Play any Roblox game
- Touch/gyro controls
- Multiplayer support
- Expected FPS: 30+

**Brawl Stars**
- Touch controls optimized
- Gyro aiming
- Multiplayer matches
- Expected FPS: 30-60

**TikTok**
- Record videos
- Apply filters
- Upload videos
- View feed

**Spotify**
- Stream music
- Create playlists
- Offline mode (Premium)
- DRM support

**Chrome**
- Browse the web
- Multiple tabs
- Bookmarks
- Downloads

## Game-Specific Guides

### Minecraft

**Creating a World:**
1. Launch Minecraft
2. Click "Create New World"
3. Enter world name
4. Click "Create"

**Joining Multiplayer:**
1. Click "Multiplayer"
2. Enter server address
3. Click "Connect"

**Saving:**
- Game auto-saves every 5 minutes
- Manual save: Press ESC → Save & Quit

### Roblox

**Controls:**
- WASD: Move
- Mouse: Look
- Space: Jump
- Shift: Sneak
- Touch: On-screen controls

**Performance:**
- Set graphics to "Low" if laggy
- Reduce render distance
- Close other apps

### Brawl Stars

**Controls:**
- Left side: Movement joystick
- Right side: Aim and shoot
- Gyro: Fine-tune aim (enable in settings)

**Tips:**
- Enable haptic feedback for better feel
- Adjust sensitivity if aim feels off
- Use gyro for precise aiming

## Troubleshooting

### App Won't Launch

**Solution:**
1. Check if file is a valid APK/EXE
2. Try re-uploading the file
3. Clear browser cache
4. Restart browser

### Low FPS/Laggy

**Solution:**
1. Close other browser tabs
2. Lower graphics quality
3. Reduce render distance
4. Enable dynamic resolution scaling

### App Crashes

**Solution:**
1. Refresh the page
2. Try launching again
3. Check browser console for errors
4. Report issue on GitHub

### No Sound

**Solution:**
1. Check browser audio permissions
2. Unmute the tab
3. Check system volume
4. Restart the app

### Camera Not Working (TikTok)

**Solution:**
1. Allow camera permissions
2. Check if another app is using camera
3. Try in a different browser
4. Restart browser

## Keyboard Shortcuts

### Global
- `F11`: Toggle fullscreen
- `Ctrl+Q`: Quick launch last app
- `Ctrl+L`: Go to Library
- `Ctrl+N`: Go to Network
- `Ctrl+D`: Go to Docs

### In-App
- `ESC`: Show menu/pause
- `F3`: Toggle performance overlay
- `F5`: Reload app
- `F12`: Developer tools

## Exporting Apps

You can export any app as a standalone HTML file:

1. Launch the app
2. Click the **Export** button in HUD
3. Choose export type:
   - **Emulator Export**: Full emulation (larger file)
   - **WASM Export**: Faster, smaller (if supported)
4. Wait for export to complete
5. Download the `.html` file
6. Open the file in any browser to run offline!

## Storage Management

### Viewing Storage

1. Go to **Settings**
2. Click **Storage**
3. View used space per app

### Clearing Data

1. Go to **Library**
2. Right-click an app
3. Click **Clear Data**
4. Confirm deletion

### Cloud Sync

If you have an account:
1. Your saves sync automatically
2. Access from any device
3. No storage limits

## Performance Optimization

### Automatic Optimization

NachoOS automatically:
- Reduces graphics quality if FPS drops
- Scales resolution dynamically
- Adjusts render distance
- Enables/disables effects

### Manual Optimization

**For Minecraft:**
- Lower render distance (8-12 chunks)
- Disable clouds
- Reduce particle effects
- Use "Fast" graphics mode

**For Roblox:**
- Set graphics to 5-7 (out of 10)
- Disable shadows
- Lower texture quality

**For Brawl Stars:**
- Use "Medium" graphics
- Target 30 FPS if 60 is unstable
- Disable screen shake

## Privacy & Security

### What Data is Collected?

- **Game saves**: Stored locally in your browser
- **Usage stats**: Anonymous performance metrics
- **Crash reports**: Error logs (no personal data)

### What's NOT Collected?

- Personal information
- Browsing history
- Passwords
- Payment information

### Data Storage

All data is stored locally using:
- IndexedDB (game saves, settings)
- OPFS (large files, worlds)
- LocalStorage (preferences)

**Your data never leaves your device** unless you explicitly:
- Enable cloud sync
- Upload a video (TikTok)
- Share a score/replay

## Tips & Tricks

### Improving Performance

1. **Use Chrome or Edge** (best WebGPU support)
2. **Enable hardware acceleration** in browser settings
3. **Close background apps** to free RAM
4. **Update graphics drivers**
5. **Use wired internet** for multiplayer

### Better Experience

1. **Use fullscreen mode** for immersion
2. **Connect a controller** (supported games only)
3. **Use headphones** for better audio
4. **Enable gyro** for mobile-style controls

### Hidden Features

- **Ctrl+Shift+P**: Performance profiler
- **Ctrl+Shift+M**: Memory inspector
- **Ctrl+Shift+N**: Network monitor
- **Ctrl+Shift+D**: Debug overlay

## Getting Help

### In-App Help

- Click **"?"** icon in top-right
- View **"Docs"** page
- Check **"Network"** for status

### Online Resources

- [GitHub Issues](https://github.com/xazalea/bellum/issues)
- [Documentation](https://bellum.dev/docs)
- [Community Discord](#)

### Reporting Bugs

When reporting bugs, include:
1. **Browser and version**
2. **App name and version**
3. **Steps to reproduce**
4. **Console errors** (F12 → Console)
5. **Screenshot/video** if possible

## Advanced Features

### Developer Mode

Enable developer mode for:
- Lua scripting (Roblox)
- Mod support
- Custom controls
- Performance profiling

**To Enable:**
1. Go to Settings
2. Click "Developer"
3. Toggle "Developer Mode"

### Custom Controls

1. Go to Settings → Controls
2. Click "Customize"
3. Remap keys as desired
4. Save configuration

### Modding Support

Some apps support mods:
1. Download mod files
2. Go to Library → App → Mods
3. Click "Install Mod"
4. Select mod file
5. Restart app

## Frequently Asked Questions

**Q: Is this legal?**  
A: Yes, emulation is legal. You must own the apps you emulate.

**Q: Can I play online multiplayer?**  
A: Yes, most multiplayer features work via WebRTC.

**Q: How much storage does it use?**  
A: Each app: 100MB-2GB depending on size.

**Q: Can I use it offline?**  
A: Yes, once apps are installed, they work offline.

**Q: Is my save data safe?**  
A: Yes, data is stored locally and backed up if you enable cloud sync.

**Q: Can I play on mobile?**  
A: Yes, but performance may vary. Recommended for tablets.

**Q: Why is performance slower than native?**  
A: Emulation has overhead. We optimize continuously.

**Q: Can I contribute?**  
A: Yes! Check out our [GitHub](https://github.com/xazalea/bellum).

---

**Need more help?** Check the [Troubleshooting Guide](./TROUBLESHOOTING.md) or [Developer Guide](./DEVELOPER_GUIDE.md).

Happy emulating! 🎮
