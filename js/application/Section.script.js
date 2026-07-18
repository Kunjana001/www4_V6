////////////////////////////////////////////////////////////////////////////

// FileName Section.script.js: Section Javascript file for Cordova project

// Author : JRC
// Description : codegen


////////////////////////////////////////////////////////////////////////////

/* ----------------------------------------------------------
   Project Improvements (Pagination / Loading Performance pass)
   ----------------------------------------------------------
   ✓ ROOT CAUSE: getListData() called DataService.getAllRecords(
     AppConfig.STORES.SECTION, ...) - one request asking the
     backend for the ENTIRE Section table (via
     DataService.js's internal LIST_ALL_PAGE_SIZE=100000), then
     held/rendered/filtered all of it client-side through
     doFilterSectionList()/showFilteredList(). That is exactly
     the "fetch every Google Sheet page into memory" bug this
     pass removes.
   ✓ FIX: getListData()/parseListResponse() now ask the backend
     for exactly one 100-row page at a time via
     DataService.getRecordsPage() (?page=N&pageSize=100), the
     same real-pagination pattern already used by
     Category.script.js/Student.script.js. Added mCurrentPage/
     mPageSize/mTotalPages/mTotalRecords state, a Prev/Next
     pagination bar (buildPaginationBarHtml()/
     bindPaginationBarListeners(), appended by showFilteredList()),
     and updated onClickRefresh() to reload only the page
     currently on screen (Task 2), not the whole table.
   ✓ SEARCH: there is no searchSections backend action, so -
     exactly like Student.script.js - searchList() keeps
     filtering only the currently loaded page, instantly,
     client-side; enableSearch() now wraps that in the same
     250ms debounce Category.script.js uses for its search
     (Task 6).
   ✓ Category List loading (Task 3): the fix for "Category List
     stuck on Please Wait" lives in DataService.js, not here -
     see its "Pagination / Loading Performance pass" note. This
     file's own onLoadCacheManager() already calls
     DataService.getAllRecords(CATEGORY, ...) purely as a
     lookup (Section cards showing their parent Category's
     name) - that call is now served from DataService's shared
     in-memory cache instead of hitting the network every time
     this page opens (Task 5).
   No function renamed, no file/folder moved, no architecture
   change - only getListData()/parseListResponse()/
   doFilterSectionList()/showFilteredList()/enableSearch()/
   onClickRefresh() above, all already-existing functions, were
   modified.
   ---------------------------------------------------------- */

/* ----------------------------------------------------------
   Final QA Pass - Back Button / Share Modal Fix (added)
   ----------------------------------------------------------
   Fixed a broken Back-button/reset check in Section.script.js:
   the Back-button handler and resetMultiSelection() both
   tested for the Share modal being open using ids that don't
   exist anywhere in the DOM, so those checks were always
   false. The real share modal's id is "modal_share" - both
   checks now use that instead, so pressing Back while the
   Share modal is open correctly closes it instead of falling
   through to the double-back-press "press again to exit"
   logic. No architecture, file, or folder changes.
   ---------------------------------------------------------- */

/* ----------------------------------------------------------
   Final QA Pass - Console Cleanup (added)
   ----------------------------------------------------------
   Removed leftover debug console.log() calls in Section.script.js
   (form-data dumps, TBD stub messages, commented-out
   file-picker logs, etc.) and replaced every
   console.log(objError)/console.log(error) inside a catch
   block with CommonUtils.logError("Section.script.js
   (<function>)", objError), matching the pattern already
   used in common.js/DataService.js. No behavior changed -
   errors are still logged, just through the shared utility
   instead of a bare console.log. The two "Multiple selection
   option 1/2: TBD" stubs were left as // TODO comments
   instead of being silently removed, since those two menu
   options are genuinely unimplemented, not just noisy
   logging. No architecture, file, or folder changes.
   ---------------------------------------------------------- */

/* ----------------------------------------------------------
   UI Modernization Pass 2 (added)
   ----------------------------------------------------------
   showFilteredList() now shows a shared empty-state message when a search/filter returns zero sections
   instead of leaving the list area blank, via
   CommonUtils.getEmptyStateHtml(). No existing function
   removed or renamed; architecture unchanged.
   ---------------------------------------------------------- */

/*/* ==========================================================
   PWA MIGRATION NOTES
   Section.script.js

   Purpose

   Migrated Section.script.js from the legacy
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
       createTableSection()

   The MODE_NETWORK_DB check inside popUpAddForm() has been
   intentionally retained because it generates the default
   identifier for a new Section record and does not perform
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



var SectionScript = (function () {
	// Check whether the Multiple selection is active or not
	var mMultiSelect = false;

	// Manage List multiple selection
	var mMultiSelectedList = [];
	// Manage search list
	var mSearchList = [];

	// Instance stores a reference to the Singleton
	var instance;

	//Url
	var URL = "/SectionDataHandler";
	var URL_SUMMARY = "/SummaryList";
	var mJsonData = null; // JSON data used for Add/Edit
	var mSelectedIdList = []; // List of IDs of the selected items

	// We can Enable/Disable Multiple selection by using it
	// true: Enable multiple selection, false: Disable multiple selection 
	var mEnableMultiSelection = true;


	// Save the Filtered main list
	var mSelectedDataList = [];

	// --------------------------------------------------
	// PAGINATION FIX (this pass) - real pagination state.
	// WHY: this page used to call DataService.getAllRecords()
	// (see the old getListData() below) - one single request
	// asking the backend for the ENTIRE Section table, then held
	// and rendered/filtered all of it client-side. That is
	// exactly the "fetch every page into memory" bug this pass
	// removes: with a real dataset (hundreds/thousands of rows)
	// every Section List open downloaded the whole table just to
	// show the first screen of cards.
	// WHAT: getListData()/parseListResponse() below now ask the
	// backend for exactly one 100-row page at a time via
	// DataService.getRecordsPage(), the same real-pagination
	// pattern already used by Category.script.js/Student.script.js.
	// These variables track which page is currently showing so
	// the Prev/Next buttons (buildPaginationBarHtml() below) and
	// Refresh (onClickRefresh()) know which page to (re)request.
	// Project Improvements (this pass): searchSections IS wired up
	// now via DataService.js's SECTION.searchAction (it already
	// existed as a backend action, it just wasn't referenced from
	// the frontend entity map) - see searchList() below, which now
	// reloads page 1 through the server instead of filtering only
	// the currently loaded page.
	// --------------------------------------------------
	var mCurrentPage = 1;
	var mPageSize = 100;
	var mTotalPages = 1;
	var mTotalRecords = 0;
	var mCurrentSearchKeyword = "";
	var mSearchDebounceTimer = null;

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
	var TABLE_NAME = "section";
	//--------------Table row index:-----------------

	var value = 0;

	// --------------------------------------------------------
	// PROJECT IMPROVEMENTS (Final UX Polish pass - added)
	// --------------------------------------------------------
	// WHY: Section.gs (the backend) requires categoryId to Add or
	// Update a Section - already documented in DataService.js's
	// GOOGLE_ENTITY_MAP[SECTION].toBackendFields comment - but this
	// form never collected one, so every Section Add/Update reached
	// Google and came back with "Category is required.", which is
	// why new/edited Sections never actually showed up.
	// WHAT: CATEGORY_ID added to INDEX/SUMMARY_INDEX/LABEL/DEFAULT/
	// FORM_FIELD/FORM_FIELD_INFO/JSON_KEY/SUMMARY_JSON_KEY/DB_FIELD,
	// the same shape already used for CATEGORY_ID everywhere else
	// in this project (e.g. Student.script.js).
	// --------------------------------------------------------

	var INDEX = {
		SECTION_ID : value++,		// 1
		NAME : value++,		// 2
		CATEGORY_ID : value++,		// 3
	};

	//--------------Summary row index:-----------------

	value = 0;

	var SUMMARY_INDEX = {
		SECTION_ID : value++,		// 1
		NAME : value++,		// 2
		CATEGORY_ID : value++,		// 3
	};

	//-------------Table Header Label----------------------

	var LABEL = {

		SECTION_ID : "Section",
		NAME : "Name",
		CATEGORY_ID : "Category"
	};

	//-----------------------------Default values------------------------------------
	//// TODO: Assign group_lookup_id of Lookup forign keys
	//// (Final QA note: this TODO predates this QA pass and is
	//// part of the original codegen scaffolding, not something
	//// introduced by recent changes. Left unresolved rather
	//// than guessed at, since implementing it correctly needs
	//// the intended group_lookup_id convention from the
	//// original spec/mentor, which isn't available here.)
	var DEFAULT = {

		SECTION_ID : 0,
		NAME : "",
		CATEGORY_ID : 0
	};

	//-----------------------------Form Elements------------------------------------
	var FORM_FIELD = {

		SECTION_ID : '#section_id',
		NAME : '#name',
		CATEGORY_ID : '#category_id',
		DOCUMENT_DIV : '#file_div',
		DOCUMENTS_PATH : '#file_id',
		PHOTO_DIV : '#image_div',
		PHOTO_PATH: '#image_id'

	};

	var FORM_FIELD_INFO = { 		// For Show Info Screen

		LBL_SECTION_ID : '#lbl_section_id',
		LBL_NAME : '#lbl_name',
		LBL_CATEGORY_ID : '#lbl_category_id'
	};

	//-----------------------------JSON Key------------------------------------
	var JSON_KEY = {

		SECTION_ID : "section_id",
		NAME : "name",
		CATEGORY_ID : "category_id"
	};

	//-----------------------------SUMMARY JSON Key------------------------------------
	var SUMMARY_JSON_KEY = {

		SECTION_ID : "section_id",
		NAME : "name",
		CATEGORY_ID : "category_id"
	};

	//-----------------------------DB Table Fields------------------------------------
	var DB_FIELD = {

		SECTION_ID : "section_id",
		NAME : "name",
		CATEGORY_ID : "category_id"
	};
	//------------------------------SESSION OBJECT--------------------------------------
	var SESSION_OBJECT = {

		SECTION_ID: "SECTION_ID",
		ADD_EDIT_MODE: "ADD_EDIT_MODE",
		SECTION_DATA: "SECTION_DATA",
		SECTION_SUMMARY_DATA: "SECTION_SUMMARY_DATA",
		CATEGORY_LIST: "SECTION_CATEGORY_LIST"
	}
	// Clear all the data which used to store in the session on click backbutton and goback from the list
	function clearStorage(){

		clearSessionStorage( SESSION_OBJECT.ADD_EDIT_MODE );
		clearSessionStorage( SESSION_OBJECT.SECTION_DATA );
		clearSessionStorage( SESSION_OBJECT.SECTION_SUMMARY_DATA );

		clearSessionStorage( SESSION_OBJECT.SECTION_ID );


	}

	// get Section data from the storage : we can retrieve data using the key which we used to store the data
	// getStorageData(SESSION_OBJECT.SECTION_DATA)

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

	// set Section data into the storage : we can set the data using a key and the same key we should use for retriving the data
	// setStorageData(jsonData, SESSION_OBJECT.SECTION_DATA)
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

		// --------------------------------------------------------
		// PROJECT IMPROVEMENTS (added): Section.gs (the backend)
		// requires categoryId to Add or Update a Section - see the
		// CATEGORY_ID comment above. FormValidation/G_ERROR are
		// never defined anywhere in this project (every fv.checkEmpty
		// call below is commented out for exactly that reason), so
		// this uses plain jQuery + CommonUtils.showAlert() instead,
		// the same toast already used for every other validation
		// message in this app.
		// --------------------------------------------------------
		if( $(FORM_FIELD.CATEGORY_ID).val() == "0" || $(FORM_FIELD.CATEGORY_ID).val() == "" ) {

			CommonUtils.showAlert( "Please select a " + LABEL.CATEGORY_ID + "." );
			return false;
		}

/* Enable as per requirement */
		// bValid = bValid && fv.checkEmpty($(FORM_FIELD.SECTION_ID), G_ERROR.MSG.empty_error+LABEL.SECTION_ID);
		// bValid = bValid && fv.checkEmpty($(FORM_FIELD.NAME), G_ERROR.MSG.empty_error+LABEL.NAME);

		return bValid;
	}
	function setFormDefaults( sectionId ) {
		$(FORM_FIELD.SECTION_ID).val(sectionId);
		$(FORM_FIELD.NAME).val(DEFAULT.NAME);

		loadCategoryListForForm( DEFAULT.CATEGORY_ID );

		enableSaveButton( false );

		$( FORM_FIELD.DOCUMENT_DIV ).hide();
		$( FORM_FIELD.DOCUMENTS_PATH ).text("");
		$( FORM_FIELD.PHOTO_DIV ).hide();
		$( FORM_FIELD.PHOTO_PATH ).removeAttr( 'src' );

		setTimeout( function(){ 

			var errorHandlerScript = ErrorHandlerScript.getInstance();
			errorHandlerScript.getAutoFillErrorData( "Section", parseErrorDataResponse );
		}, 1000 );
	}

	// --------------------------------------------------------
	// PROJECT IMPROVEMENTS (added)
	// --------------------------------------------------------
	// WHY: the Add/Edit Section form needs a Category picker (the
	// backend requires categoryId - see validateForm() above), the
	// same way Student.script.js loads its own Category dropdown.
	// WHAT: fetches every Category via DataService, bridges each
	// into the array-row shape CategoryScript.INDEX expects, then
	// asks CategoryScript's own populateSelection() to build the
	// <select id="category_id"> options and select selectedId.
	// WHEN: called from setFormDefaults() (Add) and popUpEditForm()
	// (Edit).
	// --------------------------------------------------------
	function loadCategoryListForForm( selectedId ) {

		DataService.getAllRecords( AppConfig.STORES.CATEGORY, function( arrCategories ) {

			var categoryScript = CategoryScript.getInstance();
			var arrCategoryRows = [];

			for( var index = 0; index < arrCategories.length; index++ ) {

				var objCategory = arrCategories[ index ];
				var arrRow = [];

				arrRow[ CategoryScript.INDEX.CATEGORY_ID ] = objCategory.category_id;
				arrRow[ CategoryScript.INDEX.NAME ] = objCategory.name;

				arrCategoryRows.push( arrRow );
			}

			setStorageData( arrCategoryRows, SESSION_OBJECT.CATEGORY_LIST );

			categoryScript.populateSelection( arrCategoryRows, FORM_FIELD.CATEGORY_ID, selectedId );
			enableSaveButton( true );

		}, function( objError ) {

			CommonUtils.logError( "Section.script.js (loadCategoryListForForm)", objError );

			// Keep going even if Categories fail to load, so the
			// Add/Edit form still opens (just with an empty picker).
			setStorageData( [], SESSION_OBJECT.CATEGORY_LIST );
			enableSaveButton( true );
		});
	}


	function parseErrorDataResponse( response ){

		var data = [];

		if( response.rows.length > 0 ){

			var i = 0;

			var errorJsonData = response.rows.item( i )[ ErrorHandlerScript.DB_FIELD.JSON_DATA ];

			var jsonData = JSON.parse( errorJsonData );

			populateFromLocalStorage( jsonData );
		}

		setStorageData( data, SESSION_OBJECT.SECTION_ERROR_DATA );
	}
	function populateFromLocalStorage( data ){
		$( FORM_FIELD.SECTION_ID ).val( data[ INDEX.SECTION_ID ] );
		$( FORM_FIELD.NAME ).val( data[ INDEX.NAME ] );

		loadCategoryListForForm( data[ INDEX.CATEGORY_ID ] );

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

			loadAddFormData( DEFAULT.SECTION_ID );
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

		$(FORM_FIELD.SECTION_ID).val(data[INDEX.SECTION_ID]);
		$(FORM_FIELD.NAME).val(data[INDEX.NAME]);

		loadCategoryListForForm( data[INDEX.CATEGORY_ID] );

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
		jsonData[ JSON_KEY.SECTION_ID ] = ( $(FORM_FIELD.SECTION_ID).val() );
		jsonData[ JSON_KEY.NAME ] = ( $(FORM_FIELD.NAME).val() );
		jsonData[ JSON_KEY.CATEGORY_ID ] = ( $(FORM_FIELD.CATEGORY_ID).val() );

/*
		// used for file upload
		jsonData[ "organization_short_name" ] = getOrgShortName();
*/

		// --------------------------------------------------------
		// PROJECT IMPROVEMENTS (Final UX Polish pass - fixed)
		// --------------------------------------------------------
		// WHY: this used to re-read every field from
		// getSelectedData() (the OLD, pre-edit record) and overwrite
		// what was just read from the form above - so clicking Save
		// on an Edit silently re-saved the record unchanged, no
		// matter what the person had typed. This is the actual
		// cause of "my edits aren't showing up" for Sections.
		// section_id does not need to be re-read here - it already
		// comes from the hidden, readonly #section_id field, which
		// the Edit form population already set from the record
		// being edited.
		// --------------------------------------------------------

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
		errorHandlerScript.saveErrorData( "Section", url, jsonData, description, logData, flag, parseSaveErrorDataResponse );
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
		// Add/Edit Section form.
		// --------------------------------------------------

		var mode = getAddEditMode();

		mJsonData = getFormDataAsJson( mode );

		showLoader( "Please wait...", "Fetching data..." );

		if( mode == INSERT_DATA ) {

			DataService.addRecord(

				AppConfig.STORES.SECTION,

				mJsonData,

				function( savedRecord ) {

					parseInsertUpdateResponse( savedRecord, mode );
				},

				function( error ) {

					CommonUtils.logError( "Section.script.js (onConfirmSaveFormData)", error );
					hideLoader();
					CommonUtils.showAlert( "Unable to save Section." );
				}
			);
		}
		else if( mode == UPDATE_DATA ) {

			DataService.updateRecord(

				AppConfig.STORES.SECTION,

				mJsonData,

				function( savedRecord ) {

					parseInsertUpdateResponse( savedRecord, mode );
				},

				function( error ) {

					CommonUtils.logError( "Section.script.js (onConfirmSaveFormData)", error );
					hideLoader();
					CommonUtils.showAlert( "Unable to save Section." );
				}
			);
		}
		else {

			CommonUtils.logError( "Section.script.js (onConfirmSaveFormData)", "Invalid mode passed, mode = " + mode );
			return false;
		}
	}

	// NOTE: uploadDocuments() below still calls uploadFile(), which does
	// not exist in this PWA. Left untouched (not migrated) because
	// SectionHTML.script.js's onFileUploadSuccess() still calls it
	// directly, and it is still listed in this file's public API object
	// further down - removing it breaks that caller.
	function uploadDocuments(){

		window.FilePath.resolveNativePath( mFile.uri, successNative, failNative );

		function failNative(e) {
		  console.error( 'ResolveNativePath: Error for ' + mFile.uri );
		}
	
		function successNative( finalPath ) {
	
		  uploadFile( mFile.name, mFile.mediaType, finalPath, onFileUploadSuccess, TYPE_UPLOAD_FILES );
		}
	}
	function deleteRows( deleteDataArray ) {

		// --------------------------------------------------
		// WHY: the old code branched between a network DELETE
		// call and a raw SQLite DELETE query, neither of which
		// exist in this PWA anymore. Deletes run one at a time
		// so that if one fails, we stop immediately instead of
		// showing a separate alert for every failed delete.
		// WHAT: deletes each selected Section through
		// DataService, one after another, then refreshes the
		// list once every delete has finished.
		// WHEN: runs after the user confirms a single or
		// multi-select delete.
		// --------------------------------------------------

		deleteNextRow( 0 );

		function deleteNextRow( index ) {

			if( index >= deleteDataArray.length ) {

				parseDeleteResponse( deleteDataArray.length, null, null );
				return;
			}

			DataService.deleteRecord(

				AppConfig.STORES.SECTION,

				deleteDataArray[ index ],

				function() {

					deleteNextRow( index + 1 );
				},

				function( error ) {

					CommonUtils.logError( "Section.script.js (deleteNextRow)", error );
					hideLoader();
					CommonUtils.showAlert( "Unable to delete Section." );
					return;
				}
			);
		}
	}

	function parseFormDataResponse( sectionList ) {

		var arrSectionRows = [];

		for( var i = 0; i < sectionList.length; i++ ) {

			var objSection = sectionList[ i ];

			var arrRow = [];
			arrRow[ INDEX.SECTION_ID ] = objSection.section_id;
			arrRow[ INDEX.NAME ] = objSection.name;
			arrRow[ INDEX.CATEGORY_ID ] = objSection.category_id;

			arrSectionRows.push( arrRow );
		}

		// WHY/WHAT: bridge the plain DataService object(s) into the
		// same array-row shape ([ section_id, name ]) that
		// getSelectedData() reads via INDEX.* positions - matching
		// the fix already applied in Category.script.js. Without
		// this, SESSION_OBJECT.SECTION_DATA held plain objects while
		// getSelectedData() looked them up with obj[0]/obj[1]/...,
		// which never matched, so the Edit form and Info popup
		// always rendered blank/undefined fields.
		setStorageData( arrSectionRows, SESSION_OBJECT.SECTION_DATA );

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
	// Section being edited, the same way getListData() asks
	// for the full list.
	// WHEN: runs when the Edit form is opened for a specific
	// Section.
	// --------------------------------------------------

	// get data for Edit
	function getData() {

		DataService.getRecordById(

			AppConfig.STORES.SECTION,

			getSelectedId(),

			function( objSection ) {

				if( objSection ) {

					parseFormDataResponse( [ objSection ] );
				}
			},

			function( objError ) {

				CommonUtils.logError( "Section.script.js (getData)", objError );
				hideLoader();
				CommonUtils.showAlert( "Unable to load Section." );
			}
		);
	}

	// get Summary Data for List
	// --------------------------------------------------
	// WHY: Previously, this function branched between a
	// network summary fetch and a local SQLite query -
	// neither exists in this PWA. DataService now decides on its own whether the
	// list comes from Google Apps Script, IndexedDB, or the
	// offline cache.
	// WHAT: asks DataService for every Section and hands the
	// result to parseListResponse().
	// WHEN: runs when the Section list page loads.
	// --------------------------------------------------

	function onLoadCacheManager() {

		// --------------------------------------------------
		// CONNECTION FIX - WHY / WHAT / WHEN
		// WHY: onListDocumentReady() calls onLoadCacheManager(),
		// but this function was never defined anywhere in this
		// file - every Section List page load threw
		// "Uncaught ReferenceError: onLoadCacheManager is not
		// defined" right here, which stopped execution before
		// getListData() (a few lines below) ever ran, so no
		// request was ever sent to the backend.
		// WHAT: now that Section cards show their parent Category's
		// name (see createHtmlListItem()), this pre-loads the
		// Category list first - the same "load lookup lists, then
		// the entity list" order Student.script.js already uses for
		// Category + Section - so the name is available on first
		// paint instead of only after the Add/Edit form has opened
		// once.
		// WHEN: runs once, right when the Section list page
		// finishes loading.
		// --------------------------------------------------

		DataService.getAllRecords( AppConfig.STORES.CATEGORY, function( arrCategories ) {

			var arrCategoryRows = [];

			for( var index = 0; index < arrCategories.length; index++ ) {

				var objCategory = arrCategories[ index ];
				var arrRow = [];

				arrRow[ CategoryScript.INDEX.CATEGORY_ID ] = objCategory.category_id;
				arrRow[ CategoryScript.INDEX.NAME ] = objCategory.name;

				arrCategoryRows.push( arrRow );
			}

			setStorageData( arrCategoryRows, SESSION_OBJECT.CATEGORY_LIST );

			getListData();

		}, function( objError ) {

			CommonUtils.logError( "Section.script.js (onLoadCacheManager)", objError );

			// Keep going even if Categories fail to load, so the
			// Section list itself can still load.
			setStorageData( [], SESSION_OBJECT.CATEGORY_LIST );
			getListData();
		});
	}

	function getListData( iRequestedPage ) {

		// --------------------------------------------------
		// PAGINATION FIX (this pass): this used to call
		// DataService.getAllRecords( AppConfig.STORES.SECTION, ... ),
		// which fetches the ENTIRE Section table in one request -
		// exactly the "fetch every page into memory" bug described
		// in the brief. Replaced with DataService.getRecordsPage(),
		// asking the backend for exactly one 100-row page
		// (?page=N&pageSize=100) at a time, same as
		// Category.script.js/Student.script.js. iRequestedPage lets
		// the Prev/Next buttons (bindPaginationBarListeners() below)
		// and onClickRefresh() ask for a specific page; called with
		// no argument (e.g. from onLoadCacheManager() on first load)
		// it re-requests whatever mCurrentPage already is (1, on a
		// fresh page load).
		//
		// WHY (loading overlay): nothing told the user a fetch was
		// in progress, so a slow/failed Google Apps Script call
		// just looked like the page had frozen. onListDocumentReady()
		// already shows the loading overlay before this runs - this
		// just hides it once the DataService callback (success or
		// error) fires, so a failed fetch does not leave it stuck on
		// screen.
		// WHEN: runs every time the Section list is (re)loaded,
		// paged, or refreshed - now for exactly one page at a time,
		// not the whole table.
		// --------------------------------------------------

		if( iRequestedPage ) {

			mCurrentPage = iRequestedPage;
		}

		DataService.getRecordsPage(

			AppConfig.STORES.SECTION,
			mCurrentPage,
			mPageSize,
			mCurrentSearchKeyword,

			function( objPageResult ) {

				hideLoader();
				parseListResponse( objPageResult );
			},

			function( objError ) {

				CommonUtils.logError( "Section.script.js (getListData)", objError );
				hideLoader();
				CommonUtils.showAlert( "Unable to load Sections." );
			}
		);
	}

	function listenersSingleClickModal() {

		$( '#section_show_info' ).off().on( 'click', function() {

			closeSelectMenu();
			openListDetailsPopup();
			onInfoViewDocumentReady();
		});

		if( checkRolePermission( SOFTWARE_FEATURE_CONST.ADD_SECTION ) == true ) {

			$( '#section_add' ).off().on( 'click', function() {

				closeSelectMenu();
				onClickAdd();
			});
		}
		else {

			$( "#section_add" ).hide();
		}

		if( checkRolePermission( SOFTWARE_FEATURE_CONST.EDIT_SECTION ) == true ) {

			$( '#section_edit' ).off().on( 'click', function() {

				closeSelectMenu();
				onClickEdit();
			});
		}
		else {
		
			$( '#section_edit' ).hide();
		}


		if( checkRolePermission( SOFTWARE_FEATURE_CONST.DELETE_SECTION ) == true ){

			$( '#section_delete' ).off().on( 'click', function() {

				closeSelectMenu();
				onClickDelete();
			});
		}
		else {
		
			$( '#section_delete' ).hide();
		}
		if( checkRolePermission( SOFTWARE_FEATURE_CONST.SHARE_SECTION ) == true ){

			$( '#section_share' ).off().on( 'click', function() {

				closeSelectMenu();
				openShareMenu();
			});
		}
		else {
		
			$( '#section_share' ).hide();
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

			var script = SectionScript.getInstance();
			openGallery( script.setSelectedPhoto );
		});

		$( '#camera_photo' ).off().on('click', function() {

			closePhotoMenuPopup();

			var script = SectionScript.getInstance();
			openCamera( script.setSelectedPhoto );
		});
	}

	function listenersFileModal(){

		$( '#choose_file' ).off().on( 'click' , function() {

			closeFileMenuPopup();

			(async () => {
				mFile = await chooser.getFile();

				$( FORM_FIELD.DOCUMENT_DIV ).show();
				enableSaveButton( true );
				$( FORM_FIELD.DOCUMENTS_PATH ).text( mFile.name );
				
			})();
		});
	}



	function listenersMultiSelect() {
		
		// START - Multiple select menu options
		if( checkRolePermission( SOFTWARE_FEATURE_CONST.DELETE_SECTION ) == true ) {

			$( '#multi_delete' ).off().on( 'click', function() {

				onClickMultiRowDelete();
			});
		}
		else {
		
			$( '#multi_delete' ).hide();
		}

		if( checkRolePermission( SOFTWARE_FEATURE_CONST.SHARE_SECTION ) == true ) {

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

			createTableSection( null );
		}

		clearSearch();

		showLoader( "Please wait..." );

		// --------------------------------------------------
		// SKELETON LOADING (UI Modernization pass, this pass):
		// show shimmering placeholder cards immediately instead
		// of leaving #list_id empty while the first page of Sections
		// is still in flight - getListData()/parseListResponse()
		// below replace this with the real cards (which already
		// fade in on insert - see common.css's appCardFadeIn) the
		// moment the backend responds.
		// --------------------------------------------------

		setListToView( CommonUtils.getSkeletonCardsHtml( 6 ) );

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

		if( checkRolePermission( SOFTWARE_FEATURE_CONST.ADD_SECTION ) == true ) {

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

		// --------------------------------------------------
		// PRIORITY 3 / 6 FIX: the floating down-arrow button
		// (#btn_float_next_page, sectionList.html) is this page's
		// pagination "next page" control. Rather than duplicate
		// the getListData(mCurrentPage + 1) logic, this just
		// forwards the click to the real Prev/Next bar's own
		// Next button (bindPaginationBarListeners() below), which
		// already respects the disabled state on the last page.
		// --------------------------------------------------
		$( "#btn_float_next_page" ).off().on( "click", function( objEvent ) {

			objEvent.preventDefault();

			$( "#btn_page_next" ).click();
		});

		//--------- START - FILTER --------------
		$('#filter_icon').off().on( "click", function() {
	
			showFilter();
		});

		$('#filter_params').off().on( "click", function() {

			showFilter();
		});

		$('#btn_filter').off().on( "click", function() {

			doFilterSectionList();
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
	function parseListResponse( objPageResult ) {

		if( !objPageResult ) {

			objPageResult = { records: [], totalRecords: 0, totalPages: 1, page: 1, pageSize: mPageSize };
		}

		hideLoader();

		var arrSections = objPageResult.records || [];

		mCurrentPage = objPageResult.page || 1;
		mTotalPages = objPageResult.totalPages || 1;
		mTotalRecords = objPageResult.totalRecords || arrSections.length;

		// --------------------------------------------------
		// WHY: DataService.getRecordsPage() returns plain
		// objects (e.g. { section_id, name, category_id }),
		// matching the same bridge already used in
		// Category.script.js/parseListResponse(). The rest of
		// this file (createHtmlListItem(), showFilteredList(),
		// etc.) was written for the old SQLite row format, where
		// each Section is a plain array like
		// [ sectionId, sectionName ], read using
		// SUMMARY_INDEX.SECTION_ID / NAME as array positions.
		// WHAT: convert each DataService object into that same
		// array-row shape, in this one place only, so every
		// function below this point keeps working exactly as it
		// already did - nothing past this bridge needs to change.
		// WHEN: runs every time a page of the Section list is
		// loaded, refreshed, or paged through.
		// --------------------------------------------------

		var arrSectionRows = [];

		for( var i = 0; i < arrSections.length; i++ ) {

			var objSection = arrSections[ i ];

			var arrRow = [];

			arrRow[ SUMMARY_INDEX.SECTION_ID ] = objSection.section_id;
			arrRow[ SUMMARY_INDEX.NAME ] = objSection.name;
			arrRow[ SUMMARY_INDEX.CATEGORY_ID ] = objSection.category_id;

			arrSectionRows.push( arrRow );
		}

		// --------------------------------------------------
		// PAGINATION FIX (this pass): this used to
		// setStorageData(..., SECTION_SUMMARY_DATA) with the
		// FULL table, then call doFilterSectionList() ->
		// showFilteredList(), which re-read and rendered that
		// entire stored table. There is no full table anymore -
		// only the current page - so this stores/renders just
		// that page directly. SECTION_SUMMARY_DATA still holds
		// exactly what is on screen right now (same storage key,
		// same shape), so parseInsertUpdateResponse()/
		// getSelectedSummaryListData() and the rest of the
		// existing Add/Edit/Delete flow keep working unchanged -
		// they only ever look up rows that are visible on the
		// current page anyway.
		// --------------------------------------------------

		setStorageData( arrSectionRows, SESSION_OBJECT.SECTION_SUMMARY_DATA );

		showFilteredList( arrSectionRows );

		// --------------------------------------------------
		// DASHBOARD QUICK ADD (Priority 2): same mechanism as
		// Student.script.js/parseListResponse() - see the WHY/
		// WHAT/WHEN comment there for the full explanation.
		// Reuses the existing onClickAdd()/Add Section workflow
		// as-is.
		// --------------------------------------------------

		if( sessionStorage.getItem( "DASHBOARD_QUICK_ADD_ACTION" ) == "section" ) {

			sessionStorage.removeItem( "DASHBOARD_QUICK_ADD_ACTION" );

			if( checkRolePermission( SOFTWARE_FEATURE_CONST.ADD_SECTION ) == true ) {

				onClickAdd();
			}
		}
	}
	// parse summary list response from the storage
	function parseListFromStorage() {

		hideLoader();

		doFilterSectionList();
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
		
		var id = selectedData[ SUMMARY_INDEX.SECTION_ID ];
		sessionStorage.setItem( SESSION_OBJECT.SECTION_ID, id );
	
		if( mInfoIconClicked == false && mEditIconClicked == false ) {

			openSelectMenu();
		}	
	}

	function clearSearch() {

		$("#search").val("");

		mCurrentSearchKeyword = "";
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
				//
				// SEARCH DEBOUNCE (this pass, Task 6): searchList()
				// itself is unchanged - it still only filters the
				// currently loaded page, instantly, client-side
				// (there is no searchSections backend action). Wrapped
				// here with the same 250ms debounce Category.script.js
				// uses for its server-side search, so a fast typist
				// does not re-run the filter on every single keystroke.
				// --------------------------------------------------
				document.getElementById( "search" ).oninput = function() {

					if( mSearchDebounceTimer ) {

						clearTimeout( mSearchDebounceTimer );
					}

					mSearchDebounceTimer = setTimeout( function() {

						searchList();

					}, 250 );
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

		// PAGINATION FIX (this pass): refresh reloads exactly the
		// page currently on screen (Task 2 - "refresh only current
		// page"), not the whole table.

		getListData( mCurrentPage );

		showLoader( "Refreshing..." );
	}

	function onClickAdd() {

		sessionStorage.setItem( SESSION_OBJECT.ADD_EDIT_MODE, INSERT_DATA );

		// You can comment the below two lines and uncomment the last line to restore page mode
		$('#edit_details_title').text('Add New Section');
		openEditDetailsPopup();
		onAddEditDocumentReady();

	}
	function onClickSaveData() {

		var bValid = validateForm();
		if( bValid == true ) {

			var mode = getAddEditMode();

			var title = "Add New";
			var message = "Do you want to add new Section?";
			if( mode == UPDATE_DATA ) {
				title = "Update";
				message = "Do you want to update the Section?";
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
		$('#edit_details_title').text('Edit Section');
		openEditDetailsPopup();
		onAddEditDocumentReady();
	}


	function onClickDelete() {

		closeSelectMenu();
		showConfirmationAlert( "Do you want to delete selected Section?", onConfirmDelete, "Message", [ "Delete", "Cancel" ] );
	}

	function searchList() {

		if( mSearchDebounceTimer ) {

			clearTimeout( mSearchDebounceTimer );
		}

		// Project Improvements (this pass): previously filtered only
		// mSelectedDataList (the current page) client-side. Now that
		// DataService.js's SECTION entity has a searchAction wired to
		// the existing searchSections backend action, this follows the
		// same debounce -> set keyword -> reload page 1 pattern already
		// used by Category.script.js/Student.script.js, so a search
		// actually covers every Section record, not just the ones
		// already loaded. Known limitation: searchSections compares
		// Category as a raw id server-side, so searching by a
		// category's name text won't match until Section.gs itself
		// resolves that id to a name.
		mSearchDebounceTimer = setTimeout( function() {

			mCurrentSearchKeyword = document.getElementById( "search" ).value.trim();
			mCurrentPage = 1;

			showLoader( "Searching..." );
			getListData( 1 );

		}, 250 );
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
		// Final QA fix: this used to check the nonexistent
		// '#modal_share_question' element (always false, so the
		// Back button never detected the Share modal was open).
		// The real share modal's id is 'modal_share' - corrected
		// below so Back now properly closes it instead of falling
		// through to the double-back-press exit logic.
		else if( $('#modal_share').hasClass('show')) {

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

		var sectionList = getStorageData( SESSION_OBJECT.SECTION_SUMMARY_DATA );

		if( sectionList == null ) {

			sectionList = [];
		}

		var message = "";
		if ( mode == INSERT_DATA ) {

			var errorData = getStorageData(SESSION_OBJECT.SECTION_ERROR_DATA);
			if( errorData != null ){

				if( errorData.length > 0 ){

					var errorHandlerScript = ErrorHandlerScript.getInstance();
					errorHandlerScript.syncServerErrorData( getStorageData( SESSION_OBJECT.SECTION_ERROR_DATA ), errorHandlerScript.deleteErrorData );
				}
			}
			
			var result = getAddEditResultArray( response.id );
			message = "Section saved successfully.";
			
			sectionList.push( result );

			setStorageData( sectionList, SESSION_OBJECT.SECTION_SUMMARY_DATA );
			hideLoader();

			getListData();
		}
		else if ( mode == UPDATE_DATA ) {

			var result = getAddEditResultArray( 0 );
			message = "Section updated successfully.";

			for ( var i = 0; i < sectionList.length; i++ ) {

				var data = sectionList[ i ];

				if ( data[ INDEX.SECTION_ID ] == result[ INDEX.SECTION_ID ] ) {

					sectionList[ i ] = result;
				}
			}

			setStorageData( sectionList, SESSION_OBJECT.SECTION_SUMMARY_DATA );
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

		data[ SUMMARY_INDEX.SECTION_ID ] = mJsonData[ SUMMARY_JSON_KEY.SECTION_ID ];
		data[ SUMMARY_INDEX.NAME ] = mJsonData[ SUMMARY_JSON_KEY.NAME ];

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

				var selectedId = selectedData[ i ][ SUMMARY_INDEX.SECTION_ID ];

				mSelectedIdList.push( selectedId );			
			}
		}
			
		return mSelectedIdList;
	}
	function parseDeleteResponse( rowsDeleted, statusCode, response ) {

		if( statusCode == G_ERROR.CODE.DELETE_OPERATION_DEPENDENT_EXISTS ) {

			var errorMsg = response.message;
			
			var message = "Cannot delete the Section." + errorMsg.split("<br>");
			showOperationMessage( message, "Warning", null );
			hideLoader();
		}
		else{

			var sectionList = getStorageData( SESSION_OBJECT.SECTION_SUMMARY_DATA );

			for( var i = 0; i < mSelectedIdList.length; i++ ) {

				var deletedId = mSelectedIdList[ i ];

				for( var j = 0; j < sectionList.length; j++ ) {

					var data = sectionList[ j ];
					if( data[ SUMMARY_INDEX.SECTION_ID ] == deletedId ) {

						sectionList.splice( j, 1 );
					}
				}
			}

			setStorageData( sectionList, SESSION_OBJECT.SECTION_SUMMARY_DATA );

			if( mMultiSelect == true ) {

				resetMultiSelection();
			}

			parseListFromStorage();

			showOperationMessage( "Section deleted successfully.", "Success", null );
		}
	}
	function getSelectedId() {

		var id = 0;

		if(sessionStorage.hasOwnProperty(SESSION_OBJECT.SECTION_ID)) {
		
			id = sessionStorage.getItem( SESSION_OBJECT.SECTION_ID );
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

		var sectionList = getStorageData( SESSION_OBJECT.SECTION_DATA );

		if( sectionList != null ) {

			var selectedId = getSelectedId();

			data = sectionList.find( obj => {
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

		var sectionList = getStorageData( SESSION_OBJECT.SECTION_SUMMARY_DATA );

		if( sectionList != null ) {

			var selectedId = getSelectedId();

			data = sectionList.find( obj => {
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

		// Final QA fix: this used to check a nonexistent element
		// ('#modal_share_section', always false) instead of the real
		// share modal's id, 'modal_share'. Corrected so this
		// function properly recognizes the share modal is open.
		if( $( '#modal_share' ).hasClass( 'show' )) {

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
			   
			if( checkRolePermission( SOFTWARE_FEATURE_CONST.ADD_SECTION ) == true ) {

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

		// TODO: Multiple-select option 1 is not implemented yet.
	}

	function onClickMultiOption2() {

		closeMultiSelectMenu();

		// TODO: Multiple-select option 2 is not implemented yet.
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
		// WHAT: sectionList.html's filter modal has no dropdown
		// of its own to populate (unlike Category, which filters
		// by Organization) - this just opens it, the same
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
		// SUMMARY_INDEX (only SECTION_ID and NAME do). Same
		// unfinished code-generation placeholder already fixed in
		// Category.script.js's createHtmlListItem(), never applied
		// here - this is why every Section card rendered as
		// "1) undefined".
		// WHAT: point the card's title at Name; Section has no
		// second summary field, so the subtitle line is left blank
		// instead of showing "undefined".
		// WHEN: runs once per Section card, every time the list is
		// drawn.
		// --------------------------------------------------

		var name = data[ SUMMARY_INDEX.NAME ];

		// --------------------------------------------------------
		// PROJECT IMPROVEMENTS (added): show which Category this
		// Section belongs to instead of a blank subtitle line, now
		// that CATEGORY_ID actually exists on this row (see the
		// CATEGORY_ID comment near INDEX above). The Category list
		// is already cached in session storage by
		// loadCategoryListForForm() the first time the Add/Edit form
		// opens; if that has not happened yet this pass, it simply
		// falls back to the blank line it already showed before.
		// --------------------------------------------------------
		var categoryId = data[ SUMMARY_INDEX.CATEGORY_ID ];
		var fillInData = '';
		var categoryList = getStorageData( SESSION_OBJECT.CATEGORY_LIST );
		if( categoryList != null ) {

			for( var c = 0; c < categoryList.length; c++ ) {

				if( categoryList[ c ][ CategoryScript.INDEX.CATEGORY_ID ] == categoryId ) {

					fillInData = categoryList[ c ][ CategoryScript.INDEX.NAME ] || '';
					break;
				}
			}
		}
		// PAGINATION FIX: seqNumber is the DISPLAYED row number and must
		// keep counting across pages (page 2 starts at 101, not 1 again).
		// "index" itself stays as the page-local array position, since
		// click handlers above use it to look the row up inside this
		// page's own cached array.
		var seqNumber = ( ( mCurrentPage - 1 ) * mPageSize ) + index + 1 + ') ';

		var infoIconHtml = '<span class="icon-btn icon-btn-info" onclick="SectionScript.getInstance().onClickInfoIcon('+ index +');"><i class="fa fa-info-circle" aria-hidden="true"></i></span>';
		var editIconHtml = '';
		if( checkRolePermission( SOFTWARE_FEATURE_CONST.EDIT_SECTION ) == true ) {

			editIconHtml = '<span class="icon-btn icon-btn-edit" onclick="SectionScript.getInstance().onClickEditIcon('+ index +');" style="position:absolute; top:14px; right:14px;"><i class="fas fa-edit"></i></span>';
		}

		// --------------------------------------------------
		// WHY/WHAT: same inline-shadow removal + shared .icon-btn /
		// .list-card-title / .list-card-subtitle classes as
		// Category/Student.script.js's createHtmlListItem(), so
		// every list page shares one consistent card look.
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

		var query = "SELECT MAX( " + DB_FIELD.SECTION_ID + " ) AS maxcount FROM " + TABLE_NAME;

		getMaxDbId( query, callback );	//please change function name at its definition in db.handler.js to this name if not same as this.
	}

	function createTableSection( callback ) {

		var query = 'CREATE TABLE IF NOT EXISTS ' + TABLE_NAME + ' (' +
			DB_FIELD.SECTION_ID + ' INTEGER ,' +
			DB_FIELD.NAME + ' TEXT' +
			')';

		executeQuery( query, callback );
	}


	function getInsertQuery() {

		var query = 'INSERT INTO ' + TABLE_NAME + '(' +

			DB_FIELD.SECTION_ID + ',' +
			DB_FIELD.NAME +
			') VALUES (?, ?)';
		return query;
	}

	function getUpdateQuery() {

		var query = 'UPDATE ' + TABLE_NAME + ' SET ' +
			DB_FIELD.SECTION_ID + '=?, ' +
			DB_FIELD.NAME +' =? WHERE ' +
			DB_FIELD.SECTION_ID + '=' + getSelectedId();

		return query;
	}


	function onErrorFetchData( url, description, logData, flag ){

		var errorHandlerScript = ErrorHandlerScript.getInstance();
		errorHandlerScript.saveErrorData( "Section", url, "", description, logData, flag, null );
	}

	// --------------------------------------------------
	// WHY: Previously, this function fetched the preview
	// record over the network or from SQLite - neither exists
	// in this PWA. This mirrors getData()/parseFormDataResponse() above,
	// which use the same DataService.getRecordById() call for
	// the Edit form.
	// WHAT: asks DataService for the single Section being
	// previewed and hands it to parsePreviewResponse().
	// WHEN: runs when the user opens the Info/Preview popup
	// for a specific Section.
	// --------------------------------------------------

	function onInfoViewDocumentReady() {

		DataService.getRecordById(

			AppConfig.STORES.SECTION,

			getSelectedId(),

			function( objSection ) {

				if( objSection ) {

					parsePreviewResponse( [ objSection ] );
				}
			},

			function( objError ) {

				CommonUtils.logError( "Section.script.js (onInfoViewDocumentReady)", objError );
				hideLoader();
				CommonUtils.showAlert( "Unable to load Section." );
			}
		);
	}

	function parsePreviewResponse( arrSection ) {

		var arrSectionRows = [];

		for( var i = 0; i < arrSection.length; i++ ) {

			var objSection = arrSection[ i ];

			var arrRow = [];
			arrRow[ INDEX.SECTION_ID ] = objSection.section_id;
			arrRow[ INDEX.NAME ] = objSection.name;
			arrRow[ INDEX.CATEGORY_ID ] = objSection.category_id;

			arrSectionRows.push( arrRow );
		}

		// WHY/WHAT: same object -> array-row bridge as
		// parseFormDataResponse() above, so the Info popup's
		// setPreview() can actually find the record.
		setStorageData( arrSectionRows, SESSION_OBJECT.SECTION_DATA );

		setPreview();
	}

	// onClick List item detail view
	function setPreview() {

		var data =  getSelectedData();

		mInfoIconClicked = false;
		mEditIconClicked = false;
		$(FORM_FIELD_INFO.LBL_SECTION_ID).text( data[INDEX.SECTION_ID] );
		$(FORM_FIELD_INFO.LBL_NAME).text( data[INDEX.NAME] );

		// PROJECT IMPROVEMENTS (added): resolve and show the parent
		// Category's name, same lookup used by createHtmlListItem().
		var categoryName = '';
		var categoryList = getStorageData( SESSION_OBJECT.CATEGORY_LIST );
		if( categoryList != null ) {

			for( var c = 0; c < categoryList.length; c++ ) {

				if( categoryList[ c ][ CategoryScript.INDEX.CATEGORY_ID ] == data[INDEX.CATEGORY_ID] ) {

					categoryName = categoryList[ c ][ CategoryScript.INDEX.NAME ] || '';
					break;
				}
			}
		}
		if( $(FORM_FIELD_INFO.LBL_CATEGORY_ID).length > 0 ) {

			$(FORM_FIELD_INFO.LBL_CATEGORY_ID).text( categoryName );
		}

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
	function doFilterSectionList() {

		clearSearch();

		// PAGINATION FIX (this pass): SECTION_SUMMARY_DATA now
		// holds only the currently loaded page (see
		// parseListResponse() above), not the full table, so the
		// "All" filter button simply re-renders that page instead
		// of re-fetching/re-filtering an entire in-memory table.

		var list = getStorageData( SESSION_OBJECT.SECTION_SUMMARY_DATA );

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
			htmlContent = CommonUtils.getEmptyStateHtml( "Sections", "fa-solid fa-building" );
		}

		for( var i = 0; i < response.length; i++ ) {

			var data = response[ i ];

			htmlContent += createHtmlListItem( data, i );
		}

		// --------------------------------------------------
		// PAGINATION FIX (this pass): appends the same Prev/Next
		// bar Category.script.js/Student.script.js already use
		// (buildPaginationBarHtml()/bindPaginationBarListeners()
		// below), and shows the real backend-reported total
		// (mTotalRecords - see parseListResponse()) instead of
		// comparing this page's length against a stored "full
		// table" that no longer exists.
		// --------------------------------------------------

		htmlContent += buildPaginationBarHtml();

		var records = CommonUtils.buildPaginationSummary( mCurrentPage, mPageSize, mTotalRecords );

		document.getElementById( "records" ).innerText = records;

		setListToView( htmlContent );

		bindPaginationBarListeners();
	}

	// --------------------------------------------------
	// Small, self-contained Prev/Next bar - same pattern as
	// Category.script.js/buildPaginationBarHtml(), so Page 1 =
	// records 1-100, Page 2 = 101-200, etc, and Prev/Next always
	// ask the backend for exactly that one page (Task 1).
	// --------------------------------------------------
	function buildPaginationBarHtml() {

		var strPrevDisabled = ( mCurrentPage <= 1 ) ? "disabled" : "";
		var strNextDisabled = ( mCurrentPage >= mTotalPages ) ? "disabled" : "";

		return (
			'<div id="pagination_bar" class="pagination-area">' +
				'<button type="button" id="btn_page_prev" class="btn-page-nav" ' + strPrevDisabled + '>Prev</button>' +
				'<span id="page_indicator" class="pagination-summary">Page ' + mCurrentPage + ' of ' + mTotalPages + '</span>' +
				'<button type="button" id="btn_page_next" class="btn-page-nav" ' + strNextDisabled + '>Next</button>' +
			'</div>'
		);
	}

	function bindPaginationBarListeners() {

		$( "#btn_page_prev" ).off().on( "click", function() {

			if( mCurrentPage > 1 ) {

				showLoader( "Please wait..." );
				getListData( mCurrentPage - 1 );
			}
		});

		$( "#btn_page_next" ).off().on( "click", function() {

			if( mCurrentPage < mTotalPages ) {

				showLoader( "Please wait..." );
				getListData( mCurrentPage + 1 );
			}
		});
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

		var newOption = $('<option value="0" >Select Section</option>');
		if( formField === '#filter_section_id' ) { // For filter we will show "Select All" as an option

			newOption = $( '<option value="0" >Select All</option>' );
		}

		$(formField).append( newOption );
		$(formField).trigger( "chosen:updated" );
		for( var index = 0; index < listData.length; index++ ) {

			var id = listData[ index ][ INDEX.SECTION_ID ];
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
	// Show Section info on click of info icon in the list item
	function onClickInfoIcon( index ){

		mInfoIconClicked = true;

		var selectedData = mSelectedDataList[ index ];

		var id = selectedData[ SUMMARY_INDEX.SECTION_ID ];
		sessionStorage.setItem( SESSION_OBJECT.SECTION_ID, id );
		
		openListDetailsPopup();
		onInfoViewDocumentReady();
	}

	// Open Edit Section on click of edit icon in the list item
	function onClickEditIcon( index ) {

		mEditIconClicked = true;

		var selectedData = mSelectedDataList[ index ];

		var id = selectedData[ SUMMARY_INDEX.SECTION_ID ];
		sessionStorage.setItem( SESSION_OBJECT.SECTION_ID, id );

		sessionStorage.setItem( SESSION_OBJECT.ADD_EDIT_MODE, UPDATE_DATA );
		$('#edit_details_title').text( 'Edit Section' );
		openEditDetailsPopup();
		onAddEditDocumentReady();
	}
	// Start - Share Section data
	function onClickShare(){

		var messageTitle = "Confirm";
		var message = "Do you want to share Section(s)?";
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

		var subject = "Section(s)";
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
			createTableSection: createTableSection,
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