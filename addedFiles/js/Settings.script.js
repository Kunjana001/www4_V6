/* ==========================================================
   Student Management System
   Settings.script.js

   Purpose:

   Controls the Settings page: the Back button and the Dark
   Mode / Light Mode switch. The actual theme-switching logic
   lives in common/theme.js (ThemeManager) so it is not
   duplicated here, as required by Task 6.

   ----------------------------------------------------------
   ROUND 2 IMPROVEMENTS
   ----------------------------------------------------------

   Completed Improvements
   ----------------------
   ✓ Login -> Settings -> Back navigation fixed: Back now
     re-checks Session.isLoggedIn() at click time and only ever
     goes to Dashboard when a real session exists, otherwise
     Login - it can never fall through to Dashboard unauthenticated
   ✓ Settings is now reached from the Dashboard directly (gear
     icon) instead of from Profile, so Back returns to Dashboard
     for a logged-in user instead of Profile

   Version: 2.0
   ========================================================== */

"use strict";

/* ==========================================================
   Get HTML Elements
   ========================================================== */

var btnBack = document.getElementById("btnBack");

var themeGrid = document.getElementById("theme_grid");

var txtServerUrl = document.getElementById("txtServerUrl");
var txtApplicationName = document.getElementById("txtApplicationName");
var txtLogoUrl = document.getElementById("txtLogoUrl");
var btnSaveSettings = document.getElementById("btnSaveSettings");



/* ==========================================================
   Start Settings Page
   ========================================================== */

initializeSettingsPage();



/* ==========================================================
   Initialize Settings Page

   Checks that the user is logged in, then wires up the
   Back button and builds one swatch button per theme in
   ThemeManager.ALL_THEMES.
   ========================================================== */

function initializeSettingsPage()
{
    /* --------------------------------------------------
       Settings is reachable both from the Login page
       (before signing in - e.g. to point the app at a
       different Server URL) and from the Dashboard's gear
       icon (after signing in, Round 2 improvement #4), so
       it does not require a login itself. The Back button
       goes wherever makes sense for each case, and it
       re-checks Session.isLoggedIn() at click time (not
       cached) so a session that ended while Settings was
       open - or a page restored from the browser's
       back/forward cache after signing out - can never
       fall through to the Dashboard without a real login.
       -------------------------------------------------- */

    btnBack.onclick = function ()
    {
        if (Session.isLoggedIn() === true)
        {
            goDashboard();
        }
        else
        {
            goLogin();
        }
    };

    renderThemeGrid();

    populateApplicationSettingsFields();

    btnSaveSettings.onclick = handleSaveSettings;
}



/* ==========================================================
   Populate the Application Settings Fields

   Fills Server URL / Application Name / Logo URL with
   whatever is currently in effect (a saved value, or the
   AppConfig default if nothing has been saved yet).
   ========================================================== */

function populateApplicationSettingsFields()
{
    txtServerUrl.value = SettingsManager.getServerUrl();

    txtApplicationName.value = SettingsManager.getApplicationName();

    txtLogoUrl.value = SettingsManager.getLogoUrl(AppConfig.DEFAULT_LOGO_URL);
}



/* ==========================================================
   Handle Save Settings

   Saves the three Application Settings fields. Blank fields
   are left untouched (SettingsManager.saveSettings skips
   anything empty), so the user can only fill in the one
   field they care about without clearing the others.
   ========================================================== */

function handleSaveSettings()
{
    var strServerUrl = txtServerUrl.value.trim();

    var strApplicationName = txtApplicationName.value.trim();

    var strLogoUrl = txtLogoUrl.value.trim();

    SettingsManager.saveSettings({

        strServerUrl: strServerUrl,
        strApplicationName: strApplicationName,
        strLogoUrl: strLogoUrl

    });

    if (typeof CommonUtils !== "undefined")
    {
        CommonUtils.showToast("Application settings saved.", "success");
    }
}



/* ==========================================================
   Render the Theme Swatch Grid

   One button per theme, with a small color swatch, the theme
   name, and a checkmark on whichever one is currently active.
   Re-drawn after every selection so the checkmark always moves
   to match ThemeManager's current theme.
   ========================================================== */

function renderThemeGrid()
{
    var strCurrentTheme = ThemeManager.getCurrentTheme();

    themeGrid.innerHTML = "";

    ThemeManager.ALL_THEMES.forEach(function (objTheme)
    {
        var bIsActive = (objTheme.id === strCurrentTheme);

        var btnTheme = document.createElement("button");
        btnTheme.type = "button";
        btnTheme.className = "theme-swatch-btn" + (bIsActive === true ? " theme-swatch-active" : "");
        btnTheme.setAttribute("data-theme-id", objTheme.id);

        btnTheme.innerHTML =
            "<span class=\"theme-swatch-color\" style=\"background:" + objTheme.swatch + "\">" +
                (bIsActive === true ? "<i class=\"fa-solid fa-check\"></i>" : "") +
            "</span>" +
            "<span class=\"theme-swatch-label\">" + objTheme.label + "</span>";

        btnTheme.onclick = function ()
        {
            handleThemeSelected(objTheme.id);
        };

        themeGrid.appendChild(btnTheme);
    });
}



/* ==========================================================
   Handle a Theme Being Selected

   Tells ThemeManager to apply + persist the chosen theme (it
   updates the page immediately, no reload needed, and saves
   the choice to LocalStorage), then redraws the grid so the
   checkmark moves to the new selection.
   ========================================================== */

function handleThemeSelected(strThemeId)
{
    ThemeManager.applyTheme(strThemeId);

    renderThemeGrid();

    if (typeof CommonUtils !== "undefined")
    {
        CommonUtils.showToast("Theme updated.", "success");
    }
}
