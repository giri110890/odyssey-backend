const supertest = require('supertest');
const app = require('../../../app');
const request = supertest(app);
const assert = require('assert');
const app_config = require('./../../../config/config');
const auth = require('../middleware/auth_validator');
const perm = require('../middleware/permission/permission_validator');
const { AccessRoles } = require('../middleware/permission/permissions');
const uuid = require('uuid');

describe('Property API', () => {

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
        live_permissions_token = await perm.buildPermissionsToken({ user_id: '2009eafe-aa15-4840-bd71-711a3dbcd3ff', access: [AccessRoles.PropertyManager] });

    });

    //get all question code
    it('should get all custom and standard codes - with standard questions but no custom questions', (done) => {
        const manager = {
            property_manager_id: '79de1527-c220-4213-9664-ee43a21bca28',
        }
        request.get('/all_question_code/')
            .query({ property_manager_id: manager.property_manager_id })
            .set({ Authorization: live_id_token })
            .set({ permissions: live_permissions_token })   // Add permissions token
            .expect(200)
            .end((err, res) => {
                if (err) return done(err);
                // Check custom code, but there won't be a question because we don't have a questionnaire_id.
                let customField = res.body.find((item) => item.question_code === 'PROPERTY_NAME');
                expect(customField.text).toHaveLength(0);

                // Check standard question
                let employedIncomeStandardQuestion = res.body.find((item) => item.question_code === 'EM_INCOME');
                expect(employedIncomeStandardQuestion).toHaveProperty('text', 'ENTER YOUR MONTHLY GROSS INCOME:');
                done();
            });
    });


    it('should get all custom and standard codes - with standard and custom questions', (done) => {
        const manager = {
            property_manager_id: 'c458f4a8-c0f1-7051-261d-09cb8b007f51',
        }
        // Pass a questionnaire_id to get custom questions included in the response
        const questionnaire_id = 'b2537b1e-15f3-43ef-a2e7-b3e758949411';
        request.get('/all_question_code/')
            .query({ property_manager_id: manager.property_manager_id, questionnaire_id: questionnaire_id })
            .set({ Authorization: live_id_token })
            .set({ permissions: live_permissions_token })   // Add permissions token
            .expect(200)
            .end((err, res) => {
                if (err) return done(err);
                // Check custom code
                let customField = res.body.find((item) => item.question_code === 'PROPERTY_NAME');
                expect(customField).toHaveProperty('label', 'property_name');

                // Check custom question from questionnaire_id is being applied
                let customQuestion = res.body.find((item) => item.question_code === 'FUNDS_SOURCE');
                expect(customQuestion).toHaveProperty('text', '<p>Questionnaire question - what is your funds source?</p>');

                // Check standard question
                let employedIncomeStandardQuestion = res.body.find((item) => item.question_code === 'EM_INCOME');
                expect(employedIncomeStandardQuestion).toHaveProperty('text', 'ENTER YOUR MONTHLY GROSS INCOME:');
                done();
            });
    });

    // should update mapping position
    it('should update mapping position in form', (done) => {
        const manager = {
            property_manager_id: '1d3093a5-cea7-4811-8c0b-9977e4998b51',
            form_id: "1d3093a5-cea7-4811-8c0b-9977e4998b51/HUD 5382.pdf",
            field_id: "503e7e09-eec1-4d11-894c-1c61cb5ee362"
        };
        const position = {
            position: [
                {
                    X: "12345",
                    Y: "32546"
                },
                {
                    X: "4235435",
                    Y: "2355"
                },
                {
                    X: "235",
                    Y: "435"
                },
                {
                    X: "546",
                    Y: "6587"
                }
            ]
        }
        request.post('/update_mapping_position')
            .query({ property_manager_id: manager.property_manager_id, form_id: manager.form_id, field_id: manager.field_id })
            .send(position)
            .set({ Authorization: live_id_token })
            .set({ permissions: live_permissions_token })   // Add permissions token
            .expect(200)
            .end((err, res) => {
                if (err) return done(err);

                expect(res.body).toHaveProperty('status', true);
                done();
            });
    });
    //get all mapped form
    it('should get all mapped form', (done) => {
        const manager = {
            property_manager_id: 'c458f4a8-c0f1-7051-261d-09cb8b007f51',
        }
        request.get('/all_mapped_form/')
            .query({ property_manager_id: manager.property_manager_id })
            .set({ Authorization: live_id_token })
            .set({ permissions: live_permissions_token })   // Add permissions token
            .expect(200)
            .end((err, res) => {
                if (err) return done(err);
                expect(res.body[0]).toHaveProperty('formID');
                done();
            });
    });
    //get mapping of a form id
    it('should get  a mappings of a given for id', (done) => {
        const form = {
            form_id: '1',
        }
        request.get('/mapping_by_form_id/')
            .query({ form_id: form.form_id })
            .set({ Authorization: live_id_token })
            .set({ permissions: live_permissions_token })   // Add permissions token
            .expect(200)
            .end((err, res) => {
                if (err) return done(err);
                expect(res.body[0]).toHaveProperty('fields');
                done();
            });
    });
    // add question code
    it('should create a new field', async () => {
        const newField =
            { label: "property_name", question_code: "PROPERTY_NAME" };

        const manager = {
            property_manager_id: 'c458f4a8-c0f1-7051-261d-09cb8b007f51',
        }
        const res = await request.post('/create_field')
            .set({ Authorization: live_id_token })
            .set({ permissions: live_permissions_token })   // Add permissions token
            .send(newField)
            .query({ property_manager_id: manager.property_manager_id })
            .expect(200)


    });
    // delete field

    it('should delete a new field', async () => {
        // Create Field matches on either of label or question_code so make sure both are unique.
        const newField =
            { label: "delete_field" + uuid.v4(), question_code: "delete_field" + uuid.v4() };

        const manager = {
            property_manager_id: 'c458f4a8-c0f1-7051-261d-09cb8b007f51',
        }
        const res = await request.post('/create_field')
            .set({ Authorization: live_id_token })
            .set({ permissions: live_permissions_token })   // Add permissions token
            .send(newField)
            .query({ property_manager_id: manager.property_manager_id })

        const result2 = await request.delete('/delete_field')
            .set({ Authorization: live_id_token })
            .set({ permissions: live_permissions_token })   // Add permissions token
            .query({ property_manager_id: manager.property_manager_id, field_id: res.body.id })
            .expect(200)
        assert(res.body.id == result2.body.deleted_id)

    });

    // to link form with questionnaire  
    it('should link form with questionnaire ', async () => {
        const newField =
        {
            id: "0a13b2e2-82c7-4179-8f28-9247397aca31",
            questionnaire_id: "123456768790"
        };

        const manager = {
            property_manager_id: 'c458f4a8-c0f1-7051-261d-09cb8b007f51',
        }
        const res = await request.post('/link_form_with_questionnaire')
            .set({ Authorization: live_id_token })
            .set({ permissions: live_permissions_token })   // Add permissions token
            .send(newField)
            .query({ property_manager_id: manager.property_manager_id })
            .expect(200)

    });
    // to get form details by qa id
    it('should get form details by qa id', async () => {
        const questionId =
        {
            property_manager_id: "1d3093a5-cea7-4811-8c0b-9977e4998b511",
            qaId: "4f47e74f-0cd5-4956-a22b-a5bd934b2ac8"
        };

        const res = await request.get('/get_form_data_by_qa_id')
            .set({ Authorization: live_id_token })
            .set({ permissions: live_permissions_token })   // Add permissions token
            .query({ property_manager_id: questionId.property_manager_id, qaId: questionId.qaId })
            .expect(200)

    });
    // remove mapping
    it('should remove field from mapping', async () => {
        const questionId =
        {
            property_manager_id: "c458f4a8-c0f1-7051-261d-09cb8b007f51",
            form_id: "1d3093a5-cea7-4811-8c0b-9977e4998b51/Application.pdf",
            field_id: "422cba83-df87-4879-a45b-02a9fc789c2a"
        };

        const res = await request.post('/remove_mappings')
            .set({ Authorization: live_id_token })
            .set({ permissions: live_permissions_token })   // Add permissions token
            .query({ property_manager_id: questionId.property_manager_id, form_id: questionId.form_id, field_id: questionId.field_id })
            .expect(200)

    });
    // add mapping
    it('should create a new mapping', async () => {
        const newField =
        {
            "form_id": "1",
            "fields": [
                {
                    "id": "adjbkasbjndkasjnd",
                    "position": [10, 20, 100],
                    "question_code": "PROPERTY_NAME",
                    "pg_no": "1"
                }
            ],
            "form_title": "Resident Notification Letter"
        }
        const manager = {
            property_manager_id: 'c458f4a8-c0f1-7051-261d-09cb8b007f51',
        }
        const res = await request.post('/add_mapping')
            .set({ Authorization: live_id_token })
            .set({ permissions: live_permissions_token })   // Add permissions token
            .send(newField)
            .query({ property_manager_id: manager.property_manager_id })
            .expect(200)

    });


    it('should get update custom field', async () => {
        const ID =
        {
            property_manager_id: "1ec37be2-ca70-4439-be96-b3a88881de46",
        };

        const res = await request.get('/update_old_custom_field/')
            .set({ Authorization: live_id_token })
            .set({ permissions: live_permissions_token })   // Add permissions token
            .query({ property_manager_id: ID.property_manager_id })
            .expect(200)

    });
    // afterAll(async () => {
    //     await new Promise(resolve => setTimeout(() => resolve(), 2500)); // avoid jest open handle error
    // });

});
