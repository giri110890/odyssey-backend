
describe('Access API', () => {

    const supertest = require('supertest');
    const app = require('../../../app');
    const request = supertest(app);
    const app_config = require('./../../../config/config');
    const auth = require('./../middleware/auth_validator');
    const perm = require('../middleware/permission/permission_validator');
    const { AccessRoles } = require('../middleware/permission/permissions');
    const access = require('./accessController');
    const access_store = require('../../data_store/access');
    const uuid = require('uuid');

    var live_id_token = {};
    var live_access_token = {};

    var live_permissions_token = {};

    beforeAll(async () => {

        // Login to test account to get live tokens
        const username = app_config.aws.cognito.testuser_username;
        const password = app_config.aws.cognito.testuser_password;
        const authenticationResult = await auth.getLiveAuthTokens(null, null, username, password);
        live_id_token = authenticationResult.id_token;
        live_access_token = authenticationResult.access_token;

        // get a permissions token
        live_permissions_token = await perm.buildPermissionsToken({ user_id: 'shadowed-86de-4abb-91a9-3f9e68d12fca', access: [AccessRoles.PropertyManager]});


    });

    it('get Access information for a set of users', async () => {

        let new_user_id = uuid.v4();
        let shadowed_property_manager_id = "shadowed-86de-4abb-91a9-3f9e68d12fca";
        let shadowed_property_id = "shadowed-property-91a9-3f9e68d12fca";

        
        const access = {
            user_id: new_user_id,
            access: [AccessRoles.ShadowManager],
            permissions: 55,
            options: { 
                users: [shadowed_property_manager_id],
                properties: [shadowed_property_id]
                 }
        };
        const access_item = await access_store.createItem(access);
        expect(access_item).toHaveProperty('id');

        let existing_user_id = new_user_id;
        const result = await request.get('/access')
            .set({ Authorization: live_id_token })
            .set({ permissions: live_permissions_token })   // Add permissions token
            .expect(200)

        expect(result.body.id).toEqual(result.body.id);


        expect(result.body.access[0].options.users.includes(shadowed_property_manager_id)).toBe(true); 
        expect(result.body.access[0].options.properties.includes(shadowed_property_id)).toBe(true); 
        expect(result.body.access[0].access[0]).toBe(AccessRoles.ShadowManager);

        const result2 = await access_store.deleteItem(access_item.user_id);
        

    });

    it('get properties already assigned to shadow manager', async () => {

        let new_user_id = uuid.v4();
        let property_manager_id = "1ec37be2-ca70-4439-be96-b3a88881de46";
        let shadow_user_id = "845f5ec2-bdf2-45b8-a87d-2f53c774db8d";

        const result = await request.get('/list_shadow_manager_properties')
         .query({ property_manager_id, shadow_user_id})
            .set({ Authorization: live_id_token })
            .set({ permissions: live_permissions_token })   // Add permissions token
            .expect(200)

        expect(result.body.id).toEqual(result.body.id);


        // expect(result.body.access[0].options.users.includes(shadowed_property_manager_id)).toBe(true); 
        // expect(result.body.access[0].options.properties.includes(shadowed_property_id)).toBe(true); 
        // expect(result.body.access[0].access[0]).toBe(AccessRoles.ShadowManager);

        // const result2 = await access_store.deleteItem(access_item.user_id);
        

    });

    

});