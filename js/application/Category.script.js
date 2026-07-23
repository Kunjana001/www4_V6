////////////////////////////////////////////////////////////////////////////

// FileName Category.script.js: Category Javascript file for Cordova project

// Author : JRC
// Description : codegen

// PWA MIGRATION NOTE: Migrated from the legacy Cordova/SQLite architecture to
// the PWA DataService/StorageService architecture, while preserving the
// original file structure, function order, and public API wherever possible.
// Legacy SQLite/network-fetch functions (fetchNetworkData, fetchDbData,
// onConfirmDbSaveData, getFormDataAsArray, getListFromServer, etc.) were
// removed since DataService now owns all data access. The template's
// "institution" field was replaced with "organization" throughout, matching
// this app's actual schema. List pagination (DataService.getRecordsPage) was
// added since Categories are fetched from Google Apps Script instead of a
// local table.

////////////////////////////////////////////////////////////////////////////



var CategoryScript = (function () {
	// Check whether the Multiple selection is active or not
	var mMultiSelect = false;

	// Manage List multiple selection
	var mMultiSelectedList = [];
	// Manage search list
	var mSearchList = [];

	// Instance stores a reference to the Singleton
	var instance;

	//Url
	var URL = "/CategoryDataHandler";
	var URL_SUMMARY = "/SummaryList";
	var mJsonData = null; // JSON data used for Add/Edit
	var mSelectedIdList = []; // List of IDs of the selected items

	// We can Enable/Disable Multiple selection by using it
	// true: Enable multiple selection, false: Disable multiple selection 
	var mEnableMultiSelection = true;


	// Save the Filtered main list
	var mSelectedDataList = [];

	// Server-side pagination state (PWA: Categories are paged via
	// DataService.getRecordsPage() instead of loading a full local table).
	var mCurrentPage = 1;
	var mPageSize = 100;
	var mTotalPages = 1;
	var mTotalRecords = 0;
	var mCurrentSearchKeyword = "";
	var mSearchDebounceTimer = null;

	var buttonLabels = [ "Yes", "No" ];

	var mDoubleBackToExitPressedOnce = false;

	// Share using Email and WhatsApp
	var MODE_SHARE_EMAIL = 1;
	var MODE_SHARE_WHATSAPP = 2;

	var mShareMode = 0;		// email or whatsapp

	var mInfoIconClicked = false; // using that we can control single click and info button click
	var mEditIconClicked = false; // using that we can control single click and edit icon click
	var mShareIconClicked = false; // using that we can control single click and share icon click

	var mImageClosed = false;	// Indicates whether the image is removed or not while updating
	var mFileClosed = false;	// Indicates whether the File is removed or not while updating
	var TABLE_NAME = "category";
	//--------------Table row index:-----------------

	var value = 0;

	var INDEX = {
		CATEGORY_ID : value++,		// 1
		NAME : value++,		// 2
		ORGANIZATION_ID : value++,		// 3
		DESCRIPTION : value++,		// 4
	};

	//--------------Summary row index:-----------------

	value = 0;

	var SUMMARY_INDEX = {
		CATEGORY_ID : value++,		// 1
		NAME : value++,		// 2
		ORGANIZATION_ID : value++,		// 3		// 3
	};

	//-------------Table Header Label----------------------

	var LABEL = {

		CATEGORY_ID : "Category",
		NAME : "Name",
		ORGANIZATION_ID : "Organization"
	};

	//-----------------------------Default values------------------------------------
	//// TODO: Assign group_lookup_id of Lookup forign keys
	var DEFAULT = {

		CATEGORY_ID : 0,
		NAME : "",
		ORGANIZATION_ID : ""
	};

	//-----------------------------Form Elements------------------------------------
	var FORM_FIELD = {

		CATEGORY_ID : '#category_id',
		NAME : '#name',
		ORGANIZATION_ID : '#organization_id',
		DOCUMENT_DIV : '#file_div',
		DOCUMENTS_PATH : '#file_id',
		PHOTO_DIV : '#image_div',
		PHOTO_PATH: '#image_id'

	};

	var FORM_FIELD_INFO = { 		// For Show Info Screen

		LBL_CATEGORY_ID : '#lbl_category_id',
		LBL_NAME : '#lbl_name',
		LBL_ORGANIZATION_ID : '#lbl_organization_id',
		LBL_DESCRIPTION : '#lbl_description'
	};

	//-----------------------------JSON Key------------------------------------
	var JSON_KEY = {

		CATEGORY_ID : "category_id",
		NAME : "name",
		ORGANIZATION_ID : "organization_id"
	};

	//-----------------------------SUMMARY JSON Key------------------------------------
	var SUMMARY_JSON_KEY = {

		CATEGORY_ID : "category_id",
		NAME : "name",
		ORGANIZATION_ID : "organization_id"
	};

	//-----------------------------DB Table Fields------------------------------------
	var DB_FIELD = {

		CATEGORY_ID : "category_id",
		NAME : "name",
		ORGANIZATION_ID : "organization_id"
	};
	//------------------------------SESSION OBJECT--------------------------------------
	var SESSION_OBJECT = {

		CATEGORY_ID: "CATEGORY_ID",
		ADD_EDIT_MODE: "ADD_EDIT_MODE",
		CATEGORY_DATA: "CATEGORY_DATA",
		CATEGORY_SUMMARY_DATA: "CATEGORY_SUMMARY_DATA",
		ORGANIZATION_LIST: "ORGANIZATION_LIST",
		ORGANIZATION_ID: "ORGANIZATION_ID"
	}

	function setOrganizationListData( organizationList ){

		setStorageData( organizationList, SESSION_OBJECT.ORGANIZATION_LIST );
	}

	// Clear all the data which used to store in the session on click backbutton and goback from the list
	function clearStorage(){

		clearSessionStorage( SESSION_OBJECT.ADD_EDIT_MODE );
		clearSessionStorage( SESSION_OBJECT.CATEGORY_DATA );
		clearSessionStorage( SESSION_OBJECT.CATEGORY_SUMMARY_DATA );

		clearSessionStorage( SESSION_OBJECT.CATEGORY_ID );


		clearSessionStorage( SESSION_OBJECT.ORGANIZATION_LIST );
		clearSessionStorage( SESSION_OBJECT.ORGANIZATION_ID );


	}

	// get Category data from the storage : we can retrieve data using the key which we used to store the data
	// getStorageData(SESSION_OBJECT.CATEGORY_DATA)

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

	// set Category data into the storage : we can set the data using a key and the same key we should use for retriving the data
	// setStorageData(jsonData, SESSION_OBJECT.CATEGORY_DATA)
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
		// bValid = bValid && fv.checkEmpty($(FORM_FIELD.CATEGORY_ID), G_ERROR.MSG.empty_error+LABEL.CATEGORY_ID);
		// bValid = bValid && fv.checkEmpty($(FORM_FIELD.NAME), G_ERROR.MSG.empty_error+LABEL.NAME);
		// bValid = bValid && fv.checkEmptySelect($(FORM_FIELD.ORGANIZATION_ID), G_ERROR.MSG.empty_error_selectbox+LABEL.ORGANIZATION_ID);

		return bValid;
	}
	function setFormDefaults( categoryId ) {
		$(FORM_FIELD.CATEGORY_ID).val(categoryId);
		$(FORM_FIELD.NAME).val(DEFAULT.NAME);
		var organizationList = getStorageData(SESSION_OBJECT.ORGANIZATION_LIST);
		setOrganizationSelection( organizationList );

		enableSaveButton( false );

		$( FORM_FIELD.DOCUMENT_DIV ).hide();
		$( FORM_FIELD.DOCUMENTS_PATH ).text("");
		$( FORM_FIELD.PHOTO_DIV ).hide();
		$( FORM_FIELD.PHOTO_PATH ).removeAttr( 'src' );

		setTimeout( function(){ 

			var errorHandlerScript = ErrorHandlerScript.getInstance();
			errorHandlerScript.getAutoFillErrorData( "Category", parseErrorDataResponse );
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

		setStorageData( data, SESSION_OBJECT.CATEGORY_ERROR_DATA );
	}
	function populateFromLocalStorage( data ){
		$( FORM_FIELD.CATEGORY_ID ).val( data[ INDEX.CATEGORY_ID ] );
		$( FORM_FIELD.NAME ).val( data[ INDEX.NAME ] );
		$( FORM_FIELD.ORGANIZATION_ID ).val( data[ INDEX.ORGANIZATION_ID ] ).change();

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

			loadAddFormData( DEFAULT.CATEGORY_ID );
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

		$(FORM_FIELD.CATEGORY_ID).val(data[INDEX.CATEGORY_ID]);
		$(FORM_FIELD.NAME).val(data[INDEX.NAME]);
		var organizationList = getStorageData(SESSION_OBJECT.ORGANIZATION_LIST);
		setOrganizationSelection( organizationList );

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
		jsonData[ JSON_KEY.CATEGORY_ID ] = ( $(FORM_FIELD.CATEGORY_ID).val() );
		jsonData[ JSON_KEY.NAME ] = ( $(FORM_FIELD.NAME).val() );
		jsonData[ JSON_KEY.ORGANIZATION_ID ] = ( $(FORM_FIELD.ORGANIZATION_ID).val() );

/*
		// used for file upload
		jsonData[ "organization_short_name" ] = getOrgShortName();
*/

		// Changed: the Edit form is already populated with the record's real
		// values (see popUpEditForm/populateFromLocalStorage), so there is no
		// need to re-read and override them from getSelectedData() here.

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
		errorHandlerScript.saveErrorData( "Category", url, jsonData, description, logData, flag, parseSaveErrorDataResponse );
	}

	function parseSaveErrorDataResponse( response, mode ) {

		var message = "Failed to connect to " + APP_NAME + " server.\nPlease check your internet connection and try to save the data again.";
		showAlertDialog( message, gotoLogin, title, buttonStr );
	}

	function saveFormData( buttonIndex ) { //pass create table as additional param

		if( buttonIndex == BUTTON_CANCEL ) { // Cancel alert dialog
			// To do Something
		} 
		else if( buttonIndex == BUTTON_CONFIRM ) { // Confirm

			onConfirmSaveFormData();
		}
	}

	// Changed to use DataService (Google Apps Script backed) instead of the
	// legacy network/SQLite branches - see onConfirmDbSaveData in the
	// Cordova version for the logic this replaces.
	function onConfirmSaveFormData() {

		var mode = getAddEditMode();

		mJsonData = getFormDataAsJson( mode );

		showLoader( "Please wait...", "Fetching data..." );

		if( mode == INSERT_DATA ) {

			DataService.addRecord(

				AppConfig.STORES.CATEGORY,

				mJsonData,

				function( objSavedCategory ) {

					parseInsertUpdateResponse( objSavedCategory, mode );
				},

				function( objError ) {

					CommonUtils.logError( "Category.script.js (onConfirmSaveFormData)", objError );
					hideLoader();
					CommonUtils.showAlert( "Unable to save Category." );
				}
			);
		}
		else if( mode == UPDATE_DATA ) {

			DataService.updateRecord(

				AppConfig.STORES.CATEGORY,

				mJsonData,

				function( objSavedCategory ) {

					parseInsertUpdateResponse( objSavedCategory, mode );
				},

				function( objError ) {

					CommonUtils.logError( "Category.script.js (onConfirmSaveFormData)", objError );
					hideLoader();
					CommonUtils.showAlert( "Unable to save Category." );
				}
			);
		}
		else {
			CommonUtils.logError( "Category.script.js (onConfirmSaveFormData)", "Invalid mode passed, mode = " + mode );
			return false;
		}
	}

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

	// Changed to use DataService.deleteRecord() instead of the legacy
	// network DELETE / SQLite "IN (...)" branches - deletes each selected
	// Category one at a time, then hands off to parseDeleteResponse() the
	// same way the Cordova version did.
	function deleteRows( deleteDataArray ) {

		deleteNextRow( 0 );

		function deleteNextRow( numIndex ) {

			if( numIndex >= deleteDataArray.length ) {

				parseDeleteResponse( deleteDataArray.length, 200, null );
				return;
			}

			DataService.deleteRecord(

				AppConfig.STORES.CATEGORY,
				deleteDataArray[ numIndex ],

				function() {

					deleteNextRow( numIndex + 1 );
				},

				function( objError ) {

					CommonUtils.logError( "Category.script.js (deleteNextRow)", objError );
					hideLoader();
					CommonUtils.showAlert( "Unable to delete Category." );
				}
			);
		}
	}

	// Changed: DataService returns a single plain object (e.g.
	// { category_id, name, organization_id }) rather than a SQLite result
	// set, so this bridges it into the same [ category_id, name,
	// organization_id ] array-row shape getSelectedData() already expects.
	function parseFormDataResponse( categoryList ) {

		var arrCategoryRows = [];

		for( var i = 0; i < categoryList.length; i++ ) {

			var objCategory = categoryList[ i ];

			var arrRow = [];
			arrRow[ INDEX.CATEGORY_ID ] = objCategory.category_id;
			arrRow[ INDEX.NAME ] = objCategory.name;
			arrRow[ INDEX.ORGANIZATION_ID ] = objCategory.organization_id;
			arrRow[ INDEX.DESCRIPTION ] = objCategory.description;

			arrCategoryRows.push( arrRow );
		}

		setStorageData( arrCategoryRows, SESSION_OBJECT.CATEGORY_DATA );

		hideLoader();

		popUpEditForm();
	}

	function setOrganizationSelection( organizationList ) {

		var mode = getAddEditMode();

		var selectedId = DEFAULT.ORGANIZATION_ID;
		if( mode == UPDATE_DATA ) { // Edit

			var data = getSelectedData();	
			selectedId = data[ INDEX.ORGANIZATION_ID ];
		}
		else if( mode == INSERT_DATA ) {

			// Fetch id from the localstorage which previously selected
			selectedId = DEFAULT.ORGANIZATION_ID; //getSelectedDropdownId( LOCAL_OBJECT.ORGANIZATION_ID );
		}

		var organizationScript = OrganizationScript.getInstance();
		organizationScript.populateSelection( organizationList, FORM_FIELD.ORGANIZATION_ID, selectedId );
		// BUG FIX: explicitly set the value too, since populateSelection()'s
		// own .val().change() can be skipped depending on option ordering.
		$( FORM_FIELD.ORGANIZATION_ID ).val( selectedId );
		enableSaveButton( false );
	}

	function getSelectedDropdownId( key ) {
		
		var selectedId = 0;
		if( localStorage.getItem( key ) != null ) {

			selectedId = localStorage.getItem( key );
		}

		return selectedId;
	}

	// Changed to ask DataService for the single Category being edited
	// instead of the legacy network/SQLite fetch.
	function getData() {

		DataService.getRecordById(

			AppConfig.STORES.CATEGORY,
			getSelectedId(),

			function( objCategory ) {

				if( objCategory ) {

					parseFormDataResponse( [ objCategory ] );
				}
			},

			function( objError ) {

				CommonUtils.logError( "Category.script.js (getData)", objError );
				hideLoader();
				CommonUtils.showAlert( "Unable to load Category." );
			}
		);
	}

	// Changed to ask DataService for one page of Categories at a time
	// (Google Apps Script backed) instead of the legacy network summary /
	// local SQLite fetch. Pass iRequestedPage to jump to a specific page.
	function getListData( iRequestedPage ) {

		if( iRequestedPage ) {

			mCurrentPage = iRequestedPage;
		}

		DataService.getRecordsPage(

			AppConfig.STORES.CATEGORY,
			mCurrentPage,
			mPageSize,
			mCurrentSearchKeyword,

			function( objPageResult ) {

				hideLoader();
				parseListResponse( objPageResult );
			},

			function( objError ) {

				CommonUtils.logError( "Category.script.js (getListData)", objError );
				hideLoader();
				CommonUtils.showAlert( "Unable to load Categories." );
			}
		);
	}

	function listenersSingleClickModal() {

		$( '#category_show_info' ).off().on( 'click', function() {

			closeSelectMenu();
			openListDetailsPopup();
			onInfoViewDocumentReady();
		});

		if( checkRolePermission( SOFTWARE_FEATURE_CONST.ADD_CATEGORY ) == true ) {

			$( '#category_add' ).off().on( 'click', function() {

				closeSelectMenu( onClickAdd );
			});
		}
		else {

			$( "#category_add" ).hide();
		}

		if( checkRolePermission( SOFTWARE_FEATURE_CONST.EDIT_CATEGORY ) == true ) {

			$( '#category_edit' ).off().on( 'click', function() {

				closeSelectMenu( onClickEdit );
			});
		}
		else {
		
			$( '#category_edit' ).hide();
		}


		if( checkRolePermission( SOFTWARE_FEATURE_CONST.DELETE_CATEGORY ) == true ){

			$( '#category_delete' ).off().on( 'click', function() {

				closeSelectMenu();
				onClickDelete();
			});
		}
		else {
		
			$( '#category_delete' ).hide();
		}
		if( checkRolePermission( SOFTWARE_FEATURE_CONST.SHARE_CATEGORY ) == true ){

			$( '#category_share' ).off().on( 'click', function() {

				closeSelectMenu();
				openShareMenu();
			});
		}
		else {
		
			$( '#category_share' ).hide();
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

			var script = CategoryScript.getInstance();
			openGallery( script.setSelectedPhoto );
		});

		$( '#camera_photo' ).off().on('click', function() {

			closePhotoMenuPopup();

			var script = CategoryScript.getInstance();
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
		if( checkRolePermission( SOFTWARE_FEATURE_CONST.DELETE_CATEGORY ) == true ) {

			$( '#multi_delete' ).off().on( 'click', function() {

				onClickMultiRowDelete();
			});
		}
		else {
		
			$( '#multi_delete' ).hide();
		}

		if( checkRolePermission( SOFTWARE_FEATURE_CONST.SHARE_CATEGORY ) == true ) {

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

			createTableCategory( null );
		}

		clearSearch();

		showLoader( "Please wait..." );

		// Show shimmering placeholder cards immediately instead of leaving
		// #list_id empty while the first page of Categories is in flight.
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

		if( checkRolePermission( SOFTWARE_FEATURE_CONST.ADD_CATEGORY ) == true ) {

			// FIX: #btn_add is an <a href="#"> - without preventDefault()
			// the default action changes the URL hash and pushes a history
			// entry, which onBackPress()'s popstate listener misreads as a
			// Back press and force-navigates to the Dashboard.
			$( "#btn_add" ).off().on( "click", function( objEvent ) {

				objEvent.preventDefault();

				onClickAdd();
			});
		}
		else {

			$( "#btn_add" ).hide();
		}

		// Same href="#" / popstate fix as #btn_add above.
		$( "#btn_refresh" ).off().on( "click", function( objEvent ) {

			objEvent.preventDefault();

			onClickRefresh();
		});

		// FIX: #btn_share_page (top AppBar Share) had no click handler at all.
		$( "#btn_share_page" ).off().on( "click", function( objEvent ) {

			objEvent.preventDefault();

			CommonUtils.shareContent( "Category List", "Category List - Student Management System", window.location.href );
		});

		// The floating down-arrow button smooth-scrolls the list to the
		// bottom; it is not wired to Export (see exportCategoryList() below,
		// ready to be attached to a dedicated Export button in future).
		$( "#btn_float_next_page" ).off().on( "click", function( objEvent ) {

			objEvent.preventDefault();

			$( "html, body" ).animate( { scrollTop: $( document ).height() }, 300 );
		});

		// FIX: the Export button existed in the UI but was never wired to
		$( "#btn_export" ).off().on( "click", function( objEvent ) {

			objEvent.preventDefault();

			exportCategoryList();
		});

		//--------- START - FILTER --------------
		$('#filter_icon').off().on( "click", function() {
	
			showFilter();
		});

		$('#filter_params').off().on( "click", function() {

			showFilter();
		});

		$('#btn_filter').off().on( "click", function() {

			doFilterCategoryList();
		});

		// Filter re-applies as soon as the Organization dropdown changes,
		// not only when the separate Apply button is pressed.
		$( '#filter_organization_id' ).off( "change" ).on( "change", function() {

			doFilterCategoryList();
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

	// Changed: loads the Category list itself (DataService is the only data
	// source in the PWA); the Organization filter list is then built from
	// the loaded rows inside parseListResponse()/loadOrganizationList().
	function onLoadCacheManager() {

		getListData();
	}

	// parse one page of the list response from server
	function parseListResponse( objPageResult ) {

		if( !objPageResult ) {

			objPageResult = { records: [], totalRecords: 0, totalPages: 1, page: 1, pageSize: mPageSize };
		}

		hideLoader();

		var arrCategories = objPageResult.records || [];

		mCurrentPage = objPageResult.page || 1;
		mTotalPages = objPageResult.totalPages || 1;
		mTotalRecords = objPageResult.totalRecords || arrCategories.length;

		// Bridge each DataService object into the [ category_id, name,
		// organization_id ] array-row shape the rest of this file expects.
		var arrCategoryRows = [];

		for( var i = 0; i < arrCategories.length; i++ ) {

			var objCategory = arrCategories[ i ];

			var arrRow = [];

			arrRow[ SUMMARY_INDEX.CATEGORY_ID ] = objCategory.category_id;
			arrRow[ SUMMARY_INDEX.NAME ] = objCategory.name;
			arrRow[ SUMMARY_INDEX.ORGANIZATION_ID ] = objCategory.organization_id;

			arrCategoryRows.push( arrRow );
		}

		// Renders the current page directly (there is no full table kept in
		// memory to filter against anymore - see doFilterCategoryList()).
		renderCurrentPage( arrCategoryRows );

		// Reflects the Organizations seen on whichever page(s) have been
		// loaded so far - an accepted limitation of real pagination.
		loadOrganizationList( arrCategoryRows );

		// Dashboard "Quick Add" - reuses the existing Add Category workflow.
		if( sessionStorage.getItem( "DASHBOARD_QUICK_ADD_ACTION" ) == "category" ) {

			sessionStorage.removeItem( "DASHBOARD_QUICK_ADD_ACTION" );

			if( checkRolePermission( SOFTWARE_FEATURE_CONST.ADD_CATEGORY ) == true ) {

				onClickAdd();
			}
		}
	}

	// Renders exactly one already-fetched page of Categories, then appends
	// a Prev/Next pagination bar below the list.
	function renderCurrentPage( arrCategoryRows ) {

		mSearchList = arrCategoryRows;
		mSelectedDataList = arrCategoryRows; // Initializing the Selected data array
		mMultiSelectedList = []; // Initializing the Selected data array

		var htmlContent = "";

		if( arrCategoryRows.length === 0 ) {

			htmlContent = CommonUtils.getEmptyStateHtml( "Categories", "fa-solid fa-list" );
		}

		for( var i = 0; i < arrCategoryRows.length; i++ ) {

			htmlContent += createHtmlListItem( arrCategoryRows[ i ], i );
		}

		htmlContent += buildPaginationBarHtml();

		var records = CommonUtils.buildPaginationSummary( mCurrentPage, mPageSize, mTotalRecords );

		if( mCurrentSearchKeyword ) {

			records += " (search: \"" + mCurrentSearchKeyword + "\")";
		}

		document.getElementById( "records" ).innerText = records;

		setListToView( htmlContent );

		bindPaginationBarListeners();
	}

	// Small, self-contained Prev/Next bar - plain HTML/inline styling so it
	// works without any new CSS file.
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

	// Changed: there is no Organization entity or backend endpoint anywhere
	// in this project - "organization" is just a free-text field already
	// stored on every Category, so the filter list is built from the rows
	// already loaded above instead of a separate network request.
	function loadOrganizationList( arrCategoryRows ) {

		var arrOrganizationNames = [];

		for( var i = 0; i < arrCategoryRows.length; i++ ) {

			var strOrganization = arrCategoryRows[ i ][ SUMMARY_INDEX.ORGANIZATION_ID ];

			if( strOrganization && arrOrganizationNames.indexOf( strOrganization ) === -1 ) {

				arrOrganizationNames.push( strOrganization );
			}
		}

		setOrganizationListData( arrOrganizationNames );
	}
	// parse summary list response from the storage
	function parseListFromStorage() {

		hideLoader();

		doFilterCategoryList();
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
		
		var id = selectedData[ SUMMARY_INDEX.CATEGORY_ID ];
		sessionStorage.setItem( SESSION_OBJECT.CATEGORY_ID, id );
	
		if( mInfoIconClicked == false && mEditIconClicked == false && mShareIconClicked == false ) {

			openSelectMenu();
		}	
	}

	function clearSearch() {

		$("#search").val("");

		mCurrentSearchKeyword = "";
	}

	function enableSearch( mode ) {

			if( mode == MODE_SEARCH_ON_KEYUP ) { // Search list onKeyup

				// Bound via the native "input" event instead of jQuery's
				// keyup() - input fires for every value change (typing,
				// paste, autofill, mobile keyboard predictions/backspace-
				// hold), whereas keyup can miss some of those.
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

		mCurrentPage = 1;

		getListData( 1 );

		showLoader( "Refreshing..." );
	}

	function onClickAdd() {

		sessionStorage.setItem( SESSION_OBJECT.ADD_EDIT_MODE, INSERT_DATA );

		// You can comment the below two lines and uncomment the last line to restore page mode
		$('#edit_details_title').text('Add New Category');
		openEditDetailsPopup();
		onAddEditDocumentReady();

	}
	function onClickSaveData() {

		var bValid = validateForm();
		if( bValid == true ) {

			var mode = getAddEditMode();

			var title = "Add New";
			var message = "Do you want to add new Category?";
			if( mode == UPDATE_DATA ) {
				title = "Update";
				message = "Do you want to update the Category?";
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
		$('#edit_details_title').text('Edit Category');
		openEditDetailsPopup();
		onAddEditDocumentReady();
	}


	function onClickDelete() {

		closeSelectMenu();
		showConfirmationAlert( "Do you want to delete selected Category?", onConfirmDelete, "Message", [ "Delete", "Cancel" ] );
	}

	// Changed: waits 250ms after typing stops, then asks the backend to
	// search every matching row (resetting to page 1) instead of
	// filtering/hiding only the already-rendered <ul> elements of the
	// current page.
	function searchList() {

		if( mSearchDebounceTimer ) {

			clearTimeout( mSearchDebounceTimer );
		}

		mSearchDebounceTimer = setTimeout( function() {

			mCurrentSearchKeyword = document.getElementById( "search" ).value.trim();
			mCurrentPage = 1;

			showLoader( "Searching..." );
			getListData( 1 );

		}, 250 );
	}

	// Builds a CSV export from mSelectedDataList (the same array already
	// rendering the on-screen cards, so Export always matches the current
	// page/search), dedupes by Category ID as a safety net, and downloads
	// it through a temporary <a> link.
	function exportCategoryList() {

		var arrRows = mSelectedDataList;

		if( arrRows == null || arrRows.length == 0 ) {

			CommonUtils.showAlert( "There are no categories to export." );
			return;
		}

		var arrUniqueRows = [];
		var objSeenCategoryIds = {};

		for( var u = 0; u < arrRows.length; u++ ) {

			var categoryId = arrRows[ u ][ SUMMARY_INDEX.CATEGORY_ID ];

			if( objSeenCategoryIds[ categoryId ] === true ) {

				continue; // already exported this Category ID - skip the duplicate
			}

			objSeenCategoryIds[ categoryId ] = true;
			arrUniqueRows.push( arrRows[ u ] );
		}

		arrRows = arrUniqueRows;

		var arrColumns = [
			JSON_KEY.CATEGORY_ID,
			JSON_KEY.NAME,
			JSON_KEY.ORGANIZATION_ID
		];

		var arrIndexes = [
			SUMMARY_INDEX.CATEGORY_ID,
			SUMMARY_INDEX.NAME,
			SUMMARY_INDEX.ORGANIZATION_ID
		];

		var strCsv = arrColumns.join( "," ) + "\r\n";

		for( var i = 0; i < arrRows.length; i++ ) {

			var objRow = arrRows[ i ];

			var arrValues = arrIndexes.map( function( intIndex ) {

				var value = objRow[ intIndex ];

				if( value == null ) {

					value = "";
				}

				return '"' + String( value ).replace( /"/g, '""' ) + '"';
			});

			strCsv += arrValues.join( "," ) + "\r\n";
		}

		var objBlob = new Blob( [ strCsv ], { type: "text/csv;charset=utf-8;" } );
		var strUrl = window.URL.createObjectURL( objBlob );

		var elemLink = document.createElement( "a" );
		elemLink.href = strUrl;
		elemLink.download = "categories_export_" + new Date().toISOString().slice( 0, 10 ) + ".csv";

		if( typeof ActivityLog !== "undefined" ) {

			ActivityLog.logActivity( "Exported Categories" );
		}

		document.body.appendChild( elemLink );
		elemLink.click();
		document.body.removeChild( elemLink );

		window.URL.revokeObjectURL( strUrl );

		CommonUtils.showAlert( "Export completed successfully.", "success" );
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
		// FIX: the real share modal's id is "modal_share", not
		// "modal_share_question" - Back now properly closes it instead of
		// falling through to the double-back-press exit logic.
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

		var categoryList = getStorageData( SESSION_OBJECT.CATEGORY_SUMMARY_DATA );

		if( categoryList == null ) {

			categoryList = [];
		}

		var message = "";
		if ( mode == INSERT_DATA ) {

			var errorData = getStorageData(SESSION_OBJECT.CATEGORY_ERROR_DATA);
			if( errorData != null ){

				if( errorData.length > 0 ){

					var errorHandlerScript = ErrorHandlerScript.getInstance();
					errorHandlerScript.syncServerErrorData( getStorageData( SESSION_OBJECT.CATEGORY_ERROR_DATA ), errorHandlerScript.deleteErrorData );
				}
			}
			
			var result = getAddEditResultArray( response[ JSON_KEY.CATEGORY_ID ] );
			message = "Category saved successfully.";
			
			categoryList.push( result );

			setStorageData( categoryList, SESSION_OBJECT.CATEGORY_SUMMARY_DATA );
			hideLoader();

			getListData();
		}
		else if ( mode == UPDATE_DATA ) {

			var result = getAddEditResultArray( 0 );
			message = "Category updated successfully.";

			for ( var i = 0; i < categoryList.length; i++ ) {

				var data = categoryList[ i ];

				if ( data[ INDEX.CATEGORY_ID ] == result[ INDEX.CATEGORY_ID ] ) {

					categoryList[ i ] = result;
				}
			}

			setStorageData( categoryList, SESSION_OBJECT.CATEGORY_SUMMARY_DATA );
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
	// Changed: DataService assigns the real Category ID on Add, so it is
	// read from the "id" argument instead of always falling back to
	// mJsonData's placeholder ID; Update passes id as 0 since mJsonData
	// already holds the correct existing ID.
	function getAddEditResultArray( id ) {

		var data = [];

		data[ SUMMARY_INDEX.CATEGORY_ID ] = id || mJsonData[ SUMMARY_JSON_KEY.CATEGORY_ID ];
		data[ SUMMARY_INDEX.NAME ] = mJsonData[ SUMMARY_JSON_KEY.NAME ];
		data[ SUMMARY_INDEX.ORGANIZATION_ID ] = mJsonData[ SUMMARY_JSON_KEY.ORGANIZATION_ID ];

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

				var selectedId = selectedData[ i ][ SUMMARY_INDEX.CATEGORY_ID ];

				mSelectedIdList.push( selectedId );			
			}
		}
			
		return mSelectedIdList;
	}
	function parseDeleteResponse( rowsDeleted, statusCode, response ) {

		if( statusCode == G_ERROR.CODE.DELETE_OPERATION_DEPENDENT_EXISTS ) {

			var errorMsg = response.message;
			
			var message = "Cannot delete the Category." + errorMsg.split("<br>");
			showOperationMessage( message, "Warning", null );
			hideLoader();
		}
		else{

			var categoryList = getStorageData( SESSION_OBJECT.CATEGORY_SUMMARY_DATA );

			for( var i = 0; i < mSelectedIdList.length; i++ ) {

				var deletedId = mSelectedIdList[ i ];

				for( var j = 0; j < categoryList.length; j++ ) {

					var data = categoryList[ j ];
					if( data[ SUMMARY_INDEX.CATEGORY_ID ] == deletedId ) {

						categoryList.splice( j, 1 );
					}
				}
			}

			setStorageData( categoryList, SESSION_OBJECT.CATEGORY_SUMMARY_DATA );

			if( mMultiSelect == true ) {

				resetMultiSelection();
			}

			parseListFromStorage();

			showOperationMessage( "Category deleted successfully.", "Success", null );
		}
	}
	function getSelectedId() {

		var id = 0;

		if(sessionStorage.hasOwnProperty(SESSION_OBJECT.CATEGORY_ID)) {
		
			id = sessionStorage.getItem( SESSION_OBJECT.CATEGORY_ID );
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

		var categoryList = getStorageData( SESSION_OBJECT.CATEGORY_DATA );

		if( categoryList != null ) {

			var selectedId = getSelectedId();

			data = categoryList.find( obj => {
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

		var categoryList = getStorageData( SESSION_OBJECT.CATEGORY_SUMMARY_DATA );

		if( categoryList != null ) {

			var selectedId = getSelectedId();

			data = categoryList.find( obj => {
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

		// FIX: the real share modal's id is "modal_share", not
		// "modal_share_category".
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
			   
			if( checkRolePermission( SOFTWARE_FEATURE_CONST.ADD_CATEGORY ) == true ) {

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

	// Takes an optional callback that only runs once #modal_single_select
	// has actually finished closing (its "hidden.bs.modal" event), so a
	// second modal (e.g. Add/Edit) never opens mid fade-out transition and
	// gets left behind a stray backdrop that blocks clicks.
	function closeSelectMenu( fnCallback ) {

		if( fnCallback ) {

			$( '#modal_single_select' ).one( 'hidden.bs.modal', function() {

				fnCallback();
			});
		}

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
		mShareIconClicked = false;
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

	// Changed: SUMMARY_INDEX has no FIRST_FILL_IN/_FILL_IN keys (unfinished
	// codegen placeholders) - the card's title/subtitle now use this
	// entity's real Name/Organization fields. Icons also gained
	// role/tabindex/aria-label for accessibility, a Share icon, and a
	// stopPropagation-guarded Edit icon (see onClickEditIcon) instead of
	// plain onclick spans.
	function createHtmlListItem( data, index ) {

		var name = data[ SUMMARY_INDEX.NAME ];
		var fillInData = data[ SUMMARY_INDEX.ORGANIZATION_ID ];

		// The displayed row number keeps counting across pages (page 2
		// starts at 101, not 1 again); "index" itself stays the page-local
		// array position used by the click handlers below.
		var seqNumber = ( ( mCurrentPage - 1 ) * mPageSize ) + index + 1 + ') ';

		var infoIconHtml = '<span class="icon-btn icon-btn-info" role="button" tabindex="0" aria-label="View category details" onclick="CategoryScript.getInstance().onClickInfoIcon('+ index +');"><i class="fa fa-info-circle" aria-hidden="true"></i></span>';
		var editIconHtml = '';
		if( checkRolePermission( SOFTWARE_FEATURE_CONST.EDIT_CATEGORY ) == true ) {

			editIconHtml = '<span class="icon-btn icon-btn-edit" role="button" tabindex="0" aria-label="Edit category" onclick="CategoryScript.getInstance().onClickEditIcon('+ index +', event);"><i class="fas fa-edit"></i></span>';
		}

		var shareIconHtml = '<span class="icon-btn icon-btn-share" role="button" tabindex="0" aria-label="Share category" onclick="CategoryScript.getInstance().onClickShareIcon('+ index +', event);"><i class="fa-solid fa-share-nodes"></i></span>';

		var cardIconActionsHtml = '<div class="card-icon-actions">' + shareIconHtml + editIconHtml + '</div>';

		var htmlListItem =  '<ul class="list-dis" id="list_card" onselectstart="return false" style="position:relative;">' +
							cardIconActionsHtml +
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

		var query = "SELECT MAX( " + DB_FIELD.CATEGORY_ID + " ) AS maxcount FROM " + TABLE_NAME;

		getMaxDbId( query, callback );	//please change function name at its definition in db.handler.js to this name if not same as this.
	}

	function createTableCategory( callback ) {

		var query = 'CREATE TABLE IF NOT EXISTS ' + TABLE_NAME + ' (' +
			DB_FIELD.CATEGORY_ID + ' INTEGER PRIMARY KEY ,' +
			DB_FIELD.NAME + ' TEXT ,' +
			DB_FIELD.ORGANIZATION_ID + ' TEXT' +
			')';

		executeQuery( query, callback );
	}


	function getInsertQuery() {

		var query = 'INSERT INTO ' + TABLE_NAME + '(' +

			DB_FIELD.CATEGORY_ID + ',' +
			DB_FIELD.NAME + ',' +
			DB_FIELD.ORGANIZATION_ID +
			') VALUES (?, ?, ?)';
		return query;
	}

	function getUpdateQuery() {

		var query = 'UPDATE ' + TABLE_NAME + ' SET ' +
			DB_FIELD.CATEGORY_ID + '=?, ' +
			DB_FIELD.NAME + '=?, ' +
			DB_FIELD.ORGANIZATION_ID +' =? WHERE ' +
			DB_FIELD.CATEGORY_ID + '=' + getSelectedId();

		return query;
	}

	function onErrorFetchData( url, description, logData, flag ){

		var errorHandlerScript = ErrorHandlerScript.getInstance();
		errorHandlerScript.saveErrorData( "Category", url, "", description, logData, flag, null );
	}

	// Changed to ask DataService for the single Category being previewed
	// instead of the legacy network/SQLite fetch (mirrors getData() above).
	function onInfoViewDocumentReady() {

		DataService.getRecordById(

			AppConfig.STORES.CATEGORY,
			getSelectedId(),

			function( objCategory ) {

				if( objCategory ) {

					parsePreviewResponse( [ objCategory ] );
				}
			},

			function( objError ) {

				CommonUtils.logError( "Category.script.js (onInfoViewDocumentReady)", objError );
				hideLoader();
				CommonUtils.showAlert( "Unable to load Category." );
			}
		);
	}

	// Same object -> array-row bridge as parseFormDataResponse() above, so
	// setPreview() (which reads CATEGORY_DATA through INDEX.* array
	// positions) can find the record.
	function parsePreviewResponse( arrCategory ) {

		var arrCategoryRows = [];

		for( var i = 0; i < arrCategory.length; i++ ) {

			var objCategory = arrCategory[ i ];

			var arrRow = [];
			arrRow[ INDEX.CATEGORY_ID ] = objCategory.category_id;
			arrRow[ INDEX.NAME ] = objCategory.name;
			arrRow[ INDEX.ORGANIZATION_ID ] = objCategory.organization_id;
			arrRow[ INDEX.DESCRIPTION ] = objCategory.description;

			arrCategoryRows.push( arrRow );
		}

		setStorageData( arrCategoryRows, SESSION_OBJECT.CATEGORY_DATA );

		setPreview();
	}

	// onClick List item detail view
	function setPreview() {

		var data =  getSelectedData();

		mInfoIconClicked = false;
		mEditIconClicked = false;
		mShareIconClicked = false;
		$(FORM_FIELD_INFO.LBL_CATEGORY_ID).text( data[INDEX.CATEGORY_ID] );
		$(FORM_FIELD_INFO.LBL_NAME).text( data[INDEX.NAME] );
		$(FORM_FIELD_INFO.LBL_ORGANIZATION_ID).text( data[INDEX.ORGANIZATION_ID] );
		$(FORM_FIELD_INFO.LBL_DESCRIPTION).text( data[INDEX.DESCRIPTION] || 'No description provided.' );

		// Category has no photo/document fields (INDEX.PHOTO_PATH /
		// INDEX.DOCUMENT_PATH are not defined), so guard against undefined
		// before reading .length instead of assuming they exist.
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

	// Changed: real pagination means the full Category table no longer
	// lives in memory (only the current page does), so filtering by
	// Organization across the whole table isn't possible without
	// re-fetching everything - which real pagination is meant to avoid.
	// Points the user at Search instead of silently showing wrong results.
	function doFilterCategoryList() {

		CommonUtils.showAlert( "Filtering by Organization isn't available with paginated lists yet - try Search instead." );

		closeFilterMenu();
	}

	function showFilter() {

		var organizationList = getStorageData( SESSION_OBJECT.ORGANIZATION_LIST );

		setOrganizationFilterSelection( organizationList );

		openFilterMenu();
	}

	function setOrganizationFilterSelection( organizationList ) {

		if( organizationList == null ) {

			organizationList = [];
		}

		var selectedValue = getFilterSelectionIds( SESSION_OBJECT.ORGANIZATION_ID );

		$( '#filter_organization_id' ).empty();
		$( '#filter_organization_id' ).append( $( '<option value="0">Select All</option>' ) );

		for( var i = 0; i < organizationList.length; i++ ) {

			var strOrganization = organizationList[ i ];

			var option = document.createElement( 'option' );
			option.value = strOrganization;
			option.text = strOrganization;

			$( '#filter_organization_id' ).append( option );

			if( strOrganization == selectedValue ) {

				$( '#filter_organization_id' ).val( strOrganization ).change();
			}
		}
	}

	function showFilterInfo( organizationName ) {

		$( '#show_all_div' ).show();
		var organizationText = '';
		$( '#organization_name_div' ).hide();
		if( organizationName !== "Select All" && organizationName != null ){

			organizationText = organizationName;
			$( '#show_all_div' ).hide();
			$( '#organization_name_div' ).show();
		}

		$( "#organization_name" ).text( organizationText );
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

		sessionStorage.removeItem( SESSION_OBJECT.ORGANIZATION_ID );
		$( '#filter_organization_id' ).val( 0 );


	}

	function populateSelection( listData, formField, selectedValueId ) {

		if( listData == null ) {
			listData = [];
		}

		$(formField).empty(); //remove all child nodes

		var newOption = $('<option value="0" >Select Category</option>');
		if( formField === '#filter_category_id' ) { // For filter we will show "Select All" as an option

			newOption = $( '<option value="0" >Select All</option>' );
		}

		$(formField).append( newOption );
		$(formField).trigger( "chosen:updated" );

		// Skip repeated option values so duplicate Category rows (or rows
		// sharing the same display name) don't render as identical-looking
		// repeats in the dropdown - keeps the first row's id.
		var arrSeenNames = [];

		for( var index = 0; index < listData.length; index++ ) {

			var id = listData[ index ][ INDEX.CATEGORY_ID ];
			var name = listData[ index ][ INDEX.NAME ];	// UPDATE THIS as per Object

			if( arrSeenNames.indexOf( name ) !== -1 ) {

				continue; // already added an option for this name
			}

			arrSeenNames.push( name );

			var option = document.createElement( 'option' );
			option.value = id;
			option.text = name;

			$(formField).append( option );

			if( id == selectedValueId && id != 0 ) {

				$(formField).val( id ).change();
			}
		}
	}
	// Show Category info on click of info icon in the list item
	function onClickInfoIcon( index ){

		mInfoIconClicked = true;

		var selectedData = mSelectedDataList[ index ];

		var id = selectedData[ SUMMARY_INDEX.CATEGORY_ID ];
		sessionStorage.setItem( SESSION_OBJECT.CATEGORY_ID, id );
		
		openListDetailsPopup();
		onInfoViewDocumentReady();
	}

	// Open Edit Category on click of edit icon in the list item
	function onClickEditIcon( index, objEvent ) {

		// Stop this click from bubbling up to the card's own delegated
		// click handler, which would otherwise open the "Select an Option"
		// popup right behind this click.
		if( objEvent ) {

			objEvent.stopPropagation();
		}

		mEditIconClicked = true;

		var selectedData = mSelectedDataList[ index ];

		var id = selectedData[ SUMMARY_INDEX.CATEGORY_ID ];
		sessionStorage.setItem( SESSION_OBJECT.CATEGORY_ID, id );

		sessionStorage.setItem( SESSION_OBJECT.ADD_EDIT_MODE, UPDATE_DATA );
		$('#edit_details_title').text( 'Edit Category' );
		openEditDetailsPopup();
		onAddEditDocumentReady();
	}

	// Per-card Share icon.
	function onClickShareIcon( index, objEvent ) {

		if( objEvent ) {

			objEvent.stopPropagation();
		}

		mShareIconClicked = true;
		setTimeout( function() { mShareIconClicked = false; }, 0 );

		var selectedData = mSelectedDataList[ index ];

		if( !selectedData ) {

			return;
		}

		var strName = selectedData[ SUMMARY_INDEX.NAME ] || "Category";

		CommonUtils.shareContent( "Category: " + strName, "Name: " + strName );
	}

	// Start - Share Category data
	function onClickShare(){

		var messageTitle = "Confirm";
		var message = "Do you want to share Category(s)?";
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

		var subject = "Category(s)";
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

	// Filled in with this entity's own real Name/Organization fields
	// (Category has no mobile/email of its own).
	function getFormattedData( seqNumber, selectedData ) {

		var resultText = "";

		var strName = selectedData[ SUMMARY_INDEX.NAME ] || "";
		var strOrganization = selectedData[ SUMMARY_INDEX.ORGANIZATION_ID ] || "";

		if( mShareMode == MODE_SHARE_EMAIL ){ // Share by EMAIL

			resultText += seqNumber + ") " + strName + "<br>";
			resultText += "Organization: " + strOrganization + "<br><br>";
		}
		else { // Share by WhatsApp

			resultText += "_*" + seqNumber + ") " + strName + "*_\n";
			resultText += "Organization: " + strOrganization + "\n\n";
		}

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
			onClickShareIcon: onClickShareIcon,
			// setSelectedPhoto: setSelectedPhoto,
			closeImageButton: closeImageButton,
			closeFileButton: closeFileButton,
			uploadDocuments: uploadDocuments,
			createTableCategory: createTableCategory,
			getInsertQuery: getInsertQuery,
			exportCategoryList: exportCategoryList
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