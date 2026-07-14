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

   Version: 1.0

   ----------------------------------------------------------
   UI Modernization Pass 2 (added)
   ----------------------------------------------------------
   Added getEmptyStateHtml() - one shared "No records found"
   markup block, reused by Student/Category/Section/Result
   showFilteredList() so an empty search result shows a
   friendly message instead of blank space. No existing
   function changed, architecture unchanged.
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

            getEmptyStateHtml

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
        console.log("Offline database ready.");

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
    console.log("Internet connection restored. Starting background sync...");

    if (typeof DataService !== "undefined")
    {
        DataService.synchronizePendingChanges();
    }
}