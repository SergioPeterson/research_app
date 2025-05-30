import { dbIsLocal, getLocalPool, getNeonClient } from "./db";

/**
 * This function is used to insert a user into the database
 * @param name - The name of the user
 * @param email - The email of the user
 * @param clerkId - The clerk id of the user
 * @returns The user object
 */
export async function insertUser({ name, email, clerkId }: { name: string; email: string; clerkId: string }) {
  if (dbIsLocal) {
    const pool = getLocalPool();
    const res = await pool.query(
      "INSERT INTO users (name, email, clerk_id) VALUES ($1, $2, $3) RETURNING *",
      [name, email, clerkId]
    );
    return res.rows[0];
  } else {
    const sql = getNeonClient();
    const res = await sql`
      INSERT INTO users (name, email, clerk_id)
      VALUES (${name}, ${email}, ${clerkId})
      RETURNING *;
    `;
    return res[0];
  }
}


/**
 * This function is used to get all users from the database
 * @returns The users object
 */
export async function getUsers() {
  if (dbIsLocal) {
    const pool = getLocalPool();
    const res = await pool.query("SELECT * FROM users");
    return res.rows;
  } else {
    const sql = getNeonClient();
    const res = await sql`SELECT * FROM users`;
    return res;
  }
}


/**
 * This function is used to get a user by their clerk id
 * @param clerkId - The clerk id of the user
 * @returns The user object
 */
export async function getUserByClerkId(clerkId: string) {
  if (dbIsLocal) {
    const pool = getLocalPool();
    const res = await pool.query("SELECT * FROM users WHERE clerk_id = $1", [clerkId]);
    return res.rows[0];
  } else {
    const sql = getNeonClient();
    const res = await sql`SELECT * FROM users WHERE clerk_id = ${clerkId}`;
    return res[0];
  }
}