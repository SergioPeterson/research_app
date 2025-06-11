import { dbIsLocal, getLocalPool, getNeonClient } from "./db";

/**
 * 
 * simple recommendation system, it will just use the users last 5 liked papers' categories to find similar papers
 * Get personalized paper recommendations for a user based on their interests and liked papers
 * If the user has no likes, returns random papers
 * @param userId - The user's Clerk ID
 * @returns Array of recommended papers with full paper information
 */
export async function getRecommendations(userId: string) {
    if (dbIsLocal) {
        const pool = getLocalPool();
        // First check if user has any likes
        const userLikesCheck = await pool.query(
            'SELECT COUNT(*) FROM user_likes WHERE user_id = $1',
            [userId]
        );
        
        if (userLikesCheck.rows[0].count === '0') {
            // If no likes, return random papers
            const randomPapers = await pool.query(`
                SELECT * FROM arxiv_papers 
                ORDER BY RANDOM() 
                LIMIT 5
            `);
            return randomPapers.rows;
        }

        const res = await pool.query(`
            WITH user_liked_papers AS (
                SELECT p.paper_id, p.category
                FROM user_likes ul
                JOIN arxiv_papers p ON ul.paper_id = p.paper_id
                WHERE ul.user_id = $1
                LIMIT 5
            ),
            user_categories AS (
                SELECT DISTINCT category 
                FROM user_liked_papers
            )
            SELECT DISTINCT p.*, RANDOM() as random_order
            FROM arxiv_papers p
            WHERE p.category IN (SELECT category FROM user_categories)
            AND p.paper_id NOT IN (SELECT paper_id FROM user_liked_papers)
            ORDER BY random_order
            LIMIT 5
        `, [userId]);
        return res.rows.map(row => {
            const { random_order, ...paper } = row;
            return paper;
        });
    } else {
        const sql = getNeonClient();
        // First check if user has any likes
        const userLikesCheck = await sql`
            SELECT COUNT(*) FROM user_likes WHERE user_id = ${userId}
        `;
        
        if (userLikesCheck[0].count === 0) {
            // If no likes, return random papers
            const randomPapers = await sql`
                SELECT * FROM arxiv_papers 
                ORDER BY RANDOM() 
                LIMIT 5
            `;
            return randomPapers;
        }

        const res = await sql`
            WITH user_liked_papers AS (
                SELECT p.paper_id, p.category
                FROM user_likes ul
                JOIN arxiv_papers p ON ul.paper_id = p.paper_id
                WHERE ul.user_id = ${userId}
                LIMIT 5
            ),
            user_categories AS (
                SELECT DISTINCT category 
                FROM user_liked_papers
            )
            SELECT DISTINCT p.*, RANDOM() as random_order
            FROM arxiv_papers p
            WHERE p.category IN (SELECT category FROM user_categories)
            AND p.paper_id NOT IN (SELECT paper_id FROM user_liked_papers)
            ORDER BY random_order
            LIMIT 5
        `;
        return res.map(row => {
            const { random_order, ...paper } = row;
            return paper;
        });
    }
}