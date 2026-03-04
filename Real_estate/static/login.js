function togglePassword() {
    const passInput = document.getElementById("password");
    if (!passInput) return;
    passInput.type = passInput.type === "password" ? "text" : "password";
}

function openForgotPasswordEmail(event) {
    if (event && typeof event.preventDefault === "function") {
        event.preventDefault();
    }

    const userField = document.getElementById("loginUserField");
    const userValue = userField ? String(userField.value || "").trim() : "";
    const supportEmail = "admin@gmail.com";
    const subject = "Password Reset Request";
    const bodyLines = [
        "Hello Support Team,",
        "",
        "Please help me reset my account password.",
        "",
        "User/Email: " + (userValue || "(not provided)"),
        "",
        "Thanks."
    ];

    const mailto =
        "mailto:" +
        encodeURIComponent(supportEmail) +
        "?subject=" +
        encodeURIComponent(subject) +
        "&body=" +
        encodeURIComponent(bodyLines.join("\n"));

    window.location.href = mailto;
    return false;
}
