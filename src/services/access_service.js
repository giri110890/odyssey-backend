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
exports.ensureAccessExists = void 0;
const access_store = require('../data_store/access');
const { AccessRoles } = require('../routes/middleware/permission/permissions');
function ensureAccessExists(user_id, access_roles, options) {
    return __awaiter(this, void 0, void 0, function* () {
        let result = yield access_store.ensureAccessExists(user_id, access_roles, options);
        return result;
    });
}
exports.ensureAccessExists = ensureAccessExists;
//# sourceMappingURL=access_service.js.map