## ADDED Requirements

### Requirement: Games load from public/games.xml
The games page SHALL load game data from the `public/games.xml` file (which contains JSON data).

#### Scenario: Games API loads from games.xml
- **WHEN** the games page fetches games
- **THEN** the API SHALL read from `public/games.xml`
- **AND** games SHALL be parsed correctly from the JSON format

#### Scenario: All games are available
- **WHEN** the games page loads
- **THEN** all games from the catalog SHALL be accessible
- **AND** the total count SHALL reflect the actual number of games

### Requirement: Games are randomized during infinite scroll
The games display SHALL use seeded randomization to present games in a shuffled order.

#### Scenario: Games appear in randomized order
- **WHEN** user loads the games page
- **THEN** games SHALL be displayed in a randomized order
- **AND** the same seed SHALL produce the same order for consistent pagination

#### Scenario: Randomization persists during infinite scroll
- **WHEN** user scrolls to load more games
- **THEN** newly loaded games SHALL continue in the same randomized sequence
- **AND** no games SHALL be duplicated in the visible list

#### Scenario: Seed is generated per session
- **WHEN** user first visits the games page
- **THEN** a random seed SHALL be generated for that session
- **AND** the seed SHALL be passed to all API calls for consistency