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

   ----------------------------------------------------------
   ROUND 4 IMPROVEMENTS (this pass)
   ----------------------------------------------------------
   ✓ Change Password moved here from Profile (brief item 5).
     Same fields, same handleChangePassword() logic, same
     DataService.changePassword() call - only hidden until
     Session.isLoggedIn() is true, since Settings is also
     reachable before login.

   ----------------------------------------------------------
   PROJECT IMPROVEMENTS (UI Modernization pass, this pass)
   ----------------------------------------------------------
   ✓ Added a Font Family grid (Poppins/Inter/Nunito/Roboto),
     built and wired up exactly like the Font Size grid - fixes
     a real gap where Phase 1's FontFamilyManager (common/
     theme.js) existed but had no picker anywhere in the app.
   ✓ Added a Density grid (Comfortable/Compact), built and
     wired up the same way, reading from the new
     DensityManager.ALL_DENSITIES list in common/theme.js.

   Version: 4.1
   ========================================================== */

"use strict";

/* ==========================================================
   Get HTML Elements
   ========================================================== */

var btnBack = document.getElementById("btnBack");

var themeGrid = document.getElementById("theme_grid");

/* New for the Font Size part of the Theme System Enhancement task */
var fontSizeGrid = document.getElementById("font_size_grid");

/* New for the UI Modernization pass (this pass) */
var fontFamilyGrid = document.getElementById("font_family_grid");
var densityGrid = document.getElementById("density_grid");

var txtServerUrl = document.getElementById("txtServerUrl");
var txtApplicationName = document.getElementById("txtApplicationName");
var txtLogoUrl = document.getElementById("txtLogoUrl");

/* New: read-only Version field, Settings Improvements task */
var txtVersion = document.getElementById("txtVersion");

var btnSaveSettings = document.getElementById("btnSaveSettings");

/* Change Password (moved here from Profile - brief item 5) */
var txtCurrentPassword = document.getElementById("txtCurrentPassword");
var txtNewPassword = document.getElementById("txtNewPassword");
var txtConfirmPassword = document.getElementById("txtConfirmPassword");
var btnChangePassword = document.getElementById("btnChangePassword");



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

    renderFontFamilyGrid();

    renderDensityGrid();

    populateApplicationSettingsFields();

    btnSaveSettings.onclick = handleSaveSettings;

    /* --------------------------------------------------
       Change Password only makes sense for a logged-in
       user (it changes Session.getUsername()'s password),
       and Settings is also reachable pre-login (see the
       Back button comment above) - so the whole card is
       hidden until there is a real session, the same way
       Profile hid the User Management section for non-Admins.
       -------------------------------------------------- */

    var sectionChangePassword = document.getElementById("changePasswordSection");

    if (Session.isLoggedIn() === true)
    {
        sectionChangePassword.style.display = "";

        btnChangePassword.onclick = handleChangePassword;
    }
    else
    {
        sectionChangePassword.style.display = "none";
    }
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

   CONFIRMATION FIX (this pass): brief requires a confirmation
   before saving Settings - this used to save immediately on
   click with no confirmation at all. Reuses the same
   CommonUtils.showConfirmDialog() already used for Logout and
   Delete User, so the dialog looks and behaves identically to
   every other confirmation in the app. Values are only read
   from the inputs and actually saved once the user confirms;
   Cancel leaves the fields as-is and saves nothing.
   ========================================================== */

function handleSaveSettings()
{
    var strServerUrl = txtServerUrl.value.trim();

    var strApplicationName = txtApplicationName.value.trim();

    var strLogoUrl = txtLogoUrl.value.trim();

    CommonUtils.showConfirmDialog(
        "Save these application settings?",
        "Save",
        "Cancel",
        "Save Settings"
    ).then(function (bConfirmed)
    {
        if (bConfirmed !== true)
        {
            return;
        }

        SettingsManager.saveSettings({

            strServerUrl: strServerUrl,
            strApplicationName: strApplicationName,
            strLogoUrl: strLogoUrl

        });

        if (typeof CommonUtils !== "undefined")
        {
            CommonUtils.showToast("Application settings saved.", "success");
        }
    });
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



/* ==========================================================
   Render the Font Family Grid

   WHY: added for the UI Modernization pass (this pass).
   FontFamilyManager (Phase 1's Poppins/Inter/Nunito/Roboto
   switch) already existed but had no picker anywhere in the
   app - this is that missing picker.
   WHAT: one button per font in FontFamilyManager.ALL_FONT_FAMILIES,
   built exactly the way renderFontSizeGrid() builds its
   buttons.
   WHEN: called once from initializeSettingsPage(), and again
   after every selection so the checkmark moves.
   ========================================================== */

function renderFontFamilyGrid()
{
    var strCurrentFont = FontFamilyManager.getCurrentFontFamily();

    fontFamilyGrid.innerHTML = "";

    FontFamilyManager.ALL_FONT_FAMILIES.forEach(function (objFont)
    {
        var bIsActive = (objFont.id === strCurrentFont);

        var btnFont = document.createElement("button");
        btnFont.type = "button";
        btnFont.className = "theme-swatch-btn" + (bIsActive === true ? " theme-swatch-active" : "");
        btnFont.setAttribute("data-font-family-id", objFont.id);

        btnFont.innerHTML =
            "<span class=\"theme-swatch-color\" style=\"background:var(--app-theme-color)\">" +
                (bIsActive === true ? "<i class=\"fa-solid fa-check\"></i>" : "<i class=\"fa-solid fa-font\"></i>") +
            "</span>" +
            "<span class=\"theme-swatch-label\">" + objFont.label + "</span>";

        btnFont.onclick = function ()
        {
            handleFontFamilySelected(objFont.id);
        };

        fontFamilyGrid.appendChild(btnFont);
    });
}



/* ==========================================================
   Handle a Font Family Being Selected

   Mirrors handleFontSizeSelected(): applies + persists the
   choice immediately (no reload needed), then redraws the
   grid so the checkmark moves to the new selection.
   ========================================================== */

function handleFontFamilySelected(strFontId)
{
    FontFamilyManager.applyFontFamily(strFontId);

    renderFontFamilyGrid();

    if (typeof CommonUtils !== "undefined")
    {
        CommonUtils.showToast("Font updated.", "success");
    }
}



/* ==========================================================
   Render the Density Grid

   WHY: added for the UI Modernization pass (this pass) -
   Density is independent of color/font, so it gets its own
   card, following the exact same "add one entry, not new HTML"
   pattern the other grids use.
   ========================================================== */

function renderDensityGrid()
{
    var strCurrentDensity = DensityManager.getCurrentDensity();

    densityGrid.innerHTML = "";

    DensityManager.ALL_DENSITIES.forEach(function (objDensity)
    {
        var bIsActive = (objDensity.id === strCurrentDensity);

        var btnDensity = document.createElement("button");
        btnDensity.type = "button";
        btnDensity.className = "theme-swatch-btn" + (bIsActive === true ? " theme-swatch-active" : "");
        btnDensity.setAttribute("data-density-id", objDensity.id);

        btnDensity.innerHTML =
            "<span class=\"theme-swatch-color\" style=\"background:var(--app-theme-color)\">" +
                (bIsActive === true ? "<i class=\"fa-solid fa-check\"></i>" : "<i class=\"fa-solid fa-table-cells-large\"></i>") +
            "</span>" +
            "<span class=\"theme-swatch-label\">" + objDensity.label + "</span>";

        btnDensity.onclick = function ()
        {
            handleDensitySelected(objDensity.id);
        };

        densityGrid.appendChild(btnDensity);
    });
}



/* ==========================================================
   Handle a Density Being Selected

   Mirrors handleFontSizeSelected(): applies + persists the
   choice immediately (no reload needed), then redraws the
   grid so the checkmark moves to the new selection.
   ========================================================== */

function handleDensitySelected(strDensityId)
{
    DensityManager.applyDensity(strDensityId);

    renderDensityGrid();

    if (typeof CommonUtils !== "undefined")
    {
        CommonUtils.showToast("Density updated.", "success");
    }
}


/* ==========================================================
   Handle Change Password Button Click

   Moved here from Profile.script.js (brief item 5 - "Change
   Password belongs inside Settings"). Logic is unchanged:
   validates the form, then hands off to
   DataService.changePassword(), which is the only place that
   can check the current password against the real Users
   sheet before writing the new one.
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
       CONFIRMATION FIX (this pass): brief requires a
       confirmation before saving a Password change - this used
       to call DataService.changePassword() immediately once
       validation passed, with no confirmation at all. All
       validation above is unchanged and still runs first, so a
       user only ever sees this dialog once every field is
       actually valid. Same CommonUtils.showConfirmDialog()
       pattern as Logout/Delete User/Save Settings, so it looks
       and behaves identically. Hands off to the backend, which
       is the only place that can actually verify the current
       password against the Users sheet. See DataService.js
       for the changePassword() function - it sends
       oldPassword (not currentPassword) to match Login.gs's
       own e.parameter name, which was the actual cause of the
       old "All fields are required." error.
       ------------------------------------------------------ */

    CommonUtils.showConfirmDialog(
        "Change your password?",
        "Change",
        "Cancel",
        "Change Password"
    ).then(function (bConfirmed)
    {
        if (bConfirmed !== true)
        {
            return;
        }

        showLoader("Changing password...");

        DataService.changePassword(
            Session.getUsername(),
            strCurrentPassword,
            strNewPassword,
            function ()
            {
                hideLoader();

                CommonUtils.showAlert("Password changed successfully.", "success");

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
    });
}