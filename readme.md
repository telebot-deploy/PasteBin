# PasteBin API

A lightweight PasteBin-inspired web application built using **Flask** that allows users to securely create, retrieve, manage, and delete text snippets (pastes). The application exposes a RESTful API with interactive Swagger documentation and supports Docker-based deployment.

---

## Features

* Create text pastes instantly
* Unique URL (slug) generated for every paste
* Retrieve pastes using the generated slug
* Automatic paste expiration
* Delete pastes securely using a delete token
* User authentication using Bearer Tokens
* Retrieve all pastes created by an authenticated user
* Interactive Swagger API documentation
* SQLite database with SQLAlchemy ORM
* Docker and Docker Compose support

---

## Tech Stack

| Category          | Technology             |
| ----------------- | ---------------------- |
| Language          | Python 3.12            |
| Framework         | Flask                  |
| ORM               | SQLAlchemy             |
| Database          | SQLite                 |
| API Documentation | Flasgger (Swagger UI)  |
| Containerization  | Docker, Docker Compose |

---

# Project Structure

```text
PasteBin/
│
├── app.py                 # Application entry point
├── config.py              # Configuration
├── database.py            # SQLAlchemy initialization
├── models.py              # Database models
├── routes.py              # API routes
├── utils.py               # Helper functions
├── requirements.txt
├── Dockerfile
├── docker-compose.yml
├── .dockerignore
├── .gitignore
│
├── instance/
│   └── paste.db           # SQLite database (generated automatically)
│
├── static/
│   ├── css/
│   └── js/
│
└── templates/
    └── index.html
```

---

# Installation

## Clone the repository

```bash
git clone https://github.com/telebot-deploy/PasteBin.git

cd PasteBin
```

## Create a Virtual Environment

### Windows

```bash
python -m venv venv
venv\Scripts\activate
```

### Linux / macOS

```bash
python3 -m venv venv
source venv/bin/activate
```

---

## Install Dependencies

```bash
pip install -r requirements.txt
```

---

## Run the Application

```bash
python app.py
```

The application will start at:

```
http://localhost:5000
```

---

# Running with Docker

Build the Docker image

```bash
docker build -t pastebin .
```

Run the container

```bash
docker run -p 5000:5000 pastebin
```

Visit:

```
http://localhost:5000
```

---

# API Documentation

Swagger UI is available at:

```
http://localhost:5000/apidocs
```

It contains interactive documentation for all available endpoints.

---

# Authentication

Protected endpoints require a Bearer Token.

Example:

```http
Authorization: Bearer YOUR_AUTH_TOKEN
```

---

# API Endpoints

| Method | Endpoint             | Description                                             |
| ------ | -------------------- | ------------------------------------------------------- |
| POST   | `/api/pastes/`       | Create a new paste                                      |
| GET    | `/api/pastes/<slug>` | Retrieve a paste                                        |
| DELETE | `/api/pastes/<slug>` | Delete a paste using delete token                       |
| GET    | `/api/pastes`        | Retrieve all pastes belonging to the authenticated user |

---

# Example Workflow

### 1. Create a Paste

```http
POST /api/pastes/
```

Returns

```json
{
    "slug": "SVFIfYis",
    "url": "http://localhost:5000/api/pastes/SVFIfYis",
    "delete_token": "xxxxxxxxxxxxxxxx",
    "auth_token": "xxxxxxxxxxxxxxxx"
}
```

---

### 2. Retrieve a Paste

```http
GET /api/pastes/SVFIfYis
```

---

### 3. Delete a Paste

```http
DELETE /api/pastes/SVFIfYis
```

Include the delete token in the request body or according to the API specification.

---

### 4. Retrieve All User Pastes

```http
GET /api/pastes
```

Header:

```http
Authorization: Bearer YOUR_AUTH_TOKEN
```

---

# Database

The project uses **SQLite** together with **SQLAlchemy ORM**.

On first execution, the required database and tables are automatically created if they do not already exist.

---

# Future Improvements

* PostgreSQL support
* JWT Authentication
* User accounts
* Rate limiting
* Unit testing with PyTest
* GitHub Actions CI/CD
* Gunicorn + Nginx deployment
* Docker volumes for persistent storage

---

# License

This project is intended for educational and learning purposes.

---
