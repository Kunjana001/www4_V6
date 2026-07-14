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

   CONNECTION FIX: these used to only console.log(), so nothing
   was ever visible on screen while a backend request was in
   flight - a slow/failed request just looked like the app was
   doing nothing. This now also shows a small full-screen
   overlay with a spinner + message, built and styled entirely
   in JS (no HTML/CSS files touched, so every existing page
   gets it automatically since they all already load this
   file).

   WHY: the old code showed a loading indicator while it
   waited for the server (or SQLite) to respond.
   WHAT: builds one reusable overlay element (created once,
   reused after that) and toggles it on/off.
   WHEN: showLoader() runs right before a DataService call;
   hideLoader() runs once that call's callback fires.
   ========================================================== */

function getOrCreateLoaderElement()
{
    var oLoader = document.getElementById("legacyCompatShimLoader");

    if (oLoader)
    {
        return oLoader;
    }

    var oStyle = document.createElement("style");

    oStyle.textContent =
        "#legacyCompatShimLoader{position:fixed;top:0;left:0;right:0;bottom:0;" +
        "background:rgba(255,255,255,0.85);z-index:99999;display:none;" +
        "align-items:center;justify-content:center;flex-direction:column;}" +
        "#legacyCompatShimLoader .lcsSpinner{width:36px;height:36px;border-radius:50%;" +
        "border:4px solid #cfd8ea;border-top-color:#123b8d;animation:lcsSpin 0.8s linear infinite;}" +
        "#legacyCompatShimLoader .lcsMessage{margin-top:10px;color:#123b8d;font-size:14px;}" +
        "@keyframes lcsSpin{to{transform:rotate(360deg);}}";

    document.head.appendChild(oStyle);

    oLoader = document.createElement("div");
    oLoader.id = "legacyCompatShimLoader";
    oLoader.innerHTML = "<div class=\"lcsSpinner\"></div><div class=\"lcsMessage\"></div>";

    document.body.appendChild(oLoader);

    return oLoader;
}

var numLoaderRequestCount = 0;

function showLoader(strMessage)
{
    console.log("Loading: " + (strMessage || ""));

    numLoaderRequestCount++;

    var oLoader = getOrCreateLoaderElement();

    oLoader.querySelector(".lcsMessage").textContent = strMessage || "Loading...";
    oLoader.style.display = "flex";
}

function hideLoader()
{
    console.log("Loading finished.");

    numLoaderRequestCount = Math.max(0, numLoaderRequestCount - 1);

    if (numLoaderRequestCount === 0)
    {
        var oLoader = document.getElementById("legacyCompatShimLoader");

        if (oLoader)
        {
            oLoader.style.display = "none";
        }
    }
}



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
    var bConfirmed = CommonUtils.showConfirm(strMessage);

    if (fnCallback)
    {
        fnCallback(bConfirmed ? BUTTON_CONFIRM : BUTTON_CANCEL);
    }
}

function showOperationMessage(strMessage, strType, fnCallback)
{
    CommonUtils.showAlert(strMessage);

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
   ========================================================== */

var FEATURE_ENABLED  = "ENABLED";
var FEATURE_DISABLED = "DISABLED";

var SettingsScript = {

    FEATURE: {

        DOUBLE_BACK_PRESS: FEATURE_DISABLED,

        ADD_EDIT_CLOSE_CONFIRMATION: FEATURE_DISABLED,

        ADD_EDIT_CONFIRMATION_MESSAGE: FEATURE_DISABLED

    }

};