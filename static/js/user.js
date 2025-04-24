
function loadUserDashboard() {
    fetch("/api/user_attempted_quizzes")
    .then(response => response.json())
    .then(data => {
        let quizList = document.getElementById("quizList");
        quizList.innerHTML = "";

        data.quizzes.forEach(quiz => {
            let row = document.createElement("tr");
            row.innerHTML = `
                <td>${quiz.id}</td>
                <td>${quiz.chapter}</td>
                <td>${quiz.subject}</td>
                <td>${quiz.score}/${quiz.total_questions}</td>
                <td>
                    ${quiz.attempted ? '<span>✔ Attempted</span>' : `<button onclick="startQuiz(${quiz.id})">Start Quiz</button>`}
                </td>
            `;
            quizList.appendChild(row);
        });
    })
    .catch(error => console.error("❌ Error loading quizzes:", error));
}

// ✅ Load All Subjects with ID and Description and fetch them to frontend 
function loadSubjects() {
    fetch("/api/subjects")
    .then(response => response.json())
    .then(data => {
        console.log("Subjects API Response:", data);
        const subjectList = document.getElementById("subjectList");
        subjectList.innerHTML = "";

        data.forEach(subject => {
            const row = document.createElement("tr");
            row.innerHTML = `
                <td>${subject.id}</td>
                <td>${subject.name}</td>
                <td>${subject.description || "No description"}</td>
                <td><button onclick="loadChapters(${subject.id})">View Chapters</button></td>
            `;
            subjectList.appendChild(row);
        });
    })
    .catch(error => console.error("❌ Error loading subjects:", error));
}

// ✅ Load and fetch Chapters for Selected Subject (with ID) to frontend 
function loadChapters(subjectId) {
    fetch(`/api/chapters/by_subject?subject_id=${subjectId}`)
    .then(response => response.json())
    .then(data => {
        document.getElementById("chaptersSection").style.display = "block";
        const chapterList = document.getElementById("chapterList");
        chapterList.innerHTML = "";

        data.forEach(chapter => {
            const row = document.createElement("tr");
            row.innerHTML = `
                <td>${chapter.id}</td>
                <td>${chapter.name}</td>
                <td>${chapter.description || "No description"}</td>
                <td>${chapter.subject_id}</td>
                <td><button onclick="loadQuizzes(${chapter.id})">View Quizzes</button></td>
            `;
            chapterList.appendChild(row);
        });
    })
    .catch(error => console.error("❌ Error loading chapters:", error));
}

// ✅ Load and fetch Quizzes for Selected Chapter (with ID)
function loadQuizzes(chapterId) {
    fetch(`/api/quizzes/by_chapter?chapter_id=${chapterId}`)
    .then(response => response.json())
    .then(data => {
        document.getElementById("quizzesSection").style.display = "block";
        const quizList = document.getElementById("quizList");
        quizList.innerHTML = "";

        data.forEach(quiz => {
            const row = document.createElement("tr");
            row.innerHTML = `
                <td>${quiz.id}</td>
                <td>${quiz.chapter_id}</td>
                <td>${quiz.date_of_quiz}</td>
                <td>${quiz.time_duration}</td>
                <td>${quiz.remarks}</td>
                <td><button onclick="startQuiz(${quiz.id})">Start Quiz</button></td>
            `;
            quizList.appendChild(row);
        });
    })
    .catch(error => console.error("❌ Error loading quizzes:", error));
}


function startQuiz(quizId) {  //quiz starts in new window
    window.open(`/user/quiz/${quizId}`, "_blank", `width=${screen.width},height=${screen.height},fullscreen=yes`);
}

function startCountdown(timeStr) {
    let timeParts = timeStr.split(":");
    let hours = parseInt(timeParts[0]) || 0;
    let minutes = parseInt(timeParts[1]) || 0;
    let seconds = parseInt(timeParts[2]) || 0; // ✅ timer correctly handling seconds

    let timerElement = document.getElementById("timer");

    let countdown = setInterval(() => {
        let hrs = Math.floor(hours);
        let mins = Math.floor(minutes);
        let secs = Math.floor(seconds);
        
        // ✅ Display in HH:MM:SS format
        timerElement.innerHTML = `Time Left: ${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;

        if (hrs === 0 && mins === 0 && secs === 0) {
            clearInterval(countdown);
            submitQuiz();  // ✅Quiz will Auto-submit when time runs out
        }

        if (secs === 0) {
            if (mins === 0) {
                if (hrs > 0) {
                    hrs--;
                    mins = 59;
                }
            } else {
                mins--;
            }
            secs = 59;
        } else {
            secs--;
        }

        // ✅ Update the variables for next iteration
        hours = hrs;
        minutes = mins;
        seconds = secs;
    }, 1000);
}



let questions = [];
let currentQuestionIndex = 0;
let userAnswers = {}; // Store user-selected answers
let questionStatus = {}; // ✅ Store question statuses

function loadQuestions(quizId) {
    fetch(`/api/questions/${quizId}`)
    .then(response => response.json())
    .then(data => {
        console.log("Questions API Response:", data);

        if (!Array.isArray(data) || data.length === 0) {
            console.error("❌ No questions found for this quiz.");
            document.getElementById("questionContainer").innerHTML = "<p>No questions available for this quiz.</p>";
            return;
        }
        questions = data;

        fetch(`/api/question_status/${quizId}`)
        .then(response => response.json())
        .then(statusData => {
            statusData.forEach(q => {
                questionStatus[q.question_id] = q.status || "Not Visited";
            });

            displayQuestion(0); // ✅ Start with the first question
            updateStatusPanel();
        })
        .catch(error => console.error("❌ Error loading question status:", error));
    })
    .catch(error => console.error("❌ Error loading questions:", error));
}


// ✅ Update status panel dynamically
function updateStatusPanel() {
    let container = document.getElementById("statusContainer");
    container.innerHTML = "";

    questions.forEach((q, index) => {
        let btn = document.createElement("button");
        btn.innerText = index + 1;
        let status = questionStatus[q.id] || "Not Visited"; // Default to "Not Visited"
        btn.className = `status-${status.replace(/ /g, "-")}`; 
        btn.onclick = () => displayQuestion(index); // ✅ Clicking updates `currentQuestionIndex`
        container.appendChild(btn);
    });
}




// ✅ Display one question at a time and update `currentQuestionIndex`
function displayQuestion(index) {
    if (index < 0 || index >= questions.length) return;

    currentQuestionIndex = index;  // ✅ Set current index when jumping

    const questionContainer = document.getElementById("questionContainer");
    const question = questions[index];

    questionContainer.innerHTML = `
        <p><b>Q${index + 1}:</b> ${question.question_statement}</p>
        <input type="radio" name="q${question.id}" value="1" ${userAnswers[question.id] === 1 ? "checked" : ""}> ${question.option1} <br>
        <input type="radio" name="q${question.id}" value="2" ${userAnswers[question.id] === 2 ? "checked" : ""}> ${question.option2} <br>
        <input type="radio" name="q${question.id}" value="3" ${userAnswers[question.id] === 3 ? "checked" : ""}> ${question.option3} <br>
        <input type="radio" name="q${question.id}" value="4" ${userAnswers[question.id] === 4 ? "checked" : ""}> ${question.option4} <br>

        <button onclick="submitResponse(${question.id})" id="dynamicBtn1">Submit Response</button>
        <button onclick="clearResponse(${question.id})" id="dynamicBtn2">Clear Response</button>
        <button onclick="markForReview(${question.id})" id="dynamicBtn3">Mark for Review</button>
    `;
    let btn1 = document.getElementById("dynamicBtn1");
btn1.style.backgroundColor = "Green";
btn1.style.color = "white";
btn1.style.padding = "5px";
btn1.style.borderRadius = "5px";
btn1.style.cursor = "pointer";

let btn2 = document.getElementById("dynamicBtn2");
btn2.style.backgroundColor = "brown";
btn2.style.color = "white";
btn2.style.padding = "5px";
btn2.style.borderRadius = "5px";
btn2.style.cursor = "pointer";

let btn3 = document.getElementById("dynamicBtn3");
btn3.style.backgroundColor = "Yellow";
btn3.style.color = "black";
btn3.style.padding = "5px";
btn3.style.borderRadius = "5px";
btn3.style.cursor = "pointer";
    updateButtons(index);
}

// ✅ Store answer and mark as "Answered"
function submitResponse(questionId) {
    const selectedOption = document.querySelector(`input[name="q${questionId}"]:checked`);
    
    if (selectedOption) {
        userAnswers[questionId] = parseInt(selectedOption.value);
        questionStatus[questionId] = "Answered";
        console.log(`✅ Answer submitted for Q${questionId}: ${userAnswers[questionId]}`);
    } else {
        alert("❌ Please select an answer before submitting.");
    }

    updateStatusPanel();
    sendStatusUpdate(questionId, questionStatus[questionId]); // ✅ Send update to backend
}

// ❌ Clear answer and mark as "Not Answered"
function clearResponse(questionId) {
    document.querySelectorAll(`input[name="q${questionId}"]`).forEach(input => input.checked = false);
    delete userAnswers[questionId];
    questionStatus[questionId] = "Not-Answered";

    console.log(`🗑️ Cleared response for Q${questionId}`);
    updateStatusPanel();
    sendStatusUpdate(questionId, questionStatus[questionId]); // ✅ Send update to backend
}

// ✅ Mark Question for Review
function markForReview(questionId) {
    
   
        questionStatus[questionId] = "Marked-for-Review";
      
    

    updateStatusPanel();
    sendStatusUpdate(questionId, questionStatus[questionId]); // ✅ Send update to backend
}

// ✅ Move to next question
function nextQuestion() {
    if (currentQuestionIndex < questions.length - 1) {
        displayQuestion(++currentQuestionIndex);
    }
}

// ✅ Move to previous question
function prevQuestion() {
    if (currentQuestionIndex > 0) {
        displayQuestion(--currentQuestionIndex);
    }
}


function saveAnswer() {
    const questionId = questions[currentQuestionIndex].id;
    const selectedOption = document.querySelector(`input[name="q${questionId}"]:checked`);

    if (selectedOption) {
        userAnswers[questionId] = parseInt(selectedOption.value);
        questionStatus[questionId] = "Answered";
    } else {
        questionStatus[questionId] = "Not Answered";
    }

    updateStatusPanel();
    
}

// ✅ Function to send status update to backend
function sendStatusUpdate(questionId, status) {
       
    fetch(`/api/question_status/update`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
           
            question_id: questionId,
            status: status
        })
    })
    .then(response => response.json())
    .then(data => console.log("✅ Status updated:", data))
    .catch(error => console.error("❌ Error updating status:", error));
}





// ✅ Update button visibility
function updateButtons(index) {
    document.getElementById("prevButton").style.display = index > 0 ? "inline-block" : "none";
    document.getElementById("nextButton").style.display = index < questions.length - 1 ? "inline-block" : "none";
    document.getElementById("submitButton").style.display = index === questions.length - 1 ? "inline-block" : "none";
}

// ✅ Submit Quiz Function
function submitQuiz() {
    saveAnswer(); // Ensure last answer is saved

    // ✅ Get current date & time from user's system
    let userTimestamp = new Date().toISOString();  // Converts to "YYYY-MM-DDTHH:MM:SSZ"

    fetch(`/api/submit_quiz/${quizId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers: userAnswers, timestamp: userTimestamp })
    })
    .then(response => response.json())
    .then(data => {
        alert(`Quiz submitted! Your Score: ${data.total_score}`);
        loadUserDashboard();
        window.close();  // ✅ Close quiz window after submission
    })
    .catch(error => console.error("❌ Error submitting quiz:", error));
}

// ❌ Leave Quiz Function (Deletes Question Status)
function leaveQuiz() {
    if (confirm("Are you sure you want to leave the quiz? Your answers will NOT be saved.")) {
        fetch(`/api/question_status/clear/${quizId}`, { method: "POST" })
        .then(response => response.json())
        .then(data => {
            console.log("❌ Question statuses cleared:", data);
            window.close();  // ✅ Close the quiz window
        })
        .catch(error => console.error("❌ Error clearing question statuses:", error));
    }
}

