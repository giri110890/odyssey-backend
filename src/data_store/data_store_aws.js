const AWS = require('aws-sdk');

AWS.config.update({
  region: 'us-east-1', // Change to your desired region
  // Add your AWS credentials here if not using environment variables
});

const dynamodb = new AWS.DynamoDB.DocumentClient();
const tableName = 'odyssey-profile-data';

async function getRecordByKey(key) {
  try {
    const params = {
      TableName: tableName,
      Key: key,
    };

    const result = await dynamodb.get(params).promise();
    return result.Item;
  } catch (error) {
    console.error('DynamoDB error:', error, tableName, key);
    throw new Error('An error occurred while fetching the record.');
  }
}

async function putRecord(data) {
  try {
    const params = {
      TableName: tableName,
      Item: data,
    };

    await dynamodb.put(params).promise();
  } catch (error) {
    console.error('DynamoDB error:', error, tableName, key);
    throw new Error('An error occurred while putting the record.');
  }
}

module.exports = {
  getRecordByKey,
  putRecord,
};
