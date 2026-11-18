# INTELLIGENT API SECURITY AND REQUEST VALIDATION PLATFORM
### Network Architecture & Data Communication Specification (Computer Networks)

---

## 1. NETWORK TOPOLOGY & DEVICE INTERCONNECTION

### 1.1 Network Architecture & Topology Classification
The **Intelligent API Security and Request Validation Platform** implements a **Hybrid Client-Server Star Topology** capable of operating over both a Local Area Network (LAN / Loopback) and a Wide Area Network (WAN / Public Cloud). The system interconnects three distinct tiers: the **Client Tier** (React.js Web Dashboard & Simulated API Clients), the **Application & Security Gateway Tier** (Node.js + Express.js Server running Regex and 7-State DFA Engines), and the **Database Tier** (MongoDB Storage Service / Atlas Replica Set).

### 1.2 Network Interconnection & Hardware Device Roles
In this network architecture, several physical and logical network devices work together to guarantee reliable, ordered, and secure API transmission:

* **Network Interface Card (NIC):** Operates at Physical & Data Link layers (OSI Layers 1 & 2) on the client machine to encode and transmit digital frames over Wi-Fi (IEEE 802.11) or Ethernet (IEEE 802.3).
* **Network Switch (Layer 2):** Maintains a MAC Address Table to forward Ethernet frames within the local subnet between client workstations and the server without collisions.
* **Local Gateway Router (Layer 3):** Acts as the default gateway (`192.168.1.1`), provides DHCP dynamic IP configuration, executes Network Address Translation (NAT) to map private IPs to public WAN IPs, and routes packets to the Internet Service Provider (ISP).
* **ISP Edge Routers & Autonomous Systems (AS):** Route packets across the Internet backbone using Border Gateway Protocol (BGP) when the platform is accessed across cloud networks.
* **Reverse Proxy & Express API Security Gateway:** Receives incoming HTTP/HTTPS traffic (Port `5000` locally or Port `443` in cloud production), enforces Helmet headers, CORS, and Express Rate Limiting, and intercepts every payload through the Regex and DFA validation engines.
* **MongoDB Storage Engine / Replica Set:** Accepts persistent TCP socket connections on Port `27017` to commit audited request logs, client DFA states, bcrypt-hashed user credentials, and real-time security alerts.

### 1.3 Topology Interconnection Diagram
```text
[Web Browser / React SPA Dashboard & Simulated API Clients]
    │  (Client LAN: 192.168.1.15 / Localhost: 127.0.0.1 : Ephemeral Port 52140)
    ▼
[Local Gateway / NAT Router]  (LAN: 192.168.1.1 ──> Public WAN IP: 103.212.x.x)
    │
    ▼  (LAN Switching / WAN Optical Fiber & BGP Routing)
[Reverse Proxy / Cloud Load Balancer]  (Production Port 443 TLS ──> Internal Port 5000)
    │  (Internal Express Binding: 127.0.0.1 / 0.0.0.0 : Port 5000)
    ▼
[Node.js + Express.js API Security Server]
    ├── Ingress Middleware (requestMonitor.js, Helmet, CORS, Rate Limiter, JWT Auth)
    ├── Tier 1: Syntactic Regular Expression Validation Engine (regexValidator.js)
    └── Tier 2: 7-State DFA Sequence Engine (q0 -> q1 -> q2 -> q3 -> q4 -> q5 | Sink: qE)
    │
    ▼  (Persistent TCP Socket Pool : Port 27017)
[MongoDB Database Instance / Atlas Cluster]  (127.0.0.1:27017 / cluster0.mongodb.net)
    ├── requestlogs Collection     (Full HTTP, Regex & DFA audit records)
    ├── securityalerts Collection  (Automated High/Medium/Low threat alerts)
    ├── clientsessions Collection  (Per-client active DFA states & histories)
    └── users Collection           (Authenticated accounts with bcrypt hashes)
```

---

## 2. IP ADDRESSING SCHEME & COMMUNICATION ANALYSIS

IP addressing provides logical identification and routing for every node across the local network and Internet. The table below identifies each entity in our API Security Platform, its assigned IP address, category, and functional role:

| Network Entity | Assigned IP / Domain | IP Class / Type | Functional Role |
| :--- | :--- | :--- | :--- |
| **Client Workstation** | `192.168.1.15` / `127.0.0.1` | Private IPv4 (Class C, `/24`) / Loopback | Originates simulated API HTTP requests & loads React Dashboard UI |
| **Local Gateway Router** | `192.168.1.1` | Private Gateway IPv4 | Performs DHCP IP allocation and stateful NAT translation |
| **Client Public IP** | `103.212.x.x` (Dynamic) | Public Routable IPv4 | Identifies the client LAN across the public Internet |
| **Express Security Server** | `127.0.0.1` / `0.0.0.0` (Local) | Localhost / Cloud Anycast IPv4 | Receives REST API requests on Port `5000` & executes Regex + DFA engines |
| **Vite Dev Server (Optional)** | `127.0.0.1:5173` | IPv4 Loopback (Class A) | Serves React frontend with Hot Module Replacement during development |
| **MongoDB Database** | `127.0.0.1:27017` / Atlas URI | Loopback / Cloud Distributed Domain | Hosts persistent `requestlogs`, `securityalerts`, `clientsessions` & `users` |

### 2.1 Network Address Translation (NAT) & Private-to-Public Mapping
Under **RFC 1918**, private IP addresses (such as `192.168.1.15`) cannot be routed directly across the public Internet. When the API Security Platform is hosted in the cloud and a client dispatches a validation request, the local gateway router executes **Network Address Port Translation (NAPT)**. The router replaces the private source IP and port (`192.168.1.15:52140`) with its own public IP and mapped port (`103.212.x.x:61025`) and records the mapping in its stateful NAT table. When the Express server replies with `HTTP 200 OK` or `HTTP 403 Forbidden`, the router references the NAT table to demultiplex and deliver the packet back to the exact client workstation. In local demonstration mode, traffic loops cleanly over `127.0.0.1`.

### 2.2 Domain Name System (DNS) Resolution Process
Before transmitting an API request to a remote host, the client resolves the domain into an IPv4 address:
1. Client OS checks local DNS resolver cache and system hosts file (`localhost` resolves directly to `127.0.0.1`).
2. For external domains, a recursive DNS query is dispatched over **UDP Port 53** to Google DNS (`8.8.8.8`) or Cloudflare DNS (`1.1.1.1`).
3. The resolver traverses the DNS hierarchy: **Root Servers (`.`) ──> TLD Servers (`.com`) ──> Authoritative Name Servers**.
4. The Authoritative Server returns an **`A` Record** mapping the hostname to the server's public IPv4 address.
5. The client caches the resolved IP address and initiates the TCP 3-way handshake.

---

## 3. PROTOCOLS USED & WORKING PRINCIPLES

The Intelligent API Security Platform utilizes a complete network protocol stack aligned with both the **OSI 7-Layer Reference Model** and the **TCP/IP 4-Layer Architecture**:

| OSI Layer | Protocol(s) Used | Role in API Security & Request Validation Platform |
| :--- | :--- | :--- |
| **Layer 7: Application** | HTTP/1.1, HTTPS, REST, DNS, JWT | Transmits JSON API requests & validation verdicts across REST endpoints (`/api/requests/validate`, `/api/auth`, `/api/alerts`, `/api/automata`). |
| **Layer 6: Presentation** | TLS 1.3, SSL, JSON, bcrypt | Provides TLS encryption in production, JSON serialization of API payloads, and bcrypt salt hashing for stored user passwords. |
| **Layer 4: Transport** | TCP (Transmission Control Protocol) | Guarantees reliable, ordered, error-checked delivery of API requests via 3-way handshake, Seq/Ack numbers, and sliding-window flow control. |
| **Layer 3: Network** | IPv4, ICMP, ARP, BGP | Manages logical end-to-end packet routing across local subnets and Internet Autonomous Systems; ARP maps IPv4 to MAC. |
| **Layers 1 & 2: Link / Physical** | Ethernet 802.3, Wi-Fi 802.11, Loopback | Governs Ethernet framing, hardware MAC addressing, collision avoidance (CSMA/CA), and bit-level media transmission. |

### 3.1 Application Layer: HTTP/1.1 & REST Architecture
Client-server communication follows the **RESTful (Representational State Transfer)** pattern with stateful DFA enforcement layered on top:
* **`POST /api/requests/validate`:** Accepts Client ID, HTTP Method, Endpoint, Parameters, and JSON Body. Executes Tier 1 Regex validation and Tier 2 DFA sequence verification, logs the result, and generates alerts on failure.
* **`POST /api/auth/register` & `POST /api/auth/login`:** Manages user registration with bcrypt password hashing and issues signed JWT tokens to protect dashboard routes.
* **`GET /api/dashboard/stats` & `GET /api/requests`:** Queries MongoDB for total, valid, and invalid request metrics along with paginated request audit logs.
* **`GET /api/alerts` & `PATCH /api/alerts/:id/review`:** Retrieves automatically generated security alerts (High/Medium/Low severity) and allows administrators to mark alerts as reviewed.
* **`GET /api/automata/transitions` & `POST /api/automata/reset/:id`:** Exposes the formal 7-state DFA transition matrix, tracks per-client states, and resets trapped `qE` sessions back to `q0`.

### 3.2 Transport Layer: Transmission Control Protocol (TCP)
TCP is used instead of UDP because API security auditing and DFA state transitions require 100% reliable, ordered, zero-loss delivery:
1. **TCP 3-Way Handshake:** Client sends `SYN` ──> Server replies `SYN-ACK` ──> Client sends `ACK` to establish a full-duplex session.
2. **Sequence & Acknowledgment Numbers:** Every TCP segment carries a sequence number so the Express server reassembles JSON payloads in exact byte order and detects dropped packets.
3. **Flow & Congestion Control:** Sliding window advertisements prevent server buffer overflow under burst API traffic, while congestion avoidance stabilizes throughput.
4. **Connection Teardown & Keep-Alive:** Persistent HTTP Keep-Alive reuses sockets for rapid polling, followed by a clean 4-way `FIN/ACK` teardown.

### 3.3 Security Layer: TLS 1.3, JWT & Application Defenses
In cloud deployment, all external HTTP traffic is protected by **Transport Layer Security (TLS 1.3)** using X.509 digital certificates and ECDHE key exchange with AES-256-GCM encryption. At the application layer, the platform enforces JWT Bearer authentication (`Authorization: Bearer <token>`), Helmet HTTP security headers, Express rate limiting (1,000 req/15 min), and `bcrypt` password hashing.

---

## 4. PORT NUMBERS & JUSTIFICATION

Port numbers are 16-bit unsigned integers (`0` to `65535`) at the Transport Layer used to multiplex and route network packets to the exact application process on a host. The table below details every port used in our platform and its technical justification:

| Port No. | Protocol | Associated Service | Technical Justification & Purpose |
| :---: | :---: | :--- | :--- |
| **5000** | TCP | Express.js API Security Server | Primary backend listener (`process.env.PORT \|\| 5000`). Non-privileged port (`>1024`) serving all REST API endpoints (`/api/*`) and the compiled React SPA. |
| **27017** | TCP | MongoDB Database Daemon | Standard IANA-registered port for MongoDB Wire Protocol. Used by Mongoose ODM to maintain a persistent TCP connection pool for audit logs and DFA states. |
| **5173** | TCP | Vite Dev Server (Optional) | Default development port for Vite Hot Module Replacement (HMR). Unused in production since Express serves `client/dist` directly on Port `5000`. |
| **443** | TCP | HTTPS (Cloud Production) | Standard IANA port for TLS-encrypted web traffic when deployed behind a cloud reverse proxy (Render / Railway / Nginx). |
| **80** | TCP | HTTP (Cloud Redirect) | Standard unencrypted web port in production; automatically redirects incoming HTTP requests via `301/308` to HTTPS Port `443`. |
| **49152–65535** | TCP | Ephemeral Client Ports | Dynamically assigned by the client OS TCP stack to uniquely distinguish concurrent browser tabs and simulated API client connections. |

### 4.1 Socket Pair Analysis
Every active TCP connection between a client and the API Security Platform is uniquely identified by a 4-tuple Socket Pair:

```text
Socket Pair = (Source IP, Source Port, Destination IP, Destination Port)
Example Local Validation Request: (127.0.0.1 : 52140, 127.0.0.1 : 5000)
```

* **Destination Port `5000`** directs the incoming TCP stream to the Node.js Express security server process.
* **Source Port `52140`** guarantees that when the Express server sends back the `HTTP 200 OK` or `403 Forbidden` verdict, the client OS delivers it directly to the exact browser tab that submitted the test.

---

## 5. END-TO-END PACKET FLOW & LIFECYCLE

The sequence diagram and steps below trace the complete lifecycle of an API validation request from submission in the API Request Tester to Regex/DFA processing, MongoDB persistence, and the returned response:

```text
[Client Browser]     [OS / Router]      [Express :5000]     [Regex + DFA Engine]     [MongoDB :27017]
       │                   │                   │                     │                       │
 1. DNS/Hosts Lookup ────> │                   │                     │                       │
 <── IP: 127.0.0.1 ─────── │                   │                     │                       │
       │                   │                   │                     │                       │
 2. TCP SYN (52140->5000)> │ ────────────────> │                     │                       │
 <── TCP SYN-ACK ───────── │ <──────────────── │                     │                       │
 3. TCP ACK ─────────────> │ ────────────────> │                     │                       │
       │                   │                   │                     │                       │
 4. HTTP POST /validate ─> │ ────────────────> │                     │                       │
    {clientId, method,     │                   │ 5. requestMonitor   │                       │
     endpoint, body}       │                   │    logs IP & time   │                       │
       │                   │                   │ ── Inspect ───────> │ 6. Tier 1: Regex Check│
       │                   │                   │                     │    (Method, URI, SQLi)│
       │                   │                   │                     │ 7. Tier 2: DFA δ(q,σ) │
       │                   │                   │                     │    q0 -> q1 (or -> qE)│
       │                   │                   │                     │ 8. Write Log & Alert >│
       │                   │                   │                     │ <── Write Commit ACK ─│
       │                   │                   │ <── Verdict JSON ── │                       │
 9. HTTP 200 / 403 Resp <─ │ <── Demux 52140 ─ │                     │                       │
 10. UI Displays PASS/FAIL │                   │                     │                       │
```

### 5.1 Detailed 10-Step Packet Traversal
1. **Application Serialization:** User clicks *Validate Request*. React/Axios serializes the JSON payload: `{"clientId":"client-01","method":"POST","endpoint":"/api/login","body":{"email":"student@university.edu","password":"Password123"}}`.
2. **Name Resolution:** The client resolves `localhost` to `127.0.0.1` (or resolves the cloud domain via UDP Port `53` DNS).
3. **TCP 3-Way Handshake:** The client OS allocates an ephemeral port (e.g., `52140`) and completes the `SYN ──> SYN-ACK ──> ACK` handshake with Express on Port `5000`.
4. **Encapsulation & Transmission:** The payload is encapsulated down the TCP/IP stack: `JSON Data ──> HTTP POST ──> TCP Segment ──> IPv4 Datagram ──> Ethernet/Loopback Frame`.
5. **Server Ingress & Security Middleware:** Express accepts the TCP stream on Port `5000`, parses JSON headers, checks rate limits, and passes the request through `requestMonitor.js` to record Client IP and timestamp.
6. **Tier 1 — Syntactic Regex Validation:** `regexValidator.js` validates HTTP method, URI structure, Client ID format, email syntax, numeric parameters, and checks for SQL injection / XSS attack signatures.
7. **Tier 2 — DFA Sequence Verification:** `dfaEngine.js` loads the current state for `client-01` and evaluates transition $\delta(q_{\text{current}}, \text{inputSymbol})$. Valid transitions advance along `q0 ➔ q1 ➔ q2 ➔ q3 ➔ q4 ➔ q5`; unexpected jumps force the client into sink trap state `qE`.
8. **MongoDB Socket Persistence:** Over the persistent TCP socket on Port `27017`, Mongoose commits the `RequestLog` document, updates the `ClientSession` DFA state, and writes a `SecurityAlert` if any Regex or DFA failure occurred.
9. **HTTP Response Egress:** Express constructs the response (`HTTP 200 OK` for valid transitions, `HTTP 400` for malformed Regex, or `HTTP 403 Forbidden` for DFA violations) and transmits it back across the TCP socket.
10. **Client Demultiplexing & Rendering:** The client OS routes the returning packet to Ephemeral Port `52140`. React parses the JSON verdict, updating the green/red status badges, HTTP code, validation explanation, and live DFA diagram.

---

## 6. NETWORK SECURITY & VALIDATION SCENARIOS IN THE PROJECT

The API Request Tester includes interactive controls and presets to demonstrate protocol-level validation under both legitimate workflows and malicious attack scenarios:

| Simulation Action | Security / Network Condition | Protocol Layer Behavior | DFA & Database Response |
| :--- | :--- | :--- | :--- |
| **1. Valid Login (`POST /api/login`)** | Healthy authenticated session initiation | `HTTP 200 OK` over TCP; Regex PASS | DFA transitions `q0 ➔ q1`. Request logged in MongoDB `requestlogs`. |
| **2. Full Valid Sequence (`Login ➔ Profile ➔ Data ➔ Logout`)** | Compliant multi-step REST protocol workflow | Sequential `HTTP 200 OK` responses over persistent connection | DFA advances `q0 ➔ q1 ➔ q2 ➔ q3 ➔ q5` (Accepting State). Full trace saved. |
| **3. SQLi / XSS / Malformed Email Payload** | Corrupt input or injection attack (`' OR '1'='1`, `<script>`) | Application-layer Regex rejection (`HTTP 400 Bad Request`) | Regex FAIL. Automated `SecurityAlert` created in MongoDB `securityalerts`. |
| **4. Out-of-Order Call (`Skip Login ➔ GET /api/data`)** | Broken authentication / workflow bypass attempt | Application-layer protocol block (`HTTP 403 Forbidden`) | DFA traps client in sink state `qE`. `HIGH` severity sequence alert logged. |
| **5. Trapped State Retry & Reset State** | Blocked client retry vs. administrative session reset | `HTTP 403` while locked in `qE`; `HTTP 200` on `POST /api/automata/reset/:id` | Client session unlocked from `qE` and reset cleanly back to initial state `q0`. |

---

## 7. GITHUB REPOSITORY

| Resource | Platform | Public Access Link |
| :--- | :--- | :--- |
| **GitHub Repository Link** | GitHub | [https://github.com/Aafrinnidha/api-security-platform](https://github.com/Aafrinnidha/api-security-platform) |
| **Instant Cloud Runnable Link** | GitHub Codespaces | [https://codespaces.new/Aafrinnidha/api-security-platform](https://codespaces.new/Aafrinnidha/api-security-platform) |
