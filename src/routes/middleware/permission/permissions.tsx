enum AccessRoles {
    Tenant = 'Tenant',
    PropertyManager = 'PropertyManager',
    ShadowManager = 'ShadowManager',
    CompanyAdmin = 'CompanyAdmin',
    OdysseyAdmin = 'OdysseyAdmin',
    Auditor = 'Auditor',
};
  
enum AccessPermission {
    Read = 1,
    Write = 2,
    Update = 4,
    Delete = 8,
    Create = 16,
    Execute = 32,
    Admin = 64,
    CrossCompany = 128,
    Manager = 256,
}

module.exports = {
    AccessRoles,
    AccessPermission
}