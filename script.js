"use strict";

const STORAGE_KEY = "studentRegistration.students";
const fields = {
    fullname: document.getElementById("fullname"),
    studentID: document.getElementById("studentID"),
    email: document.getElementById("email"),
    phone: document.getElementById("phone"),
    course: document.getElementById("course"),
    year: document.getElementById("year"),
    address: document.getElementById("address")
};
const registrationForm = document.getElementById("registrationForm");
const confirmation = document.getElementById("confirmation");
const studentGroups = document.getElementById("studentGroups");
const tableStatus = document.getElementById("tableStatus");
const reviewDialog = document.getElementById("reviewDialog");
const reviewSummary = document.getElementById("reviewSummary");
const submitButton = document.getElementById("submitButton");
const confirmButton = document.getElementById("confirmButton");
const cancelReviewButton = document.getElementById("cancelReviewButton");
const cancelEditButton = document.getElementById("cancelEditButton");
const searchInput = document.getElementById("studentSearch");
const menuToggle = document.getElementById("menuToggle");
const navigation = document.getElementById("primaryNavigation");
const pageViews = Array.from(document.querySelectorAll(".app-view"));
const fieldLabels = {
    fullname: "Full Name",
    studentID: "Student ID",
    email: "Email Address",
    phone: "Contact Number",
    course: "Course",
    year: "Year Level",
    address: "Address"
};
const summaryLabels = {
    fullname: "Full Name",
    studentID: "Student ID",
    email: "Email",
    phone: "Contact Number",
    course: "Course",
    year: "Year Level",
    address: "Address"
};

let students = [];
let editingId = null;
let storageReady = true;

function showNotice(message, type) {
    confirmation.textContent = message;
    confirmation.className = `notice ${type}`;
}

function clearNotice() {
    confirmation.textContent = "";
    confirmation.className = "notice";
}

function getFormValues() {
    return Object.fromEntries(
        Object.entries(fields).map(([name, field]) => [name, field.value.trim()])
    );
}

function getFieldError(name, values) {
    const value = values[name];
    if (!value) {
        return `${fieldLabels[name]} is required.`;
    }

    if (name === "fullname" && value.length < 15) {
        return "At least 15 characters.";
    }
    if (name === "studentID" && !/^\d+$/.test(value)) {
        return "Student ID should contain numbers only.";
    }
    if (name === "studentID" && value.length < 7) {
        return "At least 7 digit numbers.";
    }
    if (name === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
        return "Enter a valid email address.";
    }
    if (name === "phone" && !/^(09\d{9}|\+639\d{9})$/.test(value)) {
        return "Enter a valid Philippine mobile number: 09XXXXXXXXX or +639XXXXXXXXX.";
    }
    if ((name === "course" || name === "year") && !fieldOptionsContain(name, value)) {
        return `Select a valid ${fieldLabels[name].toLowerCase()}.`;
    }
    if (name === "address" && value.length < 10) {
        return "Enter an address with at least 10 characters.";
    }
    if (name === "studentID" && hasDuplicate("studentID", value)) {
        return "This student ID is already registered.";
    }
    if (name === "email" && hasDuplicate("email", value)) {
        return "This email address is already registered.";
    }
    return "";
}

function fieldOptionsContain(name, value) {
    return Array.from(fields[name].options).some((option) => option.value === value);
}

function normalizeValue(name, value) {
    const trimmedValue = value.trim();
    return name === "email" || name === "studentID"
        ? trimmedValue.toLowerCase()
        : trimmedValue;
}

function hasDuplicate(name, value) {
    const normalizedValue = normalizeValue(name, value);
    return students.some((student) =>
        student.id !== editingId &&
        normalizeValue(name, student[name]) === normalizedValue
    );
}

function showFieldError(name, message) {
    const field = fields[name];
    const error = document.getElementById(`${name}Error`);
    field.setAttribute("aria-invalid", String(Boolean(message)));
    error.textContent = message;
}

function validateForm() {
    const values = getFormValues();
    let firstInvalidField = null;

    Object.keys(fields).forEach((name) => {
        const error = getFieldError(name, values);
        showFieldError(name, error);
        if (error && !firstInvalidField) {
            firstInvalidField = fields[name];
        }
    });

    if (firstInvalidField) {
        firstInvalidField.focus();
        return null;
    }
    return values;
}

function clearValidation() {
    Object.keys(fields).forEach((name) => showFieldError(name, ""));
}

function isStoredStudent(student) {
    return student &&
        typeof student.id === "string" &&
        typeof student.timestamp === "string" &&
        Object.keys(fields).every((name) => typeof student[name] === "string");
}

function loadStudents() {
    try {
        const storedValue = localStorage.getItem(STORAGE_KEY);
        if (!storedValue) {
            return [];
        }
        const parsedValue = JSON.parse(storedValue);
        if (!Array.isArray(parsedValue) || !parsedValue.every(isStoredStudent)) {
            throw new Error("Saved registration data has an unexpected format.");
        }
        return parsedValue;
    } catch (error) {
        storageReady = false;
        showNotice(
            "Saved registrations could not be loaded. Check browser storage or clear the damaged registration data before continuing.",
            "error"
        );
        console.error("Could not load student registrations:", error);
        return [];
    }
}

function persistStudents(nextStudents) {
    if (!storageReady) {
        throw new Error("Browser storage is unavailable or the saved data could not be read.");
    }

    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(nextStudents));
        students = nextStudents;
    } catch (error) {
        console.error("Could not save student registrations:", error);
        throw new Error("Your changes could not be saved to this browser. Check available storage and try again.");
    }
}

function createStudentId() {
    if (window.crypto && typeof window.crypto.randomUUID === "function") {
        return window.crypto.randomUUID();
    }
    return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function saveStudent(values) {
    const existingStudent = students.find((student) => student.id === editingId);
    if (editingId && !existingStudent) {
        throw new Error("This registration is no longer available. Reload the page and try again.");
    }

    const savedStudent = existingStudent
        ? { ...existingStudent, ...values, updatedAt: new Date().toISOString() }
        : { id: createStudentId(), ...values, timestamp: new Date().toISOString() };
    const nextStudents = existingStudent
        ? students.map((student) => student.id === editingId ? savedStudent : student)
        : [...students, savedStudent];

    persistStudents(nextStudents);
    return savedStudent;
}

function createCell(text, className = "") {
    const cell = document.createElement("td");
    cell.textContent = text;
    if (className) {
        cell.className = className;
    }
    return cell;
}

function createActionButton(label, action, student, className = "") {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = label;
    button.dataset.action = action;
    button.dataset.id = student.id;
    button.setAttribute("aria-label", `${label} registration for ${student.fullname}`);
    button.className = `table-action ${className}`.trim();
    return button;
}

function getOptionLabel(fieldName, value) {
    const option = Array.from(fields[fieldName].options)
        .find((entry) => entry.value === value);
    return option ? option.textContent : value;
}

function createTableHeader(label) {
    const header = document.createElement("th");
    header.scope = "col";
    header.textContent = label;
    return header;
}

function createStudentTable(groupStudents, courseLabel, yearLabel) {
    const wrapper = document.createElement("div");
    wrapper.className = "table-scroll";
    wrapper.tabIndex = 0;
    wrapper.setAttribute("aria-label", `${courseLabel}, ${yearLabel} student records; scroll horizontally if needed`);

    const table = document.createElement("table");
    table.className = "student-table";
    const caption = document.createElement("caption");
    caption.className = "visually-hidden";
    caption.textContent = `Students in ${courseLabel}, ${yearLabel}`;
    table.append(caption);

    const tableHead = document.createElement("thead");
    const headerRow = document.createElement("tr");
    ["Name", "Student ID", "Email", "Contact Number", "Registered", "Actions"]
        .forEach((label) => headerRow.append(createTableHeader(label)));
    tableHead.append(headerRow);
    table.append(tableHead);

    const tableBody = document.createElement("tbody");
    groupStudents.forEach((student) => {
        const row = document.createElement("tr");
        row.append(
            createCell(student.fullname),
            createCell(student.studentID),
            createCell(student.email),
            createCell(student.phone),
            createCell(formatDate(student.timestamp))
        );

        const actionsCell = document.createElement("td");
        actionsCell.append(
            createActionButton("Edit", "edit", student),
            createActionButton("Delete", "delete", student, "delete-action")
        );
        row.append(actionsCell);
        tableBody.append(row);
    });
    table.append(tableBody);
    wrapper.append(table);
    return wrapper;
}

function formatDate(timestamp) {
    const date = new Date(timestamp);
    return Number.isNaN(date.getTime())
        ? "Unknown date"
        : new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(date);
}

function getVisibleStudents() {
    const query = searchInput.value.trim().toLowerCase();
    const filteredStudents = students.filter((student) =>
        [
            student.fullname,
            student.studentID,
            student.email,
            student.phone,
            getOptionLabel("course", student.course),
            getOptionLabel("year", student.year),
            student.address
        ]
            .some((value) => value.toLowerCase().includes(query))
    );

    return filteredStudents;
}

function renderTable() {
    const visibleStudents = getVisibleStudents();
    studentGroups.replaceChildren();

    if (visibleStudents.length === 0) {
        const emptyMessage = document.createElement("p");
        emptyMessage.className = "empty-message";
        emptyMessage.textContent = students.length === 0
            ? "No registrations yet."
            : "No students match your search.";
        studentGroups.append(emptyMessage);
    } else {
        const courseOptions = Array.from(fields.course.options).filter((option) => option.value);
        const yearOptions = Array.from(fields.year.options).filter((option) => option.value);

        yearOptions.forEach((yearOption) => {
            const yearStudents = visibleStudents.filter((student) =>
                student.year === yearOption.value
            );
            if (yearStudents.length === 0) {
                return;
            }

            const yearSection = document.createElement("section");
            yearSection.className = "course-group";
            const yearHeading = document.createElement("h3");
            yearHeading.className = "course-group-title";
            yearHeading.textContent = `${yearOption.textContent} · ${yearStudents.length} ${yearStudents.length === 1 ? "student" : "students"}`;
            yearSection.append(yearHeading);

            courseOptions.forEach((courseOption) => {
                const courseStudents = yearStudents.filter((student) =>
                    student.course === courseOption.value
                );
                if (courseStudents.length === 0) {
                    return;
                }

                const courseSection = document.createElement("section");
                courseSection.className = "year-group";
                const courseHeading = document.createElement("h4");
                courseHeading.className = "year-group-title";
                courseHeading.textContent = `${courseOption.textContent} · ${courseStudents.length} ${courseStudents.length === 1 ? "student" : "students"}`;
                courseSection.append(courseHeading);
                courseSection.append(
                    createStudentTable(courseStudents, courseOption.textContent, yearOption.textContent)
                );
                yearSection.append(courseSection);
            });

            studentGroups.append(yearSection);
        });
    }

    tableStatus.textContent = students.length === 0
        ? "No saved registrations."
        : `Showing ${visibleStudents.length} of ${students.length} registrations.`;
    document.getElementById("exportButton").disabled = students.length === 0;
}

function setEditMode(studentId) {
    editingId = studentId;
    submitButton.textContent = studentId ? "Review Changes" : "Review Registration";
    cancelEditButton.hidden = !studentId;
}

function showReview(values) {
    reviewSummary.replaceChildren();
    Object.entries(summaryLabels).forEach(([name, label]) => {
        const term = document.createElement("dt");
        const detail = document.createElement("dd");
        term.textContent = label;
        detail.textContent = values[name];
        reviewSummary.append(term, detail);
    });

    document.getElementById("reviewTitle").textContent = editingId
        ? "Review your changes"
        : "Review your registration";
    confirmButton.textContent = editingId ? "Save changes" : "Confirm and save";
    reviewDialog.showModal();
}

function startEditing(studentId) {
    const student = students.find((entry) => entry.id === studentId);
    if (!student) {
        showNotice("That registration could not be found. Refresh the page and try again.", "error");
        return;
    }

    Object.keys(fields).forEach((name) => {
        fields[name].value = student[name];
    });
    setEditMode(student.id);
    clearValidation();
    clearNotice();
    if (window.location.hash !== "#registration") {
        window.history.pushState(null, "", "#registration");
    }
    showPage("registration", true);
}

function deleteStudent(studentId) {
    const student = students.find((entry) => entry.id === studentId);
    if (!student || !window.confirm(`Delete the registration for ${student.fullname}?`)) {
        return;
    }

    try {
        persistStudents(students.filter((entry) => entry.id !== studentId));
        if (editingId === studentId) {
            registrationForm.reset();
        }
        renderTable();
        showNotice(`The registration for ${student.fullname} was deleted.`, "success");
    } catch (error) {
        showNotice(error.message, "error");
    }
}

function escapeCsvValue(value) {
    let safeValue = String(value);
    if (/^\s*[=+\-@]/.test(safeValue)) {
        safeValue = `'${safeValue}`;
    }
    return `"${safeValue.replace(/"/g, '""')}"`;
}

function exportToCsv() {
    if (students.length === 0) {
        showNotice("There are no registrations to export.", "error");
        return;
    }

    const headers = [
        "Full Name", "Student ID", "Email", "Contact Number",
        "Course", "Year Level", "Address", "Timestamp"
    ];
    const rows = students.map((student) => [
        student.fullname,
        student.studentID,
        student.email,
        student.phone,
        student.course,
        student.year,
        student.address,
        student.timestamp
    ]);
    const csv = [headers, ...rows]
        .map((row) => row.map(escapeCsvValue).join(","))
        .join("\r\n");
    const file = new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8" });
    const downloadUrl = URL.createObjectURL(file);
    const link = document.createElement("a");
    link.href = downloadUrl;
    link.download = `student-registrations-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.append(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(downloadUrl), 1000);
    tableStatus.textContent = "CSV export started.";
}

function closeMobileMenu() {
    navigation.classList.remove("is-open");
    menuToggle.setAttribute("aria-expanded", "false");
    menuToggle.setAttribute("aria-label", "Open navigation menu");
}

function setActiveNavigation(pageId) {
    document.querySelectorAll(".nav-links a").forEach((link) => {
        if (link.hash === `#${pageId}`) {
            link.setAttribute("aria-current", "page");
        } else {
            link.removeAttribute("aria-current");
        }
    });
}

function showPage(pageId, moveFocus = false) {
    const activePage = pageViews.find((page) => page.id === pageId) || pageViews[0];
    pageViews.forEach((page) => {
        page.hidden = page !== activePage;
    });
    setActiveNavigation(activePage.id);
    closeMobileMenu();
    const pageTitles = {
        home: "Home",
        registration: "Student Registration",
        records: "Registered Students"
    };
    document.title = `${pageTitles[activePage.id]} | De La Salle John Bosco College`;

    if (moveFocus) {
        window.scrollTo({ top: 0, behavior: "smooth" });
        activePage.querySelector("h1").focus({ preventScroll: true });
    }
}

function getPageFromLocation() {
    const pageId = window.location.hash.slice(1);
    return pageViews.some((page) => page.id === pageId) ? pageId : "home";
}

registrationForm.addEventListener("submit", (event) => {
    event.preventDefault();
    clearNotice();
    const values = validateForm();
    if (!values) {
        return;
    }
    if (!storageReady) {
        showNotice("Registrations cannot be saved because browser storage is unavailable.", "error");
        return;
    }

    try {
        showReview(values);
    } catch (error) {
        showNotice("The confirmation window could not be opened in this browser.", "error");
        console.error("Could not open registration confirmation:", error);
    }
});

confirmButton.addEventListener("click", () => {
    const values = getFormValues();
    submitButton.disabled = true;
    confirmButton.disabled = true;

    try {
        const savedStudent = saveStudent(values);
        const wasEditing = Boolean(editingId);
        reviewDialog.close();
        setEditMode(null);
        registrationForm.reset();
        renderTable();
        showNotice(
            wasEditing
                ? `Changes for ${savedStudent.fullname} were saved.`
                : `Registration complete. Welcome, ${savedStudent.fullname}!`,
            "success"
        );
    } catch (error) {
        showNotice(error.message, "error");
    } finally {
        submitButton.disabled = false;
        confirmButton.disabled = false;
    }
});

cancelReviewButton.addEventListener("click", () => reviewDialog.close());
reviewDialog.addEventListener("close", () => confirmButton.blur());

registrationForm.addEventListener("reset", () => {
    clearValidation();
    setEditMode(null);
    clearNotice();
});

Object.entries(fields).forEach(([name, field]) => {
    field.addEventListener("input", () => {
        if (document.getElementById(`${name}Error`).textContent) {
            showFieldError(name, getFieldError(name, getFormValues()));
        }
    });
    field.addEventListener("change", () => {
        if (document.getElementById(`${name}Error`).textContent) {
            showFieldError(name, getFieldError(name, getFormValues()));
        }
    });
});

studentGroups.addEventListener("click", (event) => {
    if (!(event.target instanceof Element)) {
        return;
    }
    const button = event.target.closest("button[data-action]");
    if (!button) {
        return;
    }
    if (button.dataset.action === "edit") {
        startEditing(button.dataset.id);
    } else if (button.dataset.action === "delete") {
        deleteStudent(button.dataset.id);
    }
});

searchInput.addEventListener("input", renderTable);
document.getElementById("exportButton").addEventListener("click", exportToCsv);

cancelEditButton.addEventListener("click", () => registrationForm.reset());

menuToggle.addEventListener("click", () => {
    const isOpen = navigation.classList.toggle("is-open");
    menuToggle.setAttribute("aria-expanded", String(isOpen));
    menuToggle.setAttribute("aria-label", isOpen ? "Close navigation menu" : "Open navigation menu");
});

document.addEventListener("click", (event) => {
    if (!(event.target instanceof Element)) {
        return;
    }
    const link = event.target.closest('a[href^="#"]');
    if (!link || !pageViews.some((page) => `#${page.id}` === link.hash)) {
        return;
    }

    event.preventDefault();
    const pageId = link.hash.slice(1);
    if (window.location.hash !== `#${pageId}`) {
        window.history.pushState(null, "", `#${pageId}`);
    }
    showPage(pageId, true);
});

window.addEventListener("popstate", () => showPage(getPageFromLocation()));
window.addEventListener("hashchange", () => showPage(getPageFromLocation()));

students = loadStudents();
renderTable();
if (!pageViews.some((page) => `#${page.id}` === window.location.hash)) {
    window.history.replaceState(null, "", "#home");
}
showPage(getPageFromLocation());

const heroLogo = document.querySelector(".school-logo").cloneNode();
heroLogo.className = "hero-school-logo";
heroLogo.alt = "";
document.querySelector(".hero-mark").append(heroLogo);
