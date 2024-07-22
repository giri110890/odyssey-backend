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
const access_store = require('../../data_store/access');
const { listAllShadowUsers } = require('../../data_store/users');
const { getItem } = require('../../data_store/access');
// Returns the access information for any user that is shadowing
//  the current user. We use the permissions token to identify
//  the current user so no parameters are needed. 
function getAccess(req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        if (!req.validated_user_id) {
            return res.status(401).json({ error: "No middleware validated user id" });
        }
        const result = yield access_store.getItems(req.validated_user_id);
        return res.status(200).json({ access: result });
    });
}
// API to get shadow manager properties
function getShadowManagerProperties(req, res) {
    var _a, _b;
    return __awaiter(this, void 0, void 0, function* () {
        try {
            let shadow_user_id = req.query.shadow_user_id;
            let user = yield getItem(shadow_user_id);
            let assign_properties = (_b = (_a = user[0]) === null || _a === void 0 ? void 0 : _a.options) === null || _b === void 0 ? void 0 : _b.properties;
            if (assign_properties !== undefined) {
                return res.status(200).json({ assign_properties });
            }
            else {
                assign_properties = [];
                return res.status(200).json({ assign_properties, error: 'Assign properties not found for the given user.' });
            }
        }
        catch (error) {
            console.error('Get all shadow user  error:');
        }
    });
}
module.exports = {
    getAccess,
    getShadowManagerProperties
};
//# sourceMappingURL=accessController.js.map