const supertest = require('supertest');
const app = require('../../app');
const request = supertest(app);
const assert = require('assert');
const app_config = require('./../../config/config');
const auth = require('../routes/middleware/auth_validator');
const perm = require('../routes/middleware/permission/permission_validator');
const { AccessRoles } = require('../routes/middleware/permission/permissions');
const { getNextQuestion } = require('./answer_service');

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
        live_permissions_token = await perm.buildPermissionsToken({ user_id: '2009eafe-aa15-4840-bd71-711a3dbcd3ff', access: [AccessRoles.PropertyManager]});

    });

    it('get next question ', async () => {
        //get next question id and questionnaire id for UI
        const _currentQuestionnaireID = "0645d538-7bc1-4f0d-af37-09ff820a5abf"; // odyssey.test.user2023@gmail.com in dev2
        const _currentQuestionID = "2faa9666-8be4-4ce9-9323-1133fc0f7662";
        const _tenantID = "c3245ddd-94a9-46bb-870b-148a1d7f8aed";   
        const _rentalID = "c1fbf9b6-3480-46d4-b738-7aea95c1e1d7";


        // The next question does not depend on the answer to the previous question.
        let _nextQuestion = await getNextQuestion(_currentQuestionnaireID, _currentQuestionID, _tenantID, _rentalID);

        expect(_nextQuestion.question_id).toBe("11d1bc3b-c205-419f-a19e-99c058ae325d");

        let result = await request.post('/add_answer')
            .query({
                tenant_id: _tenantID,
                rental_id: _rentalID,
                question_id: _currentQuestionID,
                questionnaire_id: _currentQuestionnaireID })
            .set({ Authorization: live_id_token })
            .set( { permissions: live_permissions_token } )   // Add permissions token
            .send( {"answer": {
                    "WEL_ASSET": {
                        "value":[{"value":"7","answerType":"text","target":"11d1bc3b-c205-419f-a19e-99c058ae325d"}],
                        "data_type":"text",
                        "qaId":"2faa9666-8be4-4ce9-9323-1133fc0f7662"},
                    "EM_PLOYED": {
                        "value":[{"value":"No","answerType":"boolean","target":"248c07bd-92a1-494f-9790-5a2d3d04997a"}],
                        "data_type":"boolean",
                        "qaId":"11d1bc3b-c205-419f-a19e-99c058ae325d"}
                    }} )
            .expect(200)
        
        // The next question depends on the answer to the previous question.
        let _thirdQuestion = await getNextQuestion(_nextQuestion.questionnaire_id, _nextQuestion.question_id, _tenantID, _rentalID);

        expect(_thirdQuestion.question_id).toBe("248c07bd-92a1-494f-9790-5a2d3d04997a");
    })

    it('get last question', async () => {
        const question_id = 'a18f2002-36e3-46ca-8116-5b3c81070626';
        const questionnaire_id = '0645d538-7bc1-4f0d-af37-09ff820a5abf';
        const tenant_id = 'e5102370-7a32-4e20-a5fb-3189ce5f2ac9';   // odyssey.test.user2023+formtenant@gmail.com in dev2
        const rental_id = '908195fe-4e1d-4130-8a1d-8cb22c846187';

        // question_id is the last question.
        let _nextQuestion = await getNextQuestion(questionnaire_id, question_id, tenant_id, rental_id);

        expect(_nextQuestion).toBe("EOF");
    })
});