from pydantic import BaseModel

class Paper(BaseModel):
    paper_id: str
    title: str
    abstract: str
    authors: str
    link: str
