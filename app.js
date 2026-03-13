import { createPrinterServer } from './printer-server.js';
import { createApiServer } from './api-server.js';
import { config, pool, RETRIEVAL_BASE_URL } from './config.js';

// Create API server and get io instance
const { app, server, io } = createApiServer(pool, RETRIEVAL_BASE_URL);

// Create printer server with io instance
const printerServer = createPrinterServer(io, pool, RETRIEVAL_BASE_URL);

// Start servers
printerServer.listen(config.PRINTER_PORT, '0.0.0.0', () => {
    console.log(`🚀 Printer: ${config.PRINTER_PORT}`);
});

server.listen(config.API_PORT, '0.0.0.0', () => {
    console.log(`🌐 Dashboard: http://localhost:${config.API_PORT}/latest`);
});

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('\nShutting down gracefully...');
    printerServer.close();
    server.close();
    pool.end();
    process.exit(0);
});
