import express from 'express';
import { Server } from 'socket.io';
import http from 'http';
import path from 'path';

export function createApiServer(pool, RETRIEVAL_BASE_URL) {
    const app = express();
    const server = http.createServer(app);
    const io = new Server(server);

    const __dirname = path.resolve();

    // Serve static files from the public directory
    app.use(express.static(path.join(__dirname, 'public')));
    app.use('/qrcodes', express.static(path.join(__dirname, 'qrcodes')));

    // API: Get all receipts
    app.get('/api/receipts', async (req, res) => {
        try {
            const result = await pool.query(
                'SELECT id, created_at FROM receipts ORDER BY created_at DESC'
            );
            res.json(result.rows);
        } catch (err) {
            console.error(err);
            res.status(500).json({ error: "Error loading receipts: " + err.message });
        }
    });

    // API: Get latest receipt
    app.get('/api/receipts/latest', async (req, res) => {
        try {
            const result = await pool.query(
                'SELECT id, created_at FROM receipts ORDER BY created_at DESC LIMIT 1'
            );
            if (result.rows.length === 0) {
                return res.json({ empty: true });
            }
            res.json(result.rows[0]);
        } catch (err) {
            console.error(err);
            res.status(500).json({ error: "Error loading latest receipt: " + err.message });
        }
    });

    // API: Get specific receipt detail
    app.get('/api/receipts/:id', async (req, res) => {
        try {
            const result = await pool.query(
                'SELECT id, created_at FROM receipts WHERE id = $1',
                [req.params.id]
            );
            if (result.rows.length === 0) {
                return res.status(404).json({ error: 'Receipt Not Found' });
            }
            res.json(result.rows[0]);
        } catch (err) {
            console.error(err);
            res.status(500).json({ error: "Error loading receipt: " + err.message });
        }
    });

    // Binary Download Endpoint
    app.get('/receipt/:id', async (req, res) => {
        try {
            const result = await pool.query('SELECT raw_bin FROM receipts WHERE id = $1', [req.params.id]);
            if (result.rows.length > 0) {
                res.setHeader('Content-Type', 'application/octet-stream');
                res.send(result.rows[0].raw_bin);
            } else {
                res.status(404).send('Not found');
            }
        } catch (err) {
            console.error(err);
            res.status(500).send('Error');
        }
    });

    // SPA Catch-all: Route everything else to index.html
    app.get('*', (req, res, next) => {
        // Exclude /api paths from catch-all to properly return 404s for API requests
        if (req.path.startsWith('/api/') || req.path.startsWith('/receipt/')) {
            return next();
        }
        res.sendFile(path.join(__dirname, 'public', 'index.html'));
    });

    return { app, server, io };
}