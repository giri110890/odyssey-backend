const CosmosClient = require('@azure/cosmos').CosmosClient
const config = require('../../config/config')
const url = require('url')
const data_store = require('./data_store_azure_cosmos');

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
    containerId: config.container.company,
};

const client = new CosmosClient(options);
//sujith - get all company data
async function getAllCompany(id) {
    try {
        const container = client
            .database(databaseId)
            .container(containerId);

        const querySpec = {
            query: "SELECT * FROM c WHERE c.company_id=@param1",
            parameters: [
                { name: '@param1', value: id },
            ]
        };
        // read all items in the container
        const { resources } = await container.items.query(querySpec).fetchAll();
        return resources;
    } catch (error) {
        console.error('Get all company  record error:', error, id);
    }
}
//hema - api to get company by id 
async function getCompanyById(company_id) {
    try {
        const container = client
            .database(databaseId)
            .container(containerId);

        const querySpec = {
            query: "SELECT * FROM c WHERE c.id=@param1",
            parameters: [
                { name: '@param1', value: company_id },
            ]
        };
        const { resources } = await container.items.query(querySpec).fetchAll();
        return resources;
    } catch (error) {
        console.error('Company id error:', error, company_id);
    }
}
//sujith - api to create a company
async function createCompany(data) {
    try {
        // store tenant
        const { item } = await client
            .database(databaseId)
            .container(containerId)
            .items.create(data)
        console.log(`Created user family item with id:\n${data.id}\n`)
        return item;
    } catch (error) {
        console.error('create record error:', error, data);
    }
}
module.exports = {
    createCompany,
    getAllCompany,
    getCompanyById,
}