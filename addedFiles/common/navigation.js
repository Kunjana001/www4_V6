/* ==========================================================
   Student Management System
   navigation.js

   Purpose:

   This is the ONLY file allowed to set window.location.href.
   Every page and script must navigate by calling one of the
   functions below instead of touching window.location.href
   directly. That way, if a page ever moves or gets renamed,
   there is exactly one place to update.

   ----------------------------------------------------------
   CONNECTION FIX - why every goX() function changed
   ----------------------------------------------------------

   The project's pages live in two different folders:

       www4/html/                 -> categoryList.html,
                                      resultList.html,
                                      sectionList.html,
                                      studentList.html

       www4/addedFiles/html/      -> dashboard.html, index.html
                                      (login page, renamed from
                                      login.html),
                                      profile.html, settings.html,
                                      signup.html

   The old code below simply did things like

       window.location.href = "dashboard.html";

   A bare filename like that is resolved by the browser
   relative to whichever page is CURRENTLY open. That works
   fine for navigating between two pages in the SAME folder,
   but breaks the moment a page in one folder tries to open a
   page in the other folder - which is exactly what happens
   every time, since login/dashboard/profile/settings/signup
   are in one folder and the four list pages are in another.
   For example, clicking "Student" on the Dashboard tried to
   open "studentList.html" next to dashboard.html (which does
   not exist there), instead of the real file two folders
   away - this is the exact "Your file couldn't be accessed /
   ERR_FILE_NOT_FOUND" error. The same broken assumption is
   also why the phone/hardware back button appeared to do
   nothing from a list page: pressing back on a list page
   eventually calls goDashboard() (see gotoHome() in
   LegacyCompatShim.js), which hit this same bug.

   THE FIX: navigation.js itself always lives in exactly one
   place - www4/addedFiles/common/navigation.js - no matter
   which page loaded it. So instead of resolving each page name
   relative to "whatever page is currently open" (which
   changes), every goX() function below resolves its page name
   relative to THIS SCRIPT'S OWN, FIXED location, using the
   standard URL(relativePath, baseUrl) constructor. That gives
   the correct real address every time, from every page, with
   no change needed anywhere else in the app and the folder
   structure itself left exactly as it is.

   Nothing about WHAT each function does changed - goStudent()
   still goes to the Student list, goDashboard() still goes to
   the Dashboard, and so on. Only HOW the address is calculated
   changed.

   Version: 2.0
   ========================================================== */

"use strict";

/* ==========================================================
   Remember This Script's Own Address Right Now

   WHY: document.currentScript is only reliable while this
   file is first executing. By the time a goX() function
   below actually runs (from a later button click, or from a
   back-button press), document.currentScript would already be
   null. Capturing it here, once, at the top level - and
   reusing the saved value inside resolvePageUrl() below - is
   what makes every goX() function work correctly no matter
   which page called it.
   ========================================================== */

var strNavigationScriptUrl = document.currentScript ? document.currentScript.src : window.location.href;



/* ==========================================================
   Resolve a Page Name to Its Real Address

   strRelativePath : the target page's location, written
                     relative to THIS file's own folder
                     (www4/addedFiles/common/) - for example
                     "../html/dashboard.html" for a page that
                     lives next to this file, or
                     "../../html/studentList.html" for a page
                     that lives in the top-level html/ folder.
   ========================================================== */

function resolvePageUrl(strRelativePath)
{
    return new URL(strRelativePath, strNavigationScriptUrl).href;
}



/* ==========================================================
   Go To Login Page

   Real file: www4/addedFiles/html/index.html (renamed from
   login.html so it can serve as the site's landing page).
   ========================================================== */

function goLogin()
{
    window.location.href = resolvePageUrl("../html/index.html");
}



/* ==========================================================
   Go To Sign Up Page

   Real file: www4/addedFiles/html/signup.html
   ========================================================== */

function goSignup()
{
    window.location.href = resolvePageUrl("../html/signup.html");
}



/* ==========================================================
   Go To Dashboard Page

   Real file: www4/addedFiles/html/dashboard.html
   ========================================================== */

function goDashboard()
{
    window.location.href = resolvePageUrl("../html/dashboard.html");
}



/* ==========================================================
   Go To Student List Page

   Real file: www4/html/studentList.html
   ========================================================== */

function goStudent()
{
    window.location.href = resolvePageUrl("../../html/studentList.html");
}



/* ==========================================================
   Go To Category List Page

   Real file: www4/html/categoryList.html
   ========================================================== */

function goCategory()
{
    window.location.href = resolvePageUrl("../../html/categoryList.html");
}



/* ==========================================================
   Go To Section List Page

   Real file: www4/html/sectionList.html
   ========================================================== */

function goSection()
{
    window.location.href = resolvePageUrl("../../html/sectionList.html");
}



/* ==========================================================
   Go To Result List Page

   Real file: www4/html/resultList.html
   ========================================================== */

function goResult()
{
    window.location.href = resolvePageUrl("../../html/resultList.html");
}



/* ==========================================================
   Go To Profile Page

   Real file: www4/addedFiles/html/profile.html
   ========================================================== */

function goProfile()
{
    window.location.href = resolvePageUrl("../html/profile.html");
}



/* ==========================================================
   Go To Settings Page

   Real file: www4/addedFiles/html/settings.html
   ========================================================== */

function goSettings()
{
    window.location.href = resolvePageUrl("../html/settings.html");
}
