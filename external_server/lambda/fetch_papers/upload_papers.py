import os
import urllib.request as libreq
import xml.etree.ElementTree as ET
import dotenv
import psycopg2
import psycopg2.extras
from datetime import datetime, timedelta

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
            # When not local, just grab the single DATABASE_URL (which already has sslmode=require)
            database_url = os.getenv("DATABASE_URL")
            if not database_url:
                raise RuntimeError("DATABASE_URL is not set in environment")
            # psycopg2.connect can accept the full connection string
            self.conn = psycopg2.connect(database_url)

        # Use DictCursor so fetchall() returns dict‐like rows
        self.cursor = self.conn.cursor(cursor_factory=psycopg2.extras.DictCursor)

    def insert_paper(self, paper: dict):
        insert_raw_sql = """
        INSERT INTO arxiv_papers (
          paper_id,
          title,
          abstract,
          published,
          authors,
          comment,
          category,
          link
        ) VALUES (
          %(paper_id)s,
          %(title)s,
          %(abstract)s,
          %(published)s,
          %(authors)s,
          %(comment)s,
          %(category)s,
          %(link)s
        )
        ON CONFLICT (paper_id) DO NOTHING;
        """

        raw_values = {
            "paper_id": paper["paper_id"],
            "title": paper["title"],
            "abstract": paper.get("abstract", None),
            "published": paper.get("published", None),
            "authors": paper.get("authors", []),
            "comment": paper.get("comment", ""),
            "category": paper.get("category", ""),
            "link": paper.get("link", ""),
        }
        self.cursor.execute(insert_raw_sql, raw_values)
        self.conn.commit()
        
offset = 1
date = (datetime.now() - timedelta(days=offset)).strftime("%Y%m%d")
print(date)
max_results = 200
db = ArxivDB(local=True)  
with libreq.urlopen(f'https://export.arxiv.org/api/query?search_query=submittedDate:[{date}0000+TO+{date}2459]&start=0&max_results={max_results}') as url:
    r = url.read()

xml_string = r.decode('utf-8')
root = ET.fromstring(xml_string)

paper_data = {}
namespace = {'atom': 'http://www.w3.org/2005/Atom'}
for entry in root.findall('atom:entry', namespace):
    title = entry.find('atom:title', namespace).text.replace('\n', ' ')
    abstract = entry.find('atom:summary', namespace).text.replace('\n', ' ')
    link = entry.find('atom:id', namespace).text
    published = entry.find('atom:published', namespace).text
    # Get all authors
    authors = []
    for author in entry.findall('atom:author', namespace):
        author_name = author.find('atom:name', namespace).text
        authors.append(author_name)
    
    # Get comments and primary category
    comment = entry.find('arxiv:comment', {'arxiv': 'http://arxiv.org/schemas/atom'})
    comment_text = comment.text if comment is not None else ''
    
    primary_category = entry.find('arxiv:primary_category', {'arxiv': 'http://arxiv.org/schemas/atom'})
    category = primary_category.get('term') if primary_category is not None else ''
    
    paper_id = link.split('/')[-1]
    paper_data[paper_id] = {
        'paper_id':paper_id,
        'title': title,
        'abstract': abstract,
        'link': link,
        'published': published,
        'authors': authors,
        'comment': comment_text,
        'category': category
    }
    db.insert_paper(paper_data[paper_id])
    print(f"Uploaded {link}")