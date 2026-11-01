# Smart Store POS

[![License: Apache 2.0](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](LICENSE)
[![Node.js Version](https://img.shields.io/badge/Node.js-%3E%3D22.0.0-green.svg)](https://nodejs.org/)
[![React Version](https://img.shields.io/badge/React-19-61dafb.svg)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-6.0-blue.svg)](https://www.typescriptlang.org/)
[![Database](https://img.shields.io/badge/Database-PostgreSQL%2015-336791.svg)](https://www.postgresql.org/)
[![Cache](https://img.shields.io/badge/Cache-Redis%207-red.svg)](https://redis.io/)

Smart Store POS is a production-ready, full-stack Point of Sale and Inventory Management System engineered for single and multi-terminal retail stores. Built with a focus on speed, data consistency, and reliable offline-friendly hardware integration, it pairs a modern web application with a lightweight native desktop print agent for silent thermal receipt printing and automated cash drawer kicks.

---

## Key Features

- **Point of Sale Terminal**
  - High-velocity checkout interface with barcode scanner support.
  - Multi-payment support: Cash, M-Pesa mobile payments, Customer Credit (Pay Later), and Split payments.
  - Automatic tax calculations, discounts, and item-level price adjustments.
  - Real-time cart calculations with client-side state resilience.

- **Customer Credit & Ledger Management**
  - Track customer balances with an immutable, append-only ledger.
  - Record customer payments, partial settlements, and transaction history.
  - Configurable credit limits and balance statements.

- **Inventory & Stock Control**
  - Real-time stock decrement on sales with concurrency protection.
  - Stock movement tracking: Purchases, Adjustments, Transfers, and Damage write-offs.
  - Low-stock threshold alerts and product catalog classification.
  - Support for product variants, SKUs, and barcode indexing.

- **Hardware & Thermal Receipt Printing**
  - Silent ESC/POS printing without intrusive browser print dialogs.
  - Automatic cash drawer pulse kick (`ESC p`) and receipt paper cut (`GS V`).
  - Standalone local background agent (`print-agent`) communicating over HTTP to the Windows Print Spooler.
  - Browser fallback print dialog when the native agent is not in use.

- **Security & Financial Integrity**
  - JWT authentication stored in HTTP-only, secure cookies.
  - Role-Based Access Control (Admin, Manager, Cashier).
  - Rate limiting with Redis store, request sanitization, and Helmet HTTP headers.
  - Audit logs and daily cash-drawer reconciliation.

---

## System Architecture

```
                    +------------------------------------+
                    |       React 19 Frontend            |
                    |   (Vite + TailwindCSS + TanStack)  |
                    +-----------------+------------------+
                                      |
                     REST API (HTTPS) |  Local Hardware Print
                                      |  (HTTP localhost:4000)
                                      |
         +----------------------------+-----------------------------+
         |                                                          |
         v                                                          v
+------------------------+                              +-----------------------+
|    Express 5 Backend   |                              |   Local Print Agent   |
| (Node.js + TypeScript) |                              |  (Native Go Daemon)   |
+-----------+------------+                              +-----------+-----------+
            |                                                       |
   +--------+--------+                                     Winspool | API (RAW)
   |                 |                                              |
   v                 v                                              v
+------+         +-------+                              +-----------------------+
| Neon |         | Redis |                              | ESC/POS Thermal       |
| PG15 |         | Cache |                              | Printer & Cash Drawer |
+------+         +-------+                              +-----------------------+
```

---

## Technology Stack

| Layer | Technology | Purpose |
|---|---|---|
| Frontend | React 19, TypeScript, Vite, TailwindCSS 4 | Interactive POS UI and management screens |
| State Management | TanStack Query v5, Zustand | Server-state caching and client UI state |
| Backend API | Node.js 22, Express 5, TypeScript | REST endpoints, authentication, and domain logic |
| ORM & Migrations | Drizzle ORM, Drizzle Kit | Type-safe SQL queries and schema migrations |
| Primary Database | PostgreSQL 15 | ACID-compliant relational transactional data |
| Cache & Session Store | Redis 7 | Rate limiting, session invalidation, and fast locks |
| Print Agent | Go 1.22 (`winspool.drv`) | Native Windows spooler communication for ESC/POS |
| Containerization | Docker, Docker Compose | Multi-container local and production runtime |

---

## Quick Start (Docker)

The fastest method to run the entire stack (Database, Redis, Backend, and Frontend) is via Docker Compose:

### Prerequisites

- [Docker Engine](https://docs.docker.com/engine/install/) >= 24.0.0
- [Docker Compose](https://docs.docker.com/compose/install/) >= 2.20.0

### Run

1. Clone the repository:
   ```bash
   git clone https://github.com/Moha-abshir/POS.git
   cd POS
   ```

2. Start the services:
   ```bash
   docker-compose up -d --build
   ```

3. Access the applications:
   - **Frontend Application**: `http://localhost:5173`
   - **Backend REST API**: `http://localhost:5000`
   - **PostgreSQL**: `localhost:5432` (`pos_db`)
   - **Redis**: `localhost:6379`

4. Stop the services:
   ```bash
   docker-compose down
   ```

---

## Manual Development Setup

If you prefer to run services individually without Docker:

### 1. Prerequisites

- Node.js >= 22.0.0
- npm >= 10.0.0
- PostgreSQL running locally or remotely (e.g. Neon, Supabase)
- Redis instance running locally or remotely

### 2. Backend Setup

```bash
cd backend

# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env with your PostgreSQL and Redis connection strings

# Run database migrations
npm run db:migrate

# Start development server with live reload
npm run dev
```

The backend server runs on `http://localhost:5000`.

### 3. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Start Vite development server
npm run dev
```

The frontend application runs on `http://localhost:5173`.

### 4. Local Print Agent Setup (Optional for Physical Receipts)

The print agent is a Go daemon that exposes a lightweight local HTTP server on port `4000`. It receives raw ESC/POS payloads from the browser and writes them directly to the Windows spooler.

```bash
cd local-agent

# Build for Windows (from Linux or Windows)
GOOS=windows GOARCH=amd64 go build -o print-agent-64bit.exe .

# Run on Windows
./print-agent-64bit.exe
```

Pre-compiled 32-bit and 64-bit executables are also located in the `local-agent/` directory.

---

## Thermal Receipt Printer Setup

To use silent printing with your thermal printer (e.g., E-POS ECO250, Xprinter, Epson TM series):

1. **Start the Print Agent**: Run `print-agent-64bit.exe` on the computer connected to the printer. The agent listens on `http://localhost:4000`.
2. **Verify Printer Name**:
   - In Windows **Devices and Printers**, ensure the thermal printer name contains `POS` (e.g., `POS-80`, `E-POS ECO250`, or `POS Printer`). The POS application searches for printer names matching `POS` or `E-POS`.
3. **Test Connectivity**:
   - Open the POS in your browser and navigate to **Settings -> Thermal Receipt Printer Service**.
   - The status badge will show **Print Agent Active (HTTP 4000 OK)**.
   - Select your printer from the dropdown and click **Print Test Receipt & Kick Drawer**.

### Common Troubleshooting

- **Queue Stuck / Error State**:
  If a print job fails (such as running out of paper), Windows Spooler will pause subsequent jobs. Clear stuck jobs from Windows **Print Queue** or restart the spooler:
  ```cmd
  net stop spooler
  del /Q /F /S "%systemroot%\System32\Spool\Printers\*.*"
  net start spooler
  ```
- **USB Sleep Disconnection**:
  On Windows 7, 10, or 11, disable **USB selective suspend** under Windows Power Options to prevent Windows from putting thermal printer USB ports into standby mode.

---

## Configuration Reference

### Backend Environment Variables (`backend/.env`)

| Variable | Description | Default |
|---|---|---|
| `PORT` | HTTP port the Express server listens on | `5000` |
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://user:pass@localhost:5432/pos_db` |
| `REDIS_URL` | Redis server connection string | `redis://localhost:6379` |
| `JWT_SECRET` | Secret key for signing authentication tokens | Required |
| `FRONTEND_URL` | Allowed CORS origin for the React app | `http://localhost:5173` |
| `BREVO_API_KEY` | Optional Brevo (Sendinblue) key for email OTPs | Optional |
| `AWS_ACCESS_KEY_ID` | Optional S3 key for image uploads | Optional |
| `AWS_SECRET_ACCESS_KEY` | Optional S3 secret for image uploads | Optional |
| `AWS_REGION` | AWS S3 storage region | Optional |
| `AWS_BUCKET_NAME` | AWS S3 storage bucket name | Optional |

### Frontend Environment Variables (`frontend/.env`)

| Variable | Description | Default |
|---|---|---|
| `VITE_API_URL` | Base URL pointing to the backend API | `http://localhost:5000` |

---

## Repository Documentation

Comprehensive architectural designs and technical documentation are available in the `/docs` directory:

- [System Architecture](docs/ARCHITECTURE.md) - Layer definitions, data flow, and architectural principles.
- [Database Schema](docs/DATABASE_SCHEMA.md) - Complete table definitions, indexes, relations, and migrations.
- [API Design](docs/API_DESIGN.md) - REST API specification and request/response contracts.
- [Authentication & Security](docs/AUTH_DESIGN.md) - Token lifecycle, permissions, and security controls.
- [Coding Standards](docs/CODING_STANDARDS.md) - TypeScript guidelines, naming conventions, and design patterns.
- [Folder Structure](docs/FOLDER_STRUCTURE.md) - Modular project layout and code organization.
- [Deployment Guide](docs/DEPLOYMENT.md) - Instructions for hosting on Railway, Netlify, and Docker.
- [Security Policy](docs/SECURITY.md) - Vulnerability handling and operational safeguards.
- [Roadmap](docs/ROADMAP.md) - Upcoming milestones and planned enhancements.

---

## Contributing

Contributions, bug reports, and suggestions are welcome. Please read [CONTRIBUTING.md](CONTRIBUTING.md) for details on our code of conduct, branch conventions, and pull request workflow.

## License

This project is licensed under the Apache License 2.0. See the [LICENSE](LICENSE) file for details.

Copyright 2026 Moha Abshir.
