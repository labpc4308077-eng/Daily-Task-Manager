// ============================================================
// DAILY TASK MANAGER
// Firebase Authentication + Firestore
// ============================================================

import { initializeApp } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js";

import {
    getAuth,
    signInWithEmailAndPassword,
    signOut,
    onAuthStateChanged,
    createUserWithEmailAndPassword
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js";

import {
    getFirestore,
    collection,
    doc,
    getDoc,
    getDocs,
    addDoc,
    setDoc,
    updateDoc,
    deleteDoc,
    query,
    where,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";


// ============================================================
// FIREBASE CONFIG
// ============================================================

const firebaseConfig = {
    apiKey: "AIzaSyDPCcPsKOuOCcsN8LYoz7J3QitNhksejxM",
    authDomain: "daily-task-manager-9d83d.firebaseapp.com",
    projectId: "daily-task-manager-9d83d",
    storageBucket: "daily-task-manager-9d83d.firebasestorage.app",
    messagingSenderId: "197724632235",
    appId: "1:197724632235:web:41b63b86f3fc67707933ee",
    measurementId: "G-NQVVKXPMPT"
};


// ============================================================
// FIREBASE INITIALIZATION
// ============================================================

const app = initializeApp(firebaseConfig);

const auth = getAuth(app);

const db = getFirestore(app);


// Secondary Firebase app
// Used for creating Admin/User accounts without logging out
// the current Super Admin/Admin.

const secondaryApp = initializeApp(
    firebaseConfig,
    "SecondaryApp"
);

const secondaryAuth = getAuth(secondaryApp);


// ============================================================
// GLOBAL VARIABLES
// ============================================================

let currentUser = null;

let users = [];

let admins = [];

let tasks = [];


// ============================================================
// HELPER
// ============================================================

function el(id) {
    return document.getElementById(id);
}


// ============================================================
// LOGIN
// ============================================================

async function login() {

    const email =
        el("loginUsername")?.value.trim();

    const password =
        el("loginPassword")?.value;

    const errorBox =
        el("loginError");

    if (errorBox) {
        errorBox.innerText = "";
    }

    if (!email || !password) {

        if (errorBox) {
            errorBox.innerText =
                "Email and password are required.";
        }

        return;
    }

    try {

        await signInWithEmailAndPassword(
            auth,
            email,
            password
        );

    } catch (error) {

        console.error(
            "Login Error:",
            error
        );

        if (errorBox) {

            errorBox.innerText =
                getFriendlyAuthError(error);
        }
    }
}


// ============================================================
// AUTH STATE
// ============================================================

onAuthStateChanged(
    auth,
    async (firebaseUser) => {

        if (!firebaseUser) {

            currentUser = null;

            showLoginPage();

            return;
        }

        try {

            await loadCurrentUser(
                firebaseUser
            );

        } catch (error) {

            console.error(
                "User Profile Error:",
                error
            );

            let message =
                error?.message ||
                "Account profile not found.";

            if (
                error?.code ===
                "permission-denied"
            ) {

                message =
                    "Firestore permission denied. Please check Firestore Security Rules.";
            }

            alert(message);

            await signOut(auth);

            showLoginPage();
        }
    }
);


// ============================================================
// LOAD CURRENT USER
// ============================================================

async function loadCurrentUser(
    firebaseUser
) {

    const userRef =
        doc(
            db,
            "users",
            firebaseUser.uid
        );

    const userSnap =
        await getDoc(userRef);


    if (!userSnap.exists()) {

        throw new Error(
            "Profile not found.\n\n" +
            "Firebase UID:\n" +
            firebaseUser.uid +
            "\n\n" +
            "Make sure this exact UID is the Document ID inside Firestore users collection."
        );
    }


    const profile =
        userSnap.data();


    if (!profile.role) {

        throw new Error(
            "Profile exists, but the role field is missing."
        );
    }


    if (profile.active === false) {

        throw new Error(
            "This account is inactive."
        );
    }


    currentUser = {

        uid:
            firebaseUser.uid,

        email:
            firebaseUser.email ||
            profile.email ||
            "",

        name:
            profile.name ||
            firebaseUser.email ||
            "User",

        role:
            profile.role
    };


    console.log(
        "Logged in user:",
        currentUser
    );


    await loadData();

    showApp();
}


// ============================================================
// LOAD DATA
// ============================================================

async function loadData() {

    users = [];

    admins = [];

    tasks = [];


    if (!currentUser) {
        return;
    }


    // ========================================================
    // NORMAL USER
    // ========================================================

    if (
        currentUser.role ===
        "user"
    ) {

        const ownUserSnap =
            await getDoc(
                doc(
                    db,
                    "users",
                    currentUser.uid
                )
            );


        if (ownUserSnap.exists()) {

            users = [
                {
                    uid:
                        ownUserSnap.id,

                    ...ownUserSnap.data()
                }
            ];
        }


        const taskQuery =
            query(
                collection(
                    db,
                    "tasks"
                ),

                where(
                    "assignedTo",
                    "==",
                    currentUser.uid
                )
            );


        const taskSnap =
            await getDocs(
                taskQuery
            );


        tasks =
            taskSnap.docs.map(
                taskDoc => ({

                    id:
                        taskDoc.id,

                    ...taskDoc.data()
                })
            );


        return;
    }


    // ========================================================
    // ADMIN / SUPER ADMIN
    // ========================================================

    const usersSnap =
        await getDocs(
            collection(
                db,
                "users"
            )
        );


    users =
        usersSnap.docs.map(
            userDoc => ({

                uid:
                    userDoc.id,

                ...userDoc.data()
            })
        );


    admins =
        users.filter(
            user =>
                user.role ===
                "admin"
        );


    const tasksSnap =
        await getDocs(
            collection(
                db,
                "tasks"
            )
        );


    tasks =
        tasksSnap.docs.map(
            taskDoc => ({

                id:
                    taskDoc.id,

                ...taskDoc.data()
            })
        );
}


// ============================================================
// SHOW APP
// ============================================================

function showApp() {

    if (el("loginPage")) {

        el("loginPage").style.display =
            "none";
    }


    if (el("dashboardPage")) {

        el("dashboardPage").style.display =
            "flex";
    }


    if (el("currentUser")) {

        el("currentUser").innerText =
            currentUser.name +
            " (" +
            currentUser.role +
            ")";
    }


    setupPermissions();

    updateDashboard();

    renderUsers();

    renderAdmins();

    renderTasks();
}


// ============================================================
// SHOW LOGIN
// ============================================================

function showLoginPage() {

    if (el("loginPage")) {

        el("loginPage").style.display =
            "flex";
    }


    if (el("dashboardPage")) {

        el("dashboardPage").style.display =
            "none";
    }


    if (el("currentUser")) {

        el("currentUser").innerText =
            "";
    }
}


// ============================================================
// PERMISSIONS
// ============================================================

function setupPermissions() {

    const role =
        currentUser?.role;


    const usersMenu =
        el("usersMenu");

    const adminsMenu =
        el("adminsMenu");

    const createTaskButton =
        el("createTaskButton");


    const createUserButton =
        document.querySelector(
            "#usersSection .primary"
        );


    const createAdminButton =
        document.querySelector(
            "#adminsSection .primary"
        );


    // Hide role dropdown
    const roleSelect =
        el("loginRole");

    if (roleSelect) {

        roleSelect.style.display =
            "none";
    }


    // ========================================================
    // SUPER ADMIN
    // ========================================================

    if (
        role ===
        "superadmin"
    ) {

        if (usersMenu) {

            usersMenu.style.display =
                "block";
        }

        if (adminsMenu) {

            adminsMenu.style.display =
                "block";
        }

        if (createTaskButton) {

            createTaskButton.style.display =
                "block";
        }

        if (createUserButton) {

            createUserButton.style.display =
                "inline-block";
        }

        if (createAdminButton) {

            createAdminButton.style.display =
                "inline-block";
        }

        return;
    }


    // ========================================================
    // ADMIN
    // ========================================================

    if (
        role ===
        "admin"
    ) {

        if (usersMenu) {

            usersMenu.style.display =
                "block";
        }

        if (adminsMenu) {

            adminsMenu.style.display =
                "none";
        }

        if (createTaskButton) {

            createTaskButton.style.display =
                "block";
        }

        if (createUserButton) {

            createUserButton.style.display =
                "inline-block";
        }

        if (createAdminButton) {

            createAdminButton.style.display =
                "none";
        }

        return;
    }


    // ========================================================
    // NORMAL USER
    // ========================================================

    if (usersMenu) {

        usersMenu.style.display =
            "none";
    }

    if (adminsMenu) {

        adminsMenu.style.display =
            "none";
    }

    if (createTaskButton) {

        createTaskButton.style.display =
            "none";
    }

    if (createUserButton) {

        createUserButton.style.display =
            "none";
    }

    if (createAdminButton) {

        createAdminButton.style.display =
            "none";
    }
}


// ============================================================
// DASHBOARD
// ============================================================

function updateDashboard() {

    const visibleTasks =
        getVisibleTasks();


    if (el("totalTasks")) {

        el("totalTasks").innerText =
            visibleTasks.length;
    }


    if (el("pendingTasks")) {

        el("pendingTasks").innerText =
            visibleTasks.filter(
                task =>
                    task.status ===
                    "Pending"
            ).length;
    }


    if (el("progressTasks")) {

        el("progressTasks").innerText =
            visibleTasks.filter(
                task =>
                    task.status ===
                    "In Progress"
            ).length;
    }


    if (el("completedTasks")) {

        el("completedTasks").innerText =
            visibleTasks.filter(
                task =>
                    task.status ===
                    "Completed"
            ).length;
    }
}


// ============================================================
// VISIBLE TASKS
// ============================================================

function getVisibleTasks() {

    if (!currentUser) {

        return [];
    }

    return tasks;
}


// ============================================================
// SECTION NAVIGATION
// ============================================================

function showSection(
    section
) {

    const sections = [
        "dashboardSection",
        "usersSection",
        "adminsSection",
        "tasksSection"
    ];


    sections.forEach(
        id => {

            if (el(id)) {

                el(id)
                    .classList
                    .add("hidden");
            }
        }
    );


    if (
        section ===
        "dashboard"
    ) {

        el("dashboardSection")
            ?.classList
            .remove("hidden");

        return;
    }


    if (
        section ===
        "users"
    ) {

        if (
            currentUser.role ===
            "user"
        ) {

            return;
        }

        el("usersSection")
            ?.classList
            .remove("hidden");

        renderUsers();

        return;
    }


    if (
        section ===
        "admins"
    ) {

        if (
            currentUser.role !==
            "superadmin"
        ) {

            return;
        }

        el("adminsSection")
            ?.classList
            .remove("hidden");

        renderAdmins();

        return;
    }


    if (
        section ===
        "tasks"
    ) {

        el("tasksSection")
            ?.classList
            .remove("hidden");

        renderTasks();
    }
}


// ============================================================
// USER MODAL
// ============================================================

function openUserModal() {

    if (
        currentUser.role !==
        "admin" &&
        currentUser.role !==
        "superadmin"
    ) {

        return;
    }


    if (el("userModal")) {

        el("userModal").style.display =
            "flex";
    }
}


// ============================================================
// CREATE USER
// ============================================================

async function createUser() {

    if (
        currentUser.role !==
        "admin" &&
        currentUser.role !==
        "superadmin"
    ) {

        return;
    }


    const email =
        el("newUserName")
            ?.value
            .trim();


    const password =
        el("newUserPassword")
            ?.value;


    if (!email || !password) {

        alert(
            "Email and password are required."
        );

        return;
    }


    if (
        password.length <
        6
    ) {

        alert(
            "Password must be at least 6 characters."
        );

        return;
    }


    try {

        const credential =
            await createUserWithEmailAndPassword(
                secondaryAuth,
                email,
                password
            );


        await setDoc(
            doc(
                db,
                "users",
                credential.user.uid
            ),
            {

                name:
                    email,

                email:
                    email,

                role:
                    "user",

                active:
                    true,

                createdBy:
                    currentUser.uid,

                createdAt:
                    serverTimestamp()
            }
        );


        await signOut(
            secondaryAuth
        );


        if (el("newUserName")) {

            el("newUserName").value =
                "";
        }


        if (el("newUserPassword")) {

            el("newUserPassword").value =
                "";
        }


        closeModal(
            "userModal"
        );


        await loadData();

        renderUsers();

        updateTaskUsers();


        alert(
            "User created successfully."
        );

    } catch (error) {

        console.error(
            "Create User Error:",
            error
        );


        try {

            await signOut(
                secondaryAuth
            );

        } catch (_) {}


        alert(
            getFriendlyAuthError(
                error
            )
        );
    }
}


// ============================================================
// RENDER USERS
// ============================================================

function renderUsers() {

    const container =
        el("usersList");


    if (!container) {

        return;
    }


    container.innerHTML =
        "";


    const normalUsers =
        users.filter(
            user =>
                user.role ===
                "user"
        );


    if (
        normalUsers.length ===
        0
    ) {

        container.innerHTML =
            "<p>No users found.</p>";

        updateTaskUsers();

        return;
    }


    normalUsers.forEach(
        user => {

            container.innerHTML += `

                <div class="user-card">

                    <h3>
                        ${escapeHTML(
                            user.name ||
                            user.email
                        )}
                    </h3>

                    <p>
                        Email:
                        ${escapeHTML(
                            user.email ||
                            ""
                        )}
                    </p>

                    <p>
                        Role: User
                    </p>

                    <button
                        onclick="deleteUser('${escapeAttr(user.uid)}')">

                        Delete

                    </button>

                </div>

            `;
        }
    );


    updateTaskUsers();
}


// ============================================================
// DELETE USER
// ============================================================

async function deleteUser(
    uid
) {

    if (
        currentUser.role !==
        "admin" &&
        currentUser.role !==
        "superadmin"
    ) {

        return;
    }


    if (
        uid ===
        currentUser.uid
    ) {

        alert(
            "You cannot delete your own account."
        );

        return;
    }


    if (
        !confirm(
            "Delete this user's Firestore profile?"
        )
    ) {

        return;
    }


    try {

        await deleteDoc(
            doc(
                db,
                "users",
                uid
            )
        );


        await loadData();

        renderUsers();

        updateTaskUsers();


        alert(
            "User profile deleted."
        );

    } catch (error) {

        console.error(
            "Delete User Error:",
            error
        );

        alert(
            getFriendlyFirestoreError(
                error
            )
        );
    }
}


// ============================================================
// ADMIN MODAL
// ============================================================

function openAdminModal() {

    if (
        currentUser.role !==
        "superadmin"
    ) {

        return;
    }


    if (el("adminModal")) {

        el("adminModal").style.display =
            "flex";
    }
}


// ============================================================
// CREATE ADMIN
// ============================================================

async function createAdmin() {

    if (
        currentUser.role !==
        "superadmin"
    ) {

        return;
    }


    const email =
        el("newAdminName")
            ?.value
            .trim();


    const password =
        el("newAdminPassword")
            ?.value;


    if (!email || !password) {

        alert(
            "Email and password are required."
        );

        return;
    }


    if (
        password.length <
        6
    ) {

        alert(
            "Password must be at least 6 characters."
        );

        return;
    }


    try {

        const credential =
            await createUserWithEmailAndPassword(
                secondaryAuth,
                email,
                password
            );


        await setDoc(
            doc(
                db,
                "users",
                credential.user.uid
            ),
            {

                name:
                    email,

                email:
                    email,

                role:
                    "admin",

                active:
                    true,

                createdBy:
                    currentUser.uid,

                createdAt:
                    serverTimestamp()
            }
        );


        await signOut(
            secondaryAuth
        );


        if (el("newAdminName")) {

            el("newAdminName").value =
                "";
        }


        if (el("newAdminPassword")) {

            el("newAdminPassword").value =
                "";
        }


        closeModal(
            "adminModal"
        );


        await loadData();

        renderAdmins();


        alert(
            "Admin created successfully."
        );

    } catch (error) {

        console.error(
            "Create Admin Error:",
            error
        );


        try {

            await signOut(
                secondaryAuth
            );

        } catch (_) {}


        alert(
            getFriendlyAuthError(
                error
            )
        );
    }
}


// ============================================================
// RENDER ADMINS
// ============================================================

function renderAdmins() {

    const container =
        el("adminsList");


    if (!container) {

        return;
    }


    container.innerHTML =
        "";


    if (
        currentUser?.role !==
        "superadmin"
    ) {

        return;
    }


    if (
        admins.length ===
        0
    ) {

        container.innerHTML =
            "<p>No admins found.</p>";

        return;
    }


    admins.forEach(
        admin => {

            container.innerHTML += `

                <div class="admin-card">

                    <h3>
                        ${escapeHTML(
                            admin.name ||
                            admin.email
                        )}
                    </h3>

                    <p>
                        Email:
                        ${escapeHTML(
                            admin.email ||
                            ""
                        )}
                    </p>

                    <p>
                        Role: Admin
                    </p>

                    <button
                        onclick="deleteAdmin('${escapeAttr(admin.uid)}')">

                        Delete

                    </button>

                </div>

            `;
        }
    );
}


// ============================================================
// DELETE ADMIN
// ============================================================

async function deleteAdmin(
    uid
) {

    if (
        currentUser.role !==
        "superadmin"
    ) {

        return;
    }


    if (
        uid ===
        currentUser.uid
    ) {

        alert(
            "You cannot delete your own account."
        );

        return;
    }


    if (
        !confirm(
            "Delete this admin's Firestore profile?"
        )
    ) {

        return;
    }


    try {

        await deleteDoc(
            doc(
                db,
                "users",
                uid
            )
        );


        await loadData();

        renderAdmins();


        alert(
            "Admin profile deleted."
        );

    } catch (error) {

        console.error(
            "Delete Admin Error:",
            error
        );

        alert(
            getFriendlyFirestoreError(
                error
            )
        );
    }
}


// ============================================================
// TASK MODAL
// ============================================================

function openTaskModal() {

    if (
        currentUser.role !==
        "admin" &&
        currentUser.role !==
        "superadmin"
    ) {

        return;
    }


    updateTaskUsers();


    if (el("taskModal")) {

        el("taskModal").style.display =
            "flex";
    }
}


// ============================================================
// TASK USER DROPDOWN
// ============================================================

function updateTaskUsers() {

    const select =
        el("taskUser");


    if (!select) {

        return;
    }


    select.innerHTML =
        "";


    const normalUsers =
        users.filter(
            user =>
                user.role ===
                "user"
        );


    if (
        normalUsers.length ===
        0
    ) {

        select.innerHTML =
            `<option value="">
                No users available
            </option>`;

        return;
    }


    normalUsers.forEach(
        user => {

            const option =
                document.createElement(
                    "option"
                );

            option.value =
                user.uid;

            option.textContent =
                user.name ||
                user.email ||
                user.uid;

            select.appendChild(
                option
            );
        }
    );
}


// ============================================================
// CREATE TASK
// ============================================================

async function createTask() {

    if (
        currentUser.role !==
        "admin" &&
        currentUser.role !==
        "superadmin"
    ) {

        return;
    }


    const title =
        el("taskTitle")
            ?.value
            .trim();


    const description =
        el("taskDescription")
            ?.value
            .trim() ||
        "";


    const deadline =
        el("taskDeadline")
            ?.value ||
        "";


    const priority =
        el("taskPriority")
            ?.value ||
        "Low";


    const assignedTo =
        el("taskUser")
            ?.value;


    if (
        !title ||
        !assignedTo
    ) {

        alert(
            "Task title and user are required."
        );

        return;
    }


    try {

        await addDoc(
            collection(
                db,
                "tasks"
            ),
            {

                title:
                    title,

                description:
                    description,

                deadline:
                    deadline,

                priority:
                    priority,

                assignedTo:
                    assignedTo,

                assignedBy:
                    currentUser.uid,

                status:
                    "Pending",

                acceptedAt:
                    null,

                startedAt:
                    null,

                completedAt:
                    null,

                totalTime:
                    0,

                createdAt:
                    serverTimestamp()
            }
        );


        if (el("taskTitle")) {

            el("taskTitle").value =
                "";
        }


        if (el("taskDescription")) {

            el("taskDescription").value =
                "";
        }


        if (el("taskDeadline")) {

            el("taskDeadline").value =
                "";
        }


        if (el("taskPriority")) {

            el("taskPriority").value =
                "Low";
        }


        closeModal(
            "taskModal"
        );


        await loadData();

        renderTasks();

        updateDashboard();


        alert(
            "Task created successfully."
        );

    } catch (error) {

        console.error(
            "Create Task Error:",
            error
        );

        alert(
            getFriendlyFirestoreError(
                error
            )
        );
    }
}


// ============================================================
// RENDER TASKS
// ============================================================

function renderTasks() {

    const container =
        el("tasksList");


    if (!container) {

        return;
    }


    container.innerHTML =
        "";


    const visibleTasks =
        getVisibleTasks();


    if (
        visibleTasks.length ===
        0
    ) {

        container.innerHTML =
            "<p>No tasks found.</p>";

        return;
    }


    visibleTasks.forEach(
        task => {

            container.innerHTML +=
                createTaskHTML(task);
        }
    );
}


// ============================================================
// TASK HTML
// ============================================================

function createTaskHTML(
    task
) {

    let buttons =
        "";


    // ========================================================
    // USER WORKFLOW
    // ========================================================

    if (
        currentUser.role ===
        "user"
    ) {

        if (
            task.status ===
            "Pending"
        ) {

            buttons += `

                <button
                    class="primary"
                    onclick="acceptTask('${escapeAttr(task.id)}')">

                    Accept Task

                </button>

            `;
        }


        if (
            task.status ===
            "Accepted"
        ) {

            buttons += `

                <button
                    class="primary"
                    onclick="startTask('${escapeAttr(task.id)}')">

                    Start Task

                </button>

            `;
        }


        if (
            task.status ===
            "In Progress"
        ) {

            buttons += `

                <button
                    class="primary"
                    onclick="endTask('${escapeAttr(task.id)}')">

                    End Task

                </button>

            `;
        }
    }


    // ========================================================
    // ADMIN / SUPER ADMIN
    // ========================================================

    if (
        currentUser.role ===
        "admin" ||
        currentUser.role ===
        "superadmin"
    ) {

        buttons += `

            <button
                onclick="editTask('${escapeAttr(task.id)}')">

                Edit

            </button>

            <button
                onclick="deleteTask('${escapeAttr(task.id)}')">

                Delete

            </button>

        `;
    }


    const assignedUser =
        users.find(
            user =>
                user.uid ===
                task.assignedTo
        );


    const assignedName =
        assignedUser
            ? (
                assignedUser.name ||
                assignedUser.email
            )
            : task.assignedTo;


    return `

        <div class="task-card">

            <h3>
                ${escapeHTML(
                    task.title
                )}
            </h3>

            <p>
                ${escapeHTML(
                    task.description ||
                    ""
                )}
            </p>

            <p>
                <strong>
                    Assigned To:
                </strong>

                ${escapeHTML(
                    assignedName ||
                    ""
                )}
            </p>

            <p>
                <strong>
                    Priority:
                </strong>

                ${escapeHTML(
                    task.priority ||
                    ""
                )}
            </p>

            <p>
                <strong>
                    Deadline:
                </strong>

                ${escapeHTML(
                    task.deadline ||
                    "Not Set"
                )}
            </p>

            <p>
                <strong>
                    Status:
                </strong>

                <span class="status">
                    ${escapeHTML(
                        task.status ||
                        ""
                    )}
                </span>
            </p>

            ${
                task.acceptedAt
                    ? `
                        <p>
                            Accepted:
                            ${formatDate(
                                task.acceptedAt
                            )}
                        </p>
                    `
                    : ""
            }

            ${
                task.startedAt
                    ? `
                        <p>
                            Started:
                            ${formatDate(
                                task.startedAt
                            )}
                        </p>
                    `
                    : ""
            }

            ${
                task.completedAt
                    ? `
                        <p>
                            Completed:
                            ${formatDate(
                                task.completedAt
                            )}
                        </p>
                    `
                    : ""
            }

            ${
                task.totalTime
                    ? `
                        <p>
                            <strong>
                                Total Time:
                            </strong>

                            ${formatDuration(
                                task.totalTime
                            )}
                        </p>
                    `
                    : ""
            }

            <div>
                ${buttons}
            </div>

        </div>

    `;
}


// ============================================================
// ACCEPT TASK
// ============================================================

async function acceptTask(
    id
) {

    if (
        currentUser.role !==
        "user"
    ) {

        return;
    }


    const task =
        tasks.find(
            item =>
                item.id ===
                id
        );


    if (
        !task ||
        task.status !==
        "Pending"
    ) {

        return;
    }


    try {

        await updateDoc(
            doc(
                db,
                "tasks",
                id
            ),
            {

                status:
                    "Accepted",

                acceptedAt:
                    serverTimestamp()
            }
        );


        await loadData();

        renderTasks();

        updateDashboard();

    } catch (error) {

        console.error(
            "Accept Task Error:",
            error
        );

        alert(
            getFriendlyFirestoreError(
                error
            )
        );
    }
}


// ============================================================
// START TASK
// ============================================================

async function startTask(
    id
) {

    if (
        currentUser.role !==
        "user"
    ) {

        return;
    }


    const task =
        tasks.find(
            item =>
                item.id ===
                id
        );


    if (
        !task ||
        task.status !==
        "Accepted"
    ) {

        return;
    }


    try {

        await updateDoc(
            doc(
                db,
                "tasks",
                id
            ),
            {

                status:
                    "In Progress",

                startedAt:
                    serverTimestamp()
            }
        );


        await loadData();

        renderTasks();

        updateDashboard();

    } catch (error) {

        console.error(
            "Start Task Error:",
            error
        );

        alert(
            getFriendlyFirestoreError(
                error
            )
        );
    }
}


// ============================================================
// END TASK
// ============================================================

async function endTask(
    id
) {

    if (
        currentUser.role !==
        "user"
    ) {

        return;
    }


    const task =
        tasks.find(
            item =>
                item.id ===
                id
        );


    if (
        !task ||
        task.status !==
        "In Progress"
    ) {

        return;
    }


    try {

        const completedAt =
            new Date();


        let totalTime =
            0;


        if (task.startedAt) {

            const startedDate =
                toDate(
                    task.startedAt
                );


            if (
                startedDate &&
                !isNaN(
                    startedDate.getTime()
                )
            ) {

                totalTime =
                    Math.max(
                        0,
                        completedAt.getTime() -
                        startedDate.getTime()
                    );
            }
        }


        await updateDoc(
            doc(
                db,
                "tasks",
                id
            ),
            {

                status:
                    "Completed",

                completedAt:
                    serverTimestamp(),

                totalTime:
                    totalTime
            }
        );


        await loadData();

        renderTasks();

        updateDashboard();

    } catch (error) {

        console.error(
            "End Task Error:",
            error
        );

        alert(
            getFriendlyFirestoreError(
                error
            )
        );
    }
}


// ============================================================
// EDIT TASK
// ============================================================

async function editTask(
    id
) {

    if (
        currentUser.role !==
        "admin" &&
        currentUser.role !==
        "superadmin"
    ) {

        return;
    }


    const task =
        tasks.find(
            item =>
                item.id ===
                id
        );


    if (!task) {

        return;
    }


    const newTitle =
        prompt(
            "Task Title:",
            task.title ||
            ""
        );


    if (
        newTitle ===
        null
    ) {

        return;
    }


    const newDescription =
        prompt(
            "Task Description:",
            task.description ||
            ""
        );


    if (
        newDescription ===
        null
    ) {

        return;
    }


    const newPriority =
        prompt(
            "Priority (Low, Medium, High, Urgent):",
            task.priority ||
            "Low"
        );


    if (
        newPriority ===
        null
    ) {

        return;
    }


    const allowedPriorities = [
        "Low",
        "Medium",
        "High",
        "Urgent"
    ];


    if (
        !allowedPriorities.includes(
            newPriority
        )
    ) {

        alert(
            "Invalid priority."
        );

        return;
    }


    const newDeadline =
        prompt(
            "Deadline (YYYY-MM-DD):",
            task.deadline ||
            ""
        );


    if (
        newDeadline ===
        null
    ) {

        return;
    }


    try {

        await updateDoc(
            doc(
                db,
                "tasks",
                id
            ),
            {

                title:
                    newTitle.trim(),

                description:
                    newDescription.trim(),

                priority:
                    newPriority,

                deadline:
                    newDeadline
            }
        );


        await loadData();

        renderTasks();

        updateDashboard();

    } catch (error) {

        console.error(
            "Edit Task Error:",
            error
        );

        alert(
            getFriendlyFirestoreError(
                error
            )
        );
    }
}


// ============================================================
// DELETE TASK
// ============================================================

async function deleteTask(
    id
) {

    if (
        currentUser.role !==
        "admin" &&
        currentUser.role !==
        "superadmin"
    ) {

        return;
    }


    if (
        !confirm(
            "Delete this task?"
        )
    ) {

        return;
    }


    try {

        await deleteDoc(
            doc(
                db,
                "tasks",
                id
            )
        );


        await loadData();

        renderTasks();

        updateDashboard();

    } catch (error) {

        console.error(
            "Delete Task Error:",
            error
        );

        alert(
            getFriendlyFirestoreError(
                error
            )
        );
    }
}


// ============================================================
// LOGOUT
// ============================================================

async function logout() {

    try {

        await signOut(
            auth
        );

    } catch (error) {

        console.error(
            "Logout Error:",
            error
        );
    }
}


// ============================================================
// CLOSE MODAL
// ============================================================

function closeModal(
    id
) {

    const modal =
        el(id);


    if (modal) {

        modal.style.display =
            "none";
    }
}


// ============================================================
// DATE FUNCTIONS
// ============================================================

function toDate(
    value
) {

    if (!value) {

        return null;
    }


    if (
        value.toDate &&
        typeof value.toDate ===
        "function"
    ) {

        return value.toDate();
    }


    if (
        value instanceof Date
    ) {

        return value;
    }


    if (
        typeof value ===
        "number"
    ) {

        return new Date(
            value
        );
    }


    return new Date(
        value
    );
}


function formatDate(
    value
) {

    const date =
        toDate(
            value
        );


    if (
        !date ||
        isNaN(
            date.getTime()
        )
    ) {

        return "N/A";
    }


    return date.toLocaleString();
}


function formatDuration(
    ms
) {

    if (
        !ms ||
        ms < 0
    ) {

        return "0h 0m 0s";
    }


    const totalSeconds =
        Math.floor(
            ms / 1000
        );


    const hours =
        Math.floor(
            totalSeconds /
            3600
        );


    const minutes =
        Math.floor(
            (
                totalSeconds %
                3600
            ) /
            60
        );


    const seconds =
        totalSeconds %
        60;


    return (
        hours +
        "h " +
        minutes +
        "m " +
        seconds +
        "s"
    );
}


// ============================================================
// HTML ESCAPE
// ============================================================

function escapeHTML(
    value
) {

    return String(
        value ??
        ""
    )
        .replace(
            /&/g,
            "&amp;"
        )
        .replace(
            /</g,
            "&lt;"
        )
        .replace(
            />/g,
            "&gt;"
        )
        .replace(
            /"/g,
            "&quot;"
        )
        .replace(
            /'/g,
            "&#039;"
        );
}


function escapeAttr(
    value
) {

    return String(
        value ??
        ""
    )
        .replace(
            /\\/g,
            "\\\\"
        )
        .replace(
            /'/g,
            "\\'"
        );
}


// ============================================================
// FIREBASE ERROR MESSAGES
// ============================================================

function getFriendlyAuthError(
    error
) {

    const code =
        error?.code ||
        "";


    switch (code) {

        case "auth/invalid-credential":

            return "Invalid email or password.";


        case "auth/invalid-email":

            return "Invalid email address.";


        case "auth/user-not-found":

            return "No account found with this email.";


        case "auth/wrong-password":

            return "Incorrect password.";


        case "auth/too-many-requests":

            return "Too many attempts. Please try again later.";


        case "auth/email-already-in-use":

            return "This email is already registered.";


        case "auth/weak-password":

            return "Password must be at least 6 characters.";


        case "auth/network-request-failed":

            return "Network error. Check your internet connection.";


        case "auth/api-key-not-valid":

            return "Firebase API key is invalid. Check the Firebase Web app configuration.";


        case "auth/operation-not-allowed":

            return "Email/Password Authentication is not enabled in Firebase.";


        case "auth/unauthorized-domain":

            return "This website domain is not authorized in Firebase Authentication.";


        default:

            return (
                error?.message ||
                "Authentication error occurred."
            );
    }
}


function getFriendlyFirestoreError(
    error
) {

    const code =
        error?.code ||
        "";


    if (
        code ===
        "permission-denied"
    ) {

        return "Permission denied. Please check Firestore Security Rules.";
    }


    if (
        code ===
        "unavailable"
    ) {

        return "Firebase is temporarily unavailable. Check your internet connection.";
    }


    return (
        error?.message ||
        "Firestore operation failed."
    );
}


// ============================================================
// INITIAL PAGE STATE
// ============================================================

document.addEventListener(
    "DOMContentLoaded",
    () => {

        if (el("dashboardPage")) {

            el("dashboardPage")
                .style
                .display =
                "none";
        }


        if (el("loginPage")) {

            el("loginPage")
                .style
                .display =
                "flex";
        }


        if (el("loginRole")) {

            el("loginRole")
                .style
                .display =
                "none";
        }
    }
);


// ============================================================
// EXPOSE FUNCTIONS FOR HTML onclick
// ============================================================

window.login =
    login;

window.logout =
    logout;

window.showSection =
    showSection;

window.openUserModal =
    openUserModal;

window.createUser =
    createUser;

window.deleteUser =
    deleteUser;

window.openAdminModal =
    openAdminModal;

window.createAdmin =
    createAdmin;

window.deleteAdmin =
    deleteAdmin;

window.openTaskModal =
    openTaskModal;

window.createTask =
    createTask;

window.editTask =
    editTask;

window.deleteTask =
    deleteTask;

window.acceptTask =
    acceptTask;

window.startTask =
    startTask;

window.endTask =
    endTask;

window.closeModal =
    closeModal;
