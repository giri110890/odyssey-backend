const supertest = require('supertest');
const app = require('../../../app');
const request = supertest(app);
const assert = require('assert');
const app_config = require('./../../../config/config');
const auth = require('../middleware/auth_validator');
const perm = require('../middleware/permission/permission_validator');
const { AccessRoles } = require('../middleware/permission/permissions');


describe('Property API', () => {

    var live_id_token = null;
    var live_access_token = null;

    beforeAll(async () => {

        // Login to test account to get live tokens
        const username = app_config.aws.cognito.testuser_username;
        const password = app_config.aws.cognito.testuser_password;
        const authenticationResult = await auth.getLiveAuthTokens(live_access_token, live_id_token, username, password);
        live_id_token = authenticationResult.id_token;
        live_access_token = authenticationResult.access_token;

        // get a permissions token
        live_permissions_token = await perm.buildPermissionsToken({ user_id: '678d3c55-dd49-47e7-b594-3546363e4985', access: [AccessRoles.PropertyManager]});

    });
    //get all question code
    it('should change status ', (done) => {
        const details = {
            rental_id: 'fff7c03f-01cc-44e4-a18f-6bcfe501729e',
            tenant_id: "69770e55-bbc8-45c9-ad98-873b511a7c9f",
            formID: "ff164362-fb2f-4b29-abd5-c8094fedf8b4"
        }
        request.post('/change_status/')
            .query({ rental_id: details.rental_id, tenant_id: details.tenant_id, formID: details.formID })
            .set({ Authorization: live_id_token })
            .set( { permissions: live_permissions_token } )   // Add permissions token
            .expect(200)
            .end((err, res) => {
                if (err) return done(err);

                expect(res.body.id).toContain(details.rental_id)
                // expect(res.body).toHaveProperty(message);
                done();
            });
    });
    // it('should add answer ', (done) => {
    //     const details = {
    //         rental_id: 'b3b87c7d-2ff2-49b3-b208-44e433abc065',
    //         tenant_id: "9d3c8f1b-1fae-4936-a9d2-f2c2da26300a",
    //         question_id: "eadc8e9f-f052-4d94-9ba7-1dc5b54b5891"
    //     }
    //     const answer = {
    //         answer: {
    //             "DEMO_RAM": {
    //                 "value": "Answer",
    //                 "data_type": "text",
    //                 "target": "e6330b04-b0c5-482a-a9b5-5c6e48965b8e"
    //             },
    //             "DEMO_SIXTY": {
    //                 "value": "5000",
    //                 "data_type": "text",
    //                 "target": "32c8ed91-599d-4b09-9a4f-a3b9d537a868"
    //             },
    //             "DEMO_STREETONE": {
    //                 "value": "Main road",
    //                 "data_type": "text",
    //                 "target": "ea40c3d1-f7d4-4981-b6c7-9778de22d2bf"
    //             }
    //         }
    //     };

    //     request.post('/add_answer/')
    //         .query({ rental_id: details.rental_id, tenant_id: details.tenant_id, questionnaire_ids: details.question_id })
    //         .send(answer)
    //         .set({ Authorization: live_id_token })
    //         .set( { permissions: live_permissions_token } )   // Add permissions token
    //         .expect(200)
    //         .end((err, res) => {
    //             if (err) return done(err);
    //             console.log(res.body)

    //             expect(res.body).toHaveProperty('success');
    //             done();
    //         });
    // });
    it('should get answer ', (done) => {
        const details = {
            tenant_id: "277854e4-adb8-402f-9458-42b7141e5501",
            rental_id: "8be7f065-dcd1-4cfa-9253-fab13737af71"
        }
        request.get('/get_answers/')
            .query({ tenant_id: details.tenant_id, rental_id: details.rental_id })
            .set({ Authorization: live_id_token })
            .set( { permissions: live_permissions_token } )   // Add permissions token
            .expect(200)
            .end((err, res) => {
                if (err) return done(err);

                expect(res.body[0]).toHaveProperty('answer')
                // expect(res.body).toHaveProperty(message);
                done();
            });
    });
});