from flask import Flask

from config import Config
from database import db
from models import Paste
from routes import bp
from flasgger import Swagger


app = Flask(__name__)

swagger_template = {
    "swagger": "2.0",
    "info": {
        "title": "PasteBin API",
        "version": "1.0"
    },
    "securityDefinitions": {
        "Bearer": {
            "type": "apiKey",
            "name": "Authorization",
            "in": "header",
            "description": "Bearer <auth_token>"
        }
    }
}

Swagger(app,template=swagger_template)

app.config.from_object(Config)
db.init_app(app)

app.register_blueprint(bp)

with app.app_context():
    db.create_all()



if __name__ == "__main__":
    app.run(debug=True)
