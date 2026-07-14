/* ==========================================================
   Student Management System
   theme.js

   Purpose:

   One single, shared place that knows how to switch the whole
   application between Light Mode and Dark Mode. Every page
   includes this file so the theme logic never has to be
   written more than once.

   How it works:

   • The chosen theme ("light" or "dark") is stored in
     LocalStorage under AppConfig.STORAGE_KEYS.THEME.
   • The theme is applied by setting a "data-theme" attribute
     on the <html> element, e.g. <html data-theme="dark">.
   • common.css reads that attribute and swaps the CSS
     Variables (colors) used across every page.
   • This file runs on every page load so the last chosen
     theme is automatically restored, as required by Task 6.

   Version: 1.0
   ========================================================== */

"use strict";

/* ==========================================================
   Theme Manager
   ========================================================== */

var ThemeManager = (function ()
{

    /* ======================================================
       Constant Values

       These are the only two theme names the application
       understands. Keeping them in one place avoids typos
       like "drak" spread across several files.
       ====================================================== */

    var THEME_LIGHT = "light";

    var THEME_DARK = "dark";

    var THEME_BLUE = "blue";

    var THEME_GREEN = "green";

    var THEME_PURPLE = "purple";

    var THEME_ORANGE = "orange";

    /* All theme names in one place, in the order they should be
       offered on the Settings page. common.css has a matching
       html[data-theme="..."] block for every one of these. */

    var ALL_THEMES = [
        { id: THEME_LIGHT,  label: "Light",  swatch: "#123b8d" },
        { id: THEME_DARK,   label: "Dark",   swatch: "#171a22" },
        { id: THEME_BLUE,   label: "Blue",   swatch: "#1565c0" },
        { id: THEME_GREEN,  label: "Green",  swatch: "#2e7d32" },
        { id: THEME_PURPLE, label: "Purple", swatch: "#6a1b9a" },
        { id: THEME_ORANGE, label: "Orange", swatch: "#ef6c00" }
    ];



    /* ======================================================
       Public Object
       ====================================================== */

    return {

        THEME_LIGHT:

            THEME_LIGHT,

        THEME_DARK:

            THEME_DARK,

        THEME_BLUE:

            THEME_BLUE,

        THEME_GREEN:

            THEME_GREEN,

        THEME_PURPLE:

            THEME_PURPLE,

        THEME_ORANGE:

            THEME_ORANGE,

        ALL_THEMES:

            ALL_THEMES,

        getCurrentTheme:

            getCurrentTheme,

        applyTheme:

            applyTheme,

        restoreSavedTheme:

            restoreSavedTheme,

        toggleTheme:

            toggleTheme

    };



    /* ======================================================
       Get the Currently Saved Theme

       Returns one of the theme name constants above. If
       nothing has been saved yet, or the saved value isn't a
       theme this version of the app knows about, Light Mode is
       used as the default so the very first visit looks exactly
       like the application did before theming existed.
       ====================================================== */

    function getCurrentTheme()
    {
        var strSavedTheme = StorageService.getValue(AppConfig.STORAGE_KEYS.THEME);

        var bIsKnownTheme = ALL_THEMES.some(function (objTheme)
        {
            return objTheme.id === strSavedTheme;
        });

        if (bIsKnownTheme === true)
        {
            return strSavedTheme;
        }

        return THEME_LIGHT;
    }



    /* ======================================================
       Apply a Theme to the Page

       strTheme : either THEME_LIGHT or THEME_DARK

       Sets the "data-theme" attribute on <html> so common.css
       can switch its CSS Variables, and saves the choice to
       LocalStorage so it is remembered next time.
       ====================================================== */

    function applyTheme(strTheme)
    {
        document.documentElement.setAttribute("data-theme", strTheme);

        StorageService.saveValue(AppConfig.STORAGE_KEYS.THEME, strTheme);
    }



    /* ======================================================
       Restore the Last Saved Theme

       Call this as soon as a page loads so the correct theme
       is showing before the user notices anything different.
       ====================================================== */

    function restoreSavedTheme()
    {
        var strSavedTheme = getCurrentTheme();

        document.documentElement.setAttribute("data-theme", strSavedTheme);
    }



    /* ======================================================
       Toggle Between Light and Dark

       Used by the switch on the Settings page. Returns the
       new theme name so the caller can update its own UI
       (for example, moving the switch handle) if needed.
       ====================================================== */

    function toggleTheme()
    {
        var strNewTheme;

        if (getCurrentTheme() === THEME_LIGHT)
        {
            strNewTheme = THEME_DARK;
        }
        else
        {
            strNewTheme = THEME_LIGHT;
        }

        applyTheme(strNewTheme);

        return strNewTheme;
    }

})();



/* ==========================================================
   Restore the Theme Immediately

   This runs the moment theme.js loads on any page, so the
   saved theme is applied automatically everywhere, as
   required by Task 6 and Task 7.
   ========================================================== */

ThemeManager.restoreSavedTheme();
