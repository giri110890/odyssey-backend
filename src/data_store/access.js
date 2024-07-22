//@ts-check
const CosmosClient = require('@azure/cosmos').CosmosClient

const store = require('./data_store_azure_cosmos')
const config = require('../../config/config')
const url = require('url');
const array_utils = require('../utils/array_utils');

const databaseConfig = {
    endpoint: config.endpoint,
    key: config.key,
    databaseId: config.database.id,
    containerId: config.container.access,
};

const options = {
    endpoint: config.endpoint,
    key: config.key,
    userAgentSuffix: 'odyssey-backend'
  };
const client = new CosmosClient(options);


// NOTE: You must include the id property and value in the 'data' parameter to avoid duplicate records.
// E.g. data.id = access_record.id;
async function createItem(data) {
    try {
        if (!data.id){
            data.date_created = new Date().toUTCString();   // Human readable date.
            let item = storeItem(data);
            return item;
        } else {
            console.error('Can\'t create record if data.id already exists', data);    
        }
    } catch (error) {
        console.error('create access record error:', error, data);
    }
    return null;
}

async function updateItem(data) {
    try {
        if (data.id){
            data.date_modified = new Date().toUTCString();   // Human readable date.
            let item = storeItem(data);
            return item;
        } else {
            console.error('Can\'t update a record if data.id doesn\'t exist. See createItem.', data);    
        }
    } catch (error) {
        console.error('create access record error:', error, data);
    }
    return null;
}

// This is a private function and should not be exported.
async function storeItem(data) {
    try {
        
        let item = await store.putRecordbyFieldId(config.property_names.user_id, data[config.property_names.user_id], data, databaseConfig);

        // console.log(`Created access item with id:\n${item ? item.id : 'null item'}\n`)
        return item;
    } catch (error) {
        console.error('create access record error:', error, data);
    }
    return null;
}

async function getItem(user_id) {
    try {
        const resources = await store.getRecordByKey(config.property_names.user_id, user_id, databaseConfig);
    return resources;
    } catch (error) {
        console.error('Get access item error');
    }
}

// Return the access records of any user who is shadowing this user Id.
async function getItems(shadowed_user_id) {
    try {
        const container = client
          .database(databaseConfig.databaseId)
          .container(databaseConfig.containerId);
    
          const querySpec = {
          query: "SELECT * FROM c WHERE  ARRAY_CONTAINS( c.options.users, @param1, false)",
          parameters: [
            { name: '@param1', 
            value: shadowed_user_id },  
          ]
        };
        // read all items in the container
        const { resources } = await container.items.query(querySpec).fetchAll();
        return resources;
      } catch (error) {
        console.error('Access: getItems error');
      }
}


async function ensureAccessExists(user_id, access_roles, options) {
    let existing_access = await getItem( user_id );
    let result = null;
    if (existing_access && existing_access.length == 0) {
        let new_access = {
            [config.property_names.user_id]: user_id,
            [config.property_names.access]: access_roles
        };
        if (options) {
            new_access.options = options;
        }
        result = await storeItem(new_access);
    } else if (existing_access && existing_access.length > 0) {
        result = existing_access[0];
    }
    let update_record = false;

    // Now we have an array of roles
    
    if (result && access_roles && !array_utils.arrayEquals(result[config.property_names.access], access_roles)) {
        result[config.property_names.access] = access_roles;
        update_record = true;
    }
    
    // Fix old data format --> array of roles.
    if (!(result[config.property_names.access] instanceof Array)) {
        result[config.property_names.access] = [result[config.property_names.access]]
        update_record = true;
    }
    // Check if options need to be updated
    if (!result.options) {
        result.options = options;
        update_record = true;
    } else if (options && result.options && !array_utils.deepEquals(result.options, options)) {
        result.options = Object.assign(result.options, options);
        update_record = true;
    }
    if (update_record) {
        result = await storeItem(result);
    }
    return result;    
}

async function deleteItem(user_id) {
    try {
        const resources = await store.getRecordByKey(config.property_names.user_id, user_id, databaseConfig);
        if (resources) {
            const container = client
                .database(databaseConfig.databaseId)
                .container(databaseConfig.containerId);
            for (const resource of resources) {
                // Must include the container partition key (the property_id value) for delete to succeed.
                const del_result = await container.item(resource.id, resource.user_id).delete();
            }            
        }
    } catch (error) {
        console.error('Delete item error: ' + error);
    }
}

  
module.exports ={
    createItem,
    updateItem,
    getItem,
    getItems,
    ensureAccessExists,
    deleteItem
}