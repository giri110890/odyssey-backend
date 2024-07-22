const CosmosClient = require('@azure/cosmos').CosmosClient
const config = require('../../config/config')
const data_store = require('./data_store_azure_cosmos');
const { AccessRoles } = require('../routes/middleware/permission/permissions');

const endpoint = config.endpoint
const key = config.key

const databaseId = config.database.id
const containerId = config.container.users
const partitionKey = { kind: 'Hash', paths: ['/id'] }

const options = {
    endpoint: endpoint,
    key: key,
    userAgentSuffix: 'odyssey-backend'
};
const databaseConfig = {
    endpoint: config.endpoint,
    key: config.key,
    databaseId: config.database.id,
    containerId: config.container.users,
};

const client = new CosmosClient(options);

// hema - get all tenant data 
async function getAllTenants(id, role) {
    try {
        const container = client
            .database(databaseId)
            .container(containerId);

        const querySpec = {
            query: "SELECT * FROM c WHERE c.role=@param2 and c.property_manager_id=@param1",
            parameters: [
                { name: '@param1', value: id },
                { name: '@param2', value: role },
            ]
        };
        // read all items in the container
        const { resources } = await container.items.query(querySpec).fetchAll();
        return resources;
    } catch (error) {
        console.error('Get all tenant record error:', error, id);
    }
}

// hema - api to get multiple tenant by email id
async function getMultipleTenantById(tenant_ids) {
    try {
        const container = client
            .database(databaseId)
            .container(containerId);

        const querySpec = {
            query: "SELECT * FROM c WHERE ARRAY_CONTAINS(@tenant_ids, c.id, true)",
            parameters: [
                {
                    name: "@tenant_ids",
                    value: tenant_ids,
                },
            ],
        };
        const { resources } = await container.items.query(querySpec).fetchAll();
        return resources;
    } catch (error) {
        console.error('tenant id  id error:', error, tenant_ids);
    }
}
//hema - api to create a tenant
async function createUser(data) {
    try {
        data.email.toLowerCase();   // CosmosDB queries are case-sensitive
        data.date_created = new Date().toUTCString();   // Human readable date.

        // store tenant
        const { item } = await client
            .database(databaseId)
            .container(containerId)
            .items.create(data)
        // console.log(`Created user family item with id:\n${data.id}\n`)
        // Ensure we don't return the item object as it is a database object.
        return { id: item.id };
    } catch (error) {
        console.error('create record error:', error, data);
    }
}
// hema - api to update tenant deatils 
async function putUser(id, data) {
    try {
        data.email.toLowerCase();   // CosmosDB queries are case-sensitive
        data.date_modified = new Date().toUTCString();   // Human readable date.
        // store tenant
        const { item } = await client
            .database(databaseId)
            .container(containerId)
            .items.upsert(data)
        // console.log(`updated tenant item with id:\n${data.id}\n`)
        // Ensure we don't return the item object as it is a database object.
        return { id: item.id };
    } catch (error) {
        console.error('putUser error:', error, id);
    }
}
//hema - api to get tenant by id 
async function getTenantById(tenant_id) {
    try {
        const container = client
            .database(databaseId)
            .container(containerId);

        const querySpec = {
            query: "SELECT * FROM c WHERE c.id=@param1",
            parameters: [
                { name: '@param1', value: tenant_id },
            ]
        };
        const { resources } = await container.items.query(querySpec).fetchAll();
        return resources;
    } catch (error) {
        console.error('Tenant id error:', error, tenant_id);
    }
}
//hema - api to get tenant by id 
async function getUserByEmail(email) {
    try {

        const tenantEmail = config.property_names.email;
        const emailValue = email.toLowerCase(); // CosmosDB queries are case-sensitive

        const resources = await data_store.getRecordByKey(tenantEmail, emailValue, databaseConfig);

        return resources;
    } catch (error) {
        console.error('Tenant id error:', error, email);
    }
}
// hema - api to delete a tenant
async function removeTenant(id) {
    try {
        let remove_status = false;
        const container = client
            .database(databaseId)
            .container(containerId);
        const querySpec = {
            query: "SELECT * FROM c WHERE c.id =@param1",
            parameters: [
                { name: '@param1', value: id },
            ]
        };
        const { resources } = await container.items.query(querySpec).fetchAll();
        for (const resource of resources) {
            // Must include the container partition key (the property_id value) for delete to succeed.
            const del_result = await container.item(resource.id, resource.id).delete();
            if (del_result) {
                remove_status = true;
            }
            console.log(`Deleted item:\n${resource.id}\n`)
        }
        return remove_status;
    } catch (error) {
        if (error.code == 404) {
            console.log("Id to be deleted was not found: " + id);
        } else {
            console.error('Delete Family Item Error: ' + error.message);
        }
    }
}

async function clearTenant(id) {
    try {
        const container = client
            .database(databaseId)
            .container(containerId);
        const querySpec = {
            query: "SELECT * FROM c WHERE c.property_manager_id=@param1",
            parameters: [
                { name: '@param1', value: id },
            ]
        };
        // read all items in the container
        const { resources } = await container.items.query(querySpec).fetchAll();
        for (const resource of resources) {
            const del_result = await container.item(resource.id, resource.id).delete();
            console.log(`Deleted item:\n${resource.id}\n`)
        }
    } catch (error) {
        console.log("Delete all tenant error")
    }
}
//get all shadow user
async function listAllShadowUsers(id) {
    try {
        const container = client
            .database(databaseId)
            .container(containerId);

        const querySpec = {
            //Allow all shadow managers to be listed for a property manager
            //query: "SELECT * FROM c WHERE c.role = 'ShadowManager'",
            query: "SELECT * FROM c WHERE c.role = 'ShadowManager'",
            parameters: [
                { name: '@param1', value: id },
            ]
        };

        // read all items in the container
        const { resources } = await container.items.query(querySpec).fetchAll();
        return resources;
    } catch (error) {
        console.error('Get all shadow user  error:', error, id);
    }
}
//get all property manager
async function listAllPropertyManagers(id) {
    try {
        const container = client
            .database(databaseId)
            .container(containerId);

        const querySpec = {
            query:
            "SELECT * FROM c WHERE (c.role = 'property_manager' AND (c.id = @param1 OR c.property_manager_id = @param1)) OR (c.role = 'ShadowManager' and c.property_manager_id=@param1)",
            parameters: [{ name: "@param1", value: id }],
        };
        // read all items in the container
        const { resources } = await container.items.query(querySpec).fetchAll();
        return resources;
    } catch (error) {
        console.error('Get all property manager record error:', error, id);
    }
}
//API to get user by id
async function getUserById(user_id) {
    try {
        const container = client
            .database(databaseId)
            .container(containerId);

        const querySpec = {
            query: "SELECT * FROM c WHERE c.id=@param1",
            parameters: [
                { name: '@param1', value: user_id },
            ]
        };
        const { resources } = await container.items.query(querySpec).fetchAll();
        return resources;
    } catch (error) {
        console.error('User id error:', error, user_id);
    }
}



async function removePropertyManager(id) {
    try {
        let remove_status = false;
        const container = client
            .database(databaseId)
            .container(containerId);
        const querySpec = {
            query: "SELECT * FROM c WHERE c.id =@param1",
            parameters: [
                { name: '@param1', value: id },
            ]
        };
        const { resources } = await container.items.query(querySpec).fetchAll();
        for (const resource of resources) {
            // Must include the container partition key (the property_id value) for delete to succeed.
            const del_result = await container.item(resource.id, resource.id).delete();
            if (del_result) {
                remove_status = true;
            }
            console.log(`Deleted item:\n${resource.id}\n`)
        }
        return remove_status;
    } catch (error) {
        if (error.code == 404) {
            console.log("Id to be deleted was not found: " + id);
        } else {
            console.error('Delete Family Item Error: ' + error.message);
        }
    }
}



module.exports = {
    getAllTenants,
    createUser,
    putUser,
    getTenantById,
    removeTenant,
    clearTenant,
    getUserByEmail,
    getMultipleTenantById,
    listAllShadowUsers,
    listAllPropertyManagers,
    getUserById,
    removePropertyManager
}