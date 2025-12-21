# Local network “router/hotspot” reality (browser vs native)

This project can create a **joinable LAN-like experience** (AetherLAN) and a **private IPv6-like overlay** (Virtual IPv6), but there are hard platform limits:

## What Bellum CAN do in a browser
- Build a **P2P overlay network** over WebRTC between devices on the same Wi‑Fi/LAN (or anywhere with signaling).
- Provide **stable virtual IPv6 identities** for nodes/services (overlay addressing).
- Provide **“ingress”** for Fabrik sites (requests routed to browser nodes via server rendezvous + failover).
- Provide **allowlists/policies inside the app** (what Bellum features are reachable), and enforce them at the application layer.

## What a normal website CANNOT do (by design)
- Directly control the **Wi‑Fi chip**.
- Create a real **hotspot / AP** (share Wi‑Fi) from inside the browser.
- Change the device’s **system DNS** or router DNS.
- Install packet filters / firewalls / transparent proxies without OS-level privileges.

These are browser security boundaries, not “missing features”.

## Optional “future” companion (if you want a real router mode later)
To actually provide a portable hotspot and DNS allowlists, you need an OS-level component (one of):
- A **native companion app** (desktop/mobile) that runs a local VPN/tunnel + DNS service and exposes a localhost API that Bellum can talk to.
- A dedicated **travel router** / firmware integration.

Bellum’s existing overlay pieces (Virtual IPv6 + ingress + Fabric routing) are designed so they can plug into such a companion later without rewriting the platform.






