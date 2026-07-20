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

// FileName CategoryHTML.script.js: Category Javascript file for Cordova project

// Author : JRC
// Description : codegen


////////////////////////////////////////////////////////////////////////////


// used to upload files
var mFile = null;

function onBackPress() {

	// CONNECTION FIX: "backbutton" is a Cordova-only event and
	// never fires in a browser or an installed PWA, so
	// onBackKeyDown() below never ran when the mobile back
	// button (or a desktop browser's Back) was pressed. The real
	// mobile/browser equivalent is the standard "popstate" event
	// - see the identical fix and full explanation in
	// StudentHTML.script.js/onBackPress(). onBackPress() and
	// onBackKeyDown() themselves are unchanged.
	history.pushState( { app: true }, "" );

	window.addEventListener( "popstate", function () {

		onBackKeyDown();

		history.pushState( { app: true }, "" );
	});
}

function onBackKeyDown() {

	var categoryScript = CategoryScript.getInstance();
	categoryScript.onClickListBackButton();

}

// Wait for device API libraries to load
//
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
	setErrorHandler( "Category" );

	$(".main-container").prepend( categorySearchBar );
	$(".main-container").prepend( categoryHeader );

	$("#activity_title").text( "Category" );

	// Filter
	addFilter();

	if( getAppMode() == MODE_LOCAL_DB ){

		// Open local database : we should call it in every page. Can't keep globally
		openDatabase();
	}

	var categoryScript = CategoryScript.getInstance();

	categoryScript.bindFormEventHandlers();

	// Hide Banner Ads
	// hideBanner();

	categoryScript.onListDocumentReady();
}


// Callback after successful image file upload
function onFileUploadSuccess() {

	var categoryScript = CategoryScript.getInstance();

	if( mFile != null && mUploadedFiles.length == 0 ) {

		categoryScript.uploadDocuments();
	}
	else {

		categoryScript.onConfirmNetworkSaveData();
	}
}

function addFilter(){
	
	var filterParms = `
		<div class="filter-items filter-params" id="show_all_div">
			<h6 class="filter-items">All</h6>
		</div>
		<div class="filter-items filter-params" id="organization_name_div" style="display:none">
			<h6 id="organization_name" class="filter-items"></h6>
		</div>
	`;
	
	$("#filter_params").prepend( filterParms );
}

// Header for html list
var categoryHeader = `	<!-- header -->
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
		<li id="btn_add" class="float-right">
			<a href="#" class="header-icons-L">
			<i class="fas fa-plus"></i>
			</a>
		</li>
		<!-- Add Details Button -->
		<!-- Share Button (UI/UX POLISH PASS, this pass) - see
		     StudentHTML.script.js's studentHeader for the full WHY. -->
		<li id="btn_share_page" class="float-right" title="Share Category List">
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
var categorySearchBar = `	<!-- Search Bar-->
<div class="page-container" id="search_bar">
	<!-- Search Input -->
	<div class="form-group" style="margin: -8px;">
		<div class="input-group mb-4">
			<div class="input-group-prepend">
				<span class="input-group-text"><i class="fas fa-search"></i></span>
			</div>
			<input class="form-control" placeholder="Search" id="search" type="text">
		</div>
	</div>
	<!-- /Search Input -->
	<!-- Displaying number of Records in the list and filter parameters  -->
	<div class="row pt-2 mr-0 ml-0" style="width: 100%; max-height: 100px; min-height: max-content;">
		
		<div class="row" style="margin-left: 5px; margin-top: 3px; padding-bottom: 10px;">
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
					<li class="nav-item" id="category_show_info">
						<a class="nav-link">
						<i class="fa fa-info-circle text-info"></i> Show Info
						</a>
					</li>
					<li class="nav-item" id="category_add">
						<a class=" nav-link active">
						<i class="fa fa-plus-square text-info"></i> Add New Category
						</a>
					</li>
					<li class="nav-item"  id="category_edit">
						<a class="nav-link">
						<i class="fa fa-edit text-info"></i> Edit Category
						</a>
					</li>
					<li class="nav-item" id="category_delete">
						<a class="nav-link">
						<i class="fa fa-trash-alt text-info"></i> Delete Category
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
						<a class="nav-link " > <i class="fa fa-trash-alt text-info"></i> Delete Category(s)</a>
					</li>
					<li class="nav-item" id="multi_share">
						<a class="nav-link " > <i class="fas fa-share text-info"></i> Share Category(s)</a>
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