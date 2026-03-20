## ADDED Requirements

### Requirement: Static web proxy integration
The system SHALL use boxcars-archived as the static web proxy for all asset delivery.

#### Scenario: Asset request proxied through boxcars
- **WHEN** client requests a game asset or application file
- **THEN** request is routed through boxcars proxy
- **AND** asset is delivered with appropriate caching headers

#### Scenario: Proxy handles large files
- **WHEN** client requests a file larger than 100MB
- **THEN** proxy streams the file efficiently
- **AND** transfer completes without timeout

### Requirement: Proxy caching for performance
The system SHALL implement aggressive caching via the proxy to minimize latency and bandwidth usage.

#### Scenario: Cache hit for repeated requests
- **WHEN** same asset is requested multiple times
- **THEN** proxy serves asset from cache
- **AND** response time is under 50ms

#### Scenario: Cache invalidation on update
- **WHEN** asset is updated on the origin
- **THEN** proxy invalidates cached version within 5 minutes
- **AND** subsequent requests fetch fresh asset

### Requirement: Cloudflare Pages compatibility
The system SHALL integrate boxcars proxy with Cloudflare Pages deployment architecture.

#### Scenario: Proxy runs on Cloudflare infrastructure
- **WHEN** deployed to Cloudflare Pages
- **THEN** proxy functions correctly within serverless environment
- **AND** maintains compatibility with almostnode client-side execution

#### Scenario: Proxy handles Cloudflare Workers integration
- **WHEN** proxy receives a request
- **THEN** it processes through Cloudflare Workers if configured
- **AND** maintains request context and headers

### Requirement: Proxy reliability and error handling
The system SHALL handle proxy errors gracefully with appropriate fallbacks.

#### Scenario: Proxy unavailable fallback
- **WHEN** boxcars proxy is unavailable
- **THEN** system falls back to direct asset loading
- **AND** logs error for monitoring

#### Scenario: Proxy timeout handling
- **WHEN** proxy request exceeds 30 second timeout
- **THEN** system cancels request and returns error
- **AND** displays user-friendly error message

### Requirement: Go-based proxy performance
The system SHALL leverage Go's performance characteristics for optimal proxy throughput.

#### Scenario: High concurrent request handling
- **WHEN** 100+ concurrent requests hit the proxy
- **THEN** proxy handles all requests without degradation
- **AND** average response time remains under 100ms

#### Scenario: Memory efficiency under load
- **WHEN** proxy handles sustained high traffic
- **THEN** memory usage remains stable
- **AND** no memory leaks occur over 24-hour period
