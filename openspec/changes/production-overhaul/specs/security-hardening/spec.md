## ADDED Requirements

### Requirement: File Upload Validation
The system SHALL validate uploaded files using magic bytes, not file extensions.

#### Scenario: APK magic byte validation
- **WHEN** APK file is uploaded
- **THEN** system verifies ZIP signature (0x50, 0x4B, 0x03, 0x04) before processing

#### Scenario: EXE magic byte validation
- **WHEN** EXE file is uploaded
- **THEN** system verifies MZ header (0x4D, 0x5A) before processing

#### Scenario: Invalid file rejection
- **WHEN** file content does not match expected magic bytes
- **THEN** upload is rejected with security error

#### Scenario: File size enforcement
- **WHEN** file exceeds maximum allowed size
- **THEN** upload is rejected before processing begins

### Requirement: Input Sanitization
The system SHALL sanitize all user inputs to prevent injection attacks.

#### Scenario: HTML sanitization
- **WHEN** user input is displayed in UI
- **THEN** it is sanitized to prevent XSS attacks

#### Scenario: SQL sanitization
- **WHEN** user input is used in database queries
- **THEN** parameterized queries prevent SQL injection

#### Scenario: Path traversal prevention
- **WHEN** user input contains path characters
- **THEN** input is rejected or sanitized to prevent directory traversal

### Requirement: Rate Limiting
The system SHALL implement rate limiting on all API endpoints.

#### Scenario: Anonymous rate limiting
- **WHEN** unauthenticated user makes requests
- **THEN** rate is limited to 60 requests per minute per IP

#### Scenario: Authenticated rate limiting
- **WHEN** authenticated user makes requests
- **THEN** rate is limited to 200 requests per minute per user

#### Scenario: Upload rate limiting
- **WHEN** user uploads files
- **THEN** limited to 10 uploads per minute to prevent abuse

#### Scenario: Rate limit exceeded response
- **WHEN** rate limit is exceeded
- **THEN** 429 status is returned with retry-after header

### Requirement: Content Security Policy
The system SHALL enforce strict Content Security Policy headers.

#### Scenario: Script source restriction
- **WHEN** page is loaded
- **THEN** CSP header restricts script sources to trusted origins

#### Scenario: Frame ancestor restriction
- **WHEN** page is loaded
- **THEN** CSP header prevents embedding in iframes from other origins

#### Scenario: Object source restriction
- **WHEN** page is loaded
- **THEN** CSP header blocks object, embed, and applet elements

### Requirement: Execution Sandbox
The system SHALL execute untrusted code in isolated sandbox.

#### Scenario: iframe sandbox
- **WHEN** APK or EXE is executed
- **THEN** it runs in iframe with sandbox attribute restricting capabilities

#### Scenario: Network isolation
- **WHEN** untrusted code executes
- **THEN** it has no direct network access

#### Scenario: Storage isolation
- **WHEN** untrusted code executes
- **THEN** it has isolated storage separate from main application

### Requirement: CORS Restrictions
The system SHALL enforce Cross-Origin Resource Sharing restrictions.

#### Scenario: API CORS headers
- **WHEN** API responds to cross-origin request
- **THEN** only whitelisted origins are allowed in Access-Control-Allow-Origin

#### Scenario: Credential restriction
- **WHEN** cross-origin request includes credentials
- **THEN** origin must be explicitly whitelisted (no wildcard)

#### Scenario: Preflight handling
- **WHEN** preflight OPTIONS request is received
- **THEN** appropriate CORS headers are returned for allowed methods

### Requirement: Secure Session Management
The system SHALL implement secure session management.

#### Scenario: Session timeout
- **WHEN** session is inactive for 30 minutes
- **THEN** session expires and user must re-authenticate

#### Scenario: Secure cookie settings
- **WHEN** session cookie is set
- **THEN** HttpOnly, Secure, and SameSite=Strict flags are applied

#### Scenario: Token refresh
- **WHEN** access token expires
- **THEN** refresh token is used to obtain new access token without re-login