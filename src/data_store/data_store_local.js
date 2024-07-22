// Sample data
const properties = new Map();
const propertyManagers = new Map();
const units = new Map();
const tenants = new Map();
const auditors = new Map();
const documents = new Map();
const waitlist = new Map();
const households = new Map();

function mapTableNameToStore(tableName) {
  const tableMappings = {
    'unit': units,
    'waitlist': waitlist,
    'household': households,
    'property': properties,
    'documents': documents,
    'property_manager': propertyManagers,
    // Add more mappings as needed
  };

  return tableMappings[tableName] || null; // Return empty array if no matching mapping is found
}


async function getRecordByKey(tableName, key) {
  try {
    const record_store = mapTableNameToStore(tableName);
    const result = record_store.get(key)
    // console.log(`result for table ${tableName}: ${result}`);

    return result;
  } catch (error) {
    console.error('getRecordByKey error:', error, tableName, key);
    throw new Error('An error occurred while fetching the record.');
  }
}

async function putRecord(tableName, key, data) {
  try {
    // store record
    const record_store = mapTableNameToStore(tableName);
    record_store.set(key, data);
    // console.log(`data for table ${tableName}: ${data}`);
    return true; 

  } catch (error) {
    console.error('putRecord error:', error, tableName, key);
    throw new Error('An error occurred while putting the record.');
  }
}

module.exports = {
  getRecordByKey,
  putRecord,
};
