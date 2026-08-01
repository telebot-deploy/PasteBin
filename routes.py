from flask import Blueprint,request,jsonify, render_template
from database import db
from models import Paste
from utils import generate_slug, generate_token, get_expiry_datetime, is_expired

bp = Blueprint(
    "pastes",
    __name__
)

@bp.route("/")
@bp.route("/dashboard")
@bp.route("/<slug>")
def home(slug=None):
    return render_template("index.html")

@bp.route("/api/pastes/", methods=["POST"])
def create_paste():
    """
    Create a new paste.
    ---
    tags:
      - Pastes

    summary: Create a new paste

    description: |
      Creates a new paste and stores it in the database.
      If no Authorization header is provided, a new auth token is generated.
      If an Authorization header is present, the new paste is associated with that token.

    consumes:
      - application/json

    produces:
      - application/json

    parameters:
      - in: header
        name: Authorization
        required: false
        type: string
        description: Existing bearer token (optional).
        example: Bearer your_auth_token

      - in: body
        name: body
        required: true
        schema:
          type: object
          required:
            - title
            - language
            - expiry
            - content
          properties:
            title:
              type: string
              example: Hello World
            language:
              type: string
              example: python
            expiry:
              type: string
              description: Expiration duration for the paste.
              enum:
                - never
                - 10_minutes
                - 1_hour
                - 1_day
                - 1_week
            content:
              type: string
              example: print("Hello World")

    responses:
      201:
        description: Paste created successfully.
        schema:
          type: object
          properties:
            message:
              type: string
              example: paste created successfully
            slug:
              type: string
              example: aB82Kd
            auth_token:
              type: string
              example: 81a9d4b17c...

      400:
        description: Content is missing from the request body.
    """
    data = request.get_json()
    auth_header = request.headers.get("Authorization")
    token = auth_header.split(" ", 1)[1] if auth_header else ""

    if not data or not data.get("content"):
        return jsonify({
            "error": "content is required"
        }), 400
    
    required = ["title", "language", "expiry", "content"]

    for field in required:
        if not field in data:
            return jsonify({
                "error": f"{field} is required"
            }), 400
    
    paste = Paste(
        slug = generate_slug(),
        title = data["title"],
        language = data["language"],
        expires_at = get_expiry_datetime(data["expiry"]),
        auth_token = generate_token() if not token else token,
        content = data["content"]
    )

    db.session.add(paste)
    db.session.commit()

    return jsonify({
        "message" : "paste created succesfully",
        "slug" : paste.slug,
        "auth_token" : paste.auth_token
    }), 201


@bp.route("/api/pastes/<string:slug>",methods=["GET"])
def get_paste(slug):
    """
    Retrieve a paste by slug.
    ---
    tags:
      - Pastes

    summary: Retrieve a single paste

    description: |
      Returns the paste corresponding to the provided slug.
      If the requester owns the paste (Authorization token matches),
      ownership-related fields may also be returned.

    produces:
      - application/json

    parameters:
      - in: path
        name: slug
        type: string
        required: true
        description: Unique slug of the paste.

      - in: header
        name: Authorization
        required: false
        type: string
        description: Bearer authentication token.
        example: Bearer your_auth_token

    responses:
      200:
        description: Paste retrieved successfully.

      404:
        description: Paste not found or has expired.
    """

    auth_header = request.headers.get("Authorization")
    token = auth_header.split(" ", 1)[1] if auth_header else ""

    paste = db.session.scalar(
        db.select(Paste).filter_by(slug=slug)
    )

    if paste is None or is_expired(paste.expires_at):
        return jsonify({
            "error": "paste not found"
        }), 404
    
    return jsonify(paste.to_dict(token)) , 200


@bp.route("/api/pastes/mine", methods=["GET"])
def get_pastes():
    """
    Retrieve all pastes belonging to the authenticated user.
    ---
    tags:
      - Pastes

    summary: Retrieve all user's pastes

    description: |
      Returns every non-expired paste associated with the provided
      Authorization token.

    produces:
      - application/json

    parameters:
      - in: header
        name: Authorization
        required: true
        type: string
        description: Bearer authentication token.
        example: Bearer your_auth_token

    responses:
      200:
        description: Successfully retrieved user's pastes.

    """
    auth_header = request.headers.get("Authorization")
    
    token = auth_header.split(" ", 1)[1] if auth_header else ""
    pastes = db.session.scalars(
          db.select(Paste).where(Paste.auth_token == token)
    ).all()

    return jsonify([
        paste.to_dict(token=token) for paste in pastes if not is_expired(paste.expires_at)
    ]), 200


@bp.route("/api/pastes/<string:slug>",methods= ["DELETE"])
def delete_paste(slug):
    """
    Delete a paste.
    ---
    tags:
      - Pastes

    summary: Delete a paste

    description: |
      Deletes the specified paste if the provided Authorization
      token matches the paste owner's token.

    produces:
      - application/json

    parameters:
      - in: path
        name: slug
        required: true
        type: string
        description: Unique slug of the paste.

      - in: header
        name: Authorization
        required: true
        type: string
        description: Bearer authentication token.
        example: Bearer your_auth_token

    responses:
      200:
        description: Paste deleted successfully.

      401:
        description: Authorization header missing.

      403:
        description: Invalid authorization token.

      404:
        description: Paste not found.
    """

    auth_header = request.headers.get("Authorization")

    if not auth_header:
        return jsonify({
            "error" : "Authorization required"
        }) , 401 
    
    token = auth_header.replace("Bearer ","")

    paste = db.session.scalar(
        db.select(Paste).where(Paste.slug == slug)
    )

    if paste is None:
        return jsonify({
            "error" : "paste not found"
        }), 404
    
    if token != paste.auth_token:
        return jsonify({"error": "Invalid token"}), 403
    
    db.session.delete(paste)
    db.session.commit()

    return jsonify({
        "message" : "paste deleted successfully"
    }), 200





