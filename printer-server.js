import net from 'net';
import { v4 as uuidv4 } from 'uuid';
import QRCode from 'qrcode';
import fs from 'fs';
import path from 'path';

export function createPrinterServer(io, pool, RETRIEVAL_BASE_URL) {
    const printerServer = net.createServer((socket) => {
        let bufferList = [];
        let isProcessed = false;

        const saveReceipt = async () => {
            if (isProcessed || bufferList.length === 0) return;
            isProcessed = true;

            const rawData = Buffer.concat(bufferList);
            const receiptId = uuidv4();

            try {
                await pool.query('INSERT INTO receipts (id, raw_bin) VALUES ($1, $2)', [receiptId, rawData]);

                const qrDir = './qrcodes';
                if (!fs.existsSync(qrDir)) fs.mkdirSync(qrDir);

                const qrPath = path.join(qrDir, `${receiptId}.png`);
                await QRCode.toFile(qrPath, `${RETRIEVAL_BASE_URL}${receiptId}`);

                console.log(`⚡ Saved: ${receiptId}`);

                // Emit Socket.IO event for real-time updates
                io.emit('new-receipt', { id: receiptId });

            } catch (err) {
                console.error('❌ Error:', err);
            }
        };

        socket.on('data', (chunk) => {
            bufferList.push(chunk);
            // Cut detection for speed
            for (let i = 0; i < chunk.length - 1; i++) {
                if (chunk[i] === 0x1D && chunk[i+1] === 0x56) {
                    saveReceipt();
                    break;
                }
            }
        });

        socket.on('end', () => saveReceipt());
    });

    return printerServer;
}
