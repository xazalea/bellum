## ADDED Requirements

### Requirement: Game session creation
The system SHALL allow users to create game sessions that others can join.

#### Scenario: Create public session
- **WHEN** a user creates a public game session
- **THEN** the system generates a unique session ID
- **AND** adds the session to the public browser
- **AND** allows others to join

#### Scenario: Create private session
- **WHEN** a user creates a private game session
- **THEN** the system generates a unique session ID
- **AND** requires invite code to join

### Requirement: Session joining
The system SHALL allow users to join game sessions via link or code.

#### Scenario: Join via link
- **WHEN** a user clicks a session link
- **THEN** the system validates the session
- **AND** adds the user to the session
- **AND** displays the game

#### Scenario: Join via code
- **WHEN** a user enters a session code
- **THEN** the system validates the code
- **AND** adds the user to the session

### Requirement: Session invitations
The system SHALL allow users to invite others to game sessions.

#### Scenario: Send invite
- **WHEN** a user clicks invite
- **THEN** the system generates a shareable link
- **AND** offers copy and direct messaging options

#### Scenario: Accept invite
- **WHEN** a recipient clicks the invite link
- **THEN** the system adds them to the session
- **AND** notifies the host

### Requirement: Spectator mode
The system SHALL allow users to spectate game sessions without playing.

#### Scenario: Join as spectator
- **WHEN** a user joins as spectator
- **THEN** the system displays the game
- **AND** disables input controls
- **AND** shows spectator badge

#### Scenario: Multiple spectators
- **WHEN** multiple users spectate
- **THEN** all see the same game state
- **AND** can chat with each other

### Requirement: Co-op functionality
The system SHALL support cooperative gameplay in sessions.

#### Scenario: Start co-op game
- **WHEN** a host enables co-op mode
- **THEN** multiple players can control the game
- **AND** inputs are synchronized

#### Scenario: Player slot management
- **WHEN** a host manages player slots
- **THEN** they can assign roles
- **AND** set player limits

### Requirement: Session chat
The system SHALL provide chat within game sessions.

#### Scenario: Send session message
- **WHEN** a user types in session chat
- **THEN** all session members see the message
- **AND** messages are saved to history

### Requirement: Session browser
The system SHALL provide a browser for finding public sessions.

#### Scenario: Browse sessions
- **WHEN** a user opens session browser
- **THEN** the system displays available sessions
- **AND** shows game, host, and player count

#### Scenario: Filter sessions
- **WHEN** a user filters by game
- **THEN** only sessions for that game are shown

### Requirement: End-to-end session flow
The complete session flow SHALL work without errors.

#### Scenario: Complete session lifecycle
- **WHEN** a user creates a session
- **THEN** invites a friend
- **AND** friend joins
- **AND** they play together
- **AND** session ends gracefully