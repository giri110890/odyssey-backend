const config = require('../../../config/config');
const { getRecordByKey, putRecord,getAllDeletedProperties, getAllActiveProperties, getPropertyById, create, clearProperty, deletePropertyItem } = require('../../data_store/data_store_azure_cosmos');
const { validationResult } = require('express-validator');
const { deleteAllRentalsByPropertyId } = require('../../data_store/rentals');
const { property_status } = require('../../enum/status');
const { validate, thisIsMe, hasPropertiesPermission} = require('../middleware/permission/permission_validator');
const perm = require('../middleware/permission/permissions');
const { getPropertyByPropertyIDs } = require('../../data_store/properties');

const databaseConfig = {
  endpoint: config.endpoint,
  key: config.key,
  databaseId: config.database.id,
  containerId: config.container.id,
};

// Controller functions

// This API requires specific permission for each property.
async function getPropertiesByPropertyIds(req, res) {
  try {
    const {propertyIds} = req.body;
    if ( !hasPropertiesPermission(req)  ) {
      return res.status(400).json({error: 'Invalid request. User does not have access to any properties.'});
    }

    let result = await getPropertyByPropertyIDs(req.permissions.options.properties);
    return res.status(200).json(result);
  } catch (error) {
    console.error('getPropertiesByPropertyIds error: ', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

// This api requires Manager access permission.
// If you are requesting properties that are not owned by you, then you will need either:
// a. CrossCompany permission e.g. an OdysseyAdmin, OR
// b. To have been assigned specific access to each property via the permissions token.
async function getAllActivePropertyData(req, res) {
  try {
    let { property_manager_id } = req.params;
    let do_permissions_filter = false;
    if (property_manager_id) {
      // Validate permission to access property manager
      if (!thisIsMe(req, property_manager_id)) {
        // NOTE: do NOT check for role here as we may change which permissions go with which role in the future,
        //  and we don't want to have to change this code. Just check the permissions.

        // Check for OdysseyAdmin type permission for cross company access.
        if (!validate([perm.AccessPermission.CrossCompany], req.permissions.permissions)) {
          // Check for permission for specific properties e.g. for Shadow User.
          if (!hasPropertiesPermission(req)) {
            // User does not have permission to access property manager
            res.status(401).json({ error: 'User does not have permission to access these properties' }); 
            return;
          } else { 
            // User has permission for specific properties
            do_permissions_filter = true;
          }
        }
      }

      let all_records = await getAllActiveProperties(property_manager_id);
      let filtered_result = all_records;
      if (do_permissions_filter){
        filtered_result = all_records.filter(_r => req.permissions.options.properties.includes(_r.id));
      }

      res.status(200).json(filtered_result);
      //return filtered_result;
    } else {
      res.status(404).json({ error: 'Property Manager {$req.params.property_manager_id} not found.' });
    }
  } catch (error) {
    console.error('Get All property error');
  }
}
/*
SAMPLE OUTPUT: GET ALL PROPERTY DATA
[
{
        "name": "New property",
        "legal_name": "New property",
        "address": "1 m h ",
        "city": "Green city",
        "state": "STate",
        "country": {
            "value": "canada",
            "label": "Canada"
        },
        "county": "Orange",
        "postalcode": "12212",
        "phone_number": "21212121212",
        "fax_number": "21211211",
        "email": "",
        "website": "",
        "billing_email": "",
        "management_agency_name": "",
        "no_of_units": "2121",
        "property_manager_id": "39894836-a2b0-4383-89ca-4dfe0d23b30b",
        "id": "32454082-9a55-40c7-af72-86adc4b04c7a",
        "_rid": "vz0iAK6YgcPHCgAAAAAAAA==",
        "_self": "dbs/vz0iAA==/colls/vz0iAK6YgcM=/docs/vz0iAK6YgcPHCgAAAAAAAA==/",
        "_etag": "\"e902d738-0000-0100-0000-65a957130000\"",
        "_attachments": "attachments/",
        "units": [
            {
                "unit_id": "1",
                "unit_type": "1",
                "bedroom_count": "1",
                "no_of_bed": "1",
                "no_of_bathroom": "1",
                "id": "48afc38d-1076-45ee-b3a2-fe05109ee2e2"
            }
        ],
        "_ts": 1705596691
    }, {}, ]
*/
// api to get all deleted property data
async function getAllDeletedPropertyData(req, res) {
  try {
    let { property_manager_id } = req.params;
    if (property_manager_id) {
      let all_records = await getAllDeletedProperties(property_manager_id);
      let filtered_result = all_records.filter(_r => _r.name);
      res.status(200).json(filtered_result);
      //return filtered_result;
    } else {
      res.status(404).json({ error: 'Property Manager {$req.params.property_manager_id} not found.' });
    }
  } catch (error) {
    console.error('Get All property error');
  }
}
// add special instruction
async function addSpecialInstruction(req, res) {
  try {
    let property_manager_id = req.query.property_manager_id;
    if (!property_manager_id) {
      return res.status(400).json({ errors: 'property_manager_id  Not Found' });
    }
    let property_id = req.query.property_id;
    if (property_id) {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }
      let instructions = req.body;
      let property_details = await getPropertyById(property_id);
      if (property_details && property_details.length > 0) {
        let available_instructions = property_details[0].special_instructions ? property_details[0].special_instructions : [];
        if (available_instructions.length == 0) {
          let all_instructions = [...available_instructions, instructions];
          
          property_details[0].special_instructions = all_instructions;
          let update_property = await putRecord(property_id, property_details[0], databaseConfig)
          if (update_property.id == property_id) {
            res.status(200).json({ id: update_property.id, message: " Property updated with special instructions" })
          } else {
            res.status(400).json({ error: "Error while updating property with special instruction" })
          }
        } else {
          let isEqual = false;
          available_instructions.forEach(_field => {
            isEqual = areDeeplyEqual(_field, instructions);
            if (isEqual == true) {
              return res.status(400).json({ errors: "Field already exist" });
            }
          });
          if (isEqual == false) {
            available_instructions.push(instructions);
            property_details[0].special_instructions = available_instructions;
            
            let update_property = await putRecord(property_id, property_details[0], databaseConfig)
            if (update_property.id == property_id) {
              res.status(200).json({ id: update_property.id, message: " Property updated with special instructions" })
            } else {
              res.status(400).json({ error: "Error while updating property with special instruction" })
            }
          }
        }

      } else {
        return res.status(400).json({ errors: 'Property has no details' });
      }
    } else {
      res.status(400).json({ error: "Property ID not found" })
    }
  } catch (error) {
    console.log(error);
  }
}

function areDeeplyEqual(obj1, obj2) {
  if (obj1 === obj2) return true;

  if (Array.isArray(obj1) && Array.isArray(obj2)) {

    if (obj1.length !== obj2.length) return false;

    return obj1.every((elem, index) => {
      return areDeeplyEqual(elem, obj2[index]);
    })


  }

  if (typeof obj1 === "object" && typeof obj2 === "object" && obj1 !== null && obj2 !== null) {
    if (Array.isArray(obj1) || Array.isArray(obj2)) return false;

    const keys1 = Object.keys(obj1)
    const keys2 = Object.keys(obj2)

    if (keys1.length !== keys2.length || !keys1.every(key => keys2.includes(key))) return false;

    for (let key in obj1) {
      // console.log(obj1[key], obj2[key])
      let isEqual = areDeeplyEqual(obj1[key], obj2[key])
      if (!isEqual) { return false; }
    }

    return true;

  }

  return false;
}
/*
SAMPLE OUTPUT : ADD SPECIAL INSTRUCTIONS
{
        "name": "Kanam",
        "legal_name": "Kanam",
        "address": "kanma",
        "city": "nagercoil",
        "state": "India",
        "country": {
            "label": "Canada",
            "value": "canada"
        },
        "county": "Tamil Nadu",
        "postalcode": "629004",
        "phone_number": "07639689679",
        "fax_number": "11111111",
        "email": "muthu.yonisha@gmail.com",
        "website": "https://www.linkedin.com/in/yonisha-r-39a42b210",
        "billing_email": "muthu.yonisha@gmail.com",
        "management_agency_name": "kanam",
        "no_of_units": "11",
        "property_manager_id": "39894836-a2b0-4383-89ca-4dfe0d23b30b",
        "id": "77487ccf-4d85-482c-8b42-b0a8e24b5612",
        "_rid": "vz0iAK6YgcO6CgAAAAAAAA==",
        "_self": "dbs/vz0iAA==/colls/vz0iAK6YgcM=/docs/vz0iAK6YgcO6CgAAAAAAAA==/",
        "_etag": "\"9f02781b-0000-0100-0000-65a918df0000\"",
        "_attachments": "attachments/",
        "units": [
            {
                "unit_id": "123",
                "unit_type": "212",
                "bedroom_count": "212",
                "no_of_bed": "212",
                "no_of_bathroom": "21",
                "id": "7c3fe624-6ffe-463c-bd39-fe6acb0f812a"
            }
        ],
        "special_instructions": [
            {
                "form_name": {
                    "label": "hema 1.pdf",
                    "value": "74fca442-64c4-4960-abc0-df213d5b36d1"
                },
                "form_field": {
                    "label": "hema_income",
                    "value": "HEMA_INCOME"
                },
                "field_operator": {
                    "value": "greater",
                    "label": "Greater than"
                },
                "field_expected_value": "500",
                "form_field_intent": {
                    "value": "send_forms",
                    "label": "Send Forms"
                },
                "form_field_value": [
                    {
                        "group": "Forms",
                        "option": "hema 2.pdf",
                        "id": "0c8bcb06-4309-4e1d-9660-db94c2b1b718"
                    }
                ]
            },
        ],
        "_ts": 1705580767
    }
*/
// hema - api to delete Property
// This function belongs in propertyController.js
async function removeProperty(id) {
  let num_items = 0;
  try {
    num_items = await deletePropertyItem('id', id, databaseConfig);
    if (num_items > 0) {
      const rentals = await deleteAllRentalsByPropertyId(id);
      // console.log(`Property with ID ${id} and its rentals emptied and deleted.`);
    } else {
      console.log(`Property with ID ${id} not found.`);
    }
  } catch (error) {
    console.error(`Error emptying the array and deleting the document: ${error}`);
  }
  return num_items;
}

// hemalatha - api for all properties -- end
// delete all property by property manager id
async function deleteAllProperty(req, res) {
  let { property_manager_id } = req.params;
  if ( thisIsMe(req, property_manager_id)) {
    const del = await clearProperty(property_manager_id);
    res.status(200).json("All property Deleted");
  } else {
    res.status(401).json("Unauthorized");
  }
}
// hema - api to get a property by id
async function getById(req, res) {
  try {
    const { id } = req.params;
    if (id) {
      const properties = await getPropertyById(id);
      res.status(200).json(properties);
    } else {
      res.status(404).json({ error: 'Property {$req.params.id} not found.' });
    }
  } catch (error) {
    console.error('Get by id error');
  }
}
// hema - api to add a property deatil
async function addProperty(req, res) {
  try {
    if (req.body.property_manager_id) {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }
      const newProperty = req.body;
      newProperty.property_status = property_status.Active;
      const property = await create('property', "", newProperty);
      // Save the unique id value - this is what we query against.
      newProperty.id = property.id
      
      res.status(200).json(newProperty);
    }
    else {
      res.status(404).json({ error: `Property Manager ${req.params.property_manager_id} not found.` });
    }
  } catch (error) {
    console.error('Add Property error');
  }
}
// hema - api to update property details
async function update(req, res) {
  try {
    let property_manager_id = req.query.property_manager_id;
    if (property_manager_id) {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }
      let property_id = req.query.property_id;
      if (!property_id) {
        return res.status(400).json({ errors: 'Property Id Not Found' });
      }
      let property_details = await getPropertyById(property_id)
      if (!Array.isArray(property_details) || property_details.length === 0) {
        return res.status(404).json({ error: 'Property details not found or invalid format' });
      }
      let property = req.body;
      let update_property = {
        id: property_id,
        name: property.name,
        legal_name: property.legal_name,
        address: property.address,
        city: property.city,
        state: property.state,
        country: property.country,
        postalcode: property.postalcode,
        county: property.county,
        phone_number: property.phone_number,
        fax_number: property.fax_number,
        email: property.email,
        billing_email: property.billing_email,
        management_agency_name: property.management_agency_name,
        website: property.website,
        no_of_units: property.no_of_units,
        property_manager_id: property_manager_id,
        property_status: property_details[0].property_status,
        units: property_details[0].units || null,
      };

      const updated_property = await putRecord(property_id, update_property, databaseConfig);
      res.json(updated_property.id);
    }
    else {
      
      res.status(404).json({ error: `Property Manager ${req.params.property_manager_id} not found.` });
    }
  } catch (error) {
    console.error('Update Property error');
  }
}

// hema - api to delete property
/*
for deletiong property
property_id -> query
*/
async function deleteProperty(req, res) {
  try {
    let property_id = req.query.id;
    let property_manager_id = req.query.property_manager_id;
    if (!property_manager_id) {
      return res.status(400).json({ errors: 'property manager  Not Found' });
    }
    if (!thisIsMe(req, property_manager_id)) {
      return res.status(401).json({ errors: 'Unauthorized' });
    }
    if (!property_id) {
      return res.status(400).json({ errors: 'property id  Not Found' });
    }
    const result = await removeProperty(property_id);
    if (result == 0)
      res.status(404);
    else
      res.status(200).json({ success: "Property deleted" });
  } catch (error) {
    console.log('Error deleting property');
  }
}
// delete property by changing its status
async function softDeleteProperty(req, res) {
  try {
    let property_id = req.query.id;
    let property_manager_id = req.query.property_manager_id;
    if (!property_manager_id) {
      return res.status(400).json({ errors: 'property manager  Not Found' });
    }
    if (!thisIsMe(req, property_manager_id)) {
      return res.status(401).json({ errors: 'Unauthorized' });
    }
    if (!property_id) {
      return res.status(400).json({ errors: 'property id  Not Found' });
    }
    let property_details = await getPropertyById(property_id);
    if (property_details && property_details.length > 0) {
      if (property_details[0].property_status) {
        if (property_details[0].property_status === property_status.Active) {
          property_details[0].property_status = property_status.Deleted;   // soft delete -> by just changing its status
        }
        else {
          property_details[0].property_status = property_status.Active;   // soft delete -> by just changing its status
        }
      } else {
        property_details[0].property_status = property_status.Active
      }
      let update_property = await putRecord(property_id, property_details[0], databaseConfig);
      if (update_property.id) {
        res.status(200).json({ success: "Property updated" });
      } else {
        res.status(404).json({ error: "error while deleting property" });
      }
    } else {
      console.log("Property details not found")
    }

  } catch (error) {
    console.log('Error deleting property');
  }
}

module.exports = {
  getAllActivePropertyData,
  getPropertiesByPropertyIds,
  getById,
  addProperty,
  update,
  deleteAllProperty,
  deleteProperty,
  getAllDeletedPropertyData,
  // special instruction
  addSpecialInstruction,
  softDeleteProperty
};
