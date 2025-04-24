from flask import Flask, render_template
from database import db
from routes import user_routes, admin_routes
from flask_migrate import Migrate

app = Flask(__name__)
app.secret_key = "b6e7964b96adff617b7874b76be97027"
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///quiz.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

db.init_app(app)
migrate = Migrate(app, db)
# Register Blueprints
app.register_blueprint(user_routes)
app.register_blueprint(admin_routes)

@app.route('/')
def home():
    return render_template('index.html')

if __name__ == '__main__':
    app.run(debug=True)
