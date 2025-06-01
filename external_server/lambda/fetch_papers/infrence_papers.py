import os
import json
import re
import urllib.request as libreq
import xml.etree.ElementTree as ET
import pymupdf
import dotenv
import psycopg2
import psycopg2.extras
from datetime import datetime, timedelta
from google import genai
from google.genai import types  # for GenerateContentConfig

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

    def paper_inference_exists(self, paper_id: str) -> bool:
        """Check if a paper has already been inferred"""
        check_sql = "SELECT EXISTS(SELECT 1 FROM paper_inference WHERE paper_id = %s)"
        self.cursor.execute(check_sql, (paper_id,))
        return self.cursor.fetchone()[0]

    def insert_paper(self, paper: dict):
        """
        Insert (or update) a row into paper_inference. Expects keys:
          - paper_id (str)
          - summary   (str or None)
          - keywords  (list[str])
          - organizations (list[str])
        """
        if self.paper_inference_exists(paper["paper_id"]):
            print(f"Paper {paper['paper_id']} has already been inferred, skipping...")
            return

        insert_inference_sql = """
          INSERT INTO paper_inference (
            paper_id,
            summary,
            keywords,
            organizations
          ) VALUES (
            %(paper_id)s,
            %(summary)s,
            %(keywords)s,
            %(organizations)s
          )
          ON CONFLICT (paper_id) DO UPDATE
            SET summary       = EXCLUDED.summary,
                keywords      = EXCLUDED.keywords,
                organizations = EXCLUDED.organizations
          ;
        """
        inference_values = {
            "paper_id": paper["paper_id"],
            "summary": paper.get("summary", None),
            "keywords": paper.get("keywords", []),
            "organizations": paper.get("organizations", []),
        }
        self.cursor.execute(insert_inference_sql, inference_values)
        self.conn.commit()

    def get_uninfrencedPapers(self, limit: int = None):
        """
        Returns a list of dict‐rows from arxiv_papers where there is no entry in paper_inference.
        Each row will contain at least 'paper_id' and 'link'.
        """
        base_sql = """
          SELECT 
            paper_id, 
            link 
          FROM arxiv_papers
          WHERE paper_id NOT IN (
            SELECT paper_id FROM paper_inference
          )
        """
        if limit is not None:
            base_sql += " LIMIT %s"
            self.cursor.execute(base_sql, (limit,))
        else:
            self.cursor.execute(base_sql)
        return self.cursor.fetchall()


# ----------------------------------------------------------
#  Main script to fetch uninferred papers, run Gemini, insert.
# ----------------------------------------------------------
if __name__ == "__main__":
    max_results = 10
    db = ArxivDB(local=False)
    papers = db.get_uninfrencedPapers(limit=max_results)

    if not papers:
        print("No uninferred papers found.")
        exit(0)

    for row in papers:
        paper_id = row["paper_id"]

        if db.paper_inference_exists(paper_id):
            print(f"Paper {paper_id} has already been inferred, skipping...")
            continue

        raw_link = row["link"]  # e.g. "https://arxiv.org/abs/2305.12345v1"
        pdf_url = raw_link.replace("/abs/", "/pdf/") + ".pdf"

        print(f"Processing paper_id={paper_id}")

        # 1) Download the PDF into memory
        try:
            pdf_data = libreq.urlopen(pdf_url).read()
        except Exception as e:
            print(f"Failed to download PDF for {paper_id}: {e}")
            continue

        # 2) Extract text with PyMuPDF
        try:
            doc = pymupdf.open(stream=pdf_data, filetype="pdf")
            pdf_text = ""
            for page in doc:
                page_text = page.get_text()
                pdf_text += page_text + "\f"
            pdf_text = pdf_text.replace("\n", " ")
        except Exception as e:
            print(f"Failed to parse PDF for {paper_id}: {e}")
            continue

        # 3) Call Gemini to get summary/keywords/organizations
        try:
            client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))

            prompt = f"""Please analyze this academic paper and provide the following information in JSON format:
Use this JSON schema exactly (keys must match):

{{
  "Summary": "A concise, easy-to-understand summary of the paper and its implications",
  "Keywords": "Comma-separated list of key keywords",
  "Organizations": "Comma-separated list of organizations/institutions involved, or 'NONE' if not provided"
}}

Paper text (first 4000 characters only; omit the rest to stay within token limits):
{pdf_text[:4000]}
"""

            response = client.models.generate_content(
                model="gemini-1.5-flash",
                config=types.GenerateContentConfig(
                    system_instruction="You are an expert academic paper analyzer. Return valid JSON only."
                ),
                contents=prompt
            )

            clean_text = response.text.strip()
            clean_text = re.sub(r"^```json\s*|\s*```$", "", clean_text, flags=re.MULTILINE)
            analysis_json = json.loads(clean_text)

        except json.JSONDecodeError:
            print(f"Paper {paper_id}: Response was not valid JSON. Response:\n{clean_text}")
            continue
        except Exception as e:
            print(f"Paper {paper_id}: Error calling Gemini or parsing response: {e}")
            continue

        # 4) Build a dict and insert into paper_inference
        to_insert = {
            "paper_id": paper_id,
            "summary": analysis_json.get("Summary", ""),
            "keywords": [] if analysis_json.get("Keywords", "").upper().strip() == "NONE"
                        else [kw.strip() for kw in analysis_json.get("Keywords", "").split(",")],
            "organizations": [] if analysis_json.get("Organizations", "").upper().strip() == "NONE"
                             else [org.strip() for org in analysis_json.get("Organizations", "").split(",")],
        }

        db.insert_paper(to_insert)

    print("Done processing uninferred papers.")