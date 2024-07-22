// const jwt = require('jsonwebtoken');
const jwt = require('jose');
const config = require('../../../config/config');
const jwkToPem = require('jwk-to-pem');
const aws  = require('aws-sdk');


const {
  AdminInitiateAuthCommand,
  InitiateAuthCommand,
  AuthFlowType,
  CognitoIdentityProviderClient,
} = require( '@aws-sdk/client-cognito-identity-provider');


// https://github.com/awslabs/aws-support-tools/blob/master/Cognito/decode-verify-jwt/decode-verify-jwt.ts

interface TokenHeader {
    kid: string;
    alg: string;
}

interface PublicKey {
    alg: string;
    e: string;
    kid: string;
    kty: string;
    n: string;
    use: string;
}
interface PublicKeyMeta {
    instance: PublicKey;
    pem: string;
}  
interface MapOfKidToPublicKey {
    [key: string]: PublicKeyMeta;
}

export class PublicKeyError extends Error {
    name = 'PublicKeyError';
}

// Variable to cache the public keys
var cognito_public_keys: any = null;

const parseToken = async (token: any, public_keys: any) => {
    const tokenSections = (token || '').split('.');
    if (tokenSections.length < 2) {
      throw new Error('requested token is invalid');
    }
    const headerJSON = Buffer.from(tokenSections[0], 'base64').toString('utf8');
    const header = JSON.parse(headerJSON) as TokenHeader;
    const key = public_keys[header.kid];
    if (key === undefined) {
        throw new PublicKeyError('claim made for unknown kid: ' + header.kid);
    }
    try {
        const public_key = await jwt.importSPKI(key.pem, key.alg);
        const {payload, protected_header} = await jwt.jwtVerify(token, public_key);
        return payload;
    } catch (error) {
        throw error;
    }
}

const getClaims = async (token: any) => {
  let keys = await getPublicKeys();
  let claims = await parseToken(token, keys);
  return claims;
}

  // Function to retrieve public keys e.g. from Cognito 
  const retrievePublicKeys = async (jwksUrl : string) => {
    // Fetch public keys if not available in the cache
    const response = await fetch(jwksUrl);
    const jwks = await response.json();

    // Extract and format public keys
    const publicKeys = jwks.keys.reduce((acc: any, key: any) => {
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
  };
  
  // Function to get Cognito public keys from cache or url
  const getPublicKeys = async () => {
    if (!cognito_public_keys) {
      const jwksUrl = config.aws.cognito.host.cognito_host_keys;
  
      // Retrieve public keys using the helper function
      cognito_public_keys = await retrievePublicKeys(jwksUrl);
    }
  
    return cognito_public_keys;
  };

function findAuthenthicationInfo(req: any)  {
  let token = req.headers.authorization ? req.headers.authorization : req.cookies['id_token'];
  if (token) {
    token = token.replace('Bearer ', '');
  }
  return token;
}

async function getLiveAuthTokens(live_access_token: string, live_id_token: string, username: string, password: string) {
  
  if (!live_access_token || !live_id_token){
      const authenticationResult = await initiateAuth(username, password);
  
      live_id_token = authenticationResult.AuthenticationResult.IdToken;
      live_access_token = authenticationResult.AuthenticationResult.AccessToken;
  }
  return { id_token: live_id_token, access_token: live_access_token };
}

  // Middleware to check authorization header and validate token
const authenticateToken = async (req: any, res: any, next: any) => {
    var token = findAuthenthicationInfo(req);
    
    if (!token) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
  
    // Verify the token using the Cognito public keys
    if (!cognito_public_keys){
      await getPublicKeys();
      // res.status(500).json({error: 'Public keys not initialized. Try again.'});
    }
    try {
      var claims = await parseToken(token, cognito_public_keys);
    
      // Move to the next middleware or route handler
      next();
    
    } catch (error) {
      return res.status(401).json({ error: 'Invalid token' });
    }
  };

  // https://docs.aws.amazon.com/cognito-user-identity-pools/latest/APIReference/API_InitiateAuth.html
  // Authenticate to Cognito with username and password
  const initiateAuth = async (username: string, password: string) => {
    const client = new CognitoIdentityProviderClient({region: 'us-east-1'});
  
    const command = new InitiateAuthCommand({
      ClientId: config.aws.cognito.cognito_app_client_id,
      UserPoolId: config.aws.cognito.cognito_pool_id,
      AuthFlow: AuthFlowType.USER_PASSWORD_AUTH,
      AuthParameters: { USERNAME: username, PASSWORD: password },
    });
  
    return await client.send(command);
  };

  module.exports = {
    getPublicKeys,
    getLiveAuthTokens,
    getClaims,
    findAuthenthicationInfo,
    initiateAuth,
    parseToken,
    authenticateToken,
    PublicKeyError
  }