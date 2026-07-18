/* ==========================================================
   Student Management System
   common.js

   Purpose:

   Small, shared helper functions used by every page. Nothing
   in here is specific to Students, Categories, Sections, or
   Results - it is just generally useful plumbing:

   • Checking whether the device is online or offline
   • Showing alerts / confirmations in one consistent way
   • Writing errors to the console in one consistent format
   • Watching for the device going online again and telling
     DataService to send any changes that were queued while
     offline (this is the "Background synchronization when
     internet returns" requirement)

   Version: 1.1

   ----------------------------------------------------------
   UI Modernization Pass 2 (added)
   ----------------------------------------------------------
   Added getEmptyStateHtml() - one shared "No records found"
   markup block, reused by Student/Category/Section/Result
   showFilteredList() so an empty search result shows a
   friendly message instead of blank space. No existing
   function changed, architecture unchanged.

   ----------------------------------------------------------
   PROJECT IMPROVEMENTS (this pass)
   ----------------------------------------------------------
   ✓ Added showLoader()/hideLoader() (moved here from
     LegacyCompatShim.js, which is not loaded on every page -
     see the functions themselves for the full WHY). Every
     page already loads common.js, so this fixes a real bug
     where signup.js's showLoader() call threw on signup.html
     (no LegacyCompatShim.js there), breaking every Sign Up
     attempt before it reached the backend.

   ----------------------------------------------------------
   PROJECT IMPROVEMENTS (UI Modernization pass, this pass)
   ----------------------------------------------------------
   ✓ showLoader()/hideLoader()/getOrCreateLoaderElement()
     rewritten for a modern loading indicator (circular gradient
     spinner, fade-in/out overlay, pulsing "Loading..." label,
     optional percentage bar) - see those functions' own updated
     comment for the full WHY/WHAT. Styling moved out of a
     JS-injected <style> tag and into common.css's "MODERN
     LOADING INDICATOR" section, where every other style already
     lives.
   ✓ Added CommonUtils.getSkeletonCardsHtml() - shimmering
     placeholder cards shown by each list page while its first
     page of data is in flight.
   ✓ Added CommonUtils.highlightMatch() - wraps search matches
     in <mark class="search-highlight">, used by each list
     page's searchList().
   ✓ Added CommonUtils.buildPaginationSummary() - builds the
     "Showing 101-200 of 1348" pagination summary text used by
     each list page's pagination bar.

   Version: 1.2
   ========================================================== */

"use strict";

/* ==========================================================
   Common Utilities
   ========================================================== */

var CommonUtils = (function ()
{

    /* ======================================================
       Public Object
       ====================================================== */

    return {

        isOnline:

            isOnline,

        showAlert:

            showAlert,

        showToast:

            showToast,

        showConfirm:

            showConfirm,

        showConfirmDialog:

            showConfirmDialog,

        logError:

            logError,

        getCurrentTimestamp:

            getCurrentTimestamp,

        getEmptyStateHtml:

            getEmptyStateHtml,

        getSkeletonCardsHtml:

            getSkeletonCardsHtml,

        highlightMatch:

            highlightMatch,

        buildPaginationSummary:

            buildPaginationSummary

    };



    /* ======================================================
       Check Internet Connection

       Returns true if the browser believes the device has a
       network connection, false otherwise. This is a quick
       check only - it does not guarantee the backend server
       itself is reachable, only that the device is online.
       ====================================================== */

    function isOnline()
    {
        return navigator.onLine;
    }



    /* ======================================================
       Show a User-Friendly Alert

       This used to be a plain window.alert() - the comment
       that was already here said "swap plain alert() for a
       nicer toast/notification without changing every page
       script" once that was ready, which is what this does
       now: every alert(...) call in Category/Section/Result/
       Student.script.js was pointed at this one function (see
       each file's own "swapped to CommonUtils.showAlert" note),
       so this single change gives every page toast
       notifications instead of a blocking browser popup,
       without touching any of that CRUD logic itself.

       strMessage : the message to show the user
       strType    : "error" (default), "success", "warning", or
                    "info" - controls the toast's color/icon.
                    Every existing call site only ever passed a
                    message, so defaulting to "error" keeps
                    their current (all failure-message) meaning
                    unchanged.
       ====================================================== */

    function showAlert(strMessage, strType)
    {
        showToast(strMessage, strType || "error");
    }



    /* ======================================================
       Show a Toast Notification

       Small, non-blocking notification that slides in from the
       bottom-right of the screen and dismisses itself after a
       few seconds (or when clicked). Creates its own container
       the first time it's called, so no page's HTML had to be
       edited to add one.

       strMessage : the message to show the user
       strType    : "success" | "error" | "warning" | "info"
       ====================================================== */

    function showToast(strMessage, strType)
    {
        var strResolvedType = strType || "info";

        var elContainer = document.getElementById("toast-container");

        if (elContainer === null)
        {
            elContainer = document.createElement("div");
            elContainer.id = "toast-container";
            document.body.appendChild(elContainer);
        }

        var objIcons = {
            success: "fa-circle-check",
            error: "fa-circle-exclamation",
            warning: "fa-triangle-exclamation",
            info: "fa-circle-info"
        };

        var strIcon = objIcons[strResolvedType] || objIcons.info;

        var elToast = document.createElement("div");
        elToast.className = "app-toast app-toast-" + strResolvedType;
        elToast.innerHTML =
            "<i class=\"fa-solid " + strIcon + "\"></i>" +
            "<span class=\"app-toast-message\"></span>";

        /* Set the message via textContent (not innerHTML) so any
           special characters in strMessage are never interpreted
           as markup. */
        elToast.querySelector(".app-toast-message").textContent = strMessage;

        var fnDismiss = function ()
        {
            elToast.classList.add("app-toast-hide");

            window.setTimeout(function ()
            {
                if (elToast.parentNode !== null)
                {
                    elToast.parentNode.removeChild(elToast);
                }
            }, 250);
        };

        elToast.addEventListener("click", fnDismiss);

        elContainer.appendChild(elToast);

        window.setTimeout(fnDismiss, 4000);
    }



    /* ======================================================
       Show a Yes / No Confirmation

       strMessage : the question to ask the user

       Returns true if the user pressed OK, false otherwise.
       ====================================================== */

    function showConfirm(strMessage)
    {
        return confirm(strMessage);
    }



    /* ======================================================
       Show a Styled Yes/No (or Delete/Cancel) Confirmation

       Replaces the browser's native confirm() box - which
       always shows "OK"/"Cancel" and can't be relabeled - with
       the app's own dialog, built the same self-contained way
       showToast() builds its own DOM (no HTML changes needed on
       any page that loads common.js).

       strMessage      : the question to ask the user
       strConfirmLabel : text for the confirm button, e.g.
                         "Yes" or "Delete" (default "Yes")
       strCancelLabel  : text for the cancel button, e.g. "No"
                         or "Cancel" (default "No")
       strTitle        : optional heading shown above the
                         message (omitted if not given)

       Returns a Promise that resolves true if the user pressed
       the confirm button, false for cancel/backdrop click.
       ====================================================== */

    function showConfirmDialog(strMessage, strConfirmLabel, strCancelLabel, strTitle)
    {
        return new Promise(function (fnResolve)
        {
            var elOverlay = document.createElement("div");
            elOverlay.className = "app-confirm-overlay";

            var elBox = document.createElement("div");
            elBox.className = "app-confirm-box";

            elBox.innerHTML =
                (strTitle ? "<div class=\"app-confirm-title\"></div>" : "") +
                "<div class=\"app-confirm-message\"></div>" +
                "<div class=\"app-confirm-actions\">" +
                    "<button type=\"button\" class=\"app-confirm-btn app-confirm-btn-cancel\"></button>" +
                    "<button type=\"button\" class=\"app-confirm-btn app-confirm-btn-confirm\"></button>" +
                "</div>";

            if (strTitle)
            {
                elBox.querySelector(".app-confirm-title").textContent = strTitle;
            }

            /* textContent (not innerHTML) so nothing in the message
               can ever be interpreted as markup. */
            elBox.querySelector(".app-confirm-message").textContent = strMessage;

            var btnCancel = elBox.querySelector(".app-confirm-btn-cancel");
            var btnConfirm = elBox.querySelector(".app-confirm-btn-confirm");

            btnCancel.textContent = strCancelLabel || "No";
            btnConfirm.textContent = strConfirmLabel || "Yes";

            var fnClose = function (bResult)
            {
                elOverlay.classList.add("app-confirm-hide");

                window.setTimeout(function ()
                {
                    if (elOverlay.parentNode !== null)
                    {
                        elOverlay.parentNode.removeChild(elOverlay);
                    }
                }, 200);

                fnResolve(bResult);
            };

            btnCancel.onclick = function ()
            {
                fnClose(false);
            };

            btnConfirm.onclick = function ()
            {
                fnClose(true);
            };

            /* Clicking the dimmed backdrop counts as Cancel, same as
               dismissing a native confirm() box. */
            elOverlay.onclick = function (objEvent)
            {
                if (objEvent.target === elOverlay)
                {
                    fnClose(false);
                }
            };

            elOverlay.appendChild(elBox);
            document.body.appendChild(elOverlay);

            btnConfirm.focus();
        });
    }



    /* ======================================================
       Log an Error in a Consistent Format

       strContext : short label saying where the error came
                    from, e.g. "DataService.addRecord"
       objError   : the error object (or message) itself
       ====================================================== */

    function logError(strContext, objError)
    {
        console.error("[" + strContext + "]", objError);
    }



    /* ======================================================
       Get the Current Timestamp

       Returns the current date/time as an ISO string. Used
       when queuing offline changes so we know the order they
       happened in.
       ====================================================== */

    function getCurrentTimestamp()
    {
        return new Date().toISOString();
    }

    /* ======================================================
       Build Empty-State HTML

       UI MODERNIZATION PASS 2 (added)
       Every list page (Student/Category/Section/Result) had
       no visual feedback when a search or filter returned zero
       rows - the list area just went blank with only the
       "Total: 0" counter changing, which reads like a broken
       page rather than "no matches". This returns one shared
       markup block (icon + title + subtitle) so all four
       showFilteredList() functions can show a consistent,
       friendly empty state instead of blank space.

       strEntityLabel - plural noun to show, e.g. "Students"
       strIconClass   - Font Awesome class, e.g. "fa-solid fa-user-graduate"
       ====================================================== */

    function getEmptyStateHtml(strEntityLabel, strIconClass)
    {
        var strLabel = strEntityLabel || "Records";
        var strIcon = strIconClass || "fa-solid fa-inbox";

        return (
            '<div class="empty-state">' +
                '<div class="empty-state-icon"><i class="' + strIcon + '"></i></div>' +
                '<p class="empty-state-title">No ' + strLabel + ' Found</p>' +
                '<p class="empty-state-subtitle">Try adjusting your search or filters.</p>' +
            '</div>'
        );
    }



    /* ======================================================
       Build Skeleton Placeholder Cards HTML

       UI MODERNIZATION PASS (this pass)
       WHY: while the first page of Students/Categories/
       Sections/Results is in flight, the list area used to
       just be empty (nothing rendered into #list_id) until the
       response arrived, which on a slow connection reads like
       a frozen/broken page rather than "loading".
       WHAT: returns intCount placeholder cards shaped like a
       real .list-item (one title-width bar, two shorter bars
       underneath), using common.css's .skeleton-card/
       .skeleton-line shimmer classes. Each Student/Category/
       Section/Result list page writes this into #list_id (via
       the existing setListToView()) immediately before its
       first DataService call for a page, then replaces it with
       the real cards the moment that call's callback fires -
       real .list-item cards already fade in on insert (see
       common.css's appCardFadeIn), so the transition from
       skeleton to real data reads as a smooth reveal rather
       than a jarring swap.

       intCount - how many placeholder cards to render (list
                  pages pass roughly how many real cards will
                  likely fit on screen, e.g. 6)
       ====================================================== */

    function getSkeletonCardsHtml(intCount)
    {
        var iCount = intCount || 6;

        var strOneCard =
            '<div class="skeleton-card">' +
                '<div class="skeleton-line skeleton-line-title"></div>' +
                '<div class="skeleton-line skeleton-line-medium"></div>' +
                '<div class="skeleton-line skeleton-line-short"></div>' +
            '</div>';

        var strHtml = "";

        for (var i = 0; i < iCount; i++)
        {
            strHtml += strOneCard;
        }

        return strHtml;
    }



    /* ======================================================
       Highlight Matching Search Text

       UI MODERNIZATION PASS (this pass)
       WHY: while a search narrows the currently loaded page
       down to matching rows, it should be obvious at a glance
       why each visible card matched, not just that it did.
       WHAT: wraps every case-insensitive occurrence of
       strKeyword inside strText in a
       <mark class="search-highlight"> tag (styled in
       common.css). Returns strText unchanged if strKeyword is
       empty, so callers can run this unconditionally on every
       row without an extra "is a search even active" check.
       Escapes strText for HTML first, so a name that happens to
       contain "<" or "&" can never be interpreted as markup.

       strText    : the raw field value to search within
       strKeyword : the current search box value
       ====================================================== */

    function highlightMatch(strText, strKeyword)
    {
        var strSafeText = (strText === null || strText === undefined) ? "" : String(strText);

        if (!strKeyword)
        {
            return strSafeText;
        }

        var strEscapedText = strSafeText
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;");

        var strEscapedKeyword = strKeyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

        var oPattern = new RegExp("(" + strEscapedKeyword + ")", "ig");

        return strEscapedText.replace(oPattern, '<mark class="search-highlight">$1</mark>');
    }



    /* ======================================================
       Build the "Showing X-Y of Z" Pagination Summary

       UI MODERNIZATION PASS (this pass)
       WHY: a "Showing 101-200 of 1348" style summary next to
       the Prev/Next controls is clearer than a bare "Total: N"
       count. One shared implementation so Student/Category/
       Section/Result's pagination bars all word it identically.

       iPage     : current 1-based page number
       iPageSize : rows per page (100)
       iTotal    : total record count reported by the backend
       ====================================================== */

    function buildPaginationSummary(iPage, iPageSize, iTotal)
    {
        var iSafeTotal = iTotal || 0;

        if (iSafeTotal === 0)
        {
            return "No records found";
        }

        var iFirstRow = ((iPage - 1) * iPageSize) + 1;
        var iLastRow = Math.min(iPage * iPageSize, iSafeTotal);

        return "Showing " + iFirstRow + "\u2013" + iLastRow + " of " + iSafeTotal;
    }

})();



/* ==========================================================
   Start the Offline Database

   Every page includes common.js, so this is a safe, single
   place to make sure IndexedDB has been opened (and its
   object stores created) before any page script tries to
   read or write offline data through DataService.
   ========================================================== */

StorageService.initializeDatabase()
    .then(function ()
    {
        /* If we came back online while the page was loading,
           this also gives queued changes a chance to sync. */

        if (CommonUtils.isOnline() === true && typeof DataService !== "undefined")
        {
            DataService.synchronizePendingChanges();
        }
    })
    .catch(function (objError)
    {
        CommonUtils.logError("common.js (initializeDatabase)", objError);
    });



/* ==========================================================
   Show / Hide a Full-Screen Loading Overlay

   WHY: showLoader()/hideLoader() used to only exist inside
   LegacyCompatShim.js, which is loaded on index.html and the
   four legacy list pages - but signup.js, Settings.script.js,
   and (this pass) Profile.script.js all needed the same thing
   on pages that never load that file (signup.html,
   settings.html, profile.html). Calling an undefined
   showLoader() there threw immediately and broke the whole
   click handler before the backend was ever reached - for
   signup.js specifically, that meant every Sign Up attempt
   failed silently with a console error, never actually calling
   DataService.createAccount(). Moved here instead, since
   common.js is the one file every page already loads, so
   there is now exactly one copy used everywhere.
   WHAT: builds one reusable full-screen overlay (created once,
   reused after that) with a spinner + message, and toggles it
   on/off. A request counter means nested show/hide calls (more
   than one DataService call in flight at once) only hide the
   overlay once every one of them has finished.
   WHEN: showLoader() is called right before a DataService call;
   hideLoader() is called once that call's callback fires.

   ----------------------------------------------------------
   PROJECT IMPROVEMENTS (UI Modernization pass, this pass)
   ----------------------------------------------------------
   ✓ Replaced the old flat, one-directional single-border-side
     spinner (previously built via a JS-injected <style> tag
     right here in this function) with a modern circular
     gradient spinner + fade-in/out overlay + pulsing "Loading
     Students..." style label, styled from common.css's new
     "MODERN LOADING INDICATOR" section instead of an inline
     <style> tag - every page already loads common.css, so the
     CSS belongs there like everything else.
   ✓ showLoader(strMessage, iPercent) - iPercent is a new,
     optional second argument. When a caller knows real
     progress (0-100), the overlay shows a thin gradient
     percentage bar under the label; omitted (the vast majority
     of call sites, which just await a single Google Apps
     Script response with no incremental progress to report),
     the bar simply stays hidden - exactly the same look as
     before, just with the new spinner/label. No existing
     showLoader(strMessage) call site anywhere in the app needed
     to change.
   ✓ The overlay now fades in/out over a CSS transition
     (appLoadingVisible class) instead of a hard display:none/
     flex toggle, and hideLoader() waits for that fade to finish
     before actually removing it from the layout flow (so it
     stops intercepting clicks only once it's visually gone).
   ========================================================== */

function getOrCreateLoaderElement()
{
    var oLoader = document.getElementById("appLoadingOverlay");

    if (oLoader)
    {
        return oLoader;
    }

    oLoader = document.createElement("div");
    oLoader.id = "appLoadingOverlay";
    oLoader.innerHTML =
        "<div class=\"appLoadingPanel\">" +
            "<div class=\"appLoadingSpinner\"></div>" +
            "<div class=\"appLoadingMessage\"></div>" +
            "<div class=\"appLoadingSubtext\">Please wait...</div>" +
            "<div class=\"appLoadingProgressTrack\">" +
                "<div class=\"appLoadingProgressFill\"></div>" +
            "</div>" +
        "</div>";

    document.body.appendChild(oLoader);

    return oLoader;
}

var numLoaderRequestCount = 0;

function showLoader(strMessage, iPercent)
{
    numLoaderRequestCount++;

    var oLoader = getOrCreateLoaderElement();

    oLoader.querySelector(".appLoadingMessage").textContent = strMessage || "Loading...";

    var oTrack = oLoader.querySelector(".appLoadingProgressTrack");
    var oFill = oLoader.querySelector(".appLoadingProgressFill");

    if (typeof iPercent === "number" && isNaN(iPercent) === false)
    {
        var iClampedPercent = Math.max(0, Math.min(100, iPercent));

        oTrack.classList.add("appLoadingProgressVisible");
        oFill.style.width = iClampedPercent + "%";
    }
    else
    {
        oTrack.classList.remove("appLoadingProgressVisible");
        oFill.style.width = "0%";
    }

    oLoader.style.display = "flex";

    /* Two rAF ticks (not one) so the browser has definitely
       painted display:flex/opacity:0 first - otherwise the very
       first showLoader() call on a page can skip straight to
       opacity:1 with no visible fade, since display and the
       class would land in the same paint frame. */
    window.requestAnimationFrame(function ()
    {
        window.requestAnimationFrame(function ()
        {
            oLoader.classList.add("appLoadingVisible");
        });
    });
}

function hideLoader()
{
    numLoaderRequestCount = Math.max(0, numLoaderRequestCount - 1);

    if (numLoaderRequestCount === 0)
    {
        var oLoader = document.getElementById("appLoadingOverlay");

        if (oLoader)
        {
            oLoader.classList.remove("appLoadingVisible");

            /* Matches common.css's #appLoadingOverlay transition
               (opacity .2s ease) - only actually hides it (so it
               stops intercepting clicks) once the fade-out has
               visually finished, instead of vanishing instantly
               mid-fade. */
            window.setTimeout(function ()
            {
                if (numLoaderRequestCount === 0 && oLoader.classList.contains("appLoadingVisible") === false)
                {
                    oLoader.style.display = "none";
                }
            }, 200);
        }
    }
}



/* ==========================================================
   Automatic Background Synchronization

   As soon as the browser tells us the device is back online,
   ask DataService to replay anything that was saved while we
   were offline. This runs on every page because common.js is
   included everywhere.
   ========================================================== */

window.addEventListener("online", handleDeviceCameOnline);



/* ==========================================================
   Handle Device Coming Back Online
   ========================================================== */

function handleDeviceCameOnline()
{
    if (typeof DataService !== "undefined")
    {
        DataService.synchronizePendingChanges();
    }
}