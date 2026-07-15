/* ==========================================================
   Student Management System
   DataService.js

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

   Version: 1.1
   ========================================================== */

"use strict";

/* ==========================================================
   Data Service
   ========================================================== */

var DataService = (function ()
{

    /* ======================================================
       Public Object
       ====================================================== */

    return {

        getAllRecords:
            getAllRecords,

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
            changePassword

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
       Get Every Record for a Store

       strStoreName : AppConfig.STORES.STUDENT / CATEGORY / ...
       fnSuccess    : function(arrRecords)
       fnError      : function(objError)
       ====================================================== */

    function getAllRecords(strStoreName, fnSuccess, fnError)
    {
        var strMode = getBackendMode();

        if (strMode === AppConfig.BACKEND.OFFLINE || CommonUtils.isOnline() === false)
        {
            StorageService.getAllRecords(strStoreName)
                .then(fnSuccess)
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
                        objExistingById[objExistingRecord[strIdField]] = objExistingRecord;
                    });

                    callGoogleGet(buildGoogleUrl(objEntity.listAction, {}), function (objResponse)
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

                        var arrRecords = arrRawRecords.map(function (objBackendRecord)
                        {
                            var objExisting = objExistingById[objBackendRecord[objEntity.idParam]];

                            return normalizeRecordId(strStoreName, objEntity.fromBackendFields(objBackendRecord, objExisting));
                        });

                        cacheListLocally(strStoreName, arrRecords);

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

        /* SPRING - kept here for Task 6 (Spring Boot backend not
           built yet, so this falls back to the offline cache
           until AppConfig.SPRING_BOOT_URL points at a real
           service, following the same list/getById/add/update/
           delete shape as GOOGLE above). */

        StorageService.getAllRecords(strStoreName)
            .then(fnSuccess)
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

        if (strMode === AppConfig.BACKEND.OFFLINE || CommonUtils.isOnline() === false)
        {
            StorageService.getRecordById(strStoreName, mId)
                .then(fnSuccess)
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

        /* OFFLINE mode, SPRING placeholder, or GOOGLE but the
           device itself is offline: save locally right away and
           queue the change so it is not lost. */

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

       NOTE: like createAccount(), this requires a matching
       `changePassword` action to exist in the Apps Script
       project (alongside the existing `login`/`createAccount`
       actions) that: 1) looks up the row by username, 2)
       rejects the request if strCurrentPassword does not match
       what is stored, 3) otherwise overwrites that row's
       password with strNewPassword, 4) responds with the same
       { success, message, data } shape login()/createAccount()
       already use. That server-side action lives outside this
       repo (Apps Script project) - see chat for the exact
       snippet to paste into Login.gs/Code.gs.

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
        if (CommonUtils.isOnline() === false)
        {
            fnError(new Error("You appear to be offline. Please connect to the internet to change your password."));
            return;
        }

        callGoogleGet(buildGoogleUrl("changePassword", {
            username: strUsername,
            currentPassword: strCurrentPassword,
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