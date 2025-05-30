import { neon } from "@neondatabase/serverless";
import { Pool } from "pg";

const isLocal = process.env.USE_LOCAL_DATABASE === "true";

export const getLocalPool = () =>
  new Pool({
    user: process.env.LOCAL_PGUSER,
    host: process.env.LOCAL_PGHOST,
    database: process.env.LOCAL_PGDATABASE,
    password: process.env.LOCAL_PGPASSWORD,
    port: Number(process.env.LOCAL_PGPORT) || 5432,
  });

export const getNeonClient = () => neon(process.env.DATABASE_URL!);
export const dbIsLocal = isLocal;