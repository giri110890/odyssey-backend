const CosmosClient = require('@azure/cosmos').CosmosClient
const config = require('../../config/config')
const url = require('url')


const endpoint = config.endpoint
const key = config.key

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
    containerId: config.container.rentals,
};

const client = new CosmosClient(options);
// Import your getRecordByKey and putRecord functions here
// const { getRecordByKey, putRecord } = require('./data_store_azure_cosmos'); 
const data_store = require('./data_store_azure_cosmos');

// hem a- get all rentals
async function getRentalsUsingTenantId(tenant_id) {
    try {
        const container = client
            .database(databaseConfig.databaseId)
            .container(databaseConfig.containerId);

        const querySpec = {
            query: "SELECT * FROM c WHERE ARRAY_CONTAINS(c.tenant_id, @param1) OR c.tenantId = @param1",
            parameters: [
                { name: '@param1', value: tenant_id },
            ]
        };
        const { resources } = await container.items.query(querySpec).fetchAll();
        return resources;
    } catch (error) {
        console.error('get all rental record error:', error);
    }
}
// get rentals using unit id
async function getRentalsUsingUnitId(unit_id) {
    try {
        const container = client
            .database(databaseConfig.databaseId)
            .container(databaseConfig.containerId);

        const querySpec = {
            query: "SELECT * FROM c WHERE c.unit_id = @param1",
            parameters: [
                { name: '@param1', value: unit_id },
            ]
        };
        const { resources } = await container.items.query(querySpec).fetchAll();
        return resources;
    } catch (error) {
        console.error('get all rental record  using unit id error:', error);
    }
}
// hema - create a rental id

async function createRental(rental_info) {
    try {
        if(!rental_info?.tenant_id){
            return res.status(400).json({ errors: 'tenant_id  Not Found' });
        }
        if (!rental_info?.unit_id) {
            return res.status(400).json({ errors: 'unit_id  Not Found' });
        }
        if (!rental_info?.property_id) {
            return res.status(400).json({ errors: 'property_id  Not Found' });
        }
        if (!rental_info?.requiredQAs) {
            return res.status(400).json({ errors: 'requiredQAs  Not Found' });
        }

        const item = await putRental(rental_info.unit_id, rental_info, databaseConfig);

        // console.log(`Created rental family item with id:\n${item.id}\n`)
        return item;

    } catch (error) {
        console.error('create record error:', error);
    }
}

// hema - to get all rentals
async function getAllRentals(property_id) {
    try {

        const propertyName = config.property_names.property_id;
        const propertyValue = property_id;

        const resources = await data_store.getRecordByKey(propertyName, propertyValue, databaseConfig);

        return resources;

    } catch (error) {
        console.error('getAllRentals error:', error, property_id);
    }
}
// hema - api to delete all rentals by property id
async function deleteAllRentalsByPropertyId(property_id) {
    try {
        const container = client
            .database(databaseConfig.databaseId)
            .container(databaseConfig.containerId);

        const querySpec = {
            query: "SELECT * FROM c WHERE c.property_id=@param1",
            parameters: [
                { name: '@param1', value: property_id },
            ]
        };
        const { resources } = await container.items.query(querySpec).fetchAll();
        // Must include the partition key to delete.
        for (const resource of resources) {
            await container.item(resource.id, resource.property_id).delete();
        }

    } catch (error) {
        console.error('Questionnaire id error:', error, property_id);
    }
}
// hema - to get rental questionnaire by rental id
async function getRentalById(rental_id) {
    try {
        const propertyName = config.property_names.id;
        const propertyValue = rental_id;

        const resources = await data_store.getRecordByKey(propertyName, propertyValue, databaseConfig);
        // const { resources } = await container.items.query(querySpec).fetchAll();
        return resources;
    } catch (error) {
        console.error('rental_id  error:', error, rental_id);
    }
}
// hema - to get rental details by rental id
async function getRentalQuestionnaireById(rental_id) {
    try {
        const container = client
            .database(databaseId)
            .container(containerId);

        const querySpec = {
            query: "SELECT * FROM c WHERE c.rental_id=@param1",
            parameters: [
                { name: '@param1', value: rental_id },
            ]
        };
        const { resources } = await container.items.query(querySpec).fetchAll();
        return resources;
    } catch (error) {
        console.error('rental_id  error:', error, rental_id);
    }
}

async function putRental(id, data, databaseConfig) {
    try {
        const { item } = await client
            .database(databaseConfig.databaseId)
            .container(databaseConfig.containerId)

            .items.upsert(data)
        // console.log(`updated rental item with id:\n${data.id}\n`)
        // Ensure we don't return the item object as it is a database object.
        return { id: item.id };
    } catch (error) {
        console.error('putRental error:', error);
        //throw new Error('An error occurred while putting the record.');
    }
}

// remove rental by rental id
async function removeRental(id) {
    try {
        let remove_status = false;
        const container = client
            .database(databaseConfig.databaseId)
            .container(databaseConfig.containerId);
        const querySpec = {
            query: "SELECT * FROM c WHERE c.id =@param1",
            parameters: [
                { name: '@param1', value: id },
            ]
        };
        const { resources } = await container.items.query(querySpec).fetchAll();
        for (const resource of resources) {
            // Must include the container partition key (the property_id value) for delete to succeed.
            const del_result = await container.item(resource.id, resource.property_id).delete();
            if(del_result){
                remove_status = true;
            }
            // console.log(`Deleted item:\n${resource.id}\n`)
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

// hema api to delete unit and rental
async function removeRentalByUnitId(unit_id) {
    try {
        const container = client
            .database(databaseConfig.databaseId)
            .container(databaseConfig.containerIdontainerId);
        // Query to find the document based on your condition
        const querySpec = {
            query: "SELECT * FROM c WHERE c.unit_id = @param1",
            parameters: [
                {
                    name: "@param1",
                    value: unit_id
                }
            ]
        };

        const { resources: results } = await container.items.query(querySpec).fetchAll();

        if (results.length > 0) {
            const document = results[0];
            const { resource } = await container.item(document.id).delete();
            console.log(`Document deleted`);
        } else {
            console.log("No documents found that match the condition.");
        }
    } catch (error) {
        console.error("Error: ", error);
    }
}


module.exports = {
    createRental,
    getAllRentals,
    getRentalsUsingTenantId,
    getRentalQuestionnaireById,
    getRentalById,
    putRental,
    removeRentalByUnitId,
    deleteAllRentalsByPropertyId,
    getRentalsUsingUnitId,
    removeRental
}