import os
import dotenv
import psycopg2
import psycopg2.extras
from typing import List, Dict

dotenv.load_dotenv()


class ArxivDB:
    def __init__(self, local: bool = True):
        if local:
            db_params = {
                "dbname": os.getenv("LOCAL_PGDATABASE"),
                "user": os.getenv("LOCAL_PGUSER"),
                "password": os.getenv("LOCAL_PGPASSWORD"),
                "host": os.getenv("LOCAL_PGHOST"),
                "port": os.getenv("LOCAL_PGPORT", "5432"),
            }
            self.conn = psycopg2.connect(**db_params)
        else:
            database_url = os.getenv("DATABASE_URL")
            if not database_url:
                raise RuntimeError("DATABASE_URL is not set in environment")
            # strip trailing percent or whitespace if present
            database_url = database_url.rstrip("% \t\n\r")
            self.conn = psycopg2.connect(database_url)

        self.cursor = self.conn.cursor(cursor_factory=psycopg2.extras.DictCursor)

    def update_recommendations(self, top_n: int = 10) -> List[Dict]:
        """
        For each user, build a simple content‐based recommendation list:
        1. Fetch the user’s interests (users.interests array) and the set of paper_ids they’ve liked.
        2. Fetch each liked paper’s category and AI-inferred keywords.
        3. For all papers NOT already liked, compute a “score” based on how many of:
           - user interests
           - liked‐paper categories
           - AI‐inferred keywords
           overlap with the candidate paper’s (category + inference.keywords).
        4. Take the top_n highest‐scoring candidates, and upsert them into `recommendations`.
        Returns a list of dicts: [{ user_id, paper_ids, updated_at }, …]
        """

        # 1) Fetch all users and their interests
        self.cursor.execute(
            "SELECT clerk_id, interests FROM users"
        )
        users = self.cursor.fetchall()  # list of {'clerk_id': ..., 'interests': [...]}

        # 2) Pre‐fetch inference data for all papers
        self.cursor.execute(
            """
            SELECT paper_id, keywords, organizations
            FROM paper_inference
            """
        )
        inference_rows = self.cursor.fetchall()
        # Map: paper_id -> set of inference keywords
        inference_map = {
            row["paper_id"]: set(row["keywords"] or [])
            for row in inference_rows
        }

        # 3) Pre‐fetch each paper’s category as well
        self.cursor.execute(
            "SELECT paper_id, category FROM arxiv_papers"
        )
        paper_category_rows = self.cursor.fetchall()
        # Map: paper_id -> category
        category_map = {row["paper_id"]: row["category"] for row in paper_category_rows}

        updated_list = []

        for user in users:
            user_id: str = user["clerk_id"]
            user_interests = set(user["interests"] or [])

            # 4) Fetch the set of paper_ids this user has already liked
            self.cursor.execute(
                "SELECT paper_id FROM user_likes WHERE user_id = %s", (user_id,)
            )
            liked_rows = self.cursor.fetchall()
            liked_paper_ids = {row["paper_id"] for row in liked_rows}

            # 5) Gather all “seed” categories/keywords from liked papers
            seed_categories = set()
            seed_keywords = set()

            for pid in liked_paper_ids:
                if pid in category_map:
                    seed_categories.add(category_map[pid])
                if pid in inference_map:
                    seed_keywords.update(inference_map[pid])

            # 6) Build a candidate list: all papers not already liked
            self.cursor.execute(
                """
                SELECT paper_id
                FROM arxiv_papers
                WHERE paper_id NOT IN (
                    SELECT paper_id FROM user_likes WHERE user_id = %s
                )
                """,
                (user_id,),
            )
            candidate_rows = self.cursor.fetchall()
            candidate_ids = [row["paper_id"] for row in candidate_rows]

            # 7) Score each candidate by overlap
            scores = []
            for pid in candidate_ids:
                score = 0
                # Match user interests against this paper’s category
                paper_cat = category_map.get(pid)
                if paper_cat and paper_cat in user_interests:
                    score += 3

                # Match seed categories
                if paper_cat and paper_cat in seed_categories:
                    score += 2

                # Match seed keywords against this paper’s inference keywords
                candidate_keywords = inference_map.get(pid, set())
                common_kw = candidate_keywords.intersection(seed_keywords)
                score += len(common_kw)

                # Also match user interests vs. inference keywords
                common_interest_kw = candidate_keywords.intersection(user_interests)
                score += len(common_interest_kw)

                if score > 0:
                    scores.append((pid, score))

            # 8) Take top_n by score descending
            scores.sort(key=lambda x: x[1], reverse=True)
            top_pids = [pid for pid, _ in scores[:top_n]]

            # 9) Upsert into recommendations
            upsert_sql = """
                INSERT INTO recommendations (user_id, paper_ids, updated_at)
                VALUES (%s, %s, NOW())
                ON CONFLICT (user_id) DO UPDATE
                  SET paper_ids = EXCLUDED.paper_ids,
                      updated_at = EXCLUDED.updated_at;
            """
            self.cursor.execute(upsert_sql, (user_id, top_pids))
            self.conn.commit()

            updated_list.append({
                "user_id": user_id,
                "paper_ids": top_pids,
            })

        return updated_list


if __name__ == "__main__":
    db = ArxivDB(local=True)
    results = db.update_recommendations(top_n=5)
    for r in results:
        print(f"User {r['user_id']} → recommended: {r['paper_ids']}")