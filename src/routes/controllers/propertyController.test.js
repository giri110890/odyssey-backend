const supertest = require('supertest');
const app = require('../../../app');
const assert = require('assert');
const request = supertest(app);
const app_config = require('./../../../config/config');
const auth = require('../middleware/auth_validator');
const perm = require('../middleware/permission/permission_validator');
const permissions = require('../middleware/permission/permissions');

describe('Property API', () => {

  var live_id_token = null;
  var live_access_token = null;

  var live_permissions_token = null;

  beforeAll( async () => {
      
      // Login to test account to get live tokens
      const username = app_config.aws.cognito.testuser_username;
      const password = app_config.aws.cognito.testuser_password;
      const authenticationResult = await auth.getLiveAuthTokens(live_access_token, live_id_token, username, password);
      live_id_token = authenticationResult.id_token;
      live_access_token = authenticationResult.access_token;

      // get a permissions token
      live_permissions_token = await perm.buildPermissionsToken({ user_id: '2009eafe-aa15-4840-bd71-711a3dbcd3ff', access: [permissions.AccessRoles.PropertyManager]});

  });
  
  let propertyId; // Store the created property's ID
  // create a new property 
  it('should create a new property', async () => {
    const newProperty = {
      property_manager_id: '8893-dfffe-sdfdsf-234d',
      name: "demo",
      legal_name:"legalNameproperty",
      address: "demo address",
      city: "demo city",
      state: "demo state",
      postalcode: "demo postalcode",
      phone_number:"property.phoneNumber",
      fax_number:"property.faxNumber",
      email:"property.email",
      website:"property.website",
      no_of_units:"property.noOfUnits",
      affordable_units:"property.affordableUnits",

    };

    const res = await request.post('/add_property/')
      .send(newProperty)
      .set({ Authorization: live_id_token })
      .set( { permissions: live_permissions_token } )   // Add permissions token
      .expect(200)
     
    expect(res.body).toHaveProperty('name', newProperty.name);
    
  });

  // get a property
  it('Get a non-existent property', async () => {
    const res = await request.get('/property/1')
      .set({ Authorization: live_id_token })    
      .set( { permissions: live_permissions_token } )   // Add permissions token
      .expect(200)
    assert( res.body.length == 0);
  });

  // get all properties by property manager id
  it('should get all property by given id', async () => {
    const property_manager_id = '2009eafe-aa15-4840-bd71-711a3dbcd3ff';
    const res = await request.get('/all_properties/' + property_manager_id)
      .set({ Authorization: live_id_token })
      .set( { permissions: live_permissions_token } )   // Add permissions token
      .expect(200)
    
      expect(res.body[0]).toHaveProperty('property_manager_id', property_manager_id);
    
  });

  it('user fails to get all properties for a different property manager', async () => {
    // Choose a different property manager id to test if we can see their properties.
    const property_manager_id = '290ff774-8f4b-44bf-aee2-3d6220c4c133';
    let url = '/all_properties/' + property_manager_id;
    const res = await request.get(url)
      .set({ Authorization: live_id_token })
      .set( { permissions: live_permissions_token } )   // Add permissions token
      .expect(401)
      
  });

    it('shadow user gets all properties for a different property manager using role permissions', async () => {
      // Use test user as a shadow user
      // Choose a different property manager id to test if we can see their properties.
      const property_manager_id = 'a3dc02d5-ed02-4b21-90b0-61d2c7579038';
      let url = '/all_properties/' + property_manager_id;
      let shadow_user_permissions_token = 
        await perm.buildPermissionsToken({ user_id: '2009eafe-aa15-4840-bd71-711a3dbcd3ff', access: [permissions.AccessRoles.OdysseyAdmin]});

      const res = await request.get(url)
        .set({ Authorization: live_id_token })
        .set( { permissions: shadow_user_permissions_token } )   // Add permissions token with Shadow permission
        .expect(200)
      
        // Confirm that these properties do not belong to the shadow user.
        expect(res.body[0]).toHaveProperty('property_manager_id', property_manager_id);
      
    });

 

    it('shadow user gets specific properties of a different property manager using item permissions', async () => {
      // Use test user as a shadow user
      // Choose a different property manager id to test if we can see their properties.
      const property_manager_id = 'a3dc02d5-ed02-4b21-90b0-61d2c7579038';
      let url = '/all_properties/' + property_manager_id;
      let shadow_user_permissions_token = 
        await perm.buildPermissionsToken({ 
          user_id: '2009eafe-aa15-4840-bd71-711a3dbcd3ff', 
          access: [permissions.AccessRoles.ShadowManager],
          options: { properties: ['e0b40c64-3057-4ef3-803a-38bfa5fd577b'] }   // Give permission by property_id
        });

      const res = await request.get(url)
        .set({ Authorization: live_id_token })
        .set( { permissions: shadow_user_permissions_token } )   // Add permissions token with Shadow permission
        .expect(200)
      
        // Confirm that these properties do not belong to the shadow user.
        expect(res.body[0]).toHaveProperty('property_manager_id', property_manager_id);
      
    });
  
    it('shadow user does NOT get specific properties of a different property manager using item permissions', async () => {
      // Use test user as a shadow user
      // Choose a different property manager id to test if we can see their properties.
      const property_manager_id = 'a3dc02d5-ed02-4b21-90b0-61d2c7579038';
      let url = '/all_properties/' + property_manager_id;
      let shadow_user_permissions_token = 
        await perm.buildPermissionsToken({ 
          user_id: '2009eafe-aa15-4840-bd71-711a3dbcd3ff', 
          access: [permissions.AccessRoles.ShadowManager],
          options: { properties: ['not-the-right-property-id-38bfa5fd577b'] }   // Give permission by property_id
        });

      const res = await request.get(url)
        .set({ Authorization: live_id_token })
        .set( { permissions: shadow_user_permissions_token } )   // Add permissions token with Shadow permission
        .expect(200)
      
        // Confirm that these properties are not returned to the shadow user.
        expect(res.body.length).toBe(0);;
      
    });

    it('shadow user gets specific properties of a different property manager using item permissions', async () => {
      // Use test user as a shadow user
      // Choose a different property manager id to test if we can see their properties.
      const property_manager_id = 'a3dc02d5-ed02-4b21-90b0-61d2c7579038';
      const property_id = 'e0b40c64-3057-4ef3-803a-38bfa5fd577b';
      const property_id2 = '2f6ee90e-3012-44ba-a53a-74f5c6b5a3bd';
      let url = '/properties';
      let shadow_user_permissions_token = 
        await perm.buildPermissionsToken({ 
          user_id: '2009eafe-aa15-4840-bd71-711a3dbcd3ff', 
          access: [permissions.AccessRoles.ShadowManager],
          options: { properties: [property_id, property_id2] }   // Give permission by property_id
        });

      const res = await request.get(url)
        .set({ Authorization: live_id_token })
        .set( { permissions: shadow_user_permissions_token } )   // Add permissions token with Shadow permission
        .expect(200)
      
        // Confirm that these properties do not belong to the shadow user.
        expect(res.body[0]).toHaveProperty('property_manager_id', property_manager_id);
        expect(res.body[0]).toHaveProperty('id', property_id);
        expect(res.body[1]).toHaveProperty('id', property_id2);
      
    });
  
  it('should NOT delete someone else\'s property', async () => {
    const anyProperty = {
      "id": "a-fake-id-value",
      "address": "4201 Jamboree Road",
      "city": "Newport Beach",
      "current_rent": "800",
      "date_of_birth": "1/1/2000",
      "email": "test@test.com",
      "fiels_1": "caone",
      "fiels_2": "",
      "legal_name": "Disney World",
      "name": "Eunice Ocampo",
      "number_of_adult_household_members": "4",
      "phone_number": "(123)456-7890",
      "program_type": "LIHTC",
      "property_manager_id": "not-the-right-property-manager-id-38bfa5fd577b",
      "resident": "t0010471",
      "security_deposit_held": "500",
      "state": "CA",
      "unit": "S210",
      "unit_type": "One_EB11",
      "postalcode": "92660",
      "website": "http://nothing",
      "fax_number": "(123)456-7891",
      "no_of_units": "12",
      "affordable_units": "6",
      "zip_code": "92660",
      // We CAN'T specify the property_id because it must be unique. We need to use the 'id' field generated by Cosmos DB.
      // "property_id": "9cccca6f-277b-4667-ae28-b75dc4b3121b",  
      "type": "unit",
    };
    const result = await request.delete('/delete_property')
      .query({ id: anyProperty.id , property_manager_id: anyProperty.property_manager_id})
      .set({ Authorization: live_id_token })
      .set( { permissions: live_permissions_token } )   // Add permissions token
      .expect(401);

    const result2 = await request.delete('/delete_all_property/' + anyProperty.property_manager_id)
      .set({ Authorization: live_id_token })
      .set( { permissions: live_permissions_token } )   // Add permissions token
      .expect(401);

    const result3 = await request.post('/soft_delete_property')
      .query({ id: anyProperty.id , property_manager_id: anyProperty.property_manager_id})
      .set({ Authorization: live_id_token })
      .set( { permissions: live_permissions_token } )   // Add permissions token
      .expect(401);
  })

  //delete a property
  it('should delete property by given id', async () => {
    const newProperty = {
      "address": "4201 Jamboree Road",
      "city": "Newport Beach",
      "current_rent": "800",
      "date_of_birth": "1/1/2000",
      "email": "test@test.com",
      "fiels_1": "caone",
      "fiels_2": "",
      "legal_name": "Disney World",
      "name": "Eunice Ocampo",
      "number_of_adult_household_members": "4",
      "phone_number": "(123)456-7890",
      "program_type": "LIHTC",
      "property_manager_id": "2009eafe-aa15-4840-bd71-711a3dbcd3ff",  // This is the real property manager id for the test user.
      "resident": "t0010471",
      "security_deposit_held": "500",
      "state": "CA",
      "unit": "S210",
      "unit_type": "One_EB11",
      "postalcode": "92660",
      "website": "http://nothing",
      "fax_number": "(123)456-7891",
      "no_of_units": "12",
      "affordable_units": "6",
      "zip_code": "92660",
      // We CAN'T specify the property_id because it must be unique. We need to use the 'id' field generated by Cosmos DB.
      // "property_id": "9cccca6f-277b-4667-ae28-b75dc4b3121b",  
      "type": "unit",
    };

    // Add a property which we will then delete
    const result = await request.post('/add_property/')
      .set({ Authorization: live_id_token })
      .set( { permissions: live_permissions_token } )   // Add permissions token
      .send(newProperty);

        // Get the property to ensure it was created
    const result2 = await request.get('/property/' + result.body.id)
      .set({ Authorization: live_id_token })
      .set( { permissions: live_permissions_token } )   // Add permissions token
      .expect(200);

      // Ensure that we got the property we just created.
    assert(result2.body[0].id == result.body.id);

    const result3 = await request.delete('/delete_property')
      .query({ id: result.body.id , property_manager_id: result.body.property_manager_id})
      .set({ Authorization: live_id_token })
      .set( { permissions: live_permissions_token } )   // Add permissions token
      .expect(200);

        // Get the property to ensure it was deleted
    const result4 = await request.get('/property/' + result.body.id)
      .set({ Authorization: live_id_token })
      .set( { permissions: live_permissions_token } )   // Add permissions token
      .expect(200);

      const empty_result = result4.body.length == 0;
      assert(empty_result, empty_result ? "success" : "Item not deleted!!! id: "+ result4.body[0].id + ", property_id: " + result4.body[0].property_id );  // Expect we do not find it.

  });

  //get a  property detail
  it('should get property by given id',  (done) => {
    var property_id = 'b8ee2dbd-ab78-4581-9d7d-67ee7425a81d';
    request.get('/property/' + property_id)
        .set({ Authorization: live_id_token })
        .set( { permissions: live_permissions_token } )   // Add permissions token
        .expect(200)
        .end((err, res) => {
            if (err) return done(err);
            expect(res.body[0]).toHaveProperty('id', property_id);
            done();
        });
  });
});
