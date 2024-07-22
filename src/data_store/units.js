//@ts-check
const CosmosClient = require('@azure/cosmos').CosmosClient

const config = require('../../config/config')
const url = require('url')

const endpoint = config.endpoint
const key = config.key

const databaseId = config.database.id
const containerId = config.container.id
const partitionKey = { kind: 'Hash', paths: ['/id'] }

const options = {
    endpoint: endpoint,
    key: key,
    userAgentSuffix: 'odyssey-backend'
};
const client = new CosmosClient(options);



// hema - api for create unit-- start
async function createUnit(data) {
    try {
        // store record
        const { item } = await client
            .database(databaseId)
            .container(containerId)
            .items.create(data)
        console.log(`Created unit with id:\n${data.id}\n`)
        return item;
    } catch (error) {
        console.error('create record error:', error, data);
    }
}
// hema - api for create property-- end


// hema - api for all units -- start
async function getAllUnits(id) {
    try {
        const container = client
            .database(databaseId)
            .container(containerId);

        const querySpec = {
            query: "SELECT * FROM c WHERE c.id=@param1",
            parameters: [
                { name: '@param1', value: id }
            ]
        };
        // read all items in the container
        const { resources } = await container.items.query(querySpec).fetchAll();
        return resources;
    } catch (error) {
        console.error('Get All record error:', error, id);
    }
}
// hemalatha - api for all units -- end

// hema - api to get a unit data
async function getUnitById(property_id,unit_id) {
    try {
        const container = client
            .database(databaseId)
            .container(containerId);

        const querySpec = {
            query: "SELECT * FROM c WHERE c.id=@param1 And c.unit_id=@param2",
            parameters: [
                { name: '@param1', value: property_id },
                { name: '@param2', value: unit_id },
            ]
        };
        // read all items in the container
        const { resources } = await container.items.query(querySpec).fetchAll();
        return resources;
    } catch (error) {
        console.error('Get Unit record error:', error, unit_id);
    }

}

  // hema - api to delete unit
  async function removeUnit(property_id,unit_id){
    try{
    const container = client
            .database(databaseId)
            .container(containerId);
            const { resource } = await container.item(property_id).read();
            resource.units = resource.units.filter(_unit => _unit.id !== unit_id);
            await container.item(property_id).replace(resource);
            
    }catch(error){
        console.error('unit_id  error:', error, unit_id);
    }
  }
  
module.exports = {
    getAllUnits,
    createUnit,
    getUnitById,
    removeUnit
}
