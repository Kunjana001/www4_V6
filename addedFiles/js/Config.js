/* ==========================================================
   Student Management System
   Config.js

   Purpose:
   Stores all application configuration in one place.

   ----------------------------------------------------------
   PROJECT IMPROVEMENTS (Theme/Font Size + Settings task)
   ----------------------------------------------------------
   ✓ Added STORAGE_KEYS.FONT_SIZE - a new LocalStorage key so
     theme.js can remember whether the user picked Small,
     Medium, or Large text, the same way STORAGE_KEYS.THEME
     already remembers the color theme. No existing key was
     renamed or removed.
   ✓ Added STORAGE_KEYS.REMEMBERED_USERNAME for the Login page's
     "Remember Me" checkbox (see login.js), so the saved
     username lives in the same one place every other saved
     value already lives.

   Version: 1.2
   ========================================================== */

"use strict";

/* ==========================================================
   Application Configuration
   ========================================================== */

const AppConfig = {

    /* ======================================================
       Application Details
       ====================================================== */

    /* --------------------------------------------------
       Set here for now - change this one value any time
       and every page that reads AppConfig.APP_NAME /
       SettingsManager.getApplicationName() picks it up
       automatically (Phase 3). A custom name saved on the
       Settings page still overrides this, same as before.
       -------------------------------------------------- */

    APP_NAME: "Student Details",

    APP_VERSION: "1.0.0",

    APP_THEME_COLOR: "#123b8d",

    /* --------------------------------------------------
       Default Logo (relative to each page's own HTML
       file - same folder every page already loads images
       from). SettingsManager falls back to this if no
       custom Logo URL has been saved yet.
       -------------------------------------------------- */

    DEFAULT_LOGO_URL: "../images/logo.png",

    /* --------------------------------------------------
       Development Only

       When true, the Login page prefills the admin/admin
       credentials so testing doesn't require re-typing
       them every time. Set to false before shipping.
       -------------------------------------------------- */

    DEV_MODE: true,



    /* ======================================================
       UI Text

       All page titles / subtitles / headings live here
       instead of being hardcoded in the HTML, so the same
       wording only has to change in one place.
       ====================================================== */

    TEXT: {

        login: {
            title: "Login",
            subtitle: "Welcome to Student Management System"
        },

        signup: {
            title: "Sign Up",
            subtitle: "Create your Student Management System account"
        },

        dashboard: {
            title: "Dashboard",
            subtitle: "Welcome to Student Management System"
        },

        student: {
            title: "Student List"
        },

        category: {
            title: "Category List"
        },

        section: {
            title: "Section List"
        },

        result: {
            title: "Result List"
        }

    },



    /* ======================================================
       Roles & Menu Permissions (Phase 4)

       ROLES matches the "role" column of the Users sheet
       (see createAccount()/login() in Login.gs - new sign-ups
       default to STUDENT, admin accounts are set to ADMIN
       directly in the sheet).

       MENU_PERMISSIONS lists which sidebar menu ids each role
       is allowed to see. "dashboard", "profile", and "logout"
       are always shown to everyone and are not listed here.
       Add a role, or add/remove an id from a role's list, and
       the sidebar + dashboard cards follow automatically -
       nothing else needs to change.
       ====================================================== */

    ROLES: {

        ADMIN: "Admin",

        STUDENT: "Student"

    },

    MENU_PERMISSIONS: {

        Admin: ["student", "category", "section", "result"],

        Student: ["result"]

    },



    /* ======================================================
       Backend Modes
       ====================================================== */

    BACKEND_MODE: "GOOGLE",

    BACKEND: {

        GOOGLE: "GOOGLE",

        OFFLINE: "OFFLINE",

        SPRING: "SPRING"

    },



    /* ======================================================
       Google Apps Script
       ====================================================== */

    GOOGLE_SCRIPT_URL:

        "https://script.google.com/macros/s/AKfycbwlmLclX-fCV6Fyn8H9g9mu3n3M-gwzBqMDQYxFGaC8LAN5XwcLMG_5655dIHjjTapoew/exec",



 /* ======================================================
   API Configuration
====================================================== */

API: {

    DEFAULT_PAGE_SIZE: 10,

    REQUEST_TIMEOUT: 30000,

    SEARCH_DELAY: 300

},

    /* ======================================================
       Future Spring Boot URL
       ====================================================== */

    SPRING_BOOT_URL:

        "",



    /* ======================================================
       Local Database
       ====================================================== */

    DATABASE_NAME:

        "StudentManagementDB",

    DATABASE_VERSION:

        1,



    /* ======================================================
       Object Stores
       ====================================================== */

    STORES: {

        STUDENT: "Students",

        CATEGORY: "Categories",

        SECTION: "Sections",

        RESULT: "Results",

        USER: "Users",

        /* --------------------------------------------------
           Holds offline changes (add / update / delete) that
           are waiting to be pushed to the real backend once
           the device is back online.
           -------------------------------------------------- */

        SYNC_QUEUE: "SyncQueue"

    },


    /* ======================================================
   Network
====================================================== */

NETWORK: {

    ONLINE: "ONLINE",

    OFFLINE: "OFFLINE"

},


    /* ======================================================
       Offline Sync Settings

       Used by StorageService / DataService to control how
       often we retry sending queued changes to the backend.
       ====================================================== */

    SYNC_RETRY_INTERVAL_MS:

        30000,


/* ======================================================
   Cache Keys
====================================================== */

CACHE_KEYS: {

    STUDENTS: "cache_students",

    CATEGORIES: "cache_categories",

    SECTIONS: "cache_sections",

    RESULTS: "cache_results"

},




    /* ======================================================
       Session Keys
       ====================================================== */

    STORAGE_KEYS: {

        LOGIN:

            "loggedIn",

        USERNAME:

            "username",

        ROLE:

            "role",

        TOKEN:

            "token",

        BACKEND:

            "backend",

        LAST_SYNC:

            "lastSync",

        /* --------------------------------------------------
           Remembers whether the user chose Light Mode or
           Dark Mode, so theme.js can restore it on every
           page. See Task 6.
           -------------------------------------------------- */

        THEME:

            "theme",

        /* --------------------------------------------------
           Remembers whether the user chose Small / Medium /
           Large text, so theme.js can restore it on every
           page, the same way THEME is restored. Added for
           the Theme System Enhancement task (Font Size).
           -------------------------------------------------- */

        FONT_SIZE:

            "fontSize",

        /* --------------------------------------------------
           Remembers the username typed on the Login page when
           "Remember Me" is checked, so it can be prefilled on
           the next visit. Deliberately does NOT store the
           password - storing a plaintext password in
           LocalStorage would be readable by any script on the
           page, so only the username is remembered; the
           password field is always left blank to be re-typed.
           -------------------------------------------------- */

        REMEMBERED_USERNAME:

            "rememberedUsername",

        /* --------------------------------------------------
           User-configurable Settings (Phase 3): the Server
           URL, Application Name, and Logo URL the Settings
           page lets the user override. Read through
           SettingsManager (common/settings.js), which falls
           back to the AppConfig defaults above whenever one
           of these has not been saved yet.
           -------------------------------------------------- */

        SERVER_URL:

            "serverUrl",

        APP_NAME:

            "appName",

        LOGO_URL:

            "logoUrl",

        /* --------------------------------------------------
           Login / Logout history shown on the Profile page.
           See Task 5.
           -------------------------------------------------- */

        CURRENT_LOGIN_TIME:

            "currentLoginTime",

        PREVIOUS_LOGIN_TIME:

            "previousLoginTime",

        LAST_LOGOUT_TIME:

            "lastLogoutTime",

        /* --------------------------------------------------
           Small list of the most recent add / edit / delete
           actions, shown on the Dashboard "Recent Activity"
           card.
           -------------------------------------------------- */

        RECENT_ACTIVITY:

            "recentActivity",

        /* --------------------------------------------------
           Counts how many times each sidebar section has been
           opened, so the Dashboard "Frequently Used" shortcut
           can surface whichever ones the user actually visits
           most. See Phase 4.
           -------------------------------------------------- */

        FREQUENTLY_USED:

            "frequentlyUsedCounts"

    },
  /* ======================================================
   Network
  ====================================================== */

  NETWORK: {

     ONLINE: "ONLINE",

     OFFLINE: "OFFLINE"

}
};