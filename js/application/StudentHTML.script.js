////////////////////////////////////////////////////////////////////////////

/* ==========================================================
   ROUND 2 FIX - Invisible action-menu popup titles
   ----------------------------------------------------------

   "Select an Option" / "Select an option" / "Share by" titles
   had an inline style="color: var(--app-theme-color)" on the
   <h2>. common.css also paints .modal-header's BACKGROUND with
   that same --app-theme-color variable, so the title text was
   the same color as the bar behind it - effectively invisible
   (this is the blank blue header seen in the Show Info / Add /
   Edit / Delete popup). Removed the inline color so the title
   falls back to common.css's .modal-title { color: white; },
   which is readable against the theme-color header on every
   theme.
   ========================================================== */

// FileName StudentHTML.script.js: Student Javascript file for Cordova project

// Author : JRC
// Description : codegen


////////////////////////////////////////////////////////////////////////////

/* ==========================================================
   UI PASS - Student List search button + Export button
   ----------------------------------------------------------

   WHY: Student List was asked to match the search-bar layout
   used by Category/Section/Result, but with two additions that
   none of those three pages have: a real Search button sitting
   on the same line as the search input (the shared template
   only ever had a decorative, non-clickable search icon), and a
   clearly visible Export button for downloading the list.

   WHAT CHANGED: studentSearchBar below now has a
   <button id="search_icon"> inside the same .input-group as the
   #search input (so it renders inline, immediately to the right
   of the box), and a new #btn_export button in the records row.
   Both are wired up in Student.script.js/onListDocumentReady() -
   this file only builds the markup, exactly as it already did
   for the rest of studentSearchBar/studentHeader.

   Nothing here was renamed, and studentHeader/singleClickMenu/
   multi_select_modal/photo_modal/file_modal/shareMenu below are
   unchanged.
   ========================================================== */

/* ==========================================================
   Improvements Made - Duplicate search icon removed
   ----------------------------------------------------------
   studentSearchBar had two magnifying-glass icons sitting side
   by side: a purely decorative, non-clickable one in the
   input-group-prepend to the left of #search, and a second one
   inside the real #search_icon button to the right. Removed the
   decorative left-hand one so there is exactly one search input
   and one (functional) search button, per the "remove duplicate
   search control" requirement. #search_icon's click handler and
   ID are unchanged - only the dead decorative markup is gone.
   ========================================================== */


// used to upload files
var mFile = null;

function onBackPress() {

	// CONNECTION FIX: "backbutton" is a Cordova-only event and
	// never fires in a browser or an installed PWA, so
	// onBackKeyDown() below - which is supposed to close open
	// modals/multi-select first, and only fall through to
	// leaving the list when nothing else is open (see
	// StudentScript.onClickListBackButton) - never ran when the
	// mobile back button (or a desktop browser's Back) was
	// pressed; the browser just navigated on its own instead.
	// The real mobile/browser equivalent is the standard
	// "popstate" event. A history entry is pushed here so there
	// is always something to go "back" from, and it is re-pushed
	// after every popstate is handled so the same physical back
	// button keeps working for the next press instead of only
	// firing once. onBackPress() and onBackKeyDown() themselves
	// were left unchanged, and are still called the same way
	// from <body onload="onBackPress();"> and the header's
	// Back arrow (onClick="onBackKeyDown();") in studentList.html.
	history.pushState( { app: true }, "" );

	window.addEventListener( "popstate", function () {

		onBackKeyDown();

		history.pushState( { app: true }, "" );
	});
}

function onBackKeyDown() {

	var studentScript = StudentScript.getInstance();
	studentScript.onClickListBackButton();

}

// Wait for device API libraries to load
//
// CONNECTION FIX: this used to listen for Cordova's "deviceready"
// event, which is only ever fired by the native Cordova runtime
// and never fires in a regular browser/PWA, so onDeviceReady() -
// which binds every button on this page (Add, Refresh, Filter)
// and loads the Student list - was silently never running. This
// is the same fix already applied to CategoryHTML.script.js,
// SectionHTML.script.js and ResultHTML.script.js: swapped to the
// standard browser "DOMContentLoaded" event. The function name
// onDeviceReady() itself was left unchanged.
document.addEventListener( "DOMContentLoaded", onDeviceReady, false );

// device APIs are available
//
function getAppMode(){

	// Use local database
	// var mode = MODE_LOCAL_DB;

	// Use network database
	var mode = MODE_NETWORK_DB;

	return mode;
}

function onDeviceReady() {

	// If any error occur then add the error details into the error log
	setErrorHandler( "Student" );

	$(".main-container").prepend( studentSearchBar );
	$(".main-container").prepend( studentHeader );

	$("#activity_title").text( "Student" );

	// Filter
	addFilter();

	if( getAppMode() == MODE_LOCAL_DB ){

		// Open local database : we should call it in every page. Can't keep globally
		openDatabase();
	}

	var studentScript = StudentScript.getInstance();

	studentScript.bindFormEventHandlers();

	// Hide Banner Ads
	// hideBanner();

	studentScript.onListDocumentReady();
}


// Callback after successful image file upload
function onFileUploadSuccess() {

	var studentScript = StudentScript.getInstance();

	if( mFile != null && mUploadedFiles.length == 0 ) {

		studentScript.uploadDocuments();
	}
	else {

		studentScript.onConfirmNetworkSaveData();
	}
}

function addFilter(){
	
	var filterParms = `
		<div class="filter-items filter-params" id="show_all_div">
			<h6 class="filter-items">All</h6>
		</div>
		<div class="filter-items filter-params" id="category_name_div" style="display:none">
			<h6 id="category_name" class="filter-items"></h6>
		</div>
		<div class="filter-items filter-params" id="section_name_div" style="display:none">
			<h6 id="section_name" class="filter-items"></h6>
		</div>
	`;
	
	$("#filter_params").prepend( filterParms );
}

// Header for html list
var studentHeader = `	<!-- header -->
<div class="header" data-theme="a" style="position: fixed;" id="header_id">
	<ul class="header-items">
		<!-- Back Button -->
		<li>
			<a href="#" onClick="onBackKeyDown();" class="header-icons-L">
			<i class="fas fa-angle-left"></i>
			</a>
		</li>
		<!-- /Back Button -->
		<!-- Page Heading -->
		<span class="heading-text" id="activity_title"></span>
		<!-- Page Heading -->
		<!-- Add Details Button -->
		<li id="btn_add" class="float-right" title="Add New Student">
			<a href="#" class="header-icons-L">
			<i class="fas fa-plus"></i>
			</a>
		</li>
		<!-- Add Details Button -->
		<!-- Share Button (UI/UX POLISH PASS, this pass) - top AppBar
		     Share, same CommonUtils.shareContent() (Web Share API,
		     copy-link/export fallback) used by every per-card Share
		     button. Click handler bound in Student.script.js's
		     onListDocumentReady(). -->
		<li id="btn_share_page" class="float-right" title="Share Student List">
			<a href="#" class="header-icons-L">
			<i class="fa-solid fa-share-nodes"></i>
			</a>
		</li>
		<!-- /Share Button -->
		<!-- Refresh Button -->
		<li id="btn_refresh" class="float-right">
			<a href="#" class="header-icons-L">
			<i class="fas fa-redo-alt"></i>
			</a>
		</li>
		<!-- /Refresh Button -->
		
		<!-- Multi-select Menu Button -->
		<li class="float-right">
			<a href="#" id="btn_multiselect_option" class="header-icons-L" style="display: none;">
			<i class="fas fa-ellipsis-v"></i>
			</a>
		</li>
		<!-- /Multi-select Menu Button -->
		<!-- Select All Check Mark button -->
		<li class="float-right">
			<a href="#" id="btn_check_mark" class="header-icons-L" style="display: none;">
			<i class="fas fa-check"></i>
			</a>
		</li>
		<!-- /Select All Check Mark button -->
		<!-- Deselect All Uncheck Mark Button -->
		<li class="float-right">
			<a href="#" id="btn_un_check_mark" class="header-icons-L"
				style="display: none;">
			<i class="fas fa-times"></i>
			</a>
		</li>
		<!-- Deselect All Uncheck Mark Button -->
	</ul>
</div>
<!-- /header -->`;



// Search Bar for html list
var studentSearchBar = `	<!-- Search Bar-->
<div class="page-container" id="search_bar">
	<!-- Search Input -->
	<div class="form-group" style="margin: -8px;">
		<div class="input-group mb-4">
			<input class="form-control" placeholder="Search" id="search" type="text">
			<!-- Search Button: sits inside the same input-group as
			     #search, right next to the box, on the same line.
			     Click handler (searchList()) is bound in
			     Student.script.js/onListDocumentReady(). -->
			<div class="input-group-append">
				<button id="search_icon" class="btn btn-primary" type="button">
					<i class="fas fa-search"></i> Search
				</button>
			</div>
		</div>
	</div>
	<!-- /Search Input -->
	<!-- Displaying number of Records in the list and filter parameters  -->
	<div class="row pt-2 mr-0 ml-0" style="width: 100%; max-height: 100px; min-height: max-content;">
		
		<div class="row" style="margin-left: 5px; margin-top: 3px; padding-bottom: 10px; width: 100%; align-items: center;">
			<!-- Displaying number of records -->
			<h5 id="records" style="padding-top: 2px;"></h5>
			<!-- /Displaying number of records -->			
			<!-- Filter Button -->
			<a id="filter_icon" onclick="" class="header-icons-L" style="margin-left: 5px; margin-right: 5px;">
			<i class="fa fa-filter"></i>
			</a>
			<!-- /Filter Button -->
			<!-- Filter Parameters -->
			<div id="filter_params" style="display: flex;">
			</div>
			<!-- /Filter Parameters -->
			<!-- Export Button: larger and clearly visible, pushed to
			     the far right of the records row. Click handler
			     (exportStudentList()) is bound in
			     Student.script.js/onListDocumentReady(). -->
			<button id="btn_export" class="btn btn-success btn-export" type="button" style="margin-left: auto;">
				<i class="fas fa-file-export"></i> Export
			</button>
		</div>
		
	</div>
	<!-- /Displaying number of Records and filter parameters  -->
</div>
<!-- /Search Bar -->`;

var singleClickMenu = `	<!-- Single Click Menu -->
<div class="modal fade" id="modal_single_select" tabindex="-1" role="dialog" aria-labelledby="modal_single_select">
	<div class="modal-dialog modal-danger modal-dialog-centered modal-10" role="document">
		<div class="modal-content bg-white">
			<!-- Modal Header -->
			<div class="modal-header" style="border-bottom: solid; border-bottom-color: #dee2e6;">
				<h2 class="modal-title" id="modal_single_select_title">Select an Option</h2>
				<button type="button" class="close" data-dismiss="modal" aria-label="Close">
				<span aria-hidden="true" style="color: black; font-size: xx-large;">&times;</span>
				</button>
			</div>
			<!-- /Modal Header -->
			<!-- Modal Body -->
			<div class="modal-body" style="padding-top: 5px;">
				<ul class="navbar-nav">
					<li class="nav-item" id="student_show_info">
						<a class="nav-link">
						<i class="fa fa-info-circle text-info"></i> Show Info
						</a>
					</li>
					<!-- STUDENT ADD BUTTON FIX (Priority 3): the
					     "Add New Student" entry that used to be
					     here (id="student_add") has been removed.
					     This popup only ever opens after a specific
					     Student row has been tapped/selected (see
					     onSingleClickListener() in Student.script.js),
					     alongside that same Student's Show Info/Edit/
					     Delete actions - bundling "Add New Student"
					     into that per-Student menu made Add look like
					     it belonged to whichever Student was
					     currently selected. Add New Student now has
					     exactly one entry point: the "+" button in
					     the page header above (id="btn_add"), which
					     is not tied to any row selection. Student.script.js
					     also defensively hides #student_add if it is
					     ever reintroduced, but removing it here is the
					     real fix. -->
					<li class="nav-item"  id="student_edit">
						<a class="nav-link">
						<i class="fa fa-edit text-info"></i> Edit Student
						</a>
					</li>
					<li class="nav-item" id="student_delete">
						<a class="nav-link">
						<i class="fa fa-trash-alt text-info"></i> Delete Student
						</a>
					</li>
				</ul>
			</div>
			<!-- /Modal Body -->
			<!-- Modal Footer -->
			<div class="modal-footer" style="justify-content: center; padding: 0.5rem;"></div>
			<!-- /Modal footer -->
		</div>
		<!-- /modal-content -->
	</div>
	<!-- /modal-dialog -->
</div>
<!-- /modal -->
<!-- /Single Click Menu -->`;

var multi_select_modal = `
<!-- Multi Select Menu -->
<div class="modal fade" id="modal_multiselect" tabindex="-1" role="dialog" aria-labelledby="modal_multiselect">
	<div class="modal-dialog modal-danger modal-dialog-centered modal-10" role="document">
		<div class="modal-content bg-white">
			<!-- Modal Header -->
			<div class="modal-header" style="border-bottom: solid; border-bottom-color: #dee2e6;">
				<h2 class="modal-title" id="modal_multiselect_title">Select an Option</h2>
				<button type="button" class="close" data-dismiss="modal" aria-label="Close"> <span aria-hidden="true" style="color: black; font-size: xx-large;">&times;</span> </button>
			</div>
			<!-- /Modal Header -->
			<!-- Modal Body -->
			<div class="modal-body" style="padding-top: 5px;">
				<ul class="navbar-nav">
					<li class="nav-item" id="multi_delete">
						<a class="nav-link " > <i class="fa fa-trash-alt text-info"></i> Delete Student(s)</a>
					</li>
					<li class="nav-item" id="multi_share">
						<a class="nav-link " > <i class="fas fa-share text-info"></i> Share Student(s)</a>
					</li>
				</ul>
			</div>
			<!-- /Modal Body -->
			<!-- Modal Footer -->
			<div class="modal-footer" style="justify-content: center; padding: 0.5rem;"></div>
			<!-- /Modal Footer -->
		</div>
		<!-- /modal-content -->
	</div>
	<!-- /modal-dialog -->
</div>
<!-- /modal -->
<!-- Multi Select Menu -->`;


var photo_modal = `
<div class="modal fade" id="photo_select_modal" tabindex="-1" role="dialog" aria-labelledby="photo_select_modal">
	<div class="modal-dialog modal-danger modal-dialog-centered modal-10" role="document">
		<div class="modal-content bg-white">
			<div class="modal-header" style="border-bottom: solid; border-bottom-color: #dee2e6;">
				<h2 class="modal-title" id="photo_select_modal_title">Select an option</h2>
				<button type="button" class="close" data-dismiss="modal" aria-label="Close"> <span aria-hidden="true" style="color: black; font-size: xx-large;">&times;</span> </button>
			</div>
			<div class="modal-body" style="padding-top: 5px;">
				<ul class="navbar-nav">
					<li class="nav-item">
						<a class=" nav-link active" id="gallery_photo"> <i class="fa fa-images text-danger"></i> Gallery </a>
					</li>
					<li class="nav-item">
						<a class="nav-link " id="camera_photo"> <i class="fa fa-camera text-primary"></i> Camera </a>
					</li>
				</ul>
			</div>
			<div class="modal-footer" style="justify-content: center; padding: 0.5rem;"></div>
		</div>
	</div>
</div>`;

var file_modal = `
<div class="modal fade" id="file_select_modal" tabindex="-1" role="dialog" aria-labelledby="file_select_modal">
	<div class="modal-dialog modal-danger modal-dialog-centered modal-10" role="document">
		<div class="modal-content bg-white">
			<div class="modal-header" style="border-bottom: solid; border-bottom-color: #dee2e6;">
				<h2 class="modal-title" id="file_select_modal_title">Select an option</h2>
				<button type="button" class="close" data-dismiss="modal" aria-label="Close"> <span aria-hidden="true" style="color: black; font-size: xx-large;">&times;</span> </button>
			</div>
			<div class="modal-body" style="padding-top: 5px;">
				<ul class="navbar-nav">
					<li class="nav-item">
						<a class=" nav-link active" id="choose_file"> <i class="fa fa-images text-danger"></i> Choose File </a>
					</li>
				</ul>
			</div>
			<div class="modal-footer" style="justify-content: center; padding: 0.5rem;"></div>
		</div>
	</div>
</div>`;

var shareMenu = `	
<!-- Share Menu -->
<div class="modal fade" id="modal_share" tabindex="-1" role="dialog" aria-labelledby="modal_share">
	<div class="modal-dialog modal-danger modal-dialog-centered modal-10" role="document">
		<div class="modal-content bg-white">
			<!-- Modal Header -->
			<div class="modal-header" style="border-bottom: solid; border-bottom-color: #dee2e6;">
				<h2 class="modal-title" id="modal_share_title">Share by</h2>
				<button type="button" class="close" data-dismiss="modal" aria-label="Close">
				<span aria-hidden="true" style="color: black; font-size: xx-large;">�</span>
				</button>
			</div>
			<!-- /Modal Header -->

			<!-- Modal Body -->

			<div class="modal-body" style="padding-top: 5px;">
				<ul class="navbar-nav">
					<li class="nav-item" id="share_email">
						<a class="nav-link " >
						<i class="far fa-envelope text-info"></i> Email
						</a>
					</li>
					<li class="nav-item" id="share_whatsapp">
						<a class=" nav-link active" >
						<i class="fab fa-whatsapp text-info"></i> WhatsApp
						</a>
					</li>
				</ul>
			</div>
			<!-- /Modal Body -->

			<!-- Modal Footer -->
			<div class="modal-footer" style="justify-content: center; padding: 0.5rem;"></div>
			<!-- /Modal footer -->

		</div><!-- /modal-content -->
	</div><!-- /modal-dialog -->
</div><!-- /modal -->
<!-- /Share Menu -->`;