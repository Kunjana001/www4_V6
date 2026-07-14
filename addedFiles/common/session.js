/* ==========================================================
   Student Management System
   session.js

   Purpose:

   Keeps track of whether someone is logged in, and as who.
   Every page must use Session.login() / Session.logout() /
   Session.isLoggedIn() instead of reading or writing
   localStorage directly. Under the hood this still uses
   StorageService, so if the storage mechanism ever changes,
   this is the only file that needs to know about it.

   Version: 1.0
   ========================================================== */

"use strict";

/* ==========================================================
   Guard Against the Browser's Back/Forward Cache (bfcache)

   ROUND 2 - Improvement #3 (Login -> Settings -> Back bug)

   Some browsers restore a page from bfcache on Back/Forward
   navigation WITHOUT re-running its scripts, which would let
   someone log out (or never log in), press the phone/browser
   Back button, and see a stale Dashboard/Profile/Settings
   screen that never re-checked Session.requireLogin(). The
   "persisted" flag on the pageshow event is exactly how a
   bfcache restore is detected, so we force a real reload in
   that case - the reload re-runs this page's normal
   requireLogin() check and sends an unauthenticated user
   straight to Login, closing the bypass.
   ========================================================== */

window.addEventListener("pageshow", function (objEvent)
{
    if (objEvent.persisted === true)
    {
        window.location.reload();
    }
});



/* ==========================================================
   Session
   ========================================================== */

var Session = (function ()
{

    /* ======================================================
       Public Object
       ====================================================== */

    return {

        login:

            login,

        logout:

            logout,

        isLoggedIn:

            isLoggedIn,

        getUsername:

            getUsername,

        getRole:

            getRole,

        requireLogin:

            requireLogin,

        getCurrentLoginTime:

            getCurrentLoginTime,

        getPreviousLoginTime:

            getPreviousLoginTime,

        getLastLogoutTime:

            getLastLogoutTime

    };



    /* ======================================================
       Log the User In

       strUsername : the name the user typed on the login page

       NOTE: Actual credential checking currently happens in
       login.js. This function only remembers that the login
       succeeded. Later this can be swapped for a real Google
       Apps Script authentication call without any other page
       needing to change, because they all just call
       Session.login() the same way.
       ====================================================== */

    function login(strUsername, strRole)
    {
        StorageService.saveSession(strUsername, strRole);

        recordLoginTimestamp();
    }



    /* ======================================================
       Record the Login Timestamp

       Whatever time was previously stored as the "Current
       Login Time" becomes the new "Previous Login Time",
       and then "Current Login Time" is set to right now.
       This is what lets the Profile page show both the
       Current Login and the Last Login. See Task 5.
       ====================================================== */

    function recordLoginTimestamp()
    {
        var strOldCurrentLoginTime = StorageService.getValue(AppConfig.STORAGE_KEYS.CURRENT_LOGIN_TIME);

        if (strOldCurrentLoginTime !== null)
        {
            StorageService.saveValue(AppConfig.STORAGE_KEYS.PREVIOUS_LOGIN_TIME, strOldCurrentLoginTime);
        }

        StorageService.saveValue(AppConfig.STORAGE_KEYS.CURRENT_LOGIN_TIME, CommonUtils.getCurrentTimestamp());
    }



    /* ======================================================
       Log the User Out

       Clears the saved session and sends the user back to
       the login page.
       ====================================================== */

    function logout()
    {
        StorageService.saveValue(AppConfig.STORAGE_KEYS.LAST_LOGOUT_TIME, CommonUtils.getCurrentTimestamp());

        StorageService.clearSession();

        goLogin();
    }



    /* ======================================================
       Check Whether Someone Is Currently Logged In

       Returns true or false.
       ====================================================== */

    function isLoggedIn()
    {
        return StorageService.getValue(AppConfig.STORAGE_KEYS.LOGIN) === true;
    }



    /* ======================================================
       Get the Logged-In Username

       Returns the username, or null if nobody is logged in.
       ====================================================== */

    function getUsername()
    {
        return StorageService.getValue(AppConfig.STORAGE_KEYS.USERNAME);
    }



    /* ======================================================
       Get the Logged-In User's Role

       Returns the role saved at login (e.g. "Admin" or
       "Student"), or null if nobody is logged in / no role
       was saved. See Phase 4 - role-based sidebar menu.
       ====================================================== */

    function getRole()
    {
        return StorageService.getValue(AppConfig.STORAGE_KEYS.ROLE);
    }



    /* ======================================================
       Require Login

       Call this at the top of any protected page. If nobody
       is logged in, it redirects to the login page and
       returns false so the calling page can stop running its
       own setup code.
       ====================================================== */

    function requireLogin()
    {
        if (isLoggedIn() === false)
        {
            goLogin();

            return false;
        }

        return true;
    }



    /* ======================================================
       Get the Current Login Time

       Returns an ISO date/time string for when the user most
       recently logged in, or null if it has never been
       recorded.
       ====================================================== */

    function getCurrentLoginTime()
    {
        return StorageService.getValue(AppConfig.STORAGE_KEYS.CURRENT_LOGIN_TIME);
    }



    /* ======================================================
       Get the Previous Login Time

       Returns an ISO date/time string for the login before
       the current one, or null if there is not one yet.
       ====================================================== */

    function getPreviousLoginTime()
    {
        return StorageService.getValue(AppConfig.STORAGE_KEYS.PREVIOUS_LOGIN_TIME);
    }



    /* ======================================================
       Get the Last Logout Time

       Returns an ISO date/time string for the most recent
       sign out, or null if the user has never signed out.
       ====================================================== */

    function getLastLogoutTime()
    {
        return StorageService.getValue(AppConfig.STORAGE_KEYS.LAST_LOGOUT_TIME);
    }

})();
