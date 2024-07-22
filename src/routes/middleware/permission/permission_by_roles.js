"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPermissionsByRole = exports.convertToFrontendRole = exports.Auditor = exports.OdysseyAdmin = exports.CompanyAdmin = exports.ShadowManager = exports.PropertyManager = exports.Tenant = void 0;
const { AccessPermission, AccessRoles } = require('../../middleware/permission/permissions');
exports.Tenant = 
// Add key-value pairs as needed
AccessPermission.Read |
    AccessPermission.Write;
exports.PropertyManager = 
// Incorporate the items from Tenant map above
exports.Tenant |
    AccessPermission.Create |
    AccessPermission.Update |
    AccessPermission.Execute |
    AccessPermission.Manager;
exports.ShadowManager = AccessPermission.Read |
    AccessPermission.Manager;
exports.CompanyAdmin = exports.PropertyManager |
    AccessPermission.Delete |
    AccessPermission.Admin;
exports.OdysseyAdmin = exports.CompanyAdmin |
    AccessPermission.CrossCompany;
exports.Auditor = AccessPermission.Read |
    AccessPermission.CrossCompany;
function convertToFrontendRole(role) {
    switch (role) {
        case AccessRoles.Tenant:
            return "tenant";
        case AccessRoles.PropertyManager:
            return "property_manager";
        case AccessRoles.ShadowManager:
            return "ShadowManager";
        case AccessRoles.CompanyAdmin:
            return "Company Admin";
        case AccessRoles.OdysseyAdmin:
            return "Odyssey Admin";
        case AccessRoles.Auditor:
            return "Auditor";
    }
}
exports.convertToFrontendRole = convertToFrontendRole;
function getPermissionsByRole(roles) {
    // Switch statement to choose which permissions map to return
    let bitmap = 0;
    roles.forEach((role) => {
        switch (role) {
            case AccessRoles.Tenant:
                bitmap = bitmap | exports.Tenant;
                break;
            case AccessRoles.PropertyManager:
                bitmap = bitmap | exports.PropertyManager;
                break;
            case AccessRoles.ShadowManager:
                bitmap = bitmap | exports.ShadowManager;
                break;
            case AccessRoles.CompanyAdmin:
                bitmap = bitmap | exports.CompanyAdmin;
                break;
            case AccessRoles.OdysseyAdmin:
                bitmap = bitmap | exports.OdysseyAdmin;
                break;
            case AccessRoles.Auditor:
                bitmap = bitmap | exports.Auditor;
                break;
        }
    });
    return bitmap;
}
exports.getPermissionsByRole = getPermissionsByRole;
//# sourceMappingURL=permission_by_roles.js.map