/* ==========================================================
   Student Management System
   Login JavaScript

   ----------------------------------------------------------
   PROJECT IMPROVEMENTS (this pass)
   ----------------------------------------------------------
   ✓ Wired up the "Remember Me" checkbox, which existed in
     index.html but had no logic behind it anywhere - checking
     it and logging in did nothing. Only the username is
     remembered (see the REMEMBERED_USERNAME comment in
     Config.js for why the password is deliberately never
     stored); it is prefilled and the checkbox is pre-checked
     on the next visit, and unchecking it before login forgets
     the saved username again.
   ========================================================== */


/* ==========================================================
   Get HTML Elements
   ========================================================== */

var txtUsername = document.getElementById("username");
var txtPassword = document.getElementById("password");

var chkRememberMe = document.getElementById("rememberMe");

var btnLogin = document.getElementById("loginBtn");

var btnSignup = document.getElementById("signupBtn");

var btnEye = document.getElementById("togglePassword");

var btnLoginSettings = document.getElementById("btnLoginSettings");

var linkForgotPassword = document.getElementById("forgotPasswordLink");

var forgotPasswordOverlay = document.getElementById("forgotPasswordOverlay");

var stepFpUsername = document.getElementById("fpStepUsername");
var stepFpPassword = document.getElementById("fpStepPassword");

var txtFpUsername = document.getElementById("fpUsername");
var lblFpVerifiedUsername = document.getElementById("fpVerifiedUsername");

var txtFpNewPassword = document.getElementById("fpNewPassword");
var txtFpConfirmPassword = document.getElementById("fpConfirmPassword");

var btnCloseForgotPassword = document.getElementById("btnCloseForgotPassword");
var btnCancelForgotPassword = document.getElementById("btnCancelForgotPassword");
var btnFpVerifyUsername = document.getElementById("btnFpVerifyUsername");
var btnFpResetPassword = document.getElementById("btnFpResetPassword");

/* Holds the username once Step 1 has confirmed it exists, so
   Step 2's Reset Password button does not have to re-read (or
   trust) the Step 1 input again. */
var strFpVerifiedUsername = "";

var imgLoginLogo = document.getElementById("loginLogo");

var lblLoginTitle = document.getElementById("loginTitle");
var lblLoginSubtitle = document.getElementById("loginSubtitle");


/* ==========================================================
   Page Text, Application Name, and Logo (Phase 3)

   Title / subtitle / app name / logo all come from
   SettingsManager (which falls back to AppConfig) instead of
   being hardcoded in index.html, so a saved Server URL /
   Application Name / Logo URL on the Settings page takes
   effect here without touching this file.
   ========================================================== */

document.title = SettingsManager.getApplicationName() + " - Login";

imgLoginLogo.src = SettingsManager.getLogoUrl(AppConfig.DEFAULT_LOGO_URL);
imgLoginLogo.alt = SettingsManager.getApplicationName() + " Logo";

lblLoginTitle.textContent = AppConfig.TEXT.login.title;
lblLoginSubtitle.textContent = "Welcome to " + SettingsManager.getApplicationName();


/* ==========================================================
   Improvements Made (brief item 5 - Success Messages)

   Shows and clears a "Logout Successful!" toast stashed by
   Session.logout() just before it hard-navigated here (see the
   STORAGE_KEYS.POST_REDIRECT_TOAST comment in Config.js) - a
   toast called immediately before window.location.href never
   had a chance to render on the page that's navigating away.
   No-op on a normal visit to this page, since the key is only
   ever set right before a logout redirect.
   ========================================================== */

(function showPendingPostRedirectToast()
{
    var strPendingMessage = StorageService.getValue(AppConfig.STORAGE_KEYS.POST_REDIRECT_TOAST);

    if (strPendingMessage)
    {
        StorageService.removeValue(AppConfig.STORAGE_KEYS.POST_REDIRECT_TOAST);

        CommonUtils.showToast(strPendingMessage, "success");
    }
})();


/* ==========================================================
   Remember Me - Prefill a Saved Username

   WHY: so a user who checked "Remember Me" last time does not
   have to retype their username every visit.
   WHAT: if a username was saved, fills it in and checks the
   box to match. Runs before the DEV_MODE prefill below so a
   real remembered username always wins over the admin/admin
   test shortcut.
   WHEN: runs once, as soon as this script loads.
   ========================================================== */

(function prefillRememberedUsername()
{
    var strRememberedUsername = StorageService.getValue(AppConfig.STORAGE_KEYS.REMEMBERED_USERNAME);

    if (strRememberedUsername)
    {
        txtUsername.value = strRememberedUsername;

        chkRememberMe.checked = true;
    }
})();


/* ==========================================================
   Development Only - Prefill Admin Credentials

   Saves re-typing admin/admin on every test run. Set
   AppConfig.DEV_MODE to false before shipping to turn this
   off. Skipped when a remembered username was already
   filled in above, so it never overwrites a real saved login.
   ========================================================== */

if (AppConfig.DEV_MODE === true && chkRememberMe.checked === false)
{
    txtUsername.value = "admin";
    txtPassword.value = "admin";
}


/* ==========================================================
   Register Events
   ========================================================== */

btnEye.onclick = togglePassword;

btnLogin.onclick = loginUser;

btnSignup.onclick = goSignup;

btnLoginSettings.onclick = goSettings;

linkForgotPassword.onclick = function (objEvent)
{
    objEvent.preventDefault();

    openForgotPasswordModal();
};

btnCloseForgotPassword.onclick = closeForgotPasswordModal;
btnCancelForgotPassword.onclick = closeForgotPasswordModal;

/* Clicking the dimmed backdrop (not the box itself) closes the
   modal - same convention as CommonUtils.showConfirmDialog and
   the Add/Edit User modal on the Profile page. */
forgotPasswordOverlay.onclick = function (objEvent)
{
    if (objEvent.target === forgotPasswordOverlay)
    {
        closeForgotPasswordModal();
    }
};

btnFpVerifyUsername.onclick = verifyForgotPasswordUsername;

btnFpResetPassword.onclick = submitNewPassword;


/* ==========================================================
   Show / Hide Password
   ========================================================== */

function togglePassword()
{
    if (txtPassword.type === "password")
    {
        txtPassword.type = "text";

        btnEye.classList.remove("fa-eye");
        btnEye.classList.add("fa-eye-slash");
    }
    else
    {
        txtPassword.type = "password";

        btnEye.classList.remove("fa-eye-slash");
        btnEye.classList.add("fa-eye");
    }
}


/* ==========================================================
   Login User
   ========================================================== */

function loginUser()
{
    var strUsername = txtUsername.value.trim();

    var strPassword = txtPassword.value.trim();


    /* ---------- Validation ---------- */

    if (strUsername === "")
    {
        CommonUtils.showAlert("Please enter your username.");

        txtUsername.focus();

        return;
    }

    if (strPassword === "")
    {
        CommonUtils.showAlert("Please enter your password.");

        txtPassword.focus();

        return;
    }


    /* --------------------------------------------------
       CONNECTION FIX - WHY / WHAT / WHEN

       WHY: this used to call Session.login(strUsername) and
       declare success unconditionally - it never checked the
       Users sheet, so any username/password "worked".
       WHAT: asks DataService to log in against the real Google
       Apps Script backend (Login.gs), and only calls
       Session.login() / goDashboard() if the backend confirms
       the username and password are correct.
       WHEN: runs when the user taps the Login button.
       -------------------------------------------------- */

    showLoader("Logging in...");

    DataService.login(strUsername, strPassword, function (objUser)
    {
        hideLoader();

        Session.login(objUser.username, objUser.role);

        ActivityLog.logActivity("Login");

        /* --------------------------------------------------
           WHY: apply the Remember Me choice at the moment
           login is confirmed successful - not before - so a
           failed login attempt never saves (or clears) a
           username the backend didn't actually accept.
           WHAT: saves the username if the box is checked,
           otherwise removes any previously-saved one, so
           unchecking it and logging in again forgets it.
           WHEN: runs right after DataService.login() succeeds.
           -------------------------------------------------- */

        if (chkRememberMe.checked === true)
        {
            StorageService.saveValue(AppConfig.STORAGE_KEYS.REMEMBERED_USERNAME, strUsername);
        }
        else
        {
            StorageService.removeValue(AppConfig.STORAGE_KEYS.REMEMBERED_USERNAME);
        }

        // Improvements Made (brief item 5): this used to call
        // CommonUtils.showAlert("Login Successful!") right here,
        // which (a) defaults to error styling since showAlert()
        // only passes a "success" type when one is explicitly
        // given, and (b) was destroyed by goDashboard()'s
        // window.location.href on the very next line before the
        // toast could ever render. Stashed instead, for
        // Dashboard.script.js to show once the Dashboard has
        // actually loaded - see STORAGE_KEYS.POST_REDIRECT_TOAST
        // in Config.js.
        StorageService.saveValue(AppConfig.STORAGE_KEYS.POST_REDIRECT_TOAST, "Login successful.");

        goDashboard();
    },
    function (objError)
    {
        hideLoader();

        console.log(objError);

        CommonUtils.showAlert((objError && objError.message) || "Invalid Username or Password.");
    });
}


/* ==========================================================
   Forgot Password

   No email column exists on the Users sheet (see
   DataService.js's User entity map), so this follows the
   simplest academic-project flow:

       Forgot Password
             |
       Enter Username
             |
       Verify Username Exists
             |
       Enter New Password / Confirm Password
             |
       Update Users Sheet
             |
       Password changed successfully
             |
       Back to Login

   Both steps live in the same modal (#forgotPasswordOverlay);
   Step 2 (fpStepPassword) only appears once Step 1 has
   confirmed the username is real, so a new password can never
   be sent for a username that was never checked.
   ========================================================== */

/* ==========================================================
   Open the Modal

   Always starts back on Step 1 (Username), even if it was left
   on Step 2 the last time it was closed, so a stale verified
   username is never carried over into a new attempt.
   ========================================================== */

function openForgotPasswordModal()
{
    resetForgotPasswordModal();

    forgotPasswordOverlay.style.display = "flex";

    txtFpUsername.focus();
}



/* ==========================================================
   Close the Modal
   ========================================================== */

function closeForgotPasswordModal()
{
    forgotPasswordOverlay.style.display = "none";

    resetForgotPasswordModal();
}



/* ==========================================================
   Reset the Modal Back to Step 1

   Clears every field, forgets any previously verified
   username, and shows the Username step / "Verify Username"
   button again while hiding the Password step / "Reset
   Password" button.
   ========================================================== */

function resetForgotPasswordModal()
{
    strFpVerifiedUsername = "";

    txtFpUsername.value = "";
    txtFpNewPassword.value = "";
    txtFpConfirmPassword.value = "";

    lblFpVerifiedUsername.textContent = "";

    stepFpUsername.style.display = "";
    stepFpPassword.style.display = "none";

    btnFpVerifyUsername.style.display = "";
    btnFpResetPassword.style.display = "none";

    btnFpVerifyUsername.disabled = false;
    btnFpResetPassword.disabled = false;
}



/* ==========================================================
   Step 1 - Verify the Username Exists

   Asks the backend (Users sheet) whether this username is
   real before ever showing a New Password field. Only on a
   confirmed match does Step 2 appear.
   ========================================================== */

function verifyForgotPasswordUsername()
{
    var strUsername = txtFpUsername.value.trim();

    if (strUsername === "")
    {
        CommonUtils.showAlert("Please enter your username.");

        txtFpUsername.focus();

        return;
    }

    btnFpVerifyUsername.disabled = true;

    showLoader("Checking username...");

    DataService.verifyUsernameExists(strUsername, function ()
    {
        hideLoader();

        btnFpVerifyUsername.disabled = false;

        strFpVerifiedUsername = strUsername;

        lblFpVerifiedUsername.textContent = strUsername;

        stepFpUsername.style.display = "none";
        stepFpPassword.style.display = "";

        btnFpVerifyUsername.style.display = "none";
        btnFpResetPassword.style.display = "";

        txtFpNewPassword.focus();
    },
    function (objError)
    {
        hideLoader();

        btnFpVerifyUsername.disabled = false;

        console.log(objError);

        CommonUtils.showAlert((objError && objError.message) || "Username not found.");
    });
}



/* ==========================================================
   Step 2 - Set the New Password

   Validates the new password / confirm password locally, then
   asks the backend to update the Users sheet for the username
   verified in Step 1 - never the raw (unverified) contents of
   the Username field.
   ========================================================== */

function submitNewPassword()
{
    var strNewPassword = txtFpNewPassword.value.trim();

    var strConfirmPassword = txtFpConfirmPassword.value.trim();

    if (strNewPassword === "")
    {
        CommonUtils.showAlert("Please enter a new password.");

        txtFpNewPassword.focus();

        return;
    }

    if (strNewPassword.length < 6)
    {
        CommonUtils.showAlert("Password must be at least 6 characters.");

        txtFpNewPassword.focus();

        return;
    }

    if (strConfirmPassword === "")
    {
        CommonUtils.showAlert("Please confirm your new password.");

        txtFpConfirmPassword.focus();

        return;
    }

    if (strNewPassword !== strConfirmPassword)
    {
        CommonUtils.showAlert("Passwords do not match.");

        txtFpConfirmPassword.focus();

        return;
    }

    btnFpResetPassword.disabled = true;

    showLoader("Updating password...");

    DataService.resetPassword(strFpVerifiedUsername, strNewPassword, function ()
    {
        hideLoader();

        btnFpResetPassword.disabled = false;

        closeForgotPasswordModal();

        CommonUtils.showAlert("Password changed successfully.", "success");
    },
    function (objError)
    {
        hideLoader();

        btnFpResetPassword.disabled = false;

        console.log(objError);

        CommonUtils.showAlert((objError && objError.message) || "Could not update password.");
    });
}