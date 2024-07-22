const supertest = require('supertest');
const app = require('../../../app');
const request = supertest(app);
const assert = require('assert');
const app_config = require('./../../../config/config');
const auth = require('../middleware/auth_validator');
const perm = require('../middleware/permission/permission_validator');
const { AccessRoles } = require('../middleware/permission/permissions');
const uuid = require('uuid');
const { getRentalsUsingTenantId } = require('../../data_store/rentals');

describe('Rental API', () => {

    var live_id_token = null;
    var live_access_token = null;
    var live_permissions_token = null;

    beforeAll(async () => {

        // Login to test account to get live tokens
        const username = app_config.aws.cognito.testuser_username;
        const password = app_config.aws.cognito.testuser_password;
        const authenticationResult = await auth.getLiveAuthTokens(live_access_token, live_id_token, username, password);
        live_id_token = authenticationResult.id_token;
        live_access_token = authenticationResult.access_token;

        // get a permissions token
        live_permissions_token = await perm.buildPermissionsToken({ user_id: '678d3c55-dd49-47e7-b594-3546363e4985', access: [AccessRoles.PropertyManager] });

    });


    //get all rental details
    it('should get all rental details of a property Id', (done) => {

        var property_id = 'ba271b9a-14a6-405e-9411-03b4df9ec6cb';
        const res = request.get('/all_rentals/' + property_id)
            .set({ Authorization: live_id_token })
            .set({ permissions: live_permissions_token })   // Add permissions token
            .expect(200)
            .end((err, res) => {
                if (err) return done(err);
                // Ensure that we have rentals from the right property_id.
                expect(res.body[0]).toHaveProperty('property_id', property_id);
                // console.log('all rental succeeded');
                done();
            });
    });
    //get all rental details using tenant_id
    it('should get all rental details of a tenant Id', (done) => {
        const tenant = {
            tenant_id: "dd907eda-04f5-4abe-8a78-75e4bb004096"
        }

        const res = request.get('/get_rentals_by_tenant_id/')
            .query({ tenant_id: tenant.tenant_id })
            .set({ Authorization: live_id_token })
            .set({ permissions: live_permissions_token })   // Add permissions token
            .expect(200)
            .end((err, res) => {
                if (err) return done(err);
                // Ensure that we have rentals from all tenant id
                expect(res.body[0].tenant_id).toContain(tenant.tenant_id);

                //expect(res.body[0].tenant_id).toHaveProperty('tenant_id', tenant.tenant_id)
                done();
            });
    });
    //get all rental details using tenant_id
    it('should get all rental details using rental id', (done) => {
        const rental = {
            rental_id: "20c2a604-e897-4f2f-81cf-1b69bee4d818"
        }

        const res = request.get('/get_rental_details/')
            .query({ rental_id: rental.rental_id })
            .set({ Authorization: live_id_token })
            .set({ permissions: live_permissions_token })   // Add permissions token
            .expect(200)
            .end((err, res) => {
                if (err) return done(err);
                // Ensure that we have rentals from all tenant id

                expect(res.body[0]).toHaveProperty('id', rental.rental_id);
                done();
            });
    });
    //get all rental questionnaire by rental id
    it('should get all questionnaire by tenant Id', (done) => {
        const tenant = {

            tenant_id: "dd907eda-04f5-4abe-8a78-75e4bb004096",
            questionnaire_id: 'a157fd01-e6cd-4ba4-bc82-008862c79131', // 'b83396b7-5587-41a6-930d-53c155941d00'
        }
        var rental_id = 'c1c2106c-de5b-4e0e-a917-929989556201';

        const res = request.get('/rental_questionnaires/' + rental_id)
            .query({ tenant_id: tenant.tenant_id, questionnaire_id: tenant.questionnaire_id })
            .set({ Authorization: live_id_token })
            .set({ permissions: live_permissions_token })   // Add permissions token
            .expect(200)
            .end((err, res) => {
                if (err) return done(err);

                if (res.body.qaSet&& res.body.qaSet[0]) {
                    // Ensure that we have rentals from all tenant id
                    expect(res.body.qaSet[0].questions).toEqual(expect.any(Array));
                    expect(res.body.qaSet[0].questions.length).toBeGreaterThan(0);
                }
                // expect(res.body[0].questions).toHaveProperty('questions')
                done();
            });
    });
    // all rentals by unit id
    it('should get all rental details by unit Id', (done) => {
        const unit = {
            unit_id: "45dab132-6cd6-4457-b055-d2bb5a7be964"
        }

        const res = request.get('/get_rentals_by_unit_id/')
            .query({ unit_id: unit.unit_id })
            .set({ Authorization: live_id_token })
            .set({ permissions: live_permissions_token })   // Add permissions token
            .expect(200)
            .end((err, res) => {
                if (err) return done(err);
                // Ensure that we have rentals from all tenant id

                expect(res.body[0]).toHaveProperty('unit_id', unit.unit_id);

                //expect(res.body[0]).toContain(unit.unit_id)
                done();
            });
    });
    //get all rental details
    it('should NOT find all rental details of a property Id', (done) => {

        var property_id = '0c01fc0b-8354-463f-8239-not-there';
        const res = request.get('/all_rentals/' + property_id)
            .set({ Authorization: live_id_token })
            .set({ permissions: live_permissions_token })   // Add permissions token
            // Note that we expect a 200 response even though there are no rentals.
            .expect(200)
            .end((err, res) => {
                if (err) return done(err);
                // Ensure that we have no rentals from a non-existent property.
                expect(res.body.length == 0);
                done();
            });
    });

    // send client form
    it('should send client form and notification', async () => {
        const client_form = {
            rental_id: "663a4d71-75b3-451e-ad78-6ac6029d9719",
            unit_id:"c924276a-de80-45a2-967f-469fb6d4320d",
            required_forms: [{ id: 1 }],
            tenant_ids: ["dd907eda-04f5-4abe-8a78-75e4bb004096"]
        }
        const result = await request.post('/send_client_form')
            .query({ rental_id: client_form.rental_id,unit_id:client_form.unit_id })
            .set({ Authorization: live_id_token })
            .set({ permissions: live_permissions_token })   // Add permissions token
            .send(client_form)
            //console.log(result.body)
            .expect(200);

    });

     // assign tenant
     it('should try to assign an existing tenant', async () => {
        const assign = {
            property_id: "5d7c3a55-c7f1-49f0-ab82-1c5706fe76eb",
            unit_id: "67b96b55-200c-4921-81d0-725d79af0e6e",
            tenant_id: "dd907eda-04f5-4abe-8a78-75e4bb004096"
        }
        const res = await request.post('/assign_tenant')
            .set({ Authorization: live_id_token })
            .set({ permissions: live_permissions_token })   // Add permissions token
            .send({ property_id: assign.property_id, unit_id: assign.unit_id, tenant_id: assign.tenant_id, move_in_date: '2021-01-01' })
            .expect(200);
        expect(res.body.status).toBe("AlreadyAssigned");
    });

    it('should fail to assign a null tenant', async () => {
        const assign = {
           
            property_id: "f3fa24ce-2378-496c-8c0f-7948e1a929a6",
            unit_id: "cba27356-c6b7-4d7f-8ff7-00e88598354b",
            tenant_id: null
        }
        const res = await request.post('/assign_tenant')
            .set({ Authorization: live_id_token })
            .set({ permissions: live_permissions_token })   // Add permissions token
            .send({ property_id: assign.property_id, unit_id: assign.unit_id, tenant_id: assign.tenant_id })
            .expect(400);
        assert(res.body == "No tenant_id provided");
    });

    
    it('should add a rental for a new tenant', async () => {
        const assign = {
           
            property_id: "5d7c3a55-c7f1-49f0-ab82-1c5706fe76eb",
            unit_id: "67b96b55-200c-4921-81d0-725d79af0e6e",
            tenant_id: uuid.v4()
        }
        const res = await request.post('/assign_tenant')
            .set({ Authorization: live_id_token })
            .set({ permissions: live_permissions_token })   // Add permissions token
            .send({ property_id: assign.property_id, unit_id: assign.unit_id, tenant_id: assign.tenant_id })
            .expect(200);
        expect(res.body.status).toBe("success");

        // Get the newly created rental record
        let rental = await getRentalsUsingTenantId(assign.tenant_id);
        assert(rental.length == 1);
        assert(rental[0].unit_id == assign.unit_id);
        assert(rental[0].tenantId == assign.tenant_id);
    });

});

afterAll(async () => {
    await new Promise(resolve => setTimeout(() => resolve(), 2000)); // avoid jest open handle error
});