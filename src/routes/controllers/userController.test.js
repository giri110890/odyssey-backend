const supertest = require('supertest');
const app = require('../../../app');
const request = supertest(app);
const assert = require('assert');
const app_config = require('./../../../config/config');
const auth = require('../middleware/auth_validator');
const uuid = require('uuid');
const access_store = require('../../data_store/access');
const perm = require('../middleware/permission/permission_validator');
const { AccessRoles } = require('../middleware/permission/permissions');
const array_utils = require('../../utils/array_utils');
const { access } = require('fs');

describe('User API', () => {

    var live_id_token = null;
    var live_access_token = null;

    var live_permissions_token = null;

    beforeAll(async () => {

        // Login to test account to get live tokens
        const username = app_config.aws.cognito.testuser_username;
        // const username = "odyssey.test.user2023+staging@gmail.com";
        const password = app_config.aws.cognito.testuser_password;
        //const password = '@dyss3yR3mote';
        const authenticationResult = await auth.getLiveAuthTokens(live_access_token, live_id_token, username, password);
        live_id_token = authenticationResult.id_token;
        live_access_token = authenticationResult.access_token;

        // get a permissions token
        live_permissions_token = await perm.buildPermissionsToken({ user_id: '678d3c55-dd49-47e7-b594-3546363e4985', access: [AccessRoles.PropertyManager] });

    });

    // add tenant
    it('should create a new tenant and delete the new tenant', async () => {
        let property_manager_id = "1d3093a5-cea7-4811-8c0b-9977e4998b51";
        let unique_email = "noreply" + uuid.v4() + "@gmail.com";  // new email address guaranteed
        const newTenant = {

            resident_id: "RX1233",
            unit_no: "D45",
            sse_number: "HIOHF-764-875",
            first_name: "firstName",
            middle_name: "middle_name",
            last_name: "lastName",
            ssn_number: "864-JKGH-786",
            address: "address",
            city: "city",
            state: "state",
            postalcode: "5365757",
            country: "country",
            tel_number: "4657Y56",
            id_number: "546",
            id_state: "idState",
            house_size: "5",
            race: "race",
            ethnicity: "ethnicity",
            date_of_birth: "04/07/2018",
            relationship: "head",
            disable: "no",
            student_status: "no",
            identification_type: {
                value: "passport",
                label: "Passport"
            },
            email: unique_email,
            role: "tenant",
            unit_number: "#67"
        };
        const update = {
            resident_id: "35646757686",
            unit_no: "D45",
            ssn_number: "HIOHF-764-875",
            first_name: "Update Test",
            middle_name: "middle_name",
            last_name: "updated",
            ssn_number: "864-2121212122-786",
            address: "ManCity",
            city: "Green",
            state: "Texas",
            postalcode: "1221212",
            country: "USA",
            county: "United States",
            tel_number: "11111111111",
            id_number: "512121246",
            id_state: "21212",
            house_size: "5",
            race: [
                {
                    option: "Europe or North Africa",
                }
            ],
            ethnicity: [
                {
                    option: "Hispanic",
                    group: "Hispanic"
                }
            ],
            date_of_birth: "09/08/2020",
            relationship: {
                value: "head",
                label: "Head of Household"
            },
            disable: {
                value: "no",
                label: "No"
            },
            student_status: {
                value: "full time",
                label: "Full-Time"
            },
            email: unique_email,
            role: "tenant",
            unit_number: "#45",
            identification_type: {
                value: "passport",
                label: "Passport"
            },
        };
        const result = await request.post('/create_tenant')
            .set({ Authorization: live_id_token })
            .set({ permissions: live_permissions_token })   // Add permissions token
            .query({ property_manager_id: property_manager_id })
            .send(newTenant);


        const result2 = await request.get('/tenant/' + result.body.id)
            .set({ Authorization: live_id_token })
            .set({ permissions: live_permissions_token })   // Add permissions token
            .expect(200);

        expect(result2.body[0].property_manager_id).toBe(property_manager_id);

        // ensure access record exists
        let access_record = await access_store.getItem(result2.body[0].id);
        assert(access_record && access_record[0].user_id == result2.body[0].id);
        assert(access_record && array_utils.arrayEquals(access_record[0].access, [AccessRoles.Tenant]));

        //check its present or not
        assert(result2.body[0].id == result.body.id);
        // update tenant 
        const result1 = await request.post('/update_tenant')
            .set({ Authorization: live_id_token })
            .set({ permissions: live_permissions_token })   // Add permissions token
            .send(update)
            .query({ property_manager_id: property_manager_id, tenant_id: result.body.id })
            .expect(200)
        expect(result.body.id).toEqual(result1.body.id);

        // update check
        const result5 = await request.get('/tenant/' + result1.body.id)
            .set({ Authorization: live_id_token })
            .set({ permissions: live_permissions_token })   // Add permissions token
            .expect(200);

        //check its present or not
        assert(result5.body[0].id === result1.body.id);
        // delete created user
        const result3 = await request.delete('/delete_tenant')
            .query({ property_manager_id: result2.body[0].property_manager_id, tenant_id: result2.body[0].id })
            .set({ Authorization: live_id_token })
            .set({ permissions: live_permissions_token })   // Add permissions token
            .expect(200);


        // get user to ensure it was deleted
        const result4 = await request.get('/tenant/' + result.body.id)
            .set({ Authorization: live_id_token })
            .set({ permissions: live_permissions_token })   // Add permissions token
            .expect(200);

        assert(result4.body == "tenant not Found");

    });

    // add property_manager 

    it('should create a new property_manager', async () => {
        const newManager = {
            property_manager_id: "1d3093a5-cea7-4811-8c0b-9977e4998b51",
            first_name: "firstName",
            middle_name: "middle_name",
            last_name: "lastName",
            address: "address",
            city: "city",
            state: "state",
            postalcode: "postalcode",
            tel_number: "4657Y56",
            // id_number: "546",
            date_of_birth: "04/09/2019",
            email: "noreply" + uuid.v4() + "@gmail.com",  // new email address guaranteed
            role: "property_manager",
            company_id: "4257-973-oikghf-963"
        };
        const res = await request.post('/create_property_manager')
            .send(newManager)
            .set({ Authorization: live_id_token })
            .set({ permissions: live_permissions_token })   // Add permissions token
            .query({ property_manager_id: newManager.property_manager_id })
            .expect(200)

        // guid for new record is returned.
        assert(Object.keys(res.body).length > 0);
        assert(res.body.id);

        // ensure access record exists
        let access_record = await access_store.getItem(res.body.id);
        assert(access_record && access_record[0].user_id == res.body.id);
        assert(access_record && array_utils.arrayEquals(access_record[0].access, [AccessRoles.PropertyManager]));

        //delete a property manager
        const res2 = await request.delete('/remove_property_manager')
            .set({ Authorization: live_id_token })
            .set({ permissions: live_permissions_token })   // Add permissions token
            .query({ property_manager_id: newManager.property_manager_id, delete_property_manager_id: res.body.id })
            .expect(200)

        assert(res2.body.id);
    });

    it('call create_property_manager with existing property_manager', async () => {
        const existingManager = {
            property_manager_id: "1d3093a5-cea7-4811-8c0b-9977e4998b51",
            first_name: "firstName",
            middle_name: "middle_name",
            last_name: "lastName",
            address: "address",
            city: "city",
            state: "state",
            postalcode: "postalcode",
            tel_number: "4657Y56",
            // id_number: "546",
            date_of_birth: "04/09/2019",
            email: "noreply@orcsolution.com",
            role: "property_manager",
            company_id: "4257-973-oikghf-963"
        };
        const res = await request.post('/create_property_manager')
            .send(existingManager)
            .set({ Authorization: live_id_token })
            .set({ permissions: live_permissions_token })   // Add permissions token
            .query({ property_manager_id: existingManager.property_manager_id })
            .expect(200)

        // ensure property manager exists
        assert(Object.keys(res.body).length > 0);
        assert(res.body.id);

        // ensure access record exists
        let access_record = await access_store.getItem(res.body.id);
        assert(access_record && access_record[0].user_id == res.body.id);
        assert(access_record && array_utils.arrayEquals(access_record[0].access, [AccessRoles.PropertyManager]));

    });

    it('should create a new Shadow Manager', async () => {
        const newManager = {
            property_manager_id: "678d3c55-dd49-47e7-b594-3546363e4985",    // link to existing property manager 
            first_name: "firstName",
            middle_name: "middle_name",
            last_name: "lastName",
            address: "address",
            city: "city",
            state: "state",
            postalcode: "postalcode",
            tel_number: "4657Y56",
            // id_number: "546",
            date_of_birth: "04/09/2019",
            email: "noreply" + uuid.v4() + "@gmail.com",  // new email address guaranteed
            role: "shadow_manager",
            company_id: "4257-973-oikghf-963"
        };

        let payload = { user: newManager };
        const res = await request.post('/create_shadow_manager')
            .send(payload)
            .set({ Authorization: live_id_token })
            .set({ permissions: live_permissions_token })   // Add permissions token
            .expect(200)

        // guid for new record is returned.
        assert(Object.keys(res.body).length > 0);
        assert(res.body.id);

        // ensure access record exists
        let access_record = await access_store.getItem(res.body.id);
        assert(access_record && access_record[0].user_id == res.body.id);
        assert(access_record && array_utils.arrayEquals(access_record[0].access, [AccessRoles.ShadowManager]));
        assert(access_record && array_utils.deepEquals(access_record[0].options, { users: [newManager.property_manager_id] }));

    });


    it('receive unknown new user for the first time', async () => {
        // Give a 200 response code with 401 status value.

        const res = await request.get('/get_role')
            .set({ Authorization: live_id_token })
            .set({ permissions: live_permissions_token })   // Add permissions token
            .set('Cookie', live_access_token)
            .query({ email: "noreply" + uuid.v4() + "@gmail.com" }) // new email address guaranteed
            .expect(200);

        // We don't know this user - they have not been added as a Tenant or a Property Manager.
        assert(res.status == "200");

        // ensure access record exists
        let access_record = await access_store.getItem(res.body.user.id);
        assert(access_record && access_record[0].user_id == res.body.user.id);
        assert(access_record && array_utils.arrayEquals(access_record[0].access, [null]));

    });

    it('convert unknown user to property manager', async () => {
        // Create an unknown user e.g. a user who has signed up before we added them.
        const new_email = "noreply" + uuid.v4() + "@gmail.com"; // new email address guaranteed
        const res = await request.get('/get_role')
            .set({ Authorization: live_id_token })
            .set({ permissions: live_permissions_token })   // Add permissions token
            .query({ email: new_email })
            .expect(200);

        const add_pm = await request.post('/add_property_manager')
            .set({ Authorization: live_id_token })
            .set({ permissions: live_permissions_token })   // Add permissions token

        const existingManager = {
            property_manager_id: "1d3093a5-cea7-4811-8c0b-9977e4998b51",
            first_name: "firstName",
            middle_name: "middle_name",
            last_name: "lastName",
            address: "address",
            city: "city",
            state: "state",
            postalcode: "postalcode",
            tel_number: "4657Y56",
            date_of_birth: "04/09/2019",
            email: new_email,
            role: "property_manager",
            company_id: "4257-973-oikghf-963"
        };
        const res2 = await request.post('/create_property_manager')
            .send(existingManager)
            .set({ Authorization: live_id_token })
            .set({ permissions: live_permissions_token })   // Add permissions token
            .query({ property_manager_id: existingManager.property_manager_id })
            .expect(200)

        // ensure property manager exists
        assert(Object.keys(res2.body).length > 0);
        assert(res2.body.id);

        const res3 = await request.get('/get_role')
            .set({ Authorization: live_id_token })
            .set({ permissions: live_permissions_token })   // Add permissions token
            .query({ email: new_email })
            .expect(200);
        assert(res3.body.user.role == "property_manager");

        // ensure access record exists
        let access_record = await access_store.getItem(res2.body.id);
        assert(access_record && access_record[0].user_id == res2.body.id);
        assert(access_record && array_utils.arrayEquals(access_record[0].access, [AccessRoles.PropertyManager]));

    });


    it('receive logged in existing property manager', async () => {
        // Ensure that access is property manager level
        const res = await request.get('/get_role')
            .set({ Authorization: live_id_token })
            // Do not set the permissions token here: this is where we get it.
            .query({ email: "noreplyca2d3c15-b1d5-476b-bae9-2e2237903c85@gmail.com" })
            .expect(200);

        assert(res.body.user.role == "property_manager");
        expect(res.body.user).toHaveProperty('id');
        assert(res.body.permissions);
        assert(res.body.permissions_public_key.alg == "RS256");

        // Confirm that the permissions jwt will allow access to an API
        var property_id = 'b8ee2dbd-ab78-4581-9d7d-67ee7425a81d';
        const res2 = await request.get('/property/' + property_id)
            .set({ Authorization: live_id_token })
            .set({ permissions: res.body.permissions })
            .expect(200);
        assert(res2.body.length > 0);
        expect(res2.body[0]).toHaveProperty('id', property_id);

    });

    /*
       
    it('Add a tenant - existing user', async () => {
        
    });

    */


    it('should get all tenants for property_manager_id', (done) => {
        // Ensure that we can only get our own data.
        var property_manager_id = '678d3c55-dd49-47e7-b594-3546363e4985';
        request.get('/all_tenants/' + property_manager_id)
            .set({ Authorization: live_id_token })
            .set({ permissions: live_permissions_token })   // Add permissions token
            .expect(200)
            .end((err, res) => {
                if (err) return done(err);
                // console.log(' units returned');
                expect(res.body[0]).toHaveProperty('property_manager_id', property_manager_id);
                // console.log(' succeeded');
                done();
            });
    });

    it('should NOT get all tenants for wrong property_manager_id', (done) => {
        // Ensure that we can only get our own data.
        var property_manager_id = '1d3093a5-cea7-4811-8c0b-9977e4998b51';
        request.get('/all_tenants/' + property_manager_id)
            .set({ Authorization: live_id_token })
            .set({ permissions: live_permissions_token })   // Add permissions token
            .expect(401)
            .end((err, res) => {
                if (err) return done(err);
                // console.log(' units returned');
                expect(res.body).toHaveProperty('error');
                // console.log(' succeeded');
                done();
            });
    });


    //get a tenant
    it('should get tenant by given id', (done) => {
        var tenant_id = 'a829a7c5-2a50-4fee-a1f4-b03b4a5c790e';
        request.get('/tenant/' + tenant_id)
            .set({ Authorization: live_id_token })
            .set({ permissions: live_permissions_token })   // Add permissions token
            .expect(200)
            .end((err, res) => {
                if (err) return done(err);
                // console.log(' units returned');
                expect(res.body[0]).toHaveProperty('id');
                // console.log(' succeeded');
                done();
            });
    });
    //get multiple tenant details
    it('should get multiple tenants by given property_manager_id', (done) => {
        const property_manager_id = {
            property_manager_id: '1d3093a5-cea7-4811-8c0b-9977e4998b51',
        }
        const tenant = {
            tenant_ids: ["d44371f3-2354-4030-8432-4f093a597848", "9205ba89-222b-4c20-9980-3b4498f81b97"]
        }
        request.get('/get_multiple_tenant_info_by_id')
            .set({ Authorization: live_id_token })
            .set({ permissions: live_permissions_token })   // Add permissions token
            .query({ property_manager_id: property_manager_id.property_manager_id, tenant_ids: tenant.tenant_ids })
            .send(tenant)
            .expect(200)
            .end((err, res) => {
                if (err) return done(err);
                // console.log(' units returned');
                expect(res.body[0]).toHaveProperty('property_manager_id');
                expect(res.body[0].property_manager_id).toBe(property_manager_id.property_manager_id);
                done();
            });
    });


    //get all property manager
    it('should get all property manager by given property_manager_id', (done) => {
        var property_manager_id = '6134e6b3-7d52-4645-8268-668fd6ab4758';

        request.get('/list_all_property_manager?property_manager_id=' + property_manager_id)
            .set({ Authorization: live_id_token })
            .set({ permissions: live_permissions_token })   // Add permissions token
            .expect(200)
            .end((err, res) => {
                if (err) return done(err);
                let firstPropertyManager = res.body[0];
                // console.log(' units returned');
                expect(firstPropertyManager.role).toBe('property_manager');
                // console.log(' succeeded');
                done();
            });
    });
    //get all Shadow user
    it('should get all shadow user by given property_manager_id', (done) => {
        var property_manager_id = '6134e6b3-7d52-4645-8268-668fd6ab4758';
        request.get('/list_all_shadow_user?property_manager_id=' + property_manager_id)
            .set({ Authorization: live_id_token })
            .set({ permissions: live_permissions_token })   // Add permissions token
            .expect(200)
            .end((err, res) => {

                if (err) return done(err);
                let firstShadowManager = res.body[0];
                // console.log(' units returned');
                expect(firstShadowManager.role).toBe('ShadowManager');
                // console.log(' succeeded');
                done();
            });
    });


    it('assign properties to shadow user by given shadow_user_id', async () => {
        const assign = {
            shadow_user_id: '845f5ec2-bdf2-45b8-a87d-2f53c774db8d',
            properties: ['78fdd81c-5ef2-4853-b251-7e2dcc057f38'],
            property_manager_id: ['1ec37be2-ca70-4439-be96-b3a88881de46'],
            removed_properties: ['66ef7f54-ab6e-463e-b463-88e7a9c3ee1a', '43e0b9f5-0703-4ab4-9cd8-15ffc62f2402']

        };

        const response = await request.post('/assign_properties_shadow_user')
            .set({ Authorization: live_id_token })
            .set({ permissions: live_permissions_token })
            .send({
                shadow_user_id: assign.shadow_user_id,
                properties: assign.properties,
                property_manager_id: assign.property_manager_id,
                removed_properties: assign.removed_properties
            });

        expect(response.status).toBe(200);
        // Add more assertions based on the response if needed

    });
    
     afterAll(async () => {
        await new Promise(resolve => setTimeout(() => resolve(), 2500)); // avoid jest open handle error
     });


});
