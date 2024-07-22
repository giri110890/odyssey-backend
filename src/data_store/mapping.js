const CosmosClient = require('@azure/cosmos').CosmosClient
const config = require('../../config/config')
const url = require('url')
const data_store = require('../data_store/data_store_azure_cosmos')

const endpoint = config.endpoint
const key = config.key

// const databaseId = config.database.id
// const containerId = config.container.users
// const partitionKey = { kind: 'Hash', paths: ['/id'] }

const options = {
    endpoint: endpoint,
    key: key,
    userAgentSuffix: 'odyssey-backend'
};

const client = new CosmosClient(options);
// GET MULTIPLE QUESTION CODE 
async function getMultipleQuestionCodeDetails(question_codes, property_manager_id, databaseConfig) {
    try {
        const container = client
            .database(databaseConfig.databaseId)
            .container(databaseConfig.containerId)

        const querySpec = {
            query: "SELECT * FROM c WHERE ARRAY_CONTAINS(@question_codes, c.question_code, true) AND c.property_manager_id=@param2",
            parameters: [
                {
                    name: "@question_codes",
                    value: question_codes,
                },
                { name: '@param2', value: property_manager_id },
            ],
        };
        const { resources } = await container.items.query(querySpec).fetchAll();
        return resources;
    } catch (error) {
        console.error('tenant id  id error:', error, question_codes);
    }
}

// hema - api to add field (question code in  field database)
async function createField(data, databaseConfig) {
    try {
        const { item } = await client
            .database(databaseConfig.databaseId)
            .container(databaseConfig.containerId)
            .items.create(data)
        // console.log(`Created data in mappings with id:\n${data.id}\n`)
        return item;
    } catch (error) {
        console.error('Add data  error:', error, data);
    }
}


async function updateField(id, data, databaseConfig) {
    try {
        const { item } = await client
            .database(databaseConfig.databaseId)
            .container(databaseConfig.containerId)
            .items.upsert(data)
        return item;
    } catch (error) {
        console.error('update  error in field:', error);
    }
}


// hema - api to remove field 
async function deleteField(id, property_manager_id, databaseConfig) {
    try {
        let remove_status = false;
        const container = client
            .database(databaseConfig.databaseId)
            .container(databaseConfig.containerId)
        const querySpec = {
            query: "SELECT * FROM c WHERE c.id =@param1 AND c.property_manager_id=@param2",
            parameters: [
                { name: '@param1', value: id },
                { name: '@param2', value: property_manager_id },
            ]
        };
        const { resources } = await container.items.query(querySpec).fetchAll();
        for (const resource of resources) {
            // Must include the container partition key (the property_id value) for delete to succeed.
            const del_result = await container.item(resource.id, resource.id).delete();
            if (del_result) {
                remove_status = true;
            }
            // console.log(`Deleted item:\n${resource.id}\n`)
        }
        return remove_status;
    } catch (error) {
        if (error.code == 404) {
            console.log("Id to be deleted was not found: " + id);
        } else {
            console.error('Delete field Item Error: ' + error.message);
        }
    }
}
// hema - api to clear all field data
// hema - api to remove field 
async function emptyFieldTable(databaseConfig) {
    try {
        let remove_status = false;
        const container = client
            .database(databaseConfig.databaseId)
            .container(databaseConfig.containerId)
        const querySpec = {
            query: "SELECT * FROM c ",

        };
        const { resources } = await container.items.query(querySpec).fetchAll();
        for (const resource of resources) {
            // Must include the container partition key (the property_id value) for delete to succeed.
            const del_result = await container.item(resource.id, resource.id).delete();
            if (del_result) {
                remove_status = true;
            }
            // console.log(`Deleted item:\n${resource.id}\n`)
        }
        return remove_status;
    } catch (error) {
        if (error.code == 404) {
            console.log("Id to be deleted was not found: " + id);
        } else {
            console.error('Delete field Item Error: ' + error.message);
        }
    }
}
// api to get all question code
async function getAllRecord(property_manager_id, databaseConfig) {
    try {

        const propertyName = config.property_names.property_manager_id;
        const propertyValue = property_manager_id;

        const resources = await data_store.getRecordByKey(propertyName, propertyValue, databaseConfig);

        return resources;

    } catch (error) {
        console.error('Get all Question code  error:', error);
    }
}
// form data by qa ids
async function getMultipleFormDetailsUsingQAId(qa_ids, FormDatabaseConfig) {
    try {
        const container = client
            .database(FormDatabaseConfig.databaseId)
            .container(FormDatabaseConfig.containerId);

        const querySpec = {
            query: "SELECT * FROM c WHERE ARRAY_CONTAINS(@qa_ids, c.qaId, true)",
            parameters: [
                {
                    name: "@qa_ids",
                    value: qa_ids,
                },
            ],
        };
        const { resources } = await container.items.query(querySpec).fetchAll();
        return resources;
    } catch (error) {
        console.error('tenant id  id error:', error, qa_ids);
    }
}

// api to validate code if already exist
async function getField(question_code, property_manager_id, databaseConfig) {
    try {
        // change label and code value to lower case 
        // compare with db
        //if any of the labe or code already exist display error or add
        const container = client
            .database(databaseConfig.databaseId)
            .container(databaseConfig.containerId);
        const querySpec = {
            query: "SELECT * FROM c WHERE c.property_manager_id=@param1 AND (LOWER(c.label) = @param2 OR LOWER(c.question_code) = @param3)",
            parameters: [
                { name: '@param1', value: property_manager_id },
                { name: '@param2', value: question_code.label.toLowerCase() },
                { name: '@param3', value: question_code.question_code.toLowerCase() },
            ]
        };
        const { resources } = await container.items.query(querySpec).fetchAll();
        return resources;
    } catch (error) {
        console.error('Get all Question code  error:', error);
    }
}
// validate common code beore inserting (ie without property manager id)
async function validateCommonField(question_code, databaseConfig) {
    try {
        // change label and code value to lower case 
        // compare with db
        //if any of the labe or code already exist display error or add
        const container = client
            .database(databaseConfig.databaseId)
            .container(databaseConfig.containerId);
        const querySpec = {
            query: "SELECT * FROM c WHERE LOWER(c.label) = @param1 OR LOWER(c.question_code) = @param2",
            parameters: [
                { name: '@param1', value: question_code.label.toLowerCase() },
                { name: '@param2', value: question_code.question_code.toLowerCase() },
            ]
        };
        const { resources } = await container.items.query(querySpec).fetchAll();
        return resources;
    } catch (error) {
        console.error('Get all Question code  error:', error);
    }
}
// hema - api to get all custom field
async function getAllCommonFields(databaseConfig) {
    try {
        const container = client
            .database(databaseConfig.databaseId)
            .container(databaseConfig.containerId)
        const querySpec = {
            query: "SELECT * FROM c WHERE c.field_type = 'property' OR c.field_type = 'tenant'",

        };
        // read all items in the container
        const { resources } = await container.items.query(querySpec).fetchAll();
        return resources;
    } catch (error) {
        console.error('Get all custom field  error:', error, property_manager_id);
    }
}



async function getAllCustomFields(property_manager_id, databaseConfig) {
    try {
        const container = client
            .database(databaseConfig.databaseId)
            .container(databaseConfig.containerId)
        const querySpec = {
            query: `SELECT * FROM c WHERE c.field_type = 'custom_field' AND c.property_manager_id = '${property_manager_id}'`,

        };
        // read all items in the container
        const { resources } = await container.items.query(querySpec).fetchAll();
        return resources;
    } catch (error) {
        console.error('Get all custom field  error:', error, id);
    }
}



// form

// api to update mappings
async function updateMapping(id, data, databaseConfig) {
    try {
        const { item } = await client
            .database(databaseConfig.databaseId)
            .container(databaseConfig.containerId)
            .items.upsert(data)
        // console.log(`updated mappings  with id:\n${data.id}\n`)
        return item;
    } catch (error) {
        console.error('update  error in mapping:', error);
    }
}
// api to get all mapped form 
/*
  { form_id: "1", title: "Resident Notification Letter",  position: [3, 4, 100], question_code: "property_name", page_no:"2", property_manager_id:"23547gdefvdfvsg457u567"},
*/


// hema - api to get specific mappings of a document
async function getMappingOfForm(form_id, databaseConfig) {
    try {

        const propertyName = config.property_names.form_id;
        const propertyValue = form_id;

        const resources = await data_store.getRecordByKey(propertyName, propertyValue, databaseConfig);

        return resources;

    } catch (error) {
        console.error('Get  mapped form record error:', error);
    }

}
// 
async function getMappingDetails(id, databaseConfig) {
    try {

        const propertyName = config.property_names.id;
        const propertyValue = id;

        const resources = await data_store.getRecordByKey(propertyName, propertyValue, databaseConfig);

        return resources;

    } catch (error) {
        console.error('Get  mapped form record error:', error);
    }

}
// api to remove mapings from foem
async function removeFormMappings(id, databaseConfig) {
    try {
        let remove_status = false;
        const container = client
            .database(databaseConfig.databaseId)
            .container(databaseConfig.containerId)
        const querySpec = {
            query: "SELECT * FROM c WHERE c.id =@param1",
            parameters: [
                { name: '@param1', value: id },
            ]
        };
        const { resources } = await container.items.query(querySpec).fetchAll();
        for (const resource of resources) {
            // Must include the container partition key (the property_id value) for delete to succeed.
            const del_result = await container.item(resource.id, resource.property_manager_id).delete();
            if (del_result) {
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
module.exports = {
    getAllRecord,
    createField,
    deleteField,
    getMappingOfForm,
    getField,
    updateMapping,
    getMappingDetails,
    getMultipleFormDetailsUsingQAId,
    removeFormMappings,
    getMultipleQuestionCodeDetails,
    getAllCommonFields,
    validateCommonField,
    emptyFieldTable,
    updateField,
    getAllCustomFields
}