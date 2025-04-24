document.addEventListener("DOMContentLoaded", function () {
    document.getElementById("newQuizSubject").addEventListener("change", function () {
        loadChaptersBySubject("newQuizChapter", this.value);  // ✅ Use renamed function
    });

    document.getElementById("filterSubject").addEventListener("change", function () {
        loadChaptersBySubject("filterChapter", this.value);
    });

    loadQuizzes();
});


// ✅ Function to fetch and Load Chapters Based on Selected Subject
function loadChaptersBySubject(chapterSelectId, subjectId) {  
    const chapterSelect = document.getElementById(chapterSelectId);
    chapterSelect.innerHTML = '<option value="">Select Chapter</option>';

    if (!subjectId) return;  // If no subject selected, do nothing

    fetch(`/api/chapters/by_subject?subject_id=${subjectId}`)  // ✅ Use new API route
        .then(response => response.json())
        .then(data => {
            data.forEach(chapter => {
                const option = document.createElement("option");
                option.value = chapter.id;
                option.textContent = chapter.name;
                chapterSelect.appendChild(option);
            });
        })
        .catch(error => console.error("❌ Error loading chapters:", error));
}



// ✅ Load Quizzes with Filters
function loadQuizzes() {
    const subjectId = document.getElementById("filterSubject").value;
    const chapterId = document.getElementById("filterChapter").value;
    let query = `/api/quizzes`;

    if (chapterId) {
        query += `?chapter_id=${chapterId}`;
    } else if (subjectId) {
        query += `?subject_id=${subjectId}`;
    }

    fetch(query)
        .then(response => response.json())
        .then(data => {
            const quizList = document.getElementById("quizList");
            quizList.innerHTML = "";

            if (data.length === 0) {
                quizList.innerHTML = `<tr><td colspan="6">No quizzes found</td></tr>`;
                return;
            }

            data.forEach(quiz => {
                const row = document.createElement("tr");
                row.innerHTML = `
                <td>${quiz.chapter_name}</td>
                <td>${quiz.subject_name}</td>
                <td>${quiz.date_of_quiz}</td>
                <td>${quiz.time_duration}</td>
                <td>${quiz.remarks}</td>
                <td>
                    <button onclick="editQuiz(${quiz.id}, '${quiz.chapter_name}', '${quiz.subject_name}', '${quiz.date_of_quiz}', '${quiz.time_duration}', '${quiz.remarks}')">Edit</button>
                    <button onclick="deleteQuiz(${quiz.id})">Delete</button>
                    <button onclick="toggleQuestions(${quiz.id})">Manage Questions</button> 
                </td>
            `;

               // Add a hidden row for managing questions
            const questionRow = document.createElement("tr");
            questionRow.id = `questions-${quiz.id}`;
            questionRow.style.display = "none";  // Hide by default
            questionRow.innerHTML = `
                <td colspan="6">
                    <h3>Questions for ${quiz.date_of_quiz}</h3>
                    <table border="1" id="questionTable-${quiz.id}">
                        <thead>
                            <tr>
                                <th>Question</th>
                                <th>Options</th>
                                <th>Correct Option</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody></tbody>
                    </table>
                    <button onclick="showAddQuestionForm(${quiz.id})">Add Question</button>
                    <div id="addQuestionForm-${quiz.id}" style="display: none;">
                        <textarea id="newQuestion-${quiz.id}" placeholder="Enter question"></textarea>
                        <input type="text" id="newOption1-${quiz.id}" placeholder="Option 1">
                        <input type="text" id="newOption2-${quiz.id}" placeholder="Option 2">
                        <input type="text" id="newOption3-${quiz.id}" placeholder="Option 3">
                        <input type="text" id="newOption4-${quiz.id}" placeholder="Option 4">
                        <input type="number" id="newCorrectOption-${quiz.id}" min="1" max="4" placeholder="Correct Option (1-4)">
                        <button onclick="addQuestion(${quiz.id})">Submit</button>
                    </div>
                </td>
            `;
              
                quizList.appendChild(row);
                quizList.appendChild(questionRow);
            });
        })
        .catch(error => console.error("❌ Error loading quizzes:", error));
}


// ✅ Add a New Quiz
function addQuiz() {
    const chapterId = document.getElementById("newQuizChapter").value;
    const dateOfQuiz = document.getElementById("quizDate").value;
    const timeDuration = document.getElementById("quizTimeDuration").value;
    const remarks = document.getElementById("quizRemarks").value;

    if (!chapterId || !dateOfQuiz || !timeDuration) {
        alert("Please fill in all fields!");
        return;
    }

    fetch("/api/quizzes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chapter_id: chapterId, date_of_quiz: dateOfQuiz, time_duration: timeDuration, remarks: remarks })
    })
        .then(response => response.json())
        .then(data => {
            alert(data.message);
            loadQuizzes();
        // Clear input fields
        document.getElementById("newQuizChapter").value = "";
        document.getElementById("quizDate").value = "";
        document.getElementById("quizTimeDuration").value = "";
        document.getElementById("quizRemarks").value = "";
        
        
            
        })
        .catch(error => console.error("❌ Error adding quiz:", error));
}

function editQuiz(quizId, oldChapterId, oldSubjectId, oldDate, oldTime, oldRemarks) {
    const newDate = prompt("Edit Quiz Date (YYYY-MM-DD):", oldDate);
    const newTime = prompt("Edit Time Duration (HH:MM):", oldTime);
    const newRemarks = prompt("Edit Remarks:", oldRemarks);

    if (!newDate || !newTime) {
        alert("Date and Time are required!");
        return;
    }

    // Fetch subjects and allow selection
    fetch("/api/subjects_quiz")
        .then(response => {
            if (!response.ok) {
                throw new Error(`Server responded with ${response.status}`);
            }
            return response.json();
        })
        .then(subjects => {
            if (!Array.isArray(subjects)) {  // ✅ Check if API response is an array
                throw new Error("API did not return an array");
            }

            let subjectOptions = subjects.map(subject =>
                `<option value="${subject.id}" ${subject.id == oldSubjectId ? "selected" : ""}>${subject.name}</option>`
            ).join("");

            return promptDropdown("Select a new subject:", subjectOptions);
        })
        .then(newSubjectId => {
            if (!newSubjectId) return Promise.reject("No subject selected");

            // Fetch chapters for selected subject
            return fetch(`/api/chapters/by_subject?subject_id=${newSubjectId}`)  // ✅ Load only related chapters
                .then(response => response.json())
                .then(chapters => {
                    let chapterOptions = chapters.map(chapter =>
                        `<option value="${chapter.id}" ${chapter.id == oldChapterId ? "selected" : ""}>${chapter.name}</option>`
                    ).join("");

                    return promptDropdown("Select a new chapter:", chapterOptions)
                        .then(newChapterId => ({ newSubjectId, newChapterId }));
                });
        })
        .then(({ newSubjectId, newChapterId }) => {
            if (!newChapterId) return Promise.reject("No chapter selected");

            // Send update request
            return fetch(`/api/quizzes/${quizId}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    chapter_id: parseInt(newChapterId),
                    date_of_quiz: newDate,
                    time_duration: newTime,
                    remarks: newRemarks
                })
            });
        })
        .then(response => response.json())
        .then(data => {
            alert(data.message);
            loadQuizzes();
        })
        .catch(error => console.error("❌ Error updating quiz:", error));
}


// ✅ Helper function to create and show a dropdown
function promptDropdown(message, options) {
    return new Promise((resolve, reject) => {
        // Create wrapper
        const wrapper = document.createElement("div");
        wrapper.style.position = "fixed";
        wrapper.style.top = "50%";
        wrapper.style.left = "50%";
        wrapper.style.transform = "translate(-50%, -50%)";
        wrapper.style.background = "white";
        wrapper.style.padding = "20px";
        wrapper.style.border = "1px solid black";
        wrapper.style.boxShadow = "2px 2px 10px rgba(0,0,0,0.2)";
        wrapper.style.zIndex = "1000";

        // Create label
        const label = document.createElement("label");
        label.innerText = message;
        wrapper.appendChild(label);

        // Create select dropdown
        const select = document.createElement("select");
        select.innerHTML = options;
        wrapper.appendChild(select);

        // Create confirm button
        const confirmButton = document.createElement("button");
        confirmButton.textContent = "Confirm";
        confirmButton.style.display = "block";
        confirmButton.style.marginTop = "10px";
        confirmButton.onclick = () => {
            resolve(select.value);
            document.body.removeChild(wrapper);
        };

        // Append elements to wrapper
        wrapper.appendChild(confirmButton);
        document.body.appendChild(wrapper);
    });
}


function deleteQuiz(quizId) {
    if (confirm("Are you sure you want to delete this quiz?")) {
        fetch(`/api/quizzes/${quizId}`, { method: "DELETE" })
            .then(response => response.json())
            .then(data => {
                alert(data.message);
                loadQuizzes();
            })
            .catch(error => console.error("❌ Error deleting quiz:", error));
    }
}


function toggleQuestions(quizId) {
    const questionRow = document.getElementById(`questions-${quizId}`);
    
    if (questionRow.style.display === "none") {
        questionRow.style.display = "table-row";  // Show questions
        loadQuestions(quizId);
    } else {
        questionRow.style.display = "none";  // Hide questions
    }
}

// ✅ Function to Load and fetch Questions for a Specific Quiz
function loadQuestions(quizId) {
    fetch(`/api/questions/${quizId}`)
    .then(response => response.json())
    .then(data => {
        const questionTable = document.getElementById(`questionTable-${quizId}`).querySelector("tbody");
        questionTable.innerHTML = "";

        data.forEach(question => {
            const row = document.createElement("tr");
            row.innerHTML = `
                <td>${question.question_statement}</td>
                <td>
                    1) ${question.option1}<br>
                    2) ${question.option2}<br>
                    3) ${question.option3}<br>
                    4) ${question.option4}
                </td>
                <td>${question.correct_option}</td>
                <td>
                    <button onclick="editQuestion(${question.id}, ${quizId})">Edit</button>
                    <button onclick="deleteQuestion(${question.id}, ${quizId})">Delete</button>
                </td>
            `;
            questionTable.appendChild(row);
        });
    })
    .catch(error => console.error("❌ Error loading questions:", error));
}

function showAddQuestionForm(quizId) {
    document.getElementById(`addQuestionForm-${quizId}`).style.display = "block";
}

function addQuestion(quizId) {
    const statement = document.getElementById(`newQuestion-${quizId}`).value.trim();
    const option1 = document.getElementById(`newOption1-${quizId}`).value.trim();
    const option2 = document.getElementById(`newOption2-${quizId}`).value.trim();
    const option3 = document.getElementById(`newOption3-${quizId}`).value.trim();
    const option4 = document.getElementById(`newOption4-${quizId}`).value.trim();
    const correctOption = document.getElementById(`newCorrectOption-${quizId}`).value;

    if (!statement || !option1 || !option2 || !option3 || !option4 || !correctOption) {
        alert("All fields are required!");
        return;
    }

    fetch("/api/questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
            quiz_id: quizId, 
            question_statement: statement, 
            option1, 
            option2, 
            option3, 
            option4, 
            correct_option: correctOption 
        })
    })
    .then(response => response.json())
    .then(data => {
        alert(data.message);
        loadQuestions(quizId);

        
    })
    .catch(error => console.error("❌ Error adding question:", error));
}


function editQuestion(questionId, quizId) {
    const newStatement = prompt("Edit Question:");
    const newOption1 = prompt("Edit Option 1:");
    const newOption2 = prompt("Edit Option 2:");
    const newOption3 = prompt("Edit Option 3:");
    const newOption4 = prompt("Edit Option 4:");
    const newCorrectOption = prompt("Edit Correct Option (1-4):");

    if (!newStatement || !newOption1 || !newOption2 || !newOption3 || !newOption4 || !newCorrectOption) {
        alert("All fields are required!");
        return;
    }

    fetch(`/api/questions/${questionId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
            question_statement: newStatement, 
            option1: newOption1, 
            option2: newOption2, 
            option3: newOption3, 
            option4: newOption4, 
            correct_option: newCorrectOption 
        })
    })
    .then(response => response.json())
    .then(data => {
        alert(data.message);
        loadQuestions(quizId);
    })
    .catch(error => console.error("❌ Error updating question:", error));
}

function deleteQuestion(questionId, quizId) {
    if (confirm("Are you sure you want to delete this question?")) {
        fetch(`/api/questions/${questionId}`, { method: "DELETE" })
        .then(response => response.json())
        .then(data => {
            alert(data.message);
            loadQuestions(quizId);
        })
        .catch(error => console.error("❌ Error deleting question:", error));
    }
}
