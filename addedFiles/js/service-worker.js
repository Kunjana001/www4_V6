const CACHE_NAME = "student-management-v2";

const FILES_TO_CACHE = [

    "/",

    "/html/index.html",

    "/html/dashboard.html",

    "/html/studentList.html",

    "/html/categoryList.html",

    "/html/sectionList.html",

    "/html/resultList.html",

    "/login.css",

    "/dashboard.css"

];

self.addEventListener("install", function(event){

    self.skipWaiting();

    event.waitUntil(

        caches.open(CACHE_NAME).then(function(cache){

            return cache.addAll(FILES_TO_CACHE);

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