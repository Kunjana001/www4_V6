/* ==========================================================
   Student Management System
   activity.js

   Purpose:

   One single, shared place that knows how to record and read
   the Recent Activity log (Login, Logout, Student viewed,
   Student edited, Category/Section/Result opened, Export,
   Import). Every page that performs one of those actions
   includes this file and calls ActivityLog.logActivity() -
   same approach as SettingsManager/ThemeManager.

   How it works:

   • Stored as a plain array of already-formatted strings
     (e.g. "09:15 AM - Login") under
     AppConfig.STORAGE_KEYS.RECENT_ACTIVITY, via StorageService -
     no backend/Sheet involved, so this works the same whether
     the person is online or offline.
   • Newest entry goes at the FRONT of the array, and the list
     is capped at MAX_ENTRIES so this never grows forever.
   • The Recent Activity panel itself lives on the Profile page
     (Phase 2 - moved off the Dashboard) - see
     Profile.script.js's loadRecentActivity().

   Version: 1.0
   ========================================================== */

"use strict";

/* ==========================================================
   Activity Log
   ========================================================== */

var ActivityLog = (function ()
{

    var MAX_ENTRIES = 20;



    /* ======================================================
       Public Object
       ====================================================== */

    return {

        logActivity:

            logActivity,

        getActivity:

            getActivity

    };



    /* ======================================================
       Log Activity

       strMessage : plain description of what happened, e.g.
                    "Login", "Viewed Ram Sharma",
                    "Exported Students". A friendly timestamp
                    is added automatically - callers never need
                    to build one themselves.
       ====================================================== */

    function logActivity(strMessage)
    {
        var arrActivity = StorageService.getValue(AppConfig.STORAGE_KEYS.RECENT_ACTIVITY) || [];

        var strEntry = getFriendlyTime() + " - " + strMessage;

        arrActivity.unshift(strEntry);

        if (arrActivity.length > MAX_ENTRIES)
        {
            arrActivity = arrActivity.slice(0, MAX_ENTRIES);
        }

        StorageService.saveValue(AppConfig.STORAGE_KEYS.RECENT_ACTIVITY, arrActivity);
    }



    /* ======================================================
       Get Activity

       Returns the full stored list, newest first, or an empty
       array if nothing has been logged yet.
       ====================================================== */

    function getActivity()
    {
        return StorageService.getValue(AppConfig.STORAGE_KEYS.RECENT_ACTIVITY) || [];
    }



    /* ======================================================
       Get a Friendly Time, e.g. "09:15 AM"
       ====================================================== */

    function getFriendlyTime()
    {
        var objDate = new Date();

        var numHours24 = objDate.getHours();

        var strAmPm = (numHours24 >= 12) ? "PM" : "AM";

        var numHours12 = numHours24 % 12;

        if (numHours12 === 0)
        {
            numHours12 = 12;
        }

        var numMinutes = objDate.getMinutes();

        var strMinutes = (numMinutes < 10 ? "0" : "") + numMinutes;

        return numHours12 + ":" + strMinutes + " " + strAmPm;
    }

})();
