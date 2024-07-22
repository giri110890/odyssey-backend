"use strict";
var AccessRoles;
(function (AccessRoles) {
    AccessRoles["Tenant"] = "Tenant";
    AccessRoles["PropertyManager"] = "PropertyManager";
    AccessRoles["ShadowManager"] = "ShadowManager";
    AccessRoles["CompanyAdmin"] = "CompanyAdmin";
    AccessRoles["OdysseyAdmin"] = "OdysseyAdmin";
    AccessRoles["Auditor"] = "Auditor";
})(AccessRoles || (AccessRoles = {}));
;
var AccessPermission;
(function (AccessPermission) {
    AccessPermission[AccessPermission["Read"] = 1] = "Read";
    AccessPermission[AccessPermission["Write"] = 2] = "Write";
    AccessPermission[AccessPermission["Update"] = 4] = "Update";
    AccessPermission[AccessPermission["Delete"] = 8] = "Delete";
    AccessPermission[AccessPermission["Create"] = 16] = "Create";
    AccessPermission[AccessPermission["Execute"] = 32] = "Execute";
    AccessPermission[AccessPermission["Admin"] = 64] = "Admin";
    AccessPermission[AccessPermission["CrossCompany"] = 128] = "CrossCompany";
    AccessPermission[AccessPermission["Manager"] = 256] = "Manager";
})(AccessPermission || (AccessPermission = {}));
module.exports = {
    AccessRoles,
    AccessPermission
};
//# sourceMappingURL=permissions.js.map