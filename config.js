import 'dotenv/config';
import pkg from 'pg';
const { Pool } = pkg;

const RETRIEVAL_BASE_URL = process.env.RETRIEVAL_BASE_URL;

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT || 5432,
});

const config = {
    PRINTER_PORT: 9100,  // Hardcoded - ESC/POS standard port
    API_PORT: process.env.API_PORT || 3000,
    RETRIEVAL_BASE_URL
};

export { config, pool, RETRIEVAL_BASE_URL };
