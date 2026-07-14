/* ==========================================================
   LegacyCompatShim.js

   Why this file exists:

   The old Cordova code (CategoryHTML.script.js,
   SectionHTML.script.js, ResultHTML.script.js,
   StudentHTML.script.js and their paired *.script.js files)
   still calls a few small helper things that used to live in
   a shared Cordova file. That file was never carried over
   when this project became a PWA, so those calls were
   crashing with "is not defined" errors as soon as
   onDeviceReady() ran.

   This file just gives those old calls something safe to do,
   so the existing legacy code can keep running without being
   rewritten. It does not add any new features and does not
   change how the app talks to the backend - it only stops the
   crash.

   Load this file BEFORE CategoryHTML.script.js /
   SectionHTML.script.js / ResultHTML.script.js in the HTML
   <script> tags.

   ----------------------------------------------------------
   PROJECT IMPROVEMENTS (this pass)
   ----------------------------------------------------------
   ✓ Removed the showLoader()/hideLoader() implementation from
     this file - moved to common.js instead, since common.js
     is loaded by every page (this file is not). See common.js
     for why. Nothing that used to call showLoader()/hideLoader()
     needs to change, since they are still plain global
     functions - just defined in one place now instead of two.
   ========================================================== */

"use strict";


/* ==========================================================
   App Mode Constants

   The old code checks "if appMode == MODE_LOCAL_DB" to decide
   whether to open a local SQLite database, or
   "MODE_NETWORK_DB" to talk to a server. This project now
   always uses DataService (which itself decides GOOGLE /
   SPRING / OFFLINE), so we simply make sure the old code
   always takes the "network" branch and never tries to open
   a local SQLite database that no longer exists.
   ========================================================== */

var MODE_LOCAL_DB   = "LOCAL_DB";

var MODE_NETWORK_DB = "NETWORK_DB";



/* ==========================================================
   INSERT_DATA / UPDATE_DATA (Add/Edit Mode Constants)

   WHY: Student.script.js, Category.script.js, Section.script.js
   and Result.script.js all compare "mode == INSERT_DATA" and
   "mode == UPDATE_DATA" (and store the current mode with
   sessionStorage.setItem(SESSION_OBJECT.ADD_EDIT_MODE, UPDATE_DATA))
   to tell whether an Add form or an Edit form is currently
   open. Neither constant was defined anywhere in the project,
   so every one of those comparisons threw "UPDATE_DATA is not
   defined" or "INSERT_DATA is not defined" and stopped the
   rest of that function from running - this is why Add/Edit
   Save could fail silently partway through.
   WHAT: two simple, distinct marker values - any two values
   that are not equal to each other work, since the rest of the
   code only ever compares mode against these two constants.
   WHEN: read/written every time an Add or Edit form is opened,
   saved, or cancelled.
   ========================================================== */

var INSERT_DATA = 1;

var UPDATE_DATA = 2;



/* ==========================================================
   rgb2hex()

   WHY: Student.script.js, Category.script.js, Section.script.js
   and Result.script.js all call rgb2hex(backgroundColor) when a
   list item is clicked/selected, to convert the browser's
   computed "rgb(r, g, b)" (or "rgba(r, g, b, a)") background
   color string into a "#rrggbb" hex string. This helper used to
   live in a shared Cordova file that was never carried over
   when this project became a PWA, so this call was throwing
   "rgb2hex is not defined" as soon as any list item was clicked.
   WHAT: parses the numeric r/g/b values out of the string jQuery
   returns from .css("backgroundColor") and returns them as a
   "#rrggbb" hex string. Falls back to "#ffffff" if the string
   cannot be parsed (e.g. "transparent").
   WHEN: called from onClickListItem() every time a row in a
   list is clicked.
   ========================================================== */

function rgb2hex(strRgb)
{
    var arrMatch = strRgb && strRgb.match(/\d+(\.\d+)?/g);

    if (!arrMatch || arrMatch.length < 3)
    {
        return "#ffffff";
    }

    function toHexByte(strNum)
    {
        var strHex = parseInt(strNum, 10).toString(16);

        return strHex.length === 1 ? "0" + strHex : strHex;
    }

    return "#" + toHexByte(arrMatch[0]) + toHexByte(arrMatch[1]) + toHexByte(arrMatch[2]);
}



/* ==========================================================
   setErrorHandler()

   Originally wired up some Cordova-specific error logging.
   Here it just writes a small note to the console so a
   developer can still see which page called it, without
   trying to use any Cordova-only APIs.
   ========================================================== */

function setErrorHandler(strPageName)
{
    console.log("setErrorHandler() called for page: " + strPageName);
}



/* ==========================================================
   openDatabase()

   Originally opened a local SQLite database. Since
   getAppMode() below always returns MODE_NETWORK_DB, the old
   "if (getAppMode() == MODE_LOCAL_DB)" check will never call
   this in normal use. It is still defined here (as a safe
   no-op) in case any other old code path calls it directly.
   ========================================================== */

function openDatabase()
{
    console.log("openDatabase() called, but this app now uses DataService instead of a local SQLite database. Doing nothing.");
}



/* ==========================================================
   Search Mode Constants

   The old code picks between "search as you type" and
   "search only when the search icon is clicked" using these
   two constants. Category.script.js already has working
   clearSearch() / enableSearch() / searchList() functions -
   they only needed these two constant values to exist.
   ========================================================== */

var MODE_SEARCH_ON_KEYUP      = "SEARCH_ON_KEYUP";

var MODE_SEARCH_ON_ICON_CLICK = "SEARCH_ON_ICON_CLICK";



/* ==========================================================
   Dialog Button Constants

   The old code was written for a Cordova plugin
   (notification.confirm) that calls its callback with a
   1-based button index: 1 for the first button (Confirm/OK),
   2 for the second button (Cancel). showConfirmationAlert()
   below follows this same convention so the existing
   "if (buttonIndex == BUTTON_CONFIRM)" checks already in
   Category.script.js keep working unchanged.
   ========================================================== */

var BUTTON_CONFIRM = 1;

var BUTTON_CANCEL  = 2;



/* ==========================================================
   SOFTWARE_FEATURE_CONST

   Used together with checkRolePermission() below to decide
   whether to show or hide an Add / Edit / Delete / Share
   button. Keys are added here as each page (Category,
   Section, Result, ...) is migrated.
   ========================================================== */

var SOFTWARE_FEATURE_CONST = {

    ADD_CATEGORY:    "ADD_CATEGORY",
    EDIT_CATEGORY:   "EDIT_CATEGORY",
    DELETE_CATEGORY: "DELETE_CATEGORY",
    SHARE_CATEGORY:  "SHARE_CATEGORY"

};



/* ==========================================================
   checkRolePermission()

   WHY: this used to check a user's role/permissions before
   letting them Add, Edit, Delete, or Share a record. There is
   no roles/permissions system anywhere else in this project
   (Student, Dashboard, and every other page already show
   their Add/Edit/Delete buttons to everyone, with no
   permission check at all).
   WHAT: always returns true, so every button keeps behaving
   exactly like every other page already does - nobody is
   blocked from anything they were not already blocked from.
   WHEN: called before showing/hiding an Add, Edit, Delete, or
   Share button.
   ========================================================== */

function checkRolePermission(strFeatureName)
{
    return true;
}



/* ==========================================================
   clearSessionStorage()

   WHY: the old code stored small pieces of page state (the
   currently selected record id, cached lists, etc.) in the
   browser's sessionStorage, and needed a way to clear one
   entry at a time.
   WHAT: removes one key from sessionStorage - this is exactly
   what sessionStorage.removeItem() already does, so this is
   simply giving the old function name a real implementation.
   WHEN: called when leaving a page, or after a save/delete,
   to stop stale data from a previous visit being reused.
   ========================================================== */

function clearSessionStorage(strKey)
{
    sessionStorage.removeItem(strKey);
}



/* ==========================================================
   setListToView()

   WHY: after building the HTML for the list of cards, the old
   code needed one function to actually put that HTML on the
   page.
   WHAT: writes the given HTML string into the #list_id
   element that already exists in every list page
   (studentList.html / categoryList.html / sectionList.html /
   resultList.html).
   WHEN: called every time the visible list needs to be
   redrawn (after loading, searching, or filtering).
   ========================================================== */

function setListToView(strHtml)
{
    var oListElement = document.getElementById("list_id");

    if (oListElement)
    {
        oListElement.innerHTML = strHtml;
    }
}



/* ==========================================================
   gotoHome()

   WHY: the old code needed a way to send the user back to the
   Dashboard, for example after their session expires.
   WHAT: reuses the goDashboard() helper that already exists
   in navigation.js and is already used by every list page's
   "Dashboard" button.
   WHEN: called after certain error/session dialogs are
   closed.
   ========================================================== */

function gotoHome()
{
    goDashboard();
}



/* ==========================================================
   showLoader() / hideLoader()

   MOVED to common.js (this pass) - common.js is loaded by
   every page, including every page this file is loaded on, so
   keeping two copies risked them silently drifting apart. This
   file's own callers (getBackendMode() switches, etc.) still
   work unchanged since showLoader()/hideLoader() are still
   plain global functions - just defined in one place now.
   See common.js for the full WHY/WHAT/WHEN.
   ========================================================== */



/* ==========================================================
   showAlertDialog() / showConfirmationAlert() /
   showOperationMessage() / showShortBottomToast()

   WHY: the old code used Cordova's notification plugin to
   show alerts/confirmations/toasts, always followed by a
   callback function once the user closed the dialog.
   WHAT: these reuse the existing CommonUtils.showAlert() /
   CommonUtils.showConfirm() functions from common.js (which
   already wrap the browser's built-in alert()/confirm()), and
   then call the given callback the same way the old Cordova
   plugin did.
   WHEN: called any time the old code needs to tell the user
   something, or ask a yes/no question, before continuing.
   ========================================================== */

function showAlertDialog(strMessage, fnCallback, strTitle, strButtonLabel)
{
    CommonUtils.showAlert(strMessage);

    if (fnCallback)
    {
        fnCallback();
    }
}

function showConfirmationAlert(strMessage, fnCallback, strTitle, arrButtonLabels)
{
    // --------------------------------------------------
    // Confirmation Dialogs: arrButtonLabels used to be accepted
    // here but never actually used - every confirmation showed
    // the browser's native "OK"/"Cancel" box no matter what
    // labels a caller passed in. Now it drives the app's own
    // styled dialog (CommonUtils.showConfirmDialog), so Save
    // confirmations can read "Yes"/"No" and Delete confirmations
    // can read "Delete"/"Cancel", matching what each one is
    // actually asking. Falls back to "Yes"/"No" if a caller
    // doesn't pass labels.
    // --------------------------------------------------
    var strConfirmLabel = (arrButtonLabels && arrButtonLabels[0]) || "Yes";
    var strCancelLabel  = (arrButtonLabels && arrButtonLabels[1]) || "No";

    CommonUtils.showConfirmDialog(strMessage, strConfirmLabel, strCancelLabel, strTitle)
        .then(function (bConfirmed)
        {
            if (fnCallback)
            {
                fnCallback(bConfirmed ? BUTTON_CONFIRM : BUTTON_CANCEL);
            }
        });
}

// --------------------------------------------------------
// Improvements Made (brief item 5 - Success Messages):
// showOperationMessage() received strType (e.g. "Success" from
// every Add/Update/Delete call in Student/Category/Section/
// Result.script.js) but never passed it on to
// CommonUtils.showAlert(), which defaults to "error" styling
// when no type is given. Every one of those success toasts was
// therefore rendering with red/error styling instead of green.
// Fixed by forwarding strType (normalized to lowercase, since
// callers pass "Success" but showToast()'s CSS classes/icons
// are lowercase "success"/"error"/"warning"/"info").
// --------------------------------------------------------
function showOperationMessage(strMessage, strType, fnCallback)
{
    CommonUtils.showAlert(strMessage, String(strType || "success").toLowerCase());

    if (fnCallback)
    {
        fnCallback();
    }
}

function showShortBottomToast(strMessage)
{
    console.log(strMessage);
}



/* ==========================================================
   Back Button "Double Press to Exit" Feature Flag

   CONNECTION FIX: Category.script.js, Section.script.js,
   Result.script.js and Student.script.js all check
   "SettingsScript.FEATURE.DOUBLE_BACK_PRESS == FEATURE_ENABLED"
   at the very end of onClickListBackButton() - the step that
   actually leaves the list and goes back to the Dashboard when
   no popup/modal is open. Neither SettingsScript nor
   FEATURE_ENABLED was defined anywhere in the project, so this
   comparison threw "SettingsScript is not defined" every single
   time, which silently stopped the back button (and the header's
   Back arrow, which calls the same function) from ever reaching
   loadBackButtonEvent() / gotoHome() / goDashboard(). That is why
   pressing Back only added a "#" to the address bar and nothing
   else happened.

   FEATURE_ENABLED and FEATURE_DISABLED are simple on/off
   markers, defined just below, purely so this comparison reads
   the same way a real feature flag would. SettingsScript.FEATURE
   is set up the same way a real Settings toggle would be, but
   defaults DOUBLE_BACK_PRESS to *disabled*, so one Back press goes
   straight to the Dashboard - the behaviour a normal website/PWA
   back button is expected to have. If a native-app-style "press
   Back again to exit" confirmation is wanted instead later, change
   DOUBLE_BACK_PRESS below to FEATURE_ENABLED - no other file needs
   to change.

   Category.script.js, Section.script.js, Result.script.js and
   Student.script.js also check two more flags on this same object -
   ADD_EDIT_CLOSE_CONFIRMATION ("are you sure you want to discard
   unsaved changes?") and ADD_EDIT_CONFIRMATION_MESSAGE ("are you
   sure you want to save?"). Reading a property that does not exist
   on an object is not an error in JavaScript (it simply reads as
   undefined, which does not equal FEATURE_ENABLED), so those two
   checks were not crashing anything - but they are listed here
   explicitly, defaulted to disabled, so every feature flag this
   project checks is easy to find and turn on in exactly one place.

   Improvements Made - brief item 4 ("Confirmation Dialogs") asks
   for a confirmation before Save/Edit ("Do you want to save this
   student?" / "Save changes?"), Delete, and Logout. Delete and
   Logout already call showConfirmationAlert()/CommonUtils.showConfirm()
   unconditionally in every entity script and in Dashboard.script.js,
   so those already worked. Save/Edit's confirmation, however, was
   silently gated behind this exact ADD_EDIT_CONFIRMATION_MESSAGE
   flag being DISABLED - so onClickSaveData() in Student/Category/
   Section/Result.script.js was always skipping straight to
   onConfirmSaveFormData() with no prompt at all, on every one of
   those four pages. Flipped this one flag to FEATURE_ENABLED so
   the confirmation that was already fully built now actually runs;
   no other file needed to change, exactly as this comment already
   promised above.

   Follow-up: despite the above, Delete/Save/Share confirmations
   were still silently crashing on every one of those four pages -
   showConfirmationAlert()'s 4th argument, buttonLabels, was
   referenced at every call site but never declared anywhere in
   the project. Reading an undeclared variable throws a
   ReferenceError in JavaScript, so the confirmation never even
   opened. Fixed by declaring buttonLabels in each entity script
   (default ["Yes", "No"]), with the two Delete confirmations in
   each file passing their own ["Delete", "Cancel"] instead. At
   the same time, showConfirmationAlert() and Dashboard's
   logoutUser() were switched from the browser's native confirm()
   box (always "OK"/"Cancel", can't be relabeled) to the app's own
   styled dialog - CommonUtils.showConfirmDialog() in common.js -
   so Save reads "Yes"/"No", Delete reads "Delete"/"Cancel", and
   Logout reads "Yes"/"No" under a "Logout?" heading, matching the
   brief's mockups exactly.
   ========================================================== */

var FEATURE_ENABLED  = "ENABLED";
var FEATURE_DISABLED = "DISABLED";

var SettingsScript = {

    FEATURE: {

        DOUBLE_BACK_PRESS: FEATURE_DISABLED,

        ADD_EDIT_CLOSE_CONFIRMATION: FEATURE_DISABLED,

        ADD_EDIT_CONFIRMATION_MESSAGE: FEATURE_ENABLED

    }

};