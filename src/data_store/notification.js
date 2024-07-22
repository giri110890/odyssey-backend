const CosmosClient = require('@azure/cosmos').CosmosClient
const config = require('../../config/config')
const url = require('url')
const data_store = require('./data_store_azure_cosmos');
const { NotificationStatus } = require('../enum/status')

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
  containerId: config.container.notifications,
};

const client = new CosmosClient(options);

// hema- get notification by user is
async function notificationByUser(id, property_id) {
  try {
    const container = client
      .database(databaseConfig.databaseId)
      .container(databaseConfig.containerId);

    // const querySpec = {
    //   query: "SELECT * FROM c WHERE c.user_id=@param1",
    //   parameters: [
    //     { name: '@param1', value: id },
    //   ]
    // };
    const querySpec = {
      query: `SELECT * FROM c WHERE c.user_id = @param1 ${property_id !== undefined ? "AND c.property_id = @param2" : ""}`,
      parameters: [
        { name: '@param1', value: id },
        ...(property_id !== undefined ? [{ name: '@param2', value: property_id }] : []),
      ]
    };
    const { resources } = await container.items.query(querySpec).fetchAll();
    return resources;
  } catch (error) {
    console.error('GEt all notification error');
  }
}
// hema - update notification
async function updateNotification(id, data) {
  const { item } = await client
    .database(databaseConfig.databaseId)
    .container(databaseConfig.containerId)
    .items.upsert(data)
  // console.log(`updated notification item with id:\n${data.id}\n`)
  return item;
}
// hema - create notification
async function createNotification(data) {
  try {
    const { item } = await client
      .database(databaseConfig.databaseId)
      .container(databaseConfig.containerId)
      .items.create(data)
    // console.log(`Created notification item with id:\n${item.id}\n`)
    return item;
  }
  catch (error) {
    console.error('create notification error:', error, data);
  }
}
//Sujith- Api for get multiple notification by id
async function updateNotificationStatus(notificationIds) {
  try {
    let status = false;
    const container = client
      .database(databaseConfig.databaseId)
      .container(databaseConfig.containerId)

    const querySpec = {
      query: "SELECT * FROM c WHERE ARRAY_CONTAINS(@notificationIds, c.id, true)",
      parameters: [
        {
          name: "@notificationIds",
          value: notificationIds,
        },
      ],
    };
    const { resources } = await container.items.query(querySpec).fetchAll();

    for (const notification of resources) {

      // Update status
      notification.status = NotificationStatus.Read;

      // Replace document
      await container.item(notification.id).replace(notification);

      // console.log("Notification with ID", notification.id, "updated its status");

      status = true;
    }
    return status;
  } catch (error) {
    console.error("Error updating notifications:", error);
    throw error;
  }
}
//Sujith - Api for create message
async function createMessage(data) {
  try {
      // store tenant
      const { item } = await client
      .database(databaseConfig.databaseId)
      .container(databaseConfig.containerId)
          .items.create(data)
      console.log(`Created user family item with id:\n${data.id}\n`)
      return item;
  } catch (error) {
      console.error('create record error:', error, data);
  }
}
//SUJITH - api to get all message
async function getAllMessage(id) {
  try {
    let querySpec;
    if (id.property_manager_id) {
      querySpec = {
        query: "SELECT * FROM c WHERE (c.message.to = @param1 OR c.property_manager_id = @param1)",
        parameters: [
            { name: '@param1', value: id.property_manager_id }
        ]
    };    
    } else if (id.tenant_id) {
      querySpec = {
        query: "SELECT * FROM c WHERE c.tenant_id=@param1",
        parameters: [
          { name: '@param1', value: id.tenant_id },
        ]
      };
    }

    const container = client
      .database(databaseConfig.databaseId)
      .container(databaseConfig.containerId);


    const { resources } = await container.items.query(querySpec).fetchAll();
    return resources;
  } catch (error) {
    console.error('Get all messages error:', error);
    throw error;
  }
}





module.exports = {
  createNotification,
  updateNotification,
  notificationByUser,
  updateNotificationStatus,
  createMessage,
  getAllMessage
}