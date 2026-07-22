/* ==========================================================
   Student Management System
   DataService.js

   ==========================================================
   Project Improvements

   Added switchable backend architecture.

   Supports Google Apps Script.

   Supports IndexedDB.

   Prepared Spring Boot integration.

   Architecture unchanged.

   Folder structure unchanged.

   Existing CRUD unchanged.
   ==========================================================

   ----------------------------------------------------------
   SWITCHABLE BACKEND ARCHITECTURE (added, this pass)
   ----------------------------------------------------------

   Every CRUD/auth function in this file now starts by reading
   AppConfig.BACKEND_MODE (via getBackendMode()) and branches on
   it explicitly:

     GOOGLE    - existing behavior below, completely unchanged.
     INDEXEDDB - (new name for the existing OFFLINE mode - see
                 isIndexedDbMode()) goes straight to
                 StorageService, never touches the network.
     SPRING    - calls the new callSpringGet/Post/Put/Delete
                 placeholders (see just after parseGoogleResponse
                 below), which always reject with "Spring backend
                 not implemented" until a real Spring Boot service
                 exists.

   No page (Student.script.js, Category.script.js, Section.script.js,
   Result.script.js, Dashboard.script.js, Profile.script.js,
   Login.js, signup.js, etc.) needed to change - they still call
   DataService.getAllRecords()/addRecord()/updateRecord()/
   deleteRecord()/login()/etc. exactly as before. Only this file
   (plus the small AppConfig.BACKEND.INDEXEDDB addition in
   Config.js) changed.

   ----------------------------------------------------------
   PASS 3 (added) - createAccount()
   ----------------------------------------------------------
   Added createAccount(strUsername, strPassword, fnSuccess,
   fnError), following the exact same pattern as the existing
   login() right below it, so Sign Up actually saves the new
   user to the backend Users sheet instead of being a no-op.
   Nothing existing renamed or removed.

   ----------------------------------------------------------
   CONNECTION FIX - WHY THIS FILE WAS ADDED
   ----------------------------------------------------------

   Every page (index.html (login page), dashboard.html, studentList.html,
   categoryList.html, sectionList.html, resultList.html,
   profile.html, settings.html, signup.html) already had a
   <script src=".../DataService.js"> tag, and every entity
   file (Student.script.js, Category.script.js,
   Section.script.js, Result.script.js, Dashboard.script.js)
   already called things like DataService.getAllRecords(...),
   DataService.addRecord(...), DataService.updateRecord(...),
   DataService.deleteRecord(...), DataService.getRecordById(...)
   and DataService.synchronizePendingChanges().

   This file itself did not exist anywhere in the project.
   That is the main reason "nothing loaded" and "no button
   seemed to do anything that touched data": as soon as any
   page tried to call DataService.getAllRecords(...) etc, the
   browser threw "DataService is not defined" and stopped
   running the rest of that function - which is also why some
   button click-handlers that were registered further down in
   the same function never got attached.

   ----------------------------------------------------------
   WHAT THIS FILE DOES
   ----------------------------------------------------------

   DataService is the one place that decides HOW a record is
   read/written:

   • BACKEND_MODE = "GOOGLE"  -> talks to AppConfig.GOOGLE_SCRIPT_URL
   • BACKEND_MODE = "SPRING"  -> talks to AppConfig.SPRING_BOOT_URL
   • BACKEND_MODE = "OFFLINE" -> only uses IndexedDB (via
     StorageService), never touches the network at all

   The current mode comes from AppConfig.BACKEND_MODE, but can
   be overridden at runtime (without touching any code) by
   calling DataService.setBackendMode(...) once from the
   browser console, or from a Settings screen later - see
   "BACKEND SWITCHING" below.

   Every list/add/edit/delete call goes through the same 3
   steps, no matter which backend is selected:

     1. Try the real backend (unless mode is OFFLINE, or the
        device is offline).
     2. Mirror whatever came back into IndexedDB, through
        StorageService, so the app still has something to show
        the next time it is opened offline.
     3. If the backend call fails (offline, timeout, script
        error, etc), fall back to IndexedDB automatically, and
        for add/update/delete, queue the change in
        StorageService's SyncQueue store so it is not lost.

   ----------------------------------------------------------
   GOOGLE APPS SCRIPT CONTRACT (CONNECTION FIX, matches the
   real deployed Code.gs / Student.gs / Category.gs /
   Section.gs / Result.gs)
   ----------------------------------------------------------

   The first version of this file guessed at a generic
   list/getById/add/update/delete + store/data contract that
   the real Apps Script backend never implemented, so every
   single request was landing on Code.gs's
   `default: return sendError("Invalid API Action.")` branch -
   nothing ever loaded, no matter what the UI did. That has
   been replaced with calls that match the actual backend:

     GET {GOOGLE_SCRIPT_URL}?action=getStudents
     GET {GOOGLE_SCRIPT_URL}?action=getStudentById&studentId=...
     GET {GOOGLE_SCRIPT_URL}?action=addStudent&studentName=...&phone=...
     GET {GOOGLE_SCRIPT_URL}?action=updateStudent&studentId=...&studentName=...
     GET {GOOGLE_SCRIPT_URL}?action=deleteStudent&studentId=...

     (same pattern for Category/Section/Result, using each
     entity's own action names and field names.)

   Every one of these is sent as a plain GET, even the writes:
   Code.gs's doGet(e) and doPost(e) both just call the same
   handleRequest(e), which only ever reads e.parameter - a GET
   query string is the one request shape guaranteed to populate
   e.parameter AND never trigger a CORS preflight. (The old
   code POSTed a JSON string body with Content-Type text/plain,
   which Code.gs never reads at all - e.parameter.action was
   always undefined on every POST, a second independent way
   every write was failing.)

   Every response is `{ success, message, data }`
   (see Response.gs). List actions return data as a page object
   keyed per entity (data.students / data.categories / ...), not
   a bare array - see getEntityApiConfig() below, which is the
   one place that knows each entity's real action names and
   field names. If Code.gs's field names ever change, this is
   the only function that needs to change.

   ----------------------------------------------------------
   BACKEND SWITCHING (Task 6 - testing vs production, etc.)
   ----------------------------------------------------------

   AppConfig.BACKEND_MODE in Config.js is the DEFAULT backend
   for this build. To switch backends without touching any
   code:

       DataService.setBackendMode(AppConfig.BACKEND.OFFLINE);
       DataService.setBackendMode(AppConfig.BACKEND.GOOGLE);
       DataService.setBackendMode(AppConfig.BACKEND.SPRING);

   Typed once into the browser console (or from any script),
   this is saved through StorageService under
   AppConfig.STORAGE_KEYS.BACKEND and is remembered on every
   page from then on, until changed again. This means a
   "testing" device/browser profile and a "production"
   device/browser profile can each be pointed at a different
   backend with zero code changes and zero redeployments.

   ----------------------------------------------------------
   RECORD ID FIELDS
   ----------------------------------------------------------

   The existing entity files do not use a generic "id" field -
   they use their own domain field per store ("student_id",
   "category_id", "section_id", "result_id"), which is exactly
   what Student.script.js / Category.script.js /
   Section.script.js / Result.script.js already read/write via
   their own JSON_KEY.*_ID constants. StorageService's
   IndexedDB stores, however, all use a generic "id" keyPath
   (see StorageService.createObjectStore). getIdFieldName()
   below is the one place that maps between the two, so every
   record saved offline can still be found again with
   StorageService.getRecordById()/deleteRecordById(), while the
   rest of the app keeps using its own familiar field names
   unchanged.

   ----------------------------------------------------------
   SAMPLE / TEST DATA (Task 5)
   ----------------------------------------------------------

   DataService.seedSampleData(fnDone) adds a small set of
   Categories, Sections, Students and Results using the exact
   same addRecord() path as typing them in by hand - so if the
   Google backend is reachable, this sample data really is
   written to your Google Sheet, and if it is not reachable,
   the sample data is queued/offline exactly like a real user's
   data would be. There is deliberately no button for this on
   the Dashboard - it is a developer/testing utility, called
   from the browser console (see Dashboard.script.js for the
   exact console command).

   ----------------------------------------------------------
   PROJECT IMPROVEMENTS (this pass)
   ----------------------------------------------------------
   ✓ Added changePassword() - Profile.script.js's Change
     Password form validated its fields and then stopped,
     since there was nothing to actually send the new password
     to. Built the same way login()/createAccount() already
     talk to the Google Apps Script backend - see the function
     itself for the full WHY/WHAT and the matching Apps Script
     snippet needed alongside it.

   ----------------------------------------------------------
   PROJECT IMPROVEMENTS (Student List "only part of the data
   loads" fix)
   ----------------------------------------------------------
   ✓ ROOT CAUSE FOUND AND FIXED - getAllRecords() (GOOGLE mode)
     used arrRawRecords.map(...) to convert every raw Sheet row
     into the app's record shape. map() has no per-row error
     isolation: one malformed/blank row (e.g. left behind after
     manually adding/editing rows directly in the Google Sheet)
     threw, which was silently caught by callGoogleGet's own
     "GOOGLE unreachable, falling back to offline cache" handler
     further down - discarding the ENTIRE fresh list of good
     rows and quietly re-showing the last cached list from
     BEFORE the Sheet was updated. That is exactly why the
     Student List kept showing fewer students than the Sheet
     actually had, with no error visible to the user. Replaced
     with a per-row try/catch loop (and the same treatment for
     the existing-cache indexing step just above it) so a single
     bad row is skipped and logged instead of taking down the
     other 14/15 good rows. Same fix benefits Category/Section/
     Result/User too, since they all share this one
     getAllRecords() function. No API/behavior change for the
     normal (all rows valid) case.

   ----------------------------------------------------------
   PROJECT IMPROVEMENTS (Pagination / Loading Performance pass)
   ----------------------------------------------------------
   ✓ ADDED objListCache + invalidateListCache() - getAllRecords()
     (the "give me the WHOLE table" call used only for lookups:
     Section's Category dropdown, Student's Category+Section
     dropdowns, Result's Student dropdown) was hitting the
     network fresh on every single call, even when the exact
     same table had just been fetched a moment earlier on
     another page in the same session. With hundreds/thousands
     of real rows, that repeated, uncached full-table fetch is
     the real reason list pages "stayed on Please Wait" - not
     the paged list call itself (see getRecordsPage(), untouched
     by this cache). Now the first getAllRecords(store) call in
     a session fetches and caches; every later call for that
     same store, from any page, is served from memory instead -
     until invalidateListCache(store) runs (wired into
     addRecord()/updateRecord()/deleteRecord()/replayNext()
     below), which clears just that one store's cache entry so
     the very next getAllRecords() call for it fetches fresh
     data again. getRecordsPage() (the real per-page list load)
     is completely unaffected - Prev/Next and the Refresh button
     always ask the backend for that exact page, never the
     cache, exactly as Task 1/2 require. Settings/Permissions
     were already "load once, reuse" before this pass - they
     come from StorageService/local checks (settings.js /
     LegacyCompatShim.js's checkRolePermission()), not the
     network, so no change was needed there.

   Version: 1.3
   ========================================================== */

"use strict";

/* ==========================================================
   Data Service
   ========================================================== */

var DataService = (function ()
{

    /* ======================================================
       List Page Size

       See the "LIST TRUNCATION FIX" note on getAllRecords()
       below - the backend paginates every list action
       (default pageSize 10) and this app has no paged list UI
       anywhere, so every list fetch explicitly asks for one
       page this big instead of silently accepting the
       backend's first-10-rows default.
       ====================================================== */

    var LIST_ALL_PAGE_SIZE = 100000;

    /* ======================================================
       PAGINATION / LOADING FIX (this pass) - Lookup List Cache

       WHY: getAllRecords() is the "give me the WHOLE table"
       call used for lookups - Section's Category dropdown,
       Student's Category+Section dropdowns, Result's Student
       dropdown, etc. Every one of those was calling
       getAllRecords() fresh, over the network, EVERY single
       time its page opened, even though the same Category/
       Section/Student table had already been fetched moments
       earlier on a different page in the same session. With a
       real dataset (hundreds/thousands of rows) that repeated,
       uncached full-table fetch is what actually shows up to
       the user as "Category takes forever to load" - it is not
       usually the Category LIST page's own single getRecordsPage()
       call that is slow (that already asks for one page), it is
       every OTHER page re-downloading the entire Category table
       as a lookup, over and over, that adds up.

       WHAT: a simple in-memory cache, keyed by store name. The
       first getAllRecords(store) call in a session hits the
       network exactly like before and stores the result here;
       every call after that (from any page, for the rest of the
       session) is served from this object instead of the
       network, until something actually changes that store
       (see invalidateListCache(), called from addRecord()/
       updateRecord()/deleteRecord()/replayNext() below) - at
       which point the very next getAllRecords(store) call fetches
       fresh data again and re-populates the cache. Settings and
       Permissions do not need an entry here - they already come
       from StorageService/local checks (see settings.js /
       LegacyCompatShim.js's checkRolePermission()), not the
       network, so they were already "load once, reuse" before
       this pass.

       This does NOT touch getRecordsPage() - real list-page
       browsing (Task 1) always asks the backend for the exact
       page requested, never the cache, so Prev/Next and Refresh
       keep behaving exactly as required.
       ====================================================== */

    var objListCache = {};

    function invalidateListCache(strStoreName)
    {
        delete objListCache[strStoreName];
    }

    /* ======================================================
       Public Object
       ====================================================== */

    return {

        getAllRecords:
            getAllRecords,

        getRecordsPage:
            getRecordsPage,

        getRecordById:
            getRecordById,

        addRecord:
            addRecord,

        updateRecord:
            updateRecord,

        deleteRecord:
            deleteRecord,

        synchronizePendingChanges:
            synchronizePendingChanges,

        getBackendMode:
            getBackendMode,

        setBackendMode:
            setBackendMode,

        seedSampleData:
            seedSampleData,

        login:
            login,

        createAccount:
            createAccount,

        changePassword:
            changePassword,

        verifyUsernameExists:
            verifyUsernameExists,

        resetPassword:
            resetPassword,

        registerBiometric:
            registerBiometric,

        loginWithBiometric:
            loginWithBiometric

    };



    /* ======================================================
       Get the Current Backend Mode

       Checks for a runtime override saved through
       setBackendMode() first (see "BACKEND SWITCHING" above),
       and falls back to AppConfig.BACKEND_MODE otherwise.
       ====================================================== */

    function getBackendMode()
    {
        var strSavedMode = StorageService.getValue(AppConfig.STORAGE_KEYS.BACKEND);

        if (strSavedMode === AppConfig.BACKEND.GOOGLE ||
            strSavedMode === AppConfig.BACKEND.OFFLINE ||
            strSavedMode === AppConfig.BACKEND.INDEXEDDB || // ADDED: accept the new INDEXEDDB alias too
            strSavedMode === AppConfig.BACKEND.SPRING)
        {
            return strSavedMode;
        }

        return AppConfig.BACKEND_MODE;
    }



    /* ======================================================
       Set the Backend Mode at Runtime

       Saves the chosen mode so every page (and every future
       visit) uses it, without editing Config.js. See
       "BACKEND SWITCHING" above.
       ====================================================== */

    function setBackendMode(strMode)
    {
        StorageService.saveValue(AppConfig.STORAGE_KEYS.BACKEND, strMode);

        CommonUtils.logError("DataService.setBackendMode", "Backend mode set to " + strMode);
    }



    /* ======================================================
       ADDED: Is This the IndexedDB-Only Backend Mode?

       WHY: AppConfig.BACKEND.OFFLINE and AppConfig.BACKEND.INDEXEDDB
       mean exactly the same thing (see the "SWITCHABLE BACKEND
       ARCHITECTURE" note in Config.js) - INDEXEDDB is just the new,
       preferred name. Every function below that used to check
       `strMode === AppConfig.BACKEND.OFFLINE` now calls this helper
       instead, so both names keep working from one single place.
       ====================================================== */

    function isIndexedDbMode(strMode)
    {
        return strMode === AppConfig.BACKEND.OFFLINE || strMode === AppConfig.BACKEND.INDEXEDDB;
    }



    /* ======================================================
       Get the IndexedDB / Domain Id Field Name for a Store

       See "RECORD ID FIELDS" above.
       ====================================================== */

    function getIdFieldName(strStoreName)
    {
        if (strStoreName === AppConfig.STORES.STUDENT)
        {
            return "student_id";
        }

        if (strStoreName === AppConfig.STORES.CATEGORY)
        {
            return "category_id";
        }

        if (strStoreName === AppConfig.STORES.SECTION)
        {
            return "section_id";
        }

        if (strStoreName === AppConfig.STORES.RESULT)
        {
            return "result_id";
        }

        if (strStoreName === AppConfig.STORES.USER)
        {
            return "user_id";
        }

        return "id";
    }



    /* ======================================================
       Make Sure a Record Has Both "id" (for IndexedDB) and Its
       Own Domain Id Field (for the existing page scripts) in
       Sync with Each Other.
       ====================================================== */

    function normalizeRecordId(strStoreName, objRecord)
    {
        if (!objRecord)
        {
            return objRecord;
        }

        var strIdField = getIdFieldName(strStoreName);

        var mId = objRecord.id;

        if (mId === undefined || mId === null || mId === "" || mId === 0 || mId === "0")
        {
            mId = objRecord[strIdField];
        }

        if (mId !== undefined && mId !== null && mId !== "" && mId !== "0" && mId !== 0)
        {
            objRecord.id = mId;
            objRecord[strIdField] = mId;
        }

        return objRecord;
    }



    /* ======================================================
       Cache a Full List Locally

       Replaces everything currently in the IndexedDB store
       with the fresh list that just came back from the real
       backend, so the app has something to show next time it
       is opened offline.
       ====================================================== */

    function cacheListLocally(strStoreName, arrRecords)
    {
        StorageService.clearStoreRecords(strStoreName)
            .then(function ()
            {
                for (var intIndex = 0; intIndex < arrRecords.length; intIndex++)
                {
                    normalizeRecordId(strStoreName, arrRecords[intIndex]);

                    StorageService.addRecord(strStoreName, arrRecords[intIndex])
                        .catch(function (objError)
                        {
                            CommonUtils.logError("DataService.cacheListLocally", objError);
                        });
                }
            })
            .catch(function (objError)
            {
                CommonUtils.logError("DataService.cacheListLocally", objError);
            });
    }



    /* ======================================================
       CONNECTION FIX (see notes at top of file)
       ----------------------------------------------------------
       Real Google Apps Script Contract (from the actual Code.gs
       / Student.gs / Category.gs / Section.gs / Result.gs that
       are deployed at AppConfig.GOOGLE_SCRIPT_URL)
       ----------------------------------------------------------

       Every call is:

           GET {GOOGLE_SCRIPT_URL}?action=<actionName>&<param>=<value>...

       (Code.gs's doGet/doPost both call the same handleRequest(e),
       which only ever reads e.parameter - so using GET for every
       action, including add/update/delete, is both correct AND
       avoids the CORS "preflight" request that a JSON POST body
       would trigger.)

       Every response is:

           { success: true/false, message: "...", data: {...} }

       list-type actions (getStudents/getCategories/getSections/
       getResults) return data as a PAGE OBJECT, e.g.
       data.students / data.categories / data.sections /
       data.results (see listDataKey below) - NOT a bare array.

       add/update actions only return the new/edited record's own
       id (e.g. data.studentId), not the full saved record - so
       this file merges that id back into the record that was
       already built from the form, instead of expecting the
       whole record back.

       getEntityApiConfig() is the ONE place that knows the real
       action names + real field names per entity/store, so the
       rest of this file (and every page script that calls
       DataService.*) never has to know them.
       ====================================================== */

    function getEntityApiConfig(strStoreName)
    {
        var GOOGLE_ENTITY_MAP = {};

        /* -------------------- Students -------------------- */

        GOOGLE_ENTITY_MAP[AppConfig.STORES.STUDENT] =
        {
            listAction: "getStudents",
            listDataKey: "students",
            getByIdAction: "getStudentById",
            addAction: "addStudent",
            updateAction: "updateStudent",
            deleteAction: "deleteStudent",
            idParam: "studentId",

            /* Project Improvements (this pass): searchStudents already
               exists in Student.gs and is already routed in Code.gs -
               it was simply never wired up here, which is why Student
               search only ever filtered whatever page was already
               loaded instead of searching every record. */
            searchAction: "searchStudents",

            /* Student.script.js builds records with JSON_KEY
               fields (student_id, category_id, section_id, name,
               roll_number, mobile, email, parent_mobile,
               telegram, parent_email).

               PASS 4 (added) - roll_number / parent_mobile /
               parent_email round-trip:
               These three are now ALWAYS sent to Google as
               rollNumber / parentMobile / parentEmail, and ALWAYS
               read back the same way. Until Student.gs's Students
               sheet gains matching columns, Apps Script will just
               ignore the 3 extra request params it doesn't
               recognize, and will not return them either - so
               fromBackendFields() below falls back to whatever
               value the record already had (its previous local
               copy) instead of overwriting it with undefined. That
               fallback is what stops these 3 fields from being
               silently wiped out of IndexedDB every time the list
               refreshes from Google, which is what happened before
               this change (cacheListLocally() replaces the whole
               local store with exactly what fromBackendFields()
               returns, so any field missing from that return value
               was being erased locally on every single refresh,
               not just failing to save to the Sheet).

               Once Student.gs / the Students sheet gain rollNumber,
               parentMobile and parentEmail columns (see the Code.gs
               snippet provided alongside this file), Google will
               start echoing real values for these 3 fields and the
               fallback below simply stops being used. */
            toBackendFields: function (objRecord)
            {
                return {
                    studentId: objRecord.student_id || objRecord.id || "",
                    studentName: objRecord.name || "",
                    phone: objRecord.mobile || "",
                    email: objRecord.email || "",
                    telegram: objRecord.telegram || "",
                    organization: objRecord.organization_id || "",
                    category: objRecord.category_id || "",
                    section: objRecord.section_id || "",
                    status: objRecord.status || "Active",
                    rollNumber: objRecord.roll_number || "",
                    parentMobile: objRecord.parent_mobile || "",
                    parentEmail: objRecord.parent_email || ""
                };
            },

            fromBackendFields: function (objBackendRecord, objExistingRecord)
            {
                var objPrevious = objExistingRecord || {};

                return {
                    student_id: objBackendRecord.studentId,
                    name: objBackendRecord.studentName,
                    mobile: objBackendRecord.phone,
                    email: objBackendRecord.email,
                    telegram: objBackendRecord.telegram,
                    organization_id: objBackendRecord.organization,
                    category_id: objBackendRecord.category,
                    section_id: objBackendRecord.section,
                    status: objBackendRecord.status,

                    /* Fall back to the previous local value until
                       Student.gs actually returns these - see the
                       PASS 4 note above. */
                    roll_number: (objBackendRecord.rollNumber !== undefined && objBackendRecord.rollNumber !== null && objBackendRecord.rollNumber !== "")
                        ? objBackendRecord.rollNumber
                        : objPrevious.roll_number,

                    parent_mobile: (objBackendRecord.parentMobile !== undefined && objBackendRecord.parentMobile !== null && objBackendRecord.parentMobile !== "")
                        ? objBackendRecord.parentMobile
                        : objPrevious.parent_mobile,

                    parent_email: (objBackendRecord.parentEmail !== undefined && objBackendRecord.parentEmail !== null && objBackendRecord.parentEmail !== "")
                        ? objBackendRecord.parentEmail
                        : objPrevious.parent_email
                };
            }
        };

        /* -------------------- Categories -------------------- */

        GOOGLE_ENTITY_MAP[AppConfig.STORES.CATEGORY] =
        {
            listAction: "getCategories",
            listDataKey: "categories",
            searchAction: "searchCategories",
            getByIdAction: "getCategoryById",
            addAction: "addCategory",
            updateAction: "updateCategory",
            deleteAction: "deleteCategory",
            idParam: "categoryId",

            toBackendFields: function (objRecord)
            {
                return {
                    categoryId: objRecord.category_id || objRecord.id || "",
                    categoryName: objRecord.name || "",
                    organization: objRecord.organization_id || "",
                    description: objRecord.description || ""
                };
            },

            fromBackendFields: function (objBackendRecord)
            {
                return {
                    category_id: objBackendRecord.categoryId,
                    name: objBackendRecord.categoryName,
                    organization_id: objBackendRecord.organization,
                    description: objBackendRecord.description
                };
            }
        };

        /* -------------------- Sections -------------------- */

        GOOGLE_ENTITY_MAP[AppConfig.STORES.SECTION] =
        {
            listAction: "getSections",
            listDataKey: "sections",
            getByIdAction: "getSectionById",
            addAction: "addSection",
            updateAction: "updateSection",
            deleteAction: "deleteSection",
            idParam: "sectionId",

            /* Project Improvements (this pass): searchSections already
               exists in Section.gs and is already routed in Code.gs -
               it was simply never wired up here, which is why Section
               search only ever filtered whatever page was already
               loaded instead of searching every record. Note:
               searchSections matches categoryId as a raw id, not a
               resolved category name, so searching by category name
               text still won't match server-side until Section.gs
               itself is updated to look the name up. */
            searchAction: "searchSections",

            /* Section.gs requires categoryId to add/update a
               Section, but Section.script.js's Add/Edit form
               (JSON_KEY) never collects one - only section_id and
               name. Reads/deletes/search work either way; Add and
               Update will reach Google and come back with the
               same "Category is required." error Section.gs
               already defines, until the Section form is given a
               Category field. */
            toBackendFields: function (objRecord)
            {
                return {
                    sectionId: objRecord.section_id || objRecord.id || "",
                    sectionName: objRecord.name || "",
                    categoryId: objRecord.category_id || "",
                    organization: objRecord.organization_id || "",
                    description: objRecord.description || ""
                };
            },

            fromBackendFields: function (objBackendRecord)
            {
                return {
                    section_id: objBackendRecord.sectionId,
                    name: objBackendRecord.sectionName,
                    category_id: objBackendRecord.categoryId,
                    organization_id: objBackendRecord.organization,
                    description: objBackendRecord.description
                };
            }
        };

        /* -------------------- Results -------------------- */

        GOOGLE_ENTITY_MAP[AppConfig.STORES.RESULT] =
        {
            listAction: "getResults",
            listDataKey: "results",
            getByIdAction: "getResultById",
            addAction: "addResult",
            updateAction: "updateResult",
            deleteAction: "deleteResult",
            idParam: "resultId",

            /* Project Improvements (this pass): searchResults already
               exists in Result.gs and is already routed in Code.gs -
               it was simply never wired up here, which is why Result
               search only ever filtered whatever page was already
               loaded instead of searching every record. Note:
               searchResults matches studentId as a raw id, not the
               student's resolved name, so searching "Ram" still won't
               match server-side until Result.gs itself is updated to
               look the name up. */
            searchAction: "searchResults",

            /* Result.gs requires studentId/exam/subject to add or
               update a Result, but Result.script.js's form (see
               its JSON_KEY) only collects result_id, exam_name,
               date_of_exam, total_marks and marks_obtained - there
               is no Student picker and no subject/grade field
               anywhere in this page. Reads/deletes/search work
               either way; Add and Update will reach Google and
               come back with the same "Student ID is required."
               error Result.gs already defines, until the Result
               form is given Student/Subject/Grade fields. */
            toBackendFields: function (objRecord)
            {
                return {
                    resultId: objRecord.result_id || objRecord.id || "",
                    studentId: objRecord.student_id || "",
                    exam: objRecord.exam_name || "",
                    subject: objRecord.subject || "",
                    marks: objRecord.marks_obtained || "",
                    grade: objRecord.grade || "",
                    result: objRecord.result || ""
                };
            },

            fromBackendFields: function (objBackendRecord)
            {
                return {
                    result_id: objBackendRecord.resultId,
                    student_id: objBackendRecord.studentId,
                    exam_name: objBackendRecord.exam,
                    subject: objBackendRecord.subject,
                    marks_obtained: objBackendRecord.marks,
                    grade: objBackendRecord.grade,
                    result: objBackendRecord.result
                };
            }
        };

        /* -------------------- Users -------------------- */

        /* Admin-only User Management, embedded on the Profile
           page (see UserManagement.script.js / profile.html).
           Reuses this same generic getAllRecords/addRecord/
           updateRecord/deleteRecord machinery every other module
           already uses - only the field mapping below is new.

           SECURITY NOTE: the password is only ever sent UP to
           the backend on Add (User.gs's addUser requires it to
           create the account); it is intentionally never
           requested back down. fromBackendFields() below has no
           password field at all, so a user's password is never
           stored in IndexedDB or held in memory here - only
           User.gs (server-side) ever reads/writes it, and only
           for the Add action. Editing an existing user only ever
           touches fullName/role/status - the username and
           password are immutable through this screen (username
           is permanent, password can only be changed by the
           account owner via Profile's Change Password, which
           calls DataService.changePassword() separately). */
        GOOGLE_ENTITY_MAP[AppConfig.STORES.USER] =
        {
            listAction: "getUsers",
            listDataKey: "users",
            getByIdAction: "getUserById",
            addAction: "addUser",
            updateAction: "updateUser",
            deleteAction: "deleteUser",
            idParam: "userId",

            toBackendFields: function (objRecord)
            {
                return {
                    userId: objRecord.user_id || objRecord.id || "",
                    username: objRecord.username || "",
                    /* Only ever populated by the Add User form -
                       the Edit User form never sets this, and
                       updateUser() on the backend ignores it even
                       if it were sent. */
                    password: objRecord.password || "",
                    fullName: objRecord.fullName || "",
                    role: objRecord.role || "",
                    status: objRecord.status || "Active"
                };
            },

            fromBackendFields: function (objBackendRecord)
            {
                return {
                    user_id: objBackendRecord.userId,
                    username: objBackendRecord.username,
                    fullName: objBackendRecord.fullName,
                    role: objBackendRecord.role,
                    status: objBackendRecord.status,
                    lastLogin: objBackendRecord.lastLogin
                };
            }
        };

        return GOOGLE_ENTITY_MAP[strStoreName] || null;
    }



    /* ======================================================
       Build a Google Apps Script URL for a Given Action

       Every param is appended to the query string (GET), which
       is exactly how Code.gs's e.parameter reads them for BOTH
       doGet and doPost - see the big comment block above.
       ====================================================== */

    function buildGoogleUrl(strAction, objParams)
    {
        /* --------------------------------------------------
           Phase 3: the Server URL can now be overridden on
           the Settings page. Guarded with a typeof check so
           this keeps working unchanged on any page that
           hasn't added common/settings.js yet.
           -------------------------------------------------- */

        var strServerUrl = (typeof SettingsManager !== "undefined")
            ? SettingsManager.getServerUrl()
            : AppConfig.GOOGLE_SCRIPT_URL;

        var strUrl = strServerUrl + "?action=" + encodeURIComponent(strAction);

        for (var strKey in objParams)
        {
            if (objParams.hasOwnProperty(strKey))
            {
                var mValue = objParams[strKey];

                if (mValue === undefined || mValue === null)
                {
                    mValue = "";
                }

                strUrl += "&" + encodeURIComponent(strKey) + "=" + encodeURIComponent(mValue);
            }
        }

        return strUrl;
    }



    /* ======================================================
       Call the Google Apps Script Backend With a GET Request

       Used for reads (list / getById). See "GOOGLE APPS
       SCRIPT CONTRACT" above.
       ====================================================== */

    function callGoogleGet(strUrl, fnSuccess, fnError)
    {
        fetch(strUrl)
            .then(function (objResponse)
            {
                return objResponse.text().then(function (strRawBody)
                {
                    return parseGoogleResponse(objResponse, strRawBody, "GET " + strUrl);
                });
            })
            .then(fnSuccess)
            .catch(fnError);
    }



    /* ======================================================
       Turn a Raw fetch() Response Into Either Parsed JSON or
       a Clear, Loggable Error

       WHY THIS EXISTS: if the Google Script URL is wrong, the
       script itself throws an error, or the request shape does
       not match what the script expects, Apps Script normally
       replies with an HTML error page instead of JSON - and
       objResponse.json() on that just throws a generic
       "Unexpected token < in JSON" error that does not say
       WHERE the problem is. This function instead always logs
       the HTTP status and the first part of the actual response
       body through CommonUtils.logError before giving up, so
       opening the browser console immediately shows what the
       backend really sent back.
       ====================================================== */

    function parseGoogleResponse(objResponse, strRawBody, strRequestDescription)
    {
        if (objResponse.ok === false)
        {
            CommonUtils.logError(
                "DataService (" + strRequestDescription + ")",
                "Google Script returned HTTP " + objResponse.status +
                ". First 300 characters of the response: " + strRawBody.substring(0, 300)
            );

            throw new Error("Google Script responded with status " + objResponse.status);
        }
       
        try
        {
            return JSON.parse(strRawBody);
        }
        catch (objParseError)
        {
            CommonUtils.logError(
                "DataService (" + strRequestDescription + ")",
                "Google Script did not return valid JSON (this usually means the " +
                "\"action\"/\"store\" parameters this app sends do not match what your " +
                "Apps Script expects). First 300 characters of the response: " +
                strRawBody.substring(0, 300)
            );

            throw objParseError;
        }
    }



    /* ======================================================
       ADDED: Spring Boot Backend - Placeholders Only

       Future Spring Boot backend. None of these actually call
       anything yet - AppConfig.SPRING_BOOT_URL is not pointed at
       a real service. Every one of them simply rejects, so any
       CRUD function that reaches AppConfig.BACKEND.SPRING mode
       fails clearly and predictably instead of silently doing
       nothing. When a real Spring Boot backend exists, only the
       bodies of these four functions need to change - nothing
       else in this file (or any page script) has to know.
       ====================================================== */

    function callSpringGet(strAction, objParams)
    {
        // Future Spring Boot backend - GET not implemented yet
        return Promise.reject(new Error("Spring backend not implemented"));
    }

    function callSpringPost(strAction, objParams)
    {
        // Future Spring Boot backend - POST not implemented yet
        return Promise.reject(new Error("Spring backend not implemented"));
    }

    function callSpringPut(strAction, objParams)
    {
        // Future Spring Boot backend - PUT not implemented yet
        return Promise.reject(new Error("Spring backend not implemented"));
    }

    function callSpringDelete(strAction, objParams)
    {
        // Future Spring Boot backend - DELETE not implemented yet
        return Promise.reject(new Error("Spring backend not implemented"));
    }



    /* ======================================================
       Get Every Record for a Store

       strStoreName : AppConfig.STORES.STUDENT / CATEGORY / ...
       fnSuccess    : function(arrRecords)
       fnError      : function(objError)
       ====================================================== */

    function getAllRecords(strStoreName, fnSuccess, fnError)
    {
        /* CACHE LOOKUP TABLES (this pass) - see the note on
           objListCache above. Served from memory, wrapped in a
           resolved Promise so this still calls back asynchronously
           like every other branch of this function (callers that
           chain more logic after fnSuccess must not run before
           getAllRecords() "returns" here). */

        if (objListCache[strStoreName])
        {
            var arrCachedRecords = objListCache[strStoreName];

            Promise.resolve().then(function ()
            {
                fnSuccess(arrCachedRecords);
            });

            return;
        }

        var strMode = getBackendMode();

        // CHANGED: isIndexedDbMode() also covers the new INDEXEDDB alias, not just OFFLINE
        if (isIndexedDbMode(strMode) || CommonUtils.isOnline() === false)
        {
            StorageService.getAllRecords(strStoreName)
                .then(function (arrRecords)
                {
                    objListCache[strStoreName] = arrRecords;
                    fnSuccess(arrRecords);
                })
                .catch(fnError);

            return;
        }

        var objEntity = getEntityApiConfig(strStoreName);

        if (strMode === AppConfig.BACKEND.GOOGLE && objEntity)
        {
            /* PASS 4 (added): load the existing local cache FIRST
               and index it by id, so fromBackendFields() can fall
               back to a field's previous local value (e.g. Student
               roll_number/parent_mobile/parent_email) instead of
               that field being wiped out below whenever Google
               doesn't echo it back. See the PASS 4 note on the
               Student entity map above for why this matters. */

            StorageService.getAllRecords(strStoreName)
                .then(function (arrExistingRecords)
                {
                    var strIdField = getIdFieldName(strStoreName);

                    var objExistingById = {};

                    (arrExistingRecords || []).forEach(function (objExistingRecord)
                    {
                        /* Same reasoning as the row-conversion loop
                           below: one malformed/null record already
                           sitting in the local IndexedDB cache (e.g.
                           left over from an earlier bug) must not be
                           able to throw here and take the whole load
                           down with a visible "Unable to load
                           students" alert - just skip that one cached
                           record and keep indexing the rest. */
                        try
                        {
                            objExistingById[objExistingRecord[strIdField]] = objExistingRecord;
                        }
                        catch (objIndexError)
                        {
                            CommonUtils.logError("DataService.getAllRecords (skipping one malformed cached " + strStoreName + " record)", objIndexError);
                        }
                    });

                    /* --------------------------------------------------
                       LIST TRUNCATION FIX (root cause of "only 10 of
                       15 rows show up")

                       WHY: getStudents/getCategories/getSections/
                       getResults/getSessions in the real Apps Script
                       backend all paginate - var iPage =
                       parseInt(e.parameter.page || 1); var iPageSize =
                       parseInt(e.parameter.pageSize || 10) - and this
                       call used to send buildGoogleUrl(objEntity.
                       listAction, {}), i.e. no page/pageSize at all.
                       That is not "no pagination", it is "always page
                       1 of 10", so a sheet with 15 rows only ever
                       returned the first 10 - silently, with no error,
                       which is why it looked like data was missing
                       rather than failing to load.

                       WHAT: this app has no paged list UI anywhere
                       (AppConfig.DEFAULT_PAGE_SIZE was defined but
                       never once referenced before this fix) - every
                       page renders and searches the full list
                       client-side, so the fix is to explicitly ask
                       for one page big enough to always contain every
                       row, not to build real pagination end-to-end.
                       -------------------------------------------------- */

                    callGoogleGet(buildGoogleUrl(objEntity.listAction, {

                        page: 1,
                        pageSize: LIST_ALL_PAGE_SIZE

                    }), function (objResponse)
                    {
                        if (!objResponse || objResponse.success !== true)
                        {
                            CommonUtils.logError(
                                "DataService.getAllRecords (GOOGLE returned success:false, falling back to offline cache)",
                                objResponse ? objResponse.message : "no response body"
                            );

                            fnSuccess(arrExistingRecords);

                            return;
                        }

                        var arrRawRecords = (objResponse.data && objResponse.data[objEntity.listDataKey]) || [];

                        if (!Array.isArray(arrRawRecords))
                        {
                            arrRawRecords = [];
                        }

                        /* STUDENT LOADING FIX (root cause):
                           This used to be a plain arrRawRecords.map(...).
                           Array.prototype.map() has no per-item error
                           isolation - if converting even ONE row threw
                           (e.g. a blank/partially-filled row left behind
                           after manually adding/editing rows directly in
                           the Google Sheet, or a row missing the id
                           column), the exception propagated out of this
                           whole .then() callback. Because this callback
                           runs inside callGoogleGet()'s own promise chain
                           (fetch().then().then(fnSuccess).catch(fnError)),
                           that thrown error was being swallowed by
                           callGoogleGet's OWN internal catch two lines
                           below (the "GOOGLE unreachable, falling back to
                           offline cache" branch), which silently replaced
                           the entire freshly-fetched list with
                           arrExistingRecords - the last successful cache,
                           taken BEFORE the Sheet was updated. That is
                           exactly why, after adding new rows to the
                           Sheet, the Student List kept showing the old,
                           smaller count instead of throwing a visible
                           error: one bad row was quietly discarding all
                           15 good rows and falling back to a stale,
                           shorter cached list.

                           Fix: convert each row inside its own try/catch
                           so a single malformed row is skipped (and
                           logged) instead of taking down the entire
                           batch - every good row from the Sheet now
                           always reaches the UI. */

                        var arrRecords = [];

                        for (var intRowIndex = 0; intRowIndex < arrRawRecords.length; intRowIndex++)
                        {
                            try
                            {
                                var objBackendRecord = arrRawRecords[intRowIndex];

                                // TEMP DEBUG (remove after root-causing "Unnamed" on Dashboard):
                                if (strStoreName === AppConfig.STORES.STUDENT && intRowIndex === 0)
                                {
                                    console.log("[DEBUG] raw STUDENT record from backend:", objBackendRecord);
                                }

                                var objExisting = objExistingById[objBackendRecord[objEntity.idParam]];

                                arrRecords.push(normalizeRecordId(strStoreName, objEntity.fromBackendFields(objBackendRecord, objExisting)));
                            }
                            catch (objRowError)
                            {
                                CommonUtils.logError(
                                    "DataService.getAllRecords (skipping one malformed " + strStoreName + " row, row index " + intRowIndex + ")",
                                    objRowError
                                );
                            }
                        }

                        cacheListLocally(strStoreName, arrRecords);

                        objListCache[strStoreName] = arrRecords;

                        fnSuccess(arrRecords);
                    },
                    function (objError)
                    {
                        CommonUtils.logError("DataService.getAllRecords (GOOGLE unreachable, falling back to offline cache)", objError);

                        fnSuccess(arrExistingRecords);
                    });
                })
                .catch(fnError);

            return;
        }

        /* CHANGED (Spring switch added): mode is SPRING here (the
           only remaining possibility) - call the placeholder, which
           always rejects, and report that error instead of quietly
           reusing the IndexedDB cache the way this used to. Old
           fallback-to-cache behavior is commented out below in case
           it is ever wanted back before a real Spring backend exists. */

        callSpringGet("getAll_" + strStoreName, {})
            .catch(fnError);

        /* ---- OLD SPRING FALLBACK (commented out, not removed) ----
        StorageService.getAllRecords(strStoreName)
            .then(function (arrRecords)
            {
                objListCache[strStoreName] = arrRecords;
                fnSuccess(arrRecords);
            })
            .catch(fnError);
        ------------------------------------------------------------ */
    }



    /* ======================================================
       Get One Page of Records (real server-side pagination)

       WHY: getAllRecords() above always fetches the entire
       table (needed for dropdowns/lookups - Section's Category
       picker, Result's Student picker, etc. genuinely need every
       row). List *pages* do not - the Performance Optimization
       brief calls out fetching everything on every list view as
       the actual problem to undo. This is the real, page-at-a-
       time replacement used by the list pages themselves.

       WHAT: for a plain browse (no keyword), asks the backend
       for exactly one page via listAction with real page/
       pageSize params, and returns the page metadata
       (totalRecords/totalPages) the backend already computes.
       For a search, there is no paginated search endpoint on
       the backend (searchCategories/searchStudents/etc. all
       return every match at once) - so this fetches every
       match for the keyword once, then paginates that (usually
       much smaller) result set here on the client. That's a
       real, intentional tradeoff: browsing the full table is
       always a real per-page network call; searching within it
       costs one call for all matches, then pages through those
       in memory. Worth knowing if search ever needs to scale to
       a keyword that matches thousands of rows.

       strStoreName : AppConfig.STORES.CATEGORY / STUDENT / ...
       iPage        : 1-based page number being requested
       iPageSize    : rows per page
       strKeyword   : search text, or "" / null for a plain browse
       fnSuccess    : function({ records, totalRecords, totalPages,
                                  page, pageSize })
       fnError      : function(objError)
       ====================================================== */

    function getRecordsPage(strStoreName, iPage, iPageSize, strKeyword, fnSuccess, fnError)
    {
        var objEntity = getEntityApiConfig(strStoreName);

        if (!objEntity)
        {
            fnError(new Error("No paging configuration for '" + strStoreName + "'."));
            return;
        }

        // ADDED: read the active backend mode so this can branch, same as the other CRUD functions
        var strPageMode = getBackendMode();

        // ADDED: INDEXEDDB/OFFLINE branch - page and (optionally) search entirely on the local StorageService cache
        if (isIndexedDbMode(strPageMode))
        {
            getRecordsPageFromIndexedDb(strStoreName, iPage, iPageSize, strKeyword, fnSuccess, fnError);
            return;
        }

        // ADDED: SPRING branch - placeholder only, rejects clearly instead of calling Google
        if (strPageMode === AppConfig.BACKEND.SPRING)
        {
            callSpringGet("page_" + strStoreName, { page: iPage, pageSize: iPageSize, keyword: strKeyword })
                .catch(fnError);

            return;
        }

        if (CommonUtils.isOnline() === false)
        {
            fnError(new Error("You appear to be offline. Please connect to the internet to load this list."));
            return;
        }

        var blnIsSearch = !!(strKeyword && strKeyword.trim() !== "");

        /* Performance Optimization brief, Priority 5: log how long
           the backend call and the row conversion each take, so
           slow spots are visible instead of guessed at. Development-
           only - this is console.log, not user-facing UI. */
        var dRequestStartedAt = new Date().getTime();

        var fnHandleResponse = function (objResponse)
        {
            var dBackendElapsedMs = new Date().getTime() - dRequestStartedAt;

            if (!objResponse || objResponse.success !== true)
            {
                fnError(new Error((objResponse && objResponse.message) || ("Failed to load " + strStoreName + ".")));
                return;
            }

            var dConvertStartedAt = new Date().getTime();

            var arrRawRecords, iTotalRecords, iTotalPages, iActualPage;

            if (blnIsSearch)
            {
                var arrAllMatches = Array.isArray(objResponse.data) ? objResponse.data : [];

                iTotalRecords = arrAllMatches.length;
                iTotalPages = Math.max(1, Math.ceil(iTotalRecords / iPageSize));
                iActualPage = Math.min(Math.max(1, iPage), iTotalPages);

                var iSliceStart = (iActualPage - 1) * iPageSize;

                arrRawRecords = arrAllMatches.slice(iSliceStart, iSliceStart + iPageSize);
            }
            else
            {
                var objPageData = objResponse.data || {};

                arrRawRecords = Array.isArray(objPageData[objEntity.listDataKey]) ? objPageData[objEntity.listDataKey] : [];
                iTotalRecords = objPageData.totalRecords || arrRawRecords.length;
                iTotalPages = objPageData.totalPages || 1;
                iActualPage = objPageData.page || iPage;
            }

            var arrRecords = [];

            for (var intRowIndex = 0; intRowIndex < arrRawRecords.length; intRowIndex++)
            {
                try
                {
                    arrRecords.push(normalizeRecordId(strStoreName, objEntity.fromBackendFields(arrRawRecords[intRowIndex], {})));
                }
                catch (objRowError)
                {
                    CommonUtils.logError(
                        "DataService.getRecordsPage (skipping one malformed " + strStoreName + " row, row index " + intRowIndex + ")",
                        objRowError
                    );
                }
            }

            var dConvertElapsedMs = new Date().getTime() - dConvertStartedAt;

            console.log(
                "[Perf] " + strStoreName + " page " + iActualPage + " - " +
                "backend: " + dBackendElapsedMs + "ms, " +
                "rendering prep: " + dConvertElapsedMs + "ms, " +
                "records: " + arrRecords.length + "/" + iTotalRecords
            );

            fnSuccess({
                records: arrRecords,
                totalRecords: iTotalRecords,
                totalPages: iTotalPages,
                page: iActualPage,
                pageSize: iPageSize
            });
        };

        if (blnIsSearch)
        {
            if (!objEntity.searchAction)
            {
                fnError(new Error("Search is not available for this list yet."));
                return;
            }

            callGoogleGet(buildGoogleUrl(objEntity.searchAction, { keyword: strKeyword }), fnHandleResponse, fnError);
        }
        else
        {
            callGoogleGet(buildGoogleUrl(objEntity.listAction, { page: iPage, pageSize: iPageSize }), fnHandleResponse, fnError);
        }
    }



    /* ======================================================
       ADDED: Page (and Optionally Search) Records From
       IndexedDB Only

       Used by getRecordsPage() above whenever
       AppConfig.BACKEND_MODE (or the runtime override) is
       INDEXEDDB/OFFLINE. Reuses StorageService.getAllRecords()/
       searchRecords() - no IndexedDB logic is duplicated here,
       only pagination math over whatever StorageService returns.
       ====================================================== */

    function getRecordsPageFromIndexedDb(strStoreName, iPage, iPageSize, strKeyword, fnSuccess, fnError)
    {
        var blnIsSearch = !!(strKeyword && strKeyword.trim() !== "");

        var objRecordsPromise = blnIsSearch
            ? StorageService.searchRecords(strStoreName, strKeyword)
            : StorageService.getAllRecords(strStoreName);

        objRecordsPromise
            .then(function (arrAllRecords)
            {
                arrAllRecords = arrAllRecords || [];

                var iTotalRecords = arrAllRecords.length;
                var iTotalPages = Math.max(1, Math.ceil(iTotalRecords / iPageSize));
                var iActualPage = Math.min(Math.max(1, iPage), iTotalPages);
                var iSliceStart = (iActualPage - 1) * iPageSize;

                fnSuccess({
                    records: arrAllRecords.slice(iSliceStart, iSliceStart + iPageSize),
                    totalRecords: iTotalRecords,
                    totalPages: iTotalPages,
                    page: iActualPage,
                    pageSize: iPageSize
                });
            })
            .catch(fnError);
    }



    /* ======================================================
       Get a Single Record By Id

       strStoreName : AppConfig.STORES.STUDENT / CATEGORY / ...
       mId          : the record's own id (e.g. student_id)
       fnSuccess    : function(objRecord | null)
       fnError      : function(objError)
       ====================================================== */

    function getRecordById(strStoreName, mId, fnSuccess, fnError)
    {
        var strMode = getBackendMode();

        // CHANGED: isIndexedDbMode() also covers the new INDEXEDDB alias, not just OFFLINE
        if (isIndexedDbMode(strMode) || CommonUtils.isOnline() === false)
        {
            StorageService.getRecordById(strStoreName, mId)
                .then(fnSuccess)
                .catch(fnError);

            return;
        }

        // ADDED: explicit SPRING branch - placeholder only, rejects clearly
        if (strMode === AppConfig.BACKEND.SPRING)
        {
            callSpringGet("getById_" + strStoreName, { id: mId })
                .catch(fnError);

            return;
        }

        var objEntity = getEntityApiConfig(strStoreName);

        if (strMode === AppConfig.BACKEND.GOOGLE && objEntity)
        {
            var objIdParams = {};
            objIdParams[objEntity.idParam] = mId;

            /* PASS 4 (added): same reasoning as getAllRecords()
               above - load the existing local record first so it
               can be passed into fromBackendFields() as a
               fallback source for fields Google doesn't return. */

            StorageService.getRecordById(strStoreName, mId)
                .then(function (objExistingRecord)
                {
                    callGoogleGet(buildGoogleUrl(objEntity.getByIdAction, objIdParams), function (objResponse)
                    {
                        if (!objResponse || objResponse.success !== true)
                        {
                            CommonUtils.logError(
                                "DataService.getRecordById (GOOGLE returned success:false, falling back to offline cache)",
                                objResponse ? objResponse.message : "no response body"
                            );

                            fnSuccess(objExistingRecord);

                            return;
                        }

                        var objRecord = objResponse.data ?
                            normalizeRecordId(strStoreName, objEntity.fromBackendFields(objResponse.data, objExistingRecord)) :
                            null;

                        fnSuccess(objRecord);
                    },
                    function (objError)
                    {
                        CommonUtils.logError("DataService.getRecordById (GOOGLE unreachable, falling back to offline cache)", objError);

                        fnSuccess(objExistingRecord);
                    });
                })
                .catch(fnError);

            return;
        }

        StorageService.getRecordById(strStoreName, mId)
            .then(fnSuccess)
            .catch(fnError);
    }



    /* ======================================================
       Queue an Offline Change

       Remembers an add/update/delete that could not reach the
       real backend right now, so synchronizePendingChanges()
       can replay it later. See StorageService's Sync Queue
       functions.
       ====================================================== */

    function queueOfflineChange(strStoreName, strOperation, objData)
    {
        StorageService.addToSyncQueue(
        {
            storeName: strStoreName,
            operation: strOperation,
            data: objData,
            queuedOn: CommonUtils.getCurrentTimestamp()
        })
            .catch(function (objError)
            {
                CommonUtils.logError("DataService.queueOfflineChange", objError);
            });
    }



    /* ======================================================
       Add a New Record

       strStoreName : AppConfig.STORES.STUDENT / CATEGORY / ...
       objRecord    : the record built by the Add form
       fnSuccess    : function(objSavedRecord)
       fnError      : function(objError)
       ====================================================== */

    function addRecord(strStoreName, objRecord, fnSuccess, fnError)
    {
        /* CACHE LOOKUP TABLES (this pass): a new row is being
           added to this store, so the cached full-table copy
           (if any) is now stale - see objListCache above. Cleared
           up front so the very next getAllRecords(strStoreName)
           call (by this page or any other) fetches fresh data
           instead of missing the new row. */

        invalidateListCache(strStoreName);

        var strMode = getBackendMode();

        var objEntity = getEntityApiConfig(strStoreName);

        if (strMode === AppConfig.BACKEND.GOOGLE && CommonUtils.isOnline() === true && objEntity)
        {
            callGoogleGet(buildGoogleUrl(objEntity.addAction, objEntity.toBackendFields(objRecord)), function (objResponse)
            {
                if (!objResponse || objResponse.success !== true)
                {
                    CommonUtils.logError(
                        "DataService.addRecord (GOOGLE rejected the record, saving offline instead)",
                        objResponse ? objResponse.message : "no response body"
                    );

                    if (fnError)
                    {
                        fnError(new Error(objResponse ? objResponse.message : "Add failed."));
                    }

                    return;
                }

                /* Code.gs only returns the new record's own id
                   (e.g. { studentId: "ST123..." }), not the whole
                   saved row - so the record already built from the
                   form is what gets kept, with the real id merged
                   in. */

                var strIdField = getIdFieldName(strStoreName);

                objRecord[strIdField] = objResponse.data ? objResponse.data[objEntity.idParam] : objRecord[strIdField];

                normalizeRecordId(strStoreName, objRecord);

                StorageService.addRecord(strStoreName, objRecord)
                    .catch(function (objError)
                    {
                        CommonUtils.logError("DataService.addRecord (local cache write)", objError);
                    });

                fnSuccess(objRecord);
            },
            function (objError)
            {
                CommonUtils.logError("DataService.addRecord (GOOGLE unreachable, saving offline)", objError);

                saveRecordOfflineAsNew(strStoreName, objRecord, fnSuccess, fnError);
            });

            return;
        }

        // ADDED: explicit SPRING branch - placeholder only, rejects clearly instead of queuing offline
        if (strMode === AppConfig.BACKEND.SPRING)
        {
            callSpringPost("add_" + strStoreName, objEntity ? objEntity.toBackendFields(objRecord) : objRecord)
                .catch(function (objError)
                {
                    if (fnError)
                    {
                        fnError(objError);
                    }
                });

            return;
        }

        /* CHANGED comment: OFFLINE/INDEXEDDB mode, or GOOGLE but the
           device itself is offline: save locally right away and
           queue the change so it is not lost. (SPRING no longer
           falls through to here - see the branch added just above.) */

        saveRecordOfflineAsNew(strStoreName, objRecord, fnSuccess, fnError);
    }



    /* ======================================================
       Save a New Record Only to IndexedDB, and Queue It

       Used by addRecord() whenever the real backend cannot be
       reached right now.
       ====================================================== */

    function saveRecordOfflineAsNew(strStoreName, objRecord, fnSuccess, fnError)
    {
        StorageService.addRecord(strStoreName, objRecord)
            .then(function (numGeneratedId)
            {
                objRecord.id = numGeneratedId;

                var strIdField = getIdFieldName(strStoreName);

                if (!objRecord[strIdField] || objRecord[strIdField] === "0")
                {
                    objRecord[strIdField] = numGeneratedId;
                }

                queueOfflineChange(strStoreName, "ADD", objRecord);

                fnSuccess(objRecord);
            })
            .catch(fnError);
    }



    /* ======================================================
       Update an Existing Record

       strStoreName : AppConfig.STORES.STUDENT / CATEGORY / ...
       objRecord    : must already contain its own id field
                      (e.g. student_id)
       fnSuccess    : function(objSavedRecord)
       fnError      : function(objError)
       ====================================================== */

    function updateRecord(strStoreName, objRecord, fnSuccess, fnError)
    {
        /* CACHE LOOKUP TABLES (this pass) - see the matching
           note in addRecord() above. */

        invalidateListCache(strStoreName);

        normalizeRecordId(strStoreName, objRecord);

        var strMode = getBackendMode();

        var objEntity = getEntityApiConfig(strStoreName);

        if (strMode === AppConfig.BACKEND.GOOGLE && CommonUtils.isOnline() === true && objEntity)
        {
            callGoogleGet(buildGoogleUrl(objEntity.updateAction, objEntity.toBackendFields(objRecord)), function (objResponse)
            {
                if (!objResponse || objResponse.success !== true)
                {
                    CommonUtils.logError(
                        "DataService.updateRecord (GOOGLE rejected the record, saving offline instead)",
                        objResponse ? objResponse.message : "no response body"
                    );

                    if (fnError)
                    {
                        fnError(new Error(objResponse ? objResponse.message : "Update failed."));
                    }

                    return;
                }

                StorageService.updateRecord(strStoreName, objRecord)
                    .catch(function (objError)
                    {
                        CommonUtils.logError("DataService.updateRecord (local cache write)", objError);
                    });

                fnSuccess(objRecord);
            },
            function (objError)
            {
                CommonUtils.logError("DataService.updateRecord (GOOGLE unreachable, saving offline)", objError);

                saveRecordOfflineAsUpdate(strStoreName, objRecord, fnSuccess, fnError);
            });

            return;
        }

        // ADDED: explicit SPRING branch - placeholder only, rejects clearly instead of queuing offline
        if (strMode === AppConfig.BACKEND.SPRING)
        {
            callSpringPut("update_" + strStoreName, objEntity ? objEntity.toBackendFields(objRecord) : objRecord)
                .catch(function (objError)
                {
                    if (fnError)
                    {
                        fnError(objError);
                    }
                });

            return;
        }

        saveRecordOfflineAsUpdate(strStoreName, objRecord, fnSuccess, fnError);
    }



    /* ======================================================
       Save an Updated Record Only to IndexedDB, and Queue It
       ====================================================== */

    function saveRecordOfflineAsUpdate(strStoreName, objRecord, fnSuccess, fnError)
    {
        StorageService.updateRecord(strStoreName, objRecord)
            .then(function ()
            {
                queueOfflineChange(strStoreName, "UPDATE", objRecord);

                fnSuccess(objRecord);
            })
            .catch(fnError);
    }



    /* ======================================================
       Delete a Record By Id

       strStoreName : AppConfig.STORES.STUDENT / CATEGORY / ...
       mId          : the record's own id (e.g. student_id)
       fnSuccess    : function()
       fnError      : function(objError)
       ====================================================== */

    function deleteRecord(strStoreName, mId, fnSuccess, fnError)
    {
        /* CACHE LOOKUP TABLES (this pass) - see the matching
           note in addRecord() above. */

        invalidateListCache(strStoreName);

        var strMode = getBackendMode();

        var objEntity = getEntityApiConfig(strStoreName);

        if (strMode === AppConfig.BACKEND.GOOGLE && CommonUtils.isOnline() === true && objEntity)
        {
            var objDeleteParams = {};
            objDeleteParams[objEntity.idParam] = mId;

            callGoogleGet(buildGoogleUrl(objEntity.deleteAction, objDeleteParams), function (objResponse)
            {
                if (!objResponse || objResponse.success !== true)
                {
                    CommonUtils.logError(
                        "DataService.deleteRecord (GOOGLE rejected the delete)",
                        objResponse ? objResponse.message : "no response body"
                    );

                    if (fnError)
                    {
                        fnError(new Error(objResponse ? objResponse.message : "Delete failed."));
                    }

                    return;
                }

                StorageService.deleteRecordById(strStoreName, mId)
                    .catch(function (objError)
                    {
                        CommonUtils.logError("DataService.deleteRecord (local cache write)", objError);
                    });

                fnSuccess();
            },
            function (objError)
            {
                CommonUtils.logError("DataService.deleteRecord (GOOGLE unreachable, queuing offline)", objError);

                deleteRecordOffline(strStoreName, mId, fnSuccess, fnError);
            });

            return;
        }

        // ADDED: explicit SPRING branch - placeholder only, rejects clearly instead of queuing offline
        if (strMode === AppConfig.BACKEND.SPRING)
        {
            var objSpringDeleteParams = {};
            objSpringDeleteParams[objEntity ? objEntity.idParam : "id"] = mId;

            callSpringDelete("delete_" + strStoreName, objSpringDeleteParams)
                .catch(function (objError)
                {
                    if (fnError)
                    {
                        fnError(objError);
                    }
                });

            return;
        }

        deleteRecordOffline(strStoreName, mId, fnSuccess, fnError);
    }



    /* ======================================================
       Delete a Record Only From IndexedDB, and Queue It
       ====================================================== */

    function deleteRecordOffline(strStoreName, mId, fnSuccess, fnError)
    {
        StorageService.deleteRecordById(strStoreName, mId)
            .then(function ()
            {
                queueOfflineChange(strStoreName, "DELETE", { id: mId });

                fnSuccess();
            })
            .catch(fnError);
    }



    /* ======================================================
       Synchronize Pending Changes

       Called automatically by common.js whenever the device
       comes back online. Replays every queued change against
       the real backend, in the order it was queued, and stops
       at the first failure so nothing is replayed out of
       order (the rest stay queued for next time).

       fnDone : optional function(intSyncedCount) called once
                every queued item has been tried.
       ====================================================== */

    function synchronizePendingChanges(fnDone)
    {
        var strMode = getBackendMode();

        if (strMode !== AppConfig.BACKEND.GOOGLE || CommonUtils.isOnline() === false)
        {
            if (fnDone)
            {
                fnDone(0);
            }

            return;
        }

        StorageService.getSyncQueue()
            .then(function (arrQueue)
            {
                replayNext(0, arrQueue, fnDone);
            })
            .catch(function (objError)
            {
                CommonUtils.logError("DataService.synchronizePendingChanges", objError);

                if (fnDone)
                {
                    fnDone(0);
                }
            });
    }



    /* ======================================================
       Replay One Queued Change, Then Move to the Next
       ====================================================== */

    function replayNext(intIndex, arrQueue, fnDone)
    {
        if (intIndex >= arrQueue.length)
        {
            if (fnDone)
            {
                fnDone(intIndex);
            }

            return;
        }

        var objQueueItem = arrQueue[intIndex];

        var objEntity = getEntityApiConfig(objQueueItem.storeName);

        if (!objEntity)
        {
            /* Nothing this file knows how to replay for this
               store (e.g. Users) - drop it rather than retrying
               forever. */

            StorageService.removeFromSyncQueue(objQueueItem.id)
                .then(function ()
                {
                    replayNext(intIndex + 1, arrQueue, fnDone);
                })
                .catch(function ()
                {
                    replayNext(intIndex + 1, arrQueue, fnDone);
                });

            return;
        }

        var strAction;
        var objParams;

        if (objQueueItem.operation === "ADD")
        {
            strAction = objEntity.addAction;
            objParams = objEntity.toBackendFields(objQueueItem.data);
        }
        else if (objQueueItem.operation === "UPDATE")
        {
            strAction = objEntity.updateAction;
            objParams = objEntity.toBackendFields(objQueueItem.data);
        }
        else
        {
            strAction = objEntity.deleteAction;
            objParams = {};
            objParams[objEntity.idParam] = objQueueItem.data ? objQueueItem.data.id : undefined;
        }

        callGoogleGet(buildGoogleUrl(strAction, objParams),
        function (objResponse)
        {
            if (!objResponse || objResponse.success !== true)
            {
                CommonUtils.logError(
                    "DataService.replayNext (GOOGLE rejected the queued change, will retry later)",
                    objResponse ? objResponse.message : "no response body"
                );

                if (fnDone)
                {
                    fnDone(intIndex);
                }

                return;
            }

            StorageService.removeFromSyncQueue(objQueueItem.id)
                .then(function ()
                {
                    /* CACHE LOOKUP TABLES (this pass): the queued
                       change just reached Google, so this store's
                       cached full-table copy (if any) is stale -
                       see objListCache above. */

                    invalidateListCache(objQueueItem.storeName);

                    replayNext(intIndex + 1, arrQueue, fnDone);
                })
                .catch(function (objError)
                {
                    CommonUtils.logError("DataService.replayNext (remove from queue)", objError);
                    replayNext(intIndex + 1, arrQueue, fnDone);
                });
        },
        function (objError)
        {
            CommonUtils.logError("DataService.replayNext (still unreachable, will retry later)", objError);

            if (fnDone)
            {
                fnDone(intIndex);
            }
        });
    }



    /* ======================================================
       Log In

       CONNECTION FIX: login.js previously never called the
       backend at all - it called Session.login(strUsername)
       and declared success unconditionally, so ANY username/
       password combination "worked" without ever checking the
       Users sheet. This calls Code.gs's real `login` action
       (see Login.gs) and only succeeds if Code.gs says so.

       strUsername / strPassword : from the login form
       fnSuccess : function(objUser) - userId/username/fullName/
                   role/status, exactly as Login.gs returns it
       fnError   : function(objError)
       ====================================================== */

    function login(strUsername, strPassword, fnSuccess, fnError)
    {
        // ADDED: switch by backend mode, per the switchable backend architecture
        var strLoginMode = getBackendMode();

        // ADDED: INDEXEDDB/OFFLINE has no local Users store to authenticate against
        if (isIndexedDbMode(strLoginMode))
        {
            fnError(new Error("Login requires an online backend (Google or Spring). IndexedDB mode does not support login."));
            return;
        }

        // ADDED: SPRING branch - placeholder only, rejects clearly
        if (strLoginMode === AppConfig.BACKEND.SPRING)
        {
            callSpringPost("login", { username: strUsername, password: strPassword })
                .catch(fnError);

            return;
        }

        // ---- existing GOOGLE logic below, unchanged ----

        if (CommonUtils.isOnline() === false)
        {
            fnError(new Error("You appear to be offline. Please connect to the internet to log in."));
            return;
        }

        callGoogleGet(buildGoogleUrl("login", { username: strUsername, password: strPassword }), function (objResponse)
        {
            if (!objResponse || objResponse.success !== true)
            {
                fnError(new Error(objResponse ? objResponse.message : "Login failed."));
                return;
            }

            fnSuccess(objResponse.data);
        },
        function (objError)
        {
            CommonUtils.logError("DataService.login (GOOGLE unreachable)", objError);

            fnError(objError);
        });
    }



    /* ======================================================
       Create Account (Sign Up)

       BUG FIX: signup.js previously only validated the form
       and then showed "Account created!" without ever sending
       the new username/password anywhere, so nothing was saved
       and the account could never log in afterwards. This calls
       a new `createAccount` action on the same Google Apps
       Script backend `login` already uses (same URL, same
       callGoogleGet/buildGoogleUrl helpers), so the Users
       sheet/table is the single source of truth for both
       Sign Up and Login.

       NOTE: this requires a `createAccount` action to exist in
       the Apps Script project (alongside the existing `login`
       action) that: 1) rejects the request if the username
       already exists, 2) otherwise appends a new row to the
       Users sheet, 3) responds with the same
       { success, message, data } shape `login` already uses.
       That server-side action lives outside this repo (Apps
       Script project), so it isn't part of this change - see
       chat for the exact snippet to paste into Code.gs.

       strUsername / strPassword : from the sign up form
       fnSuccess : function(objUser)
       fnError   : function(objError) - includes the duplicate-
                   username case, since that must be decided by
                   the backend (the only place that can see the
                   full Users list)
       ====================================================== */

    function createAccount(strUsername, strPassword, fnSuccess, fnError)
    {
        // ADDED: switch by backend mode, per the switchable backend architecture
        var strCreateMode = getBackendMode();

        // ADDED: INDEXEDDB/OFFLINE has no local Users store to create accounts against
        if (isIndexedDbMode(strCreateMode))
        {
            fnError(new Error("Sign up requires an online backend (Google or Spring). IndexedDB mode does not support account creation."));
            return;
        }

        // ADDED: SPRING branch - placeholder only, rejects clearly
        if (strCreateMode === AppConfig.BACKEND.SPRING)
        {
            callSpringPost("createAccount", { username: strUsername, password: strPassword })
                .catch(fnError);

            return;
        }

        // ---- existing GOOGLE logic below, unchanged ----

        if (CommonUtils.isOnline() === false)
        {
            fnError(new Error("You appear to be offline. Please connect to the internet to sign up."));
            return;
        }

        callGoogleGet(buildGoogleUrl("createAccount", { username: strUsername, password: strPassword }), function (objResponse)
        {
            if (!objResponse || objResponse.success !== true)
            {
                fnError(new Error(objResponse ? objResponse.message : "Could not create account."));
                return;
            }

            fnSuccess(objResponse.data);
        },
        function (objError)
        {
            CommonUtils.logError("DataService.createAccount (GOOGLE unreachable)", objError);

            fnError(objError);
        });
    }



    /* ======================================================
       Change Password

       WHY: Profile.script.js's Change Password form used to
       validate the fields and then just show "Looks good!
       ...once the backend is ready." - it never actually
       changed anything, because there was no backend action
       for it yet. This is that missing piece, built exactly
       the same way login()/createAccount() above call the
       Google Apps Script backend, so Change Password checks
       the CURRENT password against the real Users sheet
       before writing the new one - it cannot be bypassed by
       editing the page.

       NOTE: matches the real Login.gs, which reads
       e.parameter.oldPassword (not currentPassword) - see the
       buildGoogleUrl() call below. Sending the wrong key here
       was the actual cause of "All fields are required.": the
       backend's own validation checks oldPassword specifically,
       and got undefined for it on every request regardless of
       what the user typed, so it always fell into that error.

       strUsername        : the logged-in user (Session.getUsername())
       strCurrentPassword  : typed into the "Current Password" field
       strNewPassword      : typed into the "New Password" field
       fnSuccess : function(objResult)
       fnError   : function(objError) - includes the wrong-current-
                   password case, since only the backend can see
                   the real stored password to check it against
       ====================================================== */

    function changePassword(strUsername, strCurrentPassword, strNewPassword, fnSuccess, fnError)
    {
        // ADDED: switch by backend mode, per the switchable backend architecture
        var strChangePwMode = getBackendMode();

        // ADDED: INDEXEDDB/OFFLINE has no local Users store to change passwords against
        if (isIndexedDbMode(strChangePwMode))
        {
            fnError(new Error("Changing your password requires an online backend (Google or Spring). IndexedDB mode does not support this."));
            return;
        }

        // ADDED: SPRING branch - placeholder only, rejects clearly
        if (strChangePwMode === AppConfig.BACKEND.SPRING)
        {
            callSpringPost("changePassword", {
                username: strUsername,
                oldPassword: strCurrentPassword,
                newPassword: strNewPassword
            }).catch(fnError);

            return;
        }

        // ---- existing GOOGLE logic below, unchanged ----

        if (CommonUtils.isOnline() === false)
        {
            fnError(new Error("You appear to be offline. Please connect to the internet to change your password."));
            return;
        }

        callGoogleGet(buildGoogleUrl("changePassword", {
            username: strUsername,
            oldPassword: strCurrentPassword,
            newPassword: strNewPassword
        }), function (objResponse)
        {
            if (!objResponse || objResponse.success !== true)
            {
                fnError(new Error(objResponse ? objResponse.message : "Could not change password."));
                return;
            }

            fnSuccess(objResponse.data);
        },
        function (objError)
        {
            CommonUtils.logError("DataService.changePassword (GOOGLE unreachable)", objError);

            fnError(objError);
        });
    }



    /* ======================================================
       Forgot Password - Step 1: Verify Username Exists

       WHY: this project's Users sheet has no email column
       (see the User entity map above - fromBackendFields only
       ever reads username/fullName/role/status/lastLogin), so
       Forgot Password can only identify an account by
       username. Before the Forgot Password modal ever shows a
       New Password field, it must confirm the typed username
       is a real row in the Users sheet - otherwise anyone
       could "reset" a password for a username that doesn't
       exist, or silently create confusion about which account
       just got its password changed.

       NOTE: requires a `verifyUsername` action in the Apps
       Script project (Code.gs / Login.gs), alongside the
       existing `login` / `createAccount` / `changePassword`
       actions, that:
         1. searches the Users sheet for e.parameter.username,
         2. responds { success: true, data: { exists: true,
            username } } if found,
         3. responds { success: false, message: "Username not
            found." } otherwise.
       That server-side action lives outside this repo (Apps
       Script project) - see the matching Code.gs snippet.

       strUsername : typed into the Forgot Password modal
       fnSuccess   : function(objResult)
       fnError     : function(objError) - includes the
                     username-not-found case, since only the
                     backend can see the real Users sheet
       ====================================================== */

    function verifyUsernameExists(strUsername, fnSuccess, fnError)
    {
        // ADDED: switch by backend mode, per the switchable backend architecture
        var strVerifyMode = getBackendMode();

        // ADDED: INDEXEDDB/OFFLINE has no local Users store to verify against
        if (isIndexedDbMode(strVerifyMode))
        {
            fnError(new Error("Verifying a username requires an online backend (Google or Spring). IndexedDB mode does not support this."));
            return;
        }

        // ADDED: SPRING branch - placeholder only, rejects clearly
        if (strVerifyMode === AppConfig.BACKEND.SPRING)
        {
            callSpringGet("verifyUsername", { username: strUsername })
                .catch(fnError);

            return;
        }

        // ---- existing GOOGLE logic below, unchanged ----

        if (CommonUtils.isOnline() === false)
        {
            fnError(new Error("You appear to be offline. Please connect to the internet to reset your password."));
            return;
        }

        callGoogleGet(buildGoogleUrl("verifyUsername", { username: strUsername }), function (objResponse)
        {
            if (!objResponse || objResponse.success !== true)
            {
                fnError(new Error(objResponse ? objResponse.message : "Username not found."));
                return;
            }

            fnSuccess(objResponse.data);
        },
        function (objError)
        {
            CommonUtils.logError("DataService.verifyUsernameExists (GOOGLE unreachable)", objError);

            fnError(objError);
        });
    }



    /* ======================================================
       Forgot Password - Step 2: Reset the Password

       WHY: once verifyUsernameExists() above has confirmed the
       account is real, this actually updates the Users sheet
       with the new password the person just chose - the last
       step of the "no email column" Forgot Password flow
       (Enter Username -> Verify Username Exists -> Enter New
       Password/Confirm -> Update Users Sheet -> success ->
       back to Login).

       Deliberately does NOT ask for (or check) the current/old
       password - that's the whole point of Forgot Password, as
       opposed to Profile's Change Password (see
       DataService.changePassword() above), which does require
       it. Only login.js's Forgot Password modal is expected to
       call this, and only ever with the exact username
       verifyUsernameExists() already confirmed - see
       strFpVerifiedUsername in login.js.

       NOTE: requires a `resetPassword` action in the Apps
       Script project (Code.gs / Login.gs), alongside
       `verifyUsername` above, that:
         1. searches the Users sheet for e.parameter.username,
         2. responds { success: false, message: "Username not
            found." } if it isn't there,
         3. otherwise overwrites that row's Password column
            with e.parameter.newPassword,
         4. responds { success: true, message: "Password
            updated successfully." } - matching resetPassword(
            username, newPassword) in the chat snippet.

       strUsername    : the username confirmed by
                         verifyUsernameExists() (Step 1)
       strNewPassword : typed into the Forgot Password modal's
                         New Password field (Step 2)
       fnSuccess : function(objResult)
       fnError   : function(objError)
       ====================================================== */

    function resetPassword(strUsername, strNewPassword, fnSuccess, fnError)
    {
        // ADDED: switch by backend mode, per the switchable backend architecture
        var strResetMode = getBackendMode();

        // ADDED: INDEXEDDB/OFFLINE has no local Users store to reset passwords against
        if (isIndexedDbMode(strResetMode))
        {
            fnError(new Error("Resetting your password requires an online backend (Google or Spring). IndexedDB mode does not support this."));
            return;
        }

        // ADDED: SPRING branch - placeholder only, rejects clearly
        if (strResetMode === AppConfig.BACKEND.SPRING)
        {
            callSpringPost("resetPassword", { username: strUsername, newPassword: strNewPassword })
                .catch(fnError);

            return;
        }

        // ---- existing GOOGLE logic below, unchanged ----

        if (CommonUtils.isOnline() === false)
        {
            fnError(new Error("You appear to be offline. Please connect to the internet to reset your password."));
            return;
        }

        callGoogleGet(buildGoogleUrl("resetPassword", {
            username: strUsername,
            newPassword: strNewPassword

        }), function (objResponse)
        {
            if (!objResponse || objResponse.success !== true)
            {
                fnError(new Error(objResponse ? objResponse.message : "Could not update password."));
                return;
            }

            fnSuccess(objResponse.data);
        },
        function (objError)
        {
            CommonUtils.logError("DataService.resetPassword (GOOGLE unreachable)", objError);

            fnError(objError);
        });
    }



    /* ======================================================
       Register Biometric Credential

       Called by login.js right after BiometricService has
       already created/enrolled the credential on THIS device.
       This function's only job is to tell the backend that
       credential belongs to strUsername, so a later
       loginWithBiometric() call from any device can be
       checked against the Users sheet - never bypassing
       DataService/Google the way a device-only check would.

       strUsername    : the account this credential unlocks
       strCredentialId : the WebAuthn credential id (fingerprint)
                        or JSON-encoded face descriptor (face),
                        exactly as BiometricService produced it
       strType        : AppConfig.BIOMETRIC.TYPE.FINGERPRINT or
                        .FACE
       fnSuccess      : function(objUser)
       fnError        : function(objError)
       ====================================================== */

    function registerBiometric(strUsername, strCredentialId, strType, fnSuccess, fnError)
    {
        // ADDED: switch by backend mode, per the switchable backend architecture
        var strRegisterMode = getBackendMode();

        // ADDED: INDEXEDDB/OFFLINE has no Users sheet to save the credential
        // against - the credential is already saved locally by
        // BiometricService, so there is nothing further to do here.
        if (isIndexedDbMode(strRegisterMode))
        {
            fnSuccess({ username: strUsername });
            return;
        }

        // ADDED: SPRING branch - placeholder only, rejects clearly
        if (strRegisterMode === AppConfig.BACKEND.SPRING)
        {
            callSpringPost("registerBiometric", { username: strUsername, credentialId: strCredentialId, type: strType })
                .catch(fnError);

            return;
        }

        // ---- GOOGLE: same buildGoogleUrl/callGoogleGet pattern login() uses ----

        if (CommonUtils.isOnline() === false)
        {
            fnError(new Error("You appear to be offline. Please connect to the internet to register biometric login."));
            return;
        }

        callGoogleGet(buildGoogleUrl("registerBiometric", {
            username: strUsername,
            credentialId: strCredentialId,
            type: strType

        }), function (objResponse)
        {
            if (!objResponse || objResponse.success !== true)
            {
                fnError(new Error(objResponse ? objResponse.message : "Could not register biometric login."));
                return;
            }

            fnSuccess(objResponse.data);
        },
        function (objError)
        {
            CommonUtils.logError("DataService.registerBiometric (GOOGLE unreachable)", objError);

            fnError(objError);
        });
    }



    /* ======================================================
       Log In With a Biometric Credential

       Called by login.js after BiometricService's
       authenticateFingerprint()/authenticateFace() confirms the
       device's own biometric matched. This is the step that
       decides whether that credential is actually still valid
       for strUsername - never Session.login() directly, per
       the mentor's "never bypass DataService" rule.

       strUsername    : BiometricService.getRegisteredUsername()
                        - which account this device's credential
                        belongs to
       strCredentialId : BiometricService's stored credential id
                        / descriptor for that device
       fnSuccess      : function(objUser) - same shape login()
                        returns (userId/username/fullName/role/
                        status), so login.js can call
                        Session.login(objUser.username, objUser.role)
                        exactly the same way for both paths
       fnError        : function(objError)
       ====================================================== */

    function loginWithBiometric(strUsername, strCredentialId, fnSuccess, fnError)
    {
        // ADDED: switch by backend mode, per the switchable backend architecture
        var strLoginMode = getBackendMode();

        // ADDED: INDEXEDDB/OFFLINE - check the locally cached Users
        // store instead of a network call. The credential itself was
        // already confirmed by BiometricService (device-level check);
        // this only re-confirms the account still exists and is Active,
        // same "Credential Exists?" step the online path performs.
        if (isIndexedDbMode(strLoginMode))
        {
            StorageService.getAllRecords(AppConfig.STORES.USER)
                .then(function (arrUsers)
                {
                    var objMatch = null;

                    for (var intIndex = 0; intIndex < arrUsers.length; intIndex++)
                    {
                        if (arrUsers[intIndex].username &&
                            arrUsers[intIndex].username.toLowerCase() === strUsername.toLowerCase())
                        {
                            objMatch = arrUsers[intIndex];
                            break;
                        }
                    }

                    if (!objMatch || objMatch.status !== "Active")
                    {
                        fnError(new Error("Biometric login failed. Please log in with your username and password."));
                        return;
                    }

                    fnSuccess({
                        userId: objMatch.user_id,
                        username: objMatch.username,
                        fullName: objMatch.fullName,
                        role: objMatch.role,
                        status: objMatch.status
                    });
                })
                .catch(fnError);

            return;
        }

        // ADDED: SPRING branch - placeholder only, rejects clearly
        if (strLoginMode === AppConfig.BACKEND.SPRING)
        {
            callSpringPost("loginBiometric", { username: strUsername, credentialId: strCredentialId })
                .catch(fnError);

            return;
        }

        // ---- GOOGLE: same buildGoogleUrl/callGoogleGet pattern login() uses ----

        if (CommonUtils.isOnline() === false)
        {
            fnError(new Error("You appear to be offline. Please connect to the internet to log in."));
            return;
        }

        callGoogleGet(buildGoogleUrl("loginBiometric", {
            username: strUsername,
            credentialId: strCredentialId

        }), function (objResponse)
        {
            if (!objResponse || objResponse.success !== true)
            {
                fnError(new Error(objResponse ? objResponse.message : "Biometric login failed."));
                return;
            }

            fnSuccess(objResponse.data);
        },
        function (objError)
        {
            CommonUtils.logError("DataService.loginWithBiometric (GOOGLE unreachable)", objError);

            fnError(objError);
        });
    }



    /* ======================================================
       Seed Sample / Test Data (Task 5)

       Adds a small, realistic set of Categories, Sections,
       Students and Results through the exact same addRecord()
       path used by the Add forms, so this is a genuine
       end-to-end test of whichever backend is currently
       selected (see DataService.getBackendMode()) - not mock
       data that bypasses the app.

       fnSuccess : function(objSummary) - counts of what was added
       fnError   : function(objError)
       ====================================================== */

    function seedSampleData(fnSuccess, fnError)
    {
        var arrCategories =
        [
            { category_id: "0", name: "Science", organization_id: "0" },
            { category_id: "0", name: "Commerce", organization_id: "0" }
        ];

        var arrSections =
        [
            { section_id: "0", name: "Section A" },
            { section_id: "0", name: "Section B" }
        ];

        var arrStudents =
        [
            {
                student_id: "0", category_id: "0", section_id: "0",
                name: "Aarav Sharma", roll_number: "S-1001",
                mobile: "9800000001", email: "aarav@example.com",
                parent_mobile: "9800000101", telegram: "@aaravsharma",
                parent_email: "parent.aarav@example.com"
            },
            {
                student_id: "0", category_id: "0", section_id: "0",
                name: "Priya Thapa", roll_number: "S-1002",
                mobile: "9800000002", email: "priya@example.com",
                parent_mobile: "9800000102", telegram: "@priyathapa",
                parent_email: "parent.priya@example.com"
            }
        ];

        var arrResults =
        [
            { result_id: "0", exam_name: "Mid Term", date_of_exam: "2026-06-01", total_marks: "100", marks_obtained: "82" },
            { result_id: "0", exam_name: "Final Term", date_of_exam: "2026-07-01", total_marks: "100", marks_obtained: "91" }
        ];

        var objSummary = { categories: 0, sections: 0, students: 0, results: 0 };

        addAllThen(AppConfig.STORES.CATEGORY, arrCategories, "categories", function ()
        {
            addAllThen(AppConfig.STORES.SECTION, arrSections, "sections", function ()
            {
                addAllThen(AppConfig.STORES.STUDENT, arrStudents, "students", function ()
                {
                    addAllThen(AppConfig.STORES.RESULT, arrResults, "results", function ()
                    {
                        fnSuccess(objSummary);
                    });
                });
            });
        });

        function addAllThen(strStoreName, arrRecords, strSummaryKey, fnNext)
        {
            addOneByOne(0);

            function addOneByOne(intIndex)
            {
                if (intIndex >= arrRecords.length)
                {
                    fnNext();
                    return;
                }

                addRecord(strStoreName, arrRecords[intIndex], function ()
                {
                    objSummary[strSummaryKey]++;
                    addOneByOne(intIndex + 1);
                },
                function (objError)
                {
                    if (fnError)
                    {
                        fnError(objError);
                    }

                    addOneByOne(intIndex + 1);
                });
            }
        }
    }

})();