## ADDED Requirements

### Requirement: Keyboard input mapping
The system SHALL map keyboard input to game controls.

#### Scenario: Default keyboard mapping
- **WHEN** a user plays a game
- **THEN** WASD maps to movement
- **AND** arrow keys map to directional input
- **AND** space/enter map to action buttons

#### Scenario: Custom keyboard mapping
- **WHEN** a user customizes keyboard controls
- **THEN** the system saves the custom mapping
- **AND** applies it to all games

### Requirement: Gamepad input mapping
The system SHALL map gamepad input to game controls.

#### Scenario: Gamepad detection
- **WHEN** a user connects a gamepad
- **THEN** the system detects the gamepad
- **AND** displays a notification
- **AND** enables gamepad controls

#### Scenario: Gamepad button mapping
- **WHEN** a user presses a gamepad button
- **THEN** the system maps it to the corresponding game action
- **AND** the game responds appropriately

#### Scenario: Gamepad stick mapping
- **WHEN** a user moves a gamepad stick
- **THEN** the system maps it to directional input
- **AND** applies deadzone and sensitivity settings

### Requirement: Touch input mapping
The system SHALL map touch input to game controls for mobile devices.

#### Scenario: Touch controls display
- **WHEN** a user plays on a touch device
- **THEN** the system displays on-screen controls
- **AND** positions them for easy reach

#### Scenario: Touch button mapping
- **WHEN** a user taps a touch button
- **THEN** the system maps it to the corresponding game action

#### Scenario: Touch joystick
- **WHEN** a user drags the virtual joystick
- **THEN** the system maps it to directional input
- **AND** provides haptic feedback

### Requirement: Control customization UI
The system SHALL provide a UI for customizing control mappings.

#### Scenario: Open control settings
- **WHEN** a user opens control settings
- **THEN** the system displays current mappings
- **AND** allows editing each mapping

#### Scenario: Remap control
- **WHEN** a user clicks a control to remap
- **THEN** the system waits for new input
- **AND** assigns the new input to that control

### Requirement: Preset control profiles
The system SHALL provide preset control profiles for popular games.

#### Scenario: Load preset profile
- **WHEN** a user selects a preset profile
- **THEN** the system applies the preset mappings
- **AND** saves the selection

#### Scenario: Popular game presets
- **WHEN** a user plays a popular game
- **THEN** the system suggests relevant presets
- **AND** allows one-click application

### Requirement: Profile cloud sync
The system SHALL sync control profiles to cloud storage.

#### Scenario: Save profile to cloud
- **WHEN** a user creates or modifies a profile
- **THEN** the system syncs it to cloud storage
- **AND** makes it available on other devices

#### Scenario: Load profile from cloud
- **WHEN** a user logs in on a new device
- **THEN** the system downloads their profiles
- **AND** applies the active profile

### Requirement: Haptic feedback support
The system SHALL provide haptic feedback for supported devices.

#### Scenario: Haptic on button press
- **WHEN** a user presses a button on a touch device
- **THEN** the system provides haptic feedback
- **AND** the intensity matches the action

### Requirement: End-to-end input flow
The complete input flow SHALL work without errors.

#### Scenario: Complete input customization
- **WHEN** a user connects a gamepad
- **THEN** customizes controls
- **AND** saves profile
- **AND** plays a game
- **AND** controls work as configured