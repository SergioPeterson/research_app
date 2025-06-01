import { dbIsLocal, getLocalPool, getNeonClient } from "./db";

/**
 * This function is used to insert a user into the database
 * @param name - The name of the user
 * @param email - The email of the user
 * @param clerkId - The clerk id of the user
 * @returns The user object
 */
export async function insertUser({ clerkId, name, email }: { clerkId: string; name: string; email: string }) {
  if (dbIsLocal) {
    const pool = getLocalPool();
    const res = await pool.query(
      "INSERT INTO users (clerk_id, name, email) VALUES ($1, $2, $3) RETURNING *",
      [clerkId, name, email]
    );
    return res.rows[0];
  } else {
    const sql = getNeonClient();
    const res = await sql`
      INSERT INTO users (clerk_id, name, email)
      VALUES (${clerkId}, ${name}, ${email})
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
    if (res.rows.length === 0) {
      return null;
    }
    return res.rows[0];
  } else {
    const sql = getNeonClient();
    const res = await sql`SELECT * FROM users WHERE clerk_id = ${clerkId}`;
    if (res.length === 0) {
      return null;
    }
    return res[0];
  }
}

/**
 * This function is used to update a user by their clerk id
 * @param clerkId - The clerk id of the user
 * @param affiliations - The affiliations of the user
 * @param interests - The interests of the user
 * @param role - The role of the user
 * @param profileImage - The profile image of the user
 * @returns The user object
 */
export async function updateUser(clerkId: string, affiliations: string[], interests: string[], role: string, profileImage: string) {
  if (dbIsLocal) {
    const pool = getLocalPool();
    const res = await pool.query("UPDATE users SET affiliations = $1, interests = $2, role = $3, profile_image_url = $4 WHERE clerk_id = $5", [affiliations, interests, role, profileImage, clerkId]);
    return res.rows[0];
  } else {
    const sql = getNeonClient();
    const res = await sql`UPDATE users SET affiliations = ${affiliations}, interests = ${interests}, role = ${role}, profile_image_url = ${profileImage} WHERE clerk_id = ${clerkId}`;
    return res[0];
  }
}


/**
 * This function is used to delete a user by their clerk id
 * @param clerkId - The clerk id of the user
 * @returns The user object
 */
export async function deleteUser(clerkId: string) {
  if (dbIsLocal) {
    const pool = getLocalPool();
    const res = await pool.query("DELETE FROM users WHERE clerk_id = $1", [clerkId]);
    return res.rows[0];
  } else {
    const sql = getNeonClient();
    const res = await sql`DELETE FROM users WHERE clerk_id = ${clerkId}`;
    return res[0];
  }
}

/**
 * This function is used to add a liked paper by their clerk id and paper id
 * @param clerkId - The clerk id of the user
 * @param paperId - The paper id of the paper
 * @returns The user object
 */
export async function addLikedPaper(clerkId: string, paperId: string) {
  if (dbIsLocal) {
    const pool = getLocalPool();
    console.log("clerkId", clerkId);
    console.log("paperId", paperId);
    const res = await pool.query("INSERT INTO user_likes (user_id, paper_id) VALUES ($1, $2)", [clerkId, paperId]);
    return res.rows[0];
  } else {
    const sql = getNeonClient();
    const res = await sql`INSERT INTO user_likes (user_id, paper_id) VALUES (${clerkId}, ${paperId})`;
    return res[0];
  }
}

/**
 * This function is used to remove a liked paper by their clerk id and paper id
 * @param clerkId - The clerk id of the user
 * @param paperId - The paper id of the paper
 * @returns The user object
 */
export async function removeLikedPaper(clerkId: string, paperId: string) {
  if (dbIsLocal) {
    const pool = getLocalPool();
    const res = await pool.query("DELETE FROM user_likes WHERE user_id = $1 AND paper_id = $2", [clerkId, paperId]);
    return res.rows[0];
  } else {
    const sql = getNeonClient();
    const res = await sql`DELETE FROM user_likes WHERE user_id = ${clerkId} AND paper_id = ${paperId}`;
    return res[0];
  }
}

/**
 * This function is used to get all liked papers by their clerk id
 * @param clerkId - The clerk id of the user
 * @returns The liked papers object
 */
export async function getLikedPapers(clerkId: string) {
  if (dbIsLocal) {
    const pool = getLocalPool();
    const res = await pool.query("SELECT * FROM user_likes WHERE user_id = $1", [clerkId]);
    return res.rows;
  } else {
    const sql = getNeonClient();
    const res = await sql`SELECT * FROM user_likes WHERE user_id = ${clerkId}`;
    return res;
  }
}

/**
 * This function is used to add a saved paper by their clerk id and paper id
 * @param clerkId - The clerk id of the user
 * @param paperId - The paper id of the paper
 * @returns The user object
 */
export async function addSavePaper(clerkId: string, paperId: string) {
  if (dbIsLocal) {
    const pool = getLocalPool();
    const res = await pool.query("INSERT INTO user_saves (user_id, paper_id) VALUES ($1, $2)", [clerkId, paperId]);
    return res.rows[0];
  } else {
    const sql = getNeonClient();
    const res = await sql`INSERT INTO user_saves (user_id, paper_id) VALUES (${clerkId}, ${paperId})`;
    return res[0];
  }
}

/**
 * This function is used to remove a saved paper by their clerk id and paper id
 * @param clerkId - The clerk id of the user
 * @param paperId - The paper id of the paper
 * @returns The user object
 */
export async function removeSavePaper(clerkId: string, paperId: string) {
  if (dbIsLocal) {
    const pool = getLocalPool();
    const res = await pool.query("DELETE FROM user_saves WHERE user_id = $1 AND paper_id = $2", [clerkId, paperId]);
    return res.rows[0];
  } else {
    const sql = getNeonClient();
    const res = await sql`DELETE FROM user_saves WHERE user_id = ${clerkId} AND paper_id = ${paperId}`;
    return res[0];
  }
}

/**
 * This function is used to get all saved papers by their clerk id
 * @param clerkId - The clerk id of the user
 * @returns The saved papers object
 */
export async function getSavePaper(clerkId: string) {
  if (dbIsLocal) {
    const pool = getLocalPool();
    const res = await pool.query("SELECT * FROM user_saves WHERE user_id = $1", [clerkId]);
    return res.rows;
  } else {
    const sql = getNeonClient();
    const res = await sql`SELECT * FROM user_saves WHERE user_id = ${clerkId}`;
    return res;
  }
}
