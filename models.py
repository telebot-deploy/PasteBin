from datetime import datetime
from database import db

class Paste(db.Model):
    id = db.Column(
        db.Integer,
        primary_key = True
    )

    slug = db.Column(
        db.String(8),
        unique = True,
        nullable = False,
        index = True
    )

    title = db.Column(
        db.Text
    )

    language = db.Column(
        db.Text,
        nullable = False
    )

    content = db.Column(
        db.Text,
        nullable = False
    )

    created_at = db.Column(
        db.DateTime,
        default = datetime.now()
    )

    expires_at = db.Column(
        db.DateTime,
        default = None
    )

    auth_token = db.Column(
        db.String(32),
        nullable = False
    )

    def to_dict(self,token=""):
        return {
            "slug" : self.slug,
            "title" : self.title,
            "language" : self.language,
            "content" : self.content,
            "created_at" : self.created_at.isoformat(),
            "expires_at" : self.expires_at.isoformat() if self.expires_at else None,
            "is_owner" : bool(token == self.auth_token)
        }
