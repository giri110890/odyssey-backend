//@ts-check
const CosmosClient = require('@azure/cosmos').CosmosClient

// TODO: delete this - cosmos.js should not know about rentals.
//  This creates a circular dependency.
// const{deleteAllRentalsByPropertyId}=require('../data_store/rentals')

const config = require('../../config/config')
const url = require('url')

const endpoint = config.endpoint
const key = config.key

const databaseId = config.database.id
const containerId = config.container.id
const partitionKey = { kind: 'Hash', paths: ['/id'] }
const databaseConfig = {
  endpoint: config.endpoint,
  key: config.key,
  databaseId: config.database.id,
  containerId: config.container.id,
};


const options = {
  endpoint: endpoint,
  key: key,
  userAgentSuffix: 'odyssey-backend'
};
const client = new CosmosClient(options);
// hemalatha - api for all properties -- start
async function getAllActiveProperties(id) {
  try {
    const container = client
      .database(databaseId)
      .container(containerId);

    const querySpec = {
      query: "SELECT * FROM c WHERE c.property_manager_id=@param1 AND c.property_status='active'",
      parameters: [
        { name: '@param1', value: id },
      ]
    };
    // read all items in the container
    const { resources } = await container.items.query(querySpec).fetchAll();
    return resources;
  } catch (error) {
    console.error('GEt all Property error');
  }
}
// hemalatha - api for all properties -- end
// api to get all deleted property
async function getAllDeletedProperties(id) {
  try {
    const container = client
      .database(databaseId)
      .container(containerId);

    const querySpec = {
      query: "SELECT * FROM c WHERE c.property_manager_id=@param1 AND c.property_status='deleted'",
      parameters: [
        { name: '@param1', value: id },
      ]
    };
    // read all items in the container
    const { resources } = await container.items.query(querySpec).fetchAll();
    return resources;
  } catch (error) {
    console.error('GEt all Property error');
  }
}
// vijay - api for individual property detail -- start
async function getPropertyById(property_id) {
  try {
    const propertyName = config.property_names.id;
    const propertyValue = property_id;

    const resources = await getRecordByKey(propertyName, propertyValue, databaseConfig);

    return resources;
  } catch (error) {
    console.error('Get Property By Id error');
  }
}
// vijay - api individual property detail -- end
// api to get a property detail by property name
async function getPropertyByInfo(info) {
  try {
    const container = client
      .database(databaseId)
      .container(containerId);

    const querySpec = {
      query: "SELECT * FROM c WHERE c.name=@param1 AND c.city=@param2 AND c.state=@param3",
      parameters: [
        { name: '@param1', value: info.name },
        { name: '@param2', value: info.city },
        { name: '@param3', value: info.state },
      ]
    };
    // read all items in the container
    const { resources } = await container.items.query(querySpec).fetchAll();
    return resources;
  } catch (error) {
    console.error('Get Property By Id error');
  }
}

/**ˍ
* Get an item
*/
async function getRecordByKey(key_name, key_value, databaseConfig) {
  try {
    const container = client
      .database(databaseConfig.databaseId)
      .container(databaseConfig.containerId);

    const querySpec = {
      query: "SELECT * FROM c WHERE c." + key_name + "=@param1",
      parameters: [
        { name: '@param1', value: key_value },
      ]
    };
    // read all items in the container
    const { resources } = await container.items.query(querySpec).fetchAll();
    return resources;
  } catch (error) {
    console.error('Get record by key error');
  }
}

async function putRecord(id, data, databaseConfig) {
  try {
    const { item } = await client
      .database(databaseConfig.databaseId)
      .container(databaseConfig.containerId)
   
    .items.upsert(data)
    
    // console.log(`updated item with id:\n${data.id}\n`)
    // Ensure we don't return the item object as it is a database object.
    return { id: item.id };
  } catch (error) {
    console.error('putRecord error:', error, id);
    //throw new Error('An error occurred while putting the record.');
  }
}

// NOTE: You must include the id property and value in the 'data' parameter to avoid duplicate records.
async function putRecordbyFieldId(key_name, key_value, data, databaseConfig) {
  try {
    const container = client
    .database(databaseConfig.databaseId)
    .container(databaseConfig.containerId);

    let item = await container.items.upsert(data, key_value);
    
    if( item.resource){
      // console.log(`updated item from ${databaseConfig.containerId} with id: ${item.item.id}\n`)
      return item.resource;
    }
    else {
      throw new Error(`An error occurred while putting the record: ${item}.`);
    }
  } catch (error) {
    console.error('putRecordbyFieldId error:', error);
    throw new Error('An error occurred while putting the record.');
  }
}


// hemalatha - api for create property-- start
async function create(url, key, data) {
  try {
    // store record
    const { item } = await client
      .database(databaseId)
      .container(containerId)
      .items.create(data)
    // console.log(`Created property item with id:\n${data.id}\n`)
    return item;
  } catch (error) {
    console.error('create record error:', error, data);
    //throw new Error('An error occurred while putting the record.');
  }
}
// hemalatha - api for create property-- end
/**
 * Create the database if it does not exist
 */
async function createDatabase() {
  try {
    const { database } = await client.databases.createIfNotExists({
      id: databaseId
    })
    console.log(`Created database:\n${database.id}\n`)
  } catch (error) {
    console.error('Create Database error');
  }
}
// to delete all property my manager id
async function clearProperty(property_manager_id){
  const container = client
  .database(databaseId)
  .container(containerId);

  const querySpec = {
    query: "SELECT * FROM c WHERE c.property_manager_id=@param1",
    parameters: [
      { name: '@param1', value: property_manager_id },
    ],
  };
  // read all items in the container
  const { resources } = await container.items.query(querySpec).fetchAll();
  for (const resource of resources) {
    await container.item(resource.id).delete();
  }
}
/**
 * Read the database definition
 */
async function readDatabase() {
  try {
    const { resource: databaseDefinition } = await client
      .database(databaseId)
      .read()
    console.log(`Reading database:\n${databaseDefinition.id}\n`)
  } catch (error) {
    console.error('Read Database  error');
  }
}
/**
 * Create the container if it does not exist
 */
async function createContainer() {
  try {
    const { container } = await client
      .database(databaseId)
      .containers.createIfNotExists(
        { id: containerId, partitionKey }
      )
    console.log(`Created container:\n${config.container.id}\n`)
  } catch (error) {
    console.error('Create Container error');
  }
}

/**
 * Read the container definition
 */
async function readContainer() {
  try {
    const { resource: containerDefinition } = await client
      .database(databaseId)
      .container(containerId)
      .read()
    console.log(`Reading container:\n${containerDefinition.id}\n`)
  } catch (error) {
    console.error('Read Container error');
  }
}
/**
 * Scale a container
 * You can scale the throughput (RU/s) of your container up and down to meet the needs of the workload. Learn more: https://aka.ms/cosmos-request-units
 */
async function scaleContainer() {
  const { resource: containerDefinition } = await client
    .database(databaseId)
    .container(containerId)
    .read();

  try {
    const { resources: offers } = await client.offers.readAll().fetchAll();

    const newRups = 500;
    for (var offer of offers) {
      if (containerDefinition._rid !== offer.offerResourceId) {
        continue;
      }
      offer.content.offerThroughput = newRups;
      const offerToReplace = client.offer(offer.id);
      await offerToReplace.replace(offer);
      console.log(`Updated offer to ${newRups} RU/s\n`);
      break;
    }
  }
  catch (err) {
    if (err.code == 400) {
      console.log(`Cannot read container throuthput.\n`);
      console.log(err.body.message);
    }
    else {
      throw err;
    }
  }
}

/**
 * Create family item if it does not exist
 */
async function createFamilyItem(itemBody) {
  try {
    const { item } = await client
      .database(databaseId)
      .container(containerId)
      .items.upsert(itemBody)
    console.log(`Created family item with id:\n${itemBody.id}\n`)
  } catch (error) {
    console.error('CReate Family Item  error');
  }
}


/**
 * Query the container using SQL
 */
async function queryContainer() {
  try {
    console.log(`Querying container:\n${config.container.id}`)

    // query to return all children in a family
    // Including the partition key value of country in the WHERE filter results in a more efficient query
    const querySpec = {
      query: 'SELECT VALUE r.children FROM root r WHERE r.partitionKey = @country',
      parameters: [
        {
          name: '@country',
          value: 'USA'
        }
      ]
    }

    const { resources: results } = await client
      .database(databaseId)
      .container(containerId)
      .items.query(querySpec)
      .fetchAll()
    for (var queryResult of results) {
      let resultString = JSON.stringify(queryResult)
      console.log(`\tQuery returned ${resultString}\n`)
    }
  } catch (error) {
    console.error('Query container error');
  }
}
/**
 * Replace the item by ID.
 */
async function replaceFamilyItem(itemBody) {
  try {
    console.log(`Replacing item:\n${itemBody.id}\n`)
    // Change property 'grade'
    itemBody.children[0].grade = 6
    const { item } = await client
      .database(databaseId)
      .container(containerId)
      .item(itemBody.id, itemBody.partitionKey)
      .replace(itemBody)
  } catch (error) {
    console.error('Replace family item  error');
  }
}


/**
 * Delete the item by ID.
 */
async function deletePropertyItem(key_name, key_value, db_config) {
  let num_items = 0;
  try {
    const container = client
    .database(db_config.databaseId)
    .container(db_config.containerId);

    const querySpec = {
      query: "SELECT * FROM c WHERE c." + key_name + "=@param1",
      parameters: [
        { name: '@param1', value: key_value },
      ]
    };
    // read all items in the container
    const { resources } = await container.items.query(querySpec).fetchAll();
    num_items = resources.length;
    for (const resource of resources) { 
      // Must include the container partition key (the property_id value) for delete to succeed.
      const del_result = await container.item(resource.id, resource.property_manager_id).delete();
      
      // console.log(`Deleted item:\n${resource.id}\n`)
    }
  } catch (error) {
      if(error.code == 404){
        console.log("Id to be deleted was not found: " + key_value);
        num_items = 0;
      } else {
        console.error('Delete Family Item Error: ' + error.message);
      }
  }
  return num_items;
}

async function changePropertyStatus(req,res){
  try {
    let property_manager_id= req.query.property_manager_id;
    const container = client
    .database(databaseId)
    .container(containerId);

    const querySpec = {
      query: "SELECT * FROM c WHERE c.property_manager_id = @managerId",
      parameters: [
        {
          name: "@managerId",
          value: property_manager_id,
        },
      ],
    };
    // Query all documents
    const { resources } = await container.items.query(querySpec).fetchAll();

    // Update each document by adding the new property
    for (const document of resources) {
      document.property_status = "active"; // Add the new property with its value

      // Replace the document in the container
      await container.item(document.id, document.property_manager_id).replace(document);
    }

    // console.log("Documents updated successfully with the new property.");
    res.status(200).json("done")
  } catch (error) {
    console.error("Error updating documents:", error);
  }
}

module.exports = {
  getRecordByKey,
  putRecord,
  putRecordbyFieldId,
  getAllActiveProperties,
  getAllDeletedProperties,
  create,
  getPropertyById,
  clearProperty,
  deletePropertyItem,
  getPropertyByInfo,
  changePropertyStatus,
}
