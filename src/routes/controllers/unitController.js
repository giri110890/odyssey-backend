const {  getAllUnits } = require('../../data_store/units'); // Adjust the path as needed
const {  removeRental, getRentalsUsingUnitId } = require('../../data_store/rentals')
const { addRental } = require('../../services/rental_service')
const { getPropertyById, putRecord, getUnitDetails } = require('../../data_store/data_store_azure_cosmos')
const { assignTenantIntoUnit } = require('../controllers/rentalController')
const config = require('../../../config/config')
const { validationResult } = require('express-validator');
const csvtojsonV2 = require("csvtojson/v2");
const formidable = require('formidable');
const fs = require('fs');
const uuid = require('uuid');
const user_service = require('../../services/user_service');
const { AccessRoles } = require('../../routes/middleware/permission/permissions');

const databaseConfig = {
  endpoint: config.endpoint,
  key: config.key,
  databaseId: config.database.id,
  containerId: config.container.id,
};

/*
for adding unit : 
property_id in query
        property_id: '2113-dfffe-123dsf-234d',
all data -> in body
{
        unit_id: "Unit",
        unit_number: "543"
        unit_type: "demo",
        bedroom_count:"2"
        no_of_bed:"2",
        no_of_bathroom:"1"
}
->it creates a unit id
-> with unit info and property id it creates a rental id
-> then after adding units it create a rental id (rental id -> contains unit id, property id, requiredQA and tenant id (optional))
-> then with unit details and property id it creates unit array under property
*/

async function addUnit(req, res) {
  try {
    let property_id = req.query.property_id;
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log(errors.array());
      return res.status(400).json({ errors: errors.array() });
    }
    let data = req.body;
    data.id = uuid.v4();
    if (property_id) {
      // TODO: remove this once the Add Tenant flow creates a rental.
      // let rental = await addRental(data, property_id);

      let updatedProperty = await addUnitUnderProperty(data, property_id);
      res.status(200).json({ unit_id: data.id, property_id: updatedProperty.id });
    }
    else {
      res.status(404).json({ error: 'Property id {$req.body.property_id} not found.' });
    }
  } catch (error) {
    console.error('Adding Unit error');
  }
}
//api to add units array  under property
async function addUnitUnderProperty(data, id) {
  let property_details = await getPropertyById(id);
  let currentProperty = property_details[0];
  let unitsInProperty = currentProperty.units || [];
  unitsInProperty.push(data);
  currentProperty.units = unitsInProperty;
  let updatedProperty = await putRecord(id, currentProperty, databaseConfig);
  return updatedProperty;

}


/*
to get all unit 
property_id -> in query
property_id : d8bcd497-4c97-4b6e-94f0-8692ef7cc67e
*/

// hema - to get all unit
async function getAllUnitData(req, res) {
  try {
    // req.params.property_id
    let property_id = req.query.property_id;
    if (property_id) {
      let all_records = await getAllUnits(property_id);
      res.status(200).json(all_records);
      //return filtered_result;
    }
    else {
      res.status(404).json({ error: 'Property id {$req.params.property_id} not found.' });
    }
  } catch (error) {
    console.error('Get All Unit eeror');
  }
}

/*
to get a unit details:
property_id and unit_id in query
property_id:c5045785-7c7a-4761-89fc-8400d5d56f6d
unit_id:af21f5fa-350e-4f1e-803b-56051cc6ada0
*/
// hema - api to get a unit details
async function getById(req, res) {
  try {
    let property_id = req.query.property_id;
    let unit_id = req.query.unit_id;
    if (property_id) {
      let propertyDetails = await getPropertyById(property_id);
      let currentProperty = null;
      if (Array.isArray(propertyDetails)) {
        currentProperty = propertyDetails[0];
        if (currentProperty.units) {
          let unit_details = currentProperty.units.find(_unit => _unit.id == unit_id)
          if (!unit_details) {
            res.status(404).json({ error: 'Property details with this unit id not found' });
          } else {
            res.status(200).json(unit_details);
          }
        } else {
          res.status(404).json({ error: 'Property details has no units' });
        }
      } else {
        res.status(404).json({ error: 'Property details not found' });
      }
    } else {
      res.status(404).json({ error: 'Property id {$req.query.property_id} not found.' });
    }
  } catch (error) {
    console.error('Get a unit details by id error');
  }
}
// tenant creation on bulk upload
async function TenantCreation(tenantInfo) {
  if (tenantInfo.email) {
    // let unique_tenant = await getUserByEmail(tenantInfo.email);
    //Create entry in access table if doesnt exist - bulk upload users were not able to see their units - start
    let tenantCreationResponse = await user_service.ensureUserExists(tenantInfo, [AccessRoles.Tenant], null);
    //Create entry in access table if doesnt exist - bulk upload users were not able to see their units - end
    return tenantCreationResponse?.user?.id || null;
    // if (!tenantCreationResponse.user.id) {
    //   let new_tenant = await createUser(tenantInfo)
    //   let tenant_id = new_tenant.id;
    //   return tenant_id;
    // } else {
    //   let already_exist_tenant_id = unique_tenant[0].id;
    //   return already_exist_tenant_id;
    // }
  } else {
    console.error('Email id undefined');
    return null;
  }

}



// hemalatha - api to upload bulk unit-- start
async function bulkUploadUnits(req, res) {
  try {
    let property_id = req.query.property_id;
    let property_details = await getPropertyById(property_id);
    let units_in_property = [];
    if (property_details && property_details.length > 0) {
      units_in_property = property_details[0].units || []
      let property_manager_id = req.query.property_manager_id;
      if (property_manager_id) {
        const form = new formidable.IncomingForm();
        const [fields, files] = await form.parse(req);
        let bulkUploadResults = [];
        let readStream = await fs.createReadStream(files.myFile[0].filepath);
        let uploadResult = await csvtojsonV2()
          .fromStream(readStream)
          .then(async (csv_table) => {
            let autoCreateResponse = await Promise.all(csv_table.map(async function (_row) {
              let emailID = null;
              if (_row["Email Address"]) {
                emailID = _row["Email Address"].toLowerCase();
              }

              let tenantInfo = {
                resident_id: _row["Resident"],
                unit_type: _row["Unit Type"],
                postalcode: _row["Zip Code"],
                program_type: _row["Program Type"],
                house_size: _row["Number of Adult Household Members"],
                date_of_birth: _row["Date of Birth"],
                current_rent: _row["Current Rent"],
                tel_number: _row["Phone Number"],
                security_deposit_held: _row["Security Deposit Held"],
                email: emailID,
                first_name: _row["First Name"],
                last_name: _row["Last Name"],
                address: _row["Address"],
                city: _row["City"],
                state: _row["State"],
                role: "tenant",
                unit_number: _row["Unit"], 
                relationship: {   // Migrate to Rentals
                  value: "head_of_household",
                  label: "Head of Household"
                }
              }
              let newUnitInfo = {
                unit_id: _row["Unit"],  // Deprecate - use unit_number instead
                unit_number: _row["Unit"],
                unit_type: _row["Unit Type"],
                id: uuid.v4()
              }
              tenantInfo.property_manager_id = property_manager_id;
              let tenant_id = await TenantCreation(tenantInfo); 
              let newRentalInfo = {
                property_id: property_id,
                unit_id: newUnitInfo.id,
                unit_number: newUnitInfo.unit_number,
                tenant_id: [tenant_id],
                tenantId: tenant_id,
                move_in_date: _row["Move In Date"],
                move_out_date: null,
                certification_date: _row["Certification Date"],
                
              }
  
              let found_unit = units_in_property.find(_unit => _unit.unit_number == newUnitInfo.unit_number || _unit.unit_id == newUnitInfo.unit_number)
              if (!found_unit) { // if no units found, push into units array
                units_in_property.push(newUnitInfo);
              }
            
              let status = await assignTenantIntoUnit(newRentalInfo);
            
            }))
            // Save the units
            let currentProperty = property_details[0];
            currentProperty.units = units_in_property
            // Save the updated property
            let updatedProperty = await putRecord(property_id, currentProperty, databaseConfig);
            if (autoCreateResponse) {
              res.status(200).json({ status: "success" });
            }
          })
      } else {
        res.status(404).json({ error: `Property Manager ${property_manager_id} not found.` });
      }
    } else {
      res.status(404).json({ error: `Property  ${property_id} not found.` });
    }
  }
  catch (error) {
    console.error('Bulk Upload error: ', error);
  }
}
/*
to update unit:
property_manager_id, property_id in query
unit id in body
*/
// hemalatha - api to update unit

async function updateUnit(req, res) {
  try {
    let property_manager_id = req.query.property_manager_id;
    if (property_manager_id) {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }
      let property_id = req.query.property_id;
      let unit_id = req.query.unit_id;
      let unit_updated_details = req.body;
      if (property_id) {
        let propertyDetails = await getPropertyById(property_id);
        let currentProperty = null;
        if (Array.isArray(propertyDetails)) {
          currentProperty = propertyDetails[0];
          if (currentProperty.units) {
            let unit_details = currentProperty.units.filter(_unit => _unit.id == unit_id)
            if (unit_details.length == 0) {
              res.status(404).json({ error: 'Property details with this unit id not found' });
            } else {
              let unit_data = unit_details[0];
              let updated_unit = {
                id: unit_data.id,
                unit_id: unit_updated_details.unit_id,
                unit_type: unit_updated_details.unit_type,
                bedroom_count: unit_updated_details.bedroom_count,
                //no_of_bed: unit_updated_details.no_of_bed,
                no_of_bathroom: unit_updated_details.no_of_bathroom,
              };

              let current_unit_details = currentProperty.units.findIndex(_unit => _unit.id == unit_id)
              if (current_unit_details > -1) {

                currentProperty.units.splice(current_unit_details, 1);
                currentProperty.units.push(updated_unit);
                const updated_property = await putRecord(property_id, currentProperty, databaseConfig);
                res.status(200).json({ message: "Unit updated successfully", id: updated_property.id })
              }
            }
          } else {
            console.log("No units Found in property");
          }
        } else {
          res.status(400).json("Property details not found")
        }
      } else {
        res.status(400).json("property id not found")
      }
    } else {
      res.status(400).json("property manager id not found")
    }
  } catch (error) {
    res.status(400).json(error)
  }
}
//hema - api to delete Unit
/*
for deleting unit:
property_id and unit_id in query
*/
async function deleteUnit(req, res) {
  try {
    let property_manager_id = req.query.property_manager_id;
    if (!property_manager_id) {
      res.status(404).json({ error: 'Property Manager Id not found' });
    }
    let property_id = req.query.property_id;
    let unit_id = req.query.unit_id;
    if (!unit_id) {
      return res.status(400).json({ errors: 'property_id  Not Found' });
    }
    let delete_unit = false;
    if (property_id) {
      let remove_rental = await removeRentalInfo(unit_id)
     
      deleteUnit = await removeAndUpdateUnit(property_id, unit_id)
      if (deleteUnit == true) {
        res.status(200).json({ message: "Unit deleted successfully", id: unit_id })
      } else {
        res.status(400).json({ error: "Unit deleted error" })
      }
    

    } else {
      res.status(404).json({ error: 'Property details has no units' });
    }
  } catch (error) {
    console.error('Questionnaire not found in');
  }
}

// remove and update tenant 
async function removeRentalInfo(unit_id) {
  try {
    let remove_status = false;
    let rental_details = await getRentalsUsingUnitId(unit_id);
    if (rental_details && rental_details.length > 0) {
      let rental_id = rental_details[0].id;

      remove_status = await removeRental(rental_id);
    } else {
      console.log("Property has no unit with given unit id")
    }
    return remove_status;
  } catch (error) {
    console.log(error);
  }
}
// delete unit
async function removeAndUpdateUnit(property_id, unit_id) {
  try {
    let remove_unit_status = false;
    let propertyDetails = await getPropertyById(property_id);
    let currentProperty = null;
    if (Array.isArray(propertyDetails)) {
      currentProperty = propertyDetails[0];
      let current_unit_details = currentProperty.units.findIndex(_unit => _unit.id == unit_id)
      if (current_unit_details > -1) {
        currentProperty.units.splice(current_unit_details, 1);

        const updated_property = await putRecord(property_id, currentProperty, databaseConfig);
        if (updated_property.id) {
          remove_unit_status = true;
        }
        return remove_unit_status;
      } else {
        console.log("property has no unit with given unit id")
      }
    } else {
      console.log("Property details not found")
    }
  } catch (error) {
    console.log(error)
  }

}
module.exports = {
  addUnit,
  getAllUnitData,
  bulkUploadUnits,
  getById,
  updateUnit,
  deleteUnit,
}