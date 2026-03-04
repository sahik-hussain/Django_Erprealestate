function activateAgentTabByTarget(targetId) {
    const tabs = document.querySelectorAll(".tabs .tab[data-target]");
    tabs.forEach((tab) => {
        const tabTarget = tab.getAttribute("data-target");
        tab.classList.toggle("active", tabTarget === targetId);
    });
}

function setStepRequired(stepEl, enabled) {
    if (!stepEl) return;
    const requiredControls = stepEl.querySelectorAll("input, select, textarea");
    requiredControls.forEach((el) => {
        if (enabled) {
            if (el.dataset.wasRequired === "1") {
                el.setAttribute("required", "required");
            }
        } else if (el.hasAttribute("required")) {
            el.dataset.wasRequired = "1";
            el.removeAttribute("required");
        }
    });
}

function openAgentSection(targetId) {
    const formCard = document.getElementById("agentFormCard");
    const agentsCard = document.getElementById("agentsInfo");
    const personalStep = document.getElementById("personalStep");
    const professionalStep = document.getElementById("professionalStep");

    if (!formCard || !agentsCard || !personalStep || !professionalStep) return;

    if (targetId === "professionalInfo") {
        formCard.style.display = "";
        agentsCard.style.display = "none";
        personalStep.classList.remove("active");
        professionalStep.classList.add("active");
        setStepRequired(personalStep, false);
        setStepRequired(professionalStep, true);
    } else if (targetId === "agentsInfo") {
        formCard.style.display = "none";
        agentsCard.style.display = "";
        personalStep.classList.remove("active");
        professionalStep.classList.remove("active");
        setStepRequired(personalStep, false);
        setStepRequired(professionalStep, false);
    } else {
        formCard.style.display = "";
        agentsCard.style.display = "none";
        personalStep.classList.add("active");
        professionalStep.classList.remove("active");
        setStepRequired(personalStep, true);
        setStepRequired(professionalStep, false);
        targetId = "personalInfo";
    }

    activateAgentTabByTarget(targetId);

    if (history.replaceState) {
        history.replaceState(null, "", "#" + targetId);
    } else {
        window.location.hash = targetId;
    }
}

function bindAgentDetailToggles() {
    const detailButtons = document.querySelectorAll(".view-agent-details-btn");
    detailButtons.forEach((button) => {
        button.addEventListener("click", function () {
            const targetId = button.getAttribute("data-target");
            const targetRow = document.getElementById(targetId);
            if (!targetRow) return;

            const willOpen = !targetRow.classList.contains("open");
            document.querySelectorAll(".agent-details-row.open").forEach((row) => {
                row.classList.remove("open");
            });
            detailButtons.forEach((b) => b.setAttribute("aria-expanded", "false"));

            if (willOpen) {
                targetRow.classList.add("open");
                button.setAttribute("aria-expanded", "true");
            }
        });
    });
}

document.addEventListener("DOMContentLoaded", function () {
    const tabs = document.querySelectorAll(".tabs .tab[data-target]");
    tabs.forEach((tab) => {
        tab.addEventListener("click", function (event) {
            event.preventDefault();
            const targetId = tab.getAttribute("data-target") || "personalInfo";
            openAgentSection(targetId);
        });
    });

    const openProfessionalBtn = document.getElementById("openProfessionalBtn");
    if (openProfessionalBtn) {
        openProfessionalBtn.addEventListener("click", function () {
            openAgentSection("professionalInfo");
        });
    }

    const backToPersonalBtn = document.getElementById("backToPersonalBtn");
    if (backToPersonalBtn) {
        backToPersonalBtn.addEventListener("click", function () {
            openAgentSection("personalInfo");
        });
    }

    const addAgentBtn = document.getElementById("addAgentBtn");
    if (addAgentBtn) {
        addAgentBtn.addEventListener("click", function () {
            const form = document.getElementById("agentRegistrationForm");
            if (form) {
                form.reset();
            }
            const registerMsg = document.getElementById("agentRegisterMessage");
            if (registerMsg) {
                registerMsg.textContent = "";
            }
            openAgentSection("personalInfo");
            const firstNameField = document.getElementById("firstName");
            if (firstNameField) {
                firstNameField.focus();
            }
        });
    }

    bindAgentDetailToggles();

    const hashTarget = (window.location.hash || "").replace("#", "").trim();
    if (hashTarget === "professionalInfo" || hashTarget === "agentsInfo") {
        openAgentSection(hashTarget);
    } else {
        openAgentSection("personalInfo");
    }
});

function goProfessional() {
    openAgentSection("professionalInfo");
}

function goCompanyInfo() {
    openAgentSection("agentsInfo");
}
