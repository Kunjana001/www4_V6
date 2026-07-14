////////////////////////////////////////////////////////////////////////////

// FileName Result.script.js: Result Javascript file for Cordova project

// Author : JRC
// Description : codegen


////////////////////////////////////////////////////////////////////////////

/* ----------------------------------------------------------
   UI Modernization Pass 2 (added)
   ----------------------------------------------------------
   showFilteredList() now shows a shared empty-state message when a search/filter returns zero results
   instead of leaving the list area blank, via
   CommonUtils.getEmptyStateHtml(). No existing function
   removed or renamed; architecture unchanged.
   ---------------------------------------------------------- */

/*/* ==========================================================
   PWA MIGRATION NOTES
   Result.script.js

   Purpose

   Migrated Result.script.js from the legacy
   Cordova/SQLite architecture to the PWA
   DataService/StorageService architecture while
   preserving the original file structure and public API.

   ----------------------------------------------------------
   Functions migrated
   ----------------------------------------------------------

   • getData()
       -> DataService.getRecordById()

   • getListData()
       -> DataService.getAllRecords()

   • onConfirmSaveFormData()
       -> DataService.addRecord()
       -> DataService.updateRecord()

   • deleteRows()
       -> DataService.deleteRecord()

   • onInfoViewDocumentReady()
       -> DataService.getRecordById()

   • parsePreviewResponse()
       -> simplified for DataService response

   • parseListResponse()
       -> simplified for DataService response

   • getAddEditResultArray()
       -> removed obsolete SQLite branch

   ----------------------------------------------------------
   Legacy functions removed
   ----------------------------------------------------------

   Removed obsolete data access functions

       fetchNetworkListData()
       fetchNetworkData()
       fetchDbListData()
       fetchDbData()

   Removed obsolete response handlers

       parseDbListResponse()
       parseDbFormDataResponse()

   Removed obsolete save functions

       onConfirmDbSaveData()
       saveDbFormData()
       saveNetworkFormData()

   Removed obsolete SQLite helpers

       getFormDataAsArray()
       onErrorDeleteData()

   Removed unused legacy code

       getListFromServer()
       parseLocalData()

   ----------------------------------------------------------
   Not migrated in this phase
   ----------------------------------------------------------

   The following functions remain because they are still
   referenced by the existing file upload feature and will
   be migrated separately.

       onConfirmNetworkSaveData()
       uploadDocuments()
       onErrorInsertUpdate()
       parseSaveErrorDataResponse()

   The following functions remain because they are still
   referenced by the application bootstrap or public API.

       getInsertQuery()
       getUpdateQuery()
       createTableResult()

   The MODE_NETWORK_DB check inside popUpAddForm() has been
   intentionally retained because it generates the default
   identifier for a new Result record and does not perform
   any database read or write operation.

   ----------------------------------------------------------
   Architecture preserved
   ----------------------------------------------------------

   • Original function names preserved.
   • Original function order preserved.
   • Original file structure preserved.
   • Existing event bindings preserved.
   • Only internal implementations replaced.
   • No unnecessary helper functions introduced.

   ----------------------------------------------------------
   Coding standards
   ----------------------------------------------------------

   • Hungarian notation retained.
   • Scoped changes only.
   • WHY / WHAT / WHEN comments added where logic changed.

   ========================================================== */

////////////////////////////////////////////////////////////////////////////



var ResultScript = (function () {
	// Check whether the Multiple selection is active or not
	var mMultiSelect = false;

	// Manage List multiple selection
	var mMultiSelectedList = [];
	// Manage search list
	var mSearchList = [];

	// Instance stores a reference to the Singleton
	var instance;

	//Url
	var URL = "/ResultDataHandler";
	var URL_SUMMARY = "/SummaryList";
	var mJsonData = null; // JSON data used for Add/Edit
	var mSelectedIdList = []; // List of IDs of the selected items

	// We can Enable/Disable Multiple selection by using it
	// true: Enable multiple selection, false: Disable multiple selection 
	var mEnableMultiSelection = true;


	// Save the Filtered main list
	var mSelectedDataList = [];

	// --------------------------------------------------
	// Confirmation Dialogs: this was referenced by every
	// showConfirmationAlert(...) call below but never declared
	// anywhere in the project - reading an undeclared bare
	// variable throws a ReferenceError, so every Save/Update/
	// Share confirmation on this page was crashing silently
	// before the confirmation dialog could even open. Declaring
	// it here with the general-purpose Yes/No labels fixes that;
	// the two Delete confirmations below pass their own
	// ["Delete", "Cancel"] labels instead.
	// --------------------------------------------------
	var buttonLabels = [ "Yes", "No" ];

	var mDoubleBackToExitPressedOnce = false;

	// Share using Email and WhatsApp
	var MODE_SHARE_EMAIL = 1;
	var MODE_SHARE_WHATSAPP = 2;

	var mShareMode = 0;		// email or whatsapp

	var mInfoIconClicked = false; // using that we can control single click and info button click
	var mEditIconClicked = false; // using that we can control single click and edit icon click

	var mImageClosed = false;	// Indicates whether the image is removed or not while updating
	var mFileClosed = false;	// Indicates whether the File is removed or not while updating
	var TABLE_NAME = "result";
	//--------------Table row index:-----------------

	var value = 0;

	var INDEX = {
		RESULT_ID : value++,		// 1
		EXAM_NAME : value++,		// 2
		DATE_OF_EXAM : value++,		// 3
		TOTAL_MARKS : value++,		// 4
		MARKS_OBTAINED : value++,		// 5		// 5
	};

	//--------------Summary row index:-----------------

	value = 0;

	var SUMMARY_INDEX = {
		RESULT_ID : value++,		// 1
		EXAM_NAME : value++,		// 2
		DATE_OF_EXAM : value++,		// 3
		TOTAL_MARKS : value++,		// 4
		MARKS_OBTAINED : value++,		// 5		// 5
	};

	//-------------Table Header Label----------------------

	var LABEL = {

		RESULT_ID : "Result",
		EXAM_NAME : "Exam Name",
		DATE_OF_EXAM : "Date Of Exam",
		TOTAL_MARKS : "Total Marks",
		MARKS_OBTAINED : "Marks Obtained"
	};

	//-----------------------------Default values------------------------------------
	//// TODO: Assign group_lookup_id of Lookup forign keys
	var DEFAULT = {

		RESULT_ID : 0,
		EXAM_NAME : "",
		DATE_OF_EXAM : "",
		TOTAL_MARKS : 0,
		MARKS_OBTAINED : 0
	};

	//-----------------------------Form Elements------------------------------------
	var FORM_FIELD = {

		RESULT_ID : '#result_id',
		EXAM_NAME : '#exam_name',
		DATE_OF_EXAM : '#date_of_exam',
		TOTAL_MARKS : '#total_marks',
		MARKS_OBTAINED : '#marks_obtained',
		DOCUMENT_DIV : '#file_div',
		DOCUMENTS_PATH : '#file_id',
		PHOTO_DIV : '#image_div',
		PHOTO_PATH: '#image_id'

	};

	var FORM_FIELD_INFO = { 		// For Show Info Screen

		LBL_RESULT_ID : '#lbl_result_id',
		LBL_EXAM_NAME : '#lbl_exam_name',
		LBL_DATE_OF_EXAM : '#lbl_date_of_exam',
		LBL_TOTAL_MARKS : '#lbl_total_marks',
		LBL_MARKS_OBTAINED : '#lbl_marks_obtained'
	};

	//-----------------------------JSON Key------------------------------------
	var JSON_KEY = {

		RESULT_ID : "result_id",
		EXAM_NAME : "exam_name",
		DATE_OF_EXAM : "date_of_exam",
		TOTAL_MARKS : "total_marks",
		MARKS_OBTAINED : "marks_obtained"
	};

	//-----------------------------SUMMARY JSON Key------------------------------------
	var SUMMARY_JSON_KEY = {

		RESULT_ID : "result_id",
		EXAM_NAME : "exam_name",
		DATE_OF_EXAM : "date_of_exam",
		TOTAL_MARKS : "total_marks",
		MARKS_OBTAINED : "marks_obtained"
	};

	//-----------------------------DB Table Fields------------------------------------
	var DB_FIELD = {

		RESULT_ID : "result_id",
		EXAM_NAME : "exam_name",
		DATE_OF_EXAM : "date_of_exam",
		TOTAL_MARKS : "total_marks",
		MARKS_OBTAINED : "marks_obtained"
	};
	//------------------------------SESSION OBJECT--------------------------------------
	var SESSION_OBJECT = {

		RESULT_ID: "RESULT_ID",
		ADD_EDIT_MODE: "ADD_EDIT_MODE",
		RESULT_DATA: "RESULT_DATA",
		RESULT_SUMMARY_DATA: "RESULT_SUMMARY_DATA"
	}
	// Clear all the data which used to store in the session on click backbutton and goback from the list
	function clearStorage(){

		clearSessionStorage( SESSION_OBJECT.ADD_EDIT_MODE );
		clearSessionStorage( SESSION_OBJECT.RESULT_DATA );
		clearSessionStorage( SESSION_OBJECT.RESULT_SUMMARY_DATA );

		clearSessionStorage( SESSION_OBJECT.RESULT_ID );


	}

	// get Result data from the storage : we can retrieve data using the key which we used to store the data
	// getStorageData(SESSION_OBJECT.RESULT_DATA)

	function getStorageData( key ) {
		// get data from global storage
		// Code for localStorage/sessionStorage.
		if( sessionStorage.getItem( key ) ) {
			var jsonString = sessionStorage.getItem( key );
			return JSON.parse( jsonString );
		}
		else {
			return null;
		}
	}

	// set Result data into the storage : we can set the data using a key and the same key we should use for retriving the data
	// setStorageData(jsonData, SESSION_OBJECT.RESULT_DATA)
	function setStorageData( json, key ) {
		// set data from global storage
		// Code for localStorage/sessionStorage.
		if( sessionStorage.getItem( key ) ) {
			sessionStorage.removeItem( key );
			sessionStorage.setItem( key, JSON.stringify( json ) );
		}
		else {
			sessionStorage.setItem( key, JSON.stringify( json ) );
		}
	}

	function validateForm(){
		var bValid = true;
		var country_code = getOrgCountryCode(); //"+91"; // PUT in the Country code or fetch from DB or server 
		var noOfDigits = getOrgNoOfDigits();
		var fv = FormValidation;

		console.log('Enable the validation for this form');
/* Enable as per requirement */
		// bValid = bValid && fv.checkEmpty($(FORM_FIELD.RESULT_ID), G_ERROR.MSG.empty_error+LABEL.RESULT_ID);
		// bValid = bValid && fv.checkEmpty($(FORM_FIELD.EXAM_NAME), G_ERROR.MSG.empty_error+LABEL.EXAM_NAME);
		// bValid = bValid && fv.checkEmpty($(FORM_FIELD.DATE_OF_EXAM), G_ERROR.MSG.empty_error+LABEL.DATE_OF_EXAM);
		// bValid = bValid && fv.checkDate($(FORM_FIELD.DATE_OF_EXAM), G_ERROR.MSG.invalid_date_error+LABEL.DATE_OF_EXAM);
		// bValid = bValid && fv.checkEmpty($(FORM_FIELD.TOTAL_MARKS), G_ERROR.MSG.empty_error+LABEL.TOTAL_MARKS);
		// bValid = bValid && fv.checkEmpty($(FORM_FIELD.MARKS_OBTAINED), G_ERROR.MSG.empty_error+LABEL.MARKS_OBTAINED);

		return bValid;
	}
	function setFormDefaults( resultId ) {
		$(FORM_FIELD.RESULT_ID).val(resultId);
		$(FORM_FIELD.EXAM_NAME).val(DEFAULT.EXAM_NAME);
		$(FORM_FIELD.DATE_OF_EXAM).val(getDefaultDateTimePattern(DEFAULT.DATE_OF_EXAM));
		$(FORM_FIELD.TOTAL_MARKS).val(DEFAULT.TOTAL_MARKS);
		$(FORM_FIELD.MARKS_OBTAINED).val(DEFAULT.MARKS_OBTAINED);
		enableSaveButton( false );

		$( FORM_FIELD.DOCUMENT_DIV ).hide();
		$( FORM_FIELD.DOCUMENTS_PATH ).text("");
		$( FORM_FIELD.PHOTO_DIV ).hide();
		$( FORM_FIELD.PHOTO_PATH ).removeAttr( 'src' );

		setTimeout( function(){ 

			var errorHandlerScript = ErrorHandlerScript.getInstance();
			errorHandlerScript.getAutoFillErrorData( "Result", parseErrorDataResponse );
		}, 1000 );
	}


	function parseErrorDataResponse( response ){

		var data = [];

		if( response.rows.length > 0 ){

			var i = 0;

			var errorJsonData = response.rows.item( i )[ ErrorHandlerScript.DB_FIELD.JSON_DATA ];

			var jsonData = JSON.parse( errorJsonData );

			populateFromLocalStorage( jsonData );
		}

		setStorageData( data, SESSION_OBJECT.RESULT_ERROR_DATA );
	}
	function populateFromLocalStorage( data ){
		$( FORM_FIELD.RESULT_ID ).val( data[ INDEX.RESULT_ID ] );
		$( FORM_FIELD.EXAM_NAME ).val( data[ INDEX.EXAM_NAME ] );
		$( FORM_FIELD.DATE_OF_EXAM ).val( getDefaultDateTimePattern( new Date( parseInt( data[ INDEX.DATE_OF_EXAM ] ) ) ) );
		$( FORM_FIELD.TOTAL_MARKS ).val( data[ INDEX.TOTAL_MARKS ] );
		$( FORM_FIELD.MARKS_OBTAINED ).val( data[ INDEX.MARKS_OBTAINED ] );

		setDocsImages( data );

		// Enable save button after everything loads
		// Selection options are making the save button disabled so after loading all these we have to enable the save button
		setTimeout(function(){ enableSaveButton(true); }, 1000);

		hideLoader();
	}

	function onAddEditDocumentReady() {
		
		var mode = getAddEditMode();

		if( mode == INSERT_DATA ) { // Add

			popUpAddForm();
		} 
		else { // Edit

			getData();
		}

		$( '#save_data' ).off().on( 'click', function() {

			onClickSaveData();
		});

		$('#close_file_btn').off().on('click', function () {

			closeFileButton();
		});

		$( '#btn_document_path' ).off().on( 'click', function () {  // it is btn_document_path not document_path

			addFileModal();
		});

		$('#close_image_btn').off().on('click', function () {

			closeImageButton();
		});

		$('#btn_photo_path').off().on('click', function () {   // it is btn_photo_path not photo_path

			addPhotoModal();
		});


		$( '#add_edit_header_close' ).off().on( 'click', function() {

			 onAddEditClose();
				
		});

		$( '#add_edit_footer_close' ).off().on( 'click', function() {

			 onAddEditClose();
				
		});

		// Scroll the modal to top
		scrollEditDetailsPopup();
	}

	// For Add Edit Close Confirmation Popup
	function onAddEditClose(){

		if( SettingsScript.FEATURE.ADD_EDIT_CLOSE_CONFIRMATION == FEATURE_ENABLED ) {
				
			var title = "Confirmation";
			var message = "Do you want to Close?";
			showConfirmationAlert( message, confirmAddEditClose, title, buttonLabels ); 
		}
		else {

			closeEditDetailsPopup();
		}
	}

	function confirmAddEditClose( buttonIndex ) {
				
		if( buttonIndex == BUTTON_CANCEL ) { // Cancel alert dialog

		} 
		else if( buttonIndex == BUTTON_CONFIRM ) { // Confirm

			closeEditDetailsPopup();
		}
	}

	function popUpAddForm() {

		var appMode = getAppMode();

		if( appMode == MODE_NETWORK_DB ) {

			loadAddFormData( DEFAULT.RESULT_ID );
		}
		else {

			getMaxId( loadAddFormData );
		}
	}

	function loadAddFormData( maxId ) {

		if( maxId == null ) {

			maxId = 1;
		}
		else{

			maxId += 1
		}

		setFormDefaults( maxId );
	}

	function popUpEditForm() {

		var data = getSelectedData();

		$(FORM_FIELD.RESULT_ID).val(data[INDEX.RESULT_ID]);
		$(FORM_FIELD.EXAM_NAME).val(data[INDEX.EXAM_NAME]);
		$(FORM_FIELD.DATE_OF_EXAM).val(getDefaultDateTimePattern( parseInt(data[INDEX.DATE_OF_EXAM])));
		$(FORM_FIELD.TOTAL_MARKS).val(data[INDEX.TOTAL_MARKS]);
		$(FORM_FIELD.MARKS_OBTAINED).val(data[INDEX.MARKS_OBTAINED]);

		setDocsImages( data );

		enableSaveButton( false );
	}

	function setDocsImages( data ){


		var photoPath = data[ INDEX.PHOTO_PATH ];
		if( photoPath !== "" && photoPath !== null ) {

			$( FORM_FIELD.PHOTO_DIV ).show();
			$( FORM_FIELD.PHOTO_PATH ).attr( 'src', photoPath);
		}
		else{

			$( FORM_FIELD.PHOTO_DIV ).hide();
			$( FORM_FIELD.PHOTO_PATH ).removeAttr( 'src' );	
		}

		var docPath = data[ INDEX.DOCUMENT_PATH ];
		if( docPath.length > 0 && docPath !== null && docPath !== '' ) {

			var fileList = JSON.parse( docPath );
			var fileName = getUriFileName( fileList[ 0 ] );

			$( FORM_FIELD.DOCUMENT_DIV ).show();
			$( FORM_FIELD.DOCUMENTS_PATH ).text( fileName );
		}
		else{

			$( FORM_FIELD.DOCUMENT_DIV ).hide();
			$( FORM_FIELD.DOCUMENTS_PATH ).text( '' );
		}

	}

	function getFormDataAsJson( mode ) {
		var jsonData = {};
		jsonData[ JSON_KEY.RESULT_ID ] = ( $(FORM_FIELD.RESULT_ID).val() );
		jsonData[ JSON_KEY.EXAM_NAME ] = ( $(FORM_FIELD.EXAM_NAME).val() );
		jsonData[ JSON_KEY.DATE_OF_EXAM ] = DateTimeToSaveTime( $(FORM_FIELD.DATE_OF_EXAM).val() );
		jsonData[ JSON_KEY.TOTAL_MARKS ] = ( $(FORM_FIELD.TOTAL_MARKS).val() );
		jsonData[ JSON_KEY.MARKS_OBTAINED ] = ( $(FORM_FIELD.MARKS_OBTAINED).val() );

/*
		// used for file upload
		jsonData[ "organization_short_name" ] = getOrgShortName();
*/


		if( mode == UPDATE_DATA ) { // Edit/Update

			var data = getSelectedData();

			jsonData[ JSON_KEY.RESULT_ID ] = data[ INDEX.RESULT_ID ];
			jsonData[ JSON_KEY.EXAM_NAME ] = data[ INDEX.EXAM_NAME ];
			jsonData[ JSON_KEY.DATE_OF_EXAM ] = data[ INDEX.DATE_OF_EXAM ];
			jsonData[ JSON_KEY.TOTAL_MARKS ] = data[ INDEX.TOTAL_MARKS ];
			jsonData[ JSON_KEY.MARKS_OBTAINED ] = data[ INDEX.MARKS_OBTAINED ];

		}

		if( mUploadedImage.length > 0 ) {

			jsonData[ JSON_KEY.PHOTO_PATH ] = mUploadedImage[ 0 ];
		}
		
		mUploadedImage = [];
		mFileList = [];
		mImageClosed = false;

		if( mUploadedFiles.length > 0 ) {

			jsonData[ JSON_KEY.DOCUMENT_PATH ] = mUploadedFiles;
		}

		mUploadedFiles = [];		
		mFile = null;
		mFileClosed = false;

		console.log( "getFormDataAsJson: " + JSON.stringify( jsonData ) );
		return jsonData;
	}

	function onConfirmNetworkSaveData() {

		var mode = getAddEditMode();

		mJsonData = getFormDataAsJson( mode );

		var inData = JSON.stringify( mJsonData );

		var url = getServerUrl() + ROOT_URL + URL, TYPE = '';

		switch( mode ) {
			case INSERT_DATA:
				TYPE = "POST";
				break;
			case UPDATE_DATA:
				TYPE = "PUT";
				break;

			default:
				return false;
		}

		serverInsertUpdate( url, TYPE, inData, mode, parseInsertUpdateResponse, onErrorInsertUpdate );
	}
	function onErrorInsertUpdate(url, jsonData, description, logData, flag){

		var errorHandlerScript = ErrorHandlerScript.getInstance();
		errorHandlerScript.saveErrorData( "Result", url, jsonData, description, logData, flag, parseSaveErrorDataResponse );
	}

	function parseSaveErrorDataResponse( response, mode ) {

		var message = "Failed to connect to " + APP_NAME + " server.\nPlease check your internet connection and try to save the data again.";
		showAlertDialog( message, gotoLogin, title, buttonStr );
	}

	function saveFormData( buttonIndex ) {

		if( buttonIndex == BUTTON_CANCEL ) { // Cancel alert dialog
			// To do Something
		} 
		else if( buttonIndex == BUTTON_CONFIRM ) { // Confirm

			onConfirmSaveFormData();
		}
	}

	function onConfirmSaveFormData() {

		// --------------------------------------------------
		// WHY: the old SQLite path (getFormDataAsArray,
		// onConfirmDbSaveData, insert/update) and this
		// function's old raw-network branch (saveNetworkFormData)
		// called functions that no longer exist in this PWA.
		// DataService now decides on its own whether the record
		// goes to Google Apps Script, IndexedDB, or the offline
		// queue, so there is only one path left.
		// WHAT: builds the record from the form and asks
		// DataService to add or update it, depending on mode.
		// WHEN: runs when the user confirms Save on the
		// Add/Edit Result form.
		// --------------------------------------------------

		var mode = getAddEditMode();

		mJsonData = getFormDataAsJson( mode );

		showLoader( "Please wait...", "Fetching data..." );

		if( mode == INSERT_DATA ) {

			DataService.addRecord(

				AppConfig.STORES.RESULT,

				mJsonData,

				function( objSavedResult ) {

					parseInsertUpdateResponse( objSavedResult, mode );
				},

				function( objError ) {

					console.log( objError );
					hideLoader();
					CommonUtils.showAlert( "Unable to save Result." );
				}
			);
		}
		else if( mode == UPDATE_DATA ) {

			DataService.updateRecord(

				AppConfig.STORES.RESULT,

				mJsonData,

				function( objSavedResult ) {

					parseInsertUpdateResponse( objSavedResult, mode );
				},

				function( objError ) {

					console.log( objError );
					hideLoader();
					CommonUtils.showAlert( "Unable to save Result." );
				}
			);
		}
		else {

			console.log( "Invalid mode passed to onConfirmSaveFormData, mode = " + mode );
			return false;
		}
	}

	// NOTE: uploadDocuments() below still calls uploadFile(), which does
	// not exist in this PWA. Left untouched (not migrated) because
	// ResultHTML.script.js's onFileUploadSuccess() still calls it
	// directly, and it is still listed in this file's public API object
	// further down - removing it breaks that caller.
	function uploadDocuments(){

		window.FilePath.resolveNativePath( mFile.uri, successNative, failNative );

		function failNative(e) {
		  console.error( 'ResolveNativePath: Error for ' + mFile.uri );
		}
	
		function successNative( finalPath ) {
	
		  console.log( finalPath );
		  uploadFile( mFile.name, mFile.mediaType, finalPath, onFileUploadSuccess, TYPE_UPLOAD_FILES );
		}
	}
	function deleteRows( deleteDataArray ) {

		// --------------------------------------------------
		// WHY: Previously, this function branched between a
		// network DELETE call and a raw SQLite DELETE query,
		// neither of which exist in this PWA anymore. Deletes
		// run one at a time so that if one fails, we stop
		// immediately instead of showing a separate alert for
		// every failed delete.
		// WHAT: deletes each selected Result through
		// DataService, one after another, then refreshes the
		// list once every delete has finished.
		// WHEN: runs after the user confirms a single or
		// multi-select delete.
		// --------------------------------------------------

		deleteNextRow( 0 );

		function deleteNextRow( numIndex ) {

			if( numIndex >= deleteDataArray.length ) {

				parseDeleteResponse( deleteDataArray.length, null, null );
				return;
			}

			DataService.deleteRecord(

				AppConfig.STORES.RESULT,

				deleteDataArray[ numIndex ],

				function() {

					deleteNextRow( numIndex + 1 );
				},

				function( objError ) {

					console.log( objError );
					hideLoader();
					CommonUtils.showAlert( "Unable to delete Result." );
					return;
				}
			);
		}
	}

	function parseFormDataResponse( resultList ) {

		var arrResultRows = [];

		for( var i = 0; i < resultList.length; i++ ) {

			var objResult = resultList[ i ];

			var arrRow = [];
			arrRow[ INDEX.RESULT_ID ] = objResult.result_id;
			arrRow[ INDEX.EXAM_NAME ] = objResult.exam_name;
			arrRow[ INDEX.DATE_OF_EXAM ] = objResult.date_of_exam;
			arrRow[ INDEX.TOTAL_MARKS ] = objResult.total_marks;
			arrRow[ INDEX.MARKS_OBTAINED ] = objResult.marks_obtained;

			arrResultRows.push( arrRow );
		}

		// WHY/WHAT: bridge the plain DataService object(s) into the
		// same array-row shape ([ result_id, exam_name, date_of_exam, total_marks, marks_obtained ]) that
		// getSelectedData() reads via INDEX.* positions - matching
		// the fix already applied in Category.script.js. Without
		// this, SESSION_OBJECT.RESULT_DATA held plain objects while
		// getSelectedData() looked them up with obj[0]/obj[1]/...,
		// which never matched, so the Edit form and Info popup
		// always rendered blank/undefined fields.
		setStorageData( arrResultRows, SESSION_OBJECT.RESULT_DATA );

		hideLoader();

		popUpEditForm();
	}

	function getSelectedDropdownId( key ) {
		
		var selectedId = 0;
		if( localStorage.getItem( key ) != null ) {

			selectedId = localStorage.getItem( key );
		}

		return selectedId;
	}

	// --------------------------------------------------
	// WHY: Previously, this function fetched the record over
	// the network or from SQLite, relying on functions that
	// no longer exist in this PWA. getData() itself only had
	// this one caller.
	// WHAT: getData() now asks DataService for the single
	// Result being edited, the same way getListData() asks
	// for the full list.
	// WHEN: runs when the Edit form is opened for a specific
	// Result.
	// --------------------------------------------------

	// get data for Edit
	function getData() {

		DataService.getRecordById(

			AppConfig.STORES.RESULT,

			getSelectedId(),

			function( objResult ) {

				if( objResult ) {

					parseFormDataResponse( [ objResult ] );
				}
			},

			function( objError ) {

				console.log( objError );
				hideLoader();
				CommonUtils.showAlert( "Unable to load Result." );
			}
		);
	}

	// get Summary Data for List
	// --------------------------------------------------
	// WHY: Previously, this function branched between a
	// network summary fetch and a local SQLite query -
	// neither exists in this PWA. DataService now decides on
	// its own whether the list comes from Google Apps Script,
	// IndexedDB, or the offline cache.
	// WHAT: asks DataService for every Result and hands the
	// result to parseListResponse().
	// WHEN: runs when the Result list page loads.
	// --------------------------------------------------

	function onLoadCacheManager() {

		// --------------------------------------------------
		// CONNECTION FIX - WHY / WHAT / WHEN
		// WHY: onListDocumentReady() calls onLoadCacheManager(),
		// but this function was never defined anywhere in this
		// file - every Result List page load threw "Uncaught
		// ReferenceError: onLoadCacheManager is not defined"
		// right here, which stopped execution before
		// getListData() (a few lines below) ever ran, so no
		// request was ever sent to the backend. The Result page
		// has no lookup-list dropdown of its own to pre-load, so
		// this simply calls getListData() directly - the same fix
		// already applied to Category.script.js.
		// WHAT: fetches the Result list via DataService.
		// WHEN: runs once, right when the Result list page
		// finishes loading.
		// --------------------------------------------------

		getListData();
	}

	function getListData() {

		// --------------------------------------------------
		// WHY: nothing told the user a fetch was in progress,
		// so a slow/failed Google Apps Script call just
		// looked like the page had frozen.
		// WHAT: onListDocumentReady() already shows the loading
		// overlay before this runs - this just hides it once
		// the DataService callback (success or error) fires,
		// so a failed fetch does not leave it stuck on screen.
		// WHEN: runs every time the Result list is
		// (re)loaded.
		// --------------------------------------------------

		DataService.getAllRecords(

			AppConfig.STORES.RESULT,

			function( arrResults ) {

				hideLoader();
				parseListResponse( arrResults );
			},

			function( objError ) {

				console.log( objError );
				hideLoader();
				CommonUtils.showAlert( "Unable to load Results." );
			}
		);
	}

	function listenersSingleClickModal() {

		$( '#result_show_info' ).off().on( 'click', function() {

			closeSelectMenu();
			openListDetailsPopup();
			onInfoViewDocumentReady();
		});

		if( checkRolePermission( SOFTWARE_FEATURE_CONST.ADD_RESULT ) == true ) {

			$( '#result_add' ).off().on( 'click', function() {

				closeSelectMenu();
				onClickAdd();
			});
		}
		else {

			$( "#result_add" ).hide();
		}

		if( checkRolePermission( SOFTWARE_FEATURE_CONST.EDIT_RESULT ) == true ) {

			$( '#result_edit' ).off().on( 'click', function() {

				closeSelectMenu();
				onClickEdit();
			});
		}
		else {
		
			$( '#result_edit' ).hide();
		}


		if( checkRolePermission( SOFTWARE_FEATURE_CONST.DELETE_RESULT ) == true ){

			$( '#result_delete' ).off().on( 'click', function() {

				closeSelectMenu();
				onClickDelete();
			});
		}
		else {
		
			$( '#result_delete' ).hide();
		}
		if( checkRolePermission( SOFTWARE_FEATURE_CONST.SHARE_RESULT ) == true ){

			$( '#result_share' ).off().on( 'click', function() {

				closeSelectMenu();
				openShareMenu();
			});
		}
		else {
		
			$( '#result_share' ).hide();
		}

		$( '#share_email' ).off().on( 'click', function() {

			mShareMode = MODE_SHARE_EMAIL;

			closeShareMenu();
			onClickShare();
		});

		$( '#share_whatsapp' ).off().on( 'click', function() {

			mShareMode = MODE_SHARE_WHATSAPP;

			closeShareMenu();
			onClickShare();
		});
	}

	function listenersPhotoModal() {

		$( '#gallery_photo' ).off().on( 'click', function() {

			closePhotoMenuPopup();

			var script = ResultScript.getInstance();
			openGallery( script.setSelectedPhoto );
		});

		$( '#camera_photo' ).off().on('click', function() {

			closePhotoMenuPopup();

			var script = ResultScript.getInstance();
			openCamera( script.setSelectedPhoto );
		});
	}

	function listenersFileModal(){

		$( '#choose_file' ).off().on( 'click' , function() {

			closeFileMenuPopup();

			(async () => {
				mFile = await chooser.getFile();
				// console.log(file ? file.name : 'canceled');
				// console.log(file ? file.uri : 'canceled');
				// console.log(file ? file.mediaType : 'canceled');

				$( FORM_FIELD.DOCUMENT_DIV ).show();
				enableSaveButton( true );
				$( FORM_FIELD.DOCUMENTS_PATH ).text( mFile.name );
				
			})();
		});
	}



	function listenersMultiSelect() {
		
		// START - Multiple select menu options
		if( checkRolePermission( SOFTWARE_FEATURE_CONST.DELETE_RESULT ) == true ) {

			$( '#multi_delete' ).off().on( 'click', function() {

				onClickMultiRowDelete();
			});
		}
		else {
		
			$( '#multi_delete' ).hide();
		}

		if( checkRolePermission( SOFTWARE_FEATURE_CONST.SHARE_RESULT ) == true ) {

			$( '#multi_share' ).off().on( 'click', function() {

				closeMultiSelectMenu();
				openShareMenu();
			});
		}
		else {
		
			$( '#multi_share' ).hide();
		}

		$( '#share_email' ).off().on( 'click', function() {

			mShareMode = MODE_SHARE_EMAIL;

			closeShareMenu();
			onClickShare();
		});

		$( '#share_whatsapp' ).off().on( 'click', function() {

			mShareMode = MODE_SHARE_WHATSAPP;

			closeShareMenu();
			onClickShare();
		});


		$( '#multi_option_2' ).on( 'click', function() {

			onClickMultiOption2();
		});
		// Multiple select menu options

		// check mark: select all
		$( "#btn_check_mark" ).off().on( "click", function() {

			onClickSelectAll();
		});

		// un-check mark: deselect
		$( "#btn_un_check_mark" ).off().on( "click", function() {

			resetMultiSelection();
		});

		// open the options for multiple selection
		$( "#btn_multiselect_option" ).off().on( "click", function() {

			openMultiSelectOptions();
		});
	}

	function addSingleSelectModal( obj ) {

		var checkVisibility = document.getElementById( "modal_single_select" );

		if( checkVisibility != null ) {
			

		}
		else { 
			$( ".main-container" ).append( singleClickMenu );
		}


		onClickListItem ($(obj) );
		listenersSingleClickModal();
	}

	function addMultiSelectModal() {

		var checkVisibility = document.getElementById( "modal_multiselect" );

		if( checkVisibility != null ) {
			
			
		}
		else { 
			$( ".main-container" ).append( multi_select_modal );
		}

		listenersMultiSelect();
	}

	function addPhotoModal() {

		var checkVisibility = document.getElementById( "photo_select_modal" );

		if( checkVisibility != null ) {
			

		}
		else { 
			$( ".main-container" ).append( photo_modal );
		}
		openPhotoMenuPopup();
		listenersPhotoModal();
	}


	function addFileModal() {

		var checkVisibility = document.getElementById( 'file_select_modal' );

		if( checkVisibility != null ) {
			

		}
		else { 
			$( '.main-container' ).append( file_modal );
		}

		openFileMenuPopup();
		listenersFileModal();
	}
	function onListDocumentReady() {

		if( getAppMode() == MODE_LOCAL_DB ) {

			createTableResult( null );
		}

		clearSearch();

		showLoader( "Please wait..." );

		// Fetching the fields like City, State, Country, Role, Organization and Lookup list data to populate it in the Filter and other selections. 
		// We will load it from the Cache(Local storage). After laoding all the list we will get the List(getListData) and set data to list view
		onLoadCacheManager();


		// Enable List Search
		var mode = MODE_SEARCH_ON_KEYUP;
		// var mode = MODE_SEARCH_ON_ICON_CLICK;
		
		enableSearch( mode );

		$( "#list_id" ).on( "click", "ul", function( event ) {

			addSingleSelectModal( this );
		});

		if( checkRolePermission( SOFTWARE_FEATURE_CONST.ADD_RESULT ) == true ) {

			$( "#btn_add" ).off().on( "click", function() {

				onClickAdd();
			});
		}
		else {

			$( "#btn_add" ).hide();
		}

		$( "#btn_refresh" ).off().on( "click", function() {

			onClickRefresh();
		});

		//--------- START - FILTER --------------
		$('#filter_icon').off().on( "click", function() {
	
			showFilter();
		});

		$('#filter_params').off().on( "click", function() {

			showFilter();
		});

		$('#btn_filter').off().on( "click", function() {

			doFilterResultList();
		});
		//--------- END - FILTER ----------------

		//----------Multiple selection related operations---------

		$( "#list_id" ).on( "taphold", "ul", function (event) {

			if( mEnableMultiSelection == true ) { //Enabled multiple selection
				
				onTapHold( $(this) );
				listenersMultiSelect();
			}
		});
	}
	// parse summary list response from server
	function parseListResponse( arrResults ) {

		if( !arrResults ) {

			arrResults = [];
		}

		hideLoader();

		// --------------------------------------------------
		// WHY: DataService.getAllRecords() returns plain objects
		// (e.g. { resultId, examName, dateOfExam, totalMarks,
		// marksObtained }), matching the same bridge already used
		// in Category.script.js/parseListResponse(). The rest of
		// this file (doFilterResultList(), createHtmlListItem(),
		// showFilteredList(), etc.) was written for the old
		// SQLite row format, where each Result is a plain array
		// read using SUMMARY_INDEX.RESULT_ID / EXAM_NAME /
		// DATE_OF_EXAM / TOTAL_MARKS / MARKS_OBTAINED as array
		// positions.
		// WHAT: convert each DataService object into that same
		// array-row shape, in this one place only, so every
		// function below this point keeps working exactly as it
		// already did - nothing past this bridge needs to change.
		//
		// NOTE: these field names are this project's best current
		// guess at the real field names your Google Apps Script
		// returns, matching the naming style already confirmed for
		// Category. If your Results sheet/response actually uses
		// different field names, this is the one place to correct
		// them.
		// WHEN: runs every time the Result list is loaded or
		// refreshed from DataService.
		// --------------------------------------------------

		var arrResultRows = [];

		for( var i = 0; i < arrResults.length; i++ ) {

			var objResult = arrResults[ i ];

			var arrRow = [];

			// FIELD NAME FIX: DataService.getAllRecords() resolves
			// through getEntityApiConfig(RESULT).fromBackendFields()
			// (see DataService.js), which returns result_id,
			// student_id, exam_name, subject, marks_obtained, grade,
			// result - NOT resultId/examName/dateOfExam/totalMarks/
			// marksObtained as this bridge previously guessed.
			// date_of_exam and total_marks are not returned here at
			// all, because Result.gs's Sheet has no columns for them
			// yet (see the comment on toBackendFields/fromBackendFields
			// for RESULT in DataService.js) - they default to ""
			// below instead of showing "undefined" until those
			// columns are added.

			arrRow[ SUMMARY_INDEX.RESULT_ID ] = objResult.result_id;
			arrRow[ SUMMARY_INDEX.EXAM_NAME ] = objResult.exam_name;
			arrRow[ SUMMARY_INDEX.DATE_OF_EXAM ] = objResult.date_of_exam || "";
			arrRow[ SUMMARY_INDEX.TOTAL_MARKS ] = objResult.total_marks || "";
			arrRow[ SUMMARY_INDEX.MARKS_OBTAINED ] = objResult.marks_obtained;

			arrResultRows.push( arrRow );
		}

		setStorageData( arrResultRows, SESSION_OBJECT.RESULT_SUMMARY_DATA );

		doFilterResultList();
	}
	// parse summary list response from the storage
	function parseListFromStorage() {

		hideLoader();

		doFilterResultList();
	}
	function onClickListItem( thisObj ) {

		var isMultiSelectActive = getMultiSelectStatus();

		var backgroundColor = thisObj.css( "backgroundColor" );

		var hexColorCode = rgb2hex( backgroundColor ).toUpperCase(); // convert rgb to hex code

		var index = thisObj.index();

		if( isMultiSelectActive == true ) {

			if( hexColorCode == SELECT_LIST_ITEM_COLOR || hexColorCode == DEFAULT_LIST_ITEM_COLOR ) { // Not selected : Select the list item

				thisObj.css( 'backgroundColor', MULTI_SELECT_LIST_ITEM_COLOR );
				setMultiSelectData( index );
			} 
			else { // Selected : Remove the selection

				thisObj.css( 'backgroundColor', DEFAULT_LIST_ITEM_COLOR );
				removeItemFromMultiSelectData( index );
			}

		} 
		else {
			
			onSingleClickListener( index );
		}
	}
	// If we are slecting single item from from the list without mutiple selection
	function onSingleClickListener( index ) {

		var selectedData = mSelectedDataList[ index ];
		
		var id = selectedData[ SUMMARY_INDEX.RESULT_ID ];
		sessionStorage.setItem( SESSION_OBJECT.RESULT_ID, id );
	
		if( mInfoIconClicked == false && mEditIconClicked == false ) {

			openSelectMenu();
		}	
	}

	function clearSearch() {

		$("#search").val("");
	}

	function enableSearch( mode ) {

			if( mode == MODE_SEARCH_ON_KEYUP ) { // Search list onKeyup

				// --------------------------------------------------
				// Universal Search: bound via the native "input" event
				// instead of jQuery's keyup() - input fires for every
				// value change (typing, paste, autofill, mobile
				// keyboard predictions/backspace-hold), whereas keyup
				// can miss some of those. Matches the same fix already
				// applied to the Student List search box. The
				// search_icon click binding right below is unchanged.
				// --------------------------------------------------
				document.getElementById( "search" ).oninput = function() {

					searchList();
				};
			} else if( mode == MODE_SEARCH_ON_ICON_CLICK ) { // Search list onClick Search ICON

				$("#search_icon").click(function () {

					searchList();
				});
			}
		
	}

	function onClickRefresh(){

		resetMultiSelection();

		resetFilterInfo();

		getListData();

		showLoader( "Refreshing..." );
	}

	function onClickAdd() {

		sessionStorage.setItem( SESSION_OBJECT.ADD_EDIT_MODE, INSERT_DATA );

		// You can comment the below two lines and uncomment the last line to restore page mode
		$('#edit_details_title').text('Add New Result');
		openEditDetailsPopup();
		onAddEditDocumentReady();

	}
	function onClickSaveData() {

		var bValid = validateForm();
		if( bValid == true ) {

			var mode = getAddEditMode();

			var title = "Add New";
			var message = "Do you want to add new Result?";
			if( mode == UPDATE_DATA ) {
				title = "Update";
				message = "Do you want to update the Result?";
			}

			if(SettingsScript.FEATURE.ADD_EDIT_CONFIRMATION_MESSAGE == FEATURE_ENABLED){
				
				showConfirmationAlert( message, saveFormData, title, buttonLabels );
			}
			else{

				onConfirmSaveFormData();
			}
		}
	}

	function onClickEdit() {

		sessionStorage.setItem( SESSION_OBJECT.ADD_EDIT_MODE, UPDATE_DATA );

		// You can comment the below two lines and uncomment the last line to restore page mode
		$('#edit_details_title').text('Edit Result');
		openEditDetailsPopup();
		onAddEditDocumentReady();
	}


	function onClickDelete() {

		closeSelectMenu();
		showConfirmationAlert( "Do you want to delete selected Result?", onConfirmDelete, "Message", [ "Delete", "Cancel" ] );
	}

	function searchList() {

		var list = document.getElementById("list_id");
		var listItems = list.getElementsByTagName("ul");

		var input = document.getElementById("search");
		var filter = input.value.toUpperCase();

		// Rebuilt fresh on every keystroke so it always matches exactly
		// what's currently visible - previously this only ever grew
		// (never cleared), which corrupted the row lookup used by
		// multi-select (mMultiSelectedList) the longer someone typed.
		mSearchList = [];

		for( var i = 0; i < listItems.length; i++ ) {

			var resultData = mSelectedDataList[ i ];

			if( resultData == null ) {

				continue;
			}

			// Every field the Result List should be searchable by -
			// previously this only ever checked the rendered Exam
			// Name text in the card's first <li>, so Date Of Exam/
			// Total Marks/Marks Obtained were never actually searched.
			var searchableText = [
				resultData[ SUMMARY_INDEX.EXAM_NAME ],
				resultData[ SUMMARY_INDEX.DATE_OF_EXAM ],
				resultData[ SUMMARY_INDEX.TOTAL_MARKS ],
				resultData[ SUMMARY_INDEX.MARKS_OBTAINED ]
			].join( " " ).toUpperCase();

			if( searchableText.indexOf( filter ) > -1 ) {

				mSearchList[ mSearchList.length ] = resultData;

				listItems[i].style.display = "";
			} else {

				listItems[i].style.display = "none";
			}
		}

		// Displaying No. of Records
		var totalRecordsLength = listItems.length;
		var searchRecordsLength = $( "ul:visible" ).length - 1;
		var searchRecords = "Total: " + searchRecordsLength + "/" + totalRecordsLength + "(filtered)";
		var totalRecords = "Total: " + totalRecordsLength;
		var searchInput = document.getElementById( "search" ).value;

		if( searchInput == "" ) {

			document.getElementById( "records" ).innerText = totalRecords;
		}
		else {

			document.getElementById( "records" ).innerText = searchRecords;
		}
	}
	function onClickListBackButton() {

		if( getMultiSelectStatus() == true ) {

			resetMultiSelection();
		} 
		else if( $( '#modal_single_select' ).hasClass( 'show' )) {

			closeSelectMenu();
		} 
		else if( $( '#list_details' ).hasClass( 'show' )) {
			closeListDetailsPopup();

		} 
		else if( $( '#edit_details' ).hasClass( 'show' )) {

			if( $( '#photo_select_modal' ).hasClass( 'show' )) {

				closePhotoMenuPopup();
			} 
			else{

				onAddEditClose();				
			}
			
		} 
		else if( $( '#modal_filter' ).hasClass( 'show' )) {

			closeFilterMenu();
		} 
		else if( $('#modal_share_question').hasClass('show')) {

			closeShareMenu();
		}
		else {

			if( SettingsScript.FEATURE.DOUBLE_BACK_PRESS == FEATURE_ENABLED ) {

				onDoublePressBackButton();
			}
			else {

				loadBackButtonEvent();
			}
		}
	}

	function onDoublePressBackButton() {

		if( mDoubleBackToExitPressedOnce == true ) {

			loadBackButtonEvent();
		}
		else{

			mDoubleBackToExitPressedOnce = true;
			showShortBottomToast( "Please click BACK again to exit" );
		}

		setTimeout(function(){ 
			mDoubleBackToExitPressedOnce = false;
		}, 3000);
	}

	function loadBackButtonEvent() {

		clearStorage();

		gotoHome();
	}

	function parseInsertUpdateResponse( response, mode ) {

		var resultList = getStorageData( SESSION_OBJECT.RESULT_SUMMARY_DATA );

		if( resultList == null ) {

			resultList = [];
		}

		var message = "";
		if ( mode == INSERT_DATA ) {

			var errorData = getStorageData(SESSION_OBJECT.RESULT_ERROR_DATA);
			if( errorData != null ){

				if( errorData.length > 0 ){

					var errorHandlerScript = ErrorHandlerScript.getInstance();
					errorHandlerScript.syncServerErrorData( getStorageData( SESSION_OBJECT.RESULT_ERROR_DATA ), errorHandlerScript.deleteErrorData );
				}
			}
			
			var result = getAddEditResultArray( response.id );
			message = "Result has been added successfully";
			
			resultList.push( result );

			setStorageData( resultList, SESSION_OBJECT.RESULT_SUMMARY_DATA );
			hideLoader();

			getListData();
		}
		else if ( mode == UPDATE_DATA ) {

			var result = getAddEditResultArray( 0 );
			message = "Result has been updated successfully";

			for ( var i = 0; i < resultList.length; i++ ) {

				var data = resultList[ i ];

				if ( data[ INDEX.RESULT_ID ] == result[ INDEX.RESULT_ID ] ) {

					resultList[ i ] = result;
				}
			}

			setStorageData( resultList, SESSION_OBJECT.RESULT_SUMMARY_DATA );
			hideLoader();

			parseListFromStorage();			
		}

		showOperationMessage(message, "Success", closeEditDetailsPopup);		
	}

	function onConfirmDelete( buttonIndex ) {

		if( buttonIndex == BUTTON_CANCEL ) { // Cancel alert dialog

		} 
		else if( buttonIndex == BUTTON_CONFIRM ) { // Confirm

			var deleteDataArray = getDelDataArray();
			showLoader( "Please wait...", "Fetching data..." );
			deleteRows( deleteDataArray );
		}
	}
	// create an array from the add/edit jsonData. It can be used to update the list after successful Add/Edit operation
	// It can reduce the number of calls to the server after Edit/Add
	function getAddEditResultArray( id ) {

		var data = [];

		data[ SUMMARY_INDEX.RESULT_ID ] = mJsonData[ SUMMARY_JSON_KEY.RESULT_ID ];
		data[ SUMMARY_INDEX.EXAM_NAME ] = mJsonData[ SUMMARY_JSON_KEY.EXAM_NAME ];
		data[ SUMMARY_INDEX.DATE_OF_EXAM ] = mJsonData[ SUMMARY_JSON_KEY.DATE_OF_EXAM ];
		data[ SUMMARY_INDEX.TOTAL_MARKS ] = mJsonData[ SUMMARY_JSON_KEY.TOTAL_MARKS ];
		data[ SUMMARY_INDEX.MARKS_OBTAINED ] = mJsonData[ SUMMARY_JSON_KEY.MARKS_OBTAINED ];

		return data;
	}
	function getDelDataArray() {

		mSelectedIdList = [];

		if( mMultiSelect == false ) { // only single item selected

			var selectedId = getSelectedId();

			mSelectedIdList.push( selectedId );
		} 
		else { // Multiple selection

			var selectedData = getMultiSelectData();

			for( var i = 0; i < selectedData.length; i++ ) {

				var selectedId = selectedData[ i ][ SUMMARY_INDEX.RESULT_ID ];

				mSelectedIdList.push( selectedId );			
			}
		}
			
		return mSelectedIdList;
	}
	function parseDeleteResponse( rowsDeleted, statusCode, response ) {

		if( statusCode == G_ERROR.CODE.DELETE_OPERATION_DEPENDENT_EXISTS ) {

			var errorMsg = response.message;
			
			var message = "Cannot delete the Result." + errorMsg.split("<br>");
			showOperationMessage( message, "Warning", null );
			hideLoader();
		}
		else{

			var resultList = getStorageData( SESSION_OBJECT.RESULT_SUMMARY_DATA );

			for( var i = 0; i < mSelectedIdList.length; i++ ) {

				var deletedId = mSelectedIdList[ i ];

				for( var j = 0; j < resultList.length; j++ ) {

					var data = resultList[ j ];
					if( data[ SUMMARY_INDEX.RESULT_ID ] == deletedId ) {

						resultList.splice( j, 1 );
					}
				}
			}

			setStorageData( resultList, SESSION_OBJECT.RESULT_SUMMARY_DATA );

			if( mMultiSelect == true ) {

				resetMultiSelection();
			}

			parseListFromStorage();

			showOperationMessage( "Selected Result(s) has been deleted successfully", "Success", null );
		}
	}
	function getSelectedId() {

		var id = 0;

		if(sessionStorage.hasOwnProperty(SESSION_OBJECT.RESULT_ID)) {
		
			id = sessionStorage.getItem( SESSION_OBJECT.RESULT_ID );
		}

		return id;
	}

	function getAddEditMode() {

		var mode = parseInt( sessionStorage.getItem( SESSION_OBJECT.ADD_EDIT_MODE) );

		return mode;
	}
	// get selected data for populate Edit form
	function getSelectedData() {

		var data = [];

		var resultList = getStorageData( SESSION_OBJECT.RESULT_DATA );

		if( resultList != null ) {

			var selectedId = getSelectedId();

			data = resultList.find( obj => {
				return obj[ 0 ] == selectedId
			});

			if( typeof data === 'undefined' || data == null ) {

				data = [];
			}
		}

		return data;
	}

	// get selected summary list data
	function getSelectedSummaryListData() {

		var data = [];

		var resultList = getStorageData( SESSION_OBJECT.RESULT_SUMMARY_DATA );

		if( resultList != null ) {

			var selectedId = getSelectedId();

			data = resultList.find( obj => {
				return obj[ 0 ] == selectedId
			});

			if( typeof data === 'undefined' || data == null ) {

				data = [];
			}
		}

		return data;
	}
	//---------- Multiple items selection ------------

	function onTapHold( thisObj ) {

		var index = thisObj.index();
		console.log(index);
		thisObj.css('backgroundColor', MULTI_SELECT_LIST_ITEM_COLOR);

		$('#btn_add').hide();
		$('#btn_refresh').hide();
		//$('#btn_upload').hide();

		$('#btn_check_mark').show();
		$('#btn_un_check_mark').show();
		$("#btn_multiselect_option").show();

		setMultiSelectStatus(true);
		setMultiSelectData(index);
	}

	// Set whether multiple selecction is required or not true/false
	function setMultiSelectStatus( isActive ) {

		mMultiSelect = isActive;
	}

	function getMultiSelectStatus() {

		return mMultiSelect;
	}

	function setMultiSelectData( index ) {

		var arrayIndex = mMultiSelectedList.length;

	

		mMultiSelectedList[ arrayIndex ] = mSearchList[ index ];
	}
	
	function getMultiSelectData() {

		return mMultiSelectedList;
	}

	// Open multiple selection option on click of 3 dots at the list top right corner
	function openMultiSelectOptions() {

		var selectedData = getMultiSelectData();
		console.log( selectedData );

		addMultiSelectModal();
		openMultiSelectMenu();
	}

	function onClickSelectAll() {

		var list = document.getElementById( "list_id" );
		var listItems = list.getElementsByTagName( "ul" );

		mMultiSelectedList = [];

		for( var i = 0; i < listItems.length; i++ ) {

			listItems[ i ].style.backgroundColor = MULTI_SELECT_LIST_ITEM_COLOR;
			setMultiSelectData(i);
		}
	}

	// reset all the multiple selected rows

	function resetMultiSelection() {

		if( $( '#modal_share_result' ).hasClass( 'show' )) {

			closeShareMenu();
		}
		else {
			closeMultiSelectMenu();
			parseListFromStorage();

			setMultiSelectStatus( false );
			mMultiSelectedList = [];

			$( '#btn_check_mark' ).hide();
			$( '#btn_un_check_mark' ).hide();
			$( '#btn_multiselect_option' ).hide();
			   
			if( checkRolePermission( SOFTWARE_FEATURE_CONST.ADD_RESULT ) == true ) {

				$( '#btn_add' ).show();
			}
			else {
			
				$( '#btn_add' ).hide();
			}
			
			$( '#btn_refresh' ).show();
			//$( '#btn_upload' ).show();
			clearSearch();
		}		
	}

	function removeItemFromMultiSelectData( index ) {

		mMultiSelectedList.splice( index, 1 );
	}


	function onClickMultiRowDelete() {

		closeMultiSelectMenu();

		showConfirmationAlert( "Do you want to delete selected Rows?", onConfirmDelete, "Message", [ "Delete", "Cancel" ] );
	}


	function onClickMultiOption1() {

		closeMultiSelectMenu();

		console.log( "Multiple selection option 1: TBD" );
	}

	function onClickMultiOption2() {

		closeMultiSelectMenu();

		console.log( "Multiple selection option 2: TBD" );
	}

	function openSelectMenu() {

		$( '#modal_single_select' ).modal( 'show' );
	}

	function closeSelectMenu() {

		$( '#modal_single_select' ).modal( 'hide' );
	}

	function openMultiSelectMenu() {

		$( '#modal_multiselect' ).modal( 'show' );
	}

	function closeMultiSelectMenu() {

		$( '#modal_multiselect' ).modal( 'hide' );
	}

	function openPhotoMenuPopup() {

		$( '#photo_select_modal' ).modal( 'show' );
	}

	function closePhotoMenuPopup() {

		$( '#photo_select_modal' ).modal( 'hide' );
	}


	function openListDetailsPopup() {

		$( '#list_details' ).modal( 'show' );
	}

	function openFileMenuPopup() {

		$( '#file_select_modal' ).modal( 'show' );
	}

	function closeFileMenuPopup() {

		$( '#file_select_modal' ).modal( 'hide' );
	}

	function closeListDetailsPopup() {

		$( '#list_details' ).modal( 'hide' );
	}

	function openEditDetailsPopup() {

		$( '#edit_details' ).modal( 'show' );
	}

	function closeEditDetailsPopup() {

		$( '#edit_details' ).modal( 'hide' );
		mEditIconClicked = false;
		mInfoIconClicked = false;
	}

	function scrollEditDetailsPopup() {
		
		setTimeout( function(){ 			
			$( 'div.modal-body' ).scrollTop( 0 );
		}, 500 );
	}


	function closeImageButton() {

		$( FORM_FIELD.PHOTO_PATH ).removeAttr( 'src' );
		$( FORM_FIELD.PHOTO_DIV ).hide();
		mFileList = [];
		mImageClosed = true;
		mUploadedImage = [];
		enableSaveButton( true );
	}

	function closeFileButton() {

		$( FORM_FIELD.DOCUMENTS_PATH ).text( '' );
		$( FORM_FIELD.DOCUMENT_DIV ).hide();
		mFileClosed = true;
		mUploadedFiles = [];
		enableSaveButton( true );
	}
	function showFilter() {

		// --------------------------------------------------
		// CONNECTION FIX - WHY / WHAT / WHEN
		// WHY: the Filter icon and the filter-summary text both
		// call showFilter(), but it was never defined anywhere in
		// this file - clicking either one threw "Uncaught
		// ReferenceError: showFilter is not defined" and the
		// Filter modal never opened.
		// WHAT: resultList.html's filter modal has no dropdown of
		// its own to populate - this just opens it, the same
		// simplified fix already applied to Category.script.js.
		// WHEN: runs every time the user clicks the Filter icon
		// or the filter-summary text.
		// --------------------------------------------------

		openFilterMenu();
	}

	function openFilterMenu() {

		$('#modal_filter').modal('show');
	}

	function closeFilterMenu() {

		$('#modal_filter').modal('hide');
	}

	function openShareMenu() {

		$('#modal_share').modal('show');
	}

	function closeShareMenu() {

		$('#modal_share').modal('hide');
	}
	
/*	
	function openDetailsListMenu() {

		$( '#modal_detail_single_select' ).modal( 'show' );
	}

	function closeDetailsListMenu() {

		$( '#modal_detail_single_select' ).modal( 'hide' );
	}
*/

	function createHtmlListItem( data, index ) {

		// --------------------------------------------------
		// WHY: this read data[ SUMMARY_INDEX.FIRST_FILL_IN ] and
		// data[ SUMMARY_INDEX._FILL_IN ] - neither key exists in
		// SUMMARY_INDEX (RESULT_ID, EXAM_NAME, DATE_OF_EXAM,
		// TOTAL_MARKS, MARKS_OBTAINED do). Same unfinished
		// code-generation placeholder already fixed in
		// Category.script.js's createHtmlListItem(), never applied
		// here - this is why every Result card rendered as
		// "1) undefined".
		// WHAT: point the card's title at the Exam Name and the
		// subtitle at the Date of Exam, the two most identifying
		// fields for a Result.
		// WHEN: runs once per Result card, every time the list is
		// drawn.
		// --------------------------------------------------

		var name = data[ SUMMARY_INDEX.EXAM_NAME ];
		var fillInData = data[ SUMMARY_INDEX.DATE_OF_EXAM ];
		var seqNumber = index + 1 +') ';

		var infoIconHtml = '<span class="icon-btn icon-btn-info" onclick="ResultScript.getInstance().onClickInfoIcon('+ index +');"><i class="fa fa-info-circle" aria-hidden="true"></i></span>';
		var editIconHtml = '';
		if( checkRolePermission( SOFTWARE_FEATURE_CONST.EDIT_RESULT ) == true ) {

			editIconHtml = '<span class="icon-btn icon-btn-edit" onclick="ResultScript.getInstance().onClickEditIcon('+ index +');" style="position:absolute; top:14px; right:14px;"><i class="fas fa-edit"></i></span>';
		}

		// --------------------------------------------------
		// WHY/WHAT: same inline-shadow removal + shared .icon-btn /
		// .list-card-title / .list-card-subtitle classes as
		// Category/Section/Student.script.js's createHtmlListItem(),
		// so every list page shares one consistent card look.
		// --------------------------------------------------
		var htmlListItem =  '<ul class="list-dis" id="list_card" onselectstart="return false" style="position:relative;">' +
							editIconHtml +
							'<div id="list_item" class="list-item">' +
							'<li class="list-card-title">'+ seqNumber + name + '</li>' +
							'<li class="list-card-subtitle">' + infoIconHtml + '<span>' + fillInData + '</span></li>' +
							'</div>' +
							'</ul>';

		return htmlListItem;
	}

	// Set selected photo or captured photo into the Add/Edit form
	function setSelectedPhoto() {

		$( FORM_FIELD.PHOTO_DIV ).show();
		
		enableSaveButton(true);

		$( FORM_FIELD.PHOTO_PATH ).attr( "src", mFileList[0] );
	}


	function bindFormEventHandlers() {
		$( '#edit_details' ).on( "change", 'select, input, textarea', enableSaveButton );
		$( '#edit_details' ).on( "keyup", 'input, textarea', enableSaveButton );
	}

	function enableSaveButton( param ) {

		if( param != undefined && param == false ) {
			document.getElementById( "save_div" ).style.display = "none";
			return;
		}
		else{

			document.getElementById( "save_div" ).style.display = "block";
			return;
		}
	}


	// Select MAX id from the 
	function getMaxId( callback ) {

		var query = "SELECT MAX( " + DB_FIELD.RESULT_ID + " ) AS maxcount FROM " + TABLE_NAME;

		getMaxDbId( query, callback );	//please change function name at its definition in db.handler.js to this name if not same as this.
	}

	function createTableResult( callback ) {

		var query = 'CREATE TABLE IF NOT EXISTS ' + TABLE_NAME + ' (' +
			DB_FIELD.RESULT_ID + ' INTEGER ,' +
			DB_FIELD.EXAM_NAME + ' TEXT ,' +
			DB_FIELD.DATE_OF_EXAM + ' INTEGER ,' +
			DB_FIELD.TOTAL_MARKS + ' INTEGER ,' +
			DB_FIELD.MARKS_OBTAINED + ' INTEGER' +
			')';

		executeQuery( query, callback );
	}


	function getInsertQuery() {

		var query = 'INSERT INTO ' + TABLE_NAME + '(' +

			DB_FIELD.RESULT_ID + ',' +
			DB_FIELD.EXAM_NAME + ',' +
			DB_FIELD.DATE_OF_EXAM + ',' +
			DB_FIELD.TOTAL_MARKS + ',' +
			DB_FIELD.MARKS_OBTAINED +
			') VALUES (?, ?, ?, ?, ?)';
		return query;
	}

	function getUpdateQuery() {

		var query = 'UPDATE ' + TABLE_NAME + ' SET ' +
			DB_FIELD.RESULT_ID + '=?, ' +
			DB_FIELD.EXAM_NAME + '=?, ' +
			DB_FIELD.DATE_OF_EXAM + '=?, ' +
			DB_FIELD.TOTAL_MARKS + '=?, ' +
			DB_FIELD.MARKS_OBTAINED +' =? WHERE ' +
			DB_FIELD.RESULT_ID + '=' + getSelectedId();

		return query;
	}


	function onErrorFetchData( url, description, logData, flag ){

		var errorHandlerScript = ErrorHandlerScript.getInstance();
		errorHandlerScript.saveErrorData( "Result", url, "", description, logData, flag, null );
	}

	// --------------------------------------------------
	// WHY: Previously, this function fetched the preview
	// record over the network or from SQLite - neither exists
	// in this PWA. This mirrors getData()/parseFormDataResponse()
	// above, which use the same DataService.getRecordById() call
	// for the Edit form.
	// WHAT: asks DataService for the single Result being
	// previewed and hands it to parsePreviewResponse().
	// WHEN: runs when the user opens the Info/Preview popup
	// for a specific Result.
	// --------------------------------------------------

	function onInfoViewDocumentReady() {

		DataService.getRecordById(

			AppConfig.STORES.RESULT,

			getSelectedId(),

			function( objResult ) {

				if( objResult ) {

					parsePreviewResponse( [ objResult ] );
				}
			},

			function( objError ) {

				console.log( objError );
				hideLoader();
				CommonUtils.showAlert( "Unable to load Result." );
			}
		);
	}

	function parsePreviewResponse( arrResult ) {

		var arrResultRows = [];

		for( var i = 0; i < arrResult.length; i++ ) {

			var objResult = arrResult[ i ];

			var arrRow = [];
			arrRow[ INDEX.RESULT_ID ] = objResult.result_id;
			arrRow[ INDEX.EXAM_NAME ] = objResult.exam_name;
			arrRow[ INDEX.DATE_OF_EXAM ] = objResult.date_of_exam;
			arrRow[ INDEX.TOTAL_MARKS ] = objResult.total_marks;
			arrRow[ INDEX.MARKS_OBTAINED ] = objResult.marks_obtained;

			arrResultRows.push( arrRow );
		}

		// WHY/WHAT: same object -> array-row bridge as
		// parseFormDataResponse() above, so the Info popup's
		// setPreview() can actually find the record.
		setStorageData( arrResultRows, SESSION_OBJECT.RESULT_DATA );

		setPreview();
	}

	// onClick List item detail view
	function setPreview() {

		var data =  getSelectedData();

		mInfoIconClicked = false;
		mEditIconClicked = false;
		$(FORM_FIELD_INFO.LBL_RESULT_ID).text( data[INDEX.RESULT_ID] );
		$(FORM_FIELD_INFO.LBL_EXAM_NAME).text( data[INDEX.EXAM_NAME] );
		$(FORM_FIELD_INFO.LBL_DATE_OF_EXAM).text( getShowDateTimePattern( parseInt( data[INDEX.DATE_OF_EXAM] ) ) );
		$(FORM_FIELD_INFO.LBL_TOTAL_MARKS).text( data[INDEX.TOTAL_MARKS] );
		$(FORM_FIELD_INFO.LBL_MARKS_OBTAINED).text( data[INDEX.MARKS_OBTAINED] );

		// --------------------------------------------------
		// WHY: INDEX.PHOTO_PATH / INDEX.DOCUMENT_PATH are not
		// defined for this entity, so data[undefined] is always
		// undefined here. Calling .length straight on that
		// undefined docPath threw "Cannot read properties of
		// undefined (reading 'length')" every time the Info popup
		// opened - the same crash already fixed in
		// Category.script.js's setPreview().
		// WHAT: only touch photoPath/docPath when they are
		// actually defined.
		// --------------------------------------------------
		var photoPath = data[ INDEX.PHOTO_PATH ];
		if( photoPath !== undefined && photoPath !== "" && photoPath !== null ) {

			$( '#preview_image_div' ).show();
			$( '#preview_image_id' ).attr( 'src', photoPath);
		}
		else{

			$( '#preview_image_div' ).hide();
			$( '#preview_image_id' ).removeAttr( 'src' );	
		}

		var docPath = data[ INDEX.DOCUMENT_PATH ];
		if( docPath !== undefined && docPath.length > 0 && docPath !== null && docPath !== '' ) {

			var fileList = JSON.parse( docPath );
			var fileName = getUriFileName( fileList[ 0 ] );

			$( '#preview_doc_div' ).show();
			$( '#preview_doc_id' ).text( fileName );
		}
		else{

			$( '#preview_doc_div' ).hide();
			$( '#preview_doc_id' ).text( '' );
		}

	}
	function doFilterResultList() {

		clearSearch();
		
		var list = getStorageData( SESSION_OBJECT.RESULT_SUMMARY_DATA );

		// --------------------------------------------------
		// WHY: this fetched the Result summary list into `list`
		// but never actually did anything with it - unlike
		// doFilterCategoryList() in Category.script.js, it never
		// called showFilteredList(), so the freshly loaded Results
		// were never handed to the function that builds the list
		// HTML and writes the "Total: N" count. The backend call
		// was succeeding the whole time; the page just never
		// rendered what came back, which is why the Result List
		// always looked empty.
		// WHAT: pass the loaded list straight to showFilteredList(),
		// same as Category/Student already do.
		// WHEN: runs every time the Result list is loaded, filtered,
		// or refreshed.
		// --------------------------------------------------
		if( list == null ) {

			list = [];
		}

		showFilteredList( list );

		closeFilterMenu();					
	}
	function showFilteredList( response ) {

		if( response == null || response === "" ) {

			response = []; // an empty array
		}
		mSearchList = response;

		mSelectedDataList = response; // Initializing the Selected data array

		mMultiSelectedList = []; // Initializing the Selected data array

		var htmlContent = "";

		if( response.length === 0 ) {

			// UI MODERNIZATION PASS 2 (added): shared empty-state
			// block instead of leaving the list area blank.
			htmlContent = CommonUtils.getEmptyStateHtml( "Results", "fa-solid fa-square-poll-vertical" );
		}

		for( var i = 0; i < response.length; i++ ) {

			var data = response[ i ];

			htmlContent += createHtmlListItem( data, i );
		}

		var list = getStorageData( SESSION_OBJECT.RESULT_SUMMARY_DATA );
		var totalCount = list ? list.length : 0;


		// Displaying No. of Records
		var totalRecords = response.length;

		var records = "Total: " + totalRecords;
		if( totalRecords < totalCount ) {

			records += "/" + totalCount;
		}
		
		document.getElementById( "records" ).innerText = records;

		setListToView( htmlContent );
	}


	function getFilterSelectionIds( key ){

		var selectedId = sessionStorage.getItem( key );

		if( selectedId == null ) {

			selectedId = 0;
		}

		return selectedId;
	}


	function resetFilterInfo(){
		// Reset filter info

	}

	function populateSelection( listData, formField, selectedValueId ) {

		if( listData == null ) {
			listData = [];
		}

		$(formField).empty(); //remove all child nodes

		var newOption = $('<option value="0" >Select Result</option>');
		if( formField === '#filter_result_id' ) { // For filter we will show "Select All" as an option

			newOption = $( '<option value="0" >Select All</option>' );
		}

		$(formField).append( newOption );
		$(formField).trigger( "chosen:updated" );
		for( var index = 0; index < listData.length; index++ ) {

			var id = listData[ index ][ INDEX.RESULT_ID ];
			var name = listData[ index ][ INDEX.NAME ];	// UPDATE THIS as per Object

			var option = document.createElement( 'option' );
			option.value = id;
			option.text = name;

			$(formField).append( option );

			if( id == selectedValueId && id != 0 ) {

				$(formField).val( id ).change();
			}
		}
	}
	// Show Result info on click of info icon in the list item
	function onClickInfoIcon( index ){

		mInfoIconClicked = true;

		var selectedData = mSelectedDataList[ index ];

		var id = selectedData[ SUMMARY_INDEX.RESULT_ID ];
		sessionStorage.setItem( SESSION_OBJECT.RESULT_ID, id );
		
		openListDetailsPopup();
		onInfoViewDocumentReady();
	}

	// Open Edit Result on click of edit icon in the list item
	function onClickEditIcon( index ) {

		mEditIconClicked = true;

		var selectedData = mSelectedDataList[ index ];

		var id = selectedData[ SUMMARY_INDEX.RESULT_ID ];
		sessionStorage.setItem( SESSION_OBJECT.RESULT_ID, id );

		sessionStorage.setItem( SESSION_OBJECT.ADD_EDIT_MODE, UPDATE_DATA );
		$('#edit_details_title').text( 'Edit Result' );
		openEditDetailsPopup();
		onAddEditDocumentReady();
	}
	// Start - Share Result data
	function onClickShare(){

		var messageTitle = "Confirm";
		var message = "Do you want to share Result(s)?";
		showConfirmationAlert( message, onConfirmShare, messageTitle, buttonLabels );
	}

	function onConfirmShare(buttonIndex){

		if( buttonIndex == BUTTON_CANCEL ) {
			
			// Cancel alert dialog
		} 
		else if( buttonIndex == BUTTON_CONFIRM ) { // Confirm

			var data = getShareData();

			if( mShareMode == MODE_SHARE_EMAIL ) { // Share by EMAIL

				onClickShareByEmail( data );
			}
			else { // Share by WhatsApp

				onClickShareByWhatsApp( data );
			}			
		}		
	}

	function onClickShareByEmail( data ){

		var subject = "Result(s)";
		var body = data;
		var filePath = "";
		var email = "";

		if( mMultiSelect == true ) {
					
			resetMultiSelection();
		}

		invokeMail( subject, body, filePath, email );
	}

	function onClickShareByWhatsApp( data ){

		shareOnWhatsApp( data );

		if( mMultiSelect == true ) {

			resetMultiSelection();
		}
	}

	function getShareData() {

		var resultText = "";
		if( mMultiSelect == true ){

			var selectedData = getMultiSelectData();
		
			for( var i = 0; i < selectedData.length; i++ ) {

				var seqNumber = i + 1;
				resultText += getFormattedData( seqNumber, selectedData[i] );
			}
		}
		else { // Single Click Selection

			var selectedData = getSelectedSummaryListData();
			var seqNumber = 1;
			resultText += getFormattedData( seqNumber, selectedData );		
		}

		return resultText;
	}

	function getFormattedData( seqNumber, selectedData ) {

		var resultText = "";

/*	Write your code in here
		var name = selectedData[SUMMARY_INDEX.FIRST_NAME] + " " + selectedData[SUMMARY_INDEX.LAST_NAME];

		var mobileNumber = selectedData[SUMMARY_INDEX.MOBILE_NUMBER];
		

		if( mShareMode == MODE_SHARE_EMAIL ){ // Share by EMAIL

			resultText += seqNumber +") " + name + "<br>";
			resultText += mobileNumber + "<br><br>";
		}
		else { // Share by WhatsApp

			resultText += "_*" + seqNumber +") " + name + "*_\n";
			resultText += "*" + mobileNumber + "*\n\n";
		}
*/		
		return resultText;
	}
	// End - Share data

	function init() {
		return {
			//expose all public instance methods
			setStorageData: setStorageData,
			getStorageData: getStorageData,
			onListDocumentReady: onListDocumentReady,
			onClickListBackButton: onClickListBackButton,
			onAddEditDocumentReady: onAddEditDocumentReady,
			onConfirmNetworkSaveData: onConfirmNetworkSaveData,
			bindFormEventHandlers: bindFormEventHandlers,
			enableSaveButton:enableSaveButton,
			populateSelection:populateSelection,
			onClickInfoIcon: onClickInfoIcon,
			onClickEditIcon: onClickEditIcon,
			// setSelectedPhoto: setSelectedPhoto,
			closeImageButton: closeImageButton,
			closeFileButton: closeFileButton,
			uploadDocuments: uploadDocuments,
			createTableResult: createTableResult,
			getInsertQuery: getInsertQuery
		};
	}

	return {
		// Get the Singleton instance if one exists
		// or create one if it doesn't
		getInstance: function () {
			if ( instance == null ) {
				instance = init();
			}
			return instance;
		},
		//expose all public method and objects here
		INDEX: INDEX,
		SUMMARY_INDEX : SUMMARY_INDEX,
		JSON_KEY: JSON_KEY,
		SUMMARY_JSON_KEY: SUMMARY_JSON_KEY,
		LABEL: LABEL,
		FORM_FIELD: FORM_FIELD,
		URL: URL,
		TABLE_NAME: TABLE_NAME
	};
})();