import { dbIsLocal, getLocalPool, getNeonClient } from "./db";

/**
 * Get personalized paper recommendations for a user based on their interests and liked papers
 * @param userId - The user's Clerk ID
 * @returns Array of recommended papers
 */
export async function getRecommendations(userId: string) {
    if (dbIsLocal) {
        const pool = getLocalPool();
        const res = await pool.query(`
            WITH user_data AS (
                -- Get user's interests and liked papers
                SELECT 
                    u.clerk_id,
                    u.interests AS user_interests,
                    ARRAY_AGG(ul.paper_id) FILTER (WHERE ul.paper_id IS NOT NULL) AS liked_papers
                FROM users u
                LEFT JOIN user_likes ul ON u.clerk_id = ul.user_id
                WHERE u.clerk_id = $1
                GROUP BY u.clerk_id, u.interests
            ),
            seed_data AS (
                -- Extract categories and keywords from user's liked papers
                SELECT 
                    ARRAY_AGG(DISTINCT a.category) FILTER (WHERE a.category IS NOT NULL) AS seed_categories,
                    ARRAY_AGG(DISTINCT k.keyword) FILTER (WHERE k.keyword IS NOT NULL) AS seed_keywords
                FROM user_data ud
                JOIN arxiv_papers a ON a.paper_id = ANY(ud.liked_papers)
                LEFT JOIN paper_inference i ON a.paper_id = i.paper_id
                LEFT JOIN LATERAL unnest(i.keywords) AS k(keyword) ON true
            ),
            candidate_scores AS (
                -- Score each candidate paper
                SELECT 
                    a.*,
                    i.summary,
                    i.keywords,
                    i.organizations,
                    (
                        -- Category match with user interests (2 points)
                        CASE WHEN a.category = ANY(ud.user_interests) THEN 2 ELSE 0 END +
                        -- Category match with seed categories (1 point)
                        CASE WHEN a.category = ANY(sd.seed_categories) THEN 1 ELSE 0 END +
                        -- Keyword overlap with user interests (1 point per match)
                        (
                            SELECT COUNT(*) 
                            FROM unnest(i.keywords) k 
                            WHERE k = ANY(ud.user_interests)
                        ) +
                        -- Keyword overlap with seed keywords (0.5 points per match)
                        (
                            SELECT COUNT(*) * 0.5
                            FROM unnest(i.keywords) k 
                            WHERE k = ANY(sd.seed_keywords)
                        )
                    ) as score
                FROM arxiv_papers a
                LEFT JOIN paper_inference i ON a.paper_id = i.paper_id
                CROSS JOIN user_data ud
                CROSS JOIN seed_data sd
                WHERE a.paper_id != ALL(ud.liked_papers)  -- Exclude already liked papers
            )
            SELECT * FROM candidate_scores
            ORDER BY score DESC
            LIMIT 10;
        `, [userId]);
        return res.rows;
    } else {
        const sql = getNeonClient();
        const res = await sql`
            WITH user_data AS (
                -- Get user's interests and liked papers
                SELECT 
                    u.clerk_id,
                    u.interests AS user_interests,
                    ARRAY_AGG(ul.paper_id) FILTER (WHERE ul.paper_id IS NOT NULL) AS liked_papers
                FROM users u
                LEFT JOIN user_likes ul ON u.clerk_id = ul.user_id
                WHERE u.clerk_id = ${userId}
                GROUP BY u.clerk_id, u.interests
            ),
            seed_data AS (
                -- Extract categories and keywords from user's liked papers
                SELECT 
                    ARRAY_AGG(DISTINCT a.category) FILTER (WHERE a.category IS NOT NULL) AS seed_categories,
                    ARRAY_AGG(DISTINCT k.keyword) FILTER (WHERE k.keyword IS NOT NULL) AS seed_keywords
                FROM user_data ud
                JOIN arxiv_papers a ON a.paper_id = ANY(ud.liked_papers)
                LEFT JOIN paper_inference i ON a.paper_id = i.paper_id
                LEFT JOIN LATERAL unnest(i.keywords) AS k(keyword) ON true
            ),
            candidate_scores AS (
                -- Score each candidate paper
                SELECT 
                    a.*,
                    i.summary,
                    i.keywords,
                    i.organizations,
                    (
                        -- Category match with user interests (2 points)
                        CASE WHEN a.category = ANY(ud.user_interests) THEN 2 ELSE 0 END +
                        -- Category match with seed categories (1 point)
                        CASE WHEN a.category = ANY(sd.seed_categories) THEN 1 ELSE 0 END +
                        -- Keyword overlap with user interests (1 point per match)
                        (
                            SELECT COUNT(*) 
                            FROM unnest(i.keywords) k 
                            WHERE k = ANY(ud.user_interests)
                        ) +
                        -- Keyword overlap with seed keywords (0.5 points per match)
                        (
                            SELECT COUNT(*) * 0.5
                            FROM unnest(i.keywords) k 
                            WHERE k = ANY(sd.seed_keywords)
                        )
                    ) as score
                FROM arxiv_papers a
                LEFT JOIN paper_inference i ON a.paper_id = i.paper_id
                CROSS JOIN user_data ud
                CROSS JOIN seed_data sd
                WHERE a.paper_id != ALL(ud.liked_papers)  -- Exclude already liked papers
            )
            SELECT * FROM candidate_scores
            ORDER BY score DESC
            LIMIT 10;
        `;
        return res;
    }
}