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

   ----------------------------------------------------------
   ROUND 3 IMPROVEMENTS (Theme System Enhancement + Settings task)
   ----------------------------------------------------------
   ✓ Added a Font Size grid (Small/Medium/Large), built and
     wired up exactly like the existing Theme grid, reading
     from the new FontSizeManager.ALL_FONT_SIZES list in
     common/theme.js
   ✓ Version field on the Application card now shows
     AppConfig.APP_VERSION (read-only - the version is set in
     one place, Config.js, not typed in twice)

   Version: 3.0
   ========================================================== */

"use strict";

/* ==========================================================
   Get HTML Elements
   ========================================================== */

var btnBack = document.getElementById("btnBack");

var themeGrid = document.getElementById("theme_grid");

/* New for the Font Size part of the Theme System Enhancement task */
var fontSizeGrid = document.getElementById("font_size_grid");

var txtServerUrl = document.getElementById("txtServerUrl");
var txtApplicationName = document.getElementById("txtApplicationName");
var txtLogoUrl = document.getElementById("txtLogoUrl");

/* New: read-only Version field, Settings Improvements task */
var txtVersion = document.getElementById("txtVersion");

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

    renderFontSizeGrid();

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

    /* Version is not user-editable - it always shows whatever
       Config.js currently says, so there is only ever one
       place that needs updating when the app version changes. */
    txtVersion.value = AppConfig.APP_VERSION;
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



/* ==========================================================
   Render the Font Size Grid

   WHY: added for the Font Size part of the Theme System
   Enhancement task.
   WHAT: one button per size in FontSizeManager.ALL_FONT_SIZES,
   built the same way renderThemeGrid() builds its buttons
   (same CSS classes, same active-checkmark pattern) so it
   looks and behaves consistently with the Theme grid above it.
   WHEN: called once from initializeSettingsPage(), and again
   after every selection so the checkmark moves.
   ========================================================== */

function renderFontSizeGrid()
{
    var strCurrentSize = FontSizeManager.getCurrentFontSize();

    fontSizeGrid.innerHTML = "";

    FontSizeManager.ALL_FONT_SIZES.forEach(function (objSize)
    {
        var bIsActive = (objSize.id === strCurrentSize);

        var btnSize = document.createElement("button");
        btnSize.type = "button";
        btnSize.className = "theme-swatch-btn" + (bIsActive === true ? " theme-swatch-active" : "");
        btnSize.setAttribute("data-font-size-id", objSize.id);

        btnSize.innerHTML =
            "<span class=\"theme-swatch-color\" style=\"background:var(--app-theme-color)\">" +
                (bIsActive === true ? "<i class=\"fa-solid fa-check\"></i>" : "<i class=\"fa-solid fa-font\"></i>") +
            "</span>" +
            "<span class=\"theme-swatch-label\">" + objSize.label + "</span>";

        btnSize.onclick = function ()
        {
            handleFontSizeSelected(objSize.id);
        };

        fontSizeGrid.appendChild(btnSize);
    });
}



/* ==========================================================
   Handle a Font Size Being Selected

   Mirrors handleThemeSelected(): applies + persists the
   choice immediately (no reload needed), then redraws the
   grid so the checkmark moves to the new selection.
   ========================================================== */

function handleFontSizeSelected(strSizeId)
{
    FontSizeManager.applyFontSize(strSizeId);

    renderFontSizeGrid();

    if (typeof CommonUtils !== "undefined")
    {
        CommonUtils.showToast("Font size updated.", "success");
    }
}