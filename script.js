let currentUser = null;

let admins = JSON.parse(
    localStorage.getItem("admins")
) || [
    {
        username: "admin",
        password: "1234"
    }
];

let users = JSON.parse(
    localStorage.getItem("users")
) || [
    {
        username: "user",
        password: "1234"
    }
];

let tasks = JSON.parse(
    localStorage.getItem("tasks")
) || [];


// =============================
// LOGIN
// =============================

function login() {

    const username =
        document.getElementById("loginUsername").value.trim();

    const password =
        document.getElementById("loginPassword").value;

    const role =
        document.getElementById("loginRole").value;

    let valid = false;

    if (
        role === "superadmin" &&
        username === "superadmin" &&
        password === "1234"
    ) {
        valid = true;
    }

    if (role === "admin") {

        valid = admins.some(
            admin =>
                admin.username === username &&
                admin.password === password
        );
    }

    if (role === "user") {

        valid = users.some(
            user =>
                user.username === username &&
                user.password === password
        );
    }

    if (!valid) {

        document.getElementById("loginError").innerText =
            "Invalid username, password or role.";

        return;
    }

    currentUser = {
        username,
        role
    };

    localStorage.setItem(
        "currentUser",
        JSON.stringify(currentUser)
    );

    showApp();
}


// =============================
// SHOW APP
// =============================

function showApp() {

    document.getElementById("loginPage")
        .style.display = "none";

    document.getElementById("dashboardPage")
        .style.display = "flex";

    document.getElementById("currentUser")
        .innerText =
        currentUser.username +
        " (" +
        currentUser.role +
        ")";

    setupPermissions();

    updateDashboard();

    renderUsers();

    renderAdmins();

    renderTasks();
}


// =============================
// PERMISSIONS
// =============================

function setupPermissions() {

    const usersMenu =
        document.getElementById("usersMenu");

    const adminsMenu =
        document.getElementById("adminsMenu");

    const createTaskButton =
        document.getElementById("createTaskButton");

    if (currentUser.role === "superadmin") {

        usersMenu.style.display = "block";
        adminsMenu.style.display = "block";
        createTaskButton.style.display = "block";

    } else if (currentUser.role === "admin") {

        usersMenu.style.display = "block";
        adminsMenu.style.display = "none";
        createTaskButton.style.display = "block";

    } else {

        usersMenu.style.display = "none";
        adminsMenu.style.display = "none";
        createTaskButton.style.display = "none";
    }
}


// =============================
// DASHBOARD
// =============================

function updateDashboard() {

    let visibleTasks = getVisibleTasks();

    document.getElementById("totalTasks").innerText =
        visibleTasks.length;

    document.getElementById("pendingTasks").innerText =
        visibleTasks.filter(
            t => t.status === "Pending"
        ).length;

    document.getElementById("progressTasks").innerText =
        visibleTasks.filter(
            t => t.status === "In Progress"
        ).length;

    document.getElementById("completedTasks").innerText =
        visibleTasks.filter(
            t => t.status === "Completed"
        ).length;
}


function getVisibleTasks() {

    if (currentUser.role === "user") {

        return tasks.filter(
            task =>
                task.assignedTo === currentUser.username
        );
    }

    return tasks;
}


// =============================
// SECTION NAVIGATION
// =============================

function showSection(section) {

    document.getElementById("dashboardSection")
        .classList.add("hidden");

    document.getElementById("usersSection")
        .classList.add("hidden");

    document.getElementById("adminsSection")
        .classList.add("hidden");

    document.getElementById("tasksSection")
        .classList.add("hidden");

    if (section === "dashboard") {

        document.getElementById("dashboardSection")
            .classList.remove("hidden");
    }

    if (section === "users") {

        document.getElementById("usersSection")
            .classList.remove("hidden");

        renderUsers();
    }

    if (section === "admins") {

        document.getElementById("adminsSection")
            .classList.remove("hidden");

        renderAdmins();
    }

    if (section === "tasks") {

        document.getElementById("tasksSection")
            .classList.remove("hidden");

        renderTasks();
    }
}


// =============================
// USERS
// =============================

function openUserModal() {

    document.getElementById("userModal")
        .style.display = "flex";
}


function createUser() {

    const username =
        document.getElementById("newUserName").value.trim();

    const password =
        document.getElementById("newUserPassword").value;

    if (!username || !password) {

        alert("Username and password required.");

        return;
    }

    if (
        users.some(
            user => user.username === username
        )
    ) {

        alert("User already exists.");

        return;
    }

    users.push({
        username,
        password
    });

    saveData();

    closeModal("userModal");

    renderUsers();
}


function renderUsers() {

    const container =
        document.getElementById("usersList");

    container.innerHTML = "";

    users.forEach((user, index) => {

        container.innerHTML += `
            <div class="user-card">

                <h3>${user.username}</h3>

                <p>Role: User</p>

                ${
                    currentUser.role === "superadmin"
                    ? `
                    <button
                        onclick="deleteUser(${index})">
                        Delete
                    </button>
                    `
                    : ""
                }

            </div>
        `;
    });

    updateTaskUsers();
}


function deleteUser(index) {

    if (
        !confirm("Delete this user?")
    ) return;

    users.splice(index, 1);

    saveData();

    renderUsers();
}


// =============================
// ADMINS
// =============================

function openAdminModal() {

    document.getElementById("adminModal")
        .style.display = "flex";
}


function createAdmin() {

    const username =
        document.getElementById("newAdminName").value.trim();

    const password =
        document.getElementById("newAdminPassword").value;

    if (!username || !password) {

        alert("Username and password required.");

        return;
    }

    if (
        admins.some(
            admin => admin.username === username
        )
    ) {

        alert("Admin already exists.");

        return;
    }

    admins.push({
        username,
        password
    });

    saveData();

    closeModal("adminModal");

    renderAdmins();
}


function renderAdmins() {

    const container =
        document.getElementById("adminsList");

    container.innerHTML = "";

    admins.forEach((admin, index) => {

        container.innerHTML += `
            <div class="admin-card">

                <h3>${admin.username}</h3>

                <p>Role: Admin</p>

                <button
                    onclick="deleteAdmin(${index})">
                    Delete
                </button>

            </div>
        `;
    });
}


function deleteAdmin(index) {

    if (
        !confirm("Delete this admin?")
    ) return;

    admins.splice(index, 1);

    saveData();

    renderAdmins();
}


// =============================
// TASKS
// =============================

function openTaskModal() {

    updateTaskUsers();

    document.getElementById("taskModal")
        .style.display = "flex";
}


function updateTaskUsers() {

    const select =
        document.getElementById("taskUser");

    if (!select) return;

    select.innerHTML = "";

    users.forEach(user => {

        select.innerHTML += `
            <option value="${user.username}">
                ${user.username}
            </option>
        `;
    });
}


function createTask() {

    const title =
        document.getElementById("taskTitle").value.trim();

    const description =
        document.getElementById("taskDescription").value.trim();

    const deadline =
        document.getElementById("taskDeadline").value;

    const priority =
        document.getElementById("taskPriority").value;

    const assignedTo =
        document.getElementById("taskUser").value;

    if (!title || !assignedTo) {

        alert("Task title and user are required.");

        return;
    }

    tasks.push({

        id: Date.now(),

        title,

        description,

        deadline,

        priority,

        assignedTo,

        assignedBy: currentUser.username,

        status: "Pending",

        acceptedAt: null,

        startedAt: null,

        completedAt: null,

        totalTime: 0
    });

    saveData();

    closeModal("taskModal");

    renderTasks();

    updateDashboard();
}


function renderTasks() {

    const container =
        document.getElementById("tasksList");

    container.innerHTML = "";

    const visibleTasks =
        getVisibleTasks();

    if (visibleTasks.length === 0) {

        container.innerHTML =
            "<p>No tasks found.</p>";

        return;
    }

    visibleTasks.forEach(task => {

        container.innerHTML += createTaskHTML(task);
    });
}


function createTaskHTML(task) {

    let buttons = "";

    if (
        currentUser.role === "user"
    ) {

        if (task.status === "Pending") {

            buttons += `
                <button
                    class="primary"
                    onclick="acceptTask(${task.id})">
                    Accept Task
                </button>
            `;
        }

        if (task.status === "Accepted") {

            buttons += `
                <button
                    class="primary"
                    onclick="startTask(${task.id})">
                    Start Task
                </button>
            `;
        }

        if (task.status === "In Progress") {

            buttons += `
                <button
                    class="primary"
                    onclick="endTask(${task.id})">
                    End Task
                </button>
            `;
        }
    }

    if (
        currentUser.role === "admin" ||
        currentUser.role === "superadmin"
    ) {

        buttons += `
            <button
                onclick="deleteTask(${task.id})">
                Delete
            </button>
        `;
    }

    return `
        <div class="task-card">

            <h3>${task.title}</h3>

            <p>${task.description}</p>

            <p>
                <strong>Assigned To:</strong>
                ${task.assignedTo}
            </p>

            <p>
                <strong>Priority:</strong>
                ${task.priority}
            </p>

            <p>
                <strong>Deadline:</strong>
                ${task.deadline || "Not Set"}
            </p>

            <span class="status">
                ${task.status}
            </span>

            ${
                task.startedAt
                ? `<p>
                    Started:
                    ${formatDate(task.startedAt)}
                </p>`
                : ""
            }

            ${
                task.completedAt
                ? `<p>
                    Completed:
                    ${formatDate(task.completedAt)}
                </p>`
                : ""
            }

            ${
                task.totalTime
                ? `<p>
                    Total Time:
                    ${formatDuration(task.totalTime)}
                </p>`
                : ""
            }

            <div>
                ${buttons}
            </div>

        </div>
    `;
}


// =============================
// TASK WORKFLOW
// =============================

function acceptTask(id) {

    const task =
        tasks.find(t => t.id === id);

    if (!task) return;

    task.status = "Accepted";

    task.acceptedAt =
        Date.now();

    saveData();

    renderTasks();

    updateDashboard();
}


function startTask(id) {

    const task =
        tasks.find(t => t.id === id);

    if (!task) return;

    task.status = "In Progress";

    task.startedAt =
        Date.now();

    saveData();

    renderTasks();

    updateDashboard();
}


function endTask(id) {

    const task =
        tasks.find(t => t.id === id);

    if (!task) return;

    task.status = "Completed";

    task.completedAt =
        Date.now();

    if (task.startedAt) {

        task.totalTime =
            task.completedAt -
            task.startedAt;
    }

    saveData();

    renderTasks();

    updateDashboard();
}


function deleteTask(id) {

    if (
        !confirm("Delete this task?")
    ) return;

    tasks =
        tasks.filter(
            task => task.id !== id
        );

    saveData();

    renderTasks();

    updateDashboard();
}


// =============================
// UTILITIES
// =============================

function formatDate(time) {

    return new Date(time)
        .toLocaleString();
}


function formatDuration(ms) {

    const seconds =
        Math.floor(ms / 1000);

    const hours =
        Math.floor(seconds / 3600);

    const minutes =
        Math.floor(
            (seconds % 3600) / 60
        );

    const remainingSeconds =
        seconds % 60;

    return (
        hours +
        "h " +
        minutes +
        "m " +
        remainingSeconds +
        "s"
    );
}


function closeModal(id) {

    document.getElementById(id)
        .style.display = "none";
}


function saveData() {

    localStorage.setItem(
        "admins",
        JSON.stringify(admins)
    );

    localStorage.setItem(
        "users",
        JSON.stringify(users)
    );

    localStorage.setItem(
        "tasks",
        JSON.stringify(tasks)
    );
}


function logout() {

    currentUser = null;

    document.getElementById("dashboardPage")
        .style.display = "none";

    document.getElementById("loginPage")
        .style.display = "flex";

    document.getElementById("loginUsername").value = "";

    document.getElementById("loginPassword").value = "";
}


// =============================
// STARTUP
// =============================

document.addEventListener(
    "DOMContentLoaded",
    function () {

        document.getElementById("dashboardPage")
            .style.display = "none";

        document.getElementById("loginPage")
            .style.display = "flex";
    }
);
