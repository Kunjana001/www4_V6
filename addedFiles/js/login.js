/* ==========================================================
   Student Management System
   Login JavaScript
   ========================================================== */


/* ==========================================================
   Get HTML Elements
   ========================================================== */

var txtUsername = document.getElementById("username");
var txtPassword = document.getElementById("password");

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
   Development Only - Prefill Admin Credentials

   Saves re-typing admin/admin on every test run. Set
   AppConfig.DEV_MODE to false before shipping to turn this
   off.
   ========================================================== */

if (AppConfig.DEV_MODE === true)
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
        alert("Please enter your username.");

        txtUsername.focus();

        return;
    }

    if (strPassword === "")
    {
        alert("Please enter your password.");

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
        StorageService.saveValue(AppConfig.STORAGE_KEYS.POST_REDIRECT_TOAST, "Login Successful!");

        goDashboard();
    },
    function (objError)
    {
        hideLoader();

        console.log(objError);

        CommonUtils.showAlert((objError && objError.message) || "Invalid Username or Password.");
    });
}