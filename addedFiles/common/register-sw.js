/* ==========================================================
   Student Management System
   register-sw.js

   Purpose:

   Registers the service worker (service-worker.js) so the
   app can cache pages, work offline, and be installed. This
   is the ONLY file that calls
   navigator.serviceWorker.register(), so every page includes
   this one script instead of repeating the same inline
   registration code.

   Version: 1.0
   ========================================================== */

"use strict";

/* ==========================================================
   Remember This Script's Own Address Right Now

   WHY: document.currentScript is only valid while this file
   is first executing - by the time the "load" event fires
   later, it would already be null. Capturing it here, at the
   top level, and reusing the saved value inside
   handlePageLoadedForServiceWorker() below is what makes the
   path-resolution fix work.
   ========================================================== */

var strRegisterScriptUrl = document.currentScript ? document.currentScript.src : window.location.href;



/* ==========================================================
   Register the Service Worker Once the Page Has Loaded
   ========================================================== */

if ("serviceWorker" in navigator)
{
    window.addEventListener("load", handlePageLoadedForServiceWorker);
}



/* ==========================================================
   Handle Page Loaded - Register the Service Worker

   Waiting for the "load" event (rather than registering
   immediately) means the service worker does not compete
   with the page itself for network bandwidth while the page
   is still loading.
   ========================================================== */

function handlePageLoadedForServiceWorker()
{
    /* --------------------------------------------------
       CONNECTION FIX: register-sw.js is shared by pages
       that live at two different folder depths -
       www4/html/*.html AND www4/addedFiles/html/*.html -
       and service-worker.js itself lives at
       www4/addedFiles/js/service-worker.js. A single
       hardcoded relative path like "service-worker.js"
       only worked for one of those page groups and 404'd
       for the other. Building the URL from this script's
       OWN address (document.currentScript.src) instead
       fixes it for both, because register-sw.js and
       service-worker.js are always the same distance apart
       from each other, no matter which page loaded them.

       NOTE: because service-worker.js lives one folder
       below common/register-sw.js (in addedFiles/js/, not
       at the very top of the project), its default caching
       scope only covers addedFiles/js/ and whatever is
       under it. That is enough for the app to keep working
       online/offline, but if full-app offline caching for
       every page is needed later, service-worker.js would
       need to be moved to the project root instead - not
       done here, since moving files was explicitly out of
       scope for this fix.
       -------------------------------------------------- */

    var strServiceWorkerUrl = new URL(
        "../js/service-worker.js",
        strRegisterScriptUrl
    ).href;

    navigator.serviceWorker.register(strServiceWorkerUrl)
        .then(function (objRegistration)
        {
            console.log("Service worker registered with scope:", objRegistration.scope);
        })
        .catch(function (objError)
        {
            console.error("[register-sw.js] Service worker registration failed:", objError);
        });
}
