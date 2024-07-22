//@ts-check
const CosmosClient = require('@azure/cosmos').CosmosClient

const config = require('../../config/config')
const url = require('url')

const endpoint = config.endpoint
const key = config.key

const databaseId = config.database.id
const containerId = config.container.answers
const partitionKey = { kind: 'Hash', paths: ['/id'] }

const options = {
  endpoint: endpoint,
  key: key,
  userAgentSuffix: 'odyssey-backend'
};
const client = new CosmosClient(options);
// to store answer
async function storeAnswer(data) {
    try {
        // store answer
        const { item } = await client
            .database(databaseId)
            .container(containerId)
            .items.create(data)
        // console.log(`Created answer family item with id:\n${data.id}\n`)
        return item;
    } catch (error) {
        console.error('create answer record error:', error, data);
    }
}
// get by answer id
async function getAnswer(unit_id,tenant_id,questionnaire_id) {
    try {
        const container = client
            .database(databaseId)
            .container(containerId);

        const querySpec = {
            query: "SELECT * FROM c WHERE c.unit_id=@param1 AND c.tenant_id=@param2 AND c.questionnaire_id=@param3",
            //query: "SELECT * FROM c WHERE  c.rental_id=@param2 AND c.questionnaire_id=@param3",
            parameters: [
                { name: '@param1', value: unit_id},
                { name: '@param2', value: tenant_id},
                { name: '@param3', value: questionnaire_id},
            ]
        };
        const { resources } = await container.items.query(querySpec).fetchAll();
        return resources;
    } catch (error) {
        console.error('Get answer error');
    }
}

// get by answer id
async function getAnswerByTenantID(tenant_id) {
    try {
        const container = client
            .database(databaseId)
            .container(containerId);

        const querySpec = {
            query: "SELECT * FROM c WHERE c.tenant_id=@param1",
            //query: "SELECT * FROM c WHERE  c.rental_id=@param2 AND c.questionnaire_id=@param3",
            parameters: [
                { name: '@param1', value: tenant_id},
            ]
        };
        const { resources } = await container.items.query(querySpec).fetchAll();
        return resources;
    } catch (error) {
        console.error('Get answer error');
    }
}

// hema - api to update answer deatils with rental id
async function updateAnswerByTenant(id, data) {
    try {
        const { item } = await client
        .database(databaseId)
        .container(containerId)
        .items.upsert(data)
      // console.log(`updated answer item with id:\n${data.id}\n`)
    
      // Ensure we don't return the item object as it is a database object.
      return { id: item.id };

    } catch (error) {
      console.error('updateAnswerByTenant error:', error);
      throw error; // Rethrow the error for handling at a higher level
    }
  }
  
module . exports ={
    storeAnswer,
    getAnswer,
    getAnswerByTenantID,
    updateAnswerByTenant
}