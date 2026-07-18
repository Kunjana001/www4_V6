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

   ----------------------------------------------------------
   FORGOT PASSWORD PAGE (this pass)
   ----------------------------------------------------------
   ✓ Removed the #forgotPasswordOverlay popup and everything
     that ran it (openForgotPasswordModal / closeForgotPasswordModal /
     resetForgotPasswordModal / verifyForgotPasswordUsername /
     submitNewPassword, plus all of the fp* element lookups and
     the modal's click/backdrop wiring). Forgot Password is now
     its own page, addedFiles/html/forgotPassword.html - same
     pattern as Sign Up's signup.html. "Forgot Password?" is a
     plain link in index.html now (href="forgotPassword.html"),
     so it works with JS disabled too; nothing left to wire up
     here beyond that.
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
