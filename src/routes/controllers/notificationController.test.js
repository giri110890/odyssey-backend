const supertest = require('supertest');
const app = require('../../../app');
const request = supertest(app);
const app_config = require('./../../../config/config');
const auth = require('./../middleware/auth_validator');
const perm = require('../middleware/permission/permission_validator');
const { AccessRoles } = require('../middleware/permission/permissions');



describe('Notification API', () => {

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
        live_permissions_token = await perm.buildPermissionsToken({ user_id: '678d3c55-dd49-47e7-b594-3546363e4985', access: [AccessRoles.PropertyManager]});

    });

    // add notification

    // it('should create a new notification', async () => {
    //     const notification = {
    //         user_id: "868612ac-c6e7-4d29-b9f5-8460be0ad471",
    //         title: "Client form sent",
    //         message: "Email has beed sended to user along with client form",
    //         time: "01.25 pm"
    //     };
    //     const res = await request.post('/add_notification')
    //         .send(notification)
    //         .expect(200)
    //         .then((err, res) => {
    //             if (err) return { err };
    //             console.log('notification added ');
    //             expect(res.body).toHaveProperty('title', notification.title);
    //             console.log('add notification succeeded');
    //         });
    // });

    // // update notification
    // it('should update notification by given notification id', (done) => {
    //     const notification = {
    //         notification_id: "441da7f7-5bfd-4e40-9039-7f047ba4907a",
    //         user_id: "868612ac-c6e7-4d29-b9f5-8460be0ad471"
    //     }
    //     request.post('/update_notification')
    //         .query({ notification_id: notification.notification_id, user_id: notification.user_id })
    //         .expect(200)
    //         .end((err, res) => {
    //             if (err) return done(err);
    //             expect(res.body[0]).toHaveProperty('title');
    //             done();
    //         });
    // });

    //get a notification
    it('should get notification by given id', (done) => {
        const notification = {
            user_id: "868612ac-c6e7-4d29-b9f5-8460be0ad471"
        }
        request.get('/get_notification')
            .query({ user_id: notification.user_id })
            .set({ Authorization: live_id_token })
            .set( { permissions: live_permissions_token } )   // Add permissions token
            .expect(200)
            .end((err, res) => {
                if (err) return done(err);
                expect(res.body[0]).toHaveProperty('title');
                done();
            });
    });
    //create a message
    it('should create a new message', async () => {
        const newField =
        {
            "message": {
                "from": "3f2fb16f-5fc7-44ef-bb76-455848bb0316",
                "to": "1ec37be2-ca70-4439-be96-b3a88881de46",
                "content": "HI, this is tenant"
            },
            "role": "tenant"

        }
        const manager = {
            property_manager_id: '1ec37be2-ca70-4439-be96-b3a88881de46',
            tenant_id: '3f2fb16f-5fc7-44ef-bb76-455848bb0316'
        }
        const res = await request.post('/create_message')
            .set({ Authorization: live_id_token })
            .set( { permissions: live_permissions_token } )   // Add permissions token
            .send(newField)
            .query({ property_manager_id: manager.property_manager_id, tenant_id: manager.tenant_id })
            .expect(200)

    });
     //get all message
     it('should get all mapped form', (done) => {
        const manager = {
            tenant_id: 'cbbfd12c-b7cf-4b89-9c4b-efc06cd39e82',
        }
        request.get('/get_all_message/')
            .query({ tenant_id: manager.tenant_id })
            .set({ Authorization: live_id_token })
            .set( { permissions: live_permissions_token } )   // Add permissions token
            .expect(200)
            .end((err, res) => {
                if (err) return done(err);
                expect(res.body[0]).toHaveProperty('message');
                done();
            });
    });

});