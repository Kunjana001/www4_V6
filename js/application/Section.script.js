////////////////////////////////////////////////////////////////////////////

// FileName Section.script.js: Section Javascript file for Cordova project

// Author : JRC
// Description : codegen


////////////////////////////////////////////////////////////////////////////

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

	var INDEX = {
		SECTION_ID : value++,		// 1
		NAME : value++,		// 2		// 2
	};

	//--------------Summary row index:-----------------

	value = 0;

	var SUMMARY_INDEX = {
		SECTION_ID : value++,		// 1
		NAME : value++,		// 2		// 2
	};

	//-------------Table Header Label----------------------

	var LABEL = {

		SECTION_ID : "Section",
		NAME : "Name"
	};

	//-----------------------------Default values------------------------------------
	//// TODO: Assign group_lookup_id of Lookup forign keys
	var DEFAULT = {

		SECTION_ID : 0,
		NAME : ""
	};

	//-----------------------------Form Elements------------------------------------
	var FORM_FIELD = {

		SECTION_ID : '#section_id',
		NAME : '#name',
		DOCUMENT_DIV : '#file_div',
		DOCUMENTS_PATH : '#file_id',
		PHOTO_DIV : '#image_div',
		PHOTO_PATH: '#image_id'

	};

	var FORM_FIELD_INFO = { 		// For Show Info Screen

		LBL_SECTION_ID : '#lbl_section_id',
		LBL_NAME : '#lbl_name'
	};

	//-----------------------------JSON Key------------------------------------
	var JSON_KEY = {

		SECTION_ID : "section_id",
		NAME : "name"
	};

	//-----------------------------SUMMARY JSON Key------------------------------------
	var SUMMARY_JSON_KEY = {

		SECTION_ID : "section_id",
		NAME : "name"
	};

	//-----------------------------DB Table Fields------------------------------------
	var DB_FIELD = {

		SECTION_ID : "section_id",
		NAME : "name"
	};
	//------------------------------SESSION OBJECT--------------------------------------
	var SESSION_OBJECT = {

		SECTION_ID: "SECTION_ID",
		ADD_EDIT_MODE: "ADD_EDIT_MODE",
		SECTION_DATA: "SECTION_DATA",
		SECTION_SUMMARY_DATA: "SECTION_SUMMARY_DATA"
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
		var country_code = getOrgCountryCode(); //"+91"; // PUT in the Country code or fetch from DB or server 
		var noOfDigits = getOrgNoOfDigits();
		var fv = FormValidation;

		console.log('Enable the validation for this form');
/* Enable as per requirement */
		// bValid = bValid && fv.checkEmpty($(FORM_FIELD.SECTION_ID), G_ERROR.MSG.empty_error+LABEL.SECTION_ID);
		// bValid = bValid && fv.checkEmpty($(FORM_FIELD.NAME), G_ERROR.MSG.empty_error+LABEL.NAME);

		return bValid;
	}
	function setFormDefaults( sectionId ) {
		$(FORM_FIELD.SECTION_ID).val(sectionId);
		$(FORM_FIELD.NAME).val(DEFAULT.NAME);
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

/*
		// used for file upload
		jsonData[ "organization_short_name" ] = getOrgShortName();
*/


		if( mode == UPDATE_DATA ) { // Edit/Update

			var data = getSelectedData();

			jsonData[ JSON_KEY.SECTION_ID ] = data[ INDEX.SECTION_ID ];
			jsonData[ JSON_KEY.NAME ] = data[ INDEX.NAME ];

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

					console.log( error );
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

					console.log( error );
					hideLoader();
					CommonUtils.showAlert( "Unable to save Section." );
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
	// SectionHTML.script.js's onFileUploadSuccess() still calls it
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

					console.log( error );
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

				console.log( objError );
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
		// request was ever sent to the backend. The Section page
		// has no lookup-list dropdown of its own to pre-load
		// (unlike Student, which needs Category + Section lists
		// before showing its Add/Edit form), so this simply calls
		// getListData() directly - the same fix already applied
		// to Category.script.js.
		// WHAT: fetches the Section list via DataService.
		// WHEN: runs once, right when the Section list page
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
		// WHEN: runs every time the Section list is
		// (re)loaded.
		// --------------------------------------------------

		DataService.getAllRecords(

			AppConfig.STORES.SECTION,

			function( arrSections ) {

				hideLoader();
				parseListResponse( arrSections );
			},

			function( objError ) {

				console.log( objError );
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
	function parseListResponse( arrSections ) {

		if( !arrSections ) {

			arrSections = [];
		}

		hideLoader();

		// --------------------------------------------------
		// WHY: DataService.getAllRecords() returns plain
		// objects (e.g. { sectionId, sectionName }), matching
		// the same bridge already used in
		// Category.script.js/parseListResponse(). The rest of
		// this file (doFilterSectionList(), createHtmlListItem(),
		// showFilteredList(), etc.) was written for the old
		// SQLite row format, where each Section is a plain array
		// like [ sectionId, sectionName ], read using
		// SUMMARY_INDEX.SECTION_ID / NAME as array positions.
		// WHAT: convert each DataService object into that same
		// array-row shape, in this one place only, so every
		// function below this point keeps working exactly as it
		// already did - nothing past this bridge needs to change.
		//
		// NOTE: "sectionId"/"sectionName" are this project's best
		// current guess at the real field names your Google Apps
		// Script returns, matching the naming style already
		// confirmed for Category. If your Sections sheet/response
		// actually uses different field names, this is the one
		// place to correct them.
		// WHEN: runs every time the Section list is loaded or
		// refreshed from DataService.
		// --------------------------------------------------

		var arrSectionRows = [];

		for( var i = 0; i < arrSections.length; i++ ) {

			var objSection = arrSections[ i ];

			var arrRow = [];

			// FIELD NAME FIX: DataService.getAllRecords() resolves
			// through getEntityApiConfig(SECTION).fromBackendFields()
			// (see DataService.js), which returns section_id, name,
			// category_id, organization_id, description - NOT
			// sectionId/sectionName as this bridge previously guessed.

			arrRow[ SUMMARY_INDEX.SECTION_ID ] = objSection.section_id;
			arrRow[ SUMMARY_INDEX.NAME ] = objSection.name;

			arrSectionRows.push( arrRow );
		}

		setStorageData( arrSectionRows, SESSION_OBJECT.SECTION_SUMMARY_DATA );

		doFilterSectionList();
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
	}

	function enableSearch( mode ) {

			if( mode == MODE_SEARCH_ON_KEYUP ) { // Search list onKeyup

				$("#search").keyup( function (e) {

					searchList();
				});
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
		showConfirmationAlert( "Do you want to delete selected Section?", onConfirmDelete, "Message", buttonLabels );
	}

	function searchList() {

		var list = document.getElementById("list_id");
		var listItems = list.getElementsByTagName("ul");

		var input = document.getElementById("search");
		var filter = input.value.toUpperCase();

		for( var i = 0; i < listItems.length; i++ ) {

			var name = listItems[ i ].getElementsByTagName("li")[ 0 ];

			if( name != null ) {

				if( name.innerHTML.toUpperCase().indexOf( filter ) > -1 ) {

					var sectionData = mSelectedDataList;

					var index = mSearchList.length;
					mSearchList[index] = sectionData[ i ];

					listItems[i].style.display = "";
				} else {

					listItems[i].style.display = "none";
				}
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
			message = "Section has been added successfully";
			
			sectionList.push( result );

			setStorageData( sectionList, SESSION_OBJECT.SECTION_SUMMARY_DATA );
			hideLoader();

			getListData();
		}
		else if ( mode == UPDATE_DATA ) {

			var result = getAddEditResultArray( 0 );
			message = "Section has been updated successfully";

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

			showOperationMessage( "Selected Section(s) has been deleted successfully", "Success", null );
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

		if( $( '#modal_share_section' ).hasClass( 'show' )) {

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

		showConfirmationAlert( "Do you want to delete selected Rows?", onConfirmDelete, "Message", buttonLabels );
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
		var fillInData = '';
		var seqNumber = index + 1 +') ';

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

				console.log( objError );
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
		
		var list = getStorageData( SESSION_OBJECT.SECTION_SUMMARY_DATA );

		// --------------------------------------------------
		// WHY: this fetched the Section summary list into `list`
		// but never actually did anything with it - unlike the
		// identical-shaped doFilterCategoryList() in
		// Category.script.js, it never called showFilteredList(),
		// so the freshly loaded Sections were never handed to the
		// function that builds the list HTML and writes the
		// "Total: N" count. The backend call was succeeding the
		// whole time; the page just never rendered what came back,
		// which is why the Section List always looked empty.
		// WHAT: pass the loaded list straight to showFilteredList(),
		// same as Category/Student/Result already do.
		// WHEN: runs every time the Section list is loaded, filtered,
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
			htmlContent = CommonUtils.getEmptyStateHtml( "Sections", "fa-solid fa-building" );
		}

		for( var i = 0; i < response.length; i++ ) {

			var data = response[ i ];

			htmlContent += createHtmlListItem( data, i );
		}

		var list = getStorageData( SESSION_OBJECT.SECTION_SUMMARY_DATA );
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