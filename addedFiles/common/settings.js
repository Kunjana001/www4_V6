/* ==========================================================
   Student Management System
   settings.js

   Purpose:

   One single, shared place that knows how to read and save
   the user-configurable application settings: Server URL,
   Application Name, and Logo URL (Phase 3). Every page that
   needs one of these values (Login, Settings, and later
   Dashboard/etc.) includes this file so the logic never has
   to be written more than once - same approach as
   ThemeManager in theme.js.

   How it works:

   • Each setting is stored in LocalStorage under its own key
     in AppConfig.STORAGE_KEYS (SERVER_URL / APP_NAME /
     LOGO_URL), via StorageService.
   • Nothing is saved until the user actually changes a value
     on the Settings page, so a fresh install has no keys set
     at all.
   • Every getter below falls back to the matching AppConfig
     default whenever no value has been saved yet, so the app
     looks and behaves exactly as before until someone opens
     Settings and changes something.

   Version: 1.0
   ========================================================== */

"use strict";

/* ==========================================================
   Settings Manager
   ========================================================== */

var SettingsManager = (function ()
{

    /* ======================================================
       Public Object
       ====================================================== */

    return {

        getServerUrl:

            getServerUrl,

        getApplicationName:

            getApplicationName,

        getLogoUrl:

            getLogoUrl,

        saveSettings:

            saveSettings

    };



    /* ======================================================
       Get Server URL

       Falls back to AppConfig.GOOGLE_SCRIPT_URL (the built-in
       backend address) if nothing has been saved yet.
       ====================================================== */

    function getServerUrl()
    {
        var strSavedUrl = StorageService.getValue(AppConfig.STORAGE_KEYS.SERVER_URL);

        if (strSavedUrl)
        {
            return strSavedUrl;
        }

        return AppConfig.GOOGLE_SCRIPT_URL;
    }



    /* ======================================================
       Get Application Name

       Falls back to AppConfig.APP_NAME if nothing has been
       saved yet.
       ====================================================== */

    function getApplicationName()
    {
        var strSavedName = StorageService.getValue(AppConfig.STORAGE_KEYS.APP_NAME);

        if (strSavedName)
        {
            return strSavedName;
        }

        return AppConfig.APP_NAME;
    }



    /* ======================================================
       Get Logo URL

       strDefaultLogoUrl : the caller's own default, written
                           relative to THAT page's own folder
                           (every page sits at a different
                           depth from addedFiles/images/, so
                           the default has to come from the
                           caller - see AppConfig.DEFAULT_LOGO_URL
                           for the value every current page
                           should pass in).

       Falls back to strDefaultLogoUrl if nothing has been
       saved yet.
       ====================================================== */

    function getLogoUrl(strDefaultLogoUrl)
    {
        var strSavedLogoUrl = StorageService.getValue(AppConfig.STORAGE_KEYS.LOGO_URL);

        if (strSavedLogoUrl)
        {
            return strSavedLogoUrl;
        }

        return strDefaultLogoUrl;
    }



    /* ======================================================
       Save Settings

       objSettings : { strServerUrl, strApplicationName,
                       strLogoUrl } - any of the three may be
                       omitted/blank, in which case that one
                       setting is left untouched.
       ====================================================== */

    function saveSettings(objSettings)
    {
        if (objSettings.strServerUrl)
        {
            StorageService.saveValue(AppConfig.STORAGE_KEYS.SERVER_URL, objSettings.strServerUrl);
        }

        if (objSettings.strApplicationName)
        {
            StorageService.saveValue(AppConfig.STORAGE_KEYS.APP_NAME, objSettings.strApplicationName);
        }

        if (objSettings.strLogoUrl)
        {
            StorageService.saveValue(AppConfig.STORAGE_KEYS.LOGO_URL, objSettings.strLogoUrl);
        }
    }

})();
