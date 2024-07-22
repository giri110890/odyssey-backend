const supertest = require('supertest');
const app = require('../../../app');
const request = supertest(app);
const app_config = require('./../../../config/config');
const auth = require('./../middleware/auth_validator');
const perm = require('../middleware/permission/permission_validator');
const { AccessRoles } = require('../middleware/permission/permissions');
const fs = require( 'fs' );
const path = require( 'path');

describe('Notification API', () => {

    var live_id_token = null;
    var live_access_token = null;

    var live_permissions_token = null;

    var test_property_manager_id = '2009eafe-aa15-4840-bd71-711a3dbcd3ff';

    beforeAll(async () => {

        // Login to test account to get live tokens
        const username = app_config.aws.cognito.testuser_username;
        const password = app_config.aws.cognito.testuser_password;
        const authenticationResult = await auth.getLiveAuthTokens(live_access_token, live_id_token, username, password);
        live_id_token = authenticationResult.id_token;
        live_access_token = authenticationResult.access_token;


        // get a permissions token
        live_permissions_token = await perm.buildPermissionsToken({ user_id: test_property_manager_id, access: [AccessRoles.PropertyManager]});


    });

    // add unit
    it('should create a new unit', async () => {
        const unit = {
            property_id: 'ba271b9a-14a6-405e-9411-03b4df9ec6cb',
            property_manager_id: "1d3093a5-cea7-4811-8c0b-9977e4998b51"

        };
        const newUnit = {
            unit_type: "Unit Type",
            unit_number: "756241387956",
            bedroom_count: "2",
           // no_of_bed: "2",
            no_of_bathroom: "1"
        };
        const result = await request.post('/create_unit')
            .query({ property_id: unit.property_id })
            .set({ Authorization: live_id_token })
            .set( { permissions: live_permissions_token } )   // Add permissions token
            .send(newUnit)
            .expect(200);
        
        const result1 = await request.delete('/delete_unit')
            .query({ property_id: unit.property_id , unit_id:result.body.unit_id, property_manager_id:unit.property_manager_id})
            .set({ Authorization: live_id_token })
            .set( { permissions: live_permissions_token } )   // Add permissions token
            .expect(200);
            
        // expect(result.body).toHaveProperty('property_id', unit.property_id);
    });

    //get all
    it('should get all units of a property', async () => {
        const unit = {
            property_id: 'b8ee2dbd-ab78-4581-9d7d-67ee7425a81d'
        };
        const result = await request.get('/all_units')
            .query({ property_id: unit.property_id })
            .set({ Authorization: live_id_token })
            .set( { permissions: live_permissions_token } )   // Add permissions token
            .expect(200);
        
        expect(result.body[0]).toHaveProperty('units');

    });
    // get unit details
    it('should get a units  details of a property', async () => {
        const unit = {
            property_id: 'ba271b9a-14a6-405e-9411-03b4df9ec6cb',
            unit_id: "55a89b0a-16ff-4537-b0d2-56bcc4ca9b94"
        };
        const result = await request.get('/unit_details')
            .query({ property_id: unit.property_id, unit_id: unit.unit_id })
            .set({ Authorization: live_id_token })
            .set( { permissions: live_permissions_token } )   // Add permissions token
            .expect(200);
        expect(result.body).toHaveProperty('unit_id');

    });
    //update unit
    it('should update unit details', async () => {
        const update_unit = {
            property_manager_id: "1d3093a5-cea7-4811-8c0b-9977e4998b51",
            property_id: "ba271b9a-14a6-405e-9411-03b4df9ec6cb",
            unit_id: '55a89b0a-16ff-4537-b0d2-56bcc4ca9b94',
        }
        const updated_details = {
            id: update_unit.unit_id,
            unit_id: "XYZ123",
            unit_type: "MORDEN",
            bedroom_count: "1",
            //no_of_bed: "2",
            no_of_bathroom: "1"
        }
        const result = await request.post('/update_unit')
            .query({ property_manager_id: update_unit.property_manager_id, property_id: update_unit.property_id, unit_id: update_unit.unit_id })
            .set({ Authorization: live_id_token })
            .set( { permissions: live_permissions_token } )   // Add permissions token
            .send(updated_details)
            .expect(200);
        expect(result.body).toHaveProperty('id');

    })

    it('do a bulk upload of units and tenants', async () => {
        // Create a property to bulk upload into
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
    
        const property_res = await request.post('/add_property/')
            .send(newProperty)
            .set({ Authorization: live_id_token })
            .set( { permissions: live_permissions_token } )   // Add permissions token
            .expect(200);


        // Upload bulk upload template csv file
        const filePath = path.resolve(__dirname, '../../../test-data/bulk-upload-template.csv');
        const fileBuffer = fs.readFileSync(filePath);

        const formData = new FormData();
        formData.append("myFile", new Blob(fileBuffer), 'sample-template.csv');

        const data = await request.post('/bulk_upload_units')
            .query( { property_id: property_res.body.id, property_manager_id: test_property_manager_id } )
            .set('Content-Type', 'multipart/form-data')  
            .set({ Authorization: live_id_token })
            .set( { permissions: live_permissions_token } )   // Add permissions token
            .attach('myFile', fileBuffer)
            .expect(200);
        
        expect(data.body).toHaveProperty('status', 'success'); // data returns nothing...
        
        // Check the tenants were created
        const rentals = await request.get('/all_rentals/' + property_res.body.id)
            .set({ Authorization: live_id_token })
            .set( { permissions: live_permissions_token } )   // Add permissions token
            .expect(200);

        let N106 = rentals.body.find((rental) => rental.unit_number === 'N106');
        expect(N106).toHaveProperty('move_in_date', '03/17/2022');
        expect(N106).toHaveProperty('certification_date', '3/1/2022');

        // Clean up the property we created
        const result3 = await request.delete('/delete_property')
            .query({ id: property_res.body.id , property_manager_id: test_property_manager_id})
            .set({ Authorization: live_id_token })
            .set( { permissions: live_permissions_token } )   // Add permissions token
            .expect(200);
    });

});