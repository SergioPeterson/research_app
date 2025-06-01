# API Documentation

## Database
### Tables

#### arxiv_papers
| Column | Type | Description |
|--------|------|-------------|
| id | integer | Primary key |
| paper_id | string | ArXiv paper identifier |
| title | string | Paper title |
| abstract | text | Paper abstract |
| published | timestamp | Publication date |
| authors | string[] | Array of author names |
| comment | text | Additional comments |
| category | string | Paper category |
| link | string | URL to paper |

#### paper_inference
| Column | Type | Description |
|--------|------|-------------|
| paper_id | string | ArXiv paper PRIMARY KEY |
| summary | text | Generated summary |
| keywords | string[] | Array of keywords |
| organizations | string[] | Array of organizations |


#### users
| Column | Type | Description |
|--------|------|-------------|
| clerk_id | string | Clerk authentication ID |
| name | string | User's full name |
| email | string | User's email address |
| affiliations | string[] | User's Affiliations |
| interests | string[] | Array of user interests |
| role | string | Role of user |
| permisions | string | Permissions of user (Admin / Researcher / User) defaulted to User|
| profile_image_url | TEXT | Image file to a storage service |



#### user_likes
| Column | Type | Description |
|--------|------|-------------|
| user_id | string | Foreign key to users |
| paper_id | id | Foreign key to arxiv_papers |

#### user_saves
| Column | Type | Description |
|--------|------|-------------|
| user_id | string | Foreign key to users |
| paper_id | id | Foreign key to arxiv_papers |

#### recommendations
| Column | Type | Description |
|--------|------|-------------|
| id | integer | Primary key |
| user_id | string | Foreign key to users |
| paper_ids | string[] | Foreign key to arxiv_papers |
| updated_at | timestamp | Last update timestamp |

## API Endpoints

### User Endpoints

#### Get User by ID
```http
GET /api/users/:id
```
Returns user information by ID.

**Response Codes**
- `200 OK`: User found successfully
- `404 Not Found`: User with specified ID does not exist
- `500 Internal Server Error`: Server error occurred

**Response**
```json
{
  "id": 1,
  "name": "John Doe",
  "email": "john@example.com",
  "org": "University of Example",
  "interests": ["machine learning", "computer vision"]
}
```


#### Create User
```http
POST /api/users
```
Create a new user.

**Response Codes**
- `201 Created`: User created successfully
- `400 Bad Request`: Invalid request body or missing required fields
- `409 Conflict`: User with same email already exists
- `500 Internal Server Error`: Server error occurred

**Request Body**
```json
{
  "name": "John Doe", - required
  "email": "john@example.com", - required
  "clerk_id": "clerk_123", - required
  "org": null,
  "interests": null
}
```

**Response**
```json
{
  "id": 1,
  "name": "John Doe",
  "email": "john@example.com",
  "org": null,
  "interests": null
}
```

#### Update User
```http
PUT /api/users/:id
```
Update user information.

**Response Codes**
- `200 OK`: User updated successfully
- `400 Bad Request`: Invalid request body
- `404 Not Found`: User with specified ID does not exist
- `500 Internal Server Error`: Server error occurred

**Request Body**
```json
{
  "name": "John Doe Updated",
  "org": "New University",
  "interests": ["deep learning", "nlp"]
}
```

**Response**
```json
{
  "id": 1,
  "name": "John Doe Updated",
  "email": "john@example.com",
  "org": "New University",
  "interests": ["deep learning", "nlp"]
}
```

#### Delete User
```http
DELETE /api/users/:id
```
Delete a user by ID.

**Response Codes**
- `200 OK`: User deleted successfully
- `404 Not Found`: User with specified ID does not exist
- `500 Internal Server Error`: Server error occurred

**Response**
```json
{
  "message": "User deleted successfully"
}
```

#### Get Liked Papers
```http
GET /api/users/:id/likes
```
Returns all papers liked by the user.

**Response Codes**
- `200 OK`: Papers retrieved successfully
- `404 Not Found`: User with specified ID does not exist
- `500 Internal Server Error`: Server error occurred

**Response**
```json
{
  "papers": [
    {
      "id": "2101.12345",
      "title": "Example Paper",
      "abstract": "Paper abstract...",
      "published": "2021-01-01T00:00:00Z",
      "authors": ["Author 1", "Author 2"]
    }
  ]
}
```

#### Get Saved Papers
```http
GET /api/users/:id/saves
```
Returns all papers saved by the user.

**Response Codes**
- `200 OK`: Papers retrieved successfully
- `404 Not Found`: User with specified ID does not exist
- `500 Internal Server Error`: Server error occurred

**Response**
```json
{
  "papers": [
    {
      "id": "2101.12345",
      "title": "Example Paper",
      "abstract": "Paper abstract...",
      "published": "2021-01-01T00:00:00Z",
      "authors": ["Author 1", "Author 2"]
    }
  ]
}
```

#### Get Recommended Papers
```http
GET /api/users/:id/recommendations
```
Returns personalized paper recommendations for the user.

**Response Codes**
- `200 OK`: Recommendations retrieved successfully
- `404 Not Found`: User with specified ID does not exist
- `500 Internal Server Error`: Server error occurred

**Response**
```json
{
  "recommendations": [
    {
        "id": "2101.12345",
        "title": "Example Paper",
        "abstract": "Paper abstract...",
        "published": "2021-01-01T00:00:00Z",
        "authors": ["Author 1", "Author 2"]
    }
  ]
}
```

### Paper Endpoints

#### Get Paper by ID
```http
GET /api/papers/:id
```
Returns detailed information about a specific paper.

**Response Codes**
- `200 OK`: Paper retrieved successfully
- `404 Not Found`: Paper with specified ID does not exist
- `500 Internal Server Error`: Server error occurred

**Response**
```json
{
  "id": "2101.12345",
  "title": "Example Paper",
  "abstract": "Paper abstract...",
  "published": "2021-01-01T00:00:00Z",
  "authors": ["Author 1", "Author 2"],
  "comment": "Additional comments",
  "category": "cs.AI",
  "link": "https://arxiv.org/abs/2101.12345",
  "summary": "Generated summary...",
  "keywords": ["keyword1", "keyword2"],
  "organizations": ["Org 1", "Org 2"]
}
```

#### Filter Papers
```http
GET /api/papers
```
Filter papers by various criteria.

**Response Codes**
- `200 OK`: Papers retrieved successfully
- `400 Bad Request`: Invalid query parameters
- `500 Internal Server Error`: Server error occurred

**Query Parameters**
- `date_from`: Start date (YYYY-MM-DD)
- `date_to`: End date (YYYY-MM-DD)
- `authors`: Comma-separated author names
- `categories`: Comma-separated categories
- `keywords`: Comma-separated keywords
- `limit`: Number of results (default: 20)
- `offset`: Pagination offset (default: 0)

**Response**
```json
{
  "papers": [
    {
      "id": "2101.12345",
      "title": "Example Paper",
      "abstract": "Paper abstract...",
      "published": "2021-01-01T00:00:00Z",
      "authors": ["Author 1", "Author 2"]
    }
  ],
  "total": 100,
  "limit": 20,
  "offset": 0
}
```

#### Get Users Who Liked Paper
```http
GET /api/papers/:id/liked-by
```
Returns all users who liked a specific paper.

**Response Codes**
- `200 OK`: Users retrieved successfully
- `404 Not Found`: Paper with specified ID does not exist
- `500 Internal Server Error`: Server error occurred

**Response**
```json
{
  "users": [
    {
      "id": 1,
      "name": "John Doe",
      "email": "john@example.com",
      "org": "University of Example"
    }
  ]
}
```

#### Get Users Who Saved Paper
```http
GET /api/papers/:id/saved-by
```
Returns all users who saved a specific paper.

**Response Codes**
- `200 OK`: Users retrieved successfully
- `404 Not Found`: Paper with specified ID does not exist
- `500 Internal Server Error`: Server error occurred

**Response**
```json
{
  "users": [
    {
      "id": 1,
      "name": "John Doe",
      "email": "john@example.com",
      "org": "University of Example"
    }
  ]
}
```

