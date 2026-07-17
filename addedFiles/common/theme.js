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

   ----------------------------------------------------------
   PROJECT IMPROVEMENTS (Theme System Enhancement task)
   ----------------------------------------------------------
   ✓ Added Font Size support (Small / Medium / Large), the
     other half of the Theme System Enhancement task - the
     6 color themes already existed. Font size is stored,
     applied, and restored exactly the way color themes are:
     a new FontSizeManager object below follows the same
     shape as ThemeManager (getCurrentFontSize / applyFontSize /
     restoreSavedFontSize), saved under the new
     AppConfig.STORAGE_KEYS.FONT_SIZE key added in Config.js.
     Nothing about ThemeManager itself was changed or removed.

   Version: 1.1
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

    /* Added for the Phase 1 Theme System pass (brief item 5) -
       black/white/yellow, the standard high-legibility palette
       for low-vision users. common.css's html[data-theme="contrast"]
       block also raises card/border contrast, not just the 3
       brand tokens the other themes swap. */

    var THEME_CONTRAST = "contrast";

    /* All theme names in one place, in the order they should be
       offered on the Settings page. common.css has a matching
       html[data-theme="..."] block for every one of these. */

    var ALL_THEMES = [
        { id: THEME_LIGHT,    label: "Light",          swatch: "#123b8d" },
        { id: THEME_DARK,     label: "Dark",           swatch: "#171a22" },
        { id: THEME_BLUE,     label: "Blue",           swatch: "#1565c0" },
        { id: THEME_GREEN,    label: "Green",          swatch: "#2e7d32" },
        { id: THEME_PURPLE,   label: "Purple",         swatch: "#6a1b9a" },
        { id: THEME_ORANGE,   label: "Orange",         swatch: "#ef6c00" },
        { id: THEME_CONTRAST, label: "High Contrast",  swatch: "#000000" }
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

        THEME_CONTRAST:

            THEME_CONTRAST,

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
   Font Size Manager

   WHY: the Theme System Enhancement task asks for Small /
   Medium / Large text sizes in addition to the color themes
   above. This mirrors ThemeManager's exact shape (same
   function names, same StorageService pattern) so anyone who
   already understands ThemeManager already understands this.

   WHAT it does: stores the chosen font size under
   AppConfig.STORAGE_KEYS.FONT_SIZE and applies it as a
   "data-font-size" attribute on <html>, the same way
   ThemeManager uses "data-theme". common.css reads that
   attribute to scale text up or down.

   WHEN it runs: restoreSavedFontSize() runs immediately below,
   the moment this file loads on any page - identical timing to
   ThemeManager.restoreSavedTheme().
   ========================================================== */

var FontSizeManager = (function ()
{

    var FONT_SMALL = "small";

    var FONT_MEDIUM = "medium";

    var FONT_LARGE = "large";

    /* All font sizes in the order they should be offered on
       the Settings page. common.css has a matching
       html[data-font-size="..."] block for each one. */

    var ALL_FONT_SIZES = [
        { id: FONT_SMALL,  label: "Small" },
        { id: FONT_MEDIUM, label: "Medium" },
        { id: FONT_LARGE,  label: "Large" }
    ];

    return {

        FONT_SMALL: FONT_SMALL,

        FONT_MEDIUM: FONT_MEDIUM,

        FONT_LARGE: FONT_LARGE,

        ALL_FONT_SIZES: ALL_FONT_SIZES,

        getCurrentFontSize: getCurrentFontSize,

        applyFontSize: applyFontSize,

        restoreSavedFontSize: restoreSavedFontSize

    };



    /* ======================================================
       Get the Currently Saved Font Size

       Same fallback rule as ThemeManager.getCurrentTheme():
       an unknown or missing value defaults to Medium, which
       matches the font sizing the app already shipped with,
       so a first-time visit looks unchanged.
       ====================================================== */

    function getCurrentFontSize()
    {
        var strSavedSize = StorageService.getValue(AppConfig.STORAGE_KEYS.FONT_SIZE);

        var bIsKnownSize = ALL_FONT_SIZES.some(function (objSize)
        {
            return objSize.id === strSavedSize;
        });

        if (bIsKnownSize === true)
        {
            return strSavedSize;
        }

        return FONT_MEDIUM;
    }



    /* ======================================================
       Apply a Font Size to the Page

       strSize : one of FONT_SMALL / FONT_MEDIUM / FONT_LARGE

       Sets "data-font-size" on <html> so common.css can scale
       text, and saves the choice the same way applyTheme()
       saves the color theme.
       ====================================================== */

    function applyFontSize(strSize)
    {
        document.documentElement.setAttribute("data-font-size", strSize);

        StorageService.saveValue(AppConfig.STORAGE_KEYS.FONT_SIZE, strSize);
    }



    /* ======================================================
       Restore the Last Saved Font Size

       Call this as soon as a page loads, right alongside
       ThemeManager.restoreSavedTheme(), so the correct text
       size is showing before the user notices anything change.
       ====================================================== */

    function restoreSavedFontSize()
    {
        var strSavedSize = getCurrentFontSize();

        document.documentElement.setAttribute("data-font-size", strSavedSize);
    }

})();



/* ==========================================================
   Font Family Manager

   WHY: Phase 1 brief item 4 - "Allow switching fonts from
   Settings" (Poppins / Inter / Nunito / Roboto). Mirrors
   FontSizeManager's exact shape (same function names, same
   StorageService pattern), which itself mirrors ThemeManager -
   so this is a third instance of the same well-understood
   pattern, not a new one.

   WHAT it does: stores the chosen font under
   AppConfig.STORAGE_KEYS.FONT_FAMILY and applies it as a
   "data-font-family" attribute on <html>. common.css reads
   that attribute to swap --app-font-family.
   ========================================================== */

var FontFamilyManager = (function ()
{

    var FONT_POPPINS = "poppins";

    var FONT_INTER = "inter";

    var FONT_NUNITO = "nunito";

    var FONT_ROBOTO = "roboto";

    /* All fonts in the order they should be offered on the
       Settings page. common.css has a matching
       html[data-font-family="..."] block for each one. */

    var ALL_FONT_FAMILIES = [
        { id: FONT_POPPINS, label: "Poppins" },
        { id: FONT_INTER,   label: "Inter" },
        { id: FONT_NUNITO,  label: "Nunito" },
        { id: FONT_ROBOTO,  label: "Roboto" }
    ];

    return {

        FONT_POPPINS: FONT_POPPINS,

        FONT_INTER: FONT_INTER,

        FONT_NUNITO: FONT_NUNITO,

        FONT_ROBOTO: FONT_ROBOTO,

        ALL_FONT_FAMILIES: ALL_FONT_FAMILIES,

        getCurrentFontFamily: getCurrentFontFamily,

        applyFontFamily: applyFontFamily,

        restoreSavedFontFamily: restoreSavedFontFamily

    };



    /* ======================================================
       Get the Currently Saved Font Family

       Same fallback rule as the other two managers: an
       unknown or missing value defaults to Poppins.
       ====================================================== */

    function getCurrentFontFamily()
    {
        var strSavedFont = StorageService.getValue(AppConfig.STORAGE_KEYS.FONT_FAMILY);

        var bIsKnownFont = ALL_FONT_FAMILIES.some(function (objFont)
        {
            return objFont.id === strSavedFont;
        });

        if (bIsKnownFont === true)
        {
            return strSavedFont;
        }

        return FONT_POPPINS;
    }



    /* ======================================================
       Apply a Font Family to the Page

       strFont : one of FONT_POPPINS / FONT_INTER / FONT_NUNITO
                 / FONT_ROBOTO

       Sets "data-font-family" on <html> so common.css can swap
       --app-font-family, and saves the choice the same way
       applyTheme()/applyFontSize() save their own values.
       ====================================================== */

    function applyFontFamily(strFont)
    {
        document.documentElement.setAttribute("data-font-family", strFont);

        StorageService.saveValue(AppConfig.STORAGE_KEYS.FONT_FAMILY, strFont);
    }



    /* ======================================================
       Restore the Last Saved Font Family

       Call this as soon as a page loads, right alongside
       ThemeManager.restoreSavedTheme() and
       FontSizeManager.restoreSavedFontSize().
       ====================================================== */

    function restoreSavedFontFamily()
    {
        var strSavedFont = getCurrentFontFamily();

        document.documentElement.setAttribute("data-font-family", strSavedFont);
    }

})();



/* ==========================================================
   Restore the Theme, Font Size and Font Family Immediately

   This runs the moment theme.js loads on any page, so the
   saved theme, font size and font family are applied
   automatically everywhere, as required by Task 6 and Task 7.
   ========================================================== */

ThemeManager.restoreSavedTheme();

FontSizeManager.restoreSavedFontSize();

FontFamilyManager.restoreSavedFontFamily();