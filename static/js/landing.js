document.addEventListener("DOMContentLoaded", function () {
    console.log("✅ DOM fully loaded. Running loadSubjects()...");

    document.getElementById("registerForm").addEventListener("submit", function (event) {
        event.preventDefault();
        const userData = {
            username: document.getElementById("regUsername").value,
            password: document.getElementById("regPassword").value,
            full_name: document.getElementById("fullName").value,
            qualification: document.getElementById("qualification").value,
            dob: document.getElementById("dob").value
        };
        fetch("/api/register", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(userData)
        })
        .then(response => response.json())
        .then(data  => {
            alert(data.message);
            document.getElementById("regUsername").value = "";
            document.getElementById("regPassword").value = "";
            document.getElementById("fullName").value = "";
            document.getElementById("qualification").value = "";
            document.getElementById("dob").value = "";
                
            })

            .catch(error => console.error("Error:", error));
    });

    document.getElementById("userLoginForm").addEventListener("submit", function (event) {
        event.preventDefault();
        const loginData = {
            username: document.getElementById("userUsername").value,
            password: document.getElementById("userPassword").value
        };
        fetch("/api/login/user", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(loginData)
        }).then(response => response.json())
        .then(data => {
            alert(data.message);
            if (data.redirect) {
                window.location.href = data.redirect;  // ✅ Redirect to user dashboard
            }
        })
            .catch(error => console.error("Error:", error));
    });

    document.getElementById("adminLoginForm").addEventListener("submit", function (event) {
        event.preventDefault();

        const loginData = {
            username: document.getElementById("adminUsername").value,
            password: document.getElementById("adminPassword").value
        };

        fetch("/api/login/admin", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(loginData)
        })
            .then(response => response.json())
            .then(data => {
                alert(data.message);  // Show message
                if (data.redirect) {
                    window.location.href = data.redirect;  // Redirect to admin dashboard
                }
            })
            .catch(error => console.error("Error:", error));
    });

    
    
    
    
   
    
    
    

});





