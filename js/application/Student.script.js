////////////////////////////////////////////////////////////////////////////

// FileName Student.script.js: Student Javascript file for Cordova project

// Author : JRC
// Description : codegen


////////////////////////////////////////////////////////////////////////////

/******************************************************************************
Project Improvements

Changes:
1. Fixed Save button staying hidden after opening Edit (popUpEditForm).
2. Fixed Save button staying hidden after opening Add with no cached
   auto-fill data (setFormDefaults).
3. Made the change/keyup Save-button bindings explicit instead of
   relying on an Event object happening to not equal false.
4. Added Copy student details button to the Info popup
   (copyStudentDetails(), bound in onInfoViewDocumentReady()).
5. Fixed singular/plural grammar: delete success message and
   Share confirmation/subject used a literal "Student(s)" and
   a mismatched verb regardless of how many were selected -
   now says "Student"/"has" for one, "Students"/"have" for
   more than one.
6. Fixed Info popup header (#lbl_first_name / #lbl_last_name)
   always being blank - nothing populated it before. Now
   filled from the existing Name field, split into a first/
   last display only (no change to the underlying single-
   Name data model).
7. Student List search overhaul (searchList()):
   - Previously only read the first <li> of each rendered card
     (the Name column) straight from the DOM, so Roll Number,
     Mobile, Email, Parent Mobile, Parent Email, Telegram,
     Category and Section were never actually searchable even
     though the search box implied otherwise.
   - Now builds a per-row searchable string straight from
     mSelectedDataList (the same data already used to render
     the list), covering Student ID, Name, Roll Number,
     Mobile, Email, Parent Mobile, Parent Email and Telegram,
     plus Category/Section *names* resolved from their IDs via
     the CATEGORY_LIST/SECTION_LIST already cached in storage
     (so typing "10A" now matches a Section named "10A").
   - mSearchList (used by multi-select to map a visible row
     back to its full data) is now reset at the start of every
     search instead of growing forever on each keystroke, which
     was silently corrupting that mapping the longer a user
     kept typing.
   - Live filter-as-you-type was already wired via oninput; no
     change there. No new UI, no new endpoint.
8. Export duplicate-rows safety net (exportStudentList()):
   traced the full data pipeline feeding mSelectedDataList and
   found no repeated-append bug in this file - every stage
   already rebuilds the array fresh. Added a dedupe-by-
   Student-ID pass before building the CSV anyway, matching the
   brief's explicit "export unique rows" requirement, so a
   duplicate Student ID reaching the export (from any future
   upstream issue) can never produce repeated rows in the file.
9. Student Details popup now shows the actual Category/Section
   *name* instead of the raw numeric category_id/section_id
   (setPreview(), new getCategoryNameById()/getSectionNameById()
   helpers) - resolved from the same CATEGORY_LIST/SECTION_LIST
   already cached in storage, same lookup approach searchList()
   already uses.
10. Final QA pass - console cleanup: removed leftover debug
    console.log() calls (form-data dumps, TBD stub messages,
    commented-out file-picker logs, etc.) and replaced every
    console.log(objError) inside a catch block with
    CommonUtils.logError("Student.script.js (<function>)",
    objError), matching the same pattern already used in
    common.js/DataService.js. No behavior changed - errors are
    still logged, just through the shared utility instead of a
    bare console.log. The two "Multiple selection option
    1/2: TBD" stubs were left as // TODO comments instead of
    being silently removed, since those two menu options are
    genuinely unimplemented, not just noisy logging.
11. Final QA pass - fixed a broken Back-button/reset check: the
    Back-button handler and resetMultiSelection() both tested
    for the Share modal being open using ids that don't exist
    anywhere in the DOM ("modal_share_question",
    "modal_share_student"), so those checks were always false.
    The real share modal's id is "modal_share" (see shareMenu
    template in StudentHTML.script.js) - both checks now use
    that instead, so pressing Back while the Share modal is open
    correctly closes it instead of falling through to the
    double-back-press "press again to exit" logic.
12. Student "+" Add button fix (Priority 3): the per-Student
    select menu (listenersSingleClickModal(), opened only after
    a Student row is tapped) had its own "#student_add" entry
    sitting alongside that Student's Info/Edit/Delete actions,
    making Add look tied to whichever Student was selected. That
    entry is no longer wired up as a second Add trigger. Add New
    Student now has exactly one entry point - the floating
    "#btn_add" button on the Student List page itself
    (onListDocumentReady()) - which already always opened a
    blank Add form regardless of selection (onClickAdd() forces
    ADD_EDIT_MODE = INSERT_DATA, which always calls
    popUpAddForm(), never getData()/getSelectedData()) and now
    also explicitly clears any stale selected-student id
    (SESSION_OBJECT.STUDENT_ID) the moment it's clicked, plus a
    "Add New Student" tooltip. No new Add/Edit/Delete logic -
    the existing onClickAdd()/Add Student workflow is reused
    unchanged.
13. Pagination / Loading Performance pass:
    - ROOT CAUSE (real bug, not just missing 100/page): getListData()
      already called DataService.getRecordsPage() for one page at
      a time, but parseListResponse() was declared as
      parseListResponse(arrStudents) and treated the returned
      { records, totalRecords, totalPages, page, pageSize } object
      as if it WERE the bare records array. arrStudents.length was
      undefined, so the row-building loop never ran, and
      mCurrentPage/mTotalPages/mTotalRecords were never updated
      past their initial 1/1/0. There was also no Prev/Next control
      anywhere on this page. Net effect: paging past the first
      screen was impossible no matter how many Students existed.
    - FIX: parseListResponse(objPageResult) now reads
      objPageResult.records and updates mCurrentPage/mTotalPages/
      mTotalRecords correctly. showFilteredList() now appends a
      Prev/Next pagination bar (buildPaginationBarHtml()/
      bindPaginationBarListeners(), same pattern as
      Category.script.js) and shows the real backend-reported
      total instead of comparing against a stale stored count.
    - mPageSize was already 100 (this file was the reference
      Category.script.js/Section.script.js/Result.script.js were
      brought in line with).
    - Search: unchanged - still instant, client-side, current-page
      only (there is no searchStudents backend action); no
      debounce was needed since it's pure DOM filtering with no
      network call.
    - Lookup caching (Category/Section dropdown data): no change
      needed here - see DataService.js's getAllRecords() cache,
      used automatically by this file's existing
      DataService.getAllRecords(CATEGORY/SECTION, ...) calls.

Architecture:
- No architecture changes.
- No file renaming.
- No folder changes.
- Existing APIs preserved.
******************************************************************************/

/* ----------------------------------------------------------
   UI Modernization Pass 2 (added)
   ----------------------------------------------------------
   showFilteredList() now shows a shared empty-state message when a search/filter returns zero students
   instead of leaving the list area blank, via
   CommonUtils.getEmptyStateHtml(). No existing function
   removed or renamed; architecture unchanged.
   ---------------------------------------------------------- */

/*/* ==========================================================
   PWA Migration Notes
   Student.script.js
   ----------------------------------------------------------

   ==========================================================
   CHANGE LOG - CacheManagerScript Removal Pass
   ==========================================================

   Purpose
       Student List page never fetched student data. Root
       cause: onListDocumentReady() -> onLoadCacheManager()
       -> loadCategoryList() called
       CacheManagerScript.getInstance(), and CacheManagerScript
       does not exist anywhere in this project (confirmed by
       project-wide search - it was only ever referenced here,
       never defined). This threw "CacheManagerScript is not
       defined" synchronously, which stopped loadSectionList()
       and getListData() - the function that actually asks
       DataService for the student list - from ever running.
       Every other DataService/backend fix made so far never
       had a chance to run on this page because of this earlier
       crash.

   Functions changed (internals only, names/signatures/order
   unchanged)
       onLoadCacheManager()  - unchanged, still just calls
                                loadCategoryList()
       loadCategoryList()    - now calls
                                DataService.getAllRecords(
                                AppConfig.STORES.CATEGORY, ...)
                                instead of CacheManagerScript,
                                converts each record into the
                                [ id, name, organizationId ]
                                row shape CategoryScript.INDEX /
                                populateSelection() already
                                expect, caches it with the
                                existing setCategoryListData(),
                                then calls loadSectionList() -
                                same chain as before
       loadSectionList()     - same fix as loadCategoryList(),
                                for AppConfig.STORES.SECTION /
                                SectionScript.INDEX, then calls
                                getListData() - same chain as
                                before

   Functions removed
       none

   Functions added
       none (no new abstractions - loadCategoryList() and
       loadSectionList() were reimplemented in place)

   Backend fixes
       Category/Section lookup lists used by the Add/Edit
       Student form's dropdowns now come from the real Google
       Apps Script backend (via DataService), not an undefined
       object.

   Button fixes
       "Add Student" and "Edit Student" no longer land on a
       page that already crashed on load - the Category and
       Section dropdowns inside that form now populate with
       live data.

   Navigation / Storage fixes
       studentList.html now also loads Category.script.js and
       Section.script.js (both are self-contained singletons
       with no page-specific auto-run code - safe to include on
       any page) so CategoryScript.getInstance() and
       SectionScript.getInstance() - already called elsewhere in
       this file, e.g. setCategorySelection() - actually exist
       when this page calls them.

   Remaining TODOs
       If a Category or Section fails to load (offline / bad
       response), this pass logs the error and continues with
       an empty list rather than blocking the Student list from
       loading - the dropdown will just show "Select Category" /
       "Select Section" with no options until it succeeds again.
   ----------------------------------------------------------

   Purpose

   Migrated Student.script.js from the legacy
   Cordova/SQLite architecture to the PWA
   DataService/StorageService architecture while
   preserving the original project structure.

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

   Removed legacy data-fetch functions

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
   referenced by the existing file-upload feature and will
   be migrated separately.

       onConfirmNetworkSaveData()
       uploadDocuments()
       onErrorInsertUpdate()
       parseSaveErrorDataResponse()

   The following legacy functions are still required by the
   current application bootstrap or public API.

       getInsertQuery()
       getUpdateQuery()
       createTableStudent()

   ----------------------------------------------------------
   Architecture preserved
   ----------------------------------------------------------

   • Original file structure preserved.
   • Original function names preserved.
   • Original event bindings preserved.
   • Only internal implementations replaced.
   • No unnecessary helper functions introduced.

   ----------------------------------------------------------
   Coding standards
   ----------------------------------------------------------

   • Hungarian notation retained.
   • Existing function order maintained.
   • Scoped changes only.
   • WHY / WHAT / WHEN comments added for migrated code.

   ----------------------------------------------------------
   Additional fixes
   ----------------------------------------------------------

   Corrected the preview-data storage key so both preview
   and edit operations now consistently use

       SESSION_OBJECT.STUDENT_DATA

   ========================================================== */

////////////////////////////////////////////////////////////////////////////



var StudentScript = (function () {
	// Check whether the Multiple selection is active or not
	var mMultiSelect = false;

	// Manage List multiple selection
	var mMultiSelectedList = [];
	// Manage search list
	var mSearchList = [];

	// Instance stores a reference to the Singleton
	var instance;

	//Url
	var URL = "/StudentDataHandler";
	var URL_SUMMARY = "/SummaryList";
	var mJsonData = null; // JSON data used for Add/Edit
	var mSelectedIdList = []; // List of IDs of the selected items

	// We can Enable/Disable Multiple selection by using it
	// true: Enable multiple selection, false: Disable multiple selection 
	var mEnableMultiSelection = true;


	// Save the Filtered main list
	var mSelectedDataList = [];

	// --------------------------------------------------
	// Real pagination state (100 students per page, per request).
	// Same pattern as Category.script.js - see the WHY/WHAT there
	// for the full explanation. getListData()/parseListResponse()
	// below ask the backend for exactly one page at a time instead
	// of the entire Students table.
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

	// BUG FIX (this pass) - Share icon: the per-card top Share
	// button (onClickShareIcon() below) had no equivalent flag,
	// so tapping it fell through to onSingleClickListener()'s
	// guard below (which only checked Info/Edit), opening the
	// per-card Select Option popup right on top of/after the
	// Share action - making the top Share icon look broken even
	// though its own click handler did run. Same flag/guard/reset
	// pattern as mInfoIconClicked/mEditIconClicked, just for Share.
	var mShareIconClicked = false;

	var mImageClosed = false;	// Indicates whether the image is removed or not while updating
	var mFileClosed = false;	// Indicates whether the File is removed or not while updating
	var TABLE_NAME = "student";
	//--------------Table row index:-----------------

	var value = 0;

	var INDEX = {
		STUDENT_ID : value++,		// 1
		CATEGORY_ID : value++,		// 2
		SECTION_ID : value++,		// 3
		NAME : value++,		// 4
		ROLL_NUMBER : value++,		// 5
		MOBILE : value++,		// 6
		EMAIL : value++,		// 7
		PARENT_MOBILE : value++,		// 8
		TELEGRAM : value++,		// 9
		PARENT_EMAIL : value++,		// 10		// 10
	};

	//--------------Summary row index:-----------------

	value = 0;

	var SUMMARY_INDEX = {
		STUDENT_ID : value++,		// 1
		CATEGORY_ID : value++,		// 2
		SECTION_ID : value++,		// 3
		NAME : value++,		// 4
		ROLL_NUMBER : value++,		// 5
		MOBILE : value++,		// 6
		EMAIL : value++,		// 7
		PARENT_MOBILE : value++,		// 8
		TELEGRAM : value++,		// 9
		PARENT_EMAIL : value++,		// 10		// 10
	};

	//-------------Table Header Label----------------------

	var LABEL = {

		STUDENT_ID : "Student",
		CATEGORY_ID : "Category",
		SECTION_ID : "Section",
		NAME : "Name",
		ROLL_NUMBER : "Roll Number",
		MOBILE : "Mobile",
		EMAIL : "Email",
		PARENT_MOBILE : "Parent Mobile",
		TELEGRAM : "Telegram",
		PARENT_EMAIL : "Parent Email"
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

		STUDENT_ID : 0,
		CATEGORY_ID : 0,
		SECTION_ID : 0,
		NAME : "",
		ROLL_NUMBER : "",
		MOBILE : "",
		EMAIL : "",
		PARENT_MOBILE : "",
		TELEGRAM : "",
		PARENT_EMAIL : ""
	};

	//-----------------------------Form Elements------------------------------------
	var FORM_FIELD = {

		STUDENT_ID : '#student_id',
		CATEGORY_ID : '#category_id',
		SECTION_ID : '#section_id',
		NAME : '#name',
		ROLL_NUMBER : '#roll_number',
		MOBILE : '#mobile',
		EMAIL : '#email',
		PARENT_MOBILE : '#parent_mobile',
		TELEGRAM : '#telegram',
		PARENT_EMAIL : '#parent_email',
		DOCUMENT_DIV : '#file_div',
		DOCUMENTS_PATH : '#file_id',
		PHOTO_DIV : '#image_div',
		PHOTO_PATH: '#image_id'

	};

	var FORM_FIELD_INFO = { 		// For Show Info Screen

		// MENTOR NOTE (added): the popup header (large bold name at
		// the top of the Student Info card) uses these two ids, but
		// nothing ever populated them - see setPreview() below.
		LBL_FIRST_NAME : '#lbl_first_name',
		LBL_LAST_NAME : '#lbl_last_name',

		LBL_STUDENT_ID : '#lbl_student_id',
		LBL_CATEGORY_ID : '#lbl_category_id',
		LBL_SECTION_ID : '#lbl_section_id',
		LBL_NAME : '#lbl_name',
		LBL_ROLL_NUMBER : '#lbl_roll_number',
		LBL_MOBILE : '#lbl_mobile',
		LBL_EMAIL : '#lbl_email',
		LBL_PARENT_MOBILE : '#lbl_parent_mobile',
		LBL_TELEGRAM : '#lbl_telegram',
		LBL_PARENT_EMAIL : '#lbl_parent_email'
	};

	//-----------------------------JSON Key------------------------------------
	var JSON_KEY = {

		STUDENT_ID : "student_id",
		CATEGORY_ID : "category_id",
		SECTION_ID : "section_id",
		NAME : "name",
		ROLL_NUMBER : "roll_number",
		MOBILE : "mobile",
		EMAIL : "email",
		PARENT_MOBILE : "parent_mobile",
		TELEGRAM : "telegram",
		PARENT_EMAIL : "parent_email"
	};

	//-----------------------------SUMMARY JSON Key------------------------------------
	var SUMMARY_JSON_KEY = {

		STUDENT_ID : "student_id",
		CATEGORY_ID : "category_id",
		SECTION_ID : "section_id",
		NAME : "name",
		ROLL_NUMBER : "roll_number",
		MOBILE : "mobile",
		EMAIL : "email",
		PARENT_MOBILE : "parent_mobile",
		TELEGRAM : "telegram",
		PARENT_EMAIL : "parent_email"
	};

	//-----------------------------DB Table Fields------------------------------------
	var DB_FIELD = {

		STUDENT_ID : "student_id",
		CATEGORY_ID : "category_id",
		SECTION_ID : "section_id",
		NAME : "name",
		ROLL_NUMBER : "roll_number",
		MOBILE : "mobile",
		EMAIL : "email",
		PARENT_MOBILE : "parent_mobile",
		TELEGRAM : "telegram",
		PARENT_EMAIL : "parent_email"
	};
	//------------------------------SESSION OBJECT--------------------------------------
	var SESSION_OBJECT = {

		STUDENT_ID: "STUDENT_ID",
		ADD_EDIT_MODE: "ADD_EDIT_MODE",
		STUDENT_DATA: "STUDENT_DATA",
		STUDENT_SUMMARY_DATA: "STUDENT_SUMMARY_DATA",
		CATEGORY_LIST: "CATEGORY_LIST",
		CATEGORY_ID: "CATEGORY_ID",
		SECTION_LIST: "SECTION_LIST",
		SECTION_ID: "SECTION_ID"
	}

	function setCategoryListData( categoryList ){

		setStorageData( categoryList, SESSION_OBJECT.CATEGORY_LIST );
	}


	function setSectionListData( sectionList ){

		setStorageData( sectionList, SESSION_OBJECT.SECTION_LIST );
	}

	// Clear all the data which used to store in the session on click backbutton and goback from the list
	function clearStorage(){

		clearSessionStorage( SESSION_OBJECT.ADD_EDIT_MODE );
		clearSessionStorage( SESSION_OBJECT.STUDENT_DATA );
		clearSessionStorage( SESSION_OBJECT.STUDENT_SUMMARY_DATA );

		clearSessionStorage( SESSION_OBJECT.STUDENT_ID );


		clearSessionStorage( SESSION_OBJECT.CATEGORY_LIST );
		clearSessionStorage( SESSION_OBJECT.CATEGORY_ID );


		clearSessionStorage( SESSION_OBJECT.SECTION_LIST );
		clearSessionStorage( SESSION_OBJECT.SECTION_ID );


	}

	// get Student data from the storage : we can retrieve data using the key which we used to store the data
	// getStorageData(SESSION_OBJECT.STUDENT_DATA)

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

	// set Student data into the storage : we can set the data using a key and the same key we should use for retriving the data
	// setStorageData(jsonData, SESSION_OBJECT.STUDENT_DATA)
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

/* Enable as per requirement */
		// bValid = bValid && fv.checkEmpty($(FORM_FIELD.STUDENT_ID), G_ERROR.MSG.empty_error+LABEL.STUDENT_ID);
		// bValid = bValid && fv.checkEmptySelect($(FORM_FIELD.CATEGORY_ID), G_ERROR.MSG.empty_error_selectbox+LABEL.CATEGORY_ID);
		// bValid = bValid && fv.checkEmptySelect($(FORM_FIELD.SECTION_ID), G_ERROR.MSG.empty_error_selectbox+LABEL.SECTION_ID);
		// bValid = bValid && fv.checkEmpty($(FORM_FIELD.NAME), G_ERROR.MSG.empty_error+LABEL.NAME);
		// bValid = bValid && fv.checkEmpty($(FORM_FIELD.ROLL_NUMBER), G_ERROR.MSG.empty_error+LABEL.ROLL_NUMBER);
		// bValid = bValid && fv.checkEmpty($(FORM_FIELD.MOBILE), G_ERROR.MSG.empty_error+LABEL.MOBILE);
		// bValid = bValid && fv.validateMobileNo( $(FORM_FIELD.MOBILE), country_code, noOfDigits, /*LABEL.MOBILE+*/ G_ERROR.MSG.invalid_mobile_no);
		// bValid = bValid && fv.checkEmpty($(FORM_FIELD.EMAIL), G_ERROR.MSG.empty_error+LABEL.EMAIL);
		// bValid = bValid && fv.checkEmail($(FORM_FIELD.EMAIL), /*LABEL.EMAIL+*/ G_ERROR.MSG.invalid_emailid_error);
		// bValid = bValid && fv.checkEmpty($(FORM_FIELD.PARENT_MOBILE), G_ERROR.MSG.empty_error+LABEL.PARENT_MOBILE);
		// bValid = bValid && fv.validateMobileNo( $(FORM_FIELD.PARENT_MOBILE), country_code, noOfDigits, /*LABEL.PARENT_MOBILE+*/ G_ERROR.MSG.invalid_mobile_no);
		// bValid = bValid && fv.checkEmpty($(FORM_FIELD.TELEGRAM), G_ERROR.MSG.empty_error+LABEL.TELEGRAM);
		// bValid = bValid && fv.checkEmpty($(FORM_FIELD.PARENT_EMAIL), G_ERROR.MSG.empty_error+LABEL.PARENT_EMAIL);
		// bValid = bValid && fv.checkEmail($(FORM_FIELD.PARENT_EMAIL), /*LABEL.PARENT_EMAIL+*/ G_ERROR.MSG.invalid_emailid_error);

		return bValid;
	}
	function setFormDefaults( studentId ) {
		$(FORM_FIELD.STUDENT_ID).val(studentId);
		var categoryList = getStorageData(SESSION_OBJECT.CATEGORY_LIST);
		setCategorySelection( categoryList );
		var sectionList = getStorageData(SESSION_OBJECT.SECTION_LIST);
		setSectionSelection( sectionList );
		$(FORM_FIELD.NAME).val(DEFAULT.NAME);
		$(FORM_FIELD.ROLL_NUMBER).val(DEFAULT.ROLL_NUMBER);
		$(FORM_FIELD.MOBILE).val(DEFAULT.MOBILE);
		$(FORM_FIELD.EMAIL).val(DEFAULT.EMAIL);
		$(FORM_FIELD.PARENT_MOBILE).val(DEFAULT.PARENT_MOBILE);
		$(FORM_FIELD.TELEGRAM).val(DEFAULT.TELEGRAM);
		$(FORM_FIELD.PARENT_EMAIL).val(DEFAULT.PARENT_EMAIL);

		/**
		 * BUG FIX - Save button stayed hidden on Add
		 *
		 * Same root cause as the Edit form (see popUpEditForm()):
		 * setCategorySelection()/setSectionSelection() above hide
		 * Save while their dropdowns load, and nothing turned it
		 * back on once the defaults finished loading. Explicitly
		 * showing it here means a new Student can be saved with
		 * the defaults as-is, instead of Save staying invisible
		 * until the user happens to type into a field.
		 */
		enableSaveButton( true );

		$( FORM_FIELD.DOCUMENT_DIV ).hide();
		$( FORM_FIELD.DOCUMENTS_PATH ).text("");
		$( FORM_FIELD.PHOTO_DIV ).hide();
		$( FORM_FIELD.PHOTO_PATH ).removeAttr( 'src' );

		setTimeout( function(){ 

			var errorHandlerScript = ErrorHandlerScript.getInstance();
			errorHandlerScript.getAutoFillErrorData( "Student", parseErrorDataResponse );
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

		setStorageData( data, SESSION_OBJECT.STUDENT_ERROR_DATA );
	}
	function populateFromLocalStorage( data ){
		$( FORM_FIELD.STUDENT_ID ).val( data[ INDEX.STUDENT_ID ] );
		$( FORM_FIELD.CATEGORY_ID ).val( data[ INDEX.CATEGORY_ID ] ).change();
		$( FORM_FIELD.SECTION_ID ).val( data[ INDEX.SECTION_ID ] ).change();
		$( FORM_FIELD.NAME ).val( data[ INDEX.NAME ] );
		$( FORM_FIELD.ROLL_NUMBER ).val( data[ INDEX.ROLL_NUMBER ] );
		$( FORM_FIELD.MOBILE ).val( data[ INDEX.MOBILE ] );
		$( FORM_FIELD.EMAIL ).val( data[ INDEX.EMAIL ] );
		$( FORM_FIELD.PARENT_MOBILE ).val( data[ INDEX.PARENT_MOBILE ] );
		$( FORM_FIELD.TELEGRAM ).val( data[ INDEX.TELEGRAM ] );
		$( FORM_FIELD.PARENT_EMAIL ).val( data[ INDEX.PARENT_EMAIL ] );

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

			loadAddFormData( DEFAULT.STUDENT_ID );
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

		$(FORM_FIELD.STUDENT_ID).val(data[INDEX.STUDENT_ID]);
		var categoryList = getStorageData(SESSION_OBJECT.CATEGORY_LIST);
		setCategorySelection( categoryList );
		var sectionList = getStorageData(SESSION_OBJECT.SECTION_LIST);
		setSectionSelection( sectionList );
		$(FORM_FIELD.NAME).val(data[INDEX.NAME]);
		$(FORM_FIELD.ROLL_NUMBER).val(data[INDEX.ROLL_NUMBER]);
		$(FORM_FIELD.MOBILE).val(data[INDEX.MOBILE]);
		$(FORM_FIELD.EMAIL).val(data[INDEX.EMAIL]);
		$(FORM_FIELD.PARENT_MOBILE).val(data[INDEX.PARENT_MOBILE]);
		$(FORM_FIELD.TELEGRAM).val(data[INDEX.TELEGRAM]);
		$(FORM_FIELD.PARENT_EMAIL).val(data[INDEX.PARENT_EMAIL]);

		setDocsImages( data );

		/**
		 * BUG FIX - Save button stayed hidden on Edit
		 *
		 * Why: setCategorySelection() and setSectionSelection()
		 * above both hide the Save button while their dropdowns
		 * load, which is correct. But nothing turned it back on
		 * once the Edit form had finished loading, so opening
		 * Edit without changing any field left Save permanently
		 * hidden - it only reappeared if the user happened to
		 * type into a field (see bindFormEventHandlers()).
		 *
		 * What: explicitly show Save now that the form is fully
		 * populated, the same way populateFromLocalStorage()
		 * already does after its own load.
		 */
		enableSaveButton( true );
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
		jsonData[ JSON_KEY.STUDENT_ID ] = ( $(FORM_FIELD.STUDENT_ID).val() );
		jsonData[ JSON_KEY.CATEGORY_ID ] = ( $(FORM_FIELD.CATEGORY_ID).val() );
		jsonData[ JSON_KEY.SECTION_ID ] = ( $(FORM_FIELD.SECTION_ID).val() );
		jsonData[ JSON_KEY.NAME ] = ( $(FORM_FIELD.NAME).val() );
		jsonData[ JSON_KEY.ROLL_NUMBER ] = ( $(FORM_FIELD.ROLL_NUMBER).val() );
		jsonData[ JSON_KEY.MOBILE ] = ( $(FORM_FIELD.MOBILE).val() );
		jsonData[ JSON_KEY.EMAIL ] = ( $(FORM_FIELD.EMAIL).val() );
		jsonData[ JSON_KEY.PARENT_MOBILE ] = ( $(FORM_FIELD.PARENT_MOBILE).val() );
		jsonData[ JSON_KEY.TELEGRAM ] = ( $(FORM_FIELD.TELEGRAM).val() );
		jsonData[ JSON_KEY.PARENT_EMAIL ] = ( $(FORM_FIELD.PARENT_EMAIL).val() );

/*
		// used for file upload
		jsonData[ "organization_short_name" ] = getOrgShortName();
*/


		if( mode == UPDATE_DATA ) { // Edit/Update

			var data = getSelectedData();

			jsonData[ JSON_KEY.STUDENT_ID ] = data[ INDEX.STUDENT_ID ];
			jsonData[ JSON_KEY.CATEGORY_ID ] = data[ INDEX.CATEGORY_ID ];
			jsonData[ JSON_KEY.SECTION_ID ] = data[ INDEX.SECTION_ID ];
			jsonData[ JSON_KEY.NAME ] = data[ INDEX.NAME ];
			jsonData[ JSON_KEY.ROLL_NUMBER ] = data[ INDEX.ROLL_NUMBER ];
			jsonData[ JSON_KEY.MOBILE ] = data[ INDEX.MOBILE ];
			jsonData[ JSON_KEY.EMAIL ] = data[ INDEX.EMAIL ];
			jsonData[ JSON_KEY.PARENT_MOBILE ] = data[ INDEX.PARENT_MOBILE ];
			jsonData[ JSON_KEY.TELEGRAM ] = data[ INDEX.TELEGRAM ];
			jsonData[ JSON_KEY.PARENT_EMAIL ] = data[ INDEX.PARENT_EMAIL ];

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

		return jsonData;
	}

	// NOTE: onConfirmNetworkSaveData(), onErrorInsertUpdate(),
	// parseSaveErrorDataResponse(), and uploadDocuments() below still
	// call functions that do not exist anywhere in this PWA
	// (serverInsertUpdate, ErrorHandlerScript, showAlertDialog,
	// uploadFile). Restored exactly as originally written rather than
	// deleted, because StudentHTML.script.js's onFileUploadSuccess()
	// still calls onConfirmNetworkSaveData() and uploadDocuments()
	// directly, and both are still listed in this file's public API
	// object further down - removing them breaks that caller. Not
	// migrated in this pass; see chat for how to proceed.
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
		errorHandlerScript.saveErrorData( "Student", url, jsonData, description, logData, flag, parseSaveErrorDataResponse );
	}

	function parseSaveErrorDataResponse( response, mode ) {

		var message = "Failed to connect to " + APP_NAME + " server.\nPlease check your internet connection and try to save the data again.";
		showAlertDialog( message, gotoLogin, title, buttonStr );
	}

	function uploadDocuments(){

		window.FilePath.resolveNativePath( mFile.uri, successNative, failNative );

		function failNative(e) {
		  console.error( 'ResolveNativePath: Error for ' + mFile.uri );
		}
	
		function successNative( finalPath ) {
	
		  uploadFile( mFile.name, mFile.mediaType, finalPath, onFileUploadSuccess, TYPE_UPLOAD_FILES );
		}
	}

	function onConfirmSaveFormData() {

		// --------------------------------------------------
		// WHY: This is the real Save entry point used by the
		// Add/Edit Student form. Previously, this function's
		// SQLite path and raw network path (serverInsertUpdate,
		// insert, update) called functions that no longer exist
		// in this PWA.
		// DataService now decides on its own whether the
		// record goes to Google Apps Script, IndexedDB, or
		// the offline queue, so there is only one path left.
		// WHAT: builds the record from the form and asks
		// DataService to add or update it, depending on mode.
		// WHEN: runs when the user confirms Save on the
		// Add/Edit Student form.
		// --------------------------------------------------

		var mode = getAddEditMode();

		mJsonData = getFormDataAsJson( mode );

		showLoader( "Please wait...", "Fetching data..." );

		if( mode == INSERT_DATA ) {

			DataService.addRecord(

				AppConfig.STORES.STUDENT,

				mJsonData,

				function( objSavedStudent ) {

					parseInsertUpdateResponse( objSavedStudent, mode );
				},

				function( objError ) {

					CommonUtils.logError( "Student.script.js (onConfirmSaveFormData)", objError );
					hideLoader();
					CommonUtils.showAlert( "Unable to save Student." );
				}
			);
		}
		else if( mode == UPDATE_DATA ) {

			DataService.updateRecord(

				AppConfig.STORES.STUDENT,

				mJsonData,

				function( objSavedStudent ) {

					parseInsertUpdateResponse( objSavedStudent, mode );
				},

				function( objError ) {

					CommonUtils.logError( "Student.script.js (onConfirmSaveFormData)", objError );
					hideLoader();
					CommonUtils.showAlert( "Unable to save Student." );
				}
			);
		}
		else {

			CommonUtils.logError( "Student.script.js (onConfirmSaveFormData)", "Invalid mode passed, mode = " + mode );
			return false;
		}
	}

	function saveFormData( buttonIndex ) {

		if( buttonIndex == BUTTON_CANCEL ) { // Cancel alert dialog
			// To do Something
		} 
		else if( buttonIndex == BUTTON_CONFIRM ) { // Confirm

			onConfirmSaveFormData();
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
		// WHAT: deletes each selected Student through
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

				AppConfig.STORES.STUDENT,

				deleteDataArray[ numIndex ],

				function() {

					deleteNextRow( numIndex + 1 );
				},

				function( objError ) {

					CommonUtils.logError( "Student.script.js (deleteNextRow)", objError );
					hideLoader();
					CommonUtils.showAlert( "Unable to delete Student." );
					return;
				}
			);
		}
	}

	function parseFormDataResponse( studentList ) {

		var arrStudentRows = [];

		for( var i = 0; i < studentList.length; i++ ) {

			var objStudent = studentList[ i ];

			var arrRow = [];
			arrRow[ INDEX.STUDENT_ID ] = objStudent.student_id;
			arrRow[ INDEX.CATEGORY_ID ] = objStudent.category_id;
			arrRow[ INDEX.SECTION_ID ] = objStudent.section_id;
			arrRow[ INDEX.NAME ] = objStudent.name;
			arrRow[ INDEX.MOBILE ] = objStudent.mobile;
			arrRow[ INDEX.EMAIL ] = objStudent.email;
			arrRow[ INDEX.TELEGRAM ] = objStudent.telegram;
			// NOTE: roll_number, parent_mobile, parent_email have no
			// matching column on the Student Google Sheet (documented
			// in DataService.js's STUDENT toBackendFields comment), so
			// objStudent never carries them back from Google - they
			// stay undefined here until the Sheet/Student.gs gains
			// those columns.

			arrStudentRows.push( arrRow );
		}

		// WHY/WHAT: bridge the plain DataService object(s) into the
		// same array-row shape ([ student_id, name, mobile, ... ]) that
		// getSelectedData() reads via INDEX.* positions - matching
		// the fix already applied in Category.script.js. Without
		// this, SESSION_OBJECT.STUDENT_DATA held plain objects while
		// getSelectedData() looked them up with obj[0]/obj[1]/...,
		// which never matched, so the Edit form and Info popup
		// always rendered blank/undefined fields.
		setStorageData( arrStudentRows, SESSION_OBJECT.STUDENT_DATA );

		hideLoader();

		popUpEditForm();
	}

	function setCategorySelection( categoryList ) {

		var mode = getAddEditMode();

		var selectedId = DEFAULT.CATEGORY_ID;
		if( mode == UPDATE_DATA ) { // Edit

			var data = getSelectedData();	
			selectedId = data[ INDEX.CATEGORY_ID ];
		}
		else if( mode == INSERT_DATA ) {

			// Fetch id from the localstorage which previously selected
			selectedId = DEFAULT.CATEGORY_ID; //getSelectedDropdownId( LOCAL_OBJECT.CATEGORY_ID );
		}

		var categoryScript = CategoryScript.getInstance();
		categoryScript.populateSelection( categoryList, FORM_FIELD.CATEGORY_ID, selectedId );
		enableSaveButton( false );
	}

	function setSectionSelection( sectionList ) {

		var mode = getAddEditMode();

		var selectedId = DEFAULT.SECTION_ID;
		if( mode == UPDATE_DATA ) { // Edit

			var data = getSelectedData();	
			selectedId = data[ INDEX.SECTION_ID ];
		}
		else if( mode == INSERT_DATA ) {

			// Fetch id from the localstorage which previously selected
			selectedId = DEFAULT.SECTION_ID; //getSelectedDropdownId( LOCAL_OBJECT.SECTION_ID );
		}

		var sectionScript = SectionScript.getInstance();
		sectionScript.populateSelection( sectionList, FORM_FIELD.SECTION_ID, selectedId );
		enableSaveButton( false );
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
	// Student being edited, the same way getListData()
	// above already asks for the full list.
	// WHEN: runs when the Edit form is opened for a
	// specific Student.
	// --------------------------------------------------

	// get data for Edit
	function getData() {

		DataService.getRecordById(

			AppConfig.STORES.STUDENT,

			getSelectedId(),

			function( objStudent ) {

				if( objStudent ) {

					parseFormDataResponse( [ objStudent ] );
				}
			},

			function( objError ) {

				CommonUtils.logError( "Student.script.js (getData)", objError );
				hideLoader();
				CommonUtils.showAlert( "Unable to load Student." );
			}
		);
	}

	/* ==========================================================
   Get Student List

   Loads students using DataService.

   DataService automatically decides whether to:

   • Load from Google Apps Script
   • Load from IndexedDB
   • Load cached data if offline

========================================================== */

function getListData( iRequestedPage )
{
    // --------------------------------------------------
    // WHY: nothing told the user a fetch was in progress,
    // so a slow/failed Google Apps Script call just looked
    // like the page had frozen.
    // WHAT: onListDocumentReady() already shows the loading
    // overlay before this runs - this just hides it once
    // the DataService callback (success or error) fires, so
    // a failed fetch does not leave it stuck on screen.
    // WHEN: runs every time the Student list is (re)loaded -
    // now for exactly one 100-row page at a time, not the
    // whole table.
    // --------------------------------------------------

    if( iRequestedPage ) {

        mCurrentPage = iRequestedPage;
    }

    DataService.getRecordsPage(

        AppConfig.STORES.STUDENT,
        mCurrentPage,
        mPageSize,
        mCurrentSearchKeyword,

        function(objPageResult)
        {
            hideLoader();

            parseListResponse(objPageResult);
        },

        function(objError)
        {
            hideLoader();

            CommonUtils.logError( "Student.script.js (getListData)", objError );

            CommonUtils.showAlert("Unable to load students.");
        }

    );
}

	function listenersSingleClickModal() {

		$( '#student_show_info' ).off().on( 'click', function() {

			closeSelectMenu();
			openListDetailsPopup();
			onInfoViewDocumentReady();
		});

		// --------------------------------------------------
		// STUDENT ADD BUTTON FIX (Priority 3):
		// WHY: this whole listenersSingleClickModal() function
		// only runs for the popup menu that opens AFTER a specific
		// Student row has been tapped/selected (see
		// onSingleClickListener() -> openSelectMenu()), alongside
		// that same Student's Info/Edit/Delete actions. Having an
		// "Add" entry inside that per-Student menu is exactly what
		// made Add look like it belonged to whichever Student was
		// currently selected, instead of being its own,
		// selection-independent action.
		// WHAT: #student_add is no longer wired up as a second Add
		// trigger here - Add New Student now has exactly one entry
		// point, the floating #btn_add button on the Student List
		// page itself (see onListDocumentReady()), which already
		// always opens a blank Add form and now also clears any
		// stale selected-student id before doing so. No CRUD logic
		// changed - onClickAdd()/the Add Student workflow itself is
		// untouched and still reused as-is.
		// --------------------------------------------------

		$( '#student_add' ).off().hide();

		if( checkRolePermission( SOFTWARE_FEATURE_CONST.EDIT_STUDENT ) == true ) {

			$( '#student_edit' ).off().on( 'click', function() {

				closeSelectMenu();
				onClickEdit();
			});
		}
		else {
		
			$( '#student_edit' ).hide();
		}


		if( checkRolePermission( SOFTWARE_FEATURE_CONST.DELETE_STUDENT ) == true ){

			$( '#student_delete' ).off().on( 'click', function() {

				closeSelectMenu();
				onClickDelete();
			});
		}
		else {
		
			$( '#student_delete' ).hide();
		}
		if( checkRolePermission( SOFTWARE_FEATURE_CONST.SHARE_STUDENT ) == true ){

			$( '#student_share' ).off().on( 'click', function() {

				closeSelectMenu();
				openShareMenu();
			});
		}
		else {
		
			$( '#student_share' ).hide();
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

			var script = StudentScript.getInstance();
			openGallery( script.setSelectedPhoto );
		});

		$( '#camera_photo' ).off().on('click', function() {

			closePhotoMenuPopup();

			var script = StudentScript.getInstance();
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
		if( checkRolePermission( SOFTWARE_FEATURE_CONST.DELETE_STUDENT ) == true ) {

			$( '#multi_delete' ).off().on( 'click', function() {

				onClickMultiRowDelete();
			});
		}
		else {
		
			$( '#multi_delete' ).hide();
		}

		if( checkRolePermission( SOFTWARE_FEATURE_CONST.SHARE_STUDENT ) == true ) {

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

			createTableStudent( null );
		}

		clearSearch();

		showLoader( "Please wait..." );

		// --------------------------------------------------
		// SKELETON LOADING (UI Modernization pass, this pass):
		// show shimmering placeholder cards immediately instead
		// of leaving #list_id empty while the first page of Students
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

		if( checkRolePermission( SOFTWARE_FEATURE_CONST.ADD_STUDENT ) == true ) {

			// --------------------------------------------------
			// STUDENT ADD BUTTON FIX (Priority 3):
			// WHY: #btn_add is the floating "+" button that lives
			// on the Student List page itself (wired here, in
			// onListDocumentReady() - not inside the per-row
			// select menu in listenersSingleClickModal() below,
			// which only opens after a specific Student row has
			// been tapped/selected). Selecting a row still left
			// that row's id sitting in sessionStorage
			// (SESSION_OBJECT.STUDENT_ID, set by
			// onSingleClickListener()), so even though onClickAdd()
			// already forces ADD_EDIT_MODE to INSERT_DATA (a blank
			// form, never getData()/getSelectedData() for an
			// existing Student), a stale selected-student id was
			// still left behind in storage while the Add form was
			// open - i.e. the "+" button could still look/behave
			// as if it belonged to whichever Student was last
			// selected.
			// WHAT: explicitly clears that stale selected-student
			// id the moment "+" is pressed, so Add can never be
			// mistaken for - or accidentally carry over any state
			// from - a previously selected Student, and sets a
			// tooltip so the button's purpose is unambiguous.
			// Reuses the existing onClickAdd()/Add Student workflow
			// as-is - no new CRUD logic.
			// --------------------------------------------------

			$( "#btn_add" )
				.attr( "title", "Add New Student" )
				.off().on( "click", function( objEvent ) {

					// FIX: #btn_add wraps an <a href="#"> - without
					// preventDefault() that anchor's default action
					// changes the URL hash, which creates a new
					// history entry. onBackPress() below (see
					// StudentHTML.script.js) listens for ANY
					// history "popstate" and treats it as a Back
					// press, so that hash change was being
					// misinterpreted as the user pressing Back and
					// force-navigating to the Dashboard the instant
					// "+" was tapped. preventDefault() stops the
					// hash/history change from happening at all, so
					// only the intended onClickAdd() runs.
					objEvent.preventDefault();

					clearSessionStorage( SESSION_OBJECT.STUDENT_ID );

					onClickAdd();
				});
		}
		else {

			$( "#btn_add" ).hide();
		}

		$( "#btn_refresh" ).off().on( "click", function( objEvent ) {

			// FIX: same href="#" / popstate issue as #btn_add above -
			// preventDefault() stops the click from being
			// misread as a Back press that would navigate to the
			// Dashboard instead of just refreshing this list.
			objEvent.preventDefault();

			onClickRefresh();
		});

		// UI/UX POLISH PASS (this pass) - top AppBar Share button.
		// Shares the page itself (title + current URL) via
		// CommonUtils.shareContent() (Web Share API, copy-link
		// fallback) - distinct from the per-card Share buttons,
		// which share one specific Student's details instead.
		$( "#btn_share_page" ).off().on( "click", function( objEvent ) {

			objEvent.preventDefault();

			CommonUtils.shareContent( "Student List", "Student List - Student Management System", window.location.href );
		});

		// --------------------------------------------------
		// FIX: the floating down-arrow button (#btn_float_next_page,
		// studentList.html) is the Student List's export/download
		// control. Calls the existing exportStudentList() - the
		// same function #btn_export already uses - directly; no
		// new export logic was written. preventDefault() is kept
		// so this button's click can never be misread as a Back
		// press via the popstate listener (see #btn_add/#btn_refresh
		// above) and fall through to navigating to the Dashboard.
		// --------------------------------------------------
		$( "#btn_float_next_page" ).off().on( "click", function( objEvent ) {

			objEvent.preventDefault();

			exportStudentList();
		});

		//--------- START - FILTER --------------
		$('#filter_icon').off().on( "click", function() {
	
			showFilter();
		});

		$('#filter_params').off().on( "click", function() {

			showFilter();
		});

		$('#btn_filter').off().on( "click", function() {

			doFilterStudentList();
		});

		// --------------------------------------------------
		// PRIORITY 5 FIX (Filter): the Category/Section dropdowns
		// inside the Filter modal previously only took effect once
		// the separate "Apply" button (#btn_filter, still wired
		// above for anyone who prefers it) was clicked - picking a
		// value and forgetting to press Apply silently changed
		// nothing. Binding the same doFilterStudentList() to each
		// select's own "change" event makes the list redraw the
		// instant a filter is changed, per the brief. No new
		// filtering logic was written - both paths call the exact
		// same function.
		// --------------------------------------------------
		$( '#filter_category_id, #filter_section_id' ).off( "change" ).on( "change", function() {

			doFilterStudentList();
		});
		//--------- END - FILTER ----------------

		// --------------------------------------------------
		// WHY: enableSearch() above only binds #search's keyup
		// event (MODE_SEARCH_ON_KEYUP); the new #search_icon
		// button added to studentSearchBar in
		// StudentHTML.script.js needs its own click binding so
		// the search button next to the input actually runs the
		// same search.
		// WHAT: reuses the existing searchList() function -
		// no new search logic was written.
		// WHEN: runs whenever the user clicks the Search button.
		// --------------------------------------------------
		$( "#search_icon" ).off().on( "click", function() {

			searchList();
		});

		// --------------------------------------------------
		// WHY: new #btn_export button added to studentSearchBar
		// in StudentHTML.script.js needs a click handler.
		// WHAT: calls exportStudentList() (defined below), which
		// exports whatever is currently in mSelectedDataList -
		// i.e. the same rows presently shown in the list,
		// filters and search included.
		// WHEN: runs whenever the user clicks Export.
		// --------------------------------------------------
		$( "#btn_export" ).off().on( "click", function() {

			exportStudentList();
		});

		//----------Multiple selection related operations---------

		$( "#list_id" ).on( "taphold", "ul", function (event) {

			if( mEnableMultiSelection == true ) { //Enabled multiple selection
				
				onTapHold( $(this) );
				listenersMultiSelect();
			}
		});
	}

	function onLoadCacheManager() {

		loadCategoryList();
	}

	function loadCategoryList() {

		// --------------------------------------------------
		// WHY / WHAT / WHEN: see "CHANGE LOG - CacheManagerScript
		// Removal Pass" at the top of this file.
		// --------------------------------------------------

		DataService.getAllRecords( AppConfig.STORES.CATEGORY, function( arrCategories ) {

			var categoryScript = CategoryScript.getInstance();
			var arrCategoryRows = [];

			for( var index = 0; index < arrCategories.length; index++ ) {

				var objCategory = arrCategories[ index ];
				var arrRow = [];

				// lines 1503-1505
                arrRow[ CategoryScript.INDEX.CATEGORY_ID ] = objCategory.category_id;
                arrRow[ CategoryScript.INDEX.NAME ] = objCategory.name;
                arrRow[ CategoryScript.INDEX.ORGANIZATION_ID ] = objCategory.organization_id;

				arrCategoryRows.push( arrRow );
			}

			setCategoryListData( arrCategoryRows );

			loadSectionList();

		}, function( objError ) {

			CommonUtils.logError( "Student.script.js (loadCategoryList)", objError );

			// Keep going even if Categories fail to load, so the
			// Student list itself can still load.
			setCategoryListData( [] );
			loadSectionList();
		});
	}

	function loadSectionList() {

		// --------------------------------------------------
		// WHY / WHAT / WHEN: see "CHANGE LOG - CacheManagerScript
		// Removal Pass" at the top of this file.
		// --------------------------------------------------

		DataService.getAllRecords( AppConfig.STORES.SECTION, function( arrSections ) {

			var sectionScript = SectionScript.getInstance();
			var arrSectionRows = [];

			for( var index = 0; index < arrSections.length; index++ ) {

				var objSection = arrSections[ index ];
				var arrRow = [];

				// line 1542
                arrRow[ SectionScript.INDEX.SECTION_ID ] = objSection.section_id;
                // line 1543
                arrRow[ SectionScript.INDEX.NAME ] = objSection.name;

				arrSectionRows.push( arrRow );
			}

			setSectionListData( arrSectionRows );

			getListData();

		}, function( objError ) {

			CommonUtils.logError( "Student.script.js (loadSectionList)", objError );

			// Keep going even if Sections fail to load, so the
			// Student list itself can still load.
			setSectionListData( [] );
			getListData();
		});
	}
	// parse summary list response from server
/* ==========================================================
   Parse Student List

   Saves the student list and refreshes the UI.
========================================================== */

function parseListResponse(objPageResult)
{
    if (!objPageResult)
    {
        objPageResult = { records: [], totalRecords: 0, totalPages: 1, page: 1, pageSize: mPageSize };
    }

    hideLoader();

    var arrStudents = objPageResult.records || [];

    // --------------------------------------------------
    // PAGINATION FIX (this pass) - ROOT CAUSE: getListData()
    // (above) already asked DataService.getRecordsPage() for
    // exactly one page and got back { records, totalRecords,
    // totalPages, page, pageSize } - but this function used to
    // be declared as parseListResponse(arrStudents) and treated
    // that whole object as if it WERE the bare records array.
    // objPageResult.length is undefined, so the for loop below
    // never ran, mCurrentPage/mTotalPages/mTotalRecords were
    // never updated past their initial declaration (1/1/0), and
    // there was no Prev/Next control anywhere on this page - so
    // paging past the first screen was simply impossible no
    // matter how many Students existed. Reading
    // objPageResult.records (with the same object/array-of-rows
    // bridge already used by Category.script.js) and updating
    // mCurrentPage/mTotalPages/mTotalRecords from the rest of
    // objPageResult fixes both: the page actually renders, and
    // the new Prev/Next bar (buildPaginationBarHtml()/
    // bindPaginationBarListeners(), see showFilteredList() below)
    // now has real page numbers to work from.
    // --------------------------------------------------

    mCurrentPage = objPageResult.page || 1;
    mTotalPages = objPageResult.totalPages || 1;
    mTotalRecords = objPageResult.totalRecords || arrStudents.length;

    // --------------------------------------------------
    // WHY: DataService.getRecordsPage() returns plain objects
    // (e.g. { studentId, categoryId, sectionId, name,
    // rollNumber, mobile, email, parentMobile, telegram,
    // parentEmail }), matching the same bridge already used in
    // Category.script.js/parseListResponse(). The rest of this
    // file (doFilterStudentList(), createHtmlListItem(),
    // showFilteredList(), etc.) was written for the old SQLite
    // row format, where each Student is a plain array read using
    // SUMMARY_INDEX.STUDENT_ID / CATEGORY_ID / SECTION_ID / NAME /
    // ROLL_NUMBER / MOBILE / EMAIL / PARENT_MOBILE / TELEGRAM /
    // PARENT_EMAIL as array positions.
    // WHAT: convert each DataService object into that same
    // array-row shape, in this one place only, so every function
    // below this point keeps working exactly as it already did -
    // nothing past this bridge needs to change.
    //
    // NOTE: these field names are this project's best current
    // guess at the real field names your Google Apps Script
    // returns, matching the naming style already confirmed for
    // Category. If your Students sheet/response actually uses
    // different field names, this is the one place to correct
    // them.
    // WHEN: runs every time a page of the Student list is loaded,
    // refreshed, or paged through.
    // --------------------------------------------------

    var arrStudentRows = [];

    for (var i = 0; i < arrStudents.length; i++)
    {
        var objStudent = arrStudents[i];

        var arrRow = [];

        // FIELD NAME FIX: DataService.getRecordsPage() actually
        // resolves through getEntityApiConfig(STUDENT).fromBackendFields()
        // (see DataService.js), which returns student_id, name,
        // mobile, email, telegram, organization_id, category_id,
        // section_id, status - NOT studentId/categoryId/sectionId/
        // rollNumber/parentMobile/parentEmail as this bridge
        // previously guessed. roll_number, parent_mobile and
        // parent_email are not returned here at all, because
        // Student.gs's Sheet has no columns for them yet (see the
        // comment on toBackendFields/fromBackendFields for STUDENT
        // in DataService.js) - they default to "" below instead of
        // showing "undefined" until those columns are added.

        arrRow[SUMMARY_INDEX.STUDENT_ID] = objStudent.student_id;
        arrRow[SUMMARY_INDEX.CATEGORY_ID] = objStudent.category_id;
        arrRow[SUMMARY_INDEX.SECTION_ID] = objStudent.section_id;
        arrRow[SUMMARY_INDEX.NAME] = objStudent.name;
        arrRow[SUMMARY_INDEX.ROLL_NUMBER] = objStudent.roll_number || "";
        arrRow[SUMMARY_INDEX.MOBILE] = objStudent.mobile;
        arrRow[SUMMARY_INDEX.EMAIL] = objStudent.email;
        arrRow[SUMMARY_INDEX.PARENT_MOBILE] = objStudent.parent_mobile || "";
        arrRow[SUMMARY_INDEX.TELEGRAM] = objStudent.telegram;
        arrRow[SUMMARY_INDEX.PARENT_EMAIL] = objStudent.parent_email || "";

        arrStudentRows.push(arrRow);
    }

    setStorageData(
        arrStudentRows,
        SESSION_OBJECT.STUDENT_SUMMARY_DATA
    );

    doFilterStudentList();

    // --------------------------------------------------
    // DASHBOARD QUICK ADD (Priority 2):
    // WHY: the Dashboard's "Add Student" Operations shortcut
    // used to just open this list page (openStudentList()) -
    // the user still had to find and tap the "+" button
    // themselves once it loaded.
    // WHAT: Dashboard.script.js now sets a small sessionStorage
    // flag (DASHBOARD_QUICK_ADD_ACTION = "student") right
    // before navigating here. Once the Student list has
    // finished its first load, this checks for that flag and -
    // only if the user actually has Add permission, same as the
    // "+" button already requires - immediately calls the exact
    // same onClickAdd() the "+" button uses, then clears the
    // flag so it can never fire again on a later refresh or a
    // normal (non-Dashboard) visit to this page. Reuses the
    // existing Add Student form/workflow as-is - no new CRUD
    // logic, no duplicate form.
    // WHEN: runs once, right after the Student list's first
    // load, only when that load was triggered by the Dashboard
    // quick-add shortcut.
    // --------------------------------------------------

    if( sessionStorage.getItem( "DASHBOARD_QUICK_ADD_ACTION" ) == "student" ) {

        sessionStorage.removeItem( "DASHBOARD_QUICK_ADD_ACTION" );

        if( checkRolePermission( SOFTWARE_FEATURE_CONST.ADD_STUDENT ) == true ) {

            onClickAdd();
        }
    }
}
	// parse summary list response from the storage
	function parseListFromStorage() {

		hideLoader();

		doFilterStudentList();
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
		
		var id = selectedData[ SUMMARY_INDEX.STUDENT_ID ];
		sessionStorage.setItem( SESSION_OBJECT.STUDENT_ID, id );
	
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
				// Phase 1 (Live Search): bound via the native
				// "input" event instead of jQuery's keyup() - input
				// fires for every value change (typing, paste,
				// autofill, mobile keyboard predictions/backspace-
				// hold), whereas keyup can miss some of those. This
				// is the only change here: it still just calls the
				// existing searchList() below, so the actual
				// filtering logic (and the Search button/icon click
				// binding right below, kept for compatibility) are
				// unchanged.
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
		$('#edit_details_title').text('Add New Student');
		openEditDetailsPopup();
		onAddEditDocumentReady();

	}
	function onClickSaveData() {

		var bValid = validateForm();
		if( bValid == true ) {

			var mode = getAddEditMode();

			var title = "Add New";
			var message = "Do you want to add new Student?";
			if( mode == UPDATE_DATA ) {
				title = "Update";
				message = "Do you want to update the Student?";
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
		$('#edit_details_title').text('Edit Student');
		openEditDetailsPopup();
		onAddEditDocumentReady();
	}


	function onClickDelete() {

		closeSelectMenu();
		showConfirmationAlert( "Do you want to delete selected Student?", onConfirmDelete, "Message", [ "Delete", "Cancel" ] );
	}

	function searchList() {

		if( mSearchDebounceTimer ) {

			clearTimeout( mSearchDebounceTimer );
		}

		// Project Improvements (this pass): previously filtered only
		// mSelectedDataList (the current page) client-side, and never
		// touched mCurrentSearchKeyword at all even though getListData()
		// already sends it to DataService.getRecordsPage() - that
		// argument just always went through as "". Now that
		// DataService.js's STUDENT entity has a searchAction wired to
		// the existing searchStudents backend action, this follows the
		// same debounce -> set keyword -> reload page 1 pattern already
		// used by Category.script.js, so a search actually covers every
		// Student record, not just the ones already loaded.
		mSearchDebounceTimer = setTimeout( function() {

			mCurrentSearchKeyword = document.getElementById( "search" ).value.trim();
			mCurrentPage = 1;

			showLoader( "Searching..." );
			getListData( 1 );

		}, 250 );
	}
	// --------------------------------------------------
	// WHY: requested "Export" button for the Student List -
	// no export feature existed anywhere in this file.
	// WHAT: builds a CSV file from mSelectedDataList (the
	// same array already used to render the on-screen list,
	// so Export always matches whatever filter/search is
	// currently applied) using the existing JSON_KEY field
	// names, and downloads it through a temporary <a> link.
	// No server round-trip and no new library - this reads
	// data that has already been fetched through DataService.
	// WHEN: runs when the user clicks the Export button.
	// --------------------------------------------------
	// BUG FIX (Phase 1): each row in mSelectedDataList is
	// actually an array indexed by SUMMARY_INDEX (this is the
	// same "summary" shape createHtmlListItem() already reads
	// via data[SUMMARY_INDEX.NAME] etc. to render the on-screen
	// cards) - NOT a plain object keyed by JSON_KEY strings like
	// "name". Reading objRow[JSON_KEY.NAME] on an array is always
	// undefined, so every exported row came out blank, which is
	// why the downloaded CSV showed only the header row. Fixed
	// by reading each column through the matching SUMMARY_INDEX
	// position instead, in the same column order as arrColumns
	// (both lists already list the fields in the same order, so
	// this is just "use the right index for the right column").
	// --------------------------------------------------
	// --------------------------------------------------
	// Improvements Made - "Export duplicates rows" (brief item 3)
	// Traced the full pipeline that fills mSelectedDataList
	// (showFilteredList() / parseListResponse() /
	// setStorageData() / DataService.getAllRecords()) - every
	// stage already reassigns a fresh array with "=" rather than
	// pushing onto a stale one, so no repeated-append bug was
	// found in this file as written. Added this dedupe-by-
	// Student-ID pass anyway as the safety net the brief asks
	// for ("clear export collection, rebuild it once, export
	// unique rows"), in case a duplicate Student ID ever reaches
	// mSelectedDataList from elsewhere (e.g. a bad backend
	// response). Real students who simply share a name are NOT
	// affected - only exact duplicate Student IDs are collapsed.
	// --------------------------------------------------
	function exportStudentList() {

		var arrRows = mSelectedDataList;

		if( arrRows == null || arrRows.length == 0 ) {

			CommonUtils.showAlert( "There are no students to export." );
			return;
		}

		var arrUniqueRows = [];
		var objSeenStudentIds = {};

		for( var u = 0; u < arrRows.length; u++ ) {

			var studentId = arrRows[ u ][ SUMMARY_INDEX.STUDENT_ID ];

			if( objSeenStudentIds[ studentId ] === true ) {

				continue; // already exported this Student ID - skip the duplicate
			}

			objSeenStudentIds[ studentId ] = true;
			arrUniqueRows.push( arrRows[ u ] );
		}

		arrRows = arrUniqueRows;

		var arrColumns = [
			JSON_KEY.STUDENT_ID,
			JSON_KEY.NAME,
			JSON_KEY.ROLL_NUMBER,
			JSON_KEY.CATEGORY_ID,
			JSON_KEY.SECTION_ID,
			JSON_KEY.MOBILE,
			JSON_KEY.EMAIL,
			JSON_KEY.PARENT_MOBILE,
			JSON_KEY.TELEGRAM,
			JSON_KEY.PARENT_EMAIL
		];

		// Same fields, same order as arrColumns above, but as the
		// numeric SUMMARY_INDEX position each one actually lives
		// at inside a row of mSelectedDataList.
		var arrIndexes = [
			SUMMARY_INDEX.STUDENT_ID,
			SUMMARY_INDEX.NAME,
			SUMMARY_INDEX.ROLL_NUMBER,
			SUMMARY_INDEX.CATEGORY_ID,
			SUMMARY_INDEX.SECTION_ID,
			SUMMARY_INDEX.MOBILE,
			SUMMARY_INDEX.EMAIL,
			SUMMARY_INDEX.PARENT_MOBILE,
			SUMMARY_INDEX.TELEGRAM,
			SUMMARY_INDEX.PARENT_EMAIL
		];

		var strCsv = arrColumns.join( "," ) + "\r\n";

		for( var i = 0; i < arrRows.length; i++ ) {

			var objRow = arrRows[ i ];

			var arrValues = arrIndexes.map( function( intIndex ) {

				var value = objRow[ intIndex ];

				if( value == null ) {

					value = "";
				}

				// Escape for CSV: wrap in quotes, double up any quotes already in the value
				return '"' + String( value ).replace( /"/g, '""' ) + '"';
			});

			strCsv += arrValues.join( "," ) + "\r\n";
		}

		// NOTE: this file already has a local "var URL" (the API
		// path "/StudentDataHandler" near the top of this
		// closure), so the browser's own URL.createObjectURL
		// must be reached through window.URL here, not URL.
		var objBlob = new Blob( [ strCsv ], { type: "text/csv;charset=utf-8;" } );
		var strUrl = window.URL.createObjectURL( objBlob );

		var elemLink = document.createElement( "a" );
		elemLink.href = strUrl;
		elemLink.download = "students_export_" + new Date().toISOString().slice( 0, 10 ) + ".csv";

		// Phase 2 (Recent Activity)
		if( typeof ActivityLog !== "undefined" ) {

			ActivityLog.logActivity( "Exported Students" );
		}

		document.body.appendChild( elemLink );
		elemLink.click();
		document.body.removeChild( elemLink );

		window.URL.revokeObjectURL( strUrl );

		// Improvements Made (brief item 5 - Success Messages):
		// no feedback existed after a successful export - the
		// file just silently appeared in Downloads with nothing
		// on screen confirming it worked.
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

		var studentList = getStorageData( SESSION_OBJECT.STUDENT_SUMMARY_DATA );

		if( studentList == null ) {

			studentList = [];
		}

		var message = "";
		if ( mode == INSERT_DATA ) {

			var errorData = getStorageData(SESSION_OBJECT.STUDENT_ERROR_DATA);
			if( errorData != null ){

				if( errorData.length > 0 ){

					var errorHandlerScript = ErrorHandlerScript.getInstance();
					errorHandlerScript.syncServerErrorData( getStorageData( SESSION_OBJECT.STUDENT_ERROR_DATA ), errorHandlerScript.deleteErrorData );
				}
			}
			
			var result = getAddEditResultArray( response.id );
			message = "Student saved successfully.";
			
			studentList.push( result );

			setStorageData( studentList, SESSION_OBJECT.STUDENT_SUMMARY_DATA );
			hideLoader();

			getListData();
		}
		else if ( mode == UPDATE_DATA ) {

			var result = getAddEditResultArray( 0 );
			message = "Student updated successfully.";

			for ( var i = 0; i < studentList.length; i++ ) {

				var data = studentList[ i ];

				if ( data[ INDEX.STUDENT_ID ] == result[ INDEX.STUDENT_ID ] ) {

					studentList[ i ] = result;
				}
			}

			setStorageData( studentList, SESSION_OBJECT.STUDENT_SUMMARY_DATA );
			hideLoader();

			parseListFromStorage();			
		}

		// Phase 2 (Recent Activity): log the Add/Edit as "Added
		// <name>" / "Edited <name>" - typeof-guarded so this page
		// still works even if activity.js hasn't loaded.
		if( typeof ActivityLog !== "undefined" ) {

			var strLoggedName = result[ INDEX.NAME ] || "Student";
			var strActionLabel = ( mode == INSERT_DATA ) ? "Added " : "Edited ";
			ActivityLog.logActivity( strActionLabel + strLoggedName );
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

		data[ SUMMARY_INDEX.STUDENT_ID ] = mJsonData[ SUMMARY_JSON_KEY.STUDENT_ID ];
		data[ SUMMARY_INDEX.CATEGORY_ID ] = mJsonData[ SUMMARY_JSON_KEY.CATEGORY_ID ];
		data[ SUMMARY_INDEX.SECTION_ID ] = mJsonData[ SUMMARY_JSON_KEY.SECTION_ID ];
		data[ SUMMARY_INDEX.NAME ] = mJsonData[ SUMMARY_JSON_KEY.NAME ];
		data[ SUMMARY_INDEX.ROLL_NUMBER ] = mJsonData[ SUMMARY_JSON_KEY.ROLL_NUMBER ];
		data[ SUMMARY_INDEX.MOBILE ] = mJsonData[ SUMMARY_JSON_KEY.MOBILE ];
		data[ SUMMARY_INDEX.EMAIL ] = mJsonData[ SUMMARY_JSON_KEY.EMAIL ];
		data[ SUMMARY_INDEX.PARENT_MOBILE ] = mJsonData[ SUMMARY_JSON_KEY.PARENT_MOBILE ];
		data[ SUMMARY_INDEX.TELEGRAM ] = mJsonData[ SUMMARY_JSON_KEY.TELEGRAM ];
		data[ SUMMARY_INDEX.PARENT_EMAIL ] = mJsonData[ SUMMARY_JSON_KEY.PARENT_EMAIL ];

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

				var selectedId = selectedData[ i ][ SUMMARY_INDEX.STUDENT_ID ];

				mSelectedIdList.push( selectedId );			
			}
		}
			
		return mSelectedIdList;
	}
	function parseDeleteResponse( rowsDeleted, statusCode, response ) {

		if( statusCode == G_ERROR.CODE.DELETE_OPERATION_DEPENDENT_EXISTS ) {

			var errorMsg = response.message;
			
			var message = "Cannot delete the Student." + errorMsg.split("<br>");
			showOperationMessage( message, "Warning", null );
			hideLoader();
		}
		else{

			var studentList = getStorageData( SESSION_OBJECT.STUDENT_SUMMARY_DATA );

			for( var i = 0; i < mSelectedIdList.length; i++ ) {

				var deletedId = mSelectedIdList[ i ];

				for( var j = 0; j < studentList.length; j++ ) {

					var data = studentList[ j ];
					if( data[ SUMMARY_INDEX.STUDENT_ID ] == deletedId ) {

						studentList.splice( j, 1 );
					}
				}
			}

			setStorageData( studentList, SESSION_OBJECT.STUDENT_SUMMARY_DATA );

			if( mMultiSelect == true ) {

				resetMultiSelection();
			}

			parseListFromStorage();

			/**
			 * MENTOR NOTE (fixed) - Singular/plural grammar
			 *
			 * Why: this always said "Selected Student(s) has been
			 * deleted successfully", using the literal "(s)"
			 * placeholder and the singular verb "has" even when
			 * many Students were deleted at once.
			 * What: mSelectedIdList.length (set by getDelDataArray()
			 * just above, before the delete ran) tells us exactly
			 * how many were deleted, so the word and the verb can
			 * both agree with it.
			 */
			var numDeleted = mSelectedIdList.length;
			var strStudentWord = ( numDeleted === 1 ) ? "Student" : "Students";

			showOperationMessage( strStudentWord + " deleted successfully.", "Success", null );
		}
	}
	function getSelectedId() {

		var id = 0;

		if(sessionStorage.hasOwnProperty(SESSION_OBJECT.STUDENT_ID)) {
		
			id = sessionStorage.getItem( SESSION_OBJECT.STUDENT_ID );
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

		var studentList = getStorageData( SESSION_OBJECT.STUDENT_DATA );

		if( studentList != null ) {

			var selectedId = getSelectedId();

			data = studentList.find( obj => {
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

		var studentList = getStorageData( SESSION_OBJECT.STUDENT_SUMMARY_DATA );

		if( studentList != null ) {

			var selectedId = getSelectedId();

			data = studentList.find( obj => {
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

	// Set whether multiple selection is required or not true/false
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
		// ('#modal_share_student', always false) instead of the real
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
			   
			if( checkRolePermission( SOFTWARE_FEATURE_CONST.ADD_STUDENT ) == true ) {

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

    var name = data[ SUMMARY_INDEX.NAME ];
    var mobile = data[ SUMMARY_INDEX.MOBILE ] || '';
    var email = data[ SUMMARY_INDEX.EMAIL ] || '';
    // PAGINATION FIX: seqNumber is the DISPLAYED row number and must
    // keep counting across pages (page 2 starts at 101, not 1 again).
    // "index" itself must stay as the page-local array position -
    // onClickInfoIcon(index)/onClickEditIcon(index) above use it to
    // look the row up inside this page's own mSelectedDataList/
    // mSearchList array, so it can't be changed to a global number.
    var seqNumber = ( ( mCurrentPage - 1 ) * mPageSize ) + index + 1 + ') ';

    // ACCESSIBILITY FIX (this pass): role="button" tabindex="0"
    // aria-label added - these are <span>s, not native <button>s,
    // so without these three they were invisible to screen readers
    // and unreachable by keyboard (Tab skips a plain <span>). See
    // common.js's new delegated keydown listener for the matching
    // Enter/Space activation.
    var infoIconHtml = '<span class="icon-btn icon-btn-info" role="button" tabindex="0" aria-label="View student details" onclick="StudentScript.getInstance().onClickInfoIcon('+ index +');"><i class="fa fa-info-circle" aria-hidden="true"></i></span>';
    var editIconHtml = '';
    if( checkRolePermission( SOFTWARE_FEATURE_CONST.EDIT_SECTION ) == true ) {

        editIconHtml = '<span class="icon-btn icon-btn-edit" role="button" tabindex="0" aria-label="Edit student" onclick="StudentScript.getInstance().onClickEditIcon('+ index +', event);" style="position:absolute; top:14px; right:14px;"><i class="fas fa-edit"></i></span>';
    }

    // UI/UX POLISH PASS (this pass) - SHARE BUTTON: every card now
    // gets its own Share button, positioned next to Edit (44px
    // icon-btn width + gap = 64px offset so the two never overlap).
    // Reuses CommonUtils.shareContent() (Web Share API, copy-to-
    // clipboard fallback) via the new onClickShareIcon() below,
    // same off-the-shelf pattern as onClickInfoIcon/onClickEditIcon
    // - reads straight from this row's own data, no popup needed.
    var shareIconHtml = '<span class="icon-btn icon-btn-share" role="button" tabindex="0" aria-label="Share student" onclick="StudentScript.getInstance().onClickShareIcon('+ index +', event);" style="position:absolute; top:14px; right:64px;"><i class="fa-solid fa-share-nodes"></i></span>';

    // Quick-action icons: call / WhatsApp / SMS / email, using the
    // mobile and email already present in this row's data - no new
    // lookup or click-handler functions needed, same as how
    // infoIconHtml/editIconHtml already work off this same "data".
    var quickActionsHtml =
        '<span class="student-quick-actions list-card-footer">' +
            ( mobile ?
                '<a href="tel:' + mobile + '" class="quick-action-btn quick-action-call" title="Call"><i class="fa fa-phone" aria-hidden="true"></i></a>' +
                '<a href="https://wa.me/' + mobile + '" target="_blank" class="quick-action-btn quick-action-whatsapp" title="WhatsApp"><i class="fab fa-whatsapp" aria-hidden="true"></i></a>' +
                '<a href="sms:' + mobile + '" class="quick-action-btn quick-action-sms" title="SMS"><i class="fa fa-comment-sms" aria-hidden="true"></i></a>'
                : '' ) +
            ( email ?
                '<a href="mailto:' + email + '" class="quick-action-btn quick-action-email" title="Email"><i class="fa fa-envelope" aria-hidden="true"></i></a>'
                : '' ) +
        '</span>';

    // Project Improvements (this pass): initials avatar, generated
    // from the Student's name (first letter of up to the first two
    // words) - no new field/lookup needed, matches the "Better
    // Cards" brief item. Falls back to a generic "?" if name is
    // ever empty so the circle never renders blank.
    var nameForInitials = ( name || '' ).replace( /^\d+\)\s*/, '' ).trim();
    var initialsParts = nameForInitials.split( /\s+/ ).filter( function( p ) { return p.length > 0; } );
    var initials = initialsParts.length > 0 ?
        ( initialsParts[0].charAt(0) + ( initialsParts.length > 1 ? initialsParts[1].charAt(0) : '' ) ).toUpperCase() :
        '?';

    var avatarHtml = '<span class="list-card-avatar" aria-hidden="true">' + initials + '</span>';

    // --------------------------------------------------
    // WHY: the outer <ul id="list_card"> used to carry a hard
    // inline box-shadow (a flat black drop-shadow straight on
    // the <ul>, not the styled .list-item div inside it) which
    // is why every list page looked flat/unstyled regardless of
    // what common.css said - an inline style always wins over a
    // class. Removed it; .list-item already has its own soft
    // shadow, rounded corners and hover-lift once the missing
    // --color-* variables (see common.css) are defined.
    // WHAT: this is the master card layout - Category/Section/
    // Result's createHtmlListItem() use the same wrapper markup
    // and classes, just without the quick-action row.
    //
    // UI/UX POLISH PASS (this pass) - CARD CONTENT FIX: the Roll
    // Number badge that used to sit next to the name is removed -
    // the card is now exactly Avatar / Name / Student Email /
    // Phone / action buttons, nothing else, per spec. The
    // subtitle line now shows the Student's own EMAIL (labelless,
    // just the value, e.g. "gita@student.com") instead of the
    // phone number - Parent Email is not, and never was, read or
    // shown anywhere on this card. Phone now gets its own line
    // right below Email, so both are visible per spec, and the
    // info icon (which opens the full detail popup) stays paired
    // with the first line as it always was.
    // --------------------------------------------------
    var htmlListItem =  '<ul class="list-dis" id="list_card" onselectstart="return false" style="position:relative;">' +
                        editIconHtml +
                        shareIconHtml +
                        '<div id="list_item" class="list-item">' +
                        '<li class="list-card-title">' + avatarHtml + seqNumber + name + '</li>' +
                        '<li class="list-card-subtitle">' + infoIconHtml + '<span>' + email + '</span></li>' +
                        '<li class="list-card-subtitle"><span>' + mobile + '</span></li>' +
                        '<li>' + quickActionsHtml + '</li>' +
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


	/**
	 * Wires up the Save button so it appears the moment the
	 * user changes or types into any Add/Edit form field.
	 *
	 * Readability fix: previously bound enableSaveButton
	 * directly as the event handler, so it silently ran with
	 * the jQuery Event object as its argument - it happened to
	 * still work only because enableSaveButton() checks
	 * specifically for `=== false`, not because that was ever
	 * the intended call. Passing true explicitly says what is
	 * actually meant, no behavior change.
	 */
	function bindFormEventHandlers() {
		$( '#edit_details' ).on( "change", 'select, input, textarea', function() { enableSaveButton( true ); } );
		$( '#edit_details' ).on( "keyup", 'input, textarea', function() { enableSaveButton( true ); } );
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

		var query = "SELECT MAX( " + DB_FIELD.STUDENT_ID + " ) AS maxcount FROM " + TABLE_NAME;

		getMaxDbId( query, callback );	//please change function name at its definition in db.handler.js to this name if not same as this.
	}

	function createTableStudent( callback ) {

		var query = 'CREATE TABLE IF NOT EXISTS ' + TABLE_NAME + ' (' +
			DB_FIELD.STUDENT_ID + ' INTEGER PRIMARY KEY ,' +
			DB_FIELD.CATEGORY_ID + ' INTEGER ,' +
			DB_FIELD.SECTION_ID + ' INTEGER ,' +
			DB_FIELD.NAME + ' TEXT ,' +
			DB_FIELD.ROLL_NUMBER + ' TEXT ,' +
			DB_FIELD.MOBILE + ' TEXT ,' +
			DB_FIELD.EMAIL + ' TEXT ,' +
			DB_FIELD.PARENT_MOBILE + ' TEXT ,' +
			DB_FIELD.TELEGRAM + ' TEXT ,' +
			DB_FIELD.PARENT_EMAIL + ' TEXT' +
			')';

		executeQuery( query, callback );
	}


	function getInsertQuery() {

		var query = 'INSERT INTO ' + TABLE_NAME + '(' +

			DB_FIELD.STUDENT_ID + ',' +
			DB_FIELD.CATEGORY_ID + ',' +
			DB_FIELD.SECTION_ID + ',' +
			DB_FIELD.NAME + ',' +
			DB_FIELD.ROLL_NUMBER + ',' +
			DB_FIELD.MOBILE + ',' +
			DB_FIELD.EMAIL + ',' +
			DB_FIELD.PARENT_MOBILE + ',' +
			DB_FIELD.TELEGRAM + ',' +
			DB_FIELD.PARENT_EMAIL +
			') VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)';
		return query;
	}

	function getUpdateQuery() {

		var query = 'UPDATE ' + TABLE_NAME + ' SET ' +
			DB_FIELD.STUDENT_ID + '=?, ' +
			DB_FIELD.CATEGORY_ID + '=?, ' +
			DB_FIELD.SECTION_ID + '=?, ' +
			DB_FIELD.NAME + '=?, ' +
			DB_FIELD.ROLL_NUMBER + '=?, ' +
			DB_FIELD.MOBILE + '=?, ' +
			DB_FIELD.EMAIL + '=?, ' +
			DB_FIELD.PARENT_MOBILE + '=?, ' +
			DB_FIELD.TELEGRAM + '=?, ' +
			DB_FIELD.PARENT_EMAIL +' =? WHERE ' +
			DB_FIELD.STUDENT_ID + '=' + getSelectedId();

		return query;
	}


	function onErrorFetchData( url, description, logData, flag ){

		var errorHandlerScript = ErrorHandlerScript.getInstance();
		errorHandlerScript.saveErrorData( "Student", url, "", description, logData, flag, null );
	}

	// --------------------------------------------------
	// WHY: Previously, this function fetched the preview
	// record over the network or from SQLite - neither exists
	// in this PWA. This mirrors getData()/parseFormDataResponse()
	// above, which use the same DataService.getRecordById() call
	// for the Edit form.
	// WHAT: asks DataService for the single Student being
	// previewed and hands it to parsePreviewResponse().
	// WHEN: runs when the user opens the Info/Preview popup
	// for a specific Student.
	// --------------------------------------------------

	function onInfoViewDocumentReady() {

		// MENTOR NOTE (added): wire up the new Copy button every
		// time the Info popup opens, same off()/on() pattern
		// used for every other button in this file.
		$( '#copy_student_details' ).off().on( 'click', function() {

			copyStudentDetails();
		});

		// Phase 6 (Share feature) - same off()/on() binding pattern as
		// the Copy button above.
		$( '#share_student_details' ).off().on( 'click', function() {

			shareStudentDetails();
		});

		DataService.getRecordById(

			AppConfig.STORES.STUDENT,

			getSelectedId(),

			function( objStudent ) {

				if( objStudent ) {

					parsePreviewResponse( [ objStudent ] );
				}
			},

			function( objError ) {

				CommonUtils.logError( "Student.script.js (onInfoViewDocumentReady)", objError );
				hideLoader();
				CommonUtils.showAlert( "Unable to load Student." );
			}
		);
	}

	function parsePreviewResponse( arrStudent ) {

		var arrStudentRows = [];

		for( var i = 0; i < arrStudent.length; i++ ) {

			var objStudent = arrStudent[ i ];

			var arrRow = [];
			arrRow[ INDEX.STUDENT_ID ] = objStudent.student_id;
			arrRow[ INDEX.CATEGORY_ID ] = objStudent.category_id;
			arrRow[ INDEX.SECTION_ID ] = objStudent.section_id;
			arrRow[ INDEX.NAME ] = objStudent.name;
			arrRow[ INDEX.MOBILE ] = objStudent.mobile;
			arrRow[ INDEX.EMAIL ] = objStudent.email;
			arrRow[ INDEX.TELEGRAM ] = objStudent.telegram;
			// NOTE: roll_number, parent_mobile, parent_email have no
			// matching column on the Student Google Sheet (documented
			// in DataService.js's STUDENT toBackendFields comment), so
			// objStudent never carries them back from Google - they
			// stay undefined here until the Sheet/Student.gs gains
			// those columns.

			arrStudentRows.push( arrRow );
		}

		// WHY/WHAT: same object -> array-row bridge as
		// parseFormDataResponse() above, so the Info popup's
		// setPreview() can actually find the record.
		setStorageData( arrStudentRows, SESSION_OBJECT.STUDENT_DATA );

		setPreview();
	}

	// onClick List item detail view
	function setPreview() {

		var data =  getSelectedData();

		mInfoIconClicked = false;
		mEditIconClicked = false;
		mShareIconClicked = false; // ADDED: keep the new flag in sync with the other two

		/**
		 * MENTOR NOTE (fixed) - Proper name sequence/ordering
		 *
		 * Why: the popup header's #lbl_first_name / #lbl_last_name
		 * spans were never populated by anything, so the bold
		 * name at the top of the Student Info card was always
		 * blank - only the "Name: ..." row further down ever
		 * showed a value.
		 * What: the Student record only has a single Name field
		 * (no separate first/last columns on the Student Sheet),
		 * so this splits it on the first space purely for this
		 * header display - the underlying data/record shape is
		 * unchanged everywhere else.
		 */
		var strFullName = data[ INDEX.NAME ] || "";
		var numFirstSpace = strFullName.indexOf( " " );
		var strFirstName = ( numFirstSpace === -1 ) ? strFullName : strFullName.substring( 0, numFirstSpace );
		var strLastName = ( numFirstSpace === -1 ) ? "" : strFullName.substring( numFirstSpace + 1 );

		$( FORM_FIELD_INFO.LBL_FIRST_NAME ).text( strFirstName );
		$( FORM_FIELD_INFO.LBL_LAST_NAME ).text( strLastName );

		// --------------------------------------------------
		// Improvements Made: this used to show the raw numeric
		// category_id/section_id (e.g. "2") instead of the actual
		// Category/Section name (e.g. "Science") - the same
		// CATEGORY_LIST/SECTION_LIST already cached in storage by
		// loadCategoryList()/loadSectionList() (and already used
		// the same way by searchList()) is used here to resolve
		// the id to its name. Falls back to the raw id if the
		// list hasn't loaded yet or the id has no match, so
		// nothing regresses if either list is empty.
		// --------------------------------------------------
		var categoryName = getCategoryNameById( data[ INDEX.CATEGORY_ID ] );
		var sectionName = getSectionNameById( data[ INDEX.SECTION_ID ] );

		$(FORM_FIELD_INFO.LBL_STUDENT_ID).text( data[INDEX.STUDENT_ID] );
		$(FORM_FIELD_INFO.LBL_CATEGORY_ID).text( categoryName );
		$(FORM_FIELD_INFO.LBL_SECTION_ID).text( sectionName );
		$(FORM_FIELD_INFO.LBL_NAME).text( data[INDEX.NAME] );
		$(FORM_FIELD_INFO.LBL_ROLL_NUMBER).text( data[INDEX.ROLL_NUMBER] );
		$(FORM_FIELD_INFO.LBL_MOBILE).text( data[INDEX.MOBILE] );
		$(FORM_FIELD_INFO.LBL_EMAIL).text( data[INDEX.EMAIL] );
		$(FORM_FIELD_INFO.LBL_PARENT_MOBILE).text( data[INDEX.PARENT_MOBILE] );
		$(FORM_FIELD_INFO.LBL_TELEGRAM).text( data[INDEX.TELEGRAM] );
		$(FORM_FIELD_INFO.LBL_PARENT_EMAIL).text( data[INDEX.PARENT_EMAIL] );

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

	// Looks up a Category's name from its id using the CATEGORY_LIST
	// already cached in storage by loadCategoryList(). Falls back to
	// the raw id itself if the list is empty or has no match, so the
	// popup always shows something rather than a blank field.
	function getCategoryNameById( categoryId ) {

		var categoryList = getStorageData( SESSION_OBJECT.CATEGORY_LIST ) || [];

		for( var i = 0; i < categoryList.length; i++ ) {

			if( categoryList[ i ][ CategoryScript.INDEX.CATEGORY_ID ] == categoryId ) {

				return categoryList[ i ][ CategoryScript.INDEX.NAME ];
			}
		}

		return categoryId;
	}

	// Same idea as getCategoryNameById(), for Sections.
	function getSectionNameById( sectionId ) {

		var sectionList = getStorageData( SESSION_OBJECT.SECTION_LIST ) || [];

		for( var i = 0; i < sectionList.length; i++ ) {

			if( sectionList[ i ][ SectionScript.INDEX.SECTION_ID ] == sectionId ) {

				return sectionList[ i ][ SectionScript.INDEX.NAME ];
			}
		}

		return sectionId;
	}

	/**
	 * MENTOR NOTE (added) - Copy student details
	 *
	 * Copies the Student Info popup's currently displayed
	 * fields to the clipboard as plain text, so a parent's
	 * mobile number, email, etc. can be pasted elsewhere
	 * without retyping. Reads straight from the labels
	 * setPreview() already populated above - no separate
	 * data fetch, so it can never show stale/different data
	 * than what's on screen.
	 *
	 * Parameters:
	 *   None
	 *
	 * Returns:
	 *   Nothing
	 */
	// Phase 6 (Share feature) - pulled the text-building lines out of
	// copyStudentDetails() into their own function so shareStudentDetails()
	// below can reuse the exact same text instead of duplicating it.
	function getStudentDetailsText() {

		return "Name: " + $( FORM_FIELD_INFO.LBL_NAME ).text() + "\n" +
			"Roll Number: " + $( FORM_FIELD_INFO.LBL_ROLL_NUMBER ).text() + "\n" +
			"Mobile: " + $( FORM_FIELD_INFO.LBL_MOBILE ).text() + "\n" +
			"Email: " + $( FORM_FIELD_INFO.LBL_EMAIL ).text() + "\n" +
			"Parent Mobile: " + $( FORM_FIELD_INFO.LBL_PARENT_MOBILE ).text() + "\n" +
			"Telegram: " + $( FORM_FIELD_INFO.LBL_TELEGRAM ).text() + "\n" +
			"Parent Email: " + $( FORM_FIELD_INFO.LBL_PARENT_EMAIL ).text();
	}

	function copyStudentDetails() {

		var strDetails = getStudentDetailsText();

		if( navigator.clipboard && navigator.clipboard.writeText ) {

			navigator.clipboard.writeText( strDetails ).then( function() {

				CommonUtils.showAlert( "Student details copied.", "success" );

			}, function( objError ) {

				CommonUtils.logError( "Student.script.js (copyStudentDetails)", objError );
				CommonUtils.showAlert( "Could not copy details." );
			});
		}
		else {

			// Fallback for browsers/contexts without the async
			// Clipboard API (e.g. older WebViews).
			var elmTemp = document.createElement( "textarea" );
			elmTemp.value = strDetails;
			elmTemp.style.position = "fixed";
			elmTemp.style.opacity = "0";
			document.body.appendChild( elmTemp );
			elmTemp.focus();
			elmTemp.select();

			try {

				document.execCommand( "copy" );
				CommonUtils.showAlert( "Student details copied.", "success" );
			}
			catch( objError ) {

				CommonUtils.logError( "Student.script.js (copyStudentDetails)", objError );
				CommonUtils.showAlert( "Could not copy details." );
			}

			document.body.removeChild( elmTemp );
		}
	}

	// Phase 6 (Share feature) - reuses the exact same text
	// copyStudentDetails() copies, just handed to
	// CommonUtils.shareContent() (Web Share API, with the same
	// clipboard-copy fallback) instead of always copying.
	function shareStudentDetails() {

		var strName = $( FORM_FIELD_INFO.LBL_NAME ).text() || "Student";

		CommonUtils.shareContent(
			"Student: " + strName,
			getStudentDetailsText()
		);
	}

	function doFilterStudentList() {

		clearSearch();
		
		var list = getStorageData( SESSION_OBJECT.STUDENT_SUMMARY_DATA );

		var categoryId = parseInt( $('#filter_category_id').val() );
		var categoryName = $( "#filter_category_id option:selected" ).text();


		var sectionId = parseInt( $('#filter_section_id').val() );
		var sectionName = $( "#filter_section_id option:selected" ).text();


		// Set selected Ids to Session storage
		sessionStorage.setItem( SESSION_OBJECT.CATEGORY_ID, categoryId );

		sessionStorage.setItem( SESSION_OBJECT.SECTION_ID, sectionId );

		if( list == null || list.length <= 0 ){

			showFilteredList( "" );
		}
		else if(  categoryId == 0  && sectionId == 0 ){

			showFilteredList( list );
		}
		else {

			var data = [];

			data = list.filter( item =>  
				( (categoryId > 0)? item[SUMMARY_INDEX.CATEGORY_ID] == categoryId : ( item[SUMMARY_INDEX.CATEGORY_ID] != categoryId || item[SUMMARY_INDEX.CATEGORY_ID] == 0 ) ) &&
				( (sectionId > 0)? item[SUMMARY_INDEX.SECTION_ID] == sectionId : ( item[SUMMARY_INDEX.SECTION_ID] != sectionId || item[SUMMARY_INDEX.SECTION_ID] == 0 ) )
			);
			
			showFilteredList( data );
		}
		


		showFilterInfo( categoryName, sectionName );
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
			htmlContent = CommonUtils.getEmptyStateHtml( "Students", "fa-solid fa-users" );
		}

		for( var i = 0; i < response.length; i++ ) {

			var data = response[ i ];

			htmlContent += createHtmlListItem( data, i );
		}

		// --------------------------------------------------
		// PAGINATION FIX (this pass): appends a Prev/Next bar
		// (buildPaginationBarHtml()/bindPaginationBarListeners()
		// below, same pattern as Category.script.js) - there was
		// no pagination control anywhere on this page before,
		// which combined with the parseListResponse() bug fixed
		// above meant paging past page 1 was impossible no matter
		// how many Students existed. Shows the real backend-
		// reported total (mTotalRecords - see parseListResponse())
		// instead of comparing this page's length against a
		// stored "full table" that was never actually being kept
		// up to date with the real total.
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



	function showFilter() {

		var categoryList = getStorageData( SESSION_OBJECT.CATEGORY_LIST );
		setCategoryFilterSelection( categoryList );

		var sectionList = getStorageData( SESSION_OBJECT.SECTION_LIST );
		setSectionFilterSelection( sectionList );

		openFilterMenu();
	}

	function setCategoryFilterSelection( categoryList ) {

		var selectedId = getFilterSelectionIds( SESSION_OBJECT.CATEGORY_ID );

		var categoryScript = CategoryScript.getInstance();
		categoryScript.populateSelection( categoryList, '#filter_category_id', selectedId );
	}

	function setSectionFilterSelection( sectionList ) {

		var selectedId = getFilterSelectionIds( SESSION_OBJECT.SECTION_ID );

		var sectionScript = SectionScript.getInstance();
		sectionScript.populateSelection( sectionList, '#filter_section_id', selectedId );
	}

	function showFilterInfo( categoryName, sectionName ) {

		$( '#show_all_div' ).show();
		var categoryText = '';
		$( '#category_name_div' ).hide();
		if( categoryName !== "Select All" && categoryName != null ){

			categoryText = categoryName;
			$( '#show_all_div' ).hide();
			$( '#category_name_div' ).show();
		}

		var sectionText = '';
		$( '#section_name_div' ).hide();
		if( sectionName !== "Select All" && sectionName != null ){

			sectionText = sectionName;
			$( '#show_all_div' ).hide();
			$( '#section_name_div' ).show();
		}

		$( "#category_name" ).text( categoryText );
		$( "#section_name" ).text( sectionText );
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

		sessionStorage.removeItem( SESSION_OBJECT.CATEGORY_ID );
		$( '#filter_category_id' ).val( 0 );


		sessionStorage.removeItem( SESSION_OBJECT.SECTION_ID );
		$( '#filter_section_id' ).val( 0 );


	}

	function populateSelection( listData, formField, selectedValueId ) {

		if( listData == null ) {
			listData = [];
		}

		$(formField).empty(); //remove all child nodes

		var newOption = $('<option value="0" >Select Student</option>');
		if( formField === '#filter_student_id' ) { // For filter we will show "Select All" as an option

			newOption = $( '<option value="0" >Select All</option>' );
		}

		$(formField).append( newOption );
		$(formField).trigger( "chosen:updated" );
		for( var index = 0; index < listData.length; index++ ) {

			var id = listData[ index ][ INDEX.STUDENT_ID ];
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
	// Show Student info on click of info icon in the list item
	function onClickInfoIcon( index ){

		mInfoIconClicked = true;

		var selectedData = mSelectedDataList[ index ];

		var id = selectedData[ SUMMARY_INDEX.STUDENT_ID ];
		sessionStorage.setItem( SESSION_OBJECT.STUDENT_ID, id );

		// Phase 2 (Recent Activity): log this as a "Student
		// viewed" entry. typeof-guarded so this page still works
		// even if activity.js hasn't loaded for some reason.
		if( typeof ActivityLog !== "undefined" ) {

			var strViewedName = selectedData[ SUMMARY_INDEX.NAME ] || "Student";
			ActivityLog.logActivity( "Viewed " + strViewedName );
		}

		// --------------------------------------------------
		// Phase 1 (Student Details loading speed): open the
		// popup and show a "Loading..." state IMMEDIATELY,
		// before onInfoViewDocumentReady()'s fetch even starts.
		// Previously the popup opened with either blank fields
		// or the PREVIOUS student's still-visible data, and only
		// swapped to the real record about a second later once
		// DataService.getRecordById() resolved - which is what
		// looked like "blank header, blank form, then suddenly
		// the student appears". Now: open -> Loading -> fetch ->
		// fill controls, instead of fetch -> open -> fill.
		// --------------------------------------------------
		showInfoPopupLoadingState();

		openListDetailsPopup();
		onInfoViewDocumentReady();
	}



	/* ==========================================================
	   Show Info Popup Loading State

	   Blanks out the Student Info popup's header name and every
	   detail row to a plain "Loading..." placeholder. Called
	   right before the popup opens, so there is never a moment
	   where the previous student's data (or empty fields with no
	   explanation) is visible while the new record is still being
	   fetched.
	   ========================================================== */

	function showInfoPopupLoadingState() {

		$( FORM_FIELD_INFO.LBL_FIRST_NAME ).text( "Loading..." );
		$( FORM_FIELD_INFO.LBL_LAST_NAME ).text( "" );

		$( FORM_FIELD_INFO.LBL_STUDENT_ID ).text( "..." );
		$( FORM_FIELD_INFO.LBL_CATEGORY_ID ).text( "..." );
		$( FORM_FIELD_INFO.LBL_SECTION_ID ).text( "..." );
		$( FORM_FIELD_INFO.LBL_NAME ).text( "..." );
		$( FORM_FIELD_INFO.LBL_ROLL_NUMBER ).text( "..." );
		$( FORM_FIELD_INFO.LBL_MOBILE ).text( "..." );
		$( FORM_FIELD_INFO.LBL_EMAIL ).text( "..." );
		$( FORM_FIELD_INFO.LBL_PARENT_MOBILE ).text( "..." );
		$( FORM_FIELD_INFO.LBL_TELEGRAM ).text( "..." );
		$( FORM_FIELD_INFO.LBL_PARENT_EMAIL ).text( "..." );

		$( '#preview_image_div' ).hide();
		$( '#preview_doc_div' ).hide();
	}

	// Open Edit Student on click of edit icon in the list item
	function onClickEditIcon( index, objEvent ) {

		// FIX: stop this click from bubbling up to the card's own
		// delegated click handler ($("#list_id").on("click","ul",...)
		// in onListDocumentReady()), so tapping Edit can never be
		// intercepted by the card's "open select menu" behavior.
		// Kept alongside the existing mEditIconClicked flag (used by
		// onSingleClickListener() as a second guard) rather than
		// replacing it.
		if( objEvent ) {

			objEvent.stopPropagation();
		}

		mEditIconClicked = true;

		var selectedData = mSelectedDataList[ index ];

		var id = selectedData[ SUMMARY_INDEX.STUDENT_ID ];
		sessionStorage.setItem( SESSION_OBJECT.STUDENT_ID, id );

		sessionStorage.setItem( SESSION_OBJECT.ADD_EDIT_MODE, UPDATE_DATA );
		$('#edit_details_title').text( 'Edit Student' );
		openEditDetailsPopup();
		onAddEditDocumentReady();
	}

	
	function onClickShareIcon( index, objEvent ) {

		// FIX: stop this click from bubbling up to the card's own
		// delegated click handler, same reasoning as onClickEditIcon()
		// above - kept alongside the existing mShareIconClicked flag
		// rather than replacing it.
		if( objEvent ) {

			objEvent.stopPropagation();
		}

		// ADDED: stops onSingleClickListener() from also opening the
		// Select Option popup right after this Share tap. Share has
		// no popup-close event to reset this on (unlike Edit/Info),
		// so it is cleared again on the very next tick - just long
		// enough to suppress the one delegated click that bubbles up
		// from this same tap.
		mShareIconClicked = true;
		setTimeout( function() { mShareIconClicked = false; }, 0 );

		var selectedData = mSelectedDataList[ index ];

		if( !selectedData ) {

			return;
		}

		var strName = selectedData[ SUMMARY_INDEX.NAME ] || "Student";
		var strEmail = selectedData[ SUMMARY_INDEX.EMAIL ] || "";
		var strMobile = selectedData[ SUMMARY_INDEX.MOBILE ] || "";
		var strRollNumber = selectedData[ SUMMARY_INDEX.ROLL_NUMBER ] || "";

		var strDetails =
			"Name: " + strName + "\n" +
			( strRollNumber ? ( "Roll Number: " + strRollNumber + "\n" ) : "" ) +
			( strMobile ? ( "Mobile: " + strMobile + "\n" ) : "" ) +
			( strEmail ? ( "Email: " + strEmail ) : "" );

		CommonUtils.shareContent( "Student: " + strName, strDetails );
	}

	// Start - Share Student data
	function onClickShare(){

		var messageTitle = "Confirm";

		// MENTOR NOTE (fixed) - Singular/plural grammar: mMultiSelect
		// tells us whether more than one Student is selected.
		var strStudentWord = ( mMultiSelect === true ) ? "Students" : "Student";
		var message = "Do you want to share " + strStudentWord + "?";
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

		// MENTOR NOTE (fixed) - Singular/plural grammar, same as
		// onClickShare() above.
		var subject = ( mMultiSelect === true ) ? "Students" : "Student";
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

		var strName = selectedData[ SUMMARY_INDEX.NAME ] || "";
		var strRollNumber = selectedData[ SUMMARY_INDEX.ROLL_NUMBER ] || "";
		var strMobile = selectedData[ SUMMARY_INDEX.MOBILE ] || "";
		var strEmail = selectedData[ SUMMARY_INDEX.EMAIL ] || "";

		if( mShareMode == MODE_SHARE_EMAIL ){ // Share by EMAIL

			resultText += seqNumber + ") " + strName + "<br>";
			resultText += "Roll Number: " + strRollNumber + "<br>";
			resultText += "Mobile: " + strMobile + "<br>";
			resultText += "Email: " + strEmail + "<br><br>";
		}
		else { // Share by WhatsApp

			resultText += "_*" + seqNumber + ") " + strName + "*_\n";
			resultText += "Roll Number: " + strRollNumber + "\n";
			resultText += "Mobile: *" + strMobile + "*\n";
			resultText += "Email: " + strEmail + "\n\n";
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
			createTableStudent: createTableStudent,
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