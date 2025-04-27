from fastapi import FastAPI, HTTPException, Depends, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from typing import List
import psycopg2, psycopg2.extras
import os, hashlib, jwt
from dotenv import load_dotenv
from datetime import datetime, timedelta
from models.user import User
from models.paper import Paper
from pydantic import BaseModel

load_dotenv()

class LoginRequest(BaseModel):
    email: str
    password: str


app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], allow_credentials=True,
    allow_methods=["*"], allow_headers=["*"],
)

# Auth setup
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/users/login")
JWT_SECRET    = os.getenv("JWT_SECRET")
JWT_ALGO      = "HS256"
TOKEN_EXPIRE  = 60 * 24 * 7  # one week


def get_db():
    return psycopg2.connect(
        dbname   = os.getenv("LOCAL_PGDATABASE"),
        user     = os.getenv("LOCAL_PGUSER"),
        password = os.getenv("LOCAL_PGPASSWORD"),
        host     = os.getenv("LOCAL_PGHOST"),
        port     = os.getenv("LOCAL_PGPORT", "5432"),
    )
 
def hash_pw(pw: str) -> str:
    return hashlib.sha256(pw.encode()).hexdigest()

def verify_pw(plain: str, hashed: str) -> bool:
    return hash_pw(plain) == hashed

def create_token(sub: int) -> str:
    payload = {
        "sub": str(sub), 
        "exp": datetime.utcnow() + timedelta(minutes=TOKEN_EXPIRE)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGO)

def get_current_user(token: str = Depends(oauth2_scheme)):
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGO])
        print("✅ Decoded payload:", payload) 
        user_id = payload.get("sub")
        if user_id is None:
            raise
    except Exception as e:
        print("🚨 JWT decode failed:", str(e)) 
        raise HTTPException(status_code=401, detail="Invalid credentials")
    conn   = get_db()
    cursor = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    cursor.execute("SELECT * FROM users WHERE id = %s", (user_id,))
    user = cursor.fetchone()
    cursor.close(); conn.close()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user

# ——— User endpoints ———

@app.post("/users/register")
async def register_user(user: User):
    conn   = get_db()
    cursor = conn.cursor()
    pw_hashed = hash_pw(user.password)
    try:
        cursor.execute(
            "INSERT INTO users (name, username, password, email) VALUES (%s,%s,%s,%s) RETURNING id",
            (user.name, user.username, pw_hashed, user.email)
        )
        user_id = cursor.fetchone()[0]
        conn.commit()
    except psycopg2.errors.UniqueViolation:
        conn.rollback()
        raise HTTPException(status_code=400, detail="Username or email already taken")
    finally:
        cursor.close(); conn.close()

    token = create_token(user_id)
    return {"access_token": token, "token_type": "bearer"}

@app.post("/users/login")
async def login_user(data: LoginRequest):
    conn   = get_db()
    cursor = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    cursor.execute("SELECT * FROM users WHERE email = %s", (data.email,))
    user = cursor.fetchone()
    cursor.close(); conn.close()

    if not user or not verify_pw(data.password, user["password"]):
        raise HTTPException(status_code=401, detail="Incorrect email or password")

    token = create_token(user["id"])
    return {"access_token": token, "token_type": "bearer"}

@app.get("/users/me")
async def read_users_me(current_user=Depends(get_current_user)):
    current_user.pop("password", None)
    return current_user

# ——— Paper endpoints ———

@app.get("/papers/feed")
async def get_paper_feed(current_user=Depends(get_current_user)):
    conn   = get_db()
    cursor = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)

    # simple personalization by matching any of user_keywords
    kw_str = current_user.get("user_keywords", "")
    if kw_str:
        kws    = [kw.strip() for kw in kw_str.split(",") if kw.strip()]
        placeholders = ", ".join(["%s"] * len(kws))
        sql = f"""
          SELECT * FROM arxiv_papers
          WHERE keywords ILIKE ANY(ARRAY[{placeholders}]) 
          ORDER BY published DESC LIMIT 20
        """
        cursor.execute(sql, [f"%{kw}%" for kw in kws])
    else:
        cursor.execute("SELECT * FROM arxiv_papers ORDER BY published DESC LIMIT 10")

    papers = cursor.fetchall()
    cursor.close(); conn.close()
    return {"papers": papers}

@app.post("/papers/save")
async def save_paper(paper: Paper, current_user=Depends(get_current_user)):
    conn   = get_db()
    cursor = conn.cursor()
    saved = current_user.get("saved", "")
    lst   = saved.split(",") if saved else []
    if paper.paper_id not in lst:
        lst.append(paper.paper_id)
        cursor.execute("UPDATE users SET saved = %s WHERE id = %s", (",".join(lst), current_user["id"]))
        conn.commit()
    cursor.close(); conn.close()
    return {"msg": "Paper saved"}

@app.post("/papers/like")
async def like_paper(paper_id: str = Query(...), current_user=Depends(get_current_user)):
    conn   = get_db()
    cursor = conn.cursor()
    likes = current_user.get("likes", "")
    lst   = likes.split(",") if likes else []
    if paper_id not in lst:
        lst.append(paper_id)
        cursor.execute("UPDATE users SET likes = %s WHERE id = %s", (",".join(lst), current_user["id"]))
        conn.commit()
    cursor.close(); conn.close()
    return {"msg": "Paper liked"}

@app.get("/papers/{paper_id}")
async def get_paper(paper_id: str):
    conn   = get_db()
    cursor = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    cursor.execute("SELECT * FROM arxiv_papers WHERE paper_id = %s", (paper_id,))
    paper = cursor.fetchone()
    cursor.close(); conn.close()
    if not paper:
        raise HTTPException(status_code=404, detail="Paper not found")
    return paper

@app.get("/search")
async def search_papers(query: str = Query(...)):
    conn   = get_db()
    cursor = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    cursor.execute("""
        SELECT * FROM arxiv_papers
        WHERE title ILIKE %s OR abstract ILIKE %s
    """, (f"%{query}%", f"%{query}%"))
    papers = cursor.fetchall()
    cursor.close(); conn.close()
    return {"papers": papers}