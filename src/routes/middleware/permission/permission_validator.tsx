const jose = require('jose');
const { getPermissionsByRole } = require( '../../middleware/permission/permission_by_roles' );
const { parseToken } = require('../auth_validator');
const config = require('../../../../config/config');

export function validate(required_permission: [AccessPermission], current_permissions: number): boolean {
  let bitmap = 0;

  required_permission.forEach((permission) => {
    bitmap = bitmap | permission;
  });

  // Return true if every required permission is currently satisfied.
  let result = (bitmap & current_permissions) === bitmap;
  return result;
}


export async function buildPermissionsToken( access_data: { user_id: string, access: AccessRoles[], options?: any } ) {
  
  const role_permissions = getPermissionsByRole(access_data.access);

  const permission_data = { user_id: access_data.user_id, permissions: role_permissions, options: access_data.options };

  const permissions_token = await signToken( permission_data );

  return permissions_token;
}

async function signToken( permission_data: { user_id: string, permissions: number } ) {
  
  var alg = config.permissions.private_key.alg;
  var pkcs8 = config.permissions.private_key.pkcs8;

  const privateKey = await jose.importPKCS8(pkcs8, alg)

  const jwt = await new jose.SignJWT(permission_data)
    .setProtectedHeader({ alg, kid: config.permissions.public_keys.kid })
    .setIssuedAt()
    .setIssuer(config.permissions.iss)
    .setAudience(config.permissions.aud)
    .setExpirationTime( '1h' )
    .sign(privateKey)
  
  return jwt;
}

// Middleware to check authorization header and validate token
//   This does a hard validation based on AccessPermission decorations on the API's in app.js.
//   For specific exceptions, use more permissive decorations, and validate within the API's
//   using the req.permissions.options object. See propertyController.js::getAllActivePropertyData
//   for an example.
export const validate_permission = async (required_permission: [AccessPermission], req: any, res: any, next: any) => {
  let jwt = req.headers.permissions ? req.headers.permissions : req.cookies['permissions'];
  if (jwt) {
    const claims = await parseToken(jwt, config.permissions.public_keys);
    // Attach user_id to the req object for later validation that the user has access to data.
    req.validated_user_id = claims.user_id;
    req.permissions = claims;
    const result = validate(required_permission, claims.permissions);

    if (!result) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
  } else {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  next();
}

// A quick check to see if the data being requested is owned by the user.
// The validate_permission middleware function above will populate req.validated_user_id.
// The downstream API code can then use thisIsMe() to determine if the user has access to the data.
export function thisIsMe(req: any, user_id: string) {
  return req.validated_user_id === user_id;
}

export function hasPropertiesPermission(req: any){
  let result = req.permissions ? req.permissions.options && req.permissions.options.properties &&
    Array.isArray(req.permissions.options.properties) && req.permissions.options.properties.length > 0 : false;
  return result;
}

module.exports = {
  validate,
  validate_permission,
  buildPermissionsToken,
  thisIsMe,
  hasPropertiesPermission,
}