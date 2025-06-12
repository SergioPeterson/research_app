import { neon } from "@neondatabase/serverless";
import { Pool } from "pg";

const isLocal = process.env.USE_LOCAL_DATABASE === "true";

// Connection pool configuration
const poolConfig = {
  max: 20, // Maximum number of clients in the pool
  idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
  connectionTimeoutMillis: 2000, // Return an error after 2 seconds if connection could not be established
  maxUses: 7500, // Close a connection after it has been used 7500 times
};

export const getLocalPool = () =>
  new Pool({
    ...poolConfig,
    user: process.env.LOCAL_PGUSER,
    host: process.env.LOCAL_PGHOST,
    database: process.env.LOCAL_PGDATABASE,
    password: process.env.LOCAL_PGPASSWORD,
    port: Number(process.env.LOCAL_PGPORT) || 5432,
  });

// Neon client with connection pooling
export const getNeonClient = () => {
  const client = neon(process.env.DATABASE_URL!);
  return client;
};

export const dbIsLocal = isLocal;

// Graceful shutdown
process.on('SIGINT', async () => {
  const pool = getLocalPool();
  await pool.end();
  process.exit(0);
});

// console.log("isLocal", isLocal);