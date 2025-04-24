document.addEventListener("DOMContentLoaded", function () {
    console.log("✅ DOM fully loaded. Running loadSubjects()...");

        
     
    

    loadSubjects();
    loadChapters();
    loadSubjectsForDropdown()
    
   //add subject

     const addSubjectForm = document.getElementById("addSubjectForm");
    if (addSubjectForm) {
        addSubjectForm.addEventListener("submit", function (event) {
            event.preventDefault();

            const subjectName = document.getElementById("newSubjectName").value.trim();
            const subjectDescription = document.getElementById("newSubjectDescription").value.trim();

            if (subjectName === "") {
                alert("Please enter a subject name!");
                return;
            }

            fetch("/api/subjects", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name: subjectName, description: subjectDescription })
            })
            .then(response => response.json())
            .then(data => {
                alert(data.message);
                console.log("✅ Subject added:", data);

                loadSubjects();

                // Clear input fields
                document.getElementById("newSubjectName").value = "";
                document.getElementById("newSubjectDescription").value = "";
            })
            .catch(error => console.error("❌ Error adding subject:", error));
        });
    }

    document.getElementById("addChapterForm").addEventListener("submit", function (event) {
        event.preventDefault();
    
        const chapterName = document.getElementById("newChapterName").value.trim();
        const chapterDescription = document.getElementById("newChapterDescription").value.trim();
        const subjectId = document.getElementById("chapterSubjectSelect").value;
    
        if (chapterName === "" || subjectId === "") {
            alert("Please enter a chapter name and select a subject!");
            return;
        }
    
        fetch("/api/chapters", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name: chapterName, description: chapterDescription, subject_id: subjectId })
        })
        .then(response => response.json())
        .then(data => {
            alert(data.message);
            loadChapters();  // Refresh the chapter list dynamically

            // Clear input fields
            document.getElementById("newSubjectName").value = "";
            document.getElementById("newSubjectDescription").value = "";
        })
        .catch(error => console.error("❌ Error adding chapter:", error));
    });
    
    
    

});


// Load subjects from backend and fetching subjects
function loadSubjects() {
    const subjectList = document.getElementById("subjectList");
    
    if (!subjectList) {
        console.error("Error: subjectList element not found!");
        return;
    }

    fetch("/api/subjects")
    .then(response => response.json())
    .then(data => {
        subjectList.innerHTML = "";  // Clear previous list

        (data.subjects || data).forEach(subject => {
            const row = document.createElement("tr");
            row.innerHTML = `
                <td><span class="subject-name">${subject.name}</span></td>
                <td><span class="subject-description">${subject.description || "No description"}</span></td>
                <td>
                    <button onclick="editSubject(${subject.id}, '${subject.name}', '${subject.description || ""}')">Edit</button>
                    <button onclick="deleteSubject(${subject.id})">Delete</button>
                </td>
            `;
            subjectList.appendChild(row);
        });
    })
    .catch(error => console.error("Error loading subjects:", error));
}

// Function to Edit Subject
function editSubject(subjectId, oldName, oldDescription) {
    const newName = prompt("Edit Subject Name:", oldName);
    const newDescription = prompt("Edit Description:", oldDescription);

    if (newName && newName.trim() !== "") {
        fetch(`/api/subjects/${subjectId}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name: newName, description: newDescription })
        })
        .then(response => response.json())
        .then(data => {
            alert(data.message);
            location.reload();  // Reload page to update the table
        })
        .catch(error => console.error("❌ Error updating subject:", error));
    }
}

// Function to Delete Subject
function deleteSubject(subjectId) {
    if (confirm("Are you sure you want to delete this subject?")) {
        fetch(`/api/subjects/${subjectId}`, { method: "DELETE" })
        .then(response => response.json())
        .then(data => {
            alert(data.message);
            location.reload();  // Reload page to update the table
        })
        .catch(error => console.error("❌ Error deleting subject:", error));
    }
}

function loadChapters() {        //fetching chapters
    fetch("/api/chapters")
    .then(response => response.json())
    .then(data => {
        console.log("✅ Chapters loaded:", data);
        const chapterList = document.getElementById("chapterList");
        chapterList.innerHTML = "";

        data.forEach(chapter => {
            const row = document.createElement("tr");
            row.innerHTML = `
    <td>${chapter.name}</td>
    <td>${chapter.description || "No description"}</td>
    <td>${chapter.subject_name}</td>
    <td>
        <button onclick="editChapter(${chapter.id}, '${chapter.name}', '${chapter.description}', ${chapter.subject_id})">Edit</button>
        <button onclick="deleteChapter(${chapter.id})">Delete</button>
    </td>
`;
            chapterList.appendChild(row);
        });
    })
    .catch(error => console.error("❌ Error loading chapters:", error));
}

function loadSubjectsForDropdown() {
    fetch("/api/subjects")
    .then(response => response.json())
    .then(data => {
        console.log("✅ Subjects API response:", data);  // Debugging log
        
        // ✅ No need to extract "subjects" if API returns a list directly
        const subjects = Array.isArray(data) ? data : data.subjects;

        if (!subjects) {
            console.error("🚨 Error: No subjects found in API response!");
            return;
        }

        const subjectSelect = document.getElementById("chapterSubjectSelect");
        subjectSelect.innerHTML = '<option value="">Select Subject</option>';

        if (subjects.length === 0) {
            console.warn("⚠️ Warning: No subjects found!");
        }

        subjects.forEach(subject => {
            const option = document.createElement("option");
            option.value = subject.id;
            option.textContent = subject.name;
            subjectSelect.appendChild(option);
        });
    })
    .catch(error => console.error("❌ Error loading subjects:", error));
}



function editChapter(chapterId, oldName, oldDescription, oldSubjectId) {
    const newName = prompt("Edit Chapter Name:", oldName);
    const newDescription = prompt("Edit Description:", oldDescription);

    if (!newName || newName.trim() === "") {
        alert("Chapter name cannot be empty!");
        return;
    }

    // ✅ Fetch subjects and return the promise
    return fetch("/api/subjects")
    .then(response => {
        if (!response.ok) {
            throw new Error(`Server Error: ${response.status}`); // ✅ Handle failed API call
        }
        return response.json();
    })
    .then(data => {
        console.log("📌 Subjects API Response:", data);

        // ✅ Ensure 'subjects' key exists
        const subjects = data.subjects || data;
        if (!Array.isArray(subjects) || subjects.length === 0) {
            alert("No subjects available to choose from.");
            return Promise.reject("No subjects found.");  // ✅ Stop execution
        }

        let subjectOptions = "";
        subjects.forEach(subject => {
            subjectOptions += `<option value="${subject.id}" ${subject.id == oldSubjectId ? "selected" : ""}>${subject.name}</option>`;
        });

        return promptDropdown("Select a new subject:", subjectOptions);  // ✅ Wait for selection
    })
    .then(newSubjectId => {
        if (!newSubjectId) return Promise.reject("User cancelled selection.");

        console.log("📤 Sending update request:", {
            name: newName,
            description: newDescription,
            subject_id: newSubjectId
        });

        return fetch(`/api/chapters/${chapterId}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name: newName, description: newDescription, subject_id: parseInt(newSubjectId) })
        });
    })
    .then(response => {
        if (!response.ok) {
            throw new Error(`Update Failed: ${response.status}`);
        }
        return response.json();
    })
    .then(data => {
        alert(data.message);
        console.log("✅ Chapter updated successfully:", data);
        loadChapters();  // ✅ Refresh the chapter list
    })
    .catch(error => console.error("❌ Error updating chapter:", error));
}



// Helper function to create a dropdown for selecting subjects
function promptDropdown(message, options) {
    return new Promise((resolve) => {
        // Create wrapper (popup container)
        const wrapper = document.createElement("div");
        wrapper.style.position = "fixed";
        wrapper.style.top = "50%";
        wrapper.style.left = "50%";
        wrapper.style.transform = "translate(-50%, -50%)";
        wrapper.style.background = "#fff";
        wrapper.style.padding = "20px";
        wrapper.style.borderRadius = "8px";  // ✅ Rounded corners
        wrapper.style.boxShadow = "0px 4px 15px rgba(0, 0, 0, 0.2)";  // ✅ Soft shadow
        wrapper.style.zIndex = "1000";
        wrapper.style.minWidth = "250px";
        wrapper.style.textAlign = "center"; // ✅ Center align text

        // Create label
        const label = document.createElement("label");
        label.innerText = message;
        label.style.display = "block";
        label.style.marginBottom = "10px";
        label.style.fontSize = "16px";  // ✅ Improve font size
        wrapper.appendChild(label);

        // Create select dropdown
        const select = document.createElement("select");
        select.innerHTML = options;
        select.style.width = "100%";
        select.style.padding = "8px";
        select.style.border = "1px solid #ccc";
        select.style.borderRadius = "4px"; // ✅ Rounded edges for dropdown
        select.style.fontSize = "14px";
        wrapper.appendChild(select);

        // Create confirm button
        const confirmButton = document.createElement("button");
        confirmButton.textContent = "Confirm";
        confirmButton.style.display = "block";
        confirmButton.style.width = "100%";
        confirmButton.style.marginTop = "15px";
        confirmButton.style.padding = "10px";
        confirmButton.style.background = "#007BFF"; // ✅ Modern blue color
        confirmButton.style.color = "#fff";
        confirmButton.style.border = "none";
        confirmButton.style.borderRadius = "4px"; // ✅ Button with rounded edges
        confirmButton.style.fontSize = "14px";
        confirmButton.style.cursor = "pointer";
        confirmButton.style.transition = "background 0.3s"; // ✅ Smooth hover effect

        confirmButton.onmouseover = () => {
            confirmButton.style.background = "#0056b3";  // ✅ Darker blue on hover
        };

        confirmButton.onmouseleave = () => {
            confirmButton.style.background = "#007BFF";  // ✅ Reset color
        };

        confirmButton.onclick = () => {
            resolve(select.value);
            document.body.removeChild(wrapper);
        };

        // Append elements to wrapper
        wrapper.appendChild(confirmButton);
        document.body.appendChild(wrapper);
    });
}



function deleteChapter(chapterId) {
    if (confirm("Are you sure you want to delete this chapter?")) {
        fetch(`/api/chapters/${chapterId}`, { method: "DELETE" })
        .then(response => response.json())
        .then(data => {
            alert(data.message);
            loadChapters();  // Refresh the list
        })
        .catch(error => console.error("❌ Error deleting chapter:", error));
    }
}



