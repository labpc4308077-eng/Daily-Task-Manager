/* =========================================================
   DAILY TASK MANAGER
   Firebase + Role Based Task Management
========================================================= */

let currentUser = null;
let currentProfile = null;

let allTasks = [];
let allUsers = [];
let allAdmins = [];

let taskChart = null;


/* =========================================================
   FIREBASE READY
========================================================= */

window.addEventListener("firebase-ready", () => {
    initializeApplication();
});


/* =========================================================
   INITIALIZE
========================================================= */

function initializeApplication() {

    const {
        onAuthStateChanged
    } = window.firebaseFns;

    const loginForm = document.getElementById("loginForm");
    const adminSignupForm = document.getElementById("adminSignupForm");
    const userForm = document.getElementById("userForm");
    const taskForm = document.getElementById("taskForm");

    if (loginForm) {
        loginForm.addEventListener("submit", login);
    }

    if (adminSignupForm) {
        adminSignupForm.addEventListener(
            "submit",
            registerAdmin
        );
    }

    if (userForm) {
        userForm.addEventListener(
            "submit",
            createUser
        );
    }

    if (taskForm) {
        taskForm.addEventListener(
            "submit",
            saveTask
        );
    }

    onAuthStateChanged(
        window.firebaseAuth,
        async (user) => {

            if (user) {

                currentUser = user;

                await loadCurrentProfile();

            } else {

                currentUser = null;
                currentProfile = null;

                showLoginPage();
            }
        }
    );
}


/* =========================================================
   LOGIN
========================================================= */

async function login(event) {

    event.preventDefault();

    const email =
        document.getElementById("loginEmail").value.trim();

    const password =
        document.getElementById("loginPassword").value;

    if (!email || !password) {
        showMessage(
            "loginMessage",
            "Please enter email and password.",
            "error"
        );
        return;
    }

    showLoading(true);

    try {

        const {
            signInWithEmailAndPassword
        } = window.firebaseFns;

        await signInWithEmailAndPassword(
            window.firebaseAuth,
            email,
            password
        );

        showMessage(
            "loginMessage",
            "Login successful.",
            "success"
        );

    } catch (error) {

        console.error("Login Error:", error);

        showMessage(
            "loginMessage",
            getFirebaseError(error),
            "error"
        );

    } finally {

        showLoading(false);
    }
}


/* =========================================================
   LOAD CURRENT USER PROFILE
========================================================= */

async function loadCurrentProfile() {

    showLoading(true);

    try {

        const {
            doc,
            getDoc
        } = window.firebaseFns;

        const userRef = doc(
            window.db,
            "users",
            currentUser.uid
        );

        const userSnap = await getDoc(userRef);

        if (!userSnap.exists()) {

            await window.firebaseFns.signOut(
                window.firebaseAuth
            );

            throw new Error(
                "Your Firebase account exists, but your user profile was not found."
            );
        }

        currentProfile = {
            id: userSnap.id,
            ...userSnap.data()
        };

        showApplication();

        await loadApplicationData();

    } catch (error) {

        console.error(
            "Profile Loading Error:",
            error
        );

        showMessage(
            "loginMessage",
            error.message ||
            getFirebaseError(error),
            "error"
        );

        showLoginPage();

    } finally {

        showLoading(false);
    }
}


/* =========================================================
   SHOW APPLICATION
========================================================= */

function showApplication() {

    document
        .getElementById("loginPage")
        .classList.add("hidden");

    document
        .getElementById("app")
        .classList.remove("hidden");

    updateUserHeader();

    configureNavigation();

    showSection("dashboard");
}


/* =========================================================
   SHOW LOGIN
========================================================= */

function showLoginPage() {

    document
        .getElementById("app")
        .classList.add("hidden");

    document
        .getElementById("loginPage")
        .classList.remove("hidden");
}


/* =========================================================
   HEADER
========================================================= */

function updateUserHeader() {

    const name =
        currentProfile?.name ||
        currentUser?.email ||
        "User";

    const role =
        currentProfile?.role ||
        "user";

    document.getElementById(
        "currentUserName"
    ).textContent = name;

    document.getElementById(
        "currentUserRole"
    ).textContent = formatRole(role);

    document.getElementById(
        "dashboardSubtitle"
    ).textContent =
        `Welcome, ${name}`;
}


/* =========================================================
   NAVIGATION PERMISSIONS
========================================================= */

function configureNavigation() {

    const role = currentProfile?.role;

    const navUsers =
        document.getElementById("navUsers");

    const navAdmins =
        document.getElementById("navAdmins");

    const createUserBtn =
        document.getElementById("createUserBtn");

    const createTaskBtn =
        document.getElementById("createTaskBtn");


    if (role === "superadmin") {

        navUsers.classList.remove("hidden");
        navAdmins.classList.remove("hidden");

        createUserBtn.classList.remove("hidden");
        createTaskBtn.classList.remove("hidden");

    }

    else if (role === "admin") {

        navUsers.classList.remove("hidden");
        navAdmins.classList.add("hidden");

        createUserBtn.classList.remove("hidden");
        createTaskBtn.classList.remove("hidden");

    }

    else {

        navUsers.classList.add("hidden");
        navAdmins.classList.add("hidden");

        createUserBtn.classList.add("hidden");
        createTaskBtn.classList.add("hidden");
    }
}


/* =========================================================
   SECTION NAVIGATION
========================================================= */

function showSection(section) {

    const sections = [
        "dashboard",
        "tasks",
        "users",
        "admins"
    ];

    sections.forEach(name => {

        const sectionElement =
            document.getElementById(
                `${name}Section`
            );

        if (sectionElement) {
            sectionElement.classList.add("hidden");
        }

        const navElement =
            document.getElementById(
                `nav${capitalize(name)}`
            );

        if (navElement) {
            navElement.classList.remove("active");
        }
    });


    const selectedSection =
        document.getElementById(
            `${section}Section`
        );

    if (selectedSection) {
        selectedSection.classList.remove("hidden");
    }


    const selectedNav =
        document.getElementById(
            `nav${capitalize(section)}`
        );

    if (selectedNav) {
        selectedNav.classList.add("active");
    }


    if (section === "dashboard") {
        loadDashboard();
    }

    if (section === "tasks") {
        loadTasks();
    }

    if (section === "users") {
        loadUsers();
    }

    if (section === "admins") {
        loadAdmins();
    }
}


/* =========================================================
   LOAD ALL APPLICATION DATA
========================================================= */

async function loadApplicationData() {

    await Promise.all([
        loadTasks(),
        loadUsers(),
        loadAdmins()
    ]);

    await loadDashboard();
}


/* =========================================================
   LOAD USERS
========================================================= */

async function loadUsers() {

    if (!currentProfile) return;

    try {

        const {
            collection,
            getDocs,
            query,
            where
        } = window.firebaseFns;

        let snapshot;


        if (currentProfile.role === "superadmin") {

            snapshot = await getDocs(
                collection(
                    window.db,
                    "users"
                )
            );

        }

        else if (currentProfile.role === "admin") {

            const q = query(
                collection(
                    window.db,
                    "users"
                ),
                where(
                    "adminId",
                    "==",
                    currentUser.uid
                )
            );

            snapshot = await getDocs(q);

        }

        else {

            const q = query(
                collection(
                    window.db,
                    "users"
                ),
                where(
                    "__name__",
                    "==",
                    currentUser.uid
                )
            );

            snapshot = await getDocs(q);
        }


        allUsers = [];

        snapshot.forEach(docSnap => {

            allUsers.push({
                id: docSnap.id,
                ...docSnap.data()
            });

        });


        renderUsers();

        populateTaskUsers();

    } catch (error) {

        console.error(
            "Users Loading Error:",
            error
        );

        showMessage(
            "userMessage",
            getFirebaseError(error),
            "error"
        );
    }
}


/* =========================================================
   RENDER USERS
========================================================= */

function renderUsers() {

    const tbody =
        document.getElementById(
            "usersTableBody"
        );

    if (!tbody) return;

    tbody.innerHTML = "";


    if (allUsers.length === 0) {

        tbody.innerHTML = `
            <tr>
                <td colspan="5">
                    <div class="empty-state">
                        <div class="empty-state-icon">👥</div>
                        <h3>No users found</h3>
                        <p>No users are available in this team.</p>
                    </div>
                </td>
            </tr>
        `;

        return;
    }


    allUsers.forEach(user => {

        const tr =
            document.createElement("tr");

        const role =
            formatRole(user.role);

        const status =
            user.active === false
                ? "Inactive"
                : "Active";


        tr.innerHTML = `
            <td>
                <strong>
                    ${escapeHtml(user.name || "Unnamed")}
                </strong>
            </td>

            <td>
                ${escapeHtml(user.email || "-")}
            </td>

            <td>
                ${escapeHtml(user.teamName || "-")}
            </td>

            <td>
                <span class="status-badge ${
                    user.active === false
                        ? "status-pending"
                        : "status-completed"
                }">
                    ${status}
                </span>
            </td>

            <td>

                <div class="action-buttons">

                    ${
                        currentProfile.role === "superadmin" ||
                        currentProfile.role === "admin"
                            ? `
                                <button
                                    class="action-btn delete"
                                    onclick="deleteUser('${user.id}')"
                                >
                                    Delete
                                </button>
                              `
                            : ""
                    }

                </div>

            </td>
        `;

        tbody.appendChild(tr);
    });
}


/* =========================================================
   ADMIN SIGNUP MODAL
========================================================= */

function openAdminSignup() {

    const modal =
        document.getElementById(
            "adminSignupModal"
        );

    modal.classList.add("show");
}


async function registerAdmin(event) {

    event.preventDefault();

    const name =
        document.getElementById(
            "signupName"
        ).value.trim();

    const teamName =
        document.getElementById(
            "signupTeamName"
        ).value.trim();

    const email =
        document.getElementById(
            "signupEmail"
        ).value.trim();

    const password =
        document.getElementById(
            "signupPassword"
        ).value;

    const confirmPassword =
        document.getElementById(
            "signupConfirmPassword"
        ).value;


    if (password !== confirmPassword) {

        showMessage(
            "signupMessage",
            "Passwords do not match.",
            "error"
        );

        return;
    }


    if (password.length < 6) {

        showMessage(
            "signupMessage",
            "Password must be at least 6 characters.",
            "error"
        );

        return;
    }


    showLoading(true);


    try {

        const {
            createUserWithEmailAndPassword,
            doc,
            setDoc,
            serverTimestamp
        } = window.firebaseFns;


        const credential =
            await createUserWithEmailAndPassword(
                window.firebaseAuth,
                email,
                password
            );


        const uid =
            credential.user.uid;


        await setDoc(
            doc(
                window.db,
                "users",
                uid
            ),
            {
                name: name,

                email: email,

                role: "admin",

                active: true,

                adminId: uid,

                teamId: uid,

                teamName: teamName,

                createdBy: uid,

                createdAt: serverTimestamp()
            }
        );


        closeModal(
            "adminSignupModal"
        );


        document.getElementById(
            "adminSignupForm"
        ).reset();


        showMessage(
            "loginMessage",
            "Admin account created successfully. You are now logged in.",
            "success"
        );


    } catch (error) {

        console.error(
            "Admin Signup Error:",
            error
        );

        showMessage(
            "signupMessage",
            getFirebaseError(error),
            "error"
        );

    } finally {

        showLoading(false);
    }
}


/* =========================================================
   CREATE USER / STUDENT
========================================================= */

async function createUser(event) {

    event.preventDefault();

    if (
        currentProfile.role !== "admin" &&
        currentProfile.role !== "superadmin"
    ) {

        showMessage(
            "userMessage",
            "You do not have permission to create users.",
            "error"
        );

        return;
    }


    const name =
        document.getElementById(
            "userName"
        ).value.trim();

    const email =
        document.getElementById(
            "userEmail"
        ).value.trim();

    const password =
        document.getElementById(
            "userPassword"
        ).value;


    if (!name || !email || !password) {

        showMessage(
            "userMessage",
            "Please fill all fields.",
            "error"
        );

        return;
    }


    showLoading(true);


    let secondaryApp = null;


    try {

        /*
         * We create a second Firebase Auth instance
         * so the current Admin does not get logged out.
         */

        const {
            initializeApp,
            getApps,
            deleteApp
        } = await import(
            "https://www.gstatic.com/firebasejs/12.2.1/firebase-app.js"
        );

        const {
            getAuth,
            createUserWithEmailAndPassword
        } = await import(
            "https://www.gstatic.com/firebasejs/12.2.1/firebase-auth.js"
        );


        secondaryApp =
            initializeApp(
                {
                    apiKey:
                        "AIzaSyDPCcPsKOu0CcsN8LYoz7J3QitNhksejxjM",

                    authDomain:
                        "daily-task-manager-9d83d.firebaseapp.com",

                    projectId:
                        "daily-task-manager-9d83d",

                    storageBucket:
                        "daily-task-manager-9d83d.firebasestorage.app",

                    messagingSenderId:
                        "197724632235",

                    appId:
                        "1:197724632235:web:41b63b86f3fc67707933ee"
                },

                `secondary-${Date.now()}`
            );


        const secondaryAuth =
            getAuth(secondaryApp);


        const credential =
            await createUserWithEmailAndPassword(
                secondaryAuth,
                email,
                password
            );


        const uid =
            credential.user.uid;


        const {
            doc,
            setDoc,
            serverTimestamp
        } = window.firebaseFns;


        const adminId =
            currentProfile.role === "admin"
                ? currentUser.uid
                : currentProfile.role === "superadmin"
                    ? currentUser.uid
                    : null;


        let teamId =
            currentProfile.role === "admin"
                ? currentProfile.teamId ||
                  currentUser.uid
                : currentUser.uid;


        let teamName =
            currentProfile.role === "admin"
                ? currentProfile.teamName ||
                  currentProfile.name ||
                  "Team"
                : "Super Admin Team";


        await setDoc(
            doc(
                window.db,
                "users",
                uid
            ),
            {

                name: name,

                email: email,

                role: "user",

                active: true,

                adminId: adminId,

                teamId: teamId,

                teamName: teamName,

                createdBy: currentUser.uid,

                createdAt: serverTimestamp()
            }
        );


        document.getElementById(
            "userForm"
        ).reset();


        closeModal("userModal");


        await loadUsers();


        showMessage(
            "loginMessage",
            "User created successfully.",
            "success"
        );


    } catch (error) {

        console.error(
            "Create User Error:",
            error
        );

        showMessage(
            "userMessage",
            getFirebaseError(error),
            "error"
        );

    } finally {

        if (secondaryApp) {

            try {

                const {
                    deleteApp
                } = await import(
                    "https://www.gstatic.com/firebasejs/12.2.1/firebase-app.js"
                );

                await deleteApp(
                    secondaryApp
                );

            } catch (e) {

                console.warn(
                    "Secondary app cleanup:",
                    e
                );
            }
        }

        showLoading(false);
    }
}


/* =========================================================
   DELETE USER
========================================================= */

async function deleteUser(userId) {

    if (
        currentProfile.role !== "admin" &&
        currentProfile.role !== "superadmin"
    ) {
        return;
    }


    const confirmed =
        confirm(
            "Are you sure you want to delete this user's profile?"
        );

    if (!confirmed) return;


    showLoading(true);


    try {

        const {
            doc,
            deleteDoc
        } = window.firebaseFns;


        await deleteDoc(
            doc(
                window.db,
                "users",
                userId
            )
        );


        await loadUsers();


        alert(
            "User profile deleted successfully."
        );


    } catch (error) {

        console.error(
            "Delete User Error:",
            error
        );

        alert(
            getFirebaseError(error)
        );

    } finally {

        showLoading(false);
    }
}


/* =========================================================
   LOAD TASKS
========================================================= */

async function loadTasks() {

    if (!currentProfile) return;


    try {

        const {
            collection,
            getDocs,
            query,
            where
        } = window.firebaseFns;

        let snapshot;


        if (
            currentProfile.role === "superadmin"
        ) {

            snapshot =
                await getDocs(
                    collection(
                        window.db,
                        "tasks"
                    )
                );
        }

        else if (
            currentProfile.role === "admin"
        ) {

            const q =
                query(
                    collection(
                        window.db,
                        "tasks"
                    ),
                    where(
                        "adminId",
                        "==",
                        currentUser.uid
                    )
                );

            snapshot =
                await getDocs(q);
        }

        else {

            const q =
                query(
                    collection(
                        window.db,
                        "tasks"
                    ),
                    where(
                        "assignedTo",
                        "==",
                        currentUser.uid
                    )
                );

            snapshot =
                await getDocs(q);
        }


        allTasks = [];


        snapshot.forEach(docSnap => {

            allTasks.push({
                id: docSnap.id,
                ...docSnap.data()
            });

        });


        allTasks.sort(
            (a, b) => {

                const aTime =
                    getDateValue(
                        a.createdAt
                    );

                const bTime =
                    getDateValue(
                        b.createdAt
                    );

                return bTime - aTime;
            }
        );


        renderTasks();


    } catch (error) {

        console.error(
            "Tasks Loading Error:",
            error
        );
    }
}


/* =========================================================
   RENDER TASKS
========================================================= */

function renderTasks() {

    const tbody =
        document.getElementById(
            "tasksTableBody"
        );

    if (!tbody) return;

    tbody.innerHTML = "";


    if (allTasks.length === 0) {

        tbody.innerHTML = `
            <tr>
                <td colspan="7">
                    <div class="empty-state">
                        <div class="empty-state-icon">📋</div>
                        <h3>No tasks found</h3>
                        <p>There are no tasks available.</p>
                    </div>
                </td>
            </tr>
        `;

        return;
    }


    allTasks.forEach(task => {

        const tr =
            document.createElement("tr");


        const assignedUser =
            allUsers.find(
                user =>
                    user.id ===
                    task.assignedTo
            );


        const status =
            task.status || "pending";


        let actionButtons = "";


        /*
         * USER ACTIONS
         */

        if (
            currentProfile.role === "user"
        ) {

            if (
                status === "pending"
            ) {

                actionButtons += `
                    <button
                        class="action-btn accept"
                        onclick="acceptTask('${task.id}')"
                    >
                        Accept
                    </button>
                `;
            }


            if (
                status === "accepted"
            ) {

                actionButtons += `
                    <button
                        class="action-btn start"
                        onclick="startTask('${task.id}')"
                    >
                        Start
                    </button>
                `;
            }


            if (
                status === "in-progress"
            ) {

                actionButtons += `
                    <button
                        class="action-btn end"
                        onclick="endTask('${task.id}')"
                    >
                        End Task
                    </button>
                `;
            }

        }


        /*
         * ADMIN / SUPER ADMIN ACTIONS
         */

        if (
            currentProfile.role === "admin" ||
            currentProfile.role === "superadmin"
        ) {

            actionButtons += `
                <button
                    class="action-btn view"
                    onclick="viewTask('${task.id}')"
                >
                    View
                </button>
            `;


            actionButtons += `
                <button
                    class="action-btn edit"
                    onclick="editTask('${task.id}')"
                >
                    Edit
                </button>
            `;


            actionButtons += `
                <button
                    class="action-btn delete"
                    onclick="deleteTask('${task.id}')"
                >
                    Delete
                </button>
            `;
        }


        /*
         * TIME
         */

        let timeText = "-";


        if (
            status === "in-progress" &&
            task.startedAt
        ) {

            timeText =
                calculateRunningTime(
                    task.startedAt
                );

        }

        else if (
            task.totalTime
        ) {

            timeText =
                formatDuration(
                    task.totalTime
                );
        }


        tr.innerHTML = `

            <td>
                <strong>
                    ${escapeHtml(
                        task.title || "Untitled"
                    )}
                </strong>
            </td>

            <td>
                ${
                    escapeHtml(
                        assignedUser?.name ||
                        task.assignedToName ||
                        "-"
                    )
                }
            </td>

            <td>
                <span class="priority-badge priority-${escapeHtml(
                    task.priority || "medium"
                )}">
                    ${escapeHtml(
                        task.priority || "medium"
                    )}
                </span>
            </td>

            <td>
                ${formatDateTime(
                    task.deadline
                )}
            </td>

            <td>
                <span class="status-badge status-${escapeHtml(
                    normalizeStatusClass(status)
                )}">
                    ${formatStatus(status)}
                </span>
            </td>

            <td>
                ${timeText}
            </td>

            <td>
                <div class="action-buttons">
                    ${actionButtons}
                </div>
            </td>
        `;


        tbody.appendChild(tr);
    });
}


/* =========================================================
   POPULATE TASK USER SELECT
========================================================= */

function populateTaskUsers() {

    const select =
        document.getElementById(
            "taskAssignedTo"
        );

    if (!select) return;


    select.innerHTML = `
        <option value="">
            Select user
        </option>
    `;


    let users =
        allUsers.filter(
            user =>
                user.role === "user"
        );


    users.forEach(user => {

        const option =
            document.createElement(
                "option"
            );

        option.value =
            user.id;

        option.textContent =
            `${user.name || user.email} — ${user.email}`;

        select.appendChild(option);
    });
}


/* =========================================================
   CREATE / EDIT TASK MODAL
========================================================= */

function openTaskModal(taskId = null) {

    if (
        currentProfile.role !== "admin" &&
        currentProfile.role !== "superadmin"
    ) {
        return;
    }


    const modal =
        document.getElementById(
            "taskModal"
        );


    const title =
        document.getElementById(
            "taskModalTitle"
        );


    const form =
        document.getElementById(
            "taskForm"
        );


    form.reset();


    document.getElementById(
        "editTaskId"
    ).value = "";


    if (taskId) {

        const task =
            allTasks.find(
                item =>
                    item.id === taskId
            );


        if (!task) return;


        title.textContent =
            "Edit Task";


        document.getElementById(
            "editTaskId"
        ).value =
            task.id;


        document.getElementById(
            "taskTitle"
        ).value =
            task.title || "";


        document.getElementById(
            "taskDescription"
        ).value =
            task.description || "";


        document.getElementById(
            "taskAssignedTo"
        ).value =
            task.assignedTo || "";


        document.getElementById(
            "taskPriority"
        ).value =
            task.priority || "medium";


        document.getElementById(
            "taskDeadline"
        ).value =
            convertToDateTimeLocal(
                task.deadline
            );

    }

    else {

        title.textContent =
            "Create Task";
    }


    modal.classList.add("show");
}


/* =========================================================
   SAVE TASK
========================================================= */

async function saveTask(event) {

    event.preventDefault();


    if (
        currentProfile.role !== "admin" &&
        currentProfile.role !== "superadmin"
    ) {
        return;
    }


    const taskId =
        document.getElementById(
            "editTaskId"
        ).value;


    const title =
        document.getElementById(
            "taskTitle"
        ).value.trim();


    const description =
        document.getElementById(
            "taskDescription"
        ).value.trim();


    const assignedTo =
        document.getElementById(
            "taskAssignedTo"
        ).value;


    const priority =
        document.getElementById(
            "taskPriority"
        ).value;


    const deadline =
        document.getElementById(
            "taskDeadline"
        ).value;


    if (
        !title ||
        !assignedTo
    ) {

        showMessage(
            "taskMessage",
            "Task title and assigned user are required.",
            "error"
        );

        return;
    }


    showLoading(true);


    try {

        const {
            collection,
            addDoc,
            doc,
            updateDoc,
            serverTimestamp
        } = window.firebaseFns;


        const assignedUser =
            allUsers.find(
                user =>
                    user.id ===
                    assignedTo
            );


        const taskData = {

            title: title,

            description: description,

            assignedTo: assignedTo,

            assignedToName:
                assignedUser?.name ||
                assignedUser?.email ||
                "",

            priority: priority,

            deadline:
                deadline || null
        };


        if (taskId) {

            await updateDoc(
                doc(
                    window.db,
                    "tasks",
                    taskId
                ),
                taskData
            );

        }

        else {

            const adminId =
                currentProfile.role === "admin"
                    ? currentUser.uid
                    : assignedUser?.adminId ||
                      currentUser.uid;


            await addDoc(
                collection(
                    window.db,
                    "tasks"
                ),
                {

                    ...taskData,

                    adminId: adminId,

                    assignedBy:
                        currentUser.uid,

                    status: "pending",

                    acceptedAt: null,

                    startedAt: null,

                    completedAt: null,

                    totalTime: 0,

                    createdAt:
                        serverTimestamp()
                }
            );
        }


        closeModal(
            "taskModal"
        );


        document.getElementById(
            "taskForm"
        ).reset();


        await loadTasks();

        await loadDashboard();


        showMessage(
            "loginMessage",
            taskId
                ? "Task updated successfully."
                : "Task created successfully.",
            "success"
        );


    } catch (error) {

        console.error(
            "Save Task Error:",
            error
        );

        showMessage(
            "taskMessage",
            getFirebaseError(error),
            "error"
        );

    } finally {

        showLoading(false);
    }
}


/* =========================================================
   EDIT TASK
========================================================= */

function editTask(taskId) {

    openTaskModal(taskId);
}


/* =========================================================
   DELETE TASK
========================================================= */

async function deleteTask(taskId) {

    if (
        currentProfile.role !== "admin" &&
        currentProfile.role !== "superadmin"
    ) {
        return;
    }


    const confirmed =
        confirm(
            "Are you sure you want to delete this task?"
        );


    if (!confirmed) return;


    showLoading(true);


    try {

        const {
            doc,
            deleteDoc
        } = window.firebaseFns;


        await deleteDoc(
            doc(
                window.db,
                "tasks",
                taskId
            )
        );


        await loadTasks();

        await loadDashboard();


        alert(
            "Task deleted successfully."
        );


    } catch (error) {

        console.error(
            "Delete Task Error:",
            error
        );

        alert(
            getFirebaseError(error)
        );

    } finally {

        showLoading(false);
    }
}


/* =========================================================
   VIEW TASK
========================================================= */

function viewTask(taskId) {

    const task =
        allTasks.find(
            item =>
                item.id === taskId
        );


    if (!task) return;


    const assignedUser =
        allUsers.find(
            user =>
                user.id ===
                task.assignedTo
        );


    const content =
        document.getElementById(
            "taskDetailsContent"
        );


    content.innerHTML = `

        <div class="task-detail">

            <span class="task-detail-label">
                Title
            </span>

            <div class="task-detail-value">
                ${escapeHtml(
                    task.title || "-"
                )}
            </div>

        </div>


        <div class="task-detail">

            <span class="task-detail-label">
                Description
            </span>

            <div class="task-detail-value task-description">
                ${escapeHtml(
                    task.description || "No description"
                )}
            </div>

        </div>


        <div class="task-detail">

            <span class="task-detail-label">
                Assigned To
            </span>

            <div class="task-detail-value">
                ${escapeHtml(
                    assignedUser?.name ||
                    task.assignedToName ||
                    "-"
                )}
            </div>

        </div>


        <div class="task-detail">

            <span class="task-detail-label">
                Priority
            </span>

            <div class="task-detail-value">
                ${escapeHtml(
                    task.priority || "-"
                )}
            </div>

        </div>


        <div class="task-detail">

            <span class="task-detail-label">
                Status
            </span>

            <div class="task-detail-value">
                ${formatStatus(
                    task.status || "pending"
                )}
            </div>

        </div>


        <div class="task-detail">

            <span class="task-detail-label">
                Deadline
            </span>

            <div class="task-detail-value">
                ${formatDateTime(
                    task.deadline
                )}
            </div>

        </div>


        <div class="task-detail">

            <span class="task-detail-label">
                Started
            </span>

            <div class="task-detail-value">
                ${formatDateTime(
                    task.startedAt
                )}
            </div>

        </div>


        <div class="task-detail">

            <span class="task-detail-label">
                Completed
            </span>

            <div class="task-detail-value">
                ${formatDateTime(
                    task.completedAt
                )}
            </div>

        </div>


        <div class="task-detail">

            <span class="task-detail-label">
                Total Time
            </span>

            <div class="task-detail-value">
                ${
                    task.totalTime
                        ? formatDuration(
                            task.totalTime
                        )
                        : "-"
                }
            </div>

        </div>
    `;


    document
        .getElementById(
            "taskDetailsModal"
        )
        .classList.add("show");
}


/* =========================================================
   ACCEPT TASK
========================================================= */

async function acceptTask(taskId) {

    if (
        currentProfile.role !== "user"
    ) return;


    showLoading(true);


    try {

        const {
            doc,
            updateDoc,
            serverTimestamp
        } = window.firebaseFns;


        await updateDoc(
            doc(
                window.db,
                "tasks",
                taskId
            ),
            {
                status: "accepted",

                acceptedAt:
                    serverTimestamp()
            }
        );


        await loadTasks();

        await loadDashboard();


    } catch (error) {

        console.error(
            "Accept Task Error:",
            error
        );

        alert(
            getFirebaseError(error)
        );

    } finally {

        showLoading(false);
    }
}


/* =========================================================
   START TASK
========================================================= */

async function startTask(taskId) {

    if (
        currentProfile.role !== "user"
    ) return;


    showLoading(true);


    try {

        const {
            doc,
            updateDoc,
            serverTimestamp
        } = window.firebaseFns;


        await updateDoc(
            doc(
                window.db,
                "tasks",
                taskId
            ),
            {
                status: "in-progress",

                startedAt:
                    serverTimestamp()
            }
        );


        await loadTasks();

        await loadDashboard();


    } catch (error) {

        console.error(
            "Start Task Error:",
            error
        );

        alert(
            getFirebaseError(error)
        );

    } finally {

        showLoading(false);
    }
}


/* =========================================================
   END TASK
========================================================= */

async function endTask(taskId) {

    if (
        currentProfile.role !== "user"
    ) return;


    const task =
        allTasks.find(
            item =>
                item.id === taskId
        );


    if (
        !task ||
        !task.startedAt
    ) {

        alert(
            "Task start time was not found."
        );

        return;
    }


    const startTime =
        getDateValue(
            task.startedAt
        );


    const endTime =
        Date.now();


    const totalTime =
        Math.max(
            0,
            endTime - startTime
        );


    showLoading(true);


    try {

        const {
            doc,
            updateDoc,
            serverTimestamp
        } = window.firebaseFns;


        await updateDoc(
            doc(
                window.db,
                "tasks",
                taskId
            ),
            {

                status: "completed",

                completedAt:
                    serverTimestamp(),

                totalTime:
                    totalTime
            }
        );


        await loadTasks();

        await loadDashboard();


    } catch (error) {

        console.error(
            "End Task Error:",
            error
        );

        alert(
            getFirebaseError(error)
        );

    } finally {

        showLoading(false);
    }
}


/* =========================================================
   LOAD DASHBOARD
========================================================= */

async function loadDashboard() {

    if (!currentProfile) return;


    const total =
        allTasks.length;


    const pending =
        allTasks.filter(
            task =>
                task.status ===
                "pending"
        ).length;


    const inProgress =
        allTasks.filter(
            task =>
                task.status ===
                "in-progress"
        ).length;


    const completed =
        allTasks.filter(
            task =>
                task.status ===
                "completed"
        ).length;


    document.getElementById(
        "totalTasks"
    ).textContent = total;


    document.getElementById(
        "pendingTasks"
    ).textContent = pending;


    document.getElementById(
        "inProgressTasks"
    ).textContent = inProgress;


    document.getElementById(
        "completedTasks"
    ).textContent = completed;


    /*
     * STUDENT
     */

    if (
        currentProfile.role === "user"
    ) {

        document
            .getElementById(
                "studentProgressSection"
            )
            .classList.remove("hidden");


        document
            .getElementById(
                "teamProgressSection"
            )
            .classList.add("hidden");


        document
            .getElementById(
                "adminOverviewSection"
            )
            .classList.add("hidden");


        document
            .getElementById(
                "teamInfoCard"
            )
            .classList.add("hidden");


        document.getElementById(
            "myCompleted"
        ).textContent =
            completed;


        document.getElementById(
            "myPending"
        ).textContent =
            pending;


        document.getElementById(
            "myInProgress"
        ).textContent =
            inProgress;


        document.getElementById(
            "chartTitle"
        ).textContent =
            "My Task Progress";


        updateChart(
            [
                pending,
                inProgress,
                completed
            ]
        );


        return;
    }


    /*
     * ADMIN
     */

    if (
        currentProfile.role === "admin"
    ) {

        document
            .getElementById(
                "studentProgressSection"
            )
            .classList.add("hidden");


        document
            .getElementById(
                "teamProgressSection"
            )
            .classList.remove("hidden");


        document
            .getElementById(
                "adminOverviewSection"
            )
            .classList.add("hidden");


        document
            .getElementById(
                "teamInfoCard"
            )
            .classList.remove("hidden");


        document.getElementById(
            "dashboardTeamName"
        ).textContent =
            currentProfile.teamName ||
            "My Team";


        document.getElementById(
            "dashboardMemberCount"
        ).textContent =
            allUsers.filter(
                user =>
                    user.role === "user"
            ).length;


        document.getElementById(
            "chartTitle"
        ).textContent =
            "Team Task Progress";


        updateChart(
            [
                pending,
                inProgress,
                completed
            ]
        );


        renderTeamProgress();


        return;
    }


    /*
     * SUPER ADMIN
     */

    if (
        currentProfile.role ===
        "superadmin"
    ) {

        document
            .getElementById(
                "studentProgressSection"
            )
            .classList.add("hidden");


        document
            .getElementById(
                "teamProgressSection"
            )
            .classList.add("hidden");


        document
            .getElementById(
                "adminOverviewSection"
            )
            .classList.remove("hidden");


        document
            .getElementById(
                "teamInfoCard"
            )
            .classList.add("hidden");


        document.getElementById(
            "chartTitle"
        ).textContent =
            "All Tasks Overview";


        updateChart(
            [
                pending,
                inProgress,
                completed
            ]
        );


        renderAdminOverview();
    }
}


/* =========================================================
   TEAM PROGRESS
========================================================= */

function renderTeamProgress() {

    const container =
        document.getElementById(
            "teamProgressList"
        );


    if (!container) return;


    const users =
        allUsers.filter(
            user =>
                user.role === "user"
        );


    container.innerHTML = "";


    if (users.length === 0) {

        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">👥</div>
                <h3>No students yet</h3>
                <p>Create users to see team progress.</p>
            </div>
        `;

        return;
    }


    users.forEach(user => {

        const tasks =
            allTasks.filter(
                task =>
                    task.assignedTo ===
                    user.id
            );


        const completed =
            tasks.filter(
                task =>
                    task.status ===
                    "completed"
            ).length;


        const percentage =
            tasks.length
                ? Math.round(
                    (
                        completed /
                        tasks.length
                    ) * 100
                )
                : 0;


        const item =
            document.createElement(
                "div"
            );


        item.className =
            "progress-item";


        item.innerHTML = `

            <div class="progress-item-header">

                <span class="progress-item-name">
                    ${escapeHtml(
                        user.name ||
                        user.email
                    )}
                </span>

                <span class="progress-item-value">
                    ${completed}/${tasks.length}
                    completed (${percentage}%)
                </span>

            </div>

            <div class="progress-bar">

                <div
                    class="progress-bar-fill"
                    style="width:${percentage}%"
                ></div>

            </div>

        `;


        container.appendChild(item);
    });
}


/* =========================================================
   LOAD ADMINS
========================================================= */

async function loadAdmins() {

    if (
        !currentProfile ||
        currentProfile.role !==
            "superadmin"
    ) {
        return;
    }


    try {

        const {
            collection,
            getDocs,
            query,
            where
        } = window.firebaseFns;


        const q =
            query(
                collection(
                    window.db,
                    "users"
                ),
                where(
                    "role",
                    "==",
                    "admin"
                )
            );


        const snapshot =
            await getDocs(q);


        allAdmins = [];


        snapshot.forEach(docSnap => {

            allAdmins.push({
                id: docSnap.id,
                ...docSnap.data()
            });

        });


        renderAdmins();

    } catch (error) {

        console.error(
            "Admins Loading Error:",
            error
        );
    }
}


/* =========================================================
   RENDER ADMINS
========================================================= */

function renderAdmins() {

    const tbody =
        document.getElementById(
            "adminsTableBody"
        );


    if (!tbody) return;


    tbody.innerHTML = "";


    if (allAdmins.length === 0) {

        tbody.innerHTML = `
            <tr>
                <td colspan="5">
                    <div class="empty-state">
                        <div class="empty-state-icon">👨‍🏫</div>
                        <h3>No admins found</h3>
                        <p>No teachers have registered yet.</p>
                    </div>
                </td>
            </tr>
        `;

        return;
    }


    allAdmins.forEach(admin => {

        const tr =
            document.createElement("tr");


        tr.innerHTML = `

            <td>
                <strong>
                    ${escapeHtml(
                        admin.name ||
                        "-"
                    )}
                </strong>
            </td>

            <td>
                ${escapeHtml(
                    admin.email ||
                    "-"
                )}
            </td>

            <td>
                ${escapeHtml(
                    admin.teamName ||
                    "-"
                )}
            </td>

            <td>

                <span class="status-badge status-completed">

                    ${
                        admin.active === false
                            ? "Inactive"
                            : "Active"
                    }

                </span>

            </td>

            <td>
                ${formatDateTime(
                    admin.createdAt
                )}
            </td>
        `;


        tbody.appendChild(tr);
    });
}


/* =========================================================
   SUPER ADMIN TEAM OVERVIEW
========================================================= */

function renderAdminOverview() {

    const container =
        document.getElementById(
            "adminOverviewList"
        );


    if (!container) return;


    container.innerHTML = "";


    if (allAdmins.length === 0) {

        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">👨‍🏫</div>
                <h3>No teams yet</h3>
                <p>Registered teachers will appear here.</p>
            </div>
        `;

        return;
    }


    allAdmins.forEach(admin => {

        const teamUsers =
            allUsers.filter(
                user =>
                    user.adminId ===
                    admin.id
            );


        const teamTasks =
            allTasks.filter(
                task =>
                    task.adminId ===
                    admin.id
            );


        const completed =
            teamTasks.filter(
                task =>
                    task.status ===
                    "completed"
            ).length;


        const item =
            document.createElement(
                "div"
            );


        item.className =
            "admin-overview-item";


        item.innerHTML = `

            <h3>
                ${escapeHtml(
                    admin.teamName ||
                    "Unnamed Team"
                )}
            </h3>

            <p>
                Teacher:
                ${escapeHtml(
                    admin.name ||
                    admin.email
                )}
            </p>

            <p>
                ${escapeHtml(
                    admin.email ||
                    "-"
                )}
            </p>

            <div class="admin-overview-stats">

                <div>
                    <span>Members</span>
                    <strong>
                        ${teamUsers.filter(
                            user =>
                                user.role === "user"
                        ).length}
                    </strong>
                </div>

                <div>
                    <span>Tasks</span>
                    <strong>
                        ${teamTasks.length}
                    </strong>
                </div>

                <div>
                    <span>Completed</span>
                    <strong>
                        ${completed}
                    </strong>
                </div>

            </div>

        `;


        container.appendChild(item);
    });
}


/* =========================================================
   CHART
========================================================= */

function updateChart(values) {

    const canvas =
        document.getElementById(
            "taskChart"
        );


    if (!canvas) return;


    if (taskChart) {

        taskChart.destroy();

        taskChart = null;
    }


    taskChart =
        new Chart(
            canvas,
            {
                type: "doughnut",

                data: {

                    labels: [
                        "Pending",
                        "In Progress",
                        "Completed"
                    ],

                    datasets: [
                        {
                            data: values
                        }
                    ]
                },

                options: {

                    responsive: true,

                    maintainAspectRatio: false,

                    plugins: {

                        legend: {
                            position: "bottom"
                        }
                    }
                }
            }
        );
}


/* =========================================================
   LOGOUT
========================================================= */

async function logout() {

    try {

        await window.firebaseFns.signOut(
            window.firebaseAuth
        );

        currentUser = null;

        currentProfile = null;

        allTasks = [];

        allUsers = [];

        allAdmins = [];

        if (taskChart) {

            taskChart.destroy();

            taskChart = null;
        }

        showLoginPage();

    } catch (error) {

        console.error(
            "Logout Error:",
            error
        );
    }
}


/* =========================================================
   MODAL HELPERS
========================================================= */

function closeModal(modalId) {

    const modal =
        document.getElementById(
            modalId
        );


    if (modal) {

        modal.classList.remove(
            "show"
        );
    }
}


function openUserModal() {

    if (
        currentProfile.role !== "admin" &&
        currentProfile.role !== "superadmin"
    ) {
        return;
    }


    document.getElementById(
        "userForm"
    ).reset();


    document.getElementById(
        "userMessage"
    ).textContent = "";


    document.getElementById(
        "userModal"
    ).classList.add("show");
}


/* =========================================================
   LOADING
========================================================= */

function showLoading(show) {

    const overlay =
        document.getElementById(
            "loadingOverlay"
        );


    if (!overlay) return;


    if (show) {

        overlay.classList.remove(
            "hidden"
        );

    } else {

        overlay.classList.add(
            "hidden"
        );
    }
}


/* =========================================================
   MESSAGE
========================================================= */

function showMessage(
    elementId,
    message,
    type = "info"
) {

    const element =
        document.getElementById(
            elementId
        );


    if (!element) return;


    element.textContent =
        message;


    element.className =
        `message ${type}`;


    setTimeout(
        () => {

            if (
                element.textContent ===
                message
            ) {

                element.textContent = "";

                element.className =
                    "message";
            }

        },
        5000
    );
}


/* =========================================================
   FIREBASE ERROR TRANSLATION
========================================================= */

function getFirebaseError(error) {

    if (!error) {
        return "An unknown error occurred.";
    }


    const code =
        error.code || "";


    const messages = {

        "auth/invalid-credential":
            "Invalid email or password.",

        "auth/invalid-login-credentials":
            "Invalid email or password.",

        "auth/wrong-password":
            "Incorrect password.",

        "auth/user-not-found":
            "No account was found with this email.",

        "auth/email-already-in-use":
            "This email is already registered.",

        "auth/weak-password":
            "Password is too weak. Use at least 6 characters.",

        "auth/invalid-email":
            "Please enter a valid email address.",

        "auth/api-key-not-valid":
            "Firebase API key is invalid. Please check Firebase configuration.",

        "auth/unauthorized-domain":
            "This website domain is not authorized in Firebase Authentication.",

        "permission-denied":
            "Firestore permission denied. Please check Firestore Security Rules.",

        "auth/network-request-failed":
            "Network error. Please check your internet connection."
    };


    return (
        messages[code] ||
        error.message ||
        "Something went wrong."
    );
}


/* =========================================================
   FORMAT HELPERS
========================================================= */

function capitalize(value) {

    if (!value) return "";

    return (
        value.charAt(0).toUpperCase() +
        value.slice(1)
    );
}


function formatRole(role) {

    if (!role) return "User";


    const roles = {

        superadmin:
            "Super Admin",

        admin:
            "Admin / Teacher",

        user:
            "User / Student"
    };


    return (
        roles[role] ||
        capitalize(role)
    );
}


function formatStatus(status) {

    const statuses = {

        pending:
            "Pending",

        accepted:
            "Accepted",

        "in-progress":
            "In Progress",

        completed:
            "Completed"
    };


    return (
        statuses[status] ||
        status ||
        "Pending"
    );
}


function normalizeStatusClass(status) {

    if (
        status ===
        "in_progress"
    ) {
        return "in-progress";
    }


    return status || "pending";
}


function getDateValue(value) {

    if (!value) return 0;


    if (
        typeof value.toMillis ===
        "function"
    ) {
        return value.toMillis();
    }


    if (
        value instanceof Date
    ) {
        return value.getTime();
    }


    if (
        typeof value ===
        "number"
    ) {
        return value;
    }


    const parsed =
        new Date(value).getTime();


    return Number.isNaN(parsed)
        ? 0
        : parsed;
}


function formatDateTime(value) {

    const timestamp =
        getDateValue(value);


    if (!timestamp) {
        return "-";
    }


    return new Date(
        timestamp
    ).toLocaleString();
}


function convertToDateTimeLocal(value) {

    const timestamp =
        getDateValue(value);


    if (!timestamp) {
        return "";
    }


    const date =
        new Date(timestamp);


    const year =
        date.getFullYear();


    const month =
        String(
            date.getMonth() + 1
        ).padStart(2, "0");


    const day =
        String(
            date.getDate()
        ).padStart(2, "0");


    const hours =
        String(
            date.getHours()
        ).padStart(2, "0");


    const minutes =
        String(
            date.getMinutes()
        ).padStart(2, "0");


    return `${year}-${month}-${day}T${hours}:${minutes}`;
}


function formatDuration(milliseconds) {

    if (!milliseconds) {
        return "0m";
    }


    const totalSeconds =
        Math.floor(
            milliseconds / 1000
        );


    const days =
        Math.floor(
            totalSeconds / 86400
        );


    const hours =
        Math.floor(
            (totalSeconds % 86400) /
            3600
        );


    const minutes =
        Math.floor(
            (totalSeconds % 3600) /
            60
        );


    const seconds =
        totalSeconds % 60;


    let result = "";


    if (days) {
        result += `${days}d `;
    }


    if (hours) {
        result += `${hours}h `;
    }


    if (minutes) {
        result += `${minutes}m `;
    }


    if (
        seconds &&
        !days &&
        !hours
    ) {
        result += `${seconds}s`;
    }


    return (
        result.trim() ||
        "0m"
    );
}


function calculateRunningTime(startedAt) {

    const start =
        getDateValue(
            startedAt
        );


    if (!start) {
        return "0m";
    }


    return formatDuration(
        Date.now() - start
    );
}


/* =========================================================
   HTML ESCAPE
========================================================= */

function escapeHtml(value) {

    if (
        value === null ||
        value === undefined
    ) {
        return "";
    }


    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}


/* =========================================================
   CLOSE MODALS WHEN CLICKING OUTSIDE
========================================================= */

window.addEventListener(
    "click",
    event => {

        const modals =
            document.querySelectorAll(
                ".modal"
            );


        modals.forEach(modal => {

            if (
                event.target ===
                modal
            ) {

                modal.classList.remove(
                    "show"
                );
            }
        });
    }
);


/* =========================================================
   GLOBAL FUNCTIONS
   Required because HTML uses onclick=""
========================================================= */

window.login =
    login;

window.logout =
    logout;

window.showSection =
    showSection;

window.openAdminSignup =
    openAdminSignup;

window.registerAdmin =
    registerAdmin;

window.openUserModal =
    openUserModal;

window.createUser =
    createUser;

window.deleteUser =
    deleteUser;

window.openTaskModal =
    openTaskModal;

window.saveTask =
    saveTask;

window.editTask =
    editTask;

window.deleteTask =
    deleteTask;

window.viewTask =
    viewTask;

window.acceptTask =
    acceptTask;

window.startTask =
    startTask;

window.endTask =
    endTask;

window.closeModal =
    closeModal;
