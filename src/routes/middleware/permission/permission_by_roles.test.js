"use strict";
const permss = require('./permissions');
const permission_by_roles = require('./permission_by_roles');
describe('validate', () => {
    it('should return 0 for an invalid role', () => {
        const result = permission_by_roles.getPermissionsByRole(['InvalidRole']);
        const expected = 0;
        expect(result).toBe(expected);
    });
    it('should return the right bitmap value for a valid role', () => {
        const result = permission_by_roles.getPermissionsByRole([permss.AccessRoles.Tenant]);
        const expected = permss.AccessPermission.Read | permss.AccessPermission.Write;
        expect(result).toBe(expected);
    });
    it('should return the combined value from multiple valid roles', () => {
        const result = permission_by_roles.getPermissionsByRole([permss.AccessRoles.Tenant, permss.AccessRoles.CompanyAdmin]);
        const expected = permss.AccessPermission.Read | permss.AccessPermission.Write | permss.AccessPermission.Delete | permss.AccessPermission.Admin | permss.AccessPermission.Create | permss.AccessPermission.Update | permss.AccessPermission.Execute | permss.AccessPermission.Manager;
        expect(result).toBe(expected);
    });
});
//# sourceMappingURL=permission_by_roles.test.js.map