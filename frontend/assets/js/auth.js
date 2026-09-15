/* ============================================================
   ImoleWrites Authentication
============================================================ */

document.addEventListener("DOMContentLoaded", () => {

    console.log("auth.js loaded");

    /* ================= LOGIN ================= */

    const loginForm = document.getElementById("loginForm");

    if (loginForm) {

        console.log("Login form found");

        loginForm.addEventListener("submit", async function (e) {

            e.preventDefault();

            console.log("Login submitted");

            const email = document.getElementById("email").value.trim();
            const password = document.getElementById("password").value;

            const button = document.getElementById("loginBtn");

            button.disabled = true;
            button.innerHTML = "Logging in...";

            try {

                const result = await API.login(email, password);

                console.log("Login success:", result);

                localStorage.setItem("imole-token", result.access_token);

                window.location.href = "../app/dashboard.html";

            } catch (err) {

                console.error(err);

                alert(
                    err.body?.detail ||
                    "Login failed."
                );

            } finally {

                button.disabled = false;
                button.innerHTML = "Log in";

            }

        });

    }

    /* ================= REGISTER ================= */

    const registerForm = document.getElementById("registerForm");

    if (registerForm) {

        console.log("Register form found");

        registerForm.addEventListener("submit", async function (e) {

            e.preventDefault();

            const first =
                document.getElementById("fn").value.trim();

            const last =
                document.getElementById("ln").value.trim();

            const email =
                document.getElementById("email").value.trim();

            const password =
                document.getElementById("password").value;

            const button =
                document.getElementById("registerBtn");

            button.disabled = true;
            button.innerHTML = "Creating account...";

            try {

                const result = await API.register({

                    full_name: first + " " + last,

                    email,

                    password

                });

                console.log("Register success:", result);

                alert("Account created successfully.");

                window.location.href = "login.html";

            } catch (err) {

                console.error(err);

                alert(
                    err.body?.detail ||
                    "Registration failed."
                );

            } finally {

                button.disabled = false;
                button.innerHTML = "Create free account";

            }

        });

    }

});