/* ==========================================================
   Student Management System
   UserManagement.script.js

   Purpose:

   Admin-only User Management, embedded directly inside the
   Profile page (per the mentor's request - not a separate
   top-level module like Student/Category/Section/Result).
   Covers Add / Edit / Delete / View / Search / Export / Share /
   Activity Log for the Users sheet, going through Google Sheets
   only via the same generic DataService.getAllRecords() /
   addRecord() / updateRecord() / deleteRecord() every other
   module already uses (see AppConfig.STORES.USER in
   DataService.js's getEntityApiConfig()).

   Loaded on profile.html, after DataService.js / common.js /
   session.js / activity.js / Profile.script.js. Everything here
   is a no-op for a non-Admin user - initializeUserManagementSection()
   is the only thing this file runs, and it bails out immediately
   unless Session.getRole() === "Admin".

   Version: 1.0
   ========================================================== */

"use strict";

/* ==========================================================
   Get HTML Elements
   ========================================================== */

var sectionUserManagement = document.getElementById("userManagementSection");

var btnAddUser = document.getElementById("btnAddUser");
var btnExportUsers = document.getElementById("btnExportUsers");
var txtUserSearch = document.getElementById("txtUserSearch");

var listUserCards = document.getElementById("userCardList");

var userModalOverlay = document.getElementById("userModalOverlay");
var userModalTitle = document.getElementById("userModalTitle");
var groupUserPassword = document.getElementById("userPasswordGroup");

var txtUserUsername = document.getElementById("txtUserUsername");
var txtUserPassword = document.getElementById("txtUserPassword");
var txtUserFullName = document.getElementById("txtUserFullName");
var selUserRole = document.getElementById("selUserRole");
var selUserStatus = document.getElementById("selUserStatus");

var btnCloseUserModal = document.getElementById("btnCloseUserModal");
var btnCancelUserModal = document.getElementById("btnCancelUserModal");
var btnSaveUser = document.getElementById("btnSaveUser");


/* ==========================================================
   Module State

   arrAllUsers      : the last full list loaded from the
                      backend, used so Search can filter
                      in-memory without another network call
                      (same pattern as the Student/Category/
                      Section/Result list search fix).
   strEditingUserId : null while the modal is in "Add" mode,
                      otherwise the user_id currently being
                      edited.
   ========================================================== */

var arrAllUsers = [];
var strEditingUserId = null;



/* ==========================================================
   Initialize User Management Section

   Called once by Profile.script.js, after it has already
   confirmed the user is logged in. Does nothing at all for
   any role other than Admin, including leaving the section
   hidden (see the inline style="display:none" on the section
   in profile.html) so a Student never even sees it flash by.
   ========================================================== */

function initializeUserManagementSection()
{
    if (sectionUserManagement === null)
    {
        return;
    }

    if (Session.getRole() !== "Admin")
    {
        return;
    }

    sectionUserManagement.style.display = "";

    registerUserManagementEvents();

    loadUsersList();
}



/* ==========================================================
   Register Button / Input Events
   ========================================================== */

function registerUserManagementEvents()
{
    btnAddUser.onclick = openAddUserModal;

    btnExportUsers.onclick = exportUsersToCsv;

    /* Native "oninput" (not jQuery keyup) so paste/autofill are
       always caught - same fix already applied to Student/
       Category/Section/Result search boxes. */
    txtUserSearch.oninput = onUserSearchInput;

    btnCloseUserModal.onclick = closeUserModal;
    btnCancelUserModal.onclick = closeUserModal;

    btnSaveUser.onclick = onSaveUserClick;

    /* Clicking the dimmed backdrop (not the box itself) closes
       the modal, same convention as CommonUtils.showConfirmDialog. */
    userModalOverlay.onclick = function (objEvent)
    {
        if (objEvent.target === userModalOverlay)
        {
            closeUserModal();
        }
    };
}



/* ==========================================================
   Load the User List
   ========================================================== */

function loadUsersList()
{
    listUserCards.innerHTML = "<li class=\"activity-empty\">Loading users...</li>";

    DataService.getAllRecords(AppConfig.STORES.USER, function (arrRecords)
    {
        arrAllUsers = arrRecords || [];

        renderUserCards(arrAllUsers);
    },
    function (objError)
    {
        CommonUtils.showAlert((objError && objError.message) || "Could not load users.");

        listUserCards.innerHTML = "<li class=\"activity-empty\">Could not load users.</li>";
    });
}



/* ==========================================================
   Render User Cards

   Built with createElement/textContent (not innerHTML string
   concatenation) so a username or full name can never be
   interpreted as markup.
   ========================================================== */

function renderUserCards(arrUsers)
{
    listUserCards.innerHTML = "";

    if (!arrUsers || arrUsers.length === 0)
    {
        listUserCards.innerHTML = "<li class=\"activity-empty\">No users found.</li>";

        return;
    }

    for (var intIndex = 0; intIndex < arrUsers.length; intIndex++)
    {
        listUserCards.appendChild(buildUserCard(arrUsers[intIndex]));
    }
}



/* ==========================================================
   Build a Single User Card
   ========================================================== */

function buildUserCard(objUser)
{
    var liCard = document.createElement("li");
    liCard.className = "user-card";

    /* ---------- Avatar ---------- */

    var divAvatar = document.createElement("div");
    divAvatar.className = "user-card-avatar";
    divAvatar.textContent = (objUser.username || "?").substring(0, 2).toUpperCase();

    /* ---------- Main Info ---------- */

    var divInfo = document.createElement("div");
    divInfo.className = "user-card-info";

    var pUsername = document.createElement("p");
    pUsername.className = "user-card-username";
    pUsername.textContent = objUser.username || "(no username)";

    var pFullName = document.createElement("p");
    pFullName.className = "user-card-fullname";
    pFullName.textContent = objUser.fullName || "";

    var divBadges = document.createElement("div");
    divBadges.className = "user-card-badges";

    var spanRole = document.createElement("span");
    spanRole.className = "user-badge user-badge-role-" + (objUser.role || "Student").toLowerCase();
    spanRole.textContent = objUser.role || "Student";

    var spanStatus = document.createElement("span");
    spanStatus.className = "user-badge user-badge-status-" + (objUser.status || "Active").toLowerCase();
    spanStatus.textContent = objUser.status || "Active";

    divBadges.appendChild(spanRole);
    divBadges.appendChild(spanStatus);

    var pLastLogin = document.createElement("p");
    pLastLogin.className = "user-card-lastlogin";
    pLastLogin.textContent = "Last Login: " + formatUserLastLogin(objUser.lastLogin);

    divInfo.appendChild(pUsername);
    divInfo.appendChild(pFullName);
    divInfo.appendChild(divBadges);
    divInfo.appendChild(pLastLogin);

    /* ---------- Actions ---------- */

    var divActions = document.createElement("div");
    divActions.className = "user-card-actions";

    var btnEdit = document.createElement("button");
    btnEdit.type = "button";
    btnEdit.className = "user-card-action-btn";
    btnEdit.title = "Edit User";
    btnEdit.innerHTML = "<i class=\"fa-solid fa-pen\"></i>";
    btnEdit.onclick = function ()
    {
        openEditUserModal(objUser);
    };

    var btnShare = document.createElement("button");
    btnShare.type = "button";
    btnShare.className = "user-card-action-btn";
    btnShare.title = "Share User";
    btnShare.innerHTML = "<i class=\"fa-solid fa-share-nodes\"></i>";
    btnShare.onclick = function ()
    {
        onClickShareUser(objUser);
    };

    var btnDelete = document.createElement("button");
    btnDelete.type = "button";
    btnDelete.className = "user-card-action-btn user-card-action-delete";
    btnDelete.title = "Delete User";
    btnDelete.innerHTML = "<i class=\"fa-solid fa-trash-can\"></i>";
    btnDelete.onclick = function ()
    {
        onClickDeleteUser(objUser);
    };

    divActions.appendChild(btnEdit);
    divActions.appendChild(btnShare);
    divActions.appendChild(btnDelete);

    liCard.appendChild(divAvatar);
    liCard.appendChild(divInfo);
    liCard.appendChild(divActions);

    return liCard;
}



/* ==========================================================
   Format the Last Login Column For Display

   Reuses Profile.script.js's formatFriendlyDateTime() (already
   loaded on this same page) instead of duplicating date logic.
   lastLogin is blank for a user who has never logged in.
   ========================================================== */

function formatUserLastLogin(strLastLogin)
{
    if (!strLastLogin)
    {
        return "Never";
    }

    if (typeof formatFriendlyDateTime === "function")
    {
        return formatFriendlyDateTime(strLastLogin).replace("<br>", " ");
    }

    return String(strLastLogin);
}



/* ==========================================================
   Open the Modal in "Add User" Mode
   ========================================================== */

function openAddUserModal()
{
    strEditingUserId = null;

    userModalTitle.textContent = "Add User";

    txtUserUsername.value = "";
    txtUserUsername.disabled = false;

    groupUserPassword.style.display = "";
    txtUserPassword.value = "";

    txtUserFullName.value = "";
    selUserRole.value = "Student";
    selUserStatus.value = "Active";

    userModalOverlay.style.display = "flex";

    txtUserUsername.focus();
}



/* ==========================================================
   Open the Modal in "Edit User" Mode

   Username and Password are never editable here - username is
   permanent, and password can only be changed by the account
   owner from the Change Password form above (DataService.
   changePassword()), never by an Admin editing someone else's
   account.
   ========================================================== */

function openEditUserModal(objUser)
{
    strEditingUserId = objUser.user_id;

    userModalTitle.textContent = "Edit User";

    txtUserUsername.value = objUser.username || "";
    txtUserUsername.disabled = true;

    groupUserPassword.style.display = "none";
    txtUserPassword.value = "";

    txtUserFullName.value = objUser.fullName || "";
    selUserRole.value = objUser.role || "Student";
    selUserStatus.value = objUser.status || "Active";

    userModalOverlay.style.display = "flex";
}



/* ==========================================================
   Close the Modal
   ========================================================== */

function closeUserModal()
{
    userModalOverlay.style.display = "none";
}



/* ==========================================================
   Save (Add or Edit) the User Being Edited
   ========================================================== */

function onSaveUserClick()
{
    var strUsername = txtUserUsername.value.trim();
    var strFullName = txtUserFullName.value.trim();
    var strRole = selUserRole.value;
    var strStatus = selUserStatus.value;

    if (strEditingUserId === null)
    {
        addNewUser(strUsername, strFullName, strRole, strStatus);
    }
    else
    {
        saveEditedUser(strUsername, strFullName, strRole, strStatus);
    }
}



/* ==========================================================
   Add a New User
   ========================================================== */

function addNewUser(strUsername, strFullName, strRole, strStatus)
{
    var strPassword = txtUserPassword.value.trim();

    if (strUsername === "")
    {
        CommonUtils.showAlert("Please enter a username.");
        txtUserUsername.focus();
        return;
    }

    if (strPassword.length < 6)
    {
        CommonUtils.showAlert("Password must be at least 6 characters long.");
        txtUserPassword.focus();
        return;
    }

    if (strFullName === "")
    {
        strFullName = strUsername;
    }

    // CONFIRMATION FIX (this pass): brief requires a confirmation
    // before saving a User (Profile / Admin User Management) -
    // this used to save immediately once validation passed. Same
    // CommonUtils.showConfirmDialog() pattern already used for
    // Logout/Delete User/Save Settings/Change Password.
    CommonUtils.showConfirmDialog(
        "Add user \"" + strUsername + "\"?",
        "Save",
        "Cancel",
        "Add User"
    ).then(function (bConfirmed)
    {
        if (bConfirmed !== true)
        {
            return;
        }

        showLoader("Adding user...");

        DataService.addRecord(AppConfig.STORES.USER, {
            username: strUsername,
            password: strPassword,
            fullName: strFullName,
            role: strRole,
            status: strStatus
        },
        function ()
        {
            hideLoader();
            closeUserModal();

            CommonUtils.showAlert("User created successfully.", "success");

            ActivityLog.logActivity("Added User: " + strUsername);

            loadUsersList();
        },
        function (objError)
        {
            hideLoader();

            CommonUtils.showAlert((objError && objError.message) || "Could not add user.");
        });
    });
}



/* ==========================================================
   Save an Edited User
   ========================================================== */

function saveEditedUser(strUsername, strFullName, strRole, strStatus)
{
    if (strFullName === "")
    {
        CommonUtils.showAlert("Please enter a full name.");
        txtUserFullName.focus();
        return;
    }

    // CONFIRMATION FIX (this pass): same reasoning as addNewUser()
    // above - confirm before writing, not after.
    CommonUtils.showConfirmDialog(
        "Save changes to user \"" + strUsername + "\"?",
        "Save",
        "Cancel",
        "Save User"
    ).then(function (bConfirmed)
    {
        if (bConfirmed !== true)
        {
            return;
        }

        showLoader("Saving user...");

        DataService.updateRecord(AppConfig.STORES.USER, {
            user_id: strEditingUserId,
            username: strUsername,
            fullName: strFullName,
            role: strRole,
            status: strStatus
        },
        function ()
        {
            hideLoader();
            closeUserModal();

            CommonUtils.showAlert("User updated successfully.", "success");

            ActivityLog.logActivity("Edited User: " + strUsername);

            loadUsersList();
        },
        function (objError)
        {
            hideLoader();

            CommonUtils.showAlert((objError && objError.message) || "Could not update user.");
        });
    });
}



/* ==========================================================
   Delete a User (With Confirmation)
   ========================================================== */

function onClickDeleteUser(objUser)
{
    CommonUtils.showConfirmDialog(
        "Delete user \"" + objUser.username + "\"? This cannot be undone.",
        "Delete",
        "Cancel",
        "Delete User"
    ).then(function (bConfirmed)
    {
        if (bConfirmed !== true)
        {
            return;
        }

        showLoader("Deleting user...");

        DataService.deleteRecord(AppConfig.STORES.USER, objUser.user_id, function ()
        {
            hideLoader();

            CommonUtils.showAlert("User deleted.", "success");

            ActivityLog.logActivity("Deleted User: " + objUser.username);

            loadUsersList();
        },
        function (objError)
        {
            hideLoader();

            CommonUtils.showAlert((objError && objError.message) || "Could not delete user. The backend safeguard against deleting the last Admin may have blocked this.");
        });
    });
}



/* ==========================================================
   Share a User's Details

   Uses the native Web Share sheet when available (mobile/PWA),
   falls back to copying to the clipboard, and finally to just
   showing the details in a toast - so this always does
   something useful regardless of browser support.
   ========================================================== */

function onClickShareUser(objUser)
{
    var strShareText = "User: " + objUser.username +
        " | Role: " + objUser.role +
        " | Status: " + objUser.status;

    if (navigator.share)
    {
        navigator.share({ title: "User Details", text: strShareText }).catch(function () { });
    }
    else if (navigator.clipboard && navigator.clipboard.writeText)
    {
        navigator.clipboard.writeText(strShareText).then(function ()
        {
            CommonUtils.showAlert("User details copied to clipboard.", "success");
        });
    }
    else
    {
        CommonUtils.showAlert(strShareText, "info");
    }

    ActivityLog.logActivity("Shared User: " + objUser.username);
}



/* ==========================================================
   Live Search (Filters the Already-Loaded List)
   ========================================================== */

function onUserSearchInput()
{
    var strKeyword = txtUserSearch.value.toLowerCase().trim();

    if (strKeyword === "")
    {
        renderUserCards(arrAllUsers);
        return;
    }

    var arrFiltered = arrAllUsers.filter(function (objUser)
    {
        return (String(objUser.username || "").toLowerCase().indexOf(strKeyword) > -1) ||
               (String(objUser.fullName || "").toLowerCase().indexOf(strKeyword) > -1) ||
               (String(objUser.role || "").toLowerCase().indexOf(strKeyword) > -1) ||
               (String(objUser.status || "").toLowerCase().indexOf(strKeyword) > -1);
    });

    renderUserCards(arrFiltered);
}



/* ==========================================================
   Export Users to CSV

   Same Blob/createObjectURL download pattern as Student.
   script.js's exportStudentList(), and the same CSV escaping
   (wrap every value in quotes, double up any quotes already
   inside it).
   ========================================================== */

function exportUsersToCsv()
{
    if (!arrAllUsers || arrAllUsers.length === 0)
    {
        CommonUtils.showAlert("There are no users to export.");
        return;
    }

    var arrColumns = ["User ID", "Username", "Full Name", "Role", "Status", "Last Login"];

    var strCsv = arrColumns.join(",") + "\r\n";

    for (var intIndex = 0; intIndex < arrAllUsers.length; intIndex++)
    {
        var objUser = arrAllUsers[intIndex];

        var arrValues = [
            objUser.user_id,
            objUser.username,
            objUser.fullName,
            objUser.role,
            objUser.status,
            objUser.lastLogin
        ].map(function (mValue)
        {
            if (mValue === null || mValue === undefined)
            {
                mValue = "";
            }

            return "\"" + String(mValue).replace(/"/g, "\"\"") + "\"";
        });

        strCsv += arrValues.join(",") + "\r\n";
    }

    var objBlob = new Blob([strCsv], { type: "text/csv;charset=utf-8;" });
    var strUrl = window.URL.createObjectURL(objBlob);

    var elemLink = document.createElement("a");
    elemLink.href = strUrl;
    elemLink.download = "users_export_" + new Date().toISOString().slice(0, 10) + ".csv";

    document.body.appendChild(elemLink);
    elemLink.click();
    document.body.removeChild(elemLink);

    window.URL.revokeObjectURL(strUrl);

    ActivityLog.logActivity("Exported Users");

    CommonUtils.showAlert("Export completed successfully.", "success");
}