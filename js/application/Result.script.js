////////////////////////////////////////////////////////////////////////////

// FileName Result.script.js: Result Javascript file for Cordova project

// Author : JRC
// Description : codegen


////////////////////////////////////////////////////////////////////////////

/* ----------------------------------------------------------
   Project Improvements (Pagination / Loading Performance pass)
   ----------------------------------------------------------
   ✓ ROOT CAUSE: getListData() called DataService.getAllRecords(
     AppConfig.STORES.RESULT, ...) - one request asking the
     backend for the ENTIRE Result table (via DataService.js's
     internal LIST_ALL_PAGE_SIZE=100000), then held/rendered/
     filtered all of it client-side through
     doFilterResultList()/showFilteredList(). That is exactly
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
   ✓ SEARCH (superseded by the Global Search Improvements pass
     below - kept for history): at the time of this pagination
     pass there was no searchResults backend action, so
     searchList() only filtered the currently loaded page,
     client-side. That is no longer true - see the "Global
     Search Improvements" note further down this file for the
     current server-side implementation.
   ✓ Lookup caching (Task 5): this file's own onLoadCacheManager()
     calls DataService.getAllRecords(STUDENT, ...) purely as a
     lookup (Result cards showing the Student's name) - that
     call is now served from DataService's shared in-memory
     cache instead of hitting the network every time this page
     opens. See DataService.js's "Pagination / Loading
     Performance pass" note for the full explanation.
   No function renamed, no file/folder moved, no architecture
   change - only getListData()/parseListResponse()/
   doFilterResultList()/showFilteredList()/enableSearch()/
   onClickRefresh() above, all already-existing functions, were
   modified.
   ---------------------------------------------------------- */

/* ----------------------------------------------------------
   Global Search Improvements pass
   ----------------------------------------------------------
   ✓ searchResults is now wired in DataService.js (searchAction),
     so searchList() below sets mCurrentSearchKeyword and reloads
     page 1 through getListData()/getRecordsPage() - a search now
     covers every Result record, not only the page on screen.
   ✓ FIXED double-debounce bug: enableSearch()'s "input" handler
     used to wrap searchList() in its own 250ms setTimeout on top
     of the 250ms debounce searchList() already applies - two
     stacked debounces, ~500ms of lag per keystroke instead of
     250ms. enableSearch() now just calls searchList() directly.
   ✗ KNOWN GAP (backend, outside this zip): searchResults matches
     Student as a raw id server-side, so the brief's own example
     - typing "Ram" - won't match until Result.gs's
     searchResults() itself resolves that id to the student's
     name before comparing. Same limitation as Section.gs
     (Category name) noted in Section.script.js.
   ---------------------------------------------------------- */

/* ----------------------------------------------------------
   Final QA Pass - Back Button / Share Modal Fix (added)
   ----------------------------------------------------------
   Fixed a broken Back-button/reset check in Result.script.js:
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
   Removed leftover debug console.log() calls in Result.script.js
   (form-data dumps, TBD stub messages, commented-out
   file-picker logs, etc.) and replaced every
   console.log(objError)/console.log(error) inside a catch
   block with CommonUtils.logError("Result.script.js
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
	// PAGINATION FIX (this pass) - real pagination state.
	// WHY: this page used to call DataService.getAllRecords()
	// (see the old getListData() below) - one single request
	// asking the backend for the ENTIRE Result table, then held
	// and rendered/filtered all of it client-side. That is
	// exactly the "fetch every page into memory" bug this pass
	// removes: with a real dataset (hundreds/thousands of rows)
	// every Result List open downloaded the whole table just to
	// show the first screen of cards.
	// WHAT: getListData()/parseListResponse() below now ask the
	// backend for exactly one 100-row page at a time via
	// DataService.getRecordsPage(), the same real-pagination
	// pattern already used by Category.script.js/Student.script.js.
	// These variables track which page is currently showing so
	// the Prev/Next buttons (buildPaginationBarHtml() below) and
	// Refresh (onClickRefresh()) know which page to (re)request.
	// Project Improvements (this pass): searchResults IS wired up
	// now via DataService.js's RESULT.searchAction (it already
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

	// BUG FIX (this pass) - Share icon: same fix as Student.script.js -
	// the per-card top Share button (onClickShareIcon() below) had no
	// equivalent flag, so tapping it fell through to
	// onSingleClickListener()'s guard below (which only checked
	// Info/Edit), opening the per-card Select Option popup right on
	// top of/after the Share action - making the top Share icon look
	// broken even though its own click handler did run.
	var mShareIconClicked = false;

	var mImageClosed = false;	// Indicates whether the image is removed or not while updating
	var mFileClosed = false;	// Indicates whether the File is removed or not while updating
	var TABLE_NAME = "result";
	//--------------Table row index:-----------------

	var value = 0;

	// --------------------------------------------------------
	// PROJECT IMPROVEMENTS (Final UX Polish pass - added)
	// --------------------------------------------------------
	// WHY: this whole field model (EXAM_NAME/DATE_OF_EXAM/
	// TOTAL_MARKS/MARKS_OBTAINED) was a codegen guess that never
	// matched the actual "Results" Google Sheet, which has columns
	// resultId, studentId, exam, subject, marks, grade, result
	// (confirmed against the live sheet). Result.gs's backend
	// (see DataService.js's GOOGLE_ENTITY_MAP[RESULT]) already
	// requires studentId/exam/subject to Add or Update - this file
	// simply never collected them, so every Result the app tried
	// to save was rejected by the backend, and the list/Info popup
	// showed "undefined" for fields that don't exist (Date Of Exam,
	// Total Marks). This is the root cause of "my data isn't
	// showing up in the app" for Results.
	// WHAT: INDEX/SUMMARY_INDEX/LABEL/DEFAULT/FORM_FIELD/
	// FORM_FIELD_INFO/JSON_KEY/SUMMARY_JSON_KEY/DB_FIELD now match
	// the real sheet: STUDENT_ID, SUBJECT and GRADE/RESULT
	// (pass/fail) added; DATE_OF_EXAM and TOTAL_MARKS (columns
	// that do not exist) removed. MARKS_OBTAINED is kept as the
	// local field name (it already maps to the sheet's "marks"
	// column via DataService.js's toBackendFields/fromBackendFields,
	// which was NOT changed - no architecture change).
	// WHEN: every place this file reads/writes a Result record.
	// --------------------------------------------------------

	var INDEX = {
		RESULT_ID : value++,		// 1
		STUDENT_ID : value++,		// 2
		EXAM_NAME : value++,		// 3
		SUBJECT : value++,		// 4
		MARKS_OBTAINED : value++,		// 5
		GRADE : value++,		// 6
		RESULT : value++,		// 7
	};

	//--------------Summary row index:-----------------

	value = 0;

	var SUMMARY_INDEX = {
		RESULT_ID : value++,		// 1
		STUDENT_ID : value++,		// 2
		EXAM_NAME : value++,		// 3
		SUBJECT : value++,		// 4
		MARKS_OBTAINED : value++,		// 5
		GRADE : value++,		// 6
		RESULT : value++,		// 7
	};

	//-------------Table Header Label----------------------

	var LABEL = {

		RESULT_ID : "Result",
		STUDENT_ID : "Student",
		EXAM_NAME : "Exam",
		SUBJECT : "Subject",
		MARKS_OBTAINED : "Marks",
		GRADE : "Grade",
		RESULT : "Result"
	};

	//-----------------------------Default values------------------------------------
	var DEFAULT = {

		RESULT_ID : 0,
		STUDENT_ID : 0,
		EXAM_NAME : "",
		SUBJECT : "",
		MARKS_OBTAINED : 0,
		GRADE : "",
		RESULT : ""
	};

	//-----------------------------Form Elements------------------------------------
	var FORM_FIELD = {

		RESULT_ID : '#result_id',
		STUDENT_ID : '#student_id',
		EXAM_NAME : '#exam_name',
		SUBJECT : '#subject',
		MARKS_OBTAINED : '#marks_obtained',
		GRADE : '#grade',
		RESULT : '#result_status',
		DOCUMENT_DIV : '#file_div',
		DOCUMENTS_PATH : '#file_id',
		PHOTO_DIV : '#image_div',
		PHOTO_PATH: '#image_id'

	};

	var FORM_FIELD_INFO = { 		// For Show Info Screen

		LBL_RESULT_ID : '#lbl_result_id',
		LBL_STUDENT_NAME : '#lbl_student_name',
		LBL_EXAM_NAME : '#lbl_exam_name',
		LBL_SUBJECT : '#lbl_subject',
		LBL_MARKS_OBTAINED : '#lbl_marks_obtained',
		LBL_GRADE : '#lbl_grade',
		LBL_RESULT : '#lbl_result'
	};

	//-----------------------------JSON Key------------------------------------
	var JSON_KEY = {

		RESULT_ID : "result_id",
		STUDENT_ID : "student_id",
		EXAM_NAME : "exam_name",
		SUBJECT : "subject",
		MARKS_OBTAINED : "marks_obtained",
		GRADE : "grade",
		RESULT : "result"
	};

	//-----------------------------SUMMARY JSON Key------------------------------------
	var SUMMARY_JSON_KEY = {

		RESULT_ID : "result_id",
		STUDENT_ID : "student_id",
		EXAM_NAME : "exam_name",
		SUBJECT : "subject",
		MARKS_OBTAINED : "marks_obtained",
		GRADE : "grade",
		RESULT : "result"
	};

	//-----------------------------DB Table Fields------------------------------------
	var DB_FIELD = {

		RESULT_ID : "result_id",
		STUDENT_ID : "student_id",
		EXAM_NAME : "exam_name",
		SUBJECT : "subject",
		MARKS_OBTAINED : "marks_obtained",
		GRADE : "grade",
		RESULT : "result"
	};
	//------------------------------SESSION OBJECT--------------------------------------
	var SESSION_OBJECT = {

		RESULT_ID: "RESULT_ID",
		ADD_EDIT_MODE: "ADD_EDIT_MODE",
		RESULT_DATA: "RESULT_DATA",
		RESULT_SUMMARY_DATA: "RESULT_SUMMARY_DATA",
		STUDENT_LIST: "RESULT_STUDENT_LIST"
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

		// --------------------------------------------------------
		// PROJECT IMPROVEMENTS (added): Result.gs (the backend)
		// requires studentId/exam/subject to Add or Update a Result
		// - see DataService.js's GOOGLE_ENTITY_MAP[RESULT] comment.
		// Validating them here, before the request is even sent,
		// means the person sees a clear message right on the form
		// instead of a generic backend-error toast after the round
		// trip.
		//
		// NOTE: this project never actually defines FormValidation
		// or G_ERROR anywhere (every fv.checkEmpty(...) call in
		// Student/Category/Section.script.js is commented out for
		// exactly this reason - calling either would throw
		// "is not defined" and break Save entirely). Using plain
		// jQuery + CommonUtils.showAlert() instead, the same toast
		// already used for every other validation message in this
		// app.
		// --------------------------------------------------------

		if( $(FORM_FIELD.STUDENT_ID).val() == "0" || $(FORM_FIELD.STUDENT_ID).val() == "" ) {

			CommonUtils.showAlert( "Please select a " + LABEL.STUDENT_ID + "." );
			return false;
		}

		if( $.trim( $(FORM_FIELD.EXAM_NAME).val() ) === "" ) {

			CommonUtils.showAlert( LABEL.EXAM_NAME + " is required." );
			return false;
		}

		if( $.trim( $(FORM_FIELD.SUBJECT).val() ) === "" ) {

			CommonUtils.showAlert( LABEL.SUBJECT + " is required." );
			return false;
		}

		return true;
	}
	function setFormDefaults( resultId ) {
		$(FORM_FIELD.RESULT_ID).val(resultId);
		$(FORM_FIELD.EXAM_NAME).val(DEFAULT.EXAM_NAME);
		$(FORM_FIELD.SUBJECT).val(DEFAULT.SUBJECT);
		$(FORM_FIELD.MARKS_OBTAINED).val(DEFAULT.MARKS_OBTAINED);
		$(FORM_FIELD.GRADE).val(DEFAULT.GRADE);
		$(FORM_FIELD.RESULT).val(DEFAULT.RESULT);

		loadStudentList( DEFAULT.STUDENT_ID );

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

	// --------------------------------------------------------
	// PROJECT IMPROVEMENTS (added)
	// --------------------------------------------------------
	// WHY: the Add/Edit Result form needs a Student picker (the
	// backend requires studentId - see validateForm() above), the
	// same way Student.script.js loads Category/Section lists for
	// its own form dropdowns.
	// WHAT: fetches every Student via DataService, bridges each one
	// into the array-row shape StudentScript.INDEX expects, then
	// asks StudentScript's own populateSelection() to build the
	// <select id="student_id"> options and select selectedId.
	// WHEN: called once from setFormDefaults() (Add) and
	// popUpEditForm() (Edit).
	// --------------------------------------------------------
	function loadStudentList( selectedId ) {

		DataService.getAllRecords( AppConfig.STORES.STUDENT, function( arrStudents ) {

			var studentScript = StudentScript.getInstance();
			var arrStudentRows = [];

			for( var index = 0; index < arrStudents.length; index++ ) {

				var objStudent = arrStudents[ index ];
				var arrRow = [];

				arrRow[ StudentScript.INDEX.STUDENT_ID ] = objStudent.student_id;
				arrRow[ StudentScript.INDEX.NAME ] = objStudent.name;

				// Project Improvements (this pass): also cache Roll Number
				// alongside the id/name that were already stored, so
				// searchList() below can match a Result by the student's
				// roll number, not just their name. objStudent.roll_number
				// is already returned by the same Student list call - no
				// new request needed.
				arrRow[ StudentScript.INDEX.ROLL_NUMBER ] = objStudent.roll_number || "";

				arrStudentRows.push( arrRow );
			}

			setStorageData( arrStudentRows, SESSION_OBJECT.STUDENT_LIST );

			studentScript.populateSelection( arrStudentRows, FORM_FIELD.STUDENT_ID, selectedId );
			enableSaveButton( true );

		}, function( objError ) {

			CommonUtils.logError( "Result.script.js (loadStudentList)", objError );

			// Keep going even if Students fail to load, so the
			// Add/Edit form still opens (just with an empty picker).
			setStorageData( [], SESSION_OBJECT.STUDENT_LIST );
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

		setStorageData( data, SESSION_OBJECT.RESULT_ERROR_DATA );
	}
	function populateFromLocalStorage( data ){
		$( FORM_FIELD.RESULT_ID ).val( data[ INDEX.RESULT_ID ] );
		$( FORM_FIELD.EXAM_NAME ).val( data[ INDEX.EXAM_NAME ] );
		$( FORM_FIELD.SUBJECT ).val( data[ INDEX.SUBJECT ] );
		$( FORM_FIELD.MARKS_OBTAINED ).val( data[ INDEX.MARKS_OBTAINED ] );
		$( FORM_FIELD.GRADE ).val( data[ INDEX.GRADE ] );
		$( FORM_FIELD.RESULT ).val( data[ INDEX.RESULT ] );

		loadStudentList( data[ INDEX.STUDENT_ID ] );

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
		$(FORM_FIELD.SUBJECT).val(data[INDEX.SUBJECT]);
		$(FORM_FIELD.MARKS_OBTAINED).val(data[INDEX.MARKS_OBTAINED]);
		$(FORM_FIELD.GRADE).val(data[INDEX.GRADE]);
		$(FORM_FIELD.RESULT).val(data[INDEX.RESULT]);

		loadStudentList( data[INDEX.STUDENT_ID] );

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
		jsonData[ JSON_KEY.STUDENT_ID ] = ( $(FORM_FIELD.STUDENT_ID).val() );
		jsonData[ JSON_KEY.EXAM_NAME ] = ( $(FORM_FIELD.EXAM_NAME).val() );
		jsonData[ JSON_KEY.SUBJECT ] = ( $(FORM_FIELD.SUBJECT).val() );
		jsonData[ JSON_KEY.MARKS_OBTAINED ] = ( $(FORM_FIELD.MARKS_OBTAINED).val() );
		jsonData[ JSON_KEY.GRADE ] = ( $(FORM_FIELD.GRADE).val() );
		jsonData[ JSON_KEY.RESULT ] = ( $(FORM_FIELD.RESULT).val() );

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
		// cause of "my edits aren't showing up" for Results.
		// result_id does not need to be re-read here - it already
		// comes from the hidden, readonly #result_id field, which
		// popUpEditForm() already populated from the record being
		// edited.
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

					CommonUtils.logError( "Result.script.js (onConfirmSaveFormData)", objError );
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

					CommonUtils.logError( "Result.script.js (onConfirmSaveFormData)", objError );
					hideLoader();
					CommonUtils.showAlert( "Unable to save Result." );
				}
			);
		}
		else {

			CommonUtils.logError( "Result.script.js (onConfirmSaveFormData)", "Invalid mode passed, mode = " + mode );
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

					CommonUtils.logError( "Result.script.js (deleteNextRow)", objError );
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
			arrRow[ INDEX.STUDENT_ID ] = objResult.student_id;
			arrRow[ INDEX.EXAM_NAME ] = objResult.exam_name;
			arrRow[ INDEX.SUBJECT ] = objResult.subject;
			arrRow[ INDEX.MARKS_OBTAINED ] = objResult.marks_obtained;
			arrRow[ INDEX.GRADE ] = objResult.grade;
			arrRow[ INDEX.RESULT ] = objResult.result;

			arrResultRows.push( arrRow );
		}

		// WHY/WHAT: bridge the plain DataService object(s) into the
		// same array-row shape that getSelectedData() reads via
		// INDEX.* positions - matching the fix already applied in
		// Category.script.js. Without this, SESSION_OBJECT.RESULT_DATA
		// held plain objects while getSelectedData() looked them up
		// with obj[0]/obj[1]/..., which never matched, so the Edit
		// form and Info popup always rendered blank/undefined fields.
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

				CommonUtils.logError( "Result.script.js (getData)", objError );
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
		// request was ever sent to the backend.
		// WHAT: now that Result cards show the Student's name (see
		// createHtmlListItem()), this pre-loads the Student list
		// first - same "load lookup lists, then the entity list"
		// order Student.script.js already uses for Category +
		// Section - so the name is available on first paint instead
		// of only after the Add/Edit form has opened once.
		// WHEN: runs once, right when the Result list page
		// finishes loading.
		// --------------------------------------------------

		DataService.getAllRecords( AppConfig.STORES.STUDENT, function( arrStudents ) {

			var arrStudentRows = [];

			for( var index = 0; index < arrStudents.length; index++ ) {

				var objStudent = arrStudents[ index ];
				var arrRow = [];

				arrRow[ StudentScript.INDEX.STUDENT_ID ] = objStudent.student_id;
				arrRow[ StudentScript.INDEX.NAME ] = objStudent.name;

				// Project Improvements (this pass): also cache Roll Number
				// alongside the id/name that were already stored, so
				// searchList() below can match a Result by the student's
				// roll number, not just their name. objStudent.roll_number
				// is already returned by the same Student list call - no
				// new request needed.
				arrRow[ StudentScript.INDEX.ROLL_NUMBER ] = objStudent.roll_number || "";

				arrStudentRows.push( arrRow );
			}

			setStorageData( arrStudentRows, SESSION_OBJECT.STUDENT_LIST );

			getListData();

		}, function( objError ) {

			CommonUtils.logError( "Result.script.js (onLoadCacheManager)", objError );

			// Keep going even if Students fail to load, so the
			// Result list itself can still load.
			setStorageData( [], SESSION_OBJECT.STUDENT_LIST );
			getListData();
		});
	}

	function getListData( iRequestedPage ) {

		// --------------------------------------------------
		// PAGINATION FIX (this pass): this used to call
		// DataService.getAllRecords( AppConfig.STORES.RESULT, ... ),
		// which fetches the ENTIRE Result table in one request -
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
		// WHEN: runs every time the Result list is (re)loaded,
		// paged, or refreshed - now for exactly one page at a time,
		// not the whole table.
		// --------------------------------------------------

		if( iRequestedPage ) {

			mCurrentPage = iRequestedPage;
		}

		DataService.getRecordsPage(

			AppConfig.STORES.RESULT,
			mCurrentPage,
			mPageSize,
			mCurrentSearchKeyword,

			function( objPageResult ) {

				hideLoader();
				parseListResponse( objPageResult );
			},

			function( objError ) {

				CommonUtils.logError( "Result.script.js (getListData)", objError );
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

		// --------------------------------------------------
		// SKELETON LOADING (UI Modernization pass, this pass):
		// show shimmering placeholder cards immediately instead
		// of leaving #list_id empty while the first page of Results
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

		if( checkRolePermission( SOFTWARE_FEATURE_CONST.ADD_RESULT ) == true ) {

			// FIX: #btn_add wraps an <a href="#"> - without
			// preventDefault() that anchor's default action changes
			// the URL hash and pushes a history entry, which
			// onBackPress()'s popstate listener (see
			// ResultHTML.script.js) misreads as a Back press and
			// force-navigates to the Dashboard the instant "+" is
			// tapped. Same fix already applied in Student.script.js.
			$( "#btn_add" ).off().on( "click", function( objEvent ) {

				objEvent.preventDefault();

				onClickAdd();
			});
		}
		else {

			$( "#btn_add" ).hide();
		}

		// FIX: same href="#" / popstate issue as #btn_add above -
		// preventDefault() stops the click from being misread as a
		// Back press that would navigate to the Dashboard instead
		// of just refreshing this list.
		$( "#btn_refresh" ).off().on( "click", function( objEvent ) {

			objEvent.preventDefault();

			onClickRefresh();
		});

		// UI/UX POLISH PASS (this pass) - top AppBar Share button,
		// same pattern as Student.script.js's #btn_share_page binding.
		$( "#btn_share_page" ).off().on( "click", function( objEvent ) {

			objEvent.preventDefault();

			CommonUtils.shareContent( "Result List", "Result List - Student Management System", window.location.href );
		});

		// --------------------------------------------------
		// FIX: the floating down-arrow button (#btn_float_next_page,
		// resultList.html) is this page's export/download control,
		// same as Student List's. It used to forward to the
		// pagination Next button (still available via the Prev/Next
		// bar itself), which didn't match its "download" intent and
		// left Result List with no export at all. Calls the new
		// exportResultList() below directly.
		// --------------------------------------------------
		$( "#btn_float_next_page" ).off().on( "click", function( objEvent ) {

			objEvent.preventDefault();

			exportResultList();
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
	function parseListResponse( objPageResult ) {

		if( !objPageResult ) {

			objPageResult = { records: [], totalRecords: 0, totalPages: 1, page: 1, pageSize: mPageSize };
		}

		hideLoader();

		var arrResults = objPageResult.records || [];

		mCurrentPage = objPageResult.page || 1;
		mTotalPages = objPageResult.totalPages || 1;
		mTotalRecords = objPageResult.totalRecords || arrResults.length;

		// --------------------------------------------------
		// WHY: DataService.getRecordsPage() resolves through
		// getEntityApiConfig(RESULT).fromBackendFields() (see
		// DataService.js), which returns result_id, student_id,
		// exam_name, subject, marks_obtained, grade, result -
		// matching the real "Results" Google Sheet columns
		// (confirmed against the live sheet: resultId, studentId,
		// exam, subject, marks, grade, result). The rest of this
		// file (createHtmlListItem(), showFilteredList(), etc.)
		// was written for the old SQLite row format, where each
		// Result is a plain array read using SUMMARY_INDEX.* as
		// array positions.
		// WHAT: convert each DataService object into that same
		// array-row shape, in this one place only, so every
		// function below this point keeps working exactly as it
		// already did - nothing past this bridge needs to change.
		// WHEN: runs every time a page of the Result list is
		// loaded, refreshed, or paged through.
		// --------------------------------------------------

		var arrResultRows = [];

		for( var i = 0; i < arrResults.length; i++ ) {

			var objResult = arrResults[ i ];

			var arrRow = [];

			arrRow[ SUMMARY_INDEX.RESULT_ID ] = objResult.result_id;
			arrRow[ SUMMARY_INDEX.STUDENT_ID ] = objResult.student_id;
			arrRow[ SUMMARY_INDEX.EXAM_NAME ] = objResult.exam_name;
			arrRow[ SUMMARY_INDEX.SUBJECT ] = objResult.subject;
			arrRow[ SUMMARY_INDEX.MARKS_OBTAINED ] = objResult.marks_obtained;
			arrRow[ SUMMARY_INDEX.GRADE ] = objResult.grade;
			arrRow[ SUMMARY_INDEX.RESULT ] = objResult.result;

			arrResultRows.push( arrRow );
		}

		// --------------------------------------------------
		// PAGINATION FIX (this pass): this used to
		// setStorageData(..., RESULT_SUMMARY_DATA) with the FULL
		// table, then call doFilterResultList() -> showFilteredList(),
		// which re-read and rendered that entire stored table.
		// There is no full table anymore - only the current page -
		// so this stores/renders just that page directly.
		// RESULT_SUMMARY_DATA still holds exactly what is on
		// screen right now (same storage key, same shape), so the
		// rest of the existing Add/Edit/Delete flow keeps working
		// unchanged - it only ever looks up rows that are visible
		// on the current page anyway.
		// --------------------------------------------------

		setStorageData( arrResultRows, SESSION_OBJECT.RESULT_SUMMARY_DATA );

		showFilteredList( arrResultRows );

		// --------------------------------------------------
		// DASHBOARD QUICK ADD (Priority 2): same mechanism as
		// Student.script.js/parseListResponse() - see the WHY/
		// WHAT/WHEN comment there for the full explanation.
		// Reuses the existing onClickAdd()/Add Result workflow
		// as-is.
		// --------------------------------------------------

		if( sessionStorage.getItem( "DASHBOARD_QUICK_ADD_ACTION" ) == "result" ) {

			sessionStorage.removeItem( "DASHBOARD_QUICK_ADD_ACTION" );


			if( checkRolePermission( SOFTWARE_FEATURE_CONST.ADD_RESULT ) == true ) {

				onClickAdd();
			}
		}
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
	
		if( mInfoIconClicked == false && mEditIconClicked == false && mShareIconClicked == false ) { // CHANGED: also check the new Share flag

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
				// SEARCH DEBOUNCE FIX (this pass): this used to wrap
				// searchList() in its own extra 250ms setTimeout on
				// top of the 250ms debounce searchList() itself already
				// applies below - two stacked debounces meant every
				// keystroke took ~500ms to show results instead of
				// 250ms, and (since the same mSearchDebounceTimer was
				// contended by both timers) an already-fired outer
				// timer's stale id being passed to clearTimeout() was
				// silently harmless but pointless. searchList() already
				// debounces, so this now just calls it directly - one
				// debounce, ~250ms, matching Category/Student.
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

		// PAGINATION FIX (this pass): refresh reloads exactly the
		// page currently on screen (Task 2 - "refresh only current
		// page"), not the whole table.

		getListData( mCurrentPage );

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

		if( mSearchDebounceTimer ) {

			clearTimeout( mSearchDebounceTimer );
		}

		// Project Improvements (this pass): previously filtered only
		// mSelectedDataList (the current page) client-side, resolving
		// Student name/roll number locally. Now that DataService.js's
		// RESULT entity has a searchAction wired to the existing
		// searchResults backend action, this follows the same
		// debounce -> set keyword -> reload page 1 pattern already used
		// by Category.script.js/Student.script.js, so a search actually
		// covers every Result record, not just the ones already loaded.
		// Known limitation: searchResults compares Student as a raw id
		// server-side, so searching "Ram" (the brief's own example)
		// still won't match until Result.gs itself resolves that id to
		// a name.
		mSearchDebounceTimer = setTimeout( function() {

			mCurrentSearchKeyword = document.getElementById( "search" ).value.trim();
			mCurrentPage = 1;

			showLoader( "Searching..." );
			getListData( 1 );

		}, 250 );
	}

	// --------------------------------------------------
	// WHY: the floating download button (#btn_float_next_page,
	// resultList.html) needs a real export to call - no export
	// feature existed anywhere in this file. Same pattern as
	// Student.script.js's exportStudentList() / Category.script.js's
	// exportCategoryList(): builds a CSV from mSelectedDataList,
	// dedupes by Result ID as a safety net, and downloads it
	// through a temporary <a> link.
	// --------------------------------------------------
	function exportResultList() {

		var arrRows = mSelectedDataList;

		if( arrRows == null || arrRows.length == 0 ) {

			CommonUtils.showAlert( "There are no results to export." );
			return;
		}

		var arrUniqueRows = [];
		var objSeenResultIds = {};

		for( var u = 0; u < arrRows.length; u++ ) {

			var resultId = arrRows[ u ][ SUMMARY_INDEX.RESULT_ID ];

			if( objSeenResultIds[ resultId ] === true ) {

				continue; // already exported this Result ID - skip the duplicate
			}

			objSeenResultIds[ resultId ] = true;
			arrUniqueRows.push( arrRows[ u ] );
		}

		arrRows = arrUniqueRows;

		var arrColumns = [
			JSON_KEY.RESULT_ID,
			JSON_KEY.STUDENT_ID,
			JSON_KEY.EXAM_NAME,
			JSON_KEY.SUBJECT,
			JSON_KEY.MARKS_OBTAINED,
			JSON_KEY.GRADE,
			JSON_KEY.RESULT
		];

		var arrIndexes = [
			SUMMARY_INDEX.RESULT_ID,
			SUMMARY_INDEX.STUDENT_ID,
			SUMMARY_INDEX.EXAM_NAME,
			SUMMARY_INDEX.SUBJECT,
			SUMMARY_INDEX.MARKS_OBTAINED,
			SUMMARY_INDEX.GRADE,
			SUMMARY_INDEX.RESULT
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
		elemLink.download = "results_export_" + new Date().toISOString().slice( 0, 10 ) + ".csv";

		if( typeof ActivityLog !== "undefined" ) {

			ActivityLog.logActivity( "Exported Results" );
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
			message = "Result saved successfully.";
			
			resultList.push( result );

			setStorageData( resultList, SESSION_OBJECT.RESULT_SUMMARY_DATA );
			hideLoader();

			getListData();
		}
		else if ( mode == UPDATE_DATA ) {

			var result = getAddEditResultArray( 0 );
			message = "Result updated successfully.";

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
		data[ SUMMARY_INDEX.STUDENT_ID ] = mJsonData[ SUMMARY_JSON_KEY.STUDENT_ID ];
		data[ SUMMARY_INDEX.EXAM_NAME ] = mJsonData[ SUMMARY_JSON_KEY.EXAM_NAME ];
		data[ SUMMARY_INDEX.SUBJECT ] = mJsonData[ SUMMARY_JSON_KEY.SUBJECT ];
		data[ SUMMARY_INDEX.MARKS_OBTAINED ] = mJsonData[ SUMMARY_JSON_KEY.MARKS_OBTAINED ];
		data[ SUMMARY_INDEX.GRADE ] = mJsonData[ SUMMARY_JSON_KEY.GRADE ];
		data[ SUMMARY_INDEX.RESULT ] = mJsonData[ SUMMARY_JSON_KEY.RESULT ];

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

			showOperationMessage( "Result deleted successfully.", "Success", null );
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
		// ('#modal_share_result', always false) instead of the real
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
		mShareIconClicked = false; // ADDED: keep the new flag in sync with the other two
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
		// PROJECT IMPROVEMENTS (Final UX Polish pass - redesigned)
		// --------------------------------------------------
		// WHY: the old card showed the exam name as the title and
		// the (nonexistent) Date Of Exam as the subtitle. Per the
		// request: "the subject should be in the upper side, and
		// then the lower side ... first terminal examination or
		// whatever the examination result is".
		// WHAT: title = Subject, subtitle = Exam name (e.g. "First
		// Term Examination"). A third line adds the Student's name
		// plus a colour-coded Pass/Fail badge with marks/grade, so
		// the card is useful at a glance without opening Info.
		// WHEN: runs once per Result card, every time the list is
		// drawn.
		// --------------------------------------------------

		var subject = data[ SUMMARY_INDEX.SUBJECT ];
		var examName = data[ SUMMARY_INDEX.EXAM_NAME ];
		var marks = data[ SUMMARY_INDEX.MARKS_OBTAINED ];
		var grade = data[ SUMMARY_INDEX.GRADE ];
		var resultStatus = data[ SUMMARY_INDEX.RESULT ];
		var studentId = data[ SUMMARY_INDEX.STUDENT_ID ];
		// PAGINATION FIX: seqNumber is the DISPLAYED row number and must
		// keep counting across pages (page 2 starts at 101, not 1 again).
		// "index" itself stays as the page-local array position, since
		// click handlers above use it to look the row up inside this
		// page's own cached array.
		var seqNumber = ( ( mCurrentPage - 1 ) * mPageSize ) + index + 1 + ') ';

		var studentName = '';
		var studentList = getStorageData( SESSION_OBJECT.STUDENT_LIST );
		if( studentList != null ) {

			for( var s = 0; s < studentList.length; s++ ) {

				if( studentList[ s ][ StudentScript.INDEX.STUDENT_ID ] == studentId ) {

					studentName = studentList[ s ][ StudentScript.INDEX.NAME ] || '';
					break;
				}
			}
		}

		var isPass = ( ( resultStatus || '' ).toString().toLowerCase().indexOf( 'pass' ) === 0 );
		var badgeClass = isPass ? 'badge-success' : 'badge-danger';
		var badgeText = resultStatus ? resultStatus : ( isPass ? 'Pass' : 'Fail' );
		var marksAndGradeHtml = '';
		if( marks !== undefined && marks !== null && marks !== '' ) {
			marksAndGradeHtml += String( marks ) + ( grade ? ' (' + String( grade ) + ')' : '' ) + ' &middot; ';
		}

		// ACCESSIBILITY FIX (this pass): see Student.script.js's
		// createHtmlListItem() for the full WHY.
		var infoIconHtml = '<span class="icon-btn icon-btn-info" role="button" tabindex="0" aria-label="View result details" onclick="ResultScript.getInstance().onClickInfoIcon('+ index +');"><i class="fa fa-info-circle" aria-hidden="true"></i></span>';
		var editIconHtml = '';
		if( checkRolePermission( SOFTWARE_FEATURE_CONST.EDIT_RESULT ) == true ) {

			editIconHtml = '<span class="icon-btn icon-btn-edit" role="button" tabindex="0" aria-label="Edit result" onclick="ResultScript.getInstance().onClickEditIcon('+ index +', event);" style="position:absolute; top:14px; right:14px;"><i class="fas fa-edit"></i></span>';
		}

		// UI/UX POLISH PASS (this pass) - per-card Share button, same
		// pattern as Student.script.js's shareIconHtml/onClickShareIcon().
		var shareIconHtml = '<span class="icon-btn icon-btn-share" role="button" tabindex="0" aria-label="Share result" onclick="ResultScript.getInstance().onClickShareIcon('+ index +', event);" style="position:absolute; top:14px; right:64px;"><i class="fa-solid fa-share-nodes"></i></span>';

		var htmlListItem =  '<ul class="list-dis" id="list_card" onselectstart="return false" style="position:relative;">' +
							editIconHtml +
							shareIconHtml +
							'<div id="list_item" class="list-item">' +
							'<li class="list-card-title">'+ seqNumber + subject + '</li>' +
							'<li class="list-card-subtitle">' + infoIconHtml + '<span>' + examName + ( studentName ? ' &middot; ' + studentName : '' ) + '</span></li>' +
							'<li class="list-card-subtitle"><span>' + marksAndGradeHtml + '<span class="badge ' + badgeClass + '">' + badgeText + '</span></span></li>' +
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
			DB_FIELD.STUDENT_ID + ' INTEGER ,' +
			DB_FIELD.EXAM_NAME + ' TEXT ,' +
			DB_FIELD.SUBJECT + ' TEXT ,' +
			DB_FIELD.MARKS_OBTAINED + ' INTEGER ,' +
			DB_FIELD.GRADE + ' TEXT ,' +
			DB_FIELD.RESULT + ' TEXT' +
			')';

		executeQuery( query, callback );
	}


	function getInsertQuery() {

		var query = 'INSERT INTO ' + TABLE_NAME + '(' +

			DB_FIELD.RESULT_ID + ',' +
			DB_FIELD.STUDENT_ID + ',' +
			DB_FIELD.EXAM_NAME + ',' +
			DB_FIELD.SUBJECT + ',' +
			DB_FIELD.MARKS_OBTAINED + ',' +
			DB_FIELD.GRADE + ',' +
			DB_FIELD.RESULT +
			') VALUES (?, ?, ?, ?, ?, ?, ?)';
		return query;
	}

	function getUpdateQuery() {

		var query = 'UPDATE ' + TABLE_NAME + ' SET ' +
			DB_FIELD.RESULT_ID + '=?, ' +
			DB_FIELD.STUDENT_ID + '=?, ' +
			DB_FIELD.EXAM_NAME + '=?, ' +
			DB_FIELD.SUBJECT + '=?, ' +
			DB_FIELD.MARKS_OBTAINED + '=?, ' +
			DB_FIELD.GRADE + '=?, ' +
			DB_FIELD.RESULT +' =? WHERE ' +
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

		// Phase 6 (Share feature) - same off()/on() binding pattern
		// Student.script.js already uses for its info popup's buttons.
		$( '#share_result_details' ).off().on( 'click', function() {

			shareResultDetails();
		});

		DataService.getRecordById(

			AppConfig.STORES.RESULT,

			getSelectedId(),

			function( objResult ) {

				if( objResult ) {

					parsePreviewResponse( [ objResult ] );
				}
			},

			function( objError ) {

				CommonUtils.logError( "Result.script.js (onInfoViewDocumentReady)", objError );
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
			arrRow[ INDEX.STUDENT_ID ] = objResult.student_id;
			arrRow[ INDEX.EXAM_NAME ] = objResult.exam_name;
			arrRow[ INDEX.SUBJECT ] = objResult.subject;
			arrRow[ INDEX.MARKS_OBTAINED ] = objResult.marks_obtained;
			arrRow[ INDEX.GRADE ] = objResult.grade;
			arrRow[ INDEX.RESULT ] = objResult.result;

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
		mShareIconClicked = false; // ADDED: keep the new flag in sync with the other two
		$(FORM_FIELD_INFO.LBL_RESULT_ID).text( data[INDEX.RESULT_ID] );
		$(FORM_FIELD_INFO.LBL_EXAM_NAME).text( data[INDEX.EXAM_NAME] );
		$(FORM_FIELD_INFO.LBL_SUBJECT).text( data[INDEX.SUBJECT] );
		$(FORM_FIELD_INFO.LBL_MARKS_OBTAINED).text( data[INDEX.MARKS_OBTAINED] );
		$(FORM_FIELD_INFO.LBL_GRADE).text( data[INDEX.GRADE] );
		$(FORM_FIELD_INFO.LBL_RESULT).text( data[INDEX.RESULT] );

		// PROJECT IMPROVEMENTS (added): resolve and show the
		// Student's name, same lookup used by createHtmlListItem().
		var studentName = '';
		var studentList = getStorageData( SESSION_OBJECT.STUDENT_LIST );
		if( studentList != null ) {

			for( var s = 0; s < studentList.length; s++ ) {

				if( studentList[ s ][ StudentScript.INDEX.STUDENT_ID ] == data[INDEX.STUDENT_ID] ) {

					studentName = studentList[ s ][ StudentScript.INDEX.NAME ] || '';
					break;
				}
			}
		}
		if( $(FORM_FIELD_INFO.LBL_STUDENT_NAME).length > 0 ) {

			$(FORM_FIELD_INFO.LBL_STUDENT_NAME).text( studentName );
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

	// Phase 6 (Share feature) - reads the same lbl_* fields the Info
	// popup just populated (setPreview()/parsePreviewResponse() above),
	// same idea as Student.script.js's getStudentDetailsText(), and
	// hands the text to CommonUtils.shareContent() (Web Share API with
	// a copy-to-clipboard fallback).
	function shareResultDetails() {

		var strStudentName = $( FORM_FIELD_INFO.LBL_STUDENT_NAME ).text() || "Result";

		var strDetails =
			"Student: " + $( FORM_FIELD_INFO.LBL_STUDENT_NAME ).text() + "\n" +
			"Exam: " + $( FORM_FIELD_INFO.LBL_EXAM_NAME ).text() + "\n" +
			"Subject: " + $( FORM_FIELD_INFO.LBL_SUBJECT ).text() + "\n" +
			"Marks: " + $( FORM_FIELD_INFO.LBL_MARKS_OBTAINED ).text() + "\n" +
			"Grade: " + $( FORM_FIELD_INFO.LBL_GRADE ).text() + "\n" +
			"Result: " + $( FORM_FIELD_INFO.LBL_RESULT ).text();

		CommonUtils.shareContent( "Result: " + strStudentName, strDetails );
	}

	function doFilterResultList() {

		clearSearch();

		// PAGINATION FIX (this pass): RESULT_SUMMARY_DATA now
		// holds only the currently loaded page (see
		// parseListResponse() above), not the full table, so the
		// "All" filter button simply re-renders that page instead
		// of re-fetching/re-filtering an entire in-memory table.

		var list = getStorageData( SESSION_OBJECT.RESULT_SUMMARY_DATA );

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
	function onClickEditIcon( index, objEvent ) {

		// FIX: stop this click from bubbling up to the card's own
		// delegated click handler ($("#list_id").on("click","ul",...)
		// in onListDocumentReady()), which was opening the "Select
		// an Option" popup right behind this click and made the
		// Edit icon look unclickable / made the icon appear to
		// disappear. Same fix already applied in Student.script.js.
		if( objEvent ) {

			objEvent.stopPropagation();
		}

		mEditIconClicked = true;

		var selectedData = mSelectedDataList[ index ];

		var id = selectedData[ SUMMARY_INDEX.RESULT_ID ];
		sessionStorage.setItem( SESSION_OBJECT.RESULT_ID, id );

		sessionStorage.setItem( SESSION_OBJECT.ADD_EDIT_MODE, UPDATE_DATA );
		$('#edit_details_title').text( 'Edit Result' );
		openEditDetailsPopup();
		onAddEditDocumentReady();
	}

	// UI/UX POLISH PASS (this pass) - per-card Share button, same
	// pattern as Student.script.js's onClickShareIcon().
	function onClickShareIcon( index, objEvent ) {

		// FIX: stop this click from bubbling up to the card's own
		// delegated click handler, same reasoning as onClickEditIcon()
		// above.
		if( objEvent ) {

			objEvent.stopPropagation();
		}

		// ADDED: stops onSingleClickListener() from also opening the
		// Select Option popup right after this Share tap. Share has
		// no popup-close event to reset this on (unlike Edit/Info),
		// so it is cleared again on the very next tick - just long
		// enough to suppress the one delegated click that bubbles up
		// from this same tap. Same fix as Student.script.js.
		mShareIconClicked = true;
		setTimeout( function() { mShareIconClicked = false; }, 0 );

		var selectedData = mSelectedDataList[ index ];

		if( !selectedData ) {

			return;
		}

		var strSubject = selectedData[ SUMMARY_INDEX.SUBJECT ] || "Result";
		var strExamName = selectedData[ SUMMARY_INDEX.EXAM_NAME ] || "";
		var strMarks = selectedData[ SUMMARY_INDEX.MARKS_OBTAINED ] || "";
		var strGrade = selectedData[ SUMMARY_INDEX.GRADE ] || "";
		var strResult = selectedData[ SUMMARY_INDEX.RESULT ] || "";

		var strDetails =
			"Subject: " + strSubject + "\n" +
			( strExamName ? ( "Exam: " + strExamName + "\n" ) : "" ) +
			( strMarks ? ( "Marks: " + strMarks + ( strGrade ? ( " (" + strGrade + ")" ) : "" ) + "\n" ) : "" ) +
			( strResult ? ( "Result: " + strResult ) : "" );

		CommonUtils.shareContent( "Result: " + strSubject, strDetails );
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

		// PHASE 12 (code quality) - CODE QUALITY / BUG FIX (this
		// pass): same commented-out stub bug as Student.script.js's
		// getFormattedData() - always returned "". Filled in using
		// this entity's own real SUMMARY_INDEX fields.
		var resultText = "";

		var strExamName = selectedData[ SUMMARY_INDEX.EXAM_NAME ] || "";
		var strSubject = selectedData[ SUMMARY_INDEX.SUBJECT ] || "";
		var strMarks = selectedData[ SUMMARY_INDEX.MARKS_OBTAINED ] || "";
		var strGrade = selectedData[ SUMMARY_INDEX.GRADE ] || "";
		var strResult = selectedData[ SUMMARY_INDEX.RESULT ] || "";

		if( mShareMode == MODE_SHARE_EMAIL ){ // Share by EMAIL

			resultText += seqNumber + ") " + strExamName + " - " + strSubject + "<br>";
			resultText += "Marks: " + strMarks + " | Grade: " + strGrade + " | Result: " + strResult + "<br><br>";
		}
		else { // Share by WhatsApp

			resultText += "_*" + seqNumber + ") " + strExamName + " - " + strSubject + "*_\n";
			resultText += "Marks: *" + strMarks + "* | Grade: *" + strGrade + "* | Result: *" + strResult + "*\n\n";
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
})();screenLeft