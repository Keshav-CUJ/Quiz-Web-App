from flask import Blueprint, request, jsonify, session, redirect, make_response, render_template
from sqlalchemy import func
from werkzeug.security import generate_password_hash, check_password_hash
from database import db, User, Subject, Chapter, Quiz,Question, Score, QuestionStatus 
from datetime import datetime

user_routes = Blueprint('user_routes', __name__)



@user_routes.route('/api/register', methods=['POST'])
def register_user():
    data = request.get_json()
    if User.query.filter_by(username=data['username']).first():
        return jsonify({"message": "Username already exists"}), 400

    # Convert DOB string to a date object
    try:
        dob_date = datetime.strptime(data['dob'], "%Y-%m-%d").date()
    except ValueError:
        return jsonify({"message": "Invalid date format. Use YYYY-MM-DD."}), 400

    hashed_password = generate_password_hash(data['password'], method='pbkdf2:sha256')
    new_user = User(
        username=data['username'],
        password=hashed_password,
        full_name=data.get('full_name', ''),
        qualification=data.get('qualification', ''),
        dob=dob_date,  # Now it is a proper date object
        role='user'
    )
    db.session.add(new_user)
    db.session.commit()
    return jsonify({"message": "User registered successfully"}), 201


from werkzeug.security import check_password_hash  # ✅ Import password check function

@user_routes.route('/api/login/user', methods=['POST'])
def login_user():
    data = request.get_json()
    user = User.query.filter_by(username=data['username']).first()

    # ✅ Compare hashed password correctly
    if user and check_password_hash(user.password, data['password']):
        session["user_logged_in"] = True
        session["user_username"] = user.username
        return jsonify({"message": "User login successful", "redirect": "/user/dashboard"}), 200

    return jsonify({"message": "Invalid user credentials"}), 401


# ✅ Check User Session
@user_routes.route('/api/check_user_session')
def check_user_session():
    return jsonify({"logged_in": "user_logged_in" in session})

# ✅ User Dashboard Route (Prevent Caching)
@user_routes.route('/user/dashboard')
def user_dashboard():
    if "user_logged_in" not in session:
        return redirect("/")  # Redirect if not logged in
    user = User.query.filter_by(username=session["user_username"]).first()
    if not user:
        return redirect("/")
    
    subjects = Subject.query.all()  # Load subjects for the user dashboard
    # ✅ Fetch attempted quizzes and their scores
    attempted_quizzes = db.session.query(Score, Quiz).join(Quiz).filter(Score.user_id == user.id).all()
    
    response = make_response(render_template("user_dashboard.html", subjects=subjects, user_username=session.get("user_username"), attempted_quizzes=attempted_quizzes))

    # Prevent browser from caching the page after logout
    response.headers["Cache-Control"] = "no-store, no-cache, must-revalidate, max-age=0"
    response.headers["Pragma"] = "no-cache"
    response.headers["Expires"] = "0"

    return response

# ✅ User Logout API (Prevent Back Navigation)
@user_routes.route('/api/logout/user', methods=['POST'])
def logout_user():
    session.pop("user_logged_in", None)
    session.pop("user_username", None)

    response = redirect("/")
    response.headers["Cache-Control"] = "no-store, no-cache, must-revalidate, max-age=0"
    response.headers["Pragma"] = "no-cache"
    response.headers["Expires"] = "0"
    return response



@user_routes.route("/api/chapters/by_subject", methods=["GET"])
def get_chapters_by_subject():
    subject_id = request.args.get("subject_id")
    if not subject_id:
        return jsonify([])

    chapters = Chapter.query.filter_by(subject_id=subject_id).all()

    return jsonify([
        {"id": c.id, "name": c.name, "description": c.description, "subject_id": c.subject_id}
        for c in chapters
    ])


@user_routes.route("/api/quizzes/by_chapter", methods=["GET"])
def get_quizzes_by_chapter():
    chapter_id = request.args.get("chapter_id")
    if not chapter_id:
        return jsonify([])

    quizzes = Quiz.query.filter_by(chapter_id=chapter_id).all()

    return jsonify([
        {
            "id": q.id,
            "chapter_id": q.chapter_id,
            "date_of_quiz": q.date_of_quiz.strftime("%Y-%m-%d"),
            "time_duration": q.time_duration,
            "remarks": q.remarks
        }
        for q in quizzes
    ])


@user_routes.route("/api/subjects", methods=["GET"])
def get_subjects():
    subjects = Subject.query.all()
    
    return jsonify([
        {"id": s.id, "name": s.name, "description": s.description}
        for s in subjects
    ])




@user_routes.route("/user/quiz/<int:quiz_id>")
def start_quiz(quiz_id):
    if "user_logged_in" not in session:
        return redirect("/")  # Redirect if not logged in

    user = User.query.filter_by(username=session["user_username"]).first()
    if not user:
        return redirect("/")  # Redirect if user is not found

    quiz = Quiz.query.get_or_404(quiz_id)

    # ✅ Check if the user has already attempted this quiz
    existing_attempt = Score.query.filter_by(quiz_id=quiz_id, user_id=user.id).first()
    if existing_attempt:
        return jsonify({"message": "You have already attempted this quiz!", "redirect": "/user/dashboard"}), 403

    return render_template("quiz.html", quiz_id=quiz_id, duration=quiz.time_duration)



# ✅ API to Submit the Quiz and getting scores
@user_routes.route("/api/submit_quiz/<int:quiz_id>", methods=["POST"])
def submit_quiz(quiz_id):
    if "user_logged_in" not in session:
        return jsonify({"message": "Unauthorized"}), 401

    # ✅ Fetch the User ID from the database (since only username is in session)
    user = User.query.filter_by(username=session["user_username"]).first()
    if not user:
        return jsonify({"message": "User not found"}), 404

    data = request.get_json()
    user_answers = data.get("answers", {})
    user_timestamp = data.get("timestamp")
    
      # ✅ Convert timestamp from string to datetime object
    try:
        attempt_time = datetime.fromisoformat(user_timestamp.replace("Z", ""))
    except ValueError:
        return jsonify({"message": "Invalid timestamp format"}), 400

    # ✅ Get all correct answers for the quiz
    correct_answers = Question.query.filter(Question.quiz_id == quiz_id).all()

    # ✅ Define scoring scheme
    positive_mark = 1       # For correct answer
    negative_mark = -0.25   # For incorrect answer

    total_score = 0

    for q in correct_answers:
        q_id = str(q.id)
        user_ans = str(user_answers.get(q_id))

        if user_ans == str(q.correct_option):
            total_score += positive_mark
        elif user_ans and user_ans != str(q.correct_option):
            total_score += negative_mark
        # else unanswered: no change to score

    new_score = Score(
        quiz_id=quiz_id,
        user_id=user.id,
        timestamp=attempt_time,
        total_score=round(total_score, 2)  # optional: round score to 2 decimal places
    )
    
    db.session.add(new_score)
    db.session.commit()

    return jsonify({"message": "Quiz submitted!", "total_score": total_score})

@user_routes.route("/api/questions/<int:quiz_id>", methods=["GET"])
def get_questions(quiz_id):
    questions = Question.query.filter_by(quiz_id=quiz_id).all()

    if not questions:
        return jsonify([])  # ✅ Return empty list if no questions exist

    return jsonify([
        {
            "id": q.id,
            "question_statement": q.question_statement,
            "option1": q.option1,
            "option2": q.option2,
            "option3": q.option3,
            "option4": q.option4,
            "correct_option": q.correct_option
        }
        for q in questions
    ])


@user_routes.route("/api/user_attempted_quizzes")
def user_attempted_quizzes():
    if "user_logged_in" not in session:
        return jsonify({"message": "Unauthorized"}), 401

    user = User.query.filter_by(username=session["user_username"]).first()
    if not user:
        return jsonify({"message": "User not found"}), 404

    # ✅ Fetch all quizzes with attempt status
    quizzes = Quiz.query.all()
    attempted_scores = {score.quiz_id: score.total_score for score in Score.query.filter_by(user_id=user.id).all()}

    quiz_list = []
    for quiz in quizzes:
        total_questions = len(quiz.questions)
        attempted = quiz.id in attempted_scores
        quiz_list.append({
            "id": quiz.id,
            "chapter": quiz.chapter.name,
            "subject": quiz.chapter.subject.name,
            "total_questions": total_questions,
            "score": attempted_scores.get(quiz.id, 0),
            "attempted": attempted
        })

    return jsonify({"quizzes": quiz_list})

@user_routes.route("/api/question_status/<int:quiz_id>", methods=["GET"])
def get_question_status(quiz_id):
    if "user_logged_in" not in session:
        return jsonify({"message": "Unauthorized"}), 401

    user = User.query.filter_by(username=session["user_username"]).first()
    if not user:
        return jsonify({"message": "User not found"}), 404

    statuses = QuestionStatus.query.filter_by(quiz_id=quiz_id, user_id=user.id).all()

    return jsonify([
        {"question_id": s.question_id, "status": s.status} for s in statuses
    ])

@user_routes.route("/api/question_status/update", methods=["POST"])
def update_question_status():
    if "user_logged_in" not in session:
        return jsonify({"message": "Unauthorized"}), 401

    data = request.get_json()
    user = User.query.filter_by(username=session["user_username"]).first()
    if not user:
        return jsonify({"message": "User not found"}), 404

    # Fetch or create the status entry
    question_status = QuestionStatus.query.filter_by(
       
        user_id=user.id, 
        question_id=data["question_id"]
    ).first()

    if question_status:
        question_status.status = data["status"]
    else:
        question_status = QuestionStatus(
            user_id=user.id, 
             
            question_id=data["question_id"], 
            status=data["status"]
        )
        db.session.add(question_status)

    db.session.commit()
    return jsonify({"message": "Status updated successfully"})


@user_routes.route('/user/summary')
def user_summary():
    if "user_logged_in" not in session:
        return redirect("/")  # Redirect if not logged in
    user = User.query.filter_by(username=session["user_username"]).first()
    if not user:
        return redirect("/")
    
    response = make_response(render_template("user_summary.html", user_username=session.get("user_username")))
    
    # Prevent browser from caching the page
    response.headers["Cache-Control"] = "no-store, no-cache, must-revalidate, max-age=0"
    response.headers["Pragma"] = "no-cache"
    response.headers["Expires"] = "0"

    return response

@user_routes.route("/api/user/summary", methods=["GET"])
def user_summary_api():
    if "user_logged_in" not in session:
        return jsonify({"message": "Unauthorized"}), 401

    user = User.query.filter_by(username=session["user_username"]).first()
    
    user_id = user.id
    

    # Subject-wise Number of Quizzes Attempted
    quiz_count = (
        db.session.query(Subject.name, func.count(Score.quiz_id))
        .join(Chapter, Subject.id == Chapter.subject_id)
        .join(Quiz, Chapter.id == Quiz.chapter_id)
        .join(Score, (Quiz.id == Score.quiz_id) & (Score.user_id == user_id))
        .group_by(Subject.name)
        .all()
    )

    # Subject-wise Top Scores
    top_scores = (
        db.session.query(Subject.name, func.max(Score.total_score))
        .join(Chapter, Subject.id == Chapter.subject_id)
        .join(Quiz, Chapter.id == Quiz.chapter_id)
        .join(Score, (Quiz.id == Score.quiz_id) & (Score.user_id == user_id))
        .group_by(Subject.name)
        .all()
    )

    

    return jsonify({
        "quiz_count": [{"subject": q[0], "count": q[1]} for q in quiz_count],
        "top_scores": [{"subject": s[0], "score": s[1]} for s in top_scores],
            })
    
    
@user_routes.route("/api/question_status/init/<int:quiz_id>", methods=["POST"])
def initialize_question_status(quiz_id):
    if "user_logged_in" not in session:
        return jsonify({"message": "Unauthorized"}), 401

    user = User.query.filter_by(username=session["user_username"]).first()
    if not user:
        return jsonify({"message": "User not found"}), 404

    # Fetch all questions for the quiz
    questions = Question.query.filter_by(quiz_id=quiz_id).all()

    for question in questions:
        existing_status = QuestionStatus.query.filter_by(
            quiz_id=quiz_id, user_id=user.id, question_id=question.id
        ).first()

        if not existing_status:
            new_status = QuestionStatus(
                user_id=user.id, quiz_id=quiz_id, question_id=question.id, status="Not Visited"
            )
            db.session.add(new_status)

    db.session.commit()
    return jsonify({"message": "Question statuses initialized"})

@user_routes.route("/api/question_status/clear/<int:quiz_id>", methods=["POST"])
def clear_question_status(quiz_id):
    if "user_logged_in" not in session:
        return jsonify({"message": "Unauthorized"}), 401

    user = User.query.filter_by(username=session["user_username"]).first()
    if not user:
        return jsonify({"message": "User not found"}), 404

    # ❌ Delete all status entries for this user and quiz
    QuestionStatus.query.filter_by(quiz_id=quiz_id, user_id=user.id).delete()
    db.session.commit()

    return jsonify({"message": "Question statuses cleared!"})
