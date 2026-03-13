# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

ReceiptBackend is a Node.js application that simulates a virtual ESC/POS printer server. It accepts printer data over TCP, stores receipts in PostgreSQL, and provides a web dashboard for real-time receipt viewing with QR code generation.

## System Setup

### Initial System Installation
```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y postgresql postgresql-contrib nodejs npm
```

### Database Setup
```bash
sudo -u postgres psql
```

```sql
-- Create database
CREATE DATABASE printer_db;

-- Connect to database
\c printer_db

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create receipts table
CREATE TABLE receipts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    raw_bin BYTEA NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create user
CREATE USER printer_user WITH PASSWORD 'your_password';

-- Grant permissions
GRANT ALL PRIVILEGES ON TABLE receipts TO printer_user;

-- Exit
\q
```

### Environment Setup
```bash
# Install dependencies
npm install

# Copy environment template
cp .env.example .env

# Update .env with your configuration (database password, ngrok URL, etc.)
```

## Common Commands

### Installation
```bash
npm install
```

### Run the Application
```bash
npm start
```

The application runs on two ports:
- **9100**: Virtual printer TCP server (accepts ESC/POS data)
- **3000**: Web API dashboard

## Modular Architecture

The application is now modular with clear separation of concerns:

```
ReceiptBackend/
├── app.js                      # Main entry point (866 bytes)
├── config.js                   # Central configuration (528 bytes)
├── printer-server.js           # TCP printer server (1657 bytes)
├── api-server.js               # Express API and Socket.IO (3275 bytes)
├── package.json
├── .env
├── .env.example
├── .gitignore
└── CLAUDE.md
```

### Module Responsibilities

**config.js** - Central Configuration
- Loads environment variables via dotenv
- Initializes PostgreSQL connection pool
- Exports shared configuration and resources

**printer-server.js** - TCP Printer Server
- Creates TCP server on port 9100
- Handles ESC/POS printer data
- Detects print commands (cut detection: 0x1D 0x56)
- Saves receipts to database
- Generates QR codes
- Emits Socket.IO events

**api-server.js** - Web API & Dashboard
- Express.js application with HTTP server
- Socket.IO for real-time communication
- Dashboard endpoint (`/latest`) with live updates
- Binary download endpoint (`/receipt/:id`)
- Static file serving for QR codes

**app.js** - Main Entry Point
- Imports and configures all modules
- Starts both servers
- Handles graceful shutdown
- Manages shared resources (io instance)

## Environment Variables

Configuration is managed through environment variables (see `.env` file):

- `API_PORT`: Web API port (default: 3000)
- `DB_HOST`: PostgreSQL host (default: localhost)
- `DB_PORT`: PostgreSQL port (default: 5432)
- `DB_USER`: PostgreSQL username
- `DB_PASSWORD`: PostgreSQL password
- `DB_NAME`: Database name
- `RETRIEVAL_BASE_URL`: Base URL for QR code generation (e.g., ngrok URL)

Example `.env`:
```bash
API_PORT=3000
DB_HOST=localhost
DB_PORT=5432
DB_USER=printer_user
DB_PASSWORD=your_password_here
DB_NAME=printer_db
RETRIEVAL_BASE_URL=https://your-ngrok-url.ngrok-free.dev/receipt/
```

**Note**: `PRINTER_PORT` is hardcoded to 9100 (ESC/POS standard port) and cannot be changed via environment variables.

## Architecture

### Single-File Architecture
The entire application is contained in `https.js` with three integrated servers:

1. **TCP Printer Server** (lines 29-73)
   - Listens on port 9100
   - Accepts ESC/POS printer data
   - Detects print commands (0x1D 0x56) to trigger receipt capture
   - Stores receipt data in PostgreSQL

2. **Express/HTTP Server** (lines 75-136)
   - `/latest`: Serves live receipt dashboard with HTML embedded in JS
   - `/receipt/:id`: Binary download endpoint for receipt data
   - `/qrcodes`: Static file serving for generated QR codes

3. **Socket.IO Server** (line 27)
   - Real-time communication between server and dashboard
   - Emits `new-receipt` events when receipts are processed
   - Triggers automatic dashboard refresh

### Data Flow
1. ESC/POS data arrives via TCP on port 9100
2. TCP server buffers data and detects print commands (cut detection: 0x1D 0x56)
3. On print completion: generates UUID, stores binary data to PostgreSQL
4. Generates QR code for receipt retrieval URL
5. Socket.IO emits event to connected dashboard clients
6. Dashboard auto-refreshes to show latest receipt with QR code

### PostgreSQL Schema
Required table:
```sql
CREATE TABLE receipts (
    id VARCHAR PRIMARY KEY,
    raw_bin BYTEA,
    created_at TIMESTAMP DEFAULT NOW()
);
```

### Hardcoded Configuration
Currently hardcoded in https.js:
- `PRINTER_PORT`: 9100
- `API_PORT`: 3000
- `RETRIEVAL_BASE_URL`: Ngrok URL for QR code generation
- PostgreSQL connection: user, host, database, password, port

## Dependencies

- **dotenv**: Environment variable management (^17.3.1)
- **express**: Web framework (^5.2.1)
- **pg**: PostgreSQL client (^8.11.0)
- **qrcode**: QR code generation (^1.5.3)
- **socket.io**: Real-time WebSocket (^4.8.3)
- **uuid**: UUID generation (^9.0.0)

## Testing

### Run the Application
```bash
npm start
```

You should see:
```
🚀 Printer: 9100
🌐 Dashboard: http://localhost:3000/latest
```

### Test Receipt Processing
1. Send ESC/POS data to TCP port 9100
2. Verify receipt is saved to database
3. Check QR code is generated in ./qrcodes/
4. Verify dashboard auto-refreshes with new receipt
5. Test binary download: http://localhost:3000/receipt/{id}

### Module Testing
Each module can be tested independently:
- **config.js**: Verify environment variables load correctly
- **printer-server.js**: Test TCP server without starting API
- **api-server.js**: Test API routes without printer server

## Database Setup

Before running the application, ensure PostgreSQL is running and the `printer_db` database exists with the `receipts` table created. Configure credentials in `.env` file.

Connection credentials are managed via environment variables loaded by config.js and shared across all modules.
