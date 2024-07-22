const request = require('supertest');
const app = require('./app');
const auth = require('./src/routes/middleware/auth_validator');
const config = require('./config/config');
const perm = require('./src/routes/middleware/permission/permission_validator');
const { AccessRoles } = require('./src/routes/middleware/permission/permissions');


describe('Property Manager API', () => {

  let propertyManagerId; // Store the created property manager's ID

  var live_id_token = null;
  var live_access_token = null;

  beforeAll(async () => {
    
    // Login to test account to get live tokens
    const authenticationResult = await auth.getLiveAuthTokens(
        live_access_token, 
        live_id_token, 
        config.aws.cognito.testuser_username,
        config.aws.cognito.testuser_password);
    live_id_token = authenticationResult.id_token;
    live_access_token = authenticationResult.access_token;
  
    // get a permissions token
    live_permissions_token = await perm.buildPermissionsToken({ user_id: '678d3c55-dd49-47e7-b594-3546363e4985', access: [AccessRoles.PropertyManager]});

    // Create a new Property Manager and store its ID
    const newPropertyManager = {
      property_manager_id: 'abcd-11234-asdfa-asdfa',
      property_manager_name: 'Prepopulated-Property-Manager',
      // ... other property manager data
    };

    const response = await request(app)
      .post('/property_manager')
      .set({ Authorization: live_id_token })
      .set( { permissions: live_permissions_token } )   // Add permissions token
      .send(newPropertyManager);

    propertyManagerId = response.body.property_manager_id;
  });

  it('should create a new property manager', (done) => {
    const newPropertyManager = {
      property_manager_name: 'New-Property-Manager',
      property_manager_id: 'abcd-11234-asdfa-asdfa',
      // ... other property manager data
    };

    request(app)
      .post('/property_manager')
      .set({ Authorization: live_id_token })
      .set( { permissions: live_permissions_token } )   // Add permissions token
      .send(newPropertyManager)
      .expect(201)
      .end((err, res) => {
        if (err) return done(err);
        // ('newPropertyManager returned');
        // Add your assertions here
        expect(res.body).toHaveProperty('property_manager_name', newPropertyManager.property_manager_name);
        // ...
        // console.log('newPropertyManager succeeded');
        done(); // Call done() when the test is complete
      });
  });

  it('should get property manager by ID', (done) => {
    // Pre-populated in beforeAll.

    request(app)
      .get(`/property_manager/${propertyManagerId}`)
      .set({ Authorization: live_id_token })
      .set( { permissions: live_permissions_token } )   // Add permissions token
      .expect(200)
      .end((err, res) => {
        if (err) return done(err);

        // Add your assertions here
        expect(res.body).toHaveProperty('property_manager_id', propertyManagerId);
        // ...

        done(); // Call done() when the test is complete
      });
  });
  
  it('should NOT find non-existent property manager by ID', (done) => {
    const propertyManagerId = 'your-property-manager-id'; // Will not be found.

    request(app)
      .get(`/property_manager/${propertyManagerId}`)
      .set({ Authorization: live_id_token })
      .set( { permissions: live_permissions_token } )   // Add permissions token
      .expect(404)
      .end((err, res) => {
        // console.log('should NOT - returned');
        if (err) return done(err);
        // console.log('should NOT - passed');

        done(); // Call done() when the test is complete
      });
  });

  // Similar tests for Unit, Tenant, Auditor, and Document endpoints

});

afterAll(async () => {
  // await new Promise(resolve => setTimeout(() => resolve(), 10000)); // avoid jest open handle error
});