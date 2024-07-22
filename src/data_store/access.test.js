// const supertest = require('supertest');
// const app = require('../../../app');
// const request = supertest(app);
const app_config = require('../../config/config');
const access_module = require('./access');
const { AccessRoles } = require('../routes/middleware/permission/permissions');
const uuid = require('uuid');
const exp = require('constants');
const { get } = require('http');
const array_utils = require('../utils/array_utils');

describe('Access Data Store', () => {

    beforeAll(async () => {
        // Create a new access record for a new user

    });

    let new_access = null;

    // add access record
    it('should create a new access record', async () => {
        let new_user_id = uuid.v4();

        const access = {
            access: [AccessRoles.PropertyManager],
            user_id: new_user_id
        };
        const result = await access_module.createItem(access);
        expect(result).toHaveProperty('id', access.id);

        // Get the record

        const get_result = await access_module.getItem(new_user_id);
        expect(get_result[0]).toHaveProperty('user_id', new_user_id);
        expect(array_utils.arrayEquals(get_result[0].access, [AccessRoles.PropertyManager])).toBe(true);
        expect(get_result[0]).toHaveProperty('id', result.id);

        // Update the record
        const update_access = {
            access: [AccessRoles.Tenant],
            user_id: new_user_id,
            id: get_result[0].id,
        }

        const update_result = await access_module.updateItem(update_access);
        expect(update_result).toHaveProperty('id', update_access.id);

        const get_updated_result = await access_module.getItem(new_user_id);
        expect(get_updated_result.length).toEqual(1);
        expect(get_updated_result[0]).toHaveProperty('user_id', new_user_id);
        expect(array_utils.arrayEquals( get_updated_result[0].access, [AccessRoles.Tenant])).toBe(true);
        expect(get_updated_result[0]).toHaveProperty('id', result.id);

        // Delete the record
        const delete_result = await access_module.deleteItem(new_user_id);

        // Check that the record is deleted
        const get_deleted_result = await access_module.getItem(new_user_id);
        expect(get_deleted_result.length).toEqual(0);

    });

        // add access record
        it('should not change access when null roles are specified', async () => {
            let new_user_id = uuid.v4();

            const access = {
                access: [AccessRoles.PropertyManager],
                user_id: new_user_id
            };
            const result = await access_module.createItem(access);
            expect(result).toHaveProperty('id', access.id);

            const result2 = await access_module.ensureAccessExists(new_user_id, null);
            expect(result2).toHaveProperty('user_id', access.user_id);
            expect(result2.access[0]).toBe(AccessRoles.PropertyManager);
            expect(array_utils.arrayEquals(result2.access, access.access)).toBe(true);

            // Delete the record
            const delete_result = await access_module.deleteItem(access.user_id);

        });

        
        it('should change access field to array if necessary for existing user', async () => {
            let new_user_id = uuid.v4();

            // This is to handle old users with the old data format.
            const access = {
                access: AccessRoles.PropertyManager,
                user_id: new_user_id
            };
            const result = await access_module.createItem(access);
            expect(result).toHaveProperty('id', access.id);

            // Ensure that roles are preserved for existing access record.
            const result2 = await access_module.ensureAccessExists(new_user_id, null);
            expect(result2).toHaveProperty('user_id', access.user_id);
            // Should be an array now.
            expect(array_utils.arrayEquals(result2.access, [access.access])).toBe(true);

            // Delete the record
            const delete_result = await access_module.deleteItem(access.user_id);

        });

        it('should change access field to array if necessary for new user', async () => {
            let new_user_id = uuid.v4();

            const result2 = await access_module.ensureAccessExists(new_user_id, AccessRoles.PropertyManager);
            expect(result2).toHaveProperty('user_id', new_user_id);
            // Should be an array now.
            expect(array_utils.arrayEquals(result2.access, [AccessRoles.PropertyManager])).toBe(true);

            // Delete the record
            const delete_result = await access_module.deleteItem(result2.user_id);

        });

        it('new user without access role on login has null roles', async () => {
            let new_user_id = uuid.v4();

            const result2 = await access_module.ensureAccessExists(new_user_id, null);
            expect(result2).toHaveProperty('user_id', new_user_id);
            // Should be an array now.
            expect(array_utils.arrayEquals(result2.access, [null])).toBe(true);

            // Delete the record
            const delete_result = await access_module.deleteItem(result2.user_id);

        });

        it('existing access record with no options gets options updated', async () => {
            let new_user_id = uuid.v4();
            let shadowed_property_manager_id = "shadowed-76de-4abb-91a9-3f9e68d12fca";
            const access = {
                user_id: new_user_id,
                access: [AccessRoles.PropertyManager],
                options: {users: [shadowed_property_manager_id]}
                // no options
            };
            const result = await access_module.createItem(access);
            expect(result).toHaveProperty('id', access.id);

            let existing_user_id = new_user_id;
            
            const result2 = await access_module.ensureAccessExists(existing_user_id, AccessRoles.ShadowManager, 
                { users: [shadowed_property_manager_id] });
            expect(result2.options.users.includes(shadowed_property_manager_id)).toBe(true); 
            expect(result2.access[0]).toBe(AccessRoles.ShadowManager);

            const result3 = await access_module.deleteItem(result2.user_id);
        });

        it('existing access record with non-null options gets options updated', async () => {
            let new_user_id = uuid.v4();
            let shadowed_property_manager_id = "shadowed-76de-4abb-91a9-3f9e68d12fca";
            const access = {
                user_id: new_user_id,
                access: [AccessRoles.PropertyManager],
                options: { users: [shadowed_property_manager_id] }
            };
            const result = await access_module.createItem(access);
            expect(result).toHaveProperty('id', access.id);

            let existing_user_id = new_user_id;
            
            const result2 = await access_module.ensureAccessExists(existing_user_id, AccessRoles.ShadowManager, 
                { users: shadowed_property_manager_id, properties: ["prop1", "prop2"] });
            expect(result2.options.users.includes(shadowed_property_manager_id)).toBe(true); 
            expect(result2.options.properties.includes("prop1")).toBe(true); 
            expect(result2.options.properties.includes("prop2")).toBe(true); 
            expect(result2.access[0]).toBe(AccessRoles.ShadowManager);

            const result3 = await access_module.deleteItem(result2.user_id);
        });

    afterAll(async () => {
        // Delete the access record
    })
});