//@ts-check
const CosmosClient = require('@azure/cosmos').CosmosClient

const config = require('../../config/config')
const url = require('url')

const endpoint = config.endpoint
const key = config.key

const databaseId = config.database.id
const containerId = config.container.questions
const partitionKey = { kind: 'Hash', paths: ['/id'] }
const data_store = require('../data_store/data_store_azure_cosmos')
const options = {
    endpoint: endpoint,
    key: key,
    userAgentSuffix: 'odyssey-backend'
};
const client = new CosmosClient(options);

// hema - get all questionnaire data 
async function getAllQuestionnaires(id) {
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
        return resources;
    } catch (error) {
        console.error('Get all Questionnaire record error:', error, id);
    }
}
// api to get mapped form
async function getAllRecord(property_manager_id, databaseConfig) {
    try {

        const propertyName = config.property_names.property_manager_id;
        const propertyValue = property_manager_id;

        const resources = await data_store.getRecordByKey(propertyName, propertyValue, databaseConfig);

        return resources;

    } catch (error) {
        console.error('Get all mapped form  error:', error);
    }
}

// hme a- api to get question details by id
async function getQuestionDetails(id) {
    try {
        const container = client
            .database(databaseId)
            .container(containerId);

        const querySpec = {
            query: "SELECT c.id , q  FROM c JOIN q IN c.questions WHERE q.id = @param1 ",
            parameters: [
                { name: '@param1', value: id },
            ]
        };
        const { resources } = await container.items.query(querySpec).fetchAll();
        return resources;
    } catch (error) {
        console.error('question id error:', error, id);
    }
}
//hema - api to get Questionnaire by id 
async function getQuestionnaireById(questionnaire_id) {
    try {
        const container = client
            .database(databaseId)
            .container(containerId);

        const querySpec = {
            query: "SELECT * FROM c WHERE c.id=@param1",
            parameters: [
                { name: '@param1', value: questionnaire_id },
            ]
        };
        const { resources } = await container.items.query(querySpec).fetchAll();
        return resources;
    } catch (error) {
        console.error('Questionnaire id error:', error, questionnaire_id);
    }
}
// hema - api to get multiple questionnaire
async function getMultipleQuestionnaireById(questionnaire_ids) {
    try {
        const container = client
            .database(databaseId)
            .container(containerId);

            const querySpec = {
                query: "SELECT * FROM c WHERE ARRAY_CONTAINS(@questionnaire_ids, c.id, true)",
                parameters: [
                  {
                    name: "@questionnaire_ids",
                    value: questionnaire_ids,
                  },
                ],
              };
        const { resources } = await container.items.query(querySpec).fetchAll();
        return resources;
    } catch (error) {
        console.error('Questionnaire id error:', error, questionnaire_ids);
    }
}
    
//hema - api to create a questionnaire
async function createQuestionnaire(data) {
    try {
        // store questionnaire
        const { item } = await client
            .database(databaseId)
            .container(containerId)
            .items.create(data)
        // console.log(`Created Questionnaire family item with id:\n${data.id}\n`)
        return item;
    } catch (error) {
        console.error('create record error:', error, data);
    }
}
async function putQuestionnaire(id,data) {
    try {
      // store questionnaire
      const { item } = await client
        .database(databaseId)
        .container(containerId)
        .items.upsert(data)
      // console.log(`updated questionnaire item with id:\n${data}\n`)
      return item;
    } catch (error) {
      console.error('putRecord error:', error, id);
      //throw new Error('An error occurred while putting the questionnaire.');
    }
  }
  //hema - api to delete Questionnaire
async function removeQuestionnaire(id){
    try{
    const container = client
            .database(databaseId)
            .container(containerId);
        const resources = await container.item(id).delete();
        return resources;
    }catch(error){
        console.error('Questionnaire id error:', error, id);
    }
}
module.exports = {
    getAllQuestionnaires,
    getQuestionnaireById,
    createQuestionnaire,
    putQuestionnaire,
    removeQuestionnaire,
    getMultipleQuestionnaireById,
    getAllRecord,
    getQuestionDetails
}
