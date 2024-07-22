const supertest = require('supertest');
const app = require('../../../app');
const request = supertest(app);
const app_config = require('./../../../config/config');
const auth = require('../middleware/auth_validator');
const perm = require('../middleware/permission/permission_validator');
const { AccessRoles } = require('../middleware/permission/permissions');


describe('Questionnaire API', () => {

    var live_id_token = null;
    var live_access_token = null;
  
    beforeAll( async () => {
        jest.setTimeout(60000);
        // Login to test account to get live tokens
      const username = app_config.aws.cognito.testuser_username;
      const password = app_config.aws.cognito.testuser_password;
      const authenticationResult = await auth.getLiveAuthTokens(live_access_token, live_id_token, username, password);
      live_id_token = authenticationResult.id_token;
      live_access_token = authenticationResult.access_token;

      // get a permissions token
      live_permissions_token = await perm.buildPermissionsToken({ user_id: '2009eafe-aa15-4840-bd71-711a3dbcd3ff', access: [AccessRoles.PropertyManager]});

    });
  
// add questionnaire
it('should create a questionnaire', async () => {
    const questionnaire = {
        property_manager_id: '2113-dfffe-123dsf-234d'
    };
    const newQuestionare = {
        title: "income 1",
        questions: [
            {
                text: "<p>what is your income</p>",
                answer_type: "number",
                code: "INCOME",
                id: "1234567890",
                description: "<p>enter your income</p>",
                options: [
                    {
                        label: "yes",
                        value: "true",
                        target: "54356246752463457",
                        type: "radio"
                    }
                ]
            },
            {
                text: "<p>what is your name</p>",
                answer_type: "text_short",
                code: "NAME",
                id: "098766554321",
                description: "<p>what is your name</p>",
                options: [
                    {
                        label: "no",
                        value: "false",
                        target: "869838hdiu34y986",
                        type: "multi_select"
                    }
                ]
            }
        ]
    };
    const result = await request.post('/create_questionnaire')
        // .send(newQuestionare);
    .query({property_manager_id:questionnaire.property_manager_id})
    .set({ Authorization: live_id_token })
    .set( { permissions: live_permissions_token } )   // Add permissions token
    .send(newQuestionare);
    expect(result.status).toEqual(200);
    // expect(result.body).toHaveProperty('title');
    expect(result.body).toHaveProperty('property_manager_id', questionnaire.property_manager_id)
});

//get all questionnaire
it('should get all questionnaires', (done) => {
    const allQuestionnaire = {
        property_manager_id: '1ec37be2-ca70-4439-be96-b3a88881de46'
    };
    request.get('/all_questionnaire')
        .query({ property_manager_id: allQuestionnaire.property_manager_id })
        .set({ Authorization: live_id_token })
        .set( { permissions: live_permissions_token } )   // Add permissions token
        .expect(200)
        .end((err, res) => {
            if (err) return done(err);
            // console.log('All question returned');
            expect(res.body[0]).toHaveProperty('property_manager_id', allQuestionnaire.property_manager_id);
            // console.log('all Questionnaire succeeded');
            done();
        });
});
//get a questionnaire
it('should get questionnaire by given id',  (done) => {
    var questionnaire_id = '89aee0dd-4aef-44f9-8a59-9b84a0e28ca7';
    request.get('/questionnaire/' + questionnaire_id)
        .set({ Authorization: live_id_token })
        .set( { permissions: live_permissions_token } )   // Add permissions token
        .expect(200)
        .end((err, res) => {
            if (err) return done(err);
            // console.log(' units returned');
            expect(res.body[0]).toHaveProperty('id', questionnaire_id);
            // console.log('newQuestionnaire succeeded');
            done();
        });
});
// update a questionnaire


});

afterAll(async () => {
    await new Promise(resolve => setTimeout(() => resolve(), 1000)); // avoid jest open handle error
}); 