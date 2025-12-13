# Web Fabric: Web-Origin Server-Grade Distributed Execution (Whitepaper)

**Status:** Draft (forward-looking standards proposal)

## 0. Abstract
Web Fabric is a browser- and OS-mediated execution substrate that allows a single **web origin** to instantiate a global, distributed, server-like compute fabric by assembling resources from participating user devices. The fabric exists only while users are present, scales with participation, and can provide **real server semantics** (ingress networking, sessions, APIs, authoritative multiplayer, distributed compute, and persistent state) without granting arbitrary host access.

The central claim: a website can be permitted—explicitly, measurably, revocably—to run **server-grade workloads** on client devices while preserving security boundaries, privacy expectations, and host responsiveness. This requires new web primitives, new sandbox models, and new execution contracts between browsers, OSes, and users.

## 1. Problem statement
Today’s web has powerful client execution but does not natively support:
- **Inbound service endpoints** that behave like servers without exposing raw sockets.
- **Durable distributed state** and coordination with correctness under churn.
- **Deterministic, verifiable compute** suitable for zero-trust multiparty execution.
- **Hard OS-grade QoS guarantees** that prove background execution cannot harm UI.

This proposal defines what would be required to responsibly extend the web platform.

## 2. Goals
Web Fabric MUST enable a website to:
- Create a **distributed compute/storage/network fabric** that emerges only from user presence.
- Host **APIs and services** with “server semantics” (routing, sessions, rate limits, auth).
- Run **authoritative real-time simulations** (e.g., Minecraft-like servers).
- Perform **massive distributed compute** with correctness under adversarial participants.
- Maintain **persistent distributed state** with selectable consistency and survivability.

## 3. Non-goals and invariants
### 3.1 Non-goals
Web Fabric does NOT aim to:
- Provide arbitrary OS access, raw sockets, or general-purpose syscalls to origins.
- Create permanent, always-on infrastructure without user presence unless separately contracted.
- Replace cloud hosting; rather, it provides an additional execution substrate.

### 3.2 Invariants (safety and legitimacy)
The platform MUST uphold these invariants:
- **Explicit authorization**: participation requires user-granted leases and visible policy.
- **Revocability**: all authority is via revocable, time-bounded capabilities.
- **UI-first**: host responsiveness is never compromised; enforcement is OS-grade.
- **Hard isolation**: execution occurs in micro-VM-like domains with no ambient authority.
- **Zero-trust correctness**: the system assumes participants may be malicious.
- **No hidden execution**: browsers expose auditable receipts and runtime transparency.
- **Privacy preservation**: identity is origin-scoped, rotating, and does not reveal IPs.

## 4. High-level architecture
### 4.1 Two-plane model
- **Data plane**: high-throughput compute, state replication, and request routing across participants.
- **Control plane**: membership, policy distribution, leader rotation, shard assignment, and audit logs.

### 4.2 Fabric roles
A participating node may act as:
- **Compute worker**: executes deterministic tasks.
- **Service node**: runs network-facing service domains behind browser-managed ingress.
- **Storage replica**: stores encrypted content-addressed chunks and shard data.
- **Ingress node**: part of an ingress quorum for `fabric://` service addresses.

### 4.3 Lifecycle (human-readable)
1. Origin publishes a **policy manifest** and signed task/service bundles.
2. User grants a **compute lease** (and optionally ingress and storage leases) under constraints.
3. Browser joins the fabric for that origin via a standardized rendezvous.
4. Work is scheduled into **deterministic domains**; services run in **service domains**.
5. Inbound traffic reaches the fabric via browser-managed **ingress ports** resolved by rendezvous.
6. State and content persist through replication and checkpointing; roles rotate; churn is normal.

## 5. Core primitives (conceptual summary)
The normative specification defines these primitives:
- **Identity & policy**: `WebIdentityToken`, `WebPolicyManifest`.
- **Execution & isolation**: `WebComputeLease`, `WebSandboxDomain`, `WebDeterministicVM`, `WebFabricRuntime`.
- **Kernel mediation**: `WebKernelBridge` (scheduling, pressure signals, shaping).
- **Ingress & networking**: `WebIngressPort`, `WebTransportPP`, **BCIN** rendezvous.
- **Coordination**: `WebFabricGossip`, `WebConsensusGroup`.
- **Storage & state**: `WebCASStore`, `WebStateShard`, `WebAnchorProvider`.

## 6. Real server semantics on the web
### 6.1 “Server” definition
A fabric service is addressed as `fabric://<svcId>` and behaves like a server endpoint:
- Accepts inbound connections with authentication and rate limits.
- Terminates TLS-like channels in the browser-managed ingress stack.
- Routes traffic through an ingress quorum to service domains.

### 6.2 Why this is not raw socket exposure
Clients never connect to a device’s IP/port. They connect to a **service identity** whose resolution yields a set of ephemeral, revocable ingress endpoints mediated by the browser/OS network stack.

## 7. Performance and QoS: “zero perceived lag”
The platform is only viable if it proves it cannot harm responsiveness.

Web Fabric therefore requires:
- OS-integrated **preemptable background lanes** with a bounded preemption latency.
- A lease-level **QoS profile** that caps CPU/GPU/memory/wakeups and network usage.
- Browser-enforced yield points and watchdogs for compute and GPU kernels.
- Predictive load shedding and graceful degradation policies.

## 8. Security and trust model
Web Fabric is **zero-trust by default**:
- Deterministic execution with trace commitments enables replay audits.
- Redundant execution and quorum acceptance prevents single-node cheating.
- BFT consensus groups protect critical control-plane and strong-consistency shards.
- Supply-chain integrity pins bundles to signed hashes with optional build attestations.
- Privacy protections avoid stable global identity and hide participant network locations.

## 9. Persistence, availability, and churn
The fabric must remain correct under constant arrivals/departures.

Key strategies:
- Content-addressed storage with replication/erasure coding.
- State sharding with selectable consistency modes.
- Checkpointing and deterministic replay for migration.
- Optional **anchored persistence** via integrity commitments (without storing plaintext).

## 10. Risks and tradeoffs
- **Complexity**: requires browser-as-distributed-runtime and OS QoS primitives.
- **Ecosystem dependence**: rendezvous/relay infrastructure (BCIN) must be federated and open.
- **Energy/battery**: opt-in, policy constrained, and aggressively throttled.
- **Abuse**: requires visible receipts, rate limits, and auto-revocation.
- **Consistency vs scalability**: BFT and strong consistency are shard-limited; mixed consistency is required.

## 11. Governance and standardization
A plausible path:
- Standardize minimal primitives first (leases, sandbox domains, deterministic VM, ingress ports).
- Require strong transparency UX and revocation semantics before enabling ingress.
- Ship in tiers (see normative spec) gated by attestation and OS support.

## 12. Compatibility tiers (implementation reality)
- **Tier A (Software-only)**: deterministic compute + storage without ingress.
- **Tier B (OS QoS)**: enforceable UI-first scheduling and GPU slicing.
- **Tier C (Attested execution)**: hardware-backed identity and sealed domains.
- **Tier D (Ingress)**: `WebIngressPort` + BCIN integration.

## 13. Next: normative specification
See `docs/WEB_FABRIC_SPEC.md` for conformance language, APIs, protocols, and detailed requirements.
