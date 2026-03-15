## Context

**Challenger Deep** is a browser-based gaming platform competing with GeForce Now. The codebase has extensive backend implementations that are NOT connected end-to-end:

**Existing Backend (Needs Connection):**
- `lib/auth/` - Fingerprint+username auth (fingerprint.ts, challenger-auth.ts, challenger-identity.ts)
- `lib/storage/` - Discord webhook storage (discord-webhook-storage.ts, chunked-upload/download)
- `lib/gpt4free/` - 50+ AI model providers (TO BE REPLACED)
- `lib/emulators/` - Android/APK execution
- `lib/engine/`, `lib/win32/` - Windows/EXE execution
- `lib/games-parser.ts` - Game XML parsing
- `public/games.xml` - 20,000 games data

**Existing UI (Needs Enhancement):**
- `components/pages/` - HomePage, GamesPage, AndroidPage, WindowsPage, AIPage
- `components/ui/` - Various UI components
- `components/games/`, `components/apps/` - Game and app cards

**Production Requirements:**
- ALL features must work END-TO-END
- Complete error handling with user-friendly messages
- Loading states for all async operations
- Responsive design (mobile, tablet, desktop)
- Accessibility compliance (WCAG 2.1 AA)
- Performance optimization

## Goals / Non-Goals

**Goals:**
- Fix and connect ALL existing features end-to-end
- Add GeForce Now-competitive features (cloud streaming, sessions, social)
- Replace AI with specified GitHub repos (glm-free-api, free-one-api, WebAI-to-API)
- Add Telegram storage alongside Discord
- Make platform production-grade

**Non-Goals:**
- Payment system (removed)
- Native desktop/mobile apps (web-only)
- VR/AR gaming support
- Game development tools

## Decisions

### 1. Authentication: Fix Fingerprint+Username Flow

**Current State**: `lib/auth/fingerprint.ts` generates device fingerprint, but the full auth flow is not connected.

**Fix Required**:
1. Connect fingerprint generation to user registration
2. Add username selection after fingerprint detection
3. Store user identity in localStorage + Discord/Telegram cloud
4. Create auth context that provides user state to entire app
5. Add "Remember Me" functionality

**End-to-End Flow**:
1. User visits site → Fingerprint generated automatically
2. If new user → Show username selection modal
3. User enters username → Identity created and stored
4. Returning user → Auto-login via fingerprint
5. Identity synced to Discord/Telegram cloud storage

### 2. Cloud Storage: Discord + Telegram for Game Saves

**Current State**: `lib/storage/discord-webhook-storage.ts` has Discord storage, but not connected to game saves.

**Fix Required**:
1. Create `lib/storage/telegram-storage.ts` for Telegram bot API storage
2. Create unified `lib/storage/cloud-save-manager.ts` for game saves
3. Connect to APK/EXE runners for save state persistence
4. Add storage settings UI (choose Discord/Telegram/both)
5. Implement automatic sync on game save/load

**End-to-End Flow**:
1. User plays game → Save state created
2. Save state → Compressed → Uploaded to Discord/Telegram
3. User switches device → Auto-download save state
4. Conflict resolution → Show merge options

### 3. AI: Replace gpt4free with Specified Repos

**Current State**: `lib/gpt4free/` has 50+ providers but user wants specific repos.

**Implementation**:
1. Clone and integrate:
   - `https://github.com/LLM-Red-Team/glm-free-api` - GLM-4 model
   - `https://github.com/RockChinQ/free-one-api` - Unified free LLM API
   - `https://github.com/Amm1rr/WebAI-to-API` - Browser-based AI
2. Create unified `lib/ai/client.ts` with OpenAI-compatible interface
3. Implement fallback chain: glm-free-api → free-one-api → WebAI-to-API
4. Connect to AI chat UI in `components/pages/AIPage.tsx`
5. Add streaming responses

**End-to-End Flow**:
1. User opens AI page → Chat interface loads
2. User sends message → Request to AI client
3. AI client tries providers in order → Returns response
4. Response streams to UI in real-time
5. Chat history saved to cloud storage

### 4. APK Runner: Connect Backend to UI

**Current State**: `lib/emulators/` has Android execution, but not connected to `components/pages/AndroidPage.tsx`.

**Fix Required**:
1. Create upload flow in AndroidPage → Connect to `lib/emulators/`
2. Add APK validation and metadata extraction
3. Create game player interface with canvas rendering
4. Implement touch/keyboard/gamepad input
5. Connect to cloud save manager

**End-to-End Flow**:
1. User uploads APK → Validation → Metadata extraction
2. Emulator initializes → Loading state shown
3. Game renders in canvas → Input captured
4. User plays → Save states to cloud
5. Exit → Save confirmation → Return to library

### 5. EXE Runner: Connect Backend to UI

**Current State**: `lib/engine/`, `lib/win32/` have Windows execution, not connected to `components/pages/WindowsPage.tsx`.

**Fix Required**:
1. Create upload flow in WindowsPage → Connect to `lib/engine/binary-loader.ts`
2. Add EXE analysis (DOS vs Windows classification)
3. Route to DOSBox-WASM or WINE wrapper
4. Create game player interface
5. Connect to cloud save manager

**End-to-End Flow**:
1. User uploads EXE → Analysis → Classification
2. Appropriate executor loads → Loading state
3. Game renders in canvas → Input captured
4. User plays → Save states to cloud
5. Exit → Save confirmation → Return to library

### 6. Game Library: Fix XML Loading and Infinite Scroll

**Current State**: `lib/games-parser.ts` exists, `public/games.xml` has games, but not loading properly.

**Fix Required**:
1. Fix XML parsing in `lib/games-parser.ts`
2. Implement batch loading (50 games per batch)
3. Create infinite scroll with Intersection Observer
4. Connect game cards to play functionality
5. Add search and filters

**End-to-End Flow**:
1. User opens Games page → First 50 games load
2. Scroll down → Next 50 games load automatically
3. Click game → Game detail modal/page
4. Click play → Game launches in player
5. Search/filter → Results update in real-time

### 7. NEW: Cloud Game Streaming

**Implementation**:
1. Create `lib/streaming/` for WebRTC streaming
2. Implement remote compute connection
3. Create streaming player with adaptive bitrate
4. Add latency optimization
5. Implement input forwarding

### 8. NEW: Game Session Management

**Implementation**:
1. Create `lib/session/` for session management
2. Implement session creation, joining, inviting
3. Add spectator mode
4. Create co-op functionality
5. Add session chat

### 9. NEW: Universal Input System

**Implementation**:
1. Create `lib/input/` for input handling
2. Implement keyboard, gamepad, touch mapping
3. Create control customization UI
4. Add preset profiles for popular games
5. Implement haptic feedback

### 10. NEW: Social Hub

**Implementation**:
1. Create `lib/social/` for social features
2. Implement friends system
3. Add real-time chat (WebSocket)
4. Create party system
5. Add voice chat (WebRTC)

### 11. NEW: Achievements & Leaderboards

**Implementation**:
1. Create `lib/gamification/achievements.ts`
2. Implement cross-game achievement system
3. Create global leaderboards
4. Add achievement notifications
5. Create profile badges

### 12. NEW: Performance Dashboard

**Implementation**:
1. Enhance `components/ui/performance-dashboard.tsx`
2. Add real-time FPS counter
3. Implement latency monitoring
4. Add quality metrics
5. Create optimization suggestions

### 13. NEW: Streaming Integration

**Implementation**:
1. Create `lib/streaming/broadcast.ts`
2. Implement Twitch streaming
3. Add YouTube streaming
4. Create Discord streaming
5. Add stream overlay controls

## Risks / Trade-offs

### Risk: AI API Reliability
**Mitigation**: Implement fallback chain with circuit breaker. Cache common responses. Monitor API health.

### Risk: Cloud Storage Limits
**Mitigation**: Implement compression, deduplication, and quota management. Use both Discord and Telegram for redundancy.

### Risk: Streaming Latency
**Mitigation**: Use WebRTC with UDP. Implement predictive input. Optimize encoding.

## Migration Plan

### Phase 1: Fix Core Features (Week 1-2)
1. Fix authentication flow
2. Connect cloud storage to game saves
3. Replace AI with new providers
4. Fix game library loading

### Phase 2: Connect Runners (Week 3-4)
1. Connect APK runner to UI
2. Connect EXE runner to UI
3. Implement save sync
4. Test end-to-end flows

### Phase 3: New Features (Week 5-8)
1. Implement cloud streaming
2. Add session management
3. Create social hub
4. Add achievements

### Phase 4: Polish (Week 9-10)
1. Performance optimization
2. Testing all flows
3. Production deployment