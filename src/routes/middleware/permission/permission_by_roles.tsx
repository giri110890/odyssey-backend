const { AccessPermission, AccessRoles } = require( '../../middleware/permission/permissions' );

export const Tenant: number = 
  // Add key-value pairs as needed
  AccessPermission.Read | 
  AccessPermission.Write
;

export const PropertyManager: number = 
  // Incorporate the items from Tenant map above
  Tenant |
  AccessPermission.Create |
  AccessPermission.Update |
  AccessPermission.Execute |
  AccessPermission.Manager
;

export const ShadowManager: number = 
  AccessPermission.Read |
  AccessPermission.Manager
;

export const CompanyAdmin: number =
  PropertyManager |
  AccessPermission.Delete |
  AccessPermission.Admin 
;

export const OdysseyAdmin: number =
    CompanyAdmin |
    AccessPermission.CrossCompany 
;

export const Auditor: number =
  AccessPermission.Read |
  AccessPermission.CrossCompany
;

export function convertToFrontendRole( role: AccessRoles){
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

export function getPermissionsByRole(roles: [AccessRoles]) {
  // Switch statement to choose which permissions map to return
  let bitmap = 0;
  roles.forEach((role) => {
    switch (role) {
      case AccessRoles.Tenant:
        bitmap = bitmap | Tenant;
        break;
      case AccessRoles.PropertyManager:
        bitmap = bitmap | PropertyManager;
        break;
      case AccessRoles.ShadowManager:
        bitmap = bitmap | ShadowManager;
        break;
      case AccessRoles.CompanyAdmin:
        bitmap = bitmap | CompanyAdmin;
        break;
      case AccessRoles.OdysseyAdmin:
        bitmap = bitmap | OdysseyAdmin;
        break;
      case AccessRoles.Auditor:
        bitmap = bitmap | Auditor;
        break;
    }
  })
  return bitmap;
}
