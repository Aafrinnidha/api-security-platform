# Intelligent API Security and Request Validation Platform

A clean, modern, student & faculty-friendly web-based API security monitoring and request validation platform. The platform inspects and validates HTTP API requests using **Regular Expressions (Regex)** for syntactic/schema validation and a **Deterministic Finite Automaton (DFA)** for protocol sequence compliance, tracking client-server interactions, blocking malformed requests, and logging security alerts in **MongoDB**.

---

## 1. Design & UI Philosophy

- **Clean White Theme**: White background (`#ffffff`), light grey sections (`#f8fafc`), dark grey typography (`#0f172a`, `#334155`), minimal borders, and blue primary accent (`#2563eb`).
- **Uncluttered & Usable**: Streamlined interface designed for students and faculty without overwhelming technical noise.
- **Academic Pillars**:
  - **FLAT**: Regular Expressions, Deterministic Finite Automaton (7 states), State Transition Diagram, and Transition Table.
  - **CN**: HTTP methods (`GET`, `POST`, `PUT`, `DELETE`), client-server communication, headers, and status code verification.
  - **FSWD**: React.js frontend, Node.js + Express backend, and MongoDB database.

---

## 2. Navigation Structure

The sidebar navigation contains only 6 essential items:

1. **Dashboard** (`/`): High-level API security overview with 4 summary cards (Total Requests, Valid Requests, Invalid Requests, Security Alerts), recent requests table, and recent alerts.
2. **API Request Tester** (`/tester`): Interactive request builder with quick test presets and a 5-point validation result card (Regex PASS/FAIL, DFA PASS/FAIL, Overall Status, HTTP Status, Validation Message).
3. **Request Monitoring** (`/monitoring`): Comprehensive API interaction table with essential search & filters (Client ID, Method, Status) and a deep request inspection modal.
4. **Security Alerts** (`/alerts`): Security alerts repository with color-coded severities (Red for High, Orange for Medium, Blue for Low) and a "Mark Reviewed" action.
5. **DFA Visualization** (`/automata`): Interactive state diagram with active state illumination, client state inspector, and the formal state transition table.
6. **Logout**: Clean session termination.

---

## 3. Finite Automata (DFA) Specification

The system validates interaction sequences according to the formal 7-state automaton: $M = (Q, \Sigma, \delta, q_0, F)$.

### States ($Q$)
- **$q_0$**: Initial State (Unauthenticated)
- **$q_1$**: Login Successful (`POST /api/login`)
- **$q_2$**: Profile Accessed (`GET /api/profile`)
- **$q_3$**: Data Accessed (`GET /api/data`)
- **$q_4$**: Data Updated (`PUT /api/data`, optional)
- **$q_5$**: Accepting State (`POST /api/logout`, double circle)
- **$q_E$**: Invalid State (Sequence anomaly / sink state)

### State Transition Table ($\delta$)

| Current State | Input Symbol ($\sigma$) | Next State ($\delta$) | Description | Type |
| :---: | :--- | :---: | :--- | :---: |
| `q0` | `POST /api/login` | `q1` | Client initiates authentication | **VALID** |
| `q1` | `GET /api/profile` | `q2` | Client checks profile identity | **VALID** |
| `q2` | `GET /api/data` | `q3` | Client accesses enterprise dataset | **VALID** |
| `q3` | `PUT /api/data` | `q4` | Client updates data record | **VALID** |
| `q3` | `POST /api/logout` | `q5` | Direct logout after data access | **VALID (Accepting)** |
| `q4` | `POST /api/logout` | `q5` | Logout following data update | **VALID (Accepting)** |
| `q5` | `POST /api/login` | `q1` | Re-authentication for new workflow | **VALID** |
| `ANY` | Any unexpected input | `qE` | Protocol sequence jump / violation | **VIOLATION (Sink)** |

---

## 4. User Registration and Authentication

The platform features a clean, manual authentication and account creation flow:

- **Create Account** (`/register`): Any user can register using their own Full Name, Email Address, and Password.
  - Password and confirm password matching validation.
  - Email format validation and duplicate email prevention.
  - Passwords are encrypted using **bcrypt** salt hashing before persisting to MongoDB (plain-text passwords are never stored).
- **Manual Login** (`/login`):
  - Manual entry of email address and password (no predefined values or automatic fills).
  - Show / Hide password toggle.
  - Password comparison against stored bcrypt hash.
  - Generates a signed **JWT** token upon successful authentication.
  - Friendly error feedback: `"Invalid email or password."`
- **Session Protection**:
  - Protected routes redirect unauthenticated users to `/login`.
  - Secure logout clears tokens and terminates sessions.

---

## 5. Automated Verification Test Suite

A standalone test runner ([test-suite.js](file:///C:/Users/nidha/.gemini/antigravity/scratch/api-security-platform/server/test-suite.js)) validates all core scenarios:

```bash
cd server
node test-suite.js
```

### Verification Results:
- **Test 1**: Valid Sequential Workflow (`q0 -> q1 -> q2 -> q3 -> q4 -> q5`) $\rightarrow$ **PASS**
- **Test 2**: Invalid Sequence Anomaly (Skip Profile directly to Data) $\rightarrow$ **PASS (Rejection to qE + Alert)**
- **Test 3**: Malformed Requests (Bad method, path traversal, missing parameters, invalid client ID) $\rightarrow$ **PASS (Regex failure + Alert)**
- **Test 4**: Client Isolation (Client A at `q2`, Client B independently at `q0` then `q1`) $\rightarrow$ **PASS**
- **Overall**: **15 / 15 Passed (0 Failed)**.

---

## 6. Network Architecture & Communication Specification (CN)

A complete architectural specification covering computer networking principles is detailed in [NETWORK_ARCHITECTURE_SPECIFICATION.md](file:///C:/Users/nidha/API-Security-Platform/API-Security-Platform/NETWORK_ARCHITECTURE_SPECIFICATION.md):

* **Topology:** Three-Tier Client-Server Architecture over a Star/Extended-Star Network Topology connecting Web Browser clients, Express API Gateway/Server, and MongoDB Database service.
* **IP Addressing:** 
  - Client: Loopback `127.0.0.1` / dynamic LAN `192.168.1.x` (unicast socket origin).
  - Server: Dedicated bind at `127.0.0.1:5000` / `0.0.0.0` (REST socket listener).
  - Database: MongoDB local daemon at `127.0.0.1:27017` or MongoDB Atlas cloud host.
* **Protocols:** 
  - Application Layer: `HTTP/1.1` & `HTTPS` (RESTful JSON APIs with stateful DFA session tracking).
  - Transport Layer: `TCP` (Reliable, sequenced delivery via 3-way handshake `SYN` ➔ `SYN-ACK` ➔ `ACK`).
  - Network & Link: `IPv4` datagram encapsulation and Ethernet (`IEEE 802.3`).
* **Port Numbers:**
  - `Port 5000`: Dedicated Node.js / Express backend server socket.
  - `Port 27017`: Default IANA MongoDB database daemon socket.
  - `Port 5173`: Vite HMR development server (development only).
  - `Dynamic Ephemeral (49152-65535)`: Client-side OS socket binding.
* **Packet Flow:** Complete 9-step transmission flow from client DNS resolution, TCP handshake, middleware interception (`requestMonitor.js`), Tier 1 Regex check, Tier 2 DFA sequence evaluation $\delta(q, \sigma)$, MongoDB persistence, and egress HTTP response (200 OK / 403 Forbidden).

---

## 7. How to Run the Application

### Prerequisites
- Node.js (v18+)
- MongoDB (Running locally on default port 27017 or remote MongoDB Atlas connection string)

### Setup & Installation
```bash
# 1. Clone repository
git clone https://github.com/<YOUR_USERNAME>/<YOUR_REPOSITORY>.git
cd api-security-platform

# 2. Install all dependencies (Server and Client)
npm run install:all

# 3. Environment configuration
cp server/.env.example server/.env

# 4. Build Client
npm run build

# 5. Start Server
npm start
```

Access the application at [http://localhost:5000](http://localhost:5000).

### Run Test Suites
```bash
cd server
node test-suite.js
node test-auth.js
```
