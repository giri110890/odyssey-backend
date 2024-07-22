"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.hasPropertiesPermission = exports.thisIsMe = exports.validate_permission = exports.buildPermissionsToken = exports.validate = void 0;
const jose = require('jose');
const { getPermissionsByRole } = require('../../middleware/permission/permission_by_roles');
const { parseToken } = require('../auth_validator');
const config = require('../../../../config/config');
function validate(required_permission, current_permissions) {
    let bitmap = 0;
    required_permission.forEach((permission) => {
        bitmap = bitmap | permission;
    });
    // Return true if every required permission is currently satisfied.
    let result = (bitmap & current_permissions) === bitmap;
    return result;
}
exports.validate = validate;
function buildPermissionsToken(access_data) {
    return __awaiter(this, void 0, void 0, function* () {
        const role_permissions = getPermissionsByRole(access_data.access);
        const permission_data = { user_id: access_data.user_id, permissions: role_permissions, options: access_data.options };
        const permissions_token = yield signToken(permission_data);
        return permissions_token;
    });
}
exports.buildPermissionsToken = buildPermissionsToken;
function signToken(permission_data) {
    return __awaiter(this, void 0, void 0, function* () {
        var alg = config.permissions.private_key.alg;
        var pkcs8 = config.permissions.private_key.pkcs8;
        const privateKey = yield jose.importPKCS8(pkcs8, alg);
        const jwt = yield new jose.SignJWT(permission_data)
            .setProtectedHeader({ alg, kid: config.permissions.public_keys.kid })
            .setIssuedAt()
            .setIssuer(config.permissions.iss)
            .setAudience(config.permissions.aud)
            .setExpirationTime('1h')
            .sign(privateKey);
        return jwt;
    });
}
// Middleware to check authorization header and validate token
//   This does a hard validation based on AccessPermission decorations on the API's in app.js.
//   For specific exceptions, use more permissive decorations, and validate within the API's
//   using the req.permissions.options object. See propertyController.js::getAllActivePropertyData
//   for an example.
const validate_permission = (required_permission, req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    let jwt = req.headers.permissions ? req.headers.permissions : req.cookies['permissions'];
    if (jwt) {
        const claims = yield parseToken(jwt, config.permissions.public_keys);
        // Attach user_id to the req object for later validation that the user has access to data.
        req.validated_user_id = claims.user_id;
        req.permissions = claims;
        const result = validate(required_permission, claims.permissions);
        if (!result) {
            return res.status(401).json({ error: 'Unauthorized' });
        }
    }
    else {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    next();
});
exports.validate_permission = validate_permission;
// A quick check to see if the data being requested is owned by the user.
// The validate_permission middleware function above will populate req.validated_user_id.
// The downstream API code can then use thisIsMe() to determine if the user has access to the data.
function thisIsMe(req, user_id) {
    return req.validated_user_id === user_id;
}
exports.thisIsMe = thisIsMe;
function hasPropertiesPermission(req) {
    let result = req.permissions ? req.permissions.options && req.permissions.options.properties &&
        Array.isArray(req.permissions.options.properties) && req.permissions.options.properties.length > 0 : false;
    return result;
}
exports.hasPropertiesPermission = hasPropertiesPermission;
module.exports = {
    validate,
    validate_permission: exports.validate_permission,
    buildPermissionsToken,
    thisIsMe,
    hasPropertiesPermission,
};
//# sourceMappingURL=permission_validator.js.map