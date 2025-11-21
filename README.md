# Bellum - Hyper VM Platform

Bellum is a hyper virtual machine platform that allows you to run multiple virtual machines (Windows, Linux, Android, Xbox, and more) directly in your web browser. All files are stored in the cloud using Puter.js, ensuring fast access and no local storage usage.

## Features

- 🖥️ Multiple VM types: Windows, Linux, Android, DOS, and more
- ☁️ Cloud storage via Puter.js (no local storage needed)
- 🚀 Fast and efficient emulation
- 🎮 Run apps and games from different platforms
- 💾 Automatic file management and synchronization
- 🎨 Modern, intuitive UI

## Getting Started

### Development

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Deployment

This project is configured for Vercel deployment. Simply push to your repository and connect it to Vercel.

## Project Structure

```
bellum/
├── lib/                           # Shared libraries and utilities
│   ├── puter/                    # Puter.js integration
│   │   └── client.ts             # Puter.js client wrapper
│   └── vm/                       # VM implementations
│       ├── base.ts               # Base VM class
│       ├── manager.ts            # VM manager (singleton)
│       ├── types.ts              # TypeScript types
│       ├── index.ts              # Module exports
│       └── implementations/      # VM implementations
│           ├── linux.ts          # Linux VM (v86 placeholder)
│           ├── windows.ts        # Windows VM (js-dos placeholder)
│           ├── android.ts        # Android VM (placeholder)
│           └── dos.ts           # DOS VM (js-dos placeholder)
├── app/                           # Next.js app directory
│   ├── page.tsx                  # Main page
│   ├── layout.tsx                # Root layout
│   └── globals.css               # Global styles
├── components/                    # React components
│   ├── VMManager.tsx            # VM list and creation UI
│   └── VMViewer.tsx             # VM display and controls
└── vercel.json                   # Vercel configuration
```

## Architecture

### VM System

The VM system is built on a modular architecture:

1. **BaseVM**: Abstract base class that all VM implementations extend
2. **VM Manager**: Singleton that manages VM lifecycle, creation, and persistence
3. **VM Implementations**: Platform-specific implementations (Linux, Windows, Android, DOS)

### Cloud Storage

All VM files and state are stored using Puter.js:
- VM configurations and state are saved to `bellum/vms/{vm-id}/`
- No local storage is used, ensuring fast access from any device
- Automatic state persistence on start/stop/pause/resume

### Current Status

The project currently has:
- ✅ Complete UI for VM management
- ✅ Puter.js integration for cloud storage with streaming support
- ✅ VM lifecycle management (start, stop, pause, resume, reset)
- ✅ State persistence for all VM types
- ✅ v86 integration for Linux and Android VMs
- ✅ js-dos integration for Windows and DOS VMs
- ✅ PlayStation and Xbox VM foundations
- ✅ App Manager system with compatibility checking
- ✅ Automatic compatibility patching
- ⚠️ Some features still need UI components (App Launcher, Settings)
- ⚠️ v86 BIOS files need to be downloaded manually

## Next Steps: Integrating Emulators

### Linux VM (v86)

1. Install v86: `npm install v86`
2. Update `lib/vm/implementations/linux.ts`:
   ```typescript
   import { V86Starter } from 'v86';
   
   async initializeEmulator(container: HTMLElement): Promise<void> {
     // Load Linux image from Puter storage
     const imageUrl = await puterClient.getReadURL(`${this.state.storagePath}/linux.img`);
     
     this.emulator = new V86Starter({
       wasm_path: "/v86/v86.wasm",
       memory_size: this.config.memory * 1024 * 1024,
       vga_memory_size: 8 * 1024 * 1024,
       screen_container: container,
       bios: { url: "/v86/bios/seabios.bin" },
       vga_bios: { url: "/v86/bios/vgabios.bin" },
       cdrom: { url: imageUrl },
       autostart: false,
     });
   }
   ```

### Windows/DOS VM (js-dos)

1. Install js-dos: `npm install js-dos`
2. Update `lib/vm/implementations/windows.ts` and `dos.ts`:
   ```typescript
   import { DosBox } from 'js-dos';
   
   async initializeEmulator(container: HTMLElement): Promise<void> {
     const dosbox = await DosBox(container);
     // Load disk image from Puter storage
     const diskUrl = await puterClient.getReadURL(`${this.state.storagePath}/disk.img`);
     await dosbox.run(diskUrl);
     this.emulator = dosbox;
   }
   ```

### Android VM

Android emulation is more complex. Options:
1. Use Android-x86 with v86
2. Use a custom WebAssembly-based Android emulator
3. Integrate with an existing web-based Android emulator

## Technologies

- **Next.js 14**: React framework with App Router
- **TypeScript**: Type-safe development
- **Puter.js**: Free cloud storage API
- **React**: UI framework
- **ASP.NET Core 8.0**: Backend API for enhanced processing
- **C#**: High-performance backend services
- **v86**: x86 emulator for Linux/Android
- **js-dos**: DOS/Windows emulator
- **WebSocket**: Real-time streaming support

## Contributing

This is an ambitious project! Areas for contribution:
- Emulator integrations
- Performance optimizations
- Additional VM types (Xbox, macOS, etc.)
- File system improvements
- Network support
- App/game compatibility layers

## License

MIT

