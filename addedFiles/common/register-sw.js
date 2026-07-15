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

   ----------------------------------------------------------
   PROJECT IMPROVEMENTS (this pass)
   ----------------------------------------------------------
   ✓ Added a one-time automatic recovery for visitors stuck on
     an OLD, already-installed service worker from before the
     path-resolution fixes in service-worker.js (the symptom:
     a page loads with no CSS at all, or shows a completely
     different cached page's content, because the old worker
     is serving broken/mismatched cached responses and never
     gets replaced just by deploying new files - an already-
     registered service worker only updates itself on its own
     schedule, not the moment new code ships).
     recoverFromStaleServiceWorker() runs before the normal
     registration below: if this browser already has a
     service worker registered AND has not already run this
     one-time recovery, it unregisters every existing worker,
     clears every Cache Storage entry, marks the recovery as
     done (so it never loops), and reloads the page ONCE. A
     browser with no existing registration (a first-time
     visitor, or one that already recovered) skips straight
     to the normal registration flow further down, unchanged.

   Version: 2.0
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
   Recovery Flag Storage Key

   WHY: kept local to this file (not added to
   AppConfig.STORAGE_KEYS) since it is a one-time internal
   flag for this recovery mechanism only, not an app setting
   any other file needs to read.
   ========================================================== */

var STORAGE_KEY_SW_RECOVERY_DONE = "swStaleRecoveryDone";



/* ==========================================================
   Register the Service Worker Once the Page Has Loaded
   ========================================================== */

if ("serviceWorker" in navigator)
{
    window.addEventListener("load", handlePageLoadedForServiceWorker);
}



/* ==========================================================
   Handle Page Loaded - Recover, Then Register

   WHAT: first checks for a stale existing service worker
   registration and clears it out if found (see
   recoverFromStaleServiceWorker() below). If a recovery
   reload was triggered, this function stops here - the page
   is about to reload, so registering a new worker right now
   would be pointless. Otherwise it falls through to the
   normal registration, unchanged from before.
   WHEN: runs once per page load, after the "load" event.
   ========================================================== */

function handlePageLoadedForServiceWorker()
{
    recoverFromStaleServiceWorker(function (bDidTriggerReload)
    {
        if (bDidTriggerReload === true)
        {
            return;
        }

        registerServiceWorkerNormally();
    });
}



/* ==========================================================
   Recover From a Stale Service Worker

   WHY: see the PROJECT IMPROVEMENTS note at the top of this
   file - an old, already-registered service worker does not
   replace itself just because new files were deployed, so a
   returning visitor can stay stuck on broken cached pages
   indefinitely.

   WHAT it does: if this browser already has one or more
   service worker registrations AND the one-time recovery
   flag has not been set yet, this unregisters every one of
   them, deletes every Cache Storage entry, sets the flag
   (StorageService, so it survives the reload and never runs
   twice), and reloads the page once so the very next load
   registers the current service-worker.js fresh with an
   empty cache. If there is no existing registration (first
   visit, or already recovered), or the flag is already set,
   it does nothing and calls fnCallback(false) so normal
   registration proceeds immediately.

   WHEN it runs: once, from handlePageLoadedForServiceWorker()
   above, before every normal registration attempt.

   fnCallback(bDidTriggerReload) : called with true if a
   recovery reload was started (caller should stop, page is
   reloading), or false if it is safe to register normally.
   ========================================================== */

function recoverFromStaleServiceWorker(fnCallback)
{
    var bAlreadyRecovered = (StorageService.getValue(STORAGE_KEY_SW_RECOVERY_DONE) === "true");

    if (bAlreadyRecovered === true)
    {
        fnCallback(false);
        return;
    }

    navigator.serviceWorker.getRegistrations().then(function (arrRegistrations)
    {
        if (arrRegistrations.length === 0)
        {
            /* Nothing to recover from - mark done so this
               check is skipped on every future load too. */
            StorageService.saveValue(STORAGE_KEY_SW_RECOVERY_DONE, "true");

            fnCallback(false);

            return;
        }

        console.warn("[register-sw.js] Existing service worker found - clearing it and Cache Storage once to recover from any stale cached pages.");

        var pUnregisterAll = Promise.all(
            arrRegistrations.map(function (objRegistration)
            {
                return objRegistration.unregister();
            })
        );

        var pClearCaches = ("caches" in window)
            ? caches.keys().then(function (arrCacheNames)
              {
                  return Promise.all(
                      arrCacheNames.map(function (strCacheName)
                      {
                          return caches.delete(strCacheName);
                      })
                  );
              })
            : Promise.resolve();

        Promise.all([pUnregisterAll, pClearCaches]).then(function ()
        {
            StorageService.saveValue(STORAGE_KEY_SW_RECOVERY_DONE, "true");

            fnCallback(true);

            window.location.reload();

        }).catch(function (objError)
        {
            console.error("[register-sw.js] Stale service worker recovery failed:", objError);

            /* Still mark it done - retrying forever on a
               browser where unregister/caches keeps failing
               would just spam reloads with no way to succeed. */
            StorageService.saveValue(STORAGE_KEY_SW_RECOVERY_DONE, "true");

            fnCallback(false);
        });
    });
}



/* ==========================================================
   Register the Service Worker (Normal Path)

   This is the exact same registration logic that used to run
   directly inside handlePageLoadedForServiceWorker() - only
   moved into its own named function so recovery can run
   first, unchanged otherwise.
   ========================================================== */

function registerServiceWorkerNormally()
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
        })
        .catch(function (objError)
        {
            console.error("[register-sw.js] Service worker registration failed:", objError);
        });
}