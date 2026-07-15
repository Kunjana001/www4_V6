/* ==========================================================
   Student Management System
   Profile.script.js

   Purpose:

   Controls the Profile page: showing the logged-in username,
   showing the Login History (Current Login / Last Login /
   Last Logout), the Change Password form, the Back button,
   and Recent Activity.

   ----------------------------------------------------------
   ROUND 2 - Improvement #4 (Move Settings)
   ----------------------------------------------------------

   The Settings button used to live here (Dashboard -> Profile
   -> Settings). It has moved to a gear icon directly on the
   Dashboard topbar (Dashboard -> Settings), so this page no
   longer has a Settings button or handler. Profile is now
   purely: user information, login history, and activity
   history, per the Round 2 brief.

   ----------------------------------------------------------
   ROUND 3 IMPROVEMENTS (this pass)
   ----------------------------------------------------------
   ✓ Change Password now actually changes the password.
     handleChangePassword() used to validate the form and stop
     ("...once the backend is ready"). It now calls the new
     DataService.changePassword(), which checks the CURRENT
     password against the real Users sheet before writing the
     new one - see DataService.js for the full explanation and
     the matching Apps Script snippet.

   Version: 1.2
   ========================================================== */

"use strict";

/* ==========================================================
   Get HTML Elements
   ========================================================== */

var btnBack = document.getElementById("btnBack");

var txtUsername = document.getElementById("txtUsername");

var txtCurrentLogin = document.getElementById("txtCurrentLogin");
var txtLastLogin = document.getElementById("txtLastLogin");
var txtLastLogout = document.getElementById("txtLastLogout");

var txtCurrentPassword = document.getElementById("txtCurrentPassword");
var txtNewPassword = document.getElementById("txtNewPassword");
var txtConfirmPassword = document.getElementById("txtConfirmPassword");

var btnChangePassword = document.getElementById("btnChangePassword");

var listActivity = document.getElementById("activityList");



/* ==========================================================
   Month Names

   Used by formatFriendlyDateTime() below to turn an ISO
   timestamp into a beginner-friendly date, e.g. "03 Jul 2026".
   ========================================================== */

var ARR_MONTH_NAMES = [

    "Jan", "Feb", "Mar", "Apr", "May", "Jun",

    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"

];



/* ==========================================================
   Start Profile Page
   ========================================================== */

initializeProfilePage();



/* ==========================================================
   Initialize Profile Page

   Checks that the user is logged in, then fills in every
   section of the page and wires up the buttons.
   ========================================================== */

function initializeProfilePage()
{
    if (Session.requireLogin() === false)
    {
        return;
    }

    displayUsername();

    renderAvatarInitials();

    displayLoginHistory();

    loadRecentActivity();

    registerEvents();

    /* ----------------------------------------------------------
       User Management (Admin only) - see UserManagement.script.js.
       Guarded with a typeof check so this page still works
       unchanged if that file is ever missing for some reason;
       the function itself also re-checks Session.getRole() and
       does nothing at all for a non-Admin.
       ---------------------------------------------------------- */

    if (typeof initializeUserManagementSection === "function")
    {
        initializeUserManagementSection();
    }
}



/* ==========================================================
   Render the Avatar Initials

   No photo is stored anywhere on the backend for the logged-in
   user - only a username - so instead of leaving the avatar
   circle blank (or making up a fake photo), this fills it with
   the first one or two letters of the username, the same
   pattern used by Gmail, Slack, etc. when no photo is set.
   ========================================================== */

function renderAvatarInitials()
{
    var elAvatar = document.getElementById("profileAvatar");

    if (elAvatar === null)
    {
        return;
    }

    var strUsername = Session.getUsername() || "";

    var strInitials = strUsername.substring(0, 2).toUpperCase();

    elAvatar.textContent = (strInitials === "") ? "?" : strInitials;
}



/* ==========================================================
   Register Button Click Events
   ========================================================== */

function registerEvents()
{
    btnBack.onclick = goDashboard;

    btnChangePassword.onclick = handleChangePassword;
}



/* ==========================================================
   Display the Logged-In Username
   ========================================================== */

function displayUsername()
{
    var strUsername = Session.getUsername();

    if (strUsername === null || strUsername === "")
    {
        txtUsername.textContent = "Unknown User";
    }
    else
    {
        txtUsername.textContent = strUsername;
    }
}



/* ==========================================================
   Load Recent Activity (Phase 2 - moved here from Dashboard)

   Reads the small activity log (see common/activity.js) and
   shows the most recent entries, newest first. If nothing has
   been logged yet, a friendly placeholder is shown instead.
   ========================================================== */

function loadRecentActivity()
{
    var arrActivity = ActivityLog.getActivity();

    if (!arrActivity || arrActivity.length === 0)
    {
        return;
    }

    listActivity.innerHTML = "";

    var intMaxItems = Math.min(arrActivity.length, 10);

    for (var intIndex = 0; intIndex < intMaxItems; intIndex++)
    {
        var liItem = document.createElement("li");

        liItem.className = "activity-item";
        liItem.textContent = arrActivity[intIndex];

        listActivity.appendChild(liItem);
    }
}



/* ==========================================================
   Display the Login History

   Reads Current Login Time, Previous (Last) Login Time, and
   Last Logout Time from Session and shows each one in a
   beginner-friendly format, for example:

       03 Jul 2026
       11:35 AM
   ========================================================== */

function displayLoginHistory()
{
    setFriendlyDateTime(txtCurrentLogin, Session.getCurrentLoginTime());

    setFriendlyDateTime(txtLastLogin, Session.getPreviousLoginTime());

    setFriendlyDateTime(txtLastLogout, Session.getLastLogoutTime());
}



/* ==========================================================
   Set a Friendly Date/Time Into an Element

   objElement       : the <p> element to fill in
   strIsoTimestamp  : an ISO date/time string, or null if
                      nothing has been recorded yet
   ========================================================== */

function setFriendlyDateTime(objElement, strIsoTimestamp)
{
    if (strIsoTimestamp === null)
    {
        objElement.textContent = "Not Available Yet";

        return;
    }

    objElement.innerHTML = formatFriendlyDateTime(strIsoTimestamp);
}



/* ==========================================================
   Format an ISO Timestamp Into a Friendly Date/Time

   strIsoTimestamp : an ISO date/time string, e.g.
                     "2026-07-03T11:35:00.000Z"

   Returns HTML like:

       03 Jul 2026<br>11:35 AM
   ========================================================== */

function formatFriendlyDateTime(strIsoTimestamp)
{
    var objDate = new Date(strIsoTimestamp);

    /* ---------- Build the Date Part, e.g. "03 Jul 2026" ---------- */

    var numDayOfMonth = objDate.getDate();

    var strDayOfMonth = (numDayOfMonth < 10 ? "0" : "") + numDayOfMonth;

    var strMonthName = ARR_MONTH_NAMES[objDate.getMonth()];

    var numYear = objDate.getFullYear();

    var strDatePart = strDayOfMonth + " " + strMonthName + " " + numYear;

    /* ---------- Build the Time Part, e.g. "11:35 AM" ---------- */

    var numHours24 = objDate.getHours();

    var strAmPm = (numHours24 >= 12) ? "PM" : "AM";

    var numHours12 = numHours24 % 12;

    if (numHours12 === 0)
    {
        numHours12 = 12;
    }

    var numMinutes = objDate.getMinutes();

    var strMinutes = (numMinutes < 10 ? "0" : "") + numMinutes;

    var strTimePart = numHours12 + ":" + strMinutes + " " + strAmPm;

    return strDatePart + "<br>" + strTimePart;
}



/* ==========================================================
   Handle Change Password Button Click

   WHY: validates the form the same way it always did, then
   (this pass) actually sends the change to the backend
   instead of stopping after validation.
   WHAT: calls DataService.changePassword() for the logged-in
   user (Session.getUsername()). Success clears the form and
   shows a confirmation; a wrong current password or backend
   error is shown instead and the form is left as typed so the
   user can fix just the field that was wrong.
   WHEN: runs when the Change Password button is clicked.
   ========================================================== */

function handleChangePassword()
{
    var strCurrentPassword = txtCurrentPassword.value.trim();
    var strNewPassword = txtNewPassword.value.trim();
    var strConfirmPassword = txtConfirmPassword.value.trim();

    /* ---------- Validation ---------- */

    if (strCurrentPassword === "")
    {
        CommonUtils.showAlert("Please enter your current password.");

        txtCurrentPassword.focus();

        return;
    }

    if (strNewPassword === "")
    {
        CommonUtils.showAlert("Please enter a new password.");

        txtNewPassword.focus();

        return;
    }

    if (strNewPassword.length < 6)
    {
        CommonUtils.showAlert("New password must be at least 6 characters long.");

        txtNewPassword.focus();

        return;
    }

    if (strConfirmPassword === "")
    {
        CommonUtils.showAlert("Please confirm your new password.");

        txtConfirmPassword.focus();

        return;
    }

    if (strNewPassword !== strConfirmPassword)
    {
        CommonUtils.showAlert("New password and confirm password do not match.");

        txtConfirmPassword.focus();

        return;
    }

    if (strNewPassword === strCurrentPassword)
    {
        CommonUtils.showAlert("New password must be different from the current password.");

        txtNewPassword.focus();

        return;
    }

    /* ------------------------------------------------------
       All fields look good - hand off to the backend, which
       is the only place that can actually verify the current
       password against the Users sheet. See DataService.js
       for the changePassword() function and the matching
       Apps Script action it depends on.
       ------------------------------------------------------ */

    showLoader("Changing password...");

    DataService.changePassword(
        Session.getUsername(),
        strCurrentPassword,
        strNewPassword,
        function ()
        {
            hideLoader();

            CommonUtils.showAlert("Password changed successfully!", "success");

            ActivityLog.logActivity("Password Changed");

            txtCurrentPassword.value = "";
            txtNewPassword.value = "";
            txtConfirmPassword.value = "";
        },
        function (objError)
        {
            hideLoader();

            CommonUtils.showAlert((objError && objError.message) || "Could not change password.");
        }
    );
}