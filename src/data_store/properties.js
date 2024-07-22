const CosmosClient = require('@azure/cosmos').CosmosClient
const config = require('../../config/config')

const endpoint = config.endpoint
const key = config.key

const options = {
    endpoint: endpoint,
    key: key,
    userAgentSuffix: 'odyssey-backend'
};
const databaseConfig = {
    endpoint: config.endpoint,
    key: config.key,
    databaseId: config.database.id,
    containerId: config.container.id, // properties
};
const client = new CosmosClient(options);

const databaseId = databaseConfig.databaseId
const containerId = databaseConfig.containerId

// vijay - api for individual property detail -- start
async function getPropertyByPropertyIDs(property_ids) {
    try {
       
      const container = client
        .database(databaseId)
        .container(containerId);
  
      const querySpec = {
        query: "SELECT * FROM c WHERE ARRAY_CONTAINS(@id, c.id, true)",
        parameters: [
          {
            name: "@id",
            value: property_ids,
          },
        ],
      };
     
      const { resources  } = await container.items.query(querySpec).fetchAll();
      return resources;
    } catch (error) {
      console.error('Get Property By Id error');
    }
}
// vijay - api individual property detail -- end

module.exports = {
  getPropertyByPropertyIDs
}