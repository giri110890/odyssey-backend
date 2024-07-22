const  { getPermissionsByRole } = require( "./permission_by_roles");

const perms = require( './permissions' );
const {validate, buildPermissionsToken} = require( './permission_validator' );
const auth = require('../auth_validator');
const jose = require('jose');
const config = require('../../../../config/config');
const { arrayEquals } = require('../../../utils/array_utils');

describe('validate required permissions against current permissions', () => {
 describe('validate permission function', () => {
     it('should return true if the current permissions satisfy the required permissions', () => {
        
         const result1 = validate([perms.AccessPermission.Read, perms.AccessPermission.Write], perms.AccessPermission.Read | perms.AccessPermission.Write);
         expect(result1).toBe(true);

         const result2 = validate([perms.AccessPermission.Create, perms.AccessPermission.Delete], perms.AccessPermission.Create | perms.AccessPermission.Delete);
         expect(result2).toBe(true);
     });

     it('should return false if the current permissions do not satisfy the required permissions', () => {

         const result1 = validate([perms.AccessPermission.Update, perms.AccessPermission.Admin], perms.AccessPermission.Create | perms.AccessPermission.Delete);
         expect(result1).toBe(false);

         const result2 = validate([perms.AccessPermission.Read, perms.AccessPermission.Write], perms.AccessPermission.Create | perms.AccessPermission.Delete);
         expect(result2).toBe(false);
     });

     it('should return false if the current permissions are undefined', () => {

      const result1 = validate([perms.AccessPermission.Update, perms.AccessPermission.Admin], undefined);
      expect(result1).toBe(false);

     });
 });

});

describe('Create Permissions JWT', () => {

  it('create jwt for user with tenant access', async () => {
    const access_data = { user_id: '1234', access: [perms.AccessRoles.Tenant] };
    const token = await buildPermissionsToken(access_data);

    // const result = jose.decodeProtectedHeader(token);
    const claims = jose.decodeJwt(token);

    // Verify the token

    expect(claims.user_id).toBe(access_data.user_id);
    
    // Verify the token with the public key.
    let public_key_config = config.permissions.public_keys[config.permissions.public_keys.kid];
    const public_key = await jose.importSPKI(public_key_config.pem, public_key_config.alg);
    const result = await jose.jwtVerify(token, public_key);
    expect(result.payload.user_id).toBe('1234');
    expect(arrayEquals(result.payload.permissions, getPermissionsByRole([perms.AccessRoles.Tenant]))).toBe(true);
    expect(result.protectedHeader.alg).toBe(public_key_config.alg);
  });

});
