/* ==========================================================
   Student Management System
   BiometricService.js

   Purpose:

   ALL biometric (Fingerprint / Face) code lives here and only
   here - per the mentor's architecture, login.js never talks
   to navigator.credentials / the camera / FaceAuth directly,
   and this file never talks to DataService or the backend
   directly either. The flow is always:

       Fingerprint/Face  ->  BiometricService  ->  DataService
                          ->  Google / IndexedDB  ->  Session

   registerFingerprint() / authenticateFingerprint() use the
   browser's own WebAuthn platform authenticator (Windows
   Hello, Touch ID, Android fingerprint, etc.) - no external
   library needed.

   registerFace() / authenticateFace() need a real face
   recognition library to compare faces (a browser has no
   built-in one). This file talks to that library through a
   small, swappable adapter (see FACE_ADAPTER below) so wiring
   in face-api.js (or any other library) later is a one-place
   change - nothing else in this file, or any page that calls
   BiometricService, needs to know which library is used.

   Version: 1.0
   ========================================================== */

"use strict";

/* ==========================================================
   Biometric Service
   ========================================================== */

var BiometricService = (function ()
{

    /* ======================================================
       Face Adapter

       WHY: face-api.js is not currently loaded anywhere in
       this project (see "Required Libraries" in the brief),
       so there is nothing real to enroll/verify a face
       against yet. Rather than hardcode one specific library
       here (and break every call site the day that library
       changes), every face function below goes through this
       one small object.

       To wire in a real library later, only this object needs
       to change:

         • window.FaceAuth.enroll() / .verify(objDescriptor) if
           using a FaceAuth-style library, OR
         • faceapi.detectSingleFace() / .computeFaceDescriptor()
           / faceapi.euclideanDistance() if using face-api.js -
           see the commented-out example below FACE_ADAPTER.
       ====================================================== */

    var FACE_ADAPTER = {

        isAvailable: function ()
        {
            return (typeof window.FaceAuth !== "undefined");
        },

        enroll: function ()
        {
            // Expected shape: Promise resolving to { descriptor }
            return window.FaceAuth.enroll();
        },

        verify: function (objStoredDescriptor)
        {
            // Expected shape: Promise resolving to { matched: true/false }
            return window.FaceAuth.verify(objStoredDescriptor);
        }

    };

    /* --------------------------------------------------
       Example face-api.js adapter (left commented out -
       only needed once face-api.js's script tag + model
       files are actually added to the project):

       var FACE_ADAPTER = {
           isAvailable: function () { return typeof faceapi !== "undefined"; },
           enroll: function () {
               return grabFaceImageElement().then(function (elImage) {
                   return faceapi.detectSingleFace(elImage).withFaceLandmarks().withFaceDescriptor();
               }).then(function (objResult) {
                   return { descriptor: Array.from(objResult.descriptor) };
               });
           },
           verify: function (objStoredDescriptor) {
               return grabFaceImageElement().then(function (elImage) {
                   return faceapi.detectSingleFace(elImage).withFaceLandmarks().withFaceDescriptor();
               }).then(function (objResult) {
                   var numDistance = faceapi.euclideanDistance(objResult.descriptor, objStoredDescriptor);
                   return { matched: numDistance < 0.6 };
               });
           }
       };
       -------------------------------------------------- */



    /* ======================================================
       Public Object
       ====================================================== */

    return {

        isFingerprintSupported:
            isFingerprintSupported,

        isFaceSupported:
            isFaceSupported,

        isRegistered:
            isRegistered,

        getRegisteredType:
            getRegisteredType,

        getRegisteredUsername:
            getRegisteredUsername,

        clearRegistration:
            clearRegistration,

        registerFingerprint:
            registerFingerprint,

        authenticateFingerprint:
            authenticateFingerprint,

        registerFace:
            registerFace,

        authenticateFace:
            authenticateFace

    };



    /* ======================================================
       Is Fingerprint (WebAuthn) Supported On This Device?
       ====================================================== */

    function isFingerprintSupported()
    {
        return (typeof window.PublicKeyCredential !== "undefined");
    }



    /* ======================================================
       Is Face Login Supported On This Device?

       Requires both a camera (getUserMedia) and a face
       recognition adapter to compare against (see FACE_ADAPTER
       above).
       ====================================================== */

    function isFaceSupported()
    {
        return (typeof navigator.mediaDevices !== "undefined") &&
            (typeof navigator.mediaDevices.getUserMedia !== "undefined") &&
            FACE_ADAPTER.isAvailable();
    }



    /* ======================================================
       Is a Biometric Credential Already Registered?

       Only counts as "registered" for the CURRENTLY logged-in
       (or about-to-log-in) username, so a shared/public device
       can't let one person's fingerprint unlock a different
       person's account. Pass the username being checked (the
       Login page passes the one just typed / remembered;
       Settings passes Session.getUsername()).
       ====================================================== */

    function isRegistered(strUsername)
    {
        var bEnabled = StorageService.getValue(AppConfig.BIOMETRIC.ENABLED_KEY) === true;

        if (bEnabled !== true)
        {
            return false;
        }

        var strSavedUsername = StorageService.getValue(AppConfig.BIOMETRIC.USER_KEY);

        return strSavedUsername === strUsername;
    }



    /* ======================================================
       Get the Registered Biometric Type

       Returns AppConfig.BIOMETRIC.TYPE.FINGERPRINT,
       AppConfig.BIOMETRIC.TYPE.FACE, or null if none is
       registered.
       ====================================================== */

    function getRegisteredType()
    {
        return StorageService.getValue(AppConfig.BIOMETRIC.TYPE_KEY);
    }



    /* ======================================================
       Get the Username the Registered Credential Belongs To
       ====================================================== */

    function getRegisteredUsername()
    {
        return StorageService.getValue(AppConfig.BIOMETRIC.USER_KEY);
    }



    /* ======================================================
       Clear Any Registered Biometric Credential

       Called from Settings when the user switches Biometric
       Login back to "Disabled", or picks a different type.
       ====================================================== */

    function clearRegistration()
    {
        StorageService.removeValue(AppConfig.BIOMETRIC.ENABLED_KEY);

        StorageService.removeValue(AppConfig.BIOMETRIC.TYPE_KEY);

        StorageService.removeValue(AppConfig.BIOMETRIC.USER_KEY);

        StorageService.removeValue(AppConfig.BIOMETRIC.CREDENTIAL_KEY);
    }



    /* ======================================================
       Save a Registered Credential Locally

       Small shared helper so registerFingerprint() and
       registerFace() don't repeat the same four saves.
       ====================================================== */

    function saveRegistration(strUsername, strType, mCredential)
    {
        StorageService.saveValue(AppConfig.BIOMETRIC.ENABLED_KEY, true);

        StorageService.saveValue(AppConfig.BIOMETRIC.TYPE_KEY, strType);

        StorageService.saveValue(AppConfig.BIOMETRIC.USER_KEY, strUsername);

        StorageService.saveValue(AppConfig.BIOMETRIC.CREDENTIAL_KEY, mCredential);
    }



    /* ======================================================
       Register Fingerprint (WebAuthn)

       strUsername : the account this fingerprint will unlock
       fnSuccess    : function(strCredentialId)
       fnError      : function(objError)
       ====================================================== */

    function registerFingerprint(strUsername, fnSuccess, fnError)
    {
        if (isFingerprintSupported() === false)
        {
            fnError(new Error("Fingerprint login is not supported on this device."));
            return;
        }

        var arrChallenge = new Uint8Array(32);
        crypto.getRandomValues(arrChallenge);

        var objPublicKey = {

            challenge: arrChallenge,

            rp: {
                name: AppConfig.APP_NAME
            },

            user: {
                id: new TextEncoder().encode(strUsername),
                name: strUsername,
                displayName: strUsername
            },

            pubKeyCredParams: [
                { alg: -7, type: "public-key" },
                { alg: -257, type: "public-key" }
            ],

            authenticatorSelection: {
                authenticatorAttachment: "platform",
                userVerification: "required"
            },

            timeout: 60000,

            attestation: "none"

        };

        navigator.credentials.create({ publicKey: objPublicKey })
            .then(function (objCredential)
            {
                var strCredentialId = credentialIdToBase64(objCredential);

                saveRegistration(strUsername, AppConfig.BIOMETRIC.TYPE.FINGERPRINT, strCredentialId);

                fnSuccess(strCredentialId);
            })
            .catch(function (objError)
            {
                CommonUtils.logError("BiometricService.registerFingerprint", objError);

                fnError(objError);
            });
    }



    /* ======================================================
       Authenticate With Fingerprint (WebAuthn)

       Only verifies the fingerprint matches the device's own
       stored credential - it does NOT decide login success by
       itself (per the architecture, that decision belongs to
       DataService.loginWithBiometric(), which is what actually
       checks the credential against Google/IndexedDB).

       fnSuccess : function(strCredentialId)
       fnError   : function(objError)
       ====================================================== */

    function authenticateFingerprint(fnSuccess, fnError)
    {
        var strStoredId = StorageService.getValue(AppConfig.BIOMETRIC.CREDENTIAL_KEY);

        if (!strStoredId)
        {
            fnError(new Error("Fingerprint is not registered on this device."));
            return;
        }

        var arrChallenge = new Uint8Array(32);
        crypto.getRandomValues(arrChallenge);

        var arrCredentialId = Uint8Array.from(atob(strStoredId), function (strChar)
        {
            return strChar.charCodeAt(0);
        });

        navigator.credentials.get({
            publicKey: {
                challenge: arrChallenge,
                allowCredentials: [{
                    id: arrCredentialId.buffer,
                    type: "public-key"
                }],
                userVerification: "required",
                timeout: 60000
            }
        })
        .then(function ()
        {
            fnSuccess(strStoredId);
        })
        .catch(function (objError)
        {
            CommonUtils.logError("BiometricService.authenticateFingerprint", objError);

            fnError(objError);
        });
    }



    /* ======================================================
       Turn a WebAuthn Credential's rawId Into a Storable String
       ====================================================== */

    function credentialIdToBase64(objCredential)
    {
        return btoa(String.fromCharCode.apply(null, new Uint8Array(objCredential.rawId)));
    }



    /* ======================================================
       Register Face

       strUsername : the account this face will unlock
       fnSuccess    : function(objDescriptor)
       fnError      : function(objError)
       ====================================================== */

    function registerFace(strUsername, fnSuccess, fnError)
    {
        if (isFaceSupported() === false)
        {
            fnError(new Error("Face login is not supported on this device."));
            return;
        }

        FACE_ADAPTER.enroll()
            .then(function (objResult)
            {
                saveRegistration(strUsername, AppConfig.BIOMETRIC.TYPE.FACE, objResult.descriptor);

                fnSuccess(objResult.descriptor);
            })
            .catch(function (objError)
            {
                CommonUtils.logError("BiometricService.registerFace", objError);

                fnError(objError);
            });
    }



    /* ======================================================
       Authenticate With Face

       Same "verifies the device's own biometric only" note as
       authenticateFingerprint() above applies here too.

       fnSuccess : function(objDescriptor)
       fnError   : function(objError)
       ====================================================== */

    function authenticateFace(fnSuccess, fnError)
    {
        var objStoredDescriptor = StorageService.getValue(AppConfig.BIOMETRIC.CREDENTIAL_KEY);

        if (!objStoredDescriptor)
        {
            fnError(new Error("Face is not registered on this device."));
            return;
        }

        FACE_ADAPTER.verify(objStoredDescriptor)
            .then(function (objResult)
            {
                if (objResult.matched !== true)
                {
                    fnError(new Error("Face not recognized."));
                    return;
                }

                fnSuccess(objStoredDescriptor);
            })
            .catch(function (objError)
            {
                CommonUtils.logError("BiometricService.authenticateFace", objError);

                fnError(objError);
            });
    }

})();