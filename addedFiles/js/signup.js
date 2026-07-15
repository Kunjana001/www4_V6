/* ==========================================================
   Student Management System
   Sign Up JavaScript

   ----------------------------------------------------------
   PASS 3 (added)
   ----------------------------------------------------------
   createAccount() now calls the real
   DataService.createAccount() backend call instead of showing
   a fake success message and doing nothing. Duplicate
   usernames and offline/network failures now show a real
   error instead of a fake success. Everything else in this
   file (element lookups, show/hide password, event wiring)
   is unchanged.
   ========================================================== */


/* ==========================================================
   Get HTML Elements
   ========================================================== */

var txtUsername = document.getElementById("username");
var txtPassword = document.getElementById("password");
var txtConfirmPassword = document.getElementById("confirmPassword");

var btnCreateAccount = document.getElementById("createAccountBtn");
var btnBackToLogin = document.getElementById("backToLoginBtn");

var btnEye = document.getElementById("togglePassword");
var btnConfirmEye = document.getElementById("toggleConfirmPassword");

var lblSignupTitle = document.getElementById("signupTitle");
var lblSignupSubtitle = document.getElementById("signupSubtitle");

var imgSignupLogo = document.getElementById("signupLogo");


/* ==========================================================
   Page Text, Application Name, and Logo

   Same approach as login.js: comes from SettingsManager
   (which falls back to AppConfig.APP_NAME) instead of being
   hardcoded, so a name/logo change takes effect here too.
   ========================================================== */

document.title = SettingsManager.getApplicationName() + " - Sign Up";

imgSignupLogo.src = SettingsManager.getLogoUrl(AppConfig.DEFAULT_LOGO_URL);
imgSignupLogo.alt = SettingsManager.getApplicationName() + " Logo";

lblSignupTitle.textContent = AppConfig.TEXT.signup.title;
lblSignupSubtitle.textContent = "Create your " + SettingsManager.getApplicationName() + " account";


/* ==========================================================
   Register Events
   ========================================================== */

btnEye.onclick = togglePassword;

btnConfirmEye.onclick = toggleConfirmPassword;

btnCreateAccount.onclick = createAccount;

btnBackToLogin.onclick = goLogin;


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
   Show / Hide Confirm Password
   ========================================================== */

function toggleConfirmPassword()
{
    if (txtConfirmPassword.type === "password")
    {
        txtConfirmPassword.type = "text";

        btnConfirmEye.classList.remove("fa-eye");
        btnConfirmEye.classList.add("fa-eye-slash");
    }
    else
    {
        txtConfirmPassword.type = "password";

        btnConfirmEye.classList.remove("fa-eye-slash");
        btnConfirmEye.classList.add("fa-eye");
    }
}


/* ==========================================================
   Create Account
   ========================================================== */

function createAccount()
{
    var strUsername = txtUsername.value.trim();

    var strPassword = txtPassword.value.trim();

    var strConfirmPassword = txtConfirmPassword.value.trim();


    /* ---------- Validation ---------- */

    if (strUsername === "")
    {
        CommonUtils.showAlert("Please choose a username.");

        txtUsername.focus();

        return;
    }

    if (strPassword === "")
    {
        CommonUtils.showAlert("Please choose a password.");

        txtPassword.focus();

        return;
    }

    if (strConfirmPassword === "")
    {
        CommonUtils.showAlert("Please confirm your password.");

        txtConfirmPassword.focus();

        return;
    }

    if (strPassword !== strConfirmPassword)
    {
        CommonUtils.showAlert("Passwords do not match.");

        txtConfirmPassword.focus();

        return;
    }


    /* --------------------------------------------------
       CONNECTION FIX - WHY / WHAT / WHEN

       WHY: this used to show "Account created!" and go
       straight to the login page without ever saving the
       username/password anywhere - so the account the user
       just "created" could never actually log in.
       WHAT: asks DataService to create the account against
       the real Google Apps Script backend (same backend
       login.js already talks to), and only shows success /
       goes to Login if the backend confirms the user was
       saved. A duplicate username is reported by the backend
       and shown as an error instead of a fake success.
       WHEN: runs when the user taps "Create Account".
       -------------------------------------------------- */

    btnCreateAccount.disabled = true;

    showLoader("Creating account...");

    DataService.createAccount(strUsername, strPassword, function (objUser)
    {
        hideLoader();

        btnCreateAccount.disabled = false;

        CommonUtils.showAlert("Account created! Please log in.", "success");

        goLogin();
    },
    function (objError)
    {
        hideLoader();

        btnCreateAccount.disabled = false;

        console.log(objError);

        CommonUtils.showAlert((objError && objError.message) || "Could not create account.");
    });
}