/* ==========================================================
   Student Management System
   service-worker.js

   ----------------------------------------------------------
   PROJECT IMPROVEMENTS (this pass)
   ----------------------------------------------------------

   1. FILES_TO_CACHE used to list every page as a
      DOMAIN-ROOT-ABSOLUTE path ("/html/index.html",
      "/dashboard.css", etc). A leading "/" is always resolved
      by the browser against the DOMAIN root, not the project
      folder - so on a GitHub Pages *project* site such as
      https://kunjana001.github.io/www4_V6/, those paths were
      actually asking the browser to fetch
      https://kunjana001.github.io/html/index.html and
      https://kunjana001.github.io/dashboard.css, which do not
      exist at the domain root at all (the real files are under
      .../www4_V6/...). WHY this matters: cache.addAll() fails
      ATOMICALLY - if even one of those fetches 404s, the whole
      "install" step rejects, which means this service worker
      has been silently failing to install/activate on GitHub
      Pages, and every one of its caching/offline benefits was
      never actually available. WHAT changed: every entry below
      is now built with resolveProjectUrl(), which resolves the
      path relative to THIS SCRIPT'S OWN address (self.location)
      the same way navigation.js/register-sw.js already resolve
      page links - so it always lands inside the real project
      folder, on GitHub Pages, on a plain local server, or
      anywhere else this project is deployed, with no folder
      renamed and no file moved.
   2. install() used a single cache.addAll(), so one bad/blocked
      URL still fails every other file's caching too. Switched to
      caching each file with its own cache.add().catch(), so one
      missing/blocked file (e.g. a very old browser cache, or a
      network hiccup) only logs a warning instead of preventing
      every other page/asset from being cached.
   3. CACHE_NAME bumped v2 -> v3. WHY: the existing "activate"
      handler below already deletes any cache whose name is not
      the current CACHE_NAME - bumping the version is what makes
      that cleanup actually run once, so any cache entries stored
      under the old (broken) absolute paths cannot linger and
      accidentally get matched by caches.match() later.

   ----------------------------------------------------------
   PROJECT IMPROVEMENTS (Phase 7 - Offline Support pass)
   ----------------------------------------------------------
   4. FILES_TO_CACHE only listed 9 files - most of the app
      (common.js, DataService.js, every list page's own script,
      settings/profile/signup/forgotpassword pages, the app's
      own CSS/manifest/icons) was never precached, so opening
      those while offline only worked if the browser's regular
      HTTP cache happened to still have them. Expanded the list
      to every first-party HTML page, CSS file, and JS file the
      app actually loads (confirmed via each page's own <script>/
      <link> tags), plus manifest.json and the app icons. Same
      resolveProjectUrl()/per-file cache.add().catch() pattern as
      before - nothing else about how caching works changed.
   5. CACHE_NAME bumped v3 -> v4 so this larger file list is
      actually precached on next load, same reasoning as the v2
      -> v3 bump above.

   No page/file was renamed or moved. The install/fetch/activate
   event flow and the same-origin-only fetch-handling logic
   (added previously) are unchanged below.

   Version: 4.0
   ========================================================== */

const CACHE_NAME = "student-management-v4";

/* ==========================================================
   Resolve a Cache Entry to Its Real Project-Relative Address

   WHY: see improvement #1 above - a bare "/xxx" path is always
   domain-root-absolute, which breaks on any site that is not
   deployed at the domain root (every GitHub Pages *project*
   site, e.g. username.github.io/repo-name/). This service
   worker file itself always lives at
   <project-root>/addedFiles/js/service-worker.js no matter
   where <project-root> is hosted, so resolving every cache
   path against self.location (this file's own, real address)
   - instead of against the domain root - always lands on the
   correct file.

   strRelativePath : written relative to THIS file's own folder
                     (addedFiles/js/) - for example
                     "../../html/index.html" for a page that
                     lives in the top-level html/ folder, two
                     levels up.
   ========================================================== */

function resolveProjectUrl(strRelativePath)
{
    return new URL(strRelativePath, self.location.href).href;
}

const FILES_TO_CACHE = [

    /* ---- HTML pages ---- */

    resolveProjectUrl("../../index.html"),

    resolveProjectUrl("../html/index.html"),

    resolveProjectUrl("../html/dashboard.html"),

    resolveProjectUrl("../html/forgotpassword.html"),

    resolveProjectUrl("../html/profile.html"),

    resolveProjectUrl("../html/settings.html"),

    resolveProjectUrl("../html/signup.html"),

    resolveProjectUrl("../../html/studentList.html"),

    resolveProjectUrl("../../html/categoryList.html"),

    resolveProjectUrl("../../html/sectionList.html"),

    resolveProjectUrl("../../html/resultList.html"),

    /* ---- CSS ---- */

    resolveProjectUrl("../common/common.css"),

    resolveProjectUrl("../dashboard.css"),

    resolveProjectUrl("../login.css"),

    resolveProjectUrl("../profile.css"),

    resolveProjectUrl("../settings.css"),

    /* ---- Shared / common JS (loaded by every page) ---- */

    resolveProjectUrl("../common/common.js"),

    resolveProjectUrl("../common/theme.js"),

    resolveProjectUrl("../common/settings.js"),

    resolveProjectUrl("../common/activity.js"),

    resolveProjectUrl("../common/navigation.js"),

    resolveProjectUrl("../common/session.js"),

    resolveProjectUrl("../common/register-sw.js"),

    /* ---- Core app JS ---- */

    resolveProjectUrl("../Config.js"),

    resolveProjectUrl("../StorageService.js"),

    resolveProjectUrl("../DataService.js"),

    resolveProjectUrl("../LegacyCompatShim.js"),

    resolveProjectUrl("../Dashboard.script.js"),

    resolveProjectUrl("../dashboard.js"),

    resolveProjectUrl("../login.js"),

    resolveProjectUrl("../signup.js"),

    resolveProjectUrl("../Profile.script.js"),

    resolveProjectUrl("../Settings.script.js"),

    resolveProjectUrl("../UserManagement.script.js"),

    /* ---- List-page application JS (Student/Category/Section/Result) ---- */

    resolveProjectUrl("../../js/application/Student.script.js"),

    resolveProjectUrl("../../js/application/StudentHTML.script.js"),

    resolveProjectUrl("../../js/application/Category.script.js"),

    resolveProjectUrl("../../js/application/CategoryHTML.script.js"),

    resolveProjectUrl("../../js/application/Section.script.js"),

    resolveProjectUrl("../../js/application/SectionHTML.script.js"),

    resolveProjectUrl("../../js/application/Result.script.js"),

    resolveProjectUrl("../../js/application/ResultHTML.script.js"),

    /* ---- Manifest + icons ---- */

    resolveProjectUrl("../manifest.json"),

    resolveProjectUrl("../images/icon-192.png"),

    resolveProjectUrl("../images/icon-512.png"),

    resolveProjectUrl("../images/logo.png")

];

self.addEventListener("install", function(event){

    self.skipWaiting();

    /* --------------------------------------------------
       WHAT: cache each file individually instead of one
       cache.addAll(FILES_TO_CACHE) call.
       WHY: addAll() rejects the ENTIRE install the moment
       any single URL fails to fetch. Caching files one at a
       time, each with its own .catch(), means a single
       missing/blocked file only skips itself (logged as a
       warning) instead of preventing every other file - and
       this page - from being cached at all.
       WHEN: runs once, every time this service worker file
       changes and the browser installs the new version.
       -------------------------------------------------- */

    event.waitUntil(

        caches.open(CACHE_NAME).then(function(cache){

            return Promise.all(

                FILES_TO_CACHE.map(function(strFileUrl){

                    return cache.add(strFileUrl).catch(function(objError){

                        console.warn("[service-worker.js] Skipped caching (not fatal):", strFileUrl, objError);

                    });

                })

            );

        })

    );

});

/* ==========================================================
   CONNECTION FIX: this fetch handler used to run
   caches.match(event.request) for EVERY request the page
   made, including cross-origin calls to
   script.google.com/macros/.../exec. That is what made a
   stale/old version of this worker (or a stale cache entry
   under an old CACHE_NAME) able to silently serve a cached
   "Invalid API Action" response for a live Google Apps
   Script call, with zero entries ever showing up in the
   Network tab - the request never reached the network at
   all once a bad response was cached.

   FIX: only intercept same-origin GET requests (the app's
   own HTML/CSS/JS). Anything cross-origin - which, in this
   project, means every DataService call to
   AppConfig.GOOGLE_SCRIPT_URL - is left completely alone and
   goes straight to fetch(), bypassing the cache entirely, so
   the backend response you actually get is always the real,
   current one.
   ========================================================== */

self.addEventListener("fetch", function(event){

    var requestUrl = new URL(event.request.url);

    if (requestUrl.origin !== self.location.origin || event.request.method !== "GET")
    {
        return;
    }

    event.respondWith(

        caches.match(event.request).then(function(response){

            return response || fetch(event.request);

        })

    );

});

/* ==========================================================
   CONNECTION FIX: there was no "activate" handler, so every
   time CACHE_NAME changed (as it just did, v1 -> v2), the old
   cache stayed in Cache Storage forever instead of being
   deleted - meaning any previously-cached bad response could
   keep being matched by an old, still-registered worker
   indefinitely. This deletes every cache that isn't the
   current CACHE_NAME as soon as the new worker activates, and
   claim() makes it take over open tabs immediately instead of
   waiting for every tab to be closed and reopened.
   ========================================================== */

self.addEventListener("activate", function(event){

    event.waitUntil(

        caches.keys().then(function(cacheNames){

            return Promise.all(
                cacheNames
                    .filter(function(name){ return name !== CACHE_NAME; })
                    .map(function(name){ return caches.delete(name); })
            );

        }).then(function(){

            return self.clients.claim();

        })

    );

});