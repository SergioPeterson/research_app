import urllib.request as libreq
import xml.etree.ElementTree as ET
import pymupdf
import urllib.request
import openai
import dotenv
import os
from google import genai
from google.genai import types
import json
import re
import psycopg2
import psycopg2.extras
from datetime import datetime, timedelta


class ArxivDB:
    def __init__(self, local=True):
        db_params = {
            "dbname": os.getenv("LOCAL_PGDATABASE") if local else os.getenv("PGDATABASE"),
            "user": os.getenv("LOCAL_PGUSER") if local else os.getenv("PGUSER"),
            "password": os.getenv("LOCAL_PGPASSWORD") if local else os.getenv("PGPASSWORD"),
            "host": os.getenv("LOCAL_PGHOST") if local else os.getenv("PGHOST"),
            "port": os.getenv("LOCAL_PGPORT") if local else os.getenv("PGPORT", "5432"),
        }
        self.conn = psycopg2.connect(**db_params)
        self.cursor = self.conn.cursor()
        self.create_table()

    def create_table(self):
        self.cursor.execute("""
        CREATE TABLE IF NOT EXISTS arxiv_papers (
            id SERIAL PRIMARY KEY,
            paper_id TEXT UNIQUE,
            title TEXT,
            abstract TEXT,
            published TIMESTAMP,
            authors TEXT,
            comment TEXT,
            category TEXT,
            link TEXT,
            summary TEXT,
            keywords TEXT,
            organizations TEXT
        );
                            
        CREATE TABLE IF NOT EXISTS users (
            id SERIAL PRIMARY KEY,
            name TEXT,
            username TEXT UNIQUE,
            password TEXT,
            likes TEXT,
            saved TEXT,
            email TEXT UNIQUE,
            user_papers TEXT,
            user_organizations TEXT,
            user_keywords TEXT
        );
        """)
        self.conn.commit()

    def insert_paper(self, paper):
        self.cursor.execute("""
        INSERT INTO arxiv_papers (
          paper_id, title, abstract, published, authors,
          comment, category, link, summary, keywords, organizations
        ) VALUES (
          %s, %s, %s, %s, %s,
          %s, %s, %s, %s, %s, %s
        )
        ON CONFLICT (paper_id) DO NOTHING;
        """, (
            paper['paper_id'],
            paper['title'],
            paper['abstract'],
            paper['published'],
            ', '.join(paper['authors']),   # join list → string
            paper['comment'],
            paper['category'],
            paper['link'],
            paper.get('summary', ''),
            paper.get('keywords', ''),
            paper.get('organizations', '')
        ))
        self.conn.commit()
        
dotenv.load_dotenv()
date = (datetime.now() - timedelta(days=1)).strftime("%Y%m%d")
max_results = 10
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
        'title': title,
        'abstract': abstract,
        'link': link,
        'published': published,
        'authors': authors,
        'comment': comment_text,
        'category': category
    }
    # Download the PDF from the arXiv link
    pdf_url = link.replace('abs', 'pdf') + '.pdf'
    pdf_data = urllib.request.urlopen(pdf_url).read()

    # Open the PDF from memory
    doc = pymupdf.open(stream=pdf_data, filetype="pdf")
    pdf_text = ""
    for page in doc: # iterate the document pages
        text = page.get_text() # get plain text
        pdf_text += text + "\f" # add page delimiter (form feed)
    pdf_text=pdf_text.replace("\n", "")

    client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))
    # Prepare the prompt for Gemini
    prompt = f"""Please analyze this academic paper and provide the following information in JSON format:
    Use this JSON schema:
    {{
        "Summary": "A easy to understand summary of the paper and its implications",
        "Keywords": "Comma-separated list of key keywords",
        "Organizations": "Comma-separated list of organizations/institutions involved or 'NONE' if not provided"
    }}

    Paper text:
    {pdf_text[:4000]}  # Limiting text length to stay within token limits
    """

    response = client.models.generate_content(
        model="gemini-1.5-flash",
        config=types.GenerateContentConfig(
            system_instruction="You are an expert academic paper analyzer. Return the analysis in valid JSON format."),
        contents=prompt
    )

    # Clean up the response text
    clean_text = response.text.strip()

    # Remove any leading or trailing markdown code blocks
    clean_text = re.sub(r"^```json\s*|\s*```$", "", clean_text)

    try:
        analysis_json = json.loads(clean_text)
        paper_data[paper_id]['summary'] = analysis_json['Summary']
        paper_data[paper_id]['keywords'] = analysis_json['Keywords']
        paper_data[paper_id]['organizations'] = analysis_json['Organizations']
        paper_data[paper_id]['paper_id'] = paper_id
        db.insert_paper(paper_data[paper_id])

    except json.JSONDecodeError as e:
        print("Error: Response was not in valid JSON format")
        print(clean_text)



