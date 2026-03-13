import express from 'express';
import { Server } from 'socket.io';
import http from 'http';

function formatDate(timestamp) {
    const date = new Date(timestamp);
    return date.toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    });
}

function generateLayout(title, content, activeTab) {
    return `
        <!DOCTYPE html>
        <html>
            <head>
                <title>${title} - Receipt Dashboard</title>
                <script src="/socket.io/socket.io.js"></script>
                <style>
                    * { margin: 0; padding: 0; box-sizing: border-box; }

                    body {
                        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                        background: linear-gradient(135deg, #1a1a2e, #16213e);
                        color: #fff;
                        min-height: 100vh;
                    }

                    .header {
                        background: rgba(0, 0, 0, 0.3);
                        padding: 20px;
                        box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
                    }

                    .header h1 {
                        font-size: 24px;
                        margin-bottom: 20px;
                        color: #4caf50;
                    }

                    .tabs {
                        display: flex;
                        gap: 10px;
                        margin-bottom: 20px;
                    }

                    .tab {
                        padding: 10px 20px;
                        background: rgba(255, 255, 255, 0.1);
                        border: none;
                        border-radius: 5px;
                        color: #fff;
                        text-decoration: none;
                        cursor: pointer;
                        transition: all 0.3s;
                    }

                    .tab.active {
                        background: #4caf50;
                        color: #000;
                    }

                    .tab:hover:not(.active) {
                        background: rgba(255, 255, 255, 0.2);
                    }

                    .container {
                        max-width: 1200px;
                        margin: 0 auto;
                        padding: 30px 20px;
                    }

                    .receipts-grid {
                        display: grid;
                        grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
                        gap: 20px;
                        margin-top: 20px;
                    }

                    .receipt-card {
                        background: rgba(255, 255, 255, 0.1);
                        border-radius: 12px;
                        padding: 20px;
                        cursor: pointer;
                        transition: all 0.3s;
                        backdrop-filter: blur(10px);
                    }

                    .receipt-card:hover {
                        transform: translateY(-5px);
                        background: rgba(255, 255, 255, 0.15);
                        box-shadow: 0 5px 20px rgba(0, 0, 0, 0.3);
                    }

                    .receipt-info h3 {
                        font-size: 16px;
                        margin-bottom: 5px;
                        color: #4caf50;
                    }

                    .date {
                        font-size: 14px;
                        color: #aaa;
                        margin-bottom: 15px;
                    }

                    .qr-thumb {
                        text-align: center;
                    }

                    .qr-thumb img {
                        width: 100px;
                        height: 100px;
                        border-radius: 8px;
                    }

                    .receipt-detail {
                        max-width: 600px;
                        margin: 0 auto;
                        text-align: center;
                    }

                    .detail-header {
                        margin-bottom: 30px;
                        padding: 20px;
                        background: rgba(255, 255, 255, 0.1);
                        border-radius: 12px;
                    }

                    .detail-header h2 {
                        font-size: 28px;
                        margin-bottom: 15px;
                        color: #4caf50;
                    }

                    .receipt-id {
                        font-family: 'Courier New', monospace;
                        background: rgba(0, 0, 0, 0.3);
                        padding: 5px 10px;
                        border-radius: 4px;
                        display: inline-block;
                        margin: 10px 0;
                    }

                    .receipt-date {
                        color: #aaa;
                        font-size: 14px;
                    }

                    .qr-container {
                        margin: 30px 0;
                        padding: 30px;
                        background: rgba(255, 255, 255, 0.1);
                        border-radius: 12px;
                    }

                    .qr-container img {
                        width: 350px;
                        height: 350px;
                        border-radius: 12px;
                        margin-bottom: 15px;
                    }

                    .qr-container p {
                        color: #aaa;
                        font-size: 14px;
                    }

                    .actions {
                        display: flex;
                        gap: 15px;
                        justify-content: center;
                        flex-wrap: wrap;
                    }

                    .btn-download {
                        padding: 12px 24px;
                        background: #4caf50;
                        color: #000;
                        text-decoration: none;
                        border-radius: 6px;
                        font-weight: bold;
                        transition: all 0.3s;
                    }

                    .btn-download:hover {
                        background: #66bb6a;
                        transform: translateY(-2px);
                    }

                    .btn-back {
                        padding: 12px 24px;
                        background: rgba(255, 255, 255, 0.1);
                        color: #fff;
                        text-decoration: none;
                        border-radius: 6px;
                        transition: all 0.3s;
                    }

                    .btn-back:hover {
                        background: rgba(255, 255, 255, 0.2);
                    }

                    .empty {
                        text-align: center;
                        padding: 60px 20px;
                    }

                    .empty h2 {
                        color: #4caf50;
                        margin-bottom: 20px;
                    }

                    .empty p {
                        color: #aaa;
                        font-size: 16px;
                    }
                </style>
            </head>
            <body>
                <div class="header">
                    <h1>Receipt Dashboard</h1>
                    <div class="tabs">
                        <a href="/" class="tab ${activeTab === 'all' ? 'active' : ''}">All Receipts</a>
                        <a href="/latest" class="tab ${activeTab === 'latest' ? 'active' : ''}">Latest Receipt</a>
                    </div>
                </div>
                <div class="container">
                    ${content}
                </div>

                <script>
                    const socket = io();
                    socket.on('new-receipt', (data) => {
                        console.log("New receipt detected:", data.id);
                        // Auto-reload current page when new receipt arrives
                        setTimeout(() => window.location.reload(), 500);
                    });
                </script>
            </body>
        </html>
    `;
}

export function createApiServer(pool, RETRIEVAL_BASE_URL) {
    const app = express();
    const server = http.createServer(app);
    const io = new Server(server);

    // Serve static QR code images
    app.use('/qrcodes', express.static('qrcodes'));

    // Homepage - lists all receipts
    app.get('/', async (req, res) => {
        try {
            const result = await pool.query(
                'SELECT id, created_at FROM receipts ORDER BY created_at DESC'
            );

            const receipts = result.rows;

            if (receipts.length === 0) {
                const content = `
                    <div class="empty">
                        <h2>No Receipts Yet</h2>
                        <p>Send ESC/POS data to port 9100 to generate your first receipt.</p>
                    </div>
                `;
                return res.send(generateLayout('All Receipts', content, 'all'));
            }

            const receiptCards = receipts.map(receipt => {
                const date = formatDate(receipt.created_at);
                return `
                    <div class="receipt-card" onclick="window.location.href='/receipt/${receipt.id}/view'">
                        <div class="receipt-info">
                            <h3>${receipt.id.substring(0, 8)}...</h3>
                            <p class="date">${date}</p>
                        </div>
                        <div class="qr-thumb">
                            <img src="/qrcodes/${receipt.id}.png" alt="QR Code" />
                        </div>
                    </div>
                `;
            }).join('');

            const content = `
                <div class="receipts-grid">
                    ${receiptCards}
                </div>
            `;

            res.send(generateLayout('All Receipts', content, 'all'));
        } catch (err) {
            res.status(500).send("Error loading receipts: " + err.message);
        }
    });

    // Receipt detail view
    app.get('/receipt/:id/view', async (req, res) => {
        try {
            // Verify receipt exists and get metadata
            const result = await pool.query(
                'SELECT id, created_at FROM receipts WHERE id = $1',
                [req.params.id]
            );

            if (result.rows.length === 0) {
                const content = `
                    <div class="empty">
                        <h2>Receipt Not Found</h2>
                        <p>The requested receipt does not exist.</p>
                        <a href="/" class="btn-back">← Return to List</a>
                    </div>
                `;
                return res.status(404).send(generateLayout('Receipt Not Found', content, 'all'));
            }

            const receipt = result.rows[0];
            const date = formatDate(receipt.created_at);

            const content = `
                <div class="receipt-detail">
                    <div class="detail-header">
                        <h2>Receipt Details</h2>
                        <p class="receipt-id">ID: ${receipt.id}</p>
                        <p class="receipt-date">Created: ${date}</p>
                    </div>
                    <div class="qr-container">
                        <img src="/qrcodes/${receipt.id}.png" alt="QR Code" />
                        <p>Scan to view receipt</p>
                    </div>
                    <div class="actions">
                        <a href="/receipt/${receipt.id}" class="btn-download">Download Receipt Data</a>
                        <a href="/" class="btn-back">← Back to All Receipts</a>
                    </div>
                </div>
            `;

            res.send(generateLayout('Receipt Details', content, 'all'));
        } catch (err) {
            res.status(500).send("Error loading receipt: " + err.message);
        }
    });

    // Latest receipt page
    app.get('/latest', async (req, res) => {
        try {
            const result = await pool.query(
                'SELECT id, created_at FROM receipts ORDER BY created_at DESC LIMIT 1'
            );
            const latestId = result.rows.length > 0 ? result.rows[0].id : null;

            if (!latestId) {
                const content = `
                    <div class="empty">
                        <h2>No Receipts Yet</h2>
                        <p>Send ESC/POS data to port 9100 to generate your first receipt.</p>
                    </div>
                `;
                return res.send(generateLayout('Latest Receipt', content, 'latest'));
            }

            const receipt = result.rows[0];
            const date = formatDate(receipt.created_at);

            const content = `
                <div class="receipt-detail">
                    <div class="detail-header">
                        <h2>Latest Receipt</h2>
                        <p class="receipt-id">ID: ${receipt.id}</p>
                        <p class="receipt-date">Created: ${date}</p>
                    </div>
                    <div class="qr-container">
                        <img src="/qrcodes/${receipt.id}.png" alt="QR Code" />
                        <p>Scan to view receipt</p>
                    </div>
                    <div class="actions">
                        <a href="/receipt/${receipt.id}" class="btn-download">Download Receipt Data</a>
                        <a href="/" class="btn-back">← View All Receipts</a>
                    </div>
                </div>
            `;

            res.send(generateLayout('Latest Receipt', content, 'latest'));
        } catch (err) {
            res.status(500).send("Error loading latest receipt: " + err.message);
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
            res.status(500).send('Error');
        }
    });

    return { app, server, io };
}
