/* ==========================================================
   Student Management System
   Dashboard JavaScript

   ** DEPRECATED **

   dashboard.html now loads application/Dashboard.script.js
   instead of this file. This file is kept only so nothing
   gets deleted without you asking for it - it is no longer
   included by any page and can be safely removed once you
   have confirmed Dashboard.script.js is working as expected.
   ========================================================== */

/* ==========================================================
   Get HTML Elements
   ========================================================== */

var divSidebar = document.getElementById("sidebar");

var btnMenu = document.getElementById("menuBtn");

var divStudentCard = document.getElementById("studentCard");
var divCategoryCard = document.getElementById("categoryCard");
var divSectionCard = document.getElementById("sectionCard");
var divResultCard = document.getElementById("resultCard");

var liStudent = document.getElementById("menuStudent");
var liCategory = document.getElementById("menuCategory");
var liSection = document.getElementById("menuSection");
var liResult = document.getElementById("menuResult");

var liLogout = document.getElementById("logout");


/* ==========================================================
   Start Dashboard
   ========================================================== */

initializeDashboard();


/* ==========================================================
   Initialize Dashboard
   ========================================================== */

function initializeDashboard()
{
    checkLoginStatus();

    registerEvents();
}


/* ==========================================================
   Register Button Click Events
   ========================================================== */

function registerEvents()
{
    btnMenu.onclick = toggleSidebar;

    divStudentCard.onclick = openStudentList;
    divCategoryCard.onclick = openCategoryList;
    divSectionCard.onclick = openSectionList;
    divResultCard.onclick = openResultList;

    liStudent.onclick = openStudentList;
    liCategory.onclick = openCategoryList;
    liSection.onclick = openSectionList;
    liResult.onclick = openResultList;

    liLogout.onclick = logoutUser;
}


/* ==========================================================
   Check User Login
   ========================================================== */

function checkLoginStatus()
{
    if (localStorage.getItem("loggedIn") !== "true")
    {
        window.location.href = "index.html";
    }
}


/* ==========================================================
   Sidebar Menu
   ========================================================== */

function toggleSidebar()
{
    divSidebar.classList.toggle("show");
}


/* ==========================================================
   Open Student List
   ========================================================== */

function openStudentList()
{
    window.location.href = "studentList.html";
}


/* ==========================================================
   Open Category List
   ========================================================== */

function openCategoryList()
{
    window.location.href = "categoryList.html";
}


/* ==========================================================
   Open Section List
   ========================================================== */

function openSectionList()
{
    window.location.href = "sectionList.html";
}


/* ==========================================================
   Open Result List
   ========================================================== */

function openResultList()
{
    window.location.href = "resultList.html";
}


/* ==========================================================
   Logout User
   ========================================================== */

function logoutUser()
{
    var blnLogout;

    blnLogout = confirm("Are you sure you want to sign out?");

    if (blnLogout == true)
    {
        localStorage.removeItem("loggedIn");
        localStorage.removeItem("username");

        window.location.href = "index.html";
    }
}