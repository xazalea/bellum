# Bellum Backend API

ASP.NET Core backend service for enhanced emulation capabilities, file processing, and streaming.

## Features

- **Disk Image Processing**: Optimize and convert disk images (ISO, IMG, VHD)
- **State Optimization**: Compress and optimize VM state files
- **App Extraction**: Extract apps from APK, MSI, DEB formats
- **Compatibility Patching**: Apply patches for web compatibility
- **Streaming Support**: WebSocket-based streaming for cloud emulation
- **Performance**: C# backend for CPU-intensive operations

## Prerequisites

- .NET 8.0 SDK or later
- Visual Studio 2022, VS Code, or Rider (optional)

## Setup

1. Install .NET SDK:
   ```bash
   # macOS
   brew install dotnet
   
   # Or download from https://dotnet.microsoft.com/download
   ```

2. Restore dependencies:
   ```bash
   cd backend
   dotnet restore
   ```

3. Run the backend:
   ```bash
   dotnet run
   ```

   The API will be available at `http://localhost:5000`

## API Endpoints

### Emulator

- `POST /api/emulator/process-disk-image` - Process and optimize disk images
- `POST /api/emulator/optimize-state` - Optimize VM state files
- `POST /api/emulator/extract-app` - Extract apps from various formats
- `POST /api/emulator/patch-compatibility` - Apply compatibility patches
- `GET /api/emulator/health` - Health check

### Streaming

- `GET /api/streaming/stream/{vmId}` - WebSocket stream endpoint
- `POST /api/streaming/start-stream` - Start streaming session
- `POST /api/streaming/stop-stream` - Stop streaming session

## Configuration

Edit `appsettings.json` to configure:

```json
{
  "Backend": {
    "ApiUrl": "http://localhost:5000",
    "EnableStreaming": true,
    "MaxFileSize": 1073741824
  }
}
```

## Environment Variables

- `ASPNETCORE_URLS` - Set the listening URLs (default: http://localhost:5000)
- `ASPNETCORE_ENVIRONMENT` - Set to "Development" or "Production"

## Development

```bash
# Watch mode (auto-reload on changes)
dotnet watch run

# Build release
dotnet build -c Release

# Run tests (when added)
dotnet test
```

## Deployment

### Vercel

The backend can be deployed separately from the Next.js frontend. Options:

1. **Separate Service**: Deploy to Azure, AWS, or other cloud provider
2. **Vercel Serverless Functions**: Convert to serverless functions (limited)
3. **Docker**: Containerize and deploy to container service

### Docker

```dockerfile
FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS base
WORKDIR /app
EXPOSE 80

FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src
COPY ["Bellum.Backend.csproj", "./"]
RUN dotnet restore
COPY . .
RUN dotnet build -c Release -o /app/build

FROM build AS publish
RUN dotnet publish -c Release -o /app/publish

FROM base AS final
WORKDIR /app
COPY --from=publish /app/publish .
ENTRYPOINT ["dotnet", "Bellum.Backend.dll"]
```

## Integration with Frontend

The Next.js frontend communicates with this backend via the `BackendClient` in `lib/backend/client.ts`.

Set the backend URL in `.env.local`:

```
NEXT_PUBLIC_BACKEND_URL=http://localhost:5000
```

## Performance Benefits

- **C# Performance**: Faster file processing than JavaScript
- **Parallel Processing**: Multi-threaded operations
- **Memory Efficiency**: Better memory management for large files
- **Streaming**: Real-time streaming for cloud emulation
- **Compression**: Efficient state compression

## Future Enhancements

- C# WebAssembly modules for client-side performance
- GPU acceleration support
- Distributed emulation
- Advanced state deduplication
- Machine learning for compatibility prediction

