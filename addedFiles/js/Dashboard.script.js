/* ==========================================================
   Student Management System
   Dashboard.script.js

   Purpose:

   Controls the Dashboard page: the sidebar menu, the top
   navigation cards, and signing out. This replaces the old
   dashboard.js file - the logic is the same, but it now goes
   through Session (for login checks / logout) and Navigation
   (for moving between pages) instead of touching
   localStorage or window.location.href directly, as required
   by the project's layered architecture.

   ----------------------------------------------------------
   CONNECTION FIX - what changed in this pass
   ----------------------------------------------------------

   • Added a "Load Sample Data" button (Task 5 - Data Testing).
     It calls the new DataService.seedSampleData(), which adds
     sample Categories/Sections/Students/Results through the
     exact same DataService.addRecord() path a real Add form
     uses, then refreshes the Quick Stats counts. Nothing else
     on this page was changed.

   ----------------------------------------------------------
   ROUND 2 IMPROVEMENTS
   ----------------------------------------------------------

   Completed Improvements
   ----------------------
   ✓ Dashboard global search across all modules (pages, Students,
     Categories, Sections, Results - not just Students)
   ✓ Live search using the input event (already true for this
     page's search box; verified, no change needed)
   ✓ Settings moved from Profile to Dashboard (new gear icon in
     the topbar, wired to goSettings())

   See runDashboardSearch() / renderSearchResults() /
   arrSearchableModules below for the search work, and
   btnDashboardSettings for the Settings move.

   ----------------------------------------------------------
   ROUND 3 IMPROVEMENTS
   ----------------------------------------------------------

   ✓ Dashboard search now also matches students by Roll Number
     and by their Category/Section *name* (resolved from the
     category_id/section_id already on each cached student
     record) - so typing a Section name like "10A" surfaces the
     students in that section, not just the Section page/entry
     itself. Previously Students were only matched on
     name/mobile/email.

   ----------------------------------------------------------
   PROJECT IMPROVEMENTS (this pass)
   ----------------------------------------------------------

   ✓ Activity Log audit (brief Priority: Recent Activity):
     openCategoryList(), openSectionList() and openResultList()
     below all call ActivityLog.logActivity(...) when their
     card/menu item is clicked, but openStudentList() did not -
     so opening the Student list was silently missing from the
     Recent Activity panel on the Profile page while the other
     three modules were recorded correctly. WHY: this is used
     for the audit/history the Profile page shows the user; a
     missing entry made that history incomplete. WHAT: added
     the same ActivityLog.logActivity("Opened Student") call,
     in the same position (after trackFrequentlyUsed(), before
     the goX() navigation call) already used by the other three
     open handlers. WHEN: runs every time the Student card,
     Student sidebar menu item, or "Add Student" shortcut is
     clicked. No other behavior in this function changed.

   ----------------------------------------------------------
   PROJECT IMPROVEMENTS (Priority 2 - Dashboard Quick Add)
   ----------------------------------------------------------

   ✓ The Operations shortcuts (Add Student / Add Category / Add
     Section / Add Result - Add Section button added to
     dashboard.html to match the other 3, it was missing) now
     pop open that entity's existing Add form as soon as its
     list page finishes loading, instead of just dropping the
     user on the list page. See requestDashboardQuickAdd() and
     the matching "DASHBOARD_QUICK_ADD_ACTION" sessionStorage
     check added to the end of each entity's parseListResponse()
     in Student.script.js/Category.script.js/Section.script.js/
     Result.script.js. Reuses each page's existing Add form/
     onClickAdd() workflow unchanged - no duplicate forms, no
     new CRUD logic, no architecture change.

   Version: 3.3
   ========================================================== */

"use strict";

/* ==========================================================
   Get HTML Elements
   ========================================================== */

var divSidebar = document.getElementById("sidebar");

var divSidebarOverlay = document.getElementById("sidebarOverlay");

var btnMenu = document.getElementById("menuBtn");

var liDashboard = document.getElementById("menuDashboard");

var divStudentCard = document.getElementById("studentCard");
var divCategoryCard = document.getElementById("categoryCard");
var divSectionCard = document.getElementById("sectionCard");
var divResultCard = document.getElementById("resultCard");

var liStudent = document.getElementById("menuStudent");
var liCategory = document.getElementById("menuCategory");
var liSection = document.getElementById("menuSection");
var liResult = document.getElementById("menuResult");

var liProfile = document.getElementById("menuProfile");

var btnDashboardSettings = document.getElementById("btnDashboardSettings");

var liLogout = document.getElementById("logout");

var lblDashboardTitle = document.getElementById("dashboardTitle");
var lblDashboardGreeting = document.getElementById("dashboardGreeting");

var lblSidebarAppName = document.getElementById("sidebarAppName");
var imgDashboardLogo = document.getElementById("dashboardLogo");

var lblStudentCount = document.getElementById("studentCount");
var lblCategoryCount = document.getElementById("categoryCount");
var lblSectionCount = document.getElementById("sectionCount");
var lblResultCount = document.getElementById("resultCount");

var lblStatStudents = document.getElementById("statStudents");
var lblStatCategories = document.getElementById("statCategories");
var lblStatSections = document.getElementById("statSections");
var lblStatResults = document.getElementById("statResults");

var txtSearch = document.getElementById("txtSearch");
var divSearchResults = document.getElementById("searchResults");

var listRecentStudents = document.getElementById("recentStudentsList");
var listRecentReports = document.getElementById("recentReportsList");
var listFrequentlyUsed = document.getElementById("frequentlyUsedList");

var btnOpAddStudent = document.getElementById("opAddStudent");
var btnOpAddCategory = document.getElementById("opAddCategory");
var btnOpAddSection = document.getElementById("opAddSection");
var btnOpAddResult = document.getElementById("opAddResult");



/* ==========================================================
   Module-Level Cache

   Populated once by loadQuickStats() and reused by both the
   Dashboard Search box and the "Recent Students" / "Recent
   Reports" shortcuts, so neither one needs its own extra
   network call. See Phase 4.
   ========================================================== */

var arrCachedStudents = [];
var arrCachedCategories = [];
var arrCachedSections = [];
var arrCachedResults = [];

var intSearchDebounceTimer = null;



/* ==========================================================
   Searchable Modules (Round 2 - Improvement #1)

   The fixed list of pages/sections the Dashboard Global Search
   can jump straight to. Each entry's "keywords" are matched
   against whatever the user typed; "action" is the goX()
   function to call when the result is clicked. This is what
   lets typing "sec" surface "Section List" itself (not just
   Sections by name), and "stu" surface "Student List" /
   "Student Details" / "Student Report" the way the brief asks
   for - without opening every page first.
   ========================================================== */

var arrSearchableModules = [

    { label: "Dashboard", keywords: "dashboard home", action: goDashboard },
    { label: "Student List", keywords: "student list students", action: openStudentList },
    { label: "Student Details", keywords: "student details student info", action: openStudentList },
    { label: "Student Report", keywords: "student report", action: openResultList },
    { label: "Category List", keywords: "category list categories", action: openCategoryList },
    { label: "Section List", keywords: "section list sections", action: openSectionList },
    { label: "Result List", keywords: "result list results reports", action: openResultList },
    { label: "Recent Reports", keywords: "recent reports", action: openResultList },
    { label: "Profile", keywords: "profile account", action: openProfilePage },
    { label: "Settings", keywords: "settings preferences theme server url", action: goSettings }

];



/* ==========================================================
   Start Dashboard
   ========================================================== */

initializeDashboard();



/* ==========================================================
   Initialize Dashboard

   Checks that the user is logged in before wiring up any of
   the buttons. If nobody is logged in, requireLogin() sends
   the user back to the login page and returns false, so we
   stop here instead of setting up a dashboard nobody should
   be looking at.
   ========================================================== */

function initializeDashboard()
{
    if (Session.requireLogin() === false)
    {
        return;
    }

    applyRoleBasedMenu();

    registerEvents();

    setPageText();

    initializeSearch();

    loadQuickStats();

    renderFrequentlyUsed();

    showPendingPostRedirectToast();
}



/* ==========================================================
   Improvements Made (brief item 5 - Success Messages)

   Shows and clears a "Login Successful!" toast stashed by
   login.js just before it hard-navigated here (see the
   STORAGE_KEYS.POST_REDIRECT_TOAST comment in Config.js) - a
   toast called immediately before window.location.href never
   had a chance to render on the page that's navigating away.
   No-op on a normal Dashboard visit/refresh, since the key is
   only ever set right before a post-login redirect.
   ========================================================== */

function showPendingPostRedirectToast()
{
    var strPendingMessage = StorageService.getValue(AppConfig.STORAGE_KEYS.POST_REDIRECT_TOAST);

    if (strPendingMessage)
    {
        StorageService.removeValue(AppConfig.STORAGE_KEYS.POST_REDIRECT_TOAST);

        CommonUtils.showToast(strPendingMessage, "success");
    }
}



/* ==========================================================
   Set Page Text

   Title comes from AppConfig.TEXT (Task: JSON config
   instead of hardcoded strings). The subtitle becomes a
   plain "Welcome, <username>" once we know who is logged
   in (Phase 4 - dropped the old "Good Morning/Afternoon/
   Evening" time-of-day greeting), instead of the generic
   "Welcome to..." line.
   ========================================================== */

function setPageText()
{
    lblDashboardTitle.textContent = AppConfig.TEXT.dashboard.title;

    var strAppName = SettingsManager.getApplicationName();

    document.title = strAppName;

    lblSidebarAppName.textContent = strAppName;

    imgDashboardLogo.src = SettingsManager.getLogoUrl(AppConfig.DEFAULT_LOGO_URL);
    imgDashboardLogo.alt = strAppName + " Logo";

    var strUsername = Session.getUsername();

    if (strUsername)
    {
        lblDashboardGreeting.textContent = "Welcome, " + strUsername + " \uD83D\uDC4B";
    }
    else
    {
        lblDashboardGreeting.textContent = "Welcome to " + strAppName;
    }
}



/* ==========================================================
   Apply Role-Based Menu (Phase 4)

   Hides whichever sidebar menu items (and matching dashboard
   cards) the logged-in user's role is not permitted to see,
   per AppConfig.MENU_PERMISSIONS. Dashboard, Profile, and
   Sign Out are always shown to everyone. If no role was
   saved (e.g. an older session from before Phase 4), nothing
   is hidden - the menu behaves exactly as before.
   ========================================================== */

function applyRoleBasedMenu()
{
    var strRole = Session.getRole();

    if (!strRole || !AppConfig.MENU_PERMISSIONS[strRole])
    {
        return;
    }

    var arrPermittedIds = AppConfig.MENU_PERMISSIONS[strRole];

    var arrMenuMap = [

        { id: "student", li: liStudent, card: divStudentCard },
        { id: "category", li: liCategory, card: divCategoryCard },
        { id: "section", li: liSection, card: divSectionCard },
        { id: "result", li: liResult, card: divResultCard }

    ];

    arrMenuMap.forEach(function (objMenuEntry)
    {
        var blnPermitted = arrPermittedIds.indexOf(objMenuEntry.id) > -1;

        if (blnPermitted === false)
        {
            if (objMenuEntry.li)
            {
                objMenuEntry.li.style.display = "none";
            }

            if (objMenuEntry.card)
            {
                objMenuEntry.card.style.display = "none";
            }
        }
    });
}



/* ==========================================================
   Load Quick Stats

   Fetches the real record counts for each store and fills
   in both the dashboard cards and the Quick Stats panel.
   ========================================================== */

function loadQuickStats()
{
    loadStudentsAndCount();
    loadCategoriesAndCount();
    loadSectionsAndCount();
    loadResultsAndCount();
}



/* ==========================================================
   Load Categories (Count + Cache)

   Same idea as loadStudentsAndCount() - kept in
   arrCachedCategories so the Dashboard Global Search (Round 2
   improvement #1) can search Category names without its own
   extra network call.
   ========================================================== */

function loadCategoriesAndCount()
{
    DataService.getAllRecords(
        AppConfig.STORES.CATEGORY,
        function (arrRecords)
        {
            arrCachedCategories = arrRecords || [];

            var intCount = arrCachedCategories.length;

            lblCategoryCount.textContent = intCount + " Categories";
            lblStatCategories.textContent = intCount;
        },
        function (objError)
        {
            lblCategoryCount.textContent = "";
            lblStatCategories.textContent = "--";
        }
    );
}



/* ==========================================================
   Load Sections (Count + Cache)

   Same idea as loadCategoriesAndCount(), for Sections.
   ========================================================== */

function loadSectionsAndCount()
{
    DataService.getAllRecords(
        AppConfig.STORES.SECTION,
        function (arrRecords)
        {
            arrCachedSections = arrRecords || [];

            var intCount = arrCachedSections.length;

            lblSectionCount.textContent = intCount + " Sections";
            lblStatSections.textContent = intCount;
        },
        function (objError)
        {
            lblSectionCount.textContent = "";
            lblStatSections.textContent = "--";
        }
    );
}



/* ==========================================================
   Load Students (Count + Cache)

   Same job as loadCountFor(), but also keeps the full array
   around for the Dashboard Search box and the "Recent
   Students" shortcut, so neither has to make its own extra
   network call.
   ========================================================== */

function loadStudentsAndCount()
{
    DataService.getAllRecords(
        AppConfig.STORES.STUDENT,
        function (arrRecords)
        {
            arrCachedStudents = arrRecords || [];

            var intCount = arrCachedStudents.length;

            lblStudentCount.textContent = intCount + " Students";
            lblStatStudents.textContent = intCount;

            renderRecentStudents();
        },
        function (objError)
        {
            lblStudentCount.textContent = "";
            lblStatStudents.textContent = "--";
        }
    );
}



/* ==========================================================
   Load Results (Count + Cache)

   Same idea as loadStudentsAndCount(), for the "Recent
   Reports" shortcut.
   ========================================================== */

function loadResultsAndCount()
{
    DataService.getAllRecords(
        AppConfig.STORES.RESULT,
        function (arrRecords)
        {
            arrCachedResults = arrRecords || [];

            var intCount = arrCachedResults.length;

            lblResultCount.textContent = intCount + " Results";
            lblStatResults.textContent = intCount;

            renderRecentReports();
        },
        function (objError)
        {
            lblResultCount.textContent = "";
            lblStatResults.textContent = "--";
        }
    );
}



/* ==========================================================
   Initialize Dashboard Search (Phase 4)

   "As soon as we start, automatically focus search" - focuses
   the search box on load, and filters the cached Student list
   as the user types (debounced by AppConfig.API.SEARCH_DELAY,
   the same delay already defined for this purpose).
   ========================================================== */

function initializeSearch()
{
    txtSearch.focus();

    txtSearch.oninput = function ()
    {
        var strKeyword = txtSearch.value.trim();

        clearTimeout(intSearchDebounceTimer);

        if (strKeyword === "")
        {
            hideSearchResults();

            return;
        }

        intSearchDebounceTimer = setTimeout(function ()
        {
            runDashboardSearch(strKeyword);
        }, AppConfig.API.SEARCH_DELAY);
    };
}



/* ==========================================================
   Run Dashboard Search (Round 2 - Improvement #1)

   Searches EVERYTHING, not just Students:

       - App pages/modules (Dashboard, Student List, Category
         List, Section List, Result List, Profile, Settings,
         plus the finer-grained shortcuts like "Student
         Details" / "Student Report" / "Recent Reports")
       - Student names/roll number/mobile/email, plus their
         Category and Section *names* (resolved from the IDs
         stored on each student record) - so typing a Section
         name like "10A" surfaces the students in it, not just
         the Section entry itself.
       - Category names
       - Section names
       - Result exam names/subjects

   All of it comes from arrSearchableModules and the caches
   already populated by loadQuickStats() - no extra network
   call needed, and no page has to actually be opened just to
   search it.
   ========================================================== */

function runDashboardSearch(strKeyword)
{
    var strLowerKeyword = strKeyword.toLowerCase();

    var arrResults = [];

    /* ---------- Pages / Modules / Shortcuts ---------- */

    arrSearchableModules.forEach(function (objModule)
    {
        if (objModule.keywords.indexOf(strLowerKeyword) > -1)
        {
            arrResults.push({

                type: "Page",
                label: objModule.label,
                sublabel: "Go to " + objModule.label,
                action: objModule.action

            });
        }
    });

    /* ==========================================================
       FIELD-NAME FIX (this pass): every block below was rewritten
       against the real .gs schemas (Student.gs/Section.gs/
       Result.gs), which the person provided directly. The
       previous version of this whole function guessed at field
       names (name, roll_number, mobile, category_id, section_id,
       exam_name, marks_obtained, student_id...) that turn out to
       not exist on any of these records at all - meaning Student/
       Result search on the Dashboard has been silently matching
       almost nothing this whole time (Category/Section search
       for Students matched literally nothing, since
       category_id/section_id are undefined - there is no such
       column; Student.gs calls it plain "category"/"section").
       Only Email happened to work by coincidence, since that one
       field name was guessed correctly.
       ========================================================== */

    /* ---------- Category/Section id -> name lookups ----------
       Category.gs's own field naming wasn't provided, so this
       tries both the "categoryName" convention every other
       camelCase module here uses (sectionName, studentName,
       resultId...) and a plain "name" fallback, whichever the
       cached records actually have. ---------- */

    var objCategoryNameById = {};

    arrCachedCategories.forEach(function (objCategory)
    {
        var strCategoryId = objCategory.categoryId || objCategory.category_id;

        objCategoryNameById[strCategoryId] = objCategory.categoryName || objCategory.name || "";
    });

    var objSectionNameById = {};

    arrCachedSections.forEach(function (objSection)
    {
        var strSectionId = objSection.sectionId || objSection.section_id;

        objSectionNameById[strSectionId] = objSection.sectionName || objSection.name || "";
    });

    /* ---------- Students ----------
       Student.gs's real fields: studentId, studentName, phone,
       email, telegram, organization, category, section, status,
       rollNumber, parentMobile, parentEmail. There is no separate
       categoryId/sectionId column - "category"/"section" are the
       whole thing, and it isn't confirmed here whether they hold
       an id or already the display name. Matched both ways below
       (as raw text, and resolved through the id->name maps above)
       so it works either way. ---------- */

    arrCachedStudents.forEach(function (objStudent)
    {
        var strName = String(objStudent.studentName || "").toLowerCase();
        var strRollNumber = String(objStudent.rollNumber || "").toLowerCase();
        var strPhone = String(objStudent.phone || "").toLowerCase();
        var strEmail = String(objStudent.email || "").toLowerCase();
        var strOrganization = String(objStudent.organization || "").toLowerCase();

        var strCategoryRaw = String(objStudent.category || "").toLowerCase();
        var strSectionRaw = String(objStudent.section || "").toLowerCase();
        var strCategoryResolved = String(objCategoryNameById[objStudent.category] || "").toLowerCase();
        var strSectionResolved = String(objSectionNameById[objStudent.section] || "").toLowerCase();

        if (strName.indexOf(strLowerKeyword) > -1 ||
            strRollNumber.indexOf(strLowerKeyword) > -1 ||
            strPhone.indexOf(strLowerKeyword) > -1 ||
            strEmail.indexOf(strLowerKeyword) > -1 ||
            strOrganization.indexOf(strLowerKeyword) > -1 ||
            strCategoryRaw.indexOf(strLowerKeyword) > -1 ||
            strSectionRaw.indexOf(strLowerKeyword) > -1 ||
            strCategoryResolved.indexOf(strLowerKeyword) > -1 ||
            strSectionResolved.indexOf(strLowerKeyword) > -1)
        {
            arrResults.push({

                type: "Student",
                label: objStudent.studentName || "Unnamed",
                sublabel: (strSectionResolved || strSectionRaw) ? "Section " + (objSectionNameById[objStudent.section] || objStudent.section) : (objStudent.phone || objStudent.email || ""),
                action: openStudentList

            });
        }
    });

    /* ---------- Categories ---------- */

    arrCachedCategories.forEach(function (objCategory)
    {
        var strName = String(objCategory.categoryName || objCategory.name || "").toLowerCase();

        if (strName.indexOf(strLowerKeyword) > -1)
        {
            arrResults.push({

                type: "Category",
                label: objCategory.categoryName || objCategory.name || "Unnamed",
                sublabel: "Category",
                action: openCategoryList

            });
        }
    });

    /* ---------- Sections ---------- */

    arrCachedSections.forEach(function (objSection)
    {
        var strName = String(objSection.sectionName || objSection.name || "").toLowerCase();

        if (strName.indexOf(strLowerKeyword) > -1)
        {
            arrResults.push({

                type: "Section",
                label: objSection.sectionName || objSection.name || "Unnamed",
                sublabel: "Section",
                action: openSectionList

            });
        }
    });

    /* ---------- Results ----------
       Result.gs's real fields: resultId, studentId, exam,
       subject, marks, grade, result (not exam_name/
       marks_obtained/student_id as this used to assume). If
       Result.gs has been updated per its own Global Search
       Improvements pass, getResults()/searchResults() already
       return studentName/rollNumber/categoryName/sectionName
       directly - used first below when present, falling back to
       resolving the same thing here from the Student/Category/
       Section caches otherwise, so this keeps working either way. ---------- */

    var objStudentById = {};

    arrCachedStudents.forEach(function (objStudentLookup)
    {
        objStudentById[objStudentLookup.studentId] = objStudentLookup;
    });

    arrCachedResults.forEach(function (objResult)
    {
        var strExamName = String(objResult.exam || "").toLowerCase();
        var strSubject = String(objResult.subject || "").toLowerCase();
        var strMarks = String(objResult.marks || "").toLowerCase();
        var strGrade = String(objResult.grade || "").toLowerCase();

        var objRelatedStudent = objStudentById[objResult.studentId] || {};

        var strStudentName = String(objResult.studentName || objRelatedStudent.studentName || "").toLowerCase();
        var strRollNumber = String(objResult.rollNumber || objRelatedStudent.rollNumber || "").toLowerCase();

        var strResultCategoryName = String(
            objResult.categoryName ||
            objCategoryNameById[objRelatedStudent.category] ||
            objRelatedStudent.category ||
            ""
        ).toLowerCase();

        var strResultSectionName = String(
            objResult.sectionName ||
            objSectionNameById[objRelatedStudent.section] ||
            objRelatedStudent.section ||
            ""
        ).toLowerCase();

        if (strExamName.indexOf(strLowerKeyword) > -1 ||
            strSubject.indexOf(strLowerKeyword) > -1 ||
            strMarks.indexOf(strLowerKeyword) > -1 ||
            strGrade.indexOf(strLowerKeyword) > -1 ||
            strStudentName.indexOf(strLowerKeyword) > -1 ||
            strRollNumber.indexOf(strLowerKeyword) > -1 ||
            strResultCategoryName.indexOf(strLowerKeyword) > -1 ||
            strResultSectionName.indexOf(strLowerKeyword) > -1)
        {
            arrResults.push({

                type: "Result",
                label: (objResult.exam || "Exam") + (objResult.subject ? " - " + objResult.subject : ""),
                sublabel: strStudentName ? strStudentName : "Result",
                action: openResultList

            });
        }
    });

    renderSearchResults(arrResults.slice(0, 8));
}



/* ==========================================================
   Render Search Results Dropdown

   Each row shows a small "type" tag (Page / Student / Category
   / Section / Result) alongside the match, so a query like
   "stu" can list "Student List" and "Ram Sharma" side by side
   without them being confused for each other.
   ========================================================== */

function renderSearchResults(arrResults)
{
    divSearchResults.innerHTML = "";

    if (arrResults.length === 0)
    {
        divSearchResults.innerHTML = "<div class=\"search-result-empty\">No matches found.</div>";

        divSearchResults.classList.add("show");

        return;
    }

    arrResults.forEach(function (objResult)
    {
        var divItem = document.createElement("div");

        divItem.className = "search-result-item";

        divItem.innerHTML =
            "<span class=\"search-result-type\">" + objResult.type + "</span>" +
            "<span class=\"search-result-label\">" + objResult.label + "</span>" +
            "<span class=\"search-result-sublabel\">" + (objResult.sublabel || "") + "</span>";

        divItem.onclick = objResult.action;

        divSearchResults.appendChild(divItem);
    });

    divSearchResults.classList.add("show");
}



/* ==========================================================
   Hide Search Results Dropdown
   ========================================================== */

function hideSearchResults()
{
    divSearchResults.classList.remove("show");

    divSearchResults.innerHTML = "";
}



/* ==========================================================
   Render Recent Students Shortcut

   Students are appended to the Sheet in the order they are
   added, so the last few entries in the cached array are the
   most recently added students - no date parsing needed.
   ========================================================== */

function renderRecentStudents()
{
    // FIELD-NAME FIX (this pass): was objStudent.name, which
    // doesn't exist on a real Student.gs record (the field is
    // studentName) - every entry in this list was silently
    // falling back to "Unnamed" until now.
    renderShortcutList(listRecentStudents, arrCachedStudents, "No students yet.", function (objStudent)
    {
        return objStudent.studentName || "Unnamed";
    });
}



/* ==========================================================
   Render Recent Reports Shortcut
   ========================================================== */

function renderRecentReports()
{
    // FIELD-NAME FIX (this pass): was objResult.exam_name, which
    // doesn't exist on a real Result.gs record (the field is
    // exam) - every entry in this list was silently falling back
    // to "Exam" until now.
    renderShortcutList(listRecentReports, arrCachedResults, "No results yet.", function (objResult)
    {
        return (objResult.exam || "Exam") + " - " + (objResult.subject || objResult.result || "");
    });
}



/* ==========================================================
   Render a Shortcut List

   Shared by Recent Students / Recent Reports: shows the last
   3 records (most recently added), newest first, clicking any
   one goes to the matching list page.
   ========================================================== */

function renderShortcutList(ulElement, arrRecords, strEmptyText, fnLabel)
{
    ulElement.innerHTML = "";

    if (!arrRecords || arrRecords.length === 0)
    {
        ulElement.innerHTML = "<li class=\"shortcut-empty\">" + strEmptyText + "</li>";

        return;
    }

    var arrRecent = arrRecords.slice(-3).reverse();

    arrRecent.forEach(function (objRecord)
    {
        var liItem = document.createElement("li");

        liItem.textContent = fnLabel(objRecord);

        liItem.onclick = function ()
        {
            goStudent();
        };

        ulElement.appendChild(liItem);
    });
}



/* ==========================================================
   Track Frequently Used Sections

   Increments a click counter each time a sidebar section is
   opened, so renderFrequentlyUsed() can show whichever
   sections the user actually visits most.
   ========================================================== */

function trackFrequentlyUsed(strMenuId)
{
    var objCounts = StorageService.getValue(AppConfig.STORAGE_KEYS.FREQUENTLY_USED) || {};

    objCounts[strMenuId] = (objCounts[strMenuId] || 0) + 1;

    StorageService.saveValue(AppConfig.STORAGE_KEYS.FREQUENTLY_USED, objCounts);
}



/* ==========================================================
   Render Frequently Used Shortcut

   Shows the top 3 most-visited sections, most-visited first.
   ========================================================== */

function renderFrequentlyUsed()
{
    var objCounts = StorageService.getValue(AppConfig.STORAGE_KEYS.FREQUENTLY_USED) || {};

    var objLabels = {

        student: { label: "Student List", fn: openStudentList },
        category: { label: "Category List", fn: openCategoryList },
        section: { label: "Section List", fn: openSectionList },
        result: { label: "Result List", fn: openResultList }

    };

    var arrEntries = Object.keys(objCounts)
        .filter(function (strId) { return objLabels[strId] && objCounts[strId] > 0; })
        .sort(function (strA, strB) { return objCounts[strB] - objCounts[strA]; })
        .slice(0, 3);

    listFrequentlyUsed.innerHTML = "";

    if (arrEntries.length === 0)
    {
        listFrequentlyUsed.innerHTML = "<li class=\"shortcut-empty\">Nothing yet - start navigating!</li>";

        return;
    }

    arrEntries.forEach(function (strId)
    {
        var liItem = document.createElement("li");

        liItem.textContent = objLabels[strId].label;

        liItem.onclick = objLabels[strId].fn;

        listFrequentlyUsed.appendChild(liItem);
    });
}



/* ==========================================================
   Register Button Click Events
   ========================================================== */

function registerEvents()
{
    btnMenu.onclick = toggleSidebar;

    /* PRIORITY 1 FIX (#2 tap outside to close): the overlay only
       exists behind the sidebar, so any click reaching it is by
       definition a tap outside the sidebar itself. */
    divSidebarOverlay.onclick = closeSidebar;

    /* PRIORITY 1 FIX (#2 swipe to close): a left swipe anywhere on
       the open sidebar closes it. See onSidebarTouchStart()/
       onSidebarTouchEnd() below. */
    divSidebar.addEventListener("touchstart", onSidebarTouchStart, { passive: true });
    divSidebar.addEventListener("touchend", onSidebarTouchEnd, { passive: true });

    /* PRIORITY 1 FIX (#1 Back button closes sidebar first): a
       single popstate listener for the whole page - see
       closeSidebar()/openSidebar() for how the matching history
       entry is pushed/consumed. */
    window.addEventListener("popstate", onDashboardPopState);

    /* PRIORITY 1 FIX (#3 Dashboard menu item doesn't work): this
       item never had an id before, so it was never reachable here. */
    liDashboard.onclick = openDashboardMenu;

    divStudentCard.onclick = openStudentList;
    divCategoryCard.onclick = openCategoryList;
    divSectionCard.onclick = openSectionList;
    divResultCard.onclick = openResultList;

    liStudent.onclick = openStudentList;
    liCategory.onclick = openCategoryList;
    liSection.onclick = openSectionList;
    liResult.onclick = openResultList;

    liProfile.onclick = openProfilePage;

    btnDashboardSettings.onclick = goSettings;

    liLogout.onclick = logoutUser;

    /* Operations shortcut (Phase 4, extended - Priority 2):
       quick jump to each list page, where the existing Add form
       for that entity already lives - no new forms/routes
       introduced. Previously this only navigated to the list
       page and left the user to find that page's own "+"
       button; requestDashboardQuickAdd() below now also flags
       that page to pop its existing Add form open automatically
       as soon as it finishes loading - see the WHY/WHAT/WHEN
       comment on requestDashboardQuickAdd() and the matching
       check added to the end of each entity's
       parseListResponse(). */

    btnOpAddStudent.onclick = function() { requestDashboardQuickAdd( "student", openStudentList ); };
    btnOpAddCategory.onclick = function() { requestDashboardQuickAdd( "category", openCategoryList ); };
    btnOpAddSection.onclick = function() { requestDashboardQuickAdd( "section", openSectionList ); };
    btnOpAddResult.onclick = function() { requestDashboardQuickAdd( "result", openResultList ); };
}



/* ==========================================================
   Dashboard Quick Add (Priority 2)

   WHY: the Dashboard's Operations shortcuts (Add Student / Add
   Category / Add Section / Add Result) used to just navigate to
   that entity's list page (openStudentList() / openCategoryList()
   / openSectionList() / openResultList()) - the user still had
   to locate and tap that page's own "+" button once it loaded.
   The brief asks for these to actually open the Add dialog/form
   directly, reusing the existing Add functionality with no
   duplicate forms and no new CRUD logic.

   WHAT: this page (dashboard.html) never has the Student/
   Category/Section/Result list markup or scripts loaded, so the
   Add form itself cannot be opened from here - only the target
   list page (which already contains that exact form and its
   onClickAdd()/popUpAddForm() workflow) can. Instead of
   duplicating that form here, this sets a one-shot sessionStorage
   flag (the same mechanism already used everywhere else in this
   project to pass small bits of state between pages, e.g.
   Student.script.js's SESSION_OBJECT.ADD_EDIT_MODE) naming which
   entity's Add form should open, then reuses the existing
   openX() navigation function (already used by the equivalent
   sidebar/card - keeps Recent Activity/Frequently Used tracking
   identical either way) to go there. Once that page's list
   finishes its first load, it checks for this same flag and - if
   the user actually holds Add permission for that entity, same
   check the "+" button itself already requires - calls its own
   existing onClickAdd(), then clears the flag so it cannot fire
   again on a later refresh or a normal (non-Dashboard) visit.

   strEntityKey : "student" | "category" | "section" | "result" -
                  must match the check added to the matching
                  entity's parseListResponse()
   fnOpenList   : the existing openStudentList()/openCategoryList()/
                  openSectionList()/openResultList() to reuse for
                  navigation + Activity Log + Frequently Used
   ========================================================== */

function requestDashboardQuickAdd( strEntityKey, fnOpenList )
{
    sessionStorage.setItem( "DASHBOARD_QUICK_ADD_ACTION", strEntityKey );

    fnOpenList();
}



/* ==========================================================
   Sample / Test Data (Task 5 - Data Testing)

   There is no button for this on the Dashboard on purpose -
   it is a developer/testing utility, not something an end
   user should see. To add a small set of sample Categories,
   Sections, Students and Results through the real backend
   connection, open this page's browser console and run:

       DataService.seedSampleData(console.log, console.error);

   This calls the exact same DataService.addRecord() path used
   by every Add form, so it is a genuine end-to-end test of
   whichever backend is currently active (see
   DataService.getBackendMode()) - not mock data that skips the
   app's own logic. See DataService.js for full details.
   ========================================================== */



/* ==========================================================
   Toggle the Sidebar Open / Closed
   ========================================================== */

/* ==========================================================
   PRIORITY 1 FIX - Sidebar Navigation
   ----------------------------------------------------------

   Everything below replaces the old one-line toggleSidebar()
   (which only ever did divSidebar.classList.toggle("show") -
   no overlay, no Back-button awareness, no swipe/tap-outside
   handling, so none of that worked).

   HOW BACK-BUTTON CLOSE WORKS (#1): opening the sidebar pushes
   one extra history entry (see openSidebar()). The very next
   Back press - hardware Android Back, browser Back, or a
   swipe-back gesture - fires "popstate", which
   onDashboardPopState() below always answers by closing the
   sidebar (harmless no-op if it was already closed). Since that
   consumes the one extra entry we pushed, a SECOND Back press
   has nothing sidebar-related left to pop and falls straight
   through to the browser's normal earlier-page/exit behavior -
   exactly the "first press closes, second press acts normally"
   split the brief asks for, without this file ever needing to
   guess whether it is allowed to exit the app.

   Any other way of closing the sidebar (tapping the overlay,
   swiping it away, clicking a menu item) goes through
   closeSidebar() below, which calls history.back() to pop that
   same entry - so the same popstate handler ends up doing the
   actual closing every time, and the sidebar/history state never
   drifts out of sync (#2, #8 "no stuck menu state").
   ========================================================== */

function toggleSidebar()
{
    if (divSidebar.classList.contains("show"))
    {
        closeSidebar();
    }
    else
    {
        openSidebar();
    }
}



/* ==========================================================
   Open the Sidebar
   ========================================================== */

function openSidebar()
{
    divSidebar.classList.add("show");
    divSidebarOverlay.classList.add("show");

    history.pushState({ sidebarOpen: true }, "");
}



/* ==========================================================
   Close the Sidebar

   Only pops history when the sidebar is actually open, so
   calling this when it is already closed (e.g. a stray overlay
   click) never eats a Back press that belongs to something else.
   ========================================================== */

function closeSidebar()
{
    if (divSidebar.classList.contains("show"))
    {
        history.back();
    }
}



/* ==========================================================
   Sidebar-Only UI Close (no history involved)

   The one place that actually removes the "show" classes.
   Called from onDashboardPopState() (a Back press already
   popped the history entry - nothing left to do here but update
   the UI) so there is exactly one code path that hides the
   sidebar, and it can never get out of sync with history.state.
   ========================================================== */

function closeSidebarUiOnly()
{
    divSidebar.classList.remove("show");
    divSidebarOverlay.classList.remove("show");
}



/* ==========================================================
   Handle Back Button / Swipe-Back (#1)
   ========================================================== */

function onDashboardPopState()
{
    closeSidebarUiOnly();
}



/* ==========================================================
   Swipe Left On the Sidebar to Close It (#2)
   ========================================================== */

var intSidebarTouchStartX = 0;

function onSidebarTouchStart(objEvent)
{
    intSidebarTouchStartX = objEvent.touches[0].clientX;
}

function onSidebarTouchEnd(objEvent)
{
    var intDeltaX = objEvent.changedTouches[0].clientX - intSidebarTouchStartX;

    // A left swipe of more than 50px counts as "swipe to close".
    if (intDeltaX < -50)
    {
        closeSidebar();
    }
}



/* ==========================================================
   Open Dashboard From the Sidebar's Own "Dashboard" Item (#3)

   Re-uses goDashboard() like every other sidebar item, so the
   page does a normal reload of dashboard.html - which also
   satisfies "current page should close normally" (#8: opening
   another page closes the sidebar automatically) without any
   extra sidebar-closing code needed here.
   ========================================================== */

function openDashboardMenu()
{
    ActivityLog.logActivity("Opened Dashboard");

    goDashboard();
}



/* ==========================================================
   Open Student List Page
   ========================================================== */

function openStudentList()
{
    trackFrequentlyUsed("student");

    ActivityLog.logActivity("Opened Student");

    goStudent();
}



/* ==========================================================
   Open Category List Page
   ========================================================== */

function openCategoryList()
{
    trackFrequentlyUsed("category");

    ActivityLog.logActivity("Opened Category");

    goCategory();
}



/* ==========================================================
   Open Section List Page
   ========================================================== */

function openSectionList()
{
    trackFrequentlyUsed("section");

    ActivityLog.logActivity("Opened Section");

    goSection();
}



/* ==========================================================
   Open Result List Page
   ========================================================== */

function openResultList()
{
    trackFrequentlyUsed("result");

    ActivityLog.logActivity("Opened Result");

    goResult();
}



/* ==========================================================
   Open Profile Page

   Replaces the old "Account Settings" menu item. Settings
   itself is now reached from a button inside the Profile
   page instead of its own sidebar entry (Task 4).
   ========================================================== */

function openProfilePage()
{
    goProfile();
}



/* ==========================================================
   Log the User Out

   Asks for confirmation first so a sidebar mis-click does
   not accidentally sign the user out.
   ========================================================== */

function logoutUser()
{
    CommonUtils.showConfirmDialog("Are you sure you want to sign out?", "Yes", "No", "Logout?")
        .then(function (blnConfirmedLogout)
        {
            if (blnConfirmedLogout === true)
            {
                ActivityLog.logActivity("Logout");

                Session.logout();
            }
        });
}