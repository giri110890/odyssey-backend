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
exports.PublicKeyError = void 0;
// const jwt = require('jsonwebtoken');
const jwt = require('jose');
const config = require('../../../config/config');
const jwkToPem = require('jwk-to-pem');
const aws = require('aws-sdk');
const { AdminInitiateAuthCommand, InitiateAuthCommand, AuthFlowType, CognitoIdentityProviderClient, } = require('@aws-sdk/client-cognito-identity-provider');
class PublicKeyError extends Error {
    constructor() {
        super(...arguments);
        this.name = 'PublicKeyError';
    }
}
exports.PublicKeyError = PublicKeyError;
// Variable to cache the public keys
var cognito_public_keys = null;
const parseToken = (token, public_keys) => __awaiter(void 0, void 0, void 0, function* () {
    const tokenSections = (token || '').split('.');
    if (tokenSections.length < 2) {
        throw new Error('requested token is invalid');
    }
    const headerJSON = Buffer.from(tokenSections[0], 'base64').toString('utf8');
    const header = JSON.parse(headerJSON);
    const key = public_keys[header.kid];
    if (key === undefined) {
        throw new PublicKeyError('claim made for unknown kid: ' + header.kid);
    }
    try {
        const public_key = yield jwt.importSPKI(key.pem, key.alg);
        const { payload, protected_header } = yield jwt.jwtVerify(token, public_key);
        return payload;
    }
    catch (error) {
        throw error;
    }
});
const getClaims = (token) => __awaiter(void 0, void 0, void 0, function* () {
    let keys = yield getPublicKeys();
    let claims = yield parseToken(token, keys);
    return claims;
});
// Function to retrieve public keys e.g. from Cognito 
const retrievePublicKeys = (jwksUrl) => __awaiter(void 0, void 0, void 0, function* () {
    // Fetch public keys if not available in the cache
    const response = yield fetch(jwksUrl);
    const jwks = yield response.json();
    // Extract and format public keys
    const publicKeys = jwks.keys.reduce((acc, key) => {
        const pem = jwkToPem(key);
        acc[key.kid] = {
            alg: key.alg,
            e: key.e,
            n: key.n,
            pem: pem,
        };
        return acc;
    }, {});
    return publicKeys;
});
// Function to get Cognito public keys from cache or url
const getPublicKeys = () => __awaiter(void 0, void 0, void 0, function* () {
    if (!cognito_public_keys) {
        const jwksUrl = config.aws.cognito.host.cognito_host_keys;
        // Retrieve public keys using the helper function
        cognito_public_keys = yield retrievePublicKeys(jwksUrl);
    }
    return cognito_public_keys;
});
function findAuthenthicationInfo(req) {
    let token = req.headers.authorization ? req.headers.authorization : req.cookies['id_token'];
    if (token) {
        token = token.replace('Bearer ', '');
    }
    return token;
}
function getLiveAuthTokens(live_access_token, live_id_token, username, password) {
    return __awaiter(this, void 0, void 0, function* () {
        if (!live_access_token || !live_id_token) {
            const authenticationResult = yield initiateAuth(username, password);
            live_id_token = authenticationResult.AuthenticationResult.IdToken;
            live_access_token = authenticationResult.AuthenticationResult.AccessToken;
        }
        return { id_token: live_id_token, access_token: live_access_token };
    });
}
// Middleware to check authorization header and validate token
const authenticateToken = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    var token = findAuthenthicationInfo(req);
    if (!token) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    // Verify the token using the Cognito public keys
    if (!cognito_public_keys) {
        yield getPublicKeys();
        // res.status(500).json({error: 'Public keys not initialized. Try again.'});
    }
    try {
        var claims = yield parseToken(token, cognito_public_keys);
        // Move to the next middleware or route handler
        next();
    }
    catch (error) {
        return res.status(401).json({ error: 'Invalid token' });
    }
});
// https://docs.aws.amazon.com/cognito-user-identity-pools/latest/APIReference/API_InitiateAuth.html
// Authenticate to Cognito with username and password
const initiateAuth = (username, password) => __awaiter(void 0, void 0, void 0, function* () {
    const client = new CognitoIdentityProviderClient({ region: 'us-east-1' });
    const command = new InitiateAuthCommand({
        ClientId: config.aws.cognito.cognito_app_client_id,
        UserPoolId: config.aws.cognito.cognito_pool_id,
        AuthFlow: AuthFlowType.USER_PASSWORD_AUTH,
        AuthParameters: { USERNAME: username, PASSWORD: password },
    });
    return yield client.send(command);
});
module.exports = {
    getPublicKeys,
    getLiveAuthTokens,
    getClaims,
    findAuthenthicationInfo,
    initiateAuth,
    parseToken,
    authenticateToken,
    PublicKeyError
};
//# sourceMappingURL=auth_validator.js.map