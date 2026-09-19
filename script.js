// =====================================================
// DAILY TASK MANAGER
// Firebase Authentication + Firestore
// =====================================================

import { initializeApp, getApps, getApp }
    from "https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";

import {
    getAuth,
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    onAuthStateChanged,
    signOut
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";

import {
    getFirestore,
    collection,
    addDoc,
    getDocs,
    getDoc,
    doc,
    setDoc,
    updateDoc,
    deleteDoc,
    query,
    orderBy,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";


// =====================================================
// FIREBASE CONFIG
// =====================================================
// Firebase Console se apna exact firebaseConfig yahan paste karo.

const firebaseConfig = {
    apiKey: "AIzaSyDPCcSkOu0CcsN8LYo7J3QitNhksejxjXM",
    authDomain: "daily-task-manager-9d83d.firebaseapp.com",
    projectId: "daily-task-manager-9d83d",
    storageBucket: "daily-task-manager-9d83d.firebasestorage.app",
    messagingSenderId: "197724632235",
    appId: "1:197724632235:web:41b63b86f3fc67707933ee",
    measurementId: "G-NQYWQXPMT"
};


// =====================================================
// FIREBASE INITIALIZATION
// =====================================================

const app = initializeApp(firebaseConfig);

const auth = getAuth(app);

const db = getFirestore(app);


// Secondary Firebase app
// Iska use Admin/User create karte waqt hota hai,
// taake current admin logout na ho.

const secondaryAppName = "DailyTaskManagerSecondary";

let secondaryApp;

if (getApps().some(appItem => appItem.name === secondaryAppName)) {

    secondaryApp = getApp(secondaryAppName);

} else {

    secondaryApp =
        initializeApp(
            firebaseConfig,
            secondaryAppName
        );
}

const secondaryAuth = getAuth(secondaryApp);


// =====================================================
// GLOBAL VARIABLES
// =====================================================

let currentUser = null;

let users = [];

let admins = [];

let tasks = [];


// =====================================================
// LOGIN
// =====================================================

async function login() {

    const email =
        document
            .getElementById("loginUsername")
            .value
            .trim();

    const password =
        document
            .getElementById("loginPassword")
            .value;

    const errorBox =
        document.getElementById("loginError");

    errorBox.innerText = "";

    if (!email || !password) {

        errorBox.innerText =
            "Email and password are required.";

        return;
    }

    try {

        const credential =
            await signInWithEmailAndPassword(
                auth,
                email,
                password
            );

        await loadCurrentUser(
            credential.user.uid
        );

    } catch (error) {

        console.error(error);

        errorBox.innerText =
            getFirebaseError(error);

    }
}


// =====================================================
// LOAD CURRENT USER
// =====================================================

async function loadCurrentUser(uid) {

    const userRef =
        doc(
            db,
            "users",
            uid
        );

    const userSnap =
        await getDoc(userRef);

    if (!userSnap.exists()) {

        await signOut(auth);

        document.getElementById("loginError").innerText =
            "User profile not found in database.";

        return;
    }

    const userData =
        userSnap.data();

    currentUser = {

        uid: uid,

        email: userData.email,

        name:
            userData.name ||
            userData.email,

        role: userData.role

    };

    showApp();

    await loadAllData();
}


// =====================================================
// SHOW APP
// =====================================================

function showApp() {

    document.getElementById("loginPage")
        .style.display = "none";

    document.getElementById("dashboardPage")
        .style.display = "flex";

    document.getElementById("currentUser")
        .innerText =
            currentUser.name +
            " (" +
            currentUser.role +
            ")";

    setupPermissions();

    updateDashboard();

    showSection("dashboard");
}


// =====================================================
// PERMISSIONS
// =====================================================

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

    }

    else if (currentUser.role === "admin") {

        usersMenu.style.display = "block";

        adminsMenu.style.display = "none";

        createTaskButton.style.display = "block";

    }

    else {

        usersMenu.style.display = "none";

        adminsMenu.style.display = "none";

        createTaskButton.style.display = "none";
    }
}


// =====================================================
// LOAD FIRESTORE DATA
// =====================================================

async function loadAllData() {

    await loadUsers();

    await loadAdmins();

    await loadTasks();

    updateDashboard();

    renderUsers();

    renderAdmins();

    renderTasks();
}


// =====================================================
// USERS
// =====================================================

async function loadUsers() {

    const snapshot =
        await getDocs(
            collection(
                db,
                "users"
            )
        );

    users = [];

    snapshot.forEach(docSnap => {

        const data =
            docSnap.data();

        if (data.role === "user") {

            users.push({

                id: docSnap.id,

                ...data

            });
        }
    });
}


// =====================================================
// ADMINS
// =====================================================

async function loadAdmins() {

    const snapshot =
        await getDocs(
            collection(
                db,
                "users"
            )
        );

    admins = [];

    snapshot.forEach(docSnap => {

        const data =
            docSnap.data();

        if (data.role === "admin") {

            admins.push({

                id: docSnap.id,

                ...data

            });
        }
    });
}


// =====================================================
// TASKS
// =====================================================

async function loadTasks() {

    const snapshot =
        await getDocs(
            collection(
                db,
                "tasks"
            )
        );

    tasks = [];

    snapshot.forEach(docSnap => {

        tasks.push({

            id: docSnap.id,

            ...docSnap.data()

        });
    });
}


// =====================================================
// DASHBOARD
// =====================================================

function updateDashboard() {

    const visibleTasks =
        getVisibleTasks();

    document.getElementById("totalTasks")
        .innerText =
            visibleTasks.length;

    document.getElementById("pendingTasks")
        .innerText =
            visibleTasks.filter(
                task =>
                    task.status === "Pending"
            ).length;

    document.getElementById("progressTasks")
        .innerText =
            visibleTasks.filter(
                task =>
                    task.status === "In Progress"
            ).length;

    document.getElementById("completedTasks")
        .innerText =
            visibleTasks.filter(
                task =>
                    task.status === "Completed"
            ).length;
}


// =====================================================
// VISIBLE TASKS
// =====================================================

function getVisibleTasks() {

    if (!currentUser) {

        return [];
    }

    if (currentUser.role === "user") {

        return tasks.filter(
            task =>
                task.assignedTo === currentUser.uid
        );
    }

    return tasks;
}


// =====================================================
// SECTION NAVIGATION
// =====================================================

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


// =====================================================
// USER MODAL
// =====================================================

function openUserModal() {

    document.getElementById("userModal")
        .style.display = "flex";
}


// =====================================================
// CREATE USER
// =====================================================

async function createUser() {

    if (
        currentUser.role !== "admin" &&
        currentUser.role !== "superadmin"
    ) {

        alert("You are not allowed to create users.");

        return;
    }


    const email =
        document
            .getElementById("newUserName")
            .value
            .trim();

    const password =
        document
            .getElementById("newUserPassword")
            .value;


    if (!email || !password) {

        alert(
            "User email and password are required."
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

                name: email,

                email: email,

                role: "user",

                createdBy:
                    currentUser.uid,

                createdAt:
                    serverTimestamp()

            }
        );


        await signOut(
            secondaryAuth
        );


        alert("User created successfully.");

        document.getElementById("newUserName")
            .value = "";

        document.getElementById("newUserPassword")
            .value = "";

        closeModal("userModal");

        await loadUsers();

        await loadTasks();

        renderUsers();

        updateTaskUsers();

    } catch (error) {

        console.error(error);

        alert(
            getFirebaseError(error)
        );
    }
}


// =====================================================
// RENDER USERS
// =====================================================

function renderUsers() {

    const container =
        document.getElementById("usersList");

    container.innerHTML = "";


    users.forEach(user => {

        container.innerHTML += `

            <div class="user-card">

                <h3>${escapeHTML(user.name || user.email)}</h3>

                <p>
                    Email:
                    ${escapeHTML(user.email)}
                </p>

                <p>
                    Role: User
                </p>

                ${
                    currentUser.role === "superadmin"

                    ?

                    `
                    <button
                        onclick="deleteUser('${user.id}')">
                        Delete
                    </button>
                    `

                    :

                    ""
                }

            </div>

        `;
    });


    updateTaskUsers();
}


// =====================================================
// DELETE USER
// =====================================================

async function deleteUser(id) {

    if (currentUser.role !== "superadmin") {

        alert(
            "Only Super Admin can delete users."
        );

        return;
    }


    if (
        !confirm(
            "Delete this user profile?"
        )
    ) {

        return;
    }


    try {

        await deleteDoc(
            doc(
                db,
                "users",
                id
            )
        );


        await loadUsers();

        renderUsers();

        alert(
            "User profile deleted."
        );

    } catch (error) {

        console.error(error);

        alert(
            getFirebaseError(error)
        );
    }
}


// =====================================================
// ADMIN MODAL
// =====================================================

function openAdminModal() {

    if (currentUser.role !== "superadmin") {

        alert(
            "Only Super Admin can create admins."
        );

        return;
    }

    document.getElementById("adminModal")
        .style.display = "flex";
}


// =====================================================
// CREATE ADMIN
// =====================================================

async function createAdmin() {

    if (
        currentUser.role !== "superadmin"
    ) {

        alert(
            "Only Super Admin can create admins."
        );

        return;
    }


    const email =
        document
            .getElementById("newAdminName")
            .value
            .trim();

    const password =
        document
            .getElementById("newAdminPassword")
            .value;


    if (!email || !password) {

        alert(
            "Admin email and password are required."
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

                name: email,

                email: email,

                role: "admin",

                createdBy:
                    currentUser.uid,

                createdAt:
                    serverTimestamp()

            }
        );


        await signOut(
            secondaryAuth
        );


        alert(
            "Admin created successfully."
        );


        document.getElementById("newAdminName")
            .value = "";

        document.getElementById("newAdminPassword")
            .value = "";

        closeModal("adminModal");

        await loadAdmins();

        renderAdmins();

    } catch (error) {

        console.error(error);

        alert(
            getFirebaseError(error)
        );
    }
}


// =====================================================
// RENDER ADMINS
// =====================================================

function renderAdmins() {

    const container =
        document.getElementById("adminsList");

    container.innerHTML = "";


    admins.forEach(admin => {

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
                    ${escapeHTML(admin.email)}
                </p>

                <p>
                    Role: Admin
                </p>

                <button
                    onclick="deleteAdmin('${admin.id}')">
                    Delete
                </button>

            </div>

        `;
    });
}


// =====================================================
// DELETE ADMIN
// =====================================================

async function deleteAdmin(id) {

    if (currentUser.role !== "superadmin") {

        alert(
            "Only Super Admin can delete admins."
        );

        return;
    }


    if (
        !confirm(
            "Delete this admin profile?"
        )
    ) {

        return;
    }


    try {

        await deleteDoc(
            doc(
                db,
                "users",
                id
            )
        );


        await loadAdmins();

        renderAdmins();

        alert(
            "Admin profile deleted."
        );

    } catch (error) {

        console.error(error);

        alert(
            getFirebaseError(error)
        );
    }
}


// =====================================================
// TASK MODAL
// =====================================================

function openTaskModal() {

    if (
        currentUser.role !== "admin" &&
        currentUser.role !== "superadmin"
    ) {

        alert(
            "You are not allowed to create tasks."
        );

        return;
    }


    updateTaskUsers();

    document.getElementById("taskModal")
        .style.display = "flex";
}


// =====================================================
// UPDATE TASK USERS
// =====================================================

function updateTaskUsers() {

    const select =
        document.getElementById("taskUser");

    if (!select) return;


    select.innerHTML = "";


    users.forEach(user => {

        select.innerHTML += `

            <option value="${user.id}">
                ${escapeHTML(
                    user.name ||
                    user.email
                )}
            </option>

        `;
    });
}


// =====================================================
// CREATE TASK
// =====================================================

async function createTask() {

    if (
        currentUser.role !== "admin" &&
        currentUser.role !== "superadmin"
    ) {

        alert(
            "You are not allowed to create tasks."
        );

        return;
    }


    const title =
        document
            .getElementById("taskTitle")
            .value
            .trim();


    const description =
        document
            .getElementById("taskDescription")
            .value
            .trim();


    const deadline =
        document
            .getElementById("taskDeadline")
            .value;


    const priority =
        document
            .getElementById("taskPriority")
            .value;


    const assignedTo =
        document
            .getElementById("taskUser")
            .value;


    if (!title || !assignedTo) {

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

                title: title,

                description: description,

                deadline: deadline,

                priority: priority,

                assignedTo: assignedTo,

                assignedBy:
                    currentUser.uid,

                status: "Pending",

                acceptedAt: null,

                startedAt: null,

                completedAt: null,

                totalTime: 0,

                createdAt:
                    serverTimestamp()

            }
        );


        alert(
            "Task created successfully."
        );


        document.getElementById("taskTitle")
            .value = "";

        document.getElementById("taskDescription")
            .value = "";

        document.getElementById("taskDeadline")
            .value = "";


        closeModal("taskModal");


        await loadTasks();

        renderTasks();

        updateDashboard();

    } catch (error) {

        console.error(error);

        alert(
            getFirebaseError(error)
        );
    }
}


// =====================================================
// RENDER TASKS
// =====================================================

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

        container.innerHTML +=
            createTaskHTML(task);

    });
}


// =====================================================
// TASK HTML
// =====================================================

function createTaskHTML(task) {

    let buttons = "";


    if (
        currentUser.role === "user"
    ) {


        if (
            task.status === "Pending"
        ) {

            buttons += `

                <button
                    class="primary"
                    onclick="acceptTask('${task.id}')">
                    Accept Task
                </button>

            `;
        }


        if (
            task.status === "Accepted"
        ) {

            buttons += `

                <button
                    class="primary"
                    onclick="startTask('${task.id}')">
                    Start Task
                </button>

            `;
        }


        if (
            task.status === "In Progress"
        ) {

            buttons += `

                <button
                    class="primary"
                    onclick="endTask('${task.id}')">
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
                onclick="deleteTask('${task.id}')">
                Delete
            </button>

        `;
    }


    return `

        <div class="task-card">

            <h3>
                ${escapeHTML(task.title)}
            </h3>

            <p>
                ${escapeHTML(
                    task.description || ""
                )}
            </p>


            <p>
                <strong>Priority:</strong>
                ${escapeHTML(
                    task.priority || ""
                )}
            </p>


            <p>
                <strong>Deadline:</strong>
                ${task.deadline || "Not Set"}
            </p>


            <p>
                <strong>Status:</strong>

                <span class="status">
                    ${escapeHTML(
                        task.status || ""
                    )}
                </span>

            </p>


            ${
                task.startedAt

                ?

                `
                <p>
                    <strong>Started:</strong>
                    ${formatDate(task.startedAt)}
                </p>
                `

                :

                ""
            }


            ${
                task.completedAt

                ?

                `
                <p>
                    <strong>Completed:</strong>
                    ${formatDate(task.completedAt)}
                </p>
                `

                :

                ""
            }


            ${
                task.totalTime

                ?

                `
                <p>
                    <strong>Total Time:</strong>
                    ${formatDuration(
                        task.totalTime
                    )}
                </p>
                `

                :

                ""
            }


            <div>
                ${buttons}
            </div>

        </div>

    `;
}


// =====================================================
// ACCEPT TASK
// =====================================================

async function acceptTask(id) {

    const task =
        tasks.find(
            item => item.id === id
        );


    if (!task) return;


    if (
        currentUser.role !== "user" ||
        task.assignedTo !== currentUser.uid
    ) {

        alert(
            "You cannot accept this task."
        );

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

                status: "Accepted",

                acceptedAt:
                    Date.now()

            }
        );


        await loadTasks();

        renderTasks();

        updateDashboard();

    } catch (error) {

        console.error(error);

        alert(
            getFirebaseError(error)
        );
    }
}


// =====================================================
// START TASK
// =====================================================

async function startTask(id) {

    const task =
        tasks.find(
            item => item.id === id
        );


    if (!task) return;


    if (
        currentUser.role !== "user" ||
        task.assignedTo !== currentUser.uid
    ) {

        alert(
            "You cannot start this task."
        );

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

                status: "In Progress",

                startedAt:
                    Date.now()

            }
        );


        await loadTasks();

        renderTasks();

        updateDashboard();

    } catch (error) {

        console.error(error);

        alert(
            getFirebaseError(error)
        );
    }
}


// =====================================================
// END TASK
// =====================================================

async function endTask(id) {

    const task =
        tasks.find(
            item => item.id === id
        );


    if (!task) return;


    if (
        currentUser.role !== "user" ||
        task.assignedTo !== currentUser.uid
    ) {

        alert(
            "You cannot complete this task."
        );

        return;
    }


    const completedAt =
        Date.now();


    let totalTime = 0;


    if (task.startedAt) {

        totalTime =
            completedAt -
            task.startedAt;
    }


    try {

        await updateDoc(
            doc(
                db,
                "tasks",
                id
            ),
            {

                status: "Completed",

                completedAt:
                    completedAt,

                totalTime:
                    totalTime

            }
        );


        await loadTasks();

        renderTasks();

        updateDashboard();

    } catch (error) {

        console.error(error);

        alert(
            getFirebaseError(error)
        );
    }
}


// =====================================================
// DELETE TASK
// =====================================================

async function deleteTask(id) {

    if (
        currentUser.role !== "admin" &&
        currentUser.role !== "superadmin"
    ) {

        alert(
            "You are not allowed to delete tasks."
        );

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


        await loadTasks();

        renderTasks();

        updateDashboard();

    } catch (error) {

        console.error(error);

        alert(
            getFirebaseError(error)
        );
    }
}


// =====================================================
// DATE / TIME
// =====================================================

function formatDate(time) {

    if (!time) return "";

    return new Date(time)
        .toLocaleString();
}


function formatDuration(ms) {

    const seconds =
        Math.floor(ms / 1000);

    const hours =
        Math.floor(
            seconds / 3600
        );

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


// =====================================================
// CLOSE MODAL
// =====================================================

function closeModal(id) {

    const modal =
        document.getElementById(id);

    if (modal) {

        modal.style.display =
            "none";
    }
}


// =====================================================
// LOGOUT
// =====================================================

async function logout() {

    try {

        await signOut(auth);

    } catch (error) {

        console.error(error);
    }


    currentUser = null;

    users = [];

    admins = [];

    tasks = [];


    document.getElementById("dashboardPage")
        .style.display = "none";

    document.getElementById("loginPage")
        .style.display = "flex";


    document.getElementById("loginUsername")
        .value = "";

    document.getElementById("loginPassword")
        .value = "";

    document.getElementById("loginError")
        .innerText = "";
}


// =====================================================
// FIREBASE AUTH STATE
// =====================================================

onAuthStateChanged(
    auth,
    async (firebaseUser) => {

        if (!firebaseUser) {

            currentUser = null;

            document.getElementById(
                "dashboardPage"
            ).style.display = "none";

            document.getElementById(
                "loginPage"
            ).style.display = "flex";

            return;
        }


        try {

            await loadCurrentUser(
                firebaseUser.uid
            );

        } catch (error) {

            console.error(error);

            await signOut(auth);

        }
    }
);


// =====================================================
// FIREBASE ERROR HANDLER
// =====================================================

function getFirebaseError(error) {

    if (!error) {

        return "Something went wrong.";
    }


    switch (error.code) {

        case "auth/invalid-credential":
            return "Invalid email or password.";

        case "auth/email-already-in-use":
            return "This email is already registered.";

        case "auth/invalid-email":
            return "Invalid email address.";

        case "auth/weak-password":
            return "Password must be at least 6 characters.";

        case "auth/user-not-found":
            return "User account not found.";

        case "permission-denied":
            return "You do not have permission for this action.";

        default:
            return error.message ||
                "Something went wrong.";
    }
}


// =====================================================
// HTML SECURITY
// =====================================================

function escapeHTML(value) {

    if (value === null ||
        value === undefined) {

        return "";
    }


    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}
// =====================================================
// MAKE FUNCTIONS AVAILABLE TO HTML ONCLICK
// =====================================================

window.login = login;
window.logout = logout;

window.showSection = showSection;

window.openUserModal = openUserModal;
window.createUser = createUser;
window.deleteUser = deleteUser;

window.openAdminModal = openAdminModal;
window.createAdmin = createAdmin;
window.deleteAdmin = deleteAdmin;

window.openTaskModal = openTaskModal;
window.createTask = createTask;
window.deleteTask = deleteTask;

window.acceptTask = acceptTask;
window.startTask = startTask;
window.endTask = endTask;

window.closeModal = closeModal;
