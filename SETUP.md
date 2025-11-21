# Bellum Setup Guide

## Quick Start

### 1. Install Dependencies

**Frontend (Node.js):**
```bash
npm install
```

**Backend (.NET):**
```bash
# Install .NET SDK first (if not installed)
# macOS: brew install dotnet
# Then:
cd backend
dotnet restore
```

### 2. Verify v86 Assets

The v86 emulator files should be in:
- `public/v86/v86.wasm` (285KB)
- `public/v86/bios/seabios.bin` (128KB)
- `public/v86/bios/vgabios.bin` (36KB)

If missing, they've been downloaded automatically.

### 3. Configure Environment

Create `.env.local`:
```
NEXT_PUBLIC_BACKEND_URL=http://localhost:5000
```

### 4. Start Services

**Terminal 1 - Backend:**
```bash
cd backend
dotnet run
```
Backend runs on `http://localhost:5000`

**Terminal 2 - Frontend:**
```bash
npm run dev
```
Frontend runs on `http://localhost:3000`

### 5. Access Application

Open `http://localhost:3000` in your browser.

## Features Enabled

✅ **v86 Emulator** - Linux and Android VMs
✅ **js-dos** - Windows and DOS VMs  
✅ **ASP.NET Backend** - Enhanced processing
✅ **WebSocket Streaming** - Cloud emulation support
✅ **App Manager** - Install and run apps/games
✅ **State Management** - Save/restore VM states
✅ **Puter.js Storage** - Cloud file storage

## Troubleshooting

### Backend Won't Start
- Ensure .NET 8.0 SDK is installed: `dotnet --version`
- Check port 5000 is available
- Try: `dotnet clean && dotnet restore && dotnet run`

### Frontend Can't Connect to Backend
- Verify backend is running on port 5000
- Check `.env.local` has correct URL
- Check browser console for CORS errors

### v86 Files Missing
- Files should auto-download on first run
- Manually download from: https://github.com/copy/v86
- Place in `public/v86/` directory

### Performance Issues
- Enable backend for better performance
- Use smaller disk images for testing
- Check browser console for errors

## Next Steps

1. **Upload Disk Images**: Add Linux ISOs, Windows bundles, etc.
2. **Install Apps**: Use App Manager to install apps/games
3. **Configure VMs**: Adjust memory, disk size in VM settings
4. **Deploy**: Follow deployment guides for Vercel + backend

## Architecture

```
Frontend (Next.js) → Backend (ASP.NET) → Puter.js Storage
     ↓                      ↓
  v86/js-dos          File Processing
  Emulators           State Optimization
```

## Support

See `ENHANCEMENTS.md` for detailed backend features.
See `IMPLEMENTATION_STATUS.md` for current implementation status.

