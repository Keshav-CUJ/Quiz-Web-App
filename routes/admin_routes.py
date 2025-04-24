from flask import Blueprint, request, session, jsonify,redirect, make_response, render_template, redirect
from sqlalchemy import func
from werkzeug.security import check_password_hash
from database import db, Admin, Subject, Chapter, Quiz, Question, Score
from datetime import datetime

admin_routes = Blueprint('admin_routes', __name__)

@admin_routes.route('/api/login/admin', methods=['POST'])
def login_admin():
    data = request.get_json()
    admin = Admin.query.filter_by(username=data['username']).first()

    if admin and admin.password == data['password']:  # Replace with hashed password check
        session["admin_logged_in"] = True  # Store session
        session["admin_username"] = admin.username  # Store username
        return jsonify({"message": "Admin login successful", "redirect": "/admin/dashboard"}), 200

    return jsonify({"message": "Invalid credentials"}), 401

@admin_routes.route('/api/check_admin_session')
def check_admin_session():
    return jsonify({"logged_in": "admin_logged_in" in session})

@admin_routes.route('/admin/dashboard')
def admin_dashboard():
    if "admin_logged_in" not in session:
        return redirect("/")  # Redirect if not logged in
    
    response = make_response(render_template("admin_dashboard.html", admin_username=session.get("admin_username")))
    
    # Prevent browser from caching the page
    response.headers["Cache-Control"] = "no-store, no-cache, must-revalidate, max-age=0"
    response.headers["Pragma"] = "no-cache"
    response.headers["Expires"] = "0"

    return response






@admin_routes.route('/api/logout/admin' , methods=['POST'])
def logout_admin():
    session.pop("admin_logged_in", None)
    session.pop("admin_username", None)

    response = redirect("/")
    response.headers["Cache-Control"] = "no-store, no-cache, must-revalidate, max-age=0"
    response.headers["Pragma"] = "no-cache"
    response.headers["Expires"] = "0"
    return response

# API for getting all subjects
@admin_routes.route("/api/subjects", methods=["GET"])
def get_subjects():
    subjects = Subject.query.all()
    return jsonify({"subjects": [{"id": s.id, "name": s.name, "description": s.description} for s in subjects]})

# for editing the quiz
@admin_routes.route("/api/subjects_quiz", methods=["GET"])
def get_subjects_for_quiz():
    subjects = Subject.query.all()
    
    # ✅ Ensure response is always a list
    return jsonify([{"id": s.id, "name": s.name} for s in subjects])


# Add new subject
@admin_routes.route("/api/subjects", methods=["POST"])
def add_subject():
    data = request.get_json()
    if "name" not in data or not data["name"].strip():
        return jsonify({"message": "Subject name is required"}), 400

    new_subject = Subject(name=data["name"].strip(), description=data.get("description", "").strip())
    db.session.add(new_subject)
    db.session.commit()

    return jsonify({"message": "Subject added successfully!", "id": new_subject.id})

# Update subject
@admin_routes.route("/api/subjects/<int:subject_id>", methods=["PUT"])
def update_subject(subject_id):
    data = request.get_json()
    subject = Subject.query.get(subject_id)

    if not subject:
        return jsonify({"message": "Subject not found"}), 404
    
    subject.name = data["name"].strip()
    subject.description = data.get("description", "").strip()
    db.session.commit()
    
    return jsonify({"message": "Subject updated successfully!"})

# Delete subject
@admin_routes.route("/api/subjects/<int:subject_id>", methods=["DELETE"])
def delete_subject(subject_id):
    subject = Subject.query.get(subject_id)

    if not subject:
        return jsonify({"message": "Subject not found"}), 404

    db.session.delete(subject)
    db.session.commit()

    return jsonify({"message": "Subject deleted successfully!"})

@admin_routes.route("/api/chapters", methods=["GET"])
def get_chapters():
    chapters = Chapter.query.all()
    return jsonify([
        {"id": c.id, "name": c.name, "description": c.description, "subject_id": c.subject_id, "subject_name": c.subject.name}
        for c in chapters
    ])

@admin_routes.route("/api/chapters", methods=["POST"])
def add_chapter():
    data = request.get_json()
    if "name" not in data or not data["name"].strip() or "subject_id" not in data:
        return jsonify({"message": "Chapter name and subject are required"}), 400

    new_chapter = Chapter(
        name=data["name"].strip(),
        description=data.get("description", "").strip(),
        subject_id=int(data["subject_id"])
    )
    db.session.add(new_chapter)
    db.session.commit()

    return jsonify({"message": "Chapter added successfully!", "id": new_chapter.id})

@admin_routes.route("/api/chapters/<int:chapter_id>", methods=["PUT"])
def edit_chapter(chapter_id):
    data = request.get_json()
    print("📥 Received data for update:", data)  # Debugging log

    chapter = Chapter.query.get_or_404(chapter_id)

    if "name" in data and data["name"].strip():
        chapter.name = data["name"].strip()
    if "description" in data:
        chapter.description = data["description"].strip()
    if "subject_id" in data:
        new_subject = Subject.query.get(int(data["subject_id"]))  # Convert to integer
        if new_subject:
            chapter.subject_id = new_subject.id
            print(f"✅ Subject updated to {new_subject.name}")  # Debugging log
        else:
            print("❌ Invalid subject ID")
            return jsonify({"message": "Invalid subject ID"}), 400

    db.session.commit()
    print("✅ Chapter successfully updated in the database!")  # Debugging log
    return jsonify({"message": "Chapter updated successfully!"})




@admin_routes.route("/api/chapters/<int:chapter_id>", methods=["DELETE"])
def delete_chapter(chapter_id):
    chapter = Chapter.query.get_or_404(chapter_id)
    db.session.delete(chapter)
    db.session.commit()
    return jsonify({"message": "Chapter deleted successfully!"})




@admin_routes.route("/admin/quizzes")
def admin_quizzes():
    if "admin_logged_in" not in session:
        return redirect("/")
    subjects = Subject.query.all()
    response = make_response(render_template("admin_quizzes.html", subjects=subjects))
    response.headers["Cache-Control"] = "no-store, no-cache, must-revalidate, max-age=0"
    response.headers["Pragma"] = "no-cache"
    response.headers["Expires"] = "0"
    return response



# ✅ Route to Fetch Quizzes with Filtering
@admin_routes.route("/api/quizzes", methods=["GET"])
def get_quizzes():
    subject_id = request.args.get("subject_id")
    chapter_id = request.args.get("chapter_id")

    query = Quiz.query.join(Chapter)  # ✅ Ensures it filters by subject through Chapter

    if chapter_id:
        query = query.filter(Quiz.chapter_id == chapter_id)
    elif subject_id:
        query = query.filter(Chapter.subject_id == subject_id)

    quizzes = query.all()
    print(f"📥 Filtered Quizzes - Subject: {subject_id}, Chapter: {chapter_id}, Found: {len(quizzes)}")  # Debugging log

    return jsonify([
        {
            "id": quiz.id,
            "chapter_name": quiz.chapter.name,
            "subject_name": quiz.chapter.subject.name,
            "date_of_quiz": quiz.date_of_quiz.strftime("%Y-%m-%d"),
            "time_duration": quiz.time_duration,
            "remarks": quiz.remarks or "",
        }
        for quiz in quizzes
    ])


# ✅ Route to Add a New Quiz
@admin_routes.route("/api/quizzes", methods=["POST"])
def add_quiz():
    data = request.get_json()
    if not data.get("chapter_id") or not data.get("date_of_quiz") or not data.get("time_duration"):
        return jsonify({"message": "All fields are required!"}), 400

    new_quiz = Quiz(
        chapter_id=int(data["chapter_id"]),
        date_of_quiz=datetime.strptime(data["date_of_quiz"], "%Y-%m-%d"),
        time_duration=data["time_duration"],
        remarks=data.get("remarks", "").strip(),
    )
    db.session.add(new_quiz)
    db.session.commit()

    return jsonify({"message": "Quiz added successfully!", "id": new_quiz.id})

# ✅ API for getting chapter by subject
@admin_routes.route("/api/chapters/by_subject", methods=["GET"])  # ✅ Renamed route
def get_chapters_by_subject():
    subject_id = request.args.get("subject_id")
    
    if not subject_id:
        return jsonify([])  # If no subject is selected, return an empty list
    
    chapters = Chapter.query.filter_by(subject_id=subject_id).all()
    
    return jsonify([
        {"id": c.id, "name": c.name} for c in chapters
    ])


@admin_routes.route("/api/quizzes/<int:quiz_id>", methods=["PUT"])
def edit_quiz(quiz_id):
    data = request.get_json()
    quiz = Quiz.query.get_or_404(quiz_id)

    if "chapter_id" in data:
        new_chapter = Chapter.query.get(int(data["chapter_id"]))
        if new_chapter:
            quiz.chapter_id = new_chapter.id
        else:
            return jsonify({"message": "Invalid chapter ID"}), 400

    if "date_of_quiz" in data:
        quiz.date_of_quiz = datetime.strptime(data["date_of_quiz"], "%Y-%m-%d")
    
    if "time_duration" in data:
        quiz.time_duration = data["time_duration"]
    
    if "remarks" in data:
        quiz.remarks = data["remarks"].strip()

    db.session.commit()
    return jsonify({"message": "Quiz updated successfully!"})


@admin_routes.route("/api/quizzes/<int:quiz_id>", methods=["DELETE"])
def delete_quiz(quiz_id):
    quiz = Quiz.query.get_or_404(quiz_id)
    db.session.delete(quiz)
    db.session.commit()
    return jsonify({"message": "Quiz deleted successfully!"})

#questions

#for adding ques
@admin_routes.route("/api/questions", methods=["POST"])
def add_question():
    data = request.get_json()

    if not all(k in data for k in ("quiz_id", "question_statement", "option1", "option2", "option3", "option4", "correct_option")):
        return jsonify({"message": "All fields are required!"}), 400

    new_question = Question(
        quiz_id=data["quiz_id"],
        question_statement=data["question_statement"].strip(),
        option1=data["option1"].strip(),
        option2=data["option2"].strip(),
        option3=data["option3"].strip(),
        option4=data["option4"].strip(),
        correct_option=int(data["correct_option"]),
    )
    db.session.add(new_question)
    db.session.commit()

    return jsonify({"message": "Question added successfully!", "id": new_question.id})

# API for getting question for a quiz
@admin_routes.route("/api/questions/<int:quiz_id>", methods=["GET"])
def get_questions(quiz_id):
    questions = Question.query.filter_by(quiz_id=quiz_id).all()

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

#edit a quest

@admin_routes.route("/api/questions/<int:question_id>", methods=["PUT"])
def edit_question(question_id):
    data = request.get_json()
    question = Question.query.get_or_404(question_id)

    if "question_statement" in data:
        question.question_statement = data["question_statement"].strip()
    if "option1" in data:
        question.option1 = data["option1"].strip()
    if "option2" in data:
        question.option2 = data["option2"].strip()
    if "option3" in data:
        question.option3 = data["option3"].strip()
    if "option4" in data:
        question.option4 = data["option4"].strip()
    if "correct_option" in data:
        question.correct_option = int(data["correct_option"])

    db.session.commit()
    return jsonify({"message": "Question updated successfully!"})


#deleting a question

@admin_routes.route("/api/questions/<int:question_id>", methods=["DELETE"])
def delete_question(question_id):
    question = Question.query.get_or_404(question_id)
    db.session.delete(question)
    db.session.commit()
    return jsonify({"message": "Question deleted successfully!"})


@admin_routes.route("/api/quizzes/by_chapter", methods=["GET"])
def get_quizzes_by_chapter():
    chapter_id = request.args.get("chapter_id")
    if not chapter_id:
        return jsonify([])

    quizzes = Quiz.query.filter_by(chapter_id=chapter_id).all()

    return jsonify([
        {
            "id": q.id,
            "date_of_quiz": q.date_of_quiz.strftime("%Y-%m-%d"),
            "time_duration": q.time_duration
        }
        for q in quizzes
    ])





@admin_routes.route('/admin/summary')
def admin_summary():
    if "admin_logged_in" not in session:
        return redirect("/")  # Redirect if not logged in
    
    response = make_response(render_template("admin_summary.html", admin_username=session.get("admin_username")))
    
    # Prevent browser from caching the page
    response.headers["Cache-Control"] = "no-store, no-cache, must-revalidate, max-age=0"
    response.headers["Pragma"] = "no-cache"
    response.headers["Expires"] = "0"

    return response

@admin_routes.route("/api/admin/summary", methods=["GET"])
def admin_summary_api():
    # Get Subject-wise Top Scores
    top_scores = (
        db.session.query(Subject.name, func.max(Score.total_score))
        .join(Chapter, Subject.id == Chapter.subject_id)
        .join(Quiz, Chapter.id == Quiz.chapter_id)
        .join(Score, Quiz.id == Score.quiz_id)
        .group_by(Subject.name)
        .all()
    )

    # Get Subject-wise User Attempts
    user_attempts = (
        db.session.query(Subject.name, func.count(Score.user_id.distinct()))
        .join(Chapter, Subject.id == Chapter.subject_id)
        .join(Quiz, Chapter.id == Quiz.chapter_id)
        .join(Score, Quiz.id == Score.quiz_id)
        .group_by(Subject.name)
        .all()
    )

    return jsonify({
        "top_scores": [{"subject": s[0], "score": s[1]} for s in top_scores],
        "user_attempts": [{"subject": s[0], "attempts": s[1]} for s in user_attempts]
    })
