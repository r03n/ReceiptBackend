# ReceiptBackend Agent Guidelines

This document provides instructions and guidelines for AI coding agents operating within the ReceiptBackend repository. It outlines the project's architecture, development workflows, code style, and testing procedures.

## 1. Project Overview & Architecture

ReceiptBackend is a Node.js application that simulates a virtual ESC/POS printer server over TCP. It captures print commands, stores raw binary receipt data in PostgreSQL, and provides a real-time web dashboard using Express and Socket.IO.

- **`app.js`**: Main entry point that orchestrates the servers.
- **`config.js`**: Central configuration, Environment Variable loading via `dotenv`, and Postgres Connection Pool.
- **`printer-server.js`**: TCP server listening on port 9100. Buffers ESC/POS data and detects the cut command (`0x1D 0x56`) to finalize receipt saving.
- **`api-server.js`**: Express server on port 3000. Serves static files, JSON APIs (`/api/receipts`), and binary downloads.
- **`public/`**: Vanilla JavaScript SPA (Single Page Application) frontend communicating with the Express backend.

## 2. Build, Run, and Test Commands

### Setup and Running
- **Install dependencies**: `npm install`
- **Run the full application**: `npm start` (Starts both TCP 9100 and HTTP 3000)
- **Environment variables**: Must be configured in `.env` based on `.env.example`. Required vars: `DB_USER`, `DB_PASSWORD`, `DB_NAME`, `DB_HOST`, `DB_PORT`, `RETRIEVAL_BASE_URL`. `API_PORT` is optional (defaults to 3000), and `PRINTER_PORT` is hardcoded to 9100.

### Testing Procedures
Currently, the application relies on manual integration testing scripts rather than a unit testing framework (like Jest or Mocha). When instructed to "run a single test" or verify functionality:
- **Test TCP Server (Receipt Print Simulation)**:
  Create or run a temporary Node script (e.g., `test-printer.js`) that opens a TCP socket to `127.0.0.1:9100`, writes ESC/POS buffer data (including `[0x1D, 0x56]`), and closes the connection.
- **Test API Endpoints**:
  Use `curl` or `fetch` against `http://localhost:3000/api/receipts` to verify data ingestion.
- **Verifying Database**:
  Check Postgres directly: `psql -U printer_user -d printer_db -c "SELECT id FROM receipts ORDER BY created_at DESC LIMIT 1;"`

## 3. Code Style Guidelines

### Language & Module System
- **ES Modules (ESM)**: The project strictly uses ES modules. Use `import` and `export` statements. Do not use `require()` or `module.exports`.
- **Vanilla JS**: The backend is plain JavaScript. TypeScript is not used. Do not attempt to introduce TypeScript files (`.ts`) or syntax unless explicitly requested. JSDoc comments are encouraged for complex function signatures.

### Formatting & Syntax
- **Indentation**: 4 spaces for backend files (Node.js), 4 spaces for HTML/CSS/JS frontend files.
- **Quotes**: Single quotes (`'`) preferred for strings in JavaScript, double quotes (`"`) for HTML attributes.
- **Semicolons**: Always use trailing semicolons.
- **Variable Declarations**: Prefer `const` over `let`. Never use `var`.

### Naming Conventions
- **Files/Folders**: `kebab-case` (e.g., `printer-server.js`, `api-server.js`).
- **Variables & Functions**: `camelCase` (e.g., `saveReceipt`, `createApiServer`, `bufferList`).
- **Constants/Globals**: `UPPER_SNAKE_CASE` for environment variables and hardcoded system-wide constants (e.g., `RETRIEVAL_BASE_URL`, `PRINTER_PORT`).
- **Database Tables/Columns**: `snake_case` (e.g., `receipts`, `raw_bin`, `created_at`).

### Error Handling
- **Async/Await**: Use `try/catch` blocks around all `await` calls. Avoid raw `.then().catch()` chains unless absolutely necessary.
- **Logging**: Log errors using `console.error()`. Include descriptive context (e.g., `console.error('❌ Error saving receipt:', err);`).
- **API Responses**: For HTTP endpoints, always return standard JSON error objects upon failure along with appropriate HTTP status codes:
  ```javascript
  try {
      // logic
  } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Descriptive error message: " + err.message });
  }
  ```
- **Process Boundaries**: Do not allow unhandled promise rejections or uncaught exceptions to crash the server without logging. `app.js` handles `SIGINT` for graceful shutdowns.

### Database Interaction (PostgreSQL)
- **Library**: `pg` (node-postgres).
- **Pooling**: Always use the shared connection `pool` exported from `config.js`. Do not instantiate new Clients per request.
- **Prepared Statements**: Always use parameterized queries (`$1`, `$2`) to prevent SQL injection.
  - *Correct*: `pool.query('SELECT * FROM receipts WHERE id = $1', [req.params.id])`
  - *Incorrect*: `pool.query(\`SELECT * FROM receipts WHERE id = \${id}\`)`

### Frontend Architecture (public/)
- **SPA Approach**: The frontend in `public/` is a Single Page Application using vanilla JavaScript.
- **State Management**: Managed via a global `app` object in `public/app.js`.
- **Routing**: Client-side hash routing (`#latest`, `#receipt/:id`) handled by `window.addEventListener('hashchange', ...)`.
- **Templates**: HTML fragments are stored in `<template>` tags within `index.html` and hydrated using JavaScript string replacements. Avoid complex template literals in JS files; pull from the DOM instead.
- **Real-time**: Socket.IO is used to emit `new-receipt` events from the TCP server to the Express server, triggering `window.location.reload()` or DOM updates in the frontend.

### Component/Feature Implementation Steps
When implementing new features:
1. **Database Schema**: Check if database schema modifications are required. Provide raw SQL commands for the user to run if migrations are needed.
2. **Backend Logic**: Implement in the correct server module (`printer-server.js` for ingestion, `api-server.js` for data serving).
3. **Frontend Implementation**: Add HTML templates to `index.html`, style in `styles.css`, and add logic to `app.js`. Keep styles matching the dark mode (Soft Blues & Teals) aesthetic.
4. **Integration**: Ensure TCP and API layers communicate seamlessly via the Postgres database and Socket.IO events.