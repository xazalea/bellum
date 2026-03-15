## ADDED Requirements

### Requirement: Discord webhook storage integration
The system SHALL use Discord webhooks as a file storage backend for game saves and user data.

#### Scenario: Upload save to Discord
- **WHEN** a user saves a game
- **THEN** the system compresses the save file
- **AND** uploads it to Discord via webhook
- **AND** stores the message ID for later retrieval

#### Scenario: Download save from Discord
- **WHEN** a user loads a game
- **THEN** the system retrieves the save file from Discord
- **AND** decompresses it
- **AND** restores the game state

### Requirement: Telegram bot API storage integration
The system SHALL use Telegram bot API as an alternative storage backend.

#### Scenario: Configure Telegram storage
- **WHEN** a user enables Telegram storage
- **THEN** the system prompts for bot token and chat ID
- **AND** validates the configuration
- **AND** stores it securely

#### Scenario: Upload save to Telegram
- **WHEN** a user saves a game with Telegram enabled
- **THEN** the system uploads the save to Telegram
- **AND** stores the message ID for retrieval

### Requirement: Unified cloud save manager
The system SHALL provide a unified interface for managing saves across Discord and Telegram.

#### Scenario: Save game state
- **WHEN** a user triggers a save
- **THEN** the system serializes the game state
- **AND** compresses it
- **AND** uploads to configured storage backends
- **AND** confirms success to the user

#### Scenario: Load game state
- **WHEN** a user loads a game
- **THEN** the system retrieves the latest save
- **AND** decompresses it
- **AND** restores the game state

### Requirement: Automatic save synchronization
The system SHALL automatically sync saves across devices.

#### Scenario: Save on device A
- **WHEN** a user saves on device A
- **THEN** the save is uploaded to cloud storage
- **AND** marked as the latest save

#### Scenario: Load on device B
- **WHEN** a user opens the game on device B
- **THEN** the system detects a newer save in cloud
- **AND** prompts to download
- **AND** restores the save state

### Requirement: Conflict resolution
The system SHALL handle save conflicts when multiple devices have unsynced changes.

#### Scenario: Conflict detected
- **WHEN** cloud and local saves differ
- **THEN** the system displays both save timestamps
- **AND** allows user to choose which to keep
- **AND** syncs the chosen save to all devices

### Requirement: Storage quota management
The system SHALL manage storage quotas per user.

#### Scenario: Check quota before upload
- **WHEN** a user attempts to save
- **THEN** the system checks available quota
- **AND** allows or denies the save accordingly

#### Scenario: Quota exceeded
- **WHEN** a user exceeds their quota
- **THEN** the system displays a warning
- **AND** offers to delete old saves

### Requirement: Save management UI
The system SHALL provide a UI for managing saved games.

#### Scenario: View all saves
- **WHEN** a user opens save management
- **THEN** the system displays all saves with timestamps
- **AND** shows storage usage
- **AND** allows delete/download actions

#### Scenario: Delete save
- **WHEN** a user deletes a save
- **THEN** the system removes it from cloud storage
- **AND** updates the quota

### Requirement: End-to-end save flow
The complete save flow SHALL work without errors.

#### Scenario: Complete save/load cycle
- **WHEN** a user plays a game
- **THEN** saves progress
- **AND** switches device
- **AND** loads the game
- **AND** sees the saved progress restored