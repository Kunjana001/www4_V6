/* ==========================================================
   Student Management System
   StorageService.js

   Handles

   • Local Storage
   • Session
   • IndexedDB
   • Cache

   Version: 1.0
   ========================================================== */

"use strict";

/* ==========================================================
   Storage Service
   ========================================================== */

var StorageService = (function () {

    /* ======================================================
       Private Variable
       ====================================================== */

    var objDatabase = null;

    /* ------------------------------------------------------
       ADD DIALOG / "Unable to load ..." FIX (root cause)

       WHY: every CRUD function below (getAllRecords, addRecord,
       getRecordById, updateRecord, deleteRecordById,
       clearStoreRecords) called getObjectStore(), which threw
       synchronously ("IndexedDB is not ready yet") whenever
       objDatabase was still null. indexedDB.open() in
       initializeDatabase() is asynchronous, so there was a real
       race: common.js calls initializeDatabase() once per page
       load, but nothing made later calls to
       DataService.getAllRecords() / addRecord() / etc. WAIT for
       that promise to resolve first - they just assumed the
       database was already open. Losing that race is exactly
       what produced the "Unable to load Students/Sections/
       Category/Result" toast (and, right after, a Save/Add that
       silently failed to reach the local cache), and it explains
       why it happened identically on every entity page - they
       all share this one file.

       WHAT: initializeDatabase() now remembers the Promise it
       returns (objDbReadyPromise) instead of a new caller
       re-opening the database, and getObjectStore() awaits that
       same Promise before touching objDatabase. Every public
       CRUD function already funnels through getObjectStore(), so
       this one change fixes the race everywhere without altering
       any of their individual logic.
       ------------------------------------------------------ */

    var objDbReadyPromise = null;

    function getDatabaseReady() {

        if (objDatabase !== null) {

            return Promise.resolve(objDatabase);
        }

        if (objDbReadyPromise === null) {

            objDbReadyPromise = initializeDatabase();
        }

        return objDbReadyPromise;
    }



    /* ======================================================
       Public Object
       ====================================================== */

   return {

    initializeDatabase:

        initializeDatabase,

    saveValue:

        saveValue,

    getValue:

        getValue,

    removeValue:

        removeValue,

    clearStorage:

        clearStorage,

    saveSession:

        saveSession,

    clearSession:

        clearSession,

    saveOfflineData:

        saveOfflineData,

    loadOfflineData:

        loadOfflineData,

    updateOfflineData:

        updateOfflineData,

    deleteOfflineData:

        deleteOfflineData,

    clearOfflineStore:

        clearOfflineStore,

    getDatabase:

        getDatabase,



    /* ------------------------------------------------------
       IndexedDB record-level CRUD (Phase 2 - Offline Engine)
       ------------------------------------------------------ */

    addRecord:

        addRecord,

    getAllRecords:

        getAllRecords,

    searchRecords:

        searchRecords,

    getRecordById:

        getRecordById,

    updateRecord:

        updateRecord,

    deleteRecordById:

        deleteRecordById,

    clearStoreRecords:

        clearStoreRecords,



    /* ------------------------------------------------------
       Sync Queue (Phase 2 - Offline Engine)
       ------------------------------------------------------ */

    addToSyncQueue:

        addToSyncQueue,

    getSyncQueue:

        getSyncQueue,

    removeFromSyncQueue:

        removeFromSyncQueue,

    clearSyncQueue:

        clearSyncQueue

};



    /* ======================================================
       Initialize IndexedDB
       ====================================================== */

    function initializeDatabase() {

        /* --------------------------------------------------
           Returning a Promise lets any calling code write

               StorageService.initializeDatabase().then(...)

           instead of guessing when the database is ready.
           The original open / onupgradeneeded / onsuccess /
           onerror logic below is unchanged.
           -------------------------------------------------- */

        if (objDbReadyPromise !== null) {

            return objDbReadyPromise;
        }

        objDbReadyPromise = new Promise(function (fnResolve, fnReject) {

        var objRequest = indexedDB.open(

            AppConfig.DATABASE_NAME,

            AppConfig.DATABASE_VERSION

        );



        objRequest.onupgradeneeded = function (objEvent) {

            objDatabase = objEvent.target.result;



            createObjectStore(

                AppConfig.STORES.STUDENT

            );



            createObjectStore(

                AppConfig.STORES.CATEGORY

            );



            createObjectStore(

                AppConfig.STORES.SECTION

            );



            createObjectStore(

                AppConfig.STORES.RESULT

            );



            createObjectStore(

                AppConfig.STORES.USER

            );



            /* ------------------------------------------------
               New store used by the offline sync engine to
               remember changes made while offline so they can
               be replayed against the real backend later.
               ------------------------------------------------ */

            createObjectStore(

                AppConfig.STORES.SYNC_QUEUE

            );

        };



        objRequest.onsuccess = function (objEvent) {

            objDatabase = objEvent.target.result;

            fnResolve(objDatabase);

        };



        objRequest.onerror = function (objEvent) {

            CommonUtils.logError("StorageService.initializeDatabase (onerror)", objEvent.target.error);

            /* let a later call retry instead of every future
               getObjectStore() call being stuck against a
               permanently-rejected promise */
            objDbReadyPromise = null;

            fnReject(objEvent.target.error);

        };

        });

        return objDbReadyPromise;

    }



    /* ======================================================
       Create Object Store
       ====================================================== */

    function createObjectStore(strStoreName) {

        if (!objDatabase.objectStoreNames.contains(strStoreName)) {

            objDatabase.createObjectStore(

                strStoreName,

                {

                    keyPath: "id",

                    autoIncrement: true

                }

            );

        }

    }



    /* ======================================================
       Save Local Storage
       ====================================================== */

    function saveValue(strKey, objValue) {

        localStorage.setItem(

            strKey,

            JSON.stringify(objValue)

        );

    }



    /* ======================================================
       Get Local Storage
       ====================================================== */

    function getValue(strKey) {

        var strData =

            localStorage.getItem(strKey);



        if (strData == null)

            return null;



        return JSON.parse(strData);

    }



    /* ======================================================
       Remove Item
       ====================================================== */

    function removeValue(strKey) {

        localStorage.removeItem(strKey);

    }



    /* ======================================================
       Clear Storage
       ====================================================== */

    function clearStorage() {

        localStorage.clear();

    }



    /* ======================================================
       Save User Session
       ====================================================== */

    function saveSession(strUsername, strRole) {

        saveValue(

            AppConfig.STORAGE_KEYS.LOGIN,

            true

        );



        saveValue(

            AppConfig.STORAGE_KEYS.USERNAME,

            strUsername

        );



        if (strRole) {

            saveValue(

                AppConfig.STORAGE_KEYS.ROLE,

                strRole

            );

        }

    }



    /* ======================================================
       Clear Session
       ====================================================== */

    function clearSession() {

        removeValue(

            AppConfig.STORAGE_KEYS.LOGIN

        );



        removeValue(

            AppConfig.STORAGE_KEYS.USERNAME

        );



        removeValue(

            AppConfig.STORAGE_KEYS.ROLE

        );

    }



    /* ======================================================
       Save Offline Data
       ====================================================== */

    function saveOfflineData(

        strStore,

        arrData

    ) {

        saveValue(

            strStore,

            arrData

        );

    }



    /* ======================================================
       Load Offline Data
       ====================================================== */

    function loadOfflineData(

        strStore

    ) {

        return getValue(

            strStore

        );

    }

    /* ==========================================================
   Get Database Instance
   ========================================================== */

function getDatabase()
{
    return objDatabase;
}

/* ==========================================================
   Update Offline Data
   ========================================================== */

function updateOfflineData(
    strStore,
    arrData
)
{
    saveValue(
        strStore,
        arrData
    );
}

/* ==========================================================
   Delete Offline Data
   ========================================================== */

function deleteOfflineData(
    strStore
)
{
    removeValue(
        strStore
    );
}

/* ==========================================================
   Clear Offline Store
   ========================================================== */

function clearOfflineStore()
{
    clearStorage();
}



/* ==========================================================
   Phase 2 - Offline Engine (IndexedDB Record CRUD)

   All of the functions below return a Promise so that
   DataService.js can "wait" for the database to finish
   reading or writing before deciding what to show the user.
   ========================================================== */

/* ==========================================================
   Get an Open Object Store For a Transaction

   Small private helper so every CRUD function below does not
   have to repeat the same "check database is ready" code.

   strStoreName : name of the object store, e.g. "Students"
   strMode      : "readonly" or "readwrite"
   ========================================================== */

function getObjectStore(strStoreName, strMode)
{
    /* callers now go through getDatabaseReady() first (see the
       CRUD functions below), so objDatabase is guaranteed to be
       set by the time this runs - this check stays only as a
       last-resort guard, not the normal path. */
    if (objDatabase == null)
    {
        throw new Error(
            "IndexedDB is not ready yet. Call StorageService.initializeDatabase() first."
        );
    }

    var objTransaction = objDatabase.transaction(strStoreName, strMode);

    return objTransaction.objectStore(strStoreName);
}



/* ==========================================================
   Add a New Record to a Store

   strStoreName : e.g. AppConfig.STORES.STUDENT
   objRecord    : plain object to save (id is auto generated)

   Returns a Promise that resolves with the new record id.
   ========================================================== */

function addRecord(strStoreName, objRecord)
{
    return new Promise(function (fnResolve, fnReject)
    {
        getDatabaseReady().then(function ()
        {
            try
            {
                var objStore = getObjectStore(strStoreName, "readwrite");

                var objRequest = objStore.add(objRecord);

                objRequest.onsuccess = function (objEvent)
                {
                    fnResolve(objEvent.target.result);
                };

                objRequest.onerror = function (objEvent)
                {
                    fnReject(objEvent.target.error);
                };
            }
            catch (objError)
            {
                fnReject(objError);
            }
        })
        .catch(fnReject);
    });
}



/* ==========================================================
   Get Every Record From a Store

   strStoreName : e.g. AppConfig.STORES.CATEGORY

   Returns a Promise that resolves with an array of records.
   ========================================================== */

function getAllRecords(strStoreName)
{
    return new Promise(function (fnResolve, fnReject)
    {
        getDatabaseReady().then(function ()
        {
            try
            {
                var objStore = getObjectStore(strStoreName, "readonly");

                var objRequest = objStore.getAll();

                objRequest.onsuccess = function (objEvent)
                {
                    fnResolve(objEvent.target.result);
                };

                objRequest.onerror = function (objEvent)
                {
                    fnReject(objEvent.target.error);
                };
            }
            catch (objError)
            {
                fnReject(objError);
            }
        })
        .catch(fnReject);
    });
}

/* ==========================================================
   Search Records

   Performs a simple client-side search on records already
   stored in IndexedDB.

   Returns a Promise with matching records.
========================================================== */

function searchRecords(
    strStoreName,
    strKeyword
)
{
    return new Promise(function(fnResolve, fnReject)
    {
        getAllRecords(strStoreName)

        .then(function(arrRecords)
        {

            if(!strKeyword)
            {
                fnResolve(arrRecords);
                return;
            }

            strKeyword = strKeyword.toLowerCase();

            var arrFiltered = arrRecords.filter(function(objRecord)
            {

                return JSON.stringify(objRecord)

                    .toLowerCase()

                    .indexOf(strKeyword) > -1;

            });

            fnResolve(arrFiltered);

        })

        .catch(fnReject);

    });
}

/* ==========================================================
   Get a Single Record By Its Id

   strStoreName : e.g. AppConfig.STORES.SECTION
   numId        : the record id to look up

   Returns a Promise that resolves with the record, or
   null if no record was found with that id.
   ========================================================== */

function getRecordById(strStoreName, numId)
{
    return new Promise(function (fnResolve, fnReject)
    {
        getDatabaseReady().then(function ()
        {
            try
            {
                var objStore = getObjectStore(strStoreName, "readonly");

                var objRequest = objStore.get(numId);

                objRequest.onsuccess = function (objEvent)
                {
                    var objResult = objEvent.target.result;

                    fnResolve(objResult === undefined ? null : objResult);
                };

                objRequest.onerror = function (objEvent)
                {
                    fnReject(objEvent.target.error);
                };
            }
            catch (objError)
            {
                fnReject(objError);
            }
        })
        .catch(fnReject);
    });
}



/* ==========================================================
   Update an Existing Record

   strStoreName : e.g. AppConfig.STORES.RESULT
   objRecord    : must already contain the "id" field of the
                  record being updated

   Returns a Promise that resolves once the update is saved.
   ========================================================== */

function updateRecord(strStoreName, objRecord)
{
    return new Promise(function (fnResolve, fnReject)
    {
        getDatabaseReady().then(function ()
        {
            try
            {
                var objStore = getObjectStore(strStoreName, "readwrite");

                var objRequest = objStore.put(objRecord);

                objRequest.onsuccess = function (objEvent)
                {
                    fnResolve(objEvent.target.result);
                };

                objRequest.onerror = function (objEvent)
                {
                    fnReject(objEvent.target.error);
                };
            }
            catch (objError)
            {
                fnReject(objError);
            }
        })
        .catch(fnReject);
    });
}



/* ==========================================================
   Delete a Record By Its Id

   strStoreName : e.g. AppConfig.STORES.STUDENT
   numId        : the record id to delete

   Returns a Promise that resolves once the record is gone.
   ========================================================== */

function deleteRecordById(strStoreName, numId)
{
    return new Promise(function (fnResolve, fnReject)
    {
        getDatabaseReady().then(function ()
        {
            try
            {
                var objStore = getObjectStore(strStoreName, "readwrite");

                var objRequest = objStore.delete(numId);

                objRequest.onsuccess = function ()
                {
                    fnResolve(true);
                };

                objRequest.onerror = function (objEvent)
                {
                    fnReject(objEvent.target.error);
                };
            }
            catch (objError)
            {
                fnReject(objError);
            }
        })
        .catch(fnReject);
    });
}



/* ==========================================================
   Clear Every Record From a Single Store

   strStoreName : e.g. AppConfig.STORES.CATEGORY

   Returns a Promise that resolves once the store is emptied.
   Useful when re-downloading a fresh copy of backend data.
   ========================================================== */

function clearStoreRecords(strStoreName)
{
    return new Promise(function (fnResolve, fnReject)
    {
        getDatabaseReady().then(function ()
        {
            try
            {
                var objStore = getObjectStore(strStoreName, "readwrite");

                var objRequest = objStore.clear();

                objRequest.onsuccess = function ()
                {
                    fnResolve(true);
                };

                objRequest.onerror = function (objEvent)
                {
                    fnReject(objEvent.target.error);
                };
            }
            catch (objError)
            {
                fnReject(objError);
            }
        })
        .catch(fnReject);
    });
}



/* ==========================================================
   Phase 2 - Offline Engine (Sync Queue)

   Every time a page saves, edits, or deletes data while the
   BACKEND_MODE is GOOGLE or SPRING but the device is offline,
   DataService.js records that change here. When the device
   comes back online, DataService replays each queued change
   against the real backend in the order it was queued.
   ========================================================== */

/* ==========================================================
   Add an Item to the Sync Queue

   objQueueItem should look like:

   {
       storeName : AppConfig.STORES.STUDENT,
       operation : "ADD" | "UPDATE" | "DELETE",
       data      : { ... the record itself ... },
       queuedOn  : "2026-07-04T12:00:00.000Z"
   }

   Returns a Promise that resolves with the new queue item id.
   ========================================================== */

function addToSyncQueue(objQueueItem)
{
    return addRecord(
        AppConfig.STORES.SYNC_QUEUE,
        objQueueItem
    );
}



/* ==========================================================
   Get Every Item Currently Waiting to be Synced

   Returns a Promise that resolves with an array of queue
   items, oldest first, so they can be replayed in order.
   ========================================================== */

function getSyncQueue()
{
    return getAllRecords(
        AppConfig.STORES.SYNC_QUEUE
    );
}



/* ==========================================================
   Remove a Single Item From the Sync Queue

   Called by DataService after a queued change has been
   successfully sent to the real backend.

   numQueueId : the "id" field of the queue item to remove
   ========================================================== */

function removeFromSyncQueue(numQueueId)
{
    return deleteRecordById(
        AppConfig.STORES.SYNC_QUEUE,
        numQueueId
    );
}



/* ==========================================================
   Clear the Entire Sync Queue

   Rarely needed in normal use, but useful for testing or for
   a "discard offline changes" option.
   ========================================================== */

function clearSyncQueue()
{
    return clearStoreRecords(
        AppConfig.STORES.SYNC_QUEUE
    );
}

})();