import { dbIsLocal, getLocalPool, getNeonClient } from "./db";


export async function getPaper(paperId: string) {
    if (dbIsLocal) {
        const pool = getLocalPool();
        // console.log("paperId in getPaper:", paperId);
        const res = await pool.query(`
            SELECT a.*, 
                   i.summary, 
                   i.keywords, 
                   i.organizations
            FROM arxiv_papers a
            LEFT JOIN paper_inference i ON a.paper_id = i.paper_id
            WHERE a.paper_id = $1
        `, [paperId]);
        // console.log("res in getPaper:", res.rows);
        return res.rows[0];
    } else {
        const sql = getNeonClient();
        const res = await sql`
            SELECT a.*, 
                   i.summary, 
                   i.keywords, 
                   i.organizations
            FROM arxiv_papers a
            LEFT JOIN paper_inference i ON a.paper_id = i.paper_id
            WHERE a.paper_id = ${paperId}
        `;
        return res[0];
    }
}

export async function papers() {
    if (dbIsLocal) {
        const pool = getLocalPool();
        const res = await pool.query(`
            SELECT a.*, 
                   i.summary, 
                   i.keywords, 
                   i.organizations
            FROM arxiv_papers a
            LEFT JOIN paper_inference i ON a.paper_id = i.paper_id
            ORDER BY a.id DESC 
            LIMIT 10
        `);
        return res.rows;
    } else {
        const sql = getNeonClient();
        const res = await sql`
            SELECT a.*, 
                   i.summary, 
                   i.keywords, 
                   i.organizations
            FROM arxiv_papers a
            LEFT JOIN paper_inference i ON a.paper_id = i.paper_id
            ORDER BY a.id DESC 
            LIMIT 10
        `;
        return res;
    }
}