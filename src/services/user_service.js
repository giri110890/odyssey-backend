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
exports.ensureUserExists = void 0;
const { createUser, getUserByEmail, putUser } = require('../data_store/users');
const access_service = require('../services/access_service');
const { convertToFrontendRole } = require('../routes/middleware/permission/permission_by_roles');
// Create user if necessary to ensure that this user exists.
// We also create an access record for them.
function ensureUserExists(user, access_roles, options) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            // Don't need property_manager_id here because that is equivalent to user.id field.
            let existing_user = null;
            if (user.email != "") {
                existing_user = yield getUserByEmail(user.email);
            }
            let isUserAlreadyExists = false;
            let result = null;
            // Should we create the user?
            if (existing_user ? (existing_user.length == 0) : true) {
                result = yield createUser(user);
            }
            else {
                result = existing_user[0];
                isUserAlreadyExists = true;
                if (access_roles ? access_roles.length > 0 : false) {
                    // Update roles if necessary.
                    if (result.role ? convertToFrontendRole(access_roles[0]) == result.role : false) {
                        // Do nothing - roles match
                    }
                    else {
                        result.role = convertToFrontendRole(access_roles[0]);
                        let put_result = yield putUser(result.id, result);
                        console.log("put_result", put_result);
                    }
                }
            }
            // Now we know we have a valid user.
            let access = yield access_service.ensureAccessExists(result.id, access_roles, options);
            if (result.id && access.id) {
                return { user: result, isAlreadyExists: isUserAlreadyExists };
            }
            else {
                return { error: 'Error while adding manager: ' + result.id + ' ' + access.id };
            }
        }
        catch (error) {
            console.error('ensureUserExists Error:', error);
        }
    });
}
exports.ensureUserExists = ensureUserExists;
//# sourceMappingURL=user_service.js.map