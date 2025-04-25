import urllib.request as libreq
import xml.etree.ElementTree as ET
import pymupdf
import urllib.request
import io
import openai
import dotenv
import os
from google import genai
from google.genai import types
import json
import re

dotenv.load_dotenv()
date = "20250424"
max_results = 2

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
    paper_id = link.split('/')[-1]
    paper_data[paper_id] = {
        'title': title,
        'abstract': abstract,
        'link': link,
        'published': published,
        'authors': authors
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
        "Summary": "A concise summary of the paper",
        "Keywords": "Comma-separated list of key keywords",
        "Organizations": "Comma-separated list of organizations/institutions involved or 'NONE' if not provided"
    }}

    Paper text:
    {pdf_text[:4000]}  # Limiting text length to stay within token limits
    """

    response = client.models.generate_content(
        model="gemini-2.0-flash",
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
    except json.JSONDecodeError as e:
        print("Error: Response was not in valid JSON format")
        print(clean_text)

print(paper_data)