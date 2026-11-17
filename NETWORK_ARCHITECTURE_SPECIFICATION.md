# NETWORK ARCHITECTURE & DATA COMMUNICATION SPECIFICATION

## Intelligent API Security and Request Validation Platform

This document provides a detailed Computer Networks (CN) and System Architecture specification covering the physical/logical network topology, IP addressing scheme, transport and application layer protocols, port assignments, and the end-to-end packet flow lifecycle.

---

## 1. Topology: Network Connection of Client, Server & Network Devices

The platform utilizes a **Three-Tier Client-Server Architecture** operating over a logical and physical **Star/Extended-Star Network Topology**.

```
   ┌─────────────────────────────────────────────────────────────┐
   │                       CLIENT TIER                           │
   │  [ Web Browser / React.js SPA ]   [ Simulated API Clients ] │
   │          (Client ID: client-01, client-02, attacker-99)     │
   └──────────────────────────────┬──────────────────────────────┘
                                  │
                                  ▼
   ┌─────────────────────────────────────────────────────────────┐
   │             INTERMEDIARY NETWORK INFRASTRUCTURE             │
   │   - Network Interface Cards (NIC / Virtual Loopback)        │
   │   - Layer 2 Ethernet Switch (Frame switching & MAC learning)│
   │   - Layer 3 IP Router / Gateway (Routing & NAT translation) │
   │   - Firewall / Reverse Proxy Boundary                       │
   └──────────────────────────────┬──────────────────────────────┘
                                  │
                                  ▼
   ┌─────────────────────────────────────────────────────────────┐
   │                  SECURITY & APPLICATION TIER                │
   │   Node.js / Express.js Server (Port: 5000)                  │
   │   ├── Ingress Request Interceptor Middleware                │
   │   ├── Tier 1: Syntactic Regex Validation Engine             │
   │   └── Tier 2: 7-State DFA Sequence Verification Engine      │
   └──────────────────────────────┬──────────────────────────────┘
                                  │
                                  ▼  (TCP Connection Pool / Port 27017)
   ┌─────────────────────────────────────────────────────────────┐
   │                       DATABASE TIER                         │
   │   MongoDB Database Instance (Port: 27017 / TLS 1.3)         │
   │   └── Stores: Users, Request Logs, Alerts, Client Sessions  │
   └─────────────────────────────────────────────────────────────┘
```

### Connection Details:
1. **Client Node:** Consists of end-user workstations executing the React.js Single Page Application (SPA) inside modern web browsers (Chrome, Edge, Firefox) or programmatic testing clients (cURL, Postman, automated test scripts).
2. **Network Intermediaries:** 
   - **NIC (Network Interface Card):** Handles framing, bit-level physical transmission, and MAC address addressing.
   - **Layer 2 Switch:** Operates at the Data Link layer to forward Ethernet frames between local clients and the application host based on MAC address tables.
   - **Layer 3 Router / NAT Gateway:** Routes packets across subnets, resolves IP addresses, and handles Network Address Translation (NAT) when traffic originates from public networks.
3. **Application & Security Server Node:** Express.js REST server acting as an intelligent API security gateway. Every incoming request must pass through security middleware before reaching any route logic.
4. **Database Node:** MongoDB database connected to the application server via a dedicated TCP socket pool on port 27017, storing audit logs and real-time state vectors.

---

## 2. IP Addressing: Identification & Communication

The platform uses **IPv4 addressing** (with full compatibility for IPv6) to establish unicast network communications between nodes.

| Network Node | Development Environment | Production / Cloud Environment | Role & Description |
| :--- | :--- | :--- | :--- |
| **Client Node** | `127.0.0.1` (IPv4 Loopback) or LAN IP (e.g., `192.168.1.15`) | Dynamic Public IPv4 (Assigned by client ISP or NAT) | Originates HTTP API requests. Extracted by server via `req.ip` and `req.headers['x-forwarded-for']`. |
| **Application Server** | `127.0.0.1` / `0.0.0.0` (Localhost binding) | Public Static IPv4 or Cloud Domain (e.g., `render.com` VIP) | Listens for inbound TCP requests, executes Regex and DFA inspection, and dispatches responses. |
| **Database Server** | `127.0.0.1` (Local loopback) | Remote MongoDB Atlas Cloud Cluster (`cluster0.mongodb.net`) | Persists audit logs, security alerts, and client DFA session states. |

### Communication Mechanism:
* **Addressing Scheme:** Class A private loopback block (`127.0.0.0/8`) in local development, or Class C private networks (`192.168.0.0/16`) in local area networks.
* **Socket Pairing:** Client and server communicate using a uniquely identified network socket pair:
  $$\text{Socket Pair} = (\text{Client IP} : \text{Client Port}, \text{Server IP} : \text{Server Port})$$
* **Unicast Transmission:** Each request packet contains the destination IP of the Express server. The IP datagram encapsulates the TCP segment carrying the HTTP payload.

---

## 3. Protocols: Selection & Detailed Working

The platform operates across the standard OSI / TCP-IP network protocol stack:

```
┌────────────────────────────────────────────────────────┐
│ Application Layer │ HTTP/1.1 & HTTPS (JSON REST API)   │
├───────────────────┼────────────────────────────────────┤
│ Transport Layer   │ TCP (Reliable Transmission Control)│
├───────────────────┼────────────────────────────────────┤
│ Network Layer     │ IPv4 / ICMP (Routing & Addressing) │
├───────────────────┼────────────────────────────────────┤
│ Data Link Layer   │ Ethernet (IEEE 802.3) / Wi-Fi      │
├───────────────────┼────────────────────────────────────┤
│ Physical Layer    │ Twisted Pair Copper / Optical / RF │
└────────────────────────────────────────────────────────┘
```

### 1. Application Layer: HTTP/1.1 & HTTPS
* **Working:**
  - Employs stateless, text-based REST architecture.
  - Standard HTTP verbs are strictly parsed: `GET` (retrieve), `POST` (create), `PUT` (update), `DELETE` (remove).
  - Headers convey metadata: `Content-Type: application/json` for payload format, `Authorization: Bearer <jwt>` for token authentication, and `X-Client-ID` for session tracking.
  - JSON (JavaScript Object Notation) is used as the universal data serialization format for request and response payloads.
* **Statefulness via DFA:** While HTTP is fundamentally stateless, our platform achieves stateful security enforcement by using the `clientId` identifier to map each HTTP request to an active state in the Deterministic Finite Automaton (DFA) state machine.

### 2. Transport Layer: TCP (Transmission Control Protocol)
* **Working:**
  - **Connection-Oriented:** A dedicated connection is established before data exchange using the **TCP 3-Way Handshake**:
    1. **SYN:** Client sends Synchronize packet (`Seq = x`) to Server.
    2. **SYN-ACK:** Server acknowledges and responds with (`Seq = y`, `Ack = x + 1`).
    3. **ACK:** Client confirms (`Ack = y + 1`).
  - **Reliability:** Guarantees error-free, sequenced delivery of API payloads via cumulative acknowledgments, checksum validation, and automatic retransmissions (ARQ).
  - **Flow & Congestion Control:** Implements sliding window algorithms to avoid buffer overruns on the server.

---

## 4. Port Numbers: Identification & Purpose Justification

Network ports act as transport layer multiplexing identifiers, directing packets to the appropriate operating system process.

| Port Number | Protocol | Service / Component | Purpose & Justification |
| :---: | :---: | :--- | :--- |
| **5000** | TCP | Express.js API Server | **Dedicated Application Port:** Standard development/production port used by Node.js. It binds the HTTP server to receive REST API requests (`/api/*`) and serve static React production assets without requiring root/administrative OS privileges (ports < 1024). |
| **27017** | TCP | MongoDB Database Daemon (`mongod`) | **Database Socket Port:** Default IANA-assigned standard port for MongoDB. The backend Mongoose ODM establishes a persistent TCP connection pool on this port to query and persist request logs, security alerts, and DFA session data. |
| **5173** | TCP | Vite Frontend Dev Server *(Optional)* | **HMR Development Port:** Default port for Vite's lightning-fast Hot Module Replacement development server. In production, this port is closed because the Express server directly serves compiled static assets on port 5000. |
| **Dynamic Ephemeral (49152 - 65535)** | TCP | Client Operating System | **Client Source Port:** Dynamically assigned by the client OS TCP/IP stack for each client socket connection. Enables the server to differentiate between multiple tabs or concurrent client connections. |
| **80 / 443** | TCP | Cloud Edge / Reverse Proxy (Production) | **Standard Web Ports:** Used when deployed to cloud platforms (Render, Railway, Nginx) for standard HTTP (80) and TLS/HTTPS encrypted traffic (443). |

---

## 5. Packet Flow: Complete End-to-End Request & Response Lifecycle

The journey of an API request through the platform follows a deterministic 9-step pipeline:

```
[Client Browser]
       │
 (1)   │ [DNS Resolution & Socket Binding]
       ▼
 (2)   ├─── TCP SYN ──────────────────────────► [Server OS Socket]
       │◄── TCP SYN-ACK ──────────────────────┤
       ├─── TCP ACK ──────────────────────────►
       │
 (3)   │ [HTTP Request Dispatched (e.g. POST /api/login)]
       ├──────────────────────────────────────► [Express TCP Buffer]
       │                                              │
 (4)   │                                              ▼
       │                                     [requestMonitor.js]
       │                                     • Logs Client IP & Time
       │                                              │
 (5)   │                                              ▼
       │                                     [Tier 1: Regex Engine]
       │                                     • Validates Method & URL
       │                                     • Checks Injection Patterns
       │                                              │ (PASS)
 (6)   │                                              ▼
       │                                     [Tier 2: DFA Engine]
       │                                     • Checks State δ(q, σ)
       │                                     • Valid: q0 -> q1
       │                                     • Invalid: -> qE (Sink)
       │                                              │
 (7)   │                                              ▼
       │                                     [MongoDB Persistence]
       │                                     • Logs Request & Alerts
       │                                              │
 (8)   │ [HTTP Response (HTTP 200 / 403)]            │
       │◄─────────────────────────────────────────────┘
       │
 (9)   ▼
[Client UI Updates: Badges, Metrics & State Pill]
```

### Detailed Step-by-Step Flow:

1. **Step 1: Socket Creation & Name Resolution:**
   The client application triggers an API request (e.g., via `axios.post('/api/login')`). The OS resolves the target host via DNS/Hosts file and assigns a random ephemeral source port (e.g., `54321`).

2. **Step 2: TCP 3-Way Handshake:**
   The client initiates connection establishment with the server on port 5000 by exchanging `SYN`, `SYN-ACK`, and `ACK` packets.

3. **Step 3: HTTP Request Encapsulation & Transmission:**
   The client serializes the payload into an HTTP request packet:
   ```http
   POST /api/login HTTP/1.1
   Host: localhost:5000
   Content-Type: application/json
   X-Client-ID: client-01

   { "email": "student@university.edu", "password": "Password123" }
   ```
   This packet is segmented into TCP packets, wrapped in IPv4 datagrams, converted to Ethernet frames, and transmitted across the network medium.

4. **Step 4: Server Ingress & Middleware Interception:**
   The server's TCP socket accepts the segments, reassembles the byte stream, and routes the request into `server.js` $\rightarrow$ `app.js`. The **`requestMonitor`** middleware intercepts the request, logging the timestamp, client IP, method, and route.

5. **Step 5: Tier 1 - Syntactic Regex Validation:**
   The request enters `regexValidator.js`. The engine checks:
   - Method format against `/^(GET|POST|PUT|DELETE)$/`.
   - Endpoint structure against `/^\/(api\/)?[a-zA-Z0-9_\-]+(\/[a-zA-Z0-9_\-]+)*\/?$/`.
   - Client ID length and characters.
   - Body payload against SQL injection (`union`, `select`, `drop`) and XSS patterns (`<script>`).
   *If Regex fails:* The request is immediately flagged as `INVALID`, a security alert is dispatched, and execution halts.

6. **Step 6: Tier 2 - DFA Sequence Verification:**
   If Regex passes, the request is passed to `dfaEngine.js`:
   - Retrieves the client's current automaton state from in-memory cache / MongoDB (e.g., $q_0$).
   - Evaluates the input symbol `POST /api/login` against the transition table $\delta(q_0, \sigma)$.
   - *Valid Transition:* Moves client state to $q_1$, returns `VALID (HTTP 200)`.
   - *Sequence Violation:* Transitions client to trap state $q_E$, creates a `HIGH/CRITICAL` alert in MongoDB, and triggers `INVALID (HTTP 403 Forbidden)`.

7. **Step 7: Database Persistence:**
   The interaction record is written asynchronously to the MongoDB `requestlogs` collection. If an anomaly was detected, a security record is inserted into `securityalerts`.

8. **Step 8: HTTP Response Egress:**
   The Express server serializes the diagnostic JSON response:
   ```json
   {
     "success": true,
     "overallStatus": "VALID",
     "httpStatus": 200,
     "regexResult": { "isValid": true },
     "dfaResult": { "isValid": true, "previousState": "q0", "currentState": "q1" },
     "validationExplanation": "Valid transition: q0 ➔ q1 via [POST /api/login]."
   }
   ```
   The response is transmitted back to the client over the established TCP socket.

9. **Step 9: Client Ingress & Dynamic DOM Rendering:**
   The browser receives the HTTP response packet. React updates its state variables, rendering real-time visual feedback:
   - Status badge turns green (**VALID**) or red (**INVALID**).
   - HTTP response code is displayed.
   - DFA State machine visualizer transitions node $q_0 \to q_1$.
   - The connection is preserved via HTTP Keep-Alive for subsequent requests.

---

*Document version: 1.0.0 | Intelligent API Security & Request Validation Platform*
