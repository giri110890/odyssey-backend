const { request } = require('http');
const { getAllTenants, listAllShadowUsers, listAllPropertyManagers, getAllPropertyManagers, getAllCompany, createUser, getTenantById, getCompanyById, putUser, removeTenant, clearTenant, getUserByEmail, getMultipleTenantById, getUserById, removePropertyManager } = require('../../data_store/users');
const { validationResult } = require('express-validator');
const { getRentalById, putRental, getRentalsUsingTenantId } = require('../../data_store/rentals');
const config = require('../../../config/config');

const access_service = require('../../services/access_service');
const { AccessRoles } = require('../middleware/permission/permissions');
const user_service = require('../../services/user_service');
const { buildPermissionsToken, thisIsMe } = require('../middleware/permission/permission_validator');
const { updateItem, getItem } = require('../../data_store/access')
const { sendNotification, sendEmailNotification, addNotification } = require('./notificationController');


const databaseConfig = {
  endpoint: config.endpoint,
  key: config.key,
  databaseId: config.database.id,
  containerId: config.container.rentals,
};

// hema - api to get users role
async function getUserByEmailId(req, res) {
  onLogin(req, res);
}
// Login
//  Return user info and permissions so user has appropriate access
async function onLogin(req, res) {
  try {
    let user_email = req.query.email;
    if (user_email) {
      // let user_info = await getUserByEmail(user_email);
      let user_info = await user_service.ensureUserExists({ email: user_email }, null, null);
      if (user_info.length == 0) {
        res.status(200).json({ data: 'No user found with this email', status: "401" });
        return;
      }

      // Load permissions token based on access records
      let user_id = user_info.user.id;
      let access = await access_service.ensureAccessExists(user_id, null);
      if (access) {

        let permissions_token = await buildPermissionsToken(access);

        // Save the token to the user_info to avoid ajax set-cookie issues.
        user_info.permissions = permissions_token;
        let public_key_config = config.permissions.public_keys[config.permissions.public_keys.kid];
        user_info.permissions_public_key = public_key_config;

      }

      res.status(200).json(user_info);

    } else {
      res.status(404).json({ error: 'User email not specified in query.' });
    }
  } catch (error) {
    console.error('Get User by email id error: {' + error + '}');
  }
}

// hema - to get all tenant
async function getAllTenant(req, res) {
  try {
    // req.params.property_manager_id
    // Make sure that this accessing data that belongs to this property manager
    let { property_manager_id } = req.params;
    if (property_manager_id) {
      if (thisIsMe(req, property_manager_id)) {

        let all_records = await getAllTenants(property_manager_id, 'tenant');
        if (all_records.length == 0) {
          res.status(200).json({ message: 'No tenant found' });
        } else {
          res.status(200).json(all_records);
        }
      } else {
        res.status(401).json({ error: 'Wrong Property Manager id.' });
      }
    }
    else {
      res.status(404).json({ error: 'Property Manager id not found.' });
    }
  } catch (error) {
    console.error('Get all tenant error:');
  }
}

// hema - to get multiple tenant details
async function getMultipleTenantDetails(req, res) {
  try {
    let property_manager_id = req.query.property_manager_id
    let tenant_ids = req.query.tenant_ids;
    if (property_manager_id) {
      let all_records = await getMultipleTenantById(tenant_ids);
      if (all_records.length == 0) {
        res.status(200).json({ message: 'No tenant found' });
      } else {

        res.status(200).json(all_records);
      }
    }
    else {
      res.status(404).json({ error: 'Property Manager id not found.' });
    }
  } catch (error) {
    console.error('Get multiple tenant details error');
  }
}
// hema - api to create tenant
async function addTenant(req, res) {
  try {
    let property_manager_id = req.query.property_manager_id;
    if (property_manager_id) {
      if (!property_manager_id) {
        return res.status(400).json({ error: 'property manager id not found' });
      }
      let errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }
      let user = req.body;
      // Link tenant to property manager
      if (user.property_manager_id && user.property_manager_id !== property_manager_id) {
        console.warn('Add Tenant: property manager id\'s differ: ' + user.property_manager_id + ' ' + property_manager_id);
      }
      user.property_manager_id = property_manager_id;
      let tenantCreationResponse = await user_service.ensureUserExists(user, [AccessRoles.Tenant], null);
      if (tenantCreationResponse && tenantCreationResponse.isAlreadyExists) {
        res.status(200).json({ id: tenantCreationResponse.user.id, isAlreadyExists: tenantCreationResponse.isAlreadyExists });
      }

      else if (tenantCreationResponse && tenantCreationResponse.user) {
        res.status(200).json({ id: tenantCreationResponse.user.id, isAlreadyExists: tenantCreationResponse.isAlreadyExists });
      } else {
        res.status(500).json({ error: 'Error while adding tenant' });
      }
    } else {
      res.status(404).json({ error: 'Property Manager id not specified in query.' });
    }

  } catch (error) {
    console.error('Add tenant Error:', error);
    res.status(500).json({ error: 'An error occurred while processing your request' });
  }
}
// hema - api to add property_ manager
async function addPropertyManager(req, res) {
  try {
    let errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    let user = req.body;
    user.email = req.body?.email?.toLowerCase();
    user.property_manager_id = req.validated_user_id;
    let user_id = req.validated_user_id

    // For Property Managers, the property_manager_id should be the same as the user.id record.
    if (user.id && user.property_manager_id && user.id !== user.property_manager_id) {
      console.warn('For a property manager, the User id and property manager id do not match. User id: '
        + user.id + ' Property Manager id: ' + user.property_manager_id);
    }
    let userCreationResponse = await user_service.ensureUserExists(user, [AccessRoles.PropertyManager], null);
    // Notification part
    let property_manager_details = await getUserById(user_id);
    let property_manager_name = property_manager_details[0]?.first_name + " " + property_manager_details[0]?.last_name;
    let add_property_manager_name = user.first_name + " " + user.last_name;
    let add_property_manager_email = user.email;
    let property_manager_email = property_manager_details[0].email
    let property_manager_notification = await sendNotification("propertyManagerInvitePropertyManager", { property_manager_name, add_property_manager_name })
    let invite_notification = await sendNotification("propertyManagerSignup", { add_property_manager_name });
    let tenant_email_notification = await sendEmailNotification(invite_notification, property_manager_email);
    let property_manager_email_notification = await sendEmailNotification(property_manager_notification, add_property_manager_email);
    if (userCreationResponse) {
      let notification_response = await addNotification(property_manager_notification, invite_notification, user_id, userCreationResponse.user?.id)
    }
    if (userCreationResponse && userCreationResponse.isAlreadyExists) {
      res.status(200).json({ id: userCreationResponse.user.id, isAlreadyExists: userCreationResponse.isAlreadyExists });
    }
    else if (userCreationResponse && userCreationResponse.user) {
      res.status(200).json({ id: userCreationResponse.user.id, isAlreadyExists: userCreationResponse.isAlreadyExists });
    } else {
      res.status(500).json({ error: 'Error while adding tenant' });
    }

  } catch (error) {
    console.error('Add property manager Error:', error);
    res.status(500).json({ error: 'An error occurred while processing your request' });
  }
}

async function addShadowManager(req, res) {
  try {
    let errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    let user = req.body.user;
    user.email = req.body?.user?.email?.toLowerCase();
    if (user.role == "shadow_user") {
      user.role = "ShadowManager";
    }
    // Link the Shadow Manager to the Property Manager they are shadowing.
    user.property_manager_id = req.validated_user_id;
    let user_id = req.validated_user_id
    let options = {};
    options.users = [user.property_manager_id];
    let userCreationResponse =
      await user_service.ensureUserExists(user, [AccessRoles.ShadowManager], options);
    //get shadow manager mail
    let shadow_manager_email = user.email
    //get property by id
    let property_manager_details = await getUserById(user_id);
    let property_manager_name = property_manager_details[0]?.first_name + " " + property_manager_details[0]?.last_name;
    let shadow_manager_name = user.first_name + " " + user.last_name;
    let property_manager_email = property_manager_details[0].email
    // notification changes - start
    let property_manager_notification = await sendNotification("propertyManagerInviteShadowManager", { property_manager_name, shadow_manager_name })
    let invite_notification = await sendNotification("shadowManagerSignup", { property_manager_name: property_manager_name });
    let tenant_email_notification = await sendEmailNotification(invite_notification, shadow_manager_email);
    let property_manager_email_notification = await sendEmailNotification(property_manager_notification, property_manager_email)
    let notification_response = await addNotification(property_manager_notification, invite_notification, user_id, user.property_manager_id)
    // notification changes - end
    if (userCreationResponse && userCreationResponse.isAlreadyExists) {
      res.status(200).json({ id: userCreationResponse.user.id, isAlreadyExists: userCreationResponse.isAlreadyExists });
    }
    else if (userCreationResponse && userCreationResponse.user) {
      res.status(200).json({ id: userCreationResponse.user.id, isAlreadyExists: userCreationResponse.isAlreadyExists });
    } else {
      res.status(500).json({ error: 'Error while adding Shadow Manager' });
    }

  } catch (error) {
    console.error('Add Shadow manager Error:', error);
    res.status(500).json({ error: 'An error occurred while processing your request' });
  }
}

// hema - api to update tenant
async function updateTenant(req, res) {
  try {
    let property_manager_id = req.query.property_manager_id;
    if (property_manager_id) {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }
      let tenant_id = req.query.tenant_id;
      if (!tenant_id) {
        return res.status(400).json({ errors: 'Tenant Id Not Found' });
      }
      let tenant_info = await getTenantById(tenant_id)
      if (tenant_info.length == 0) {
        res.status(404).json({ message: 'No Tenant Found' });
      } else {
        let tenant = req.body;
        if (tenant_info[0].email == tenant.email) {
          let updated_result = await updateTenantInfo(tenant_id, tenant, property_manager_id);
          res.status(200).json({ id: updated_result });
        } else {
          let validate_email = await getUserByEmail(tenant.email);
          if (validate_email.length == 0) {
            let updated_result = await updateTenantInfo(tenant_id, tenant, property_manager_id);
            res.status(200).json({ id: updated_result });
          } else {
            res.status(200).json({ error: 'Email already exist', id: tenant_id });
          }
        }
      }
    }
    else {
      res.status(404).json({ error: 'Property Manager {property_manager_id} not found.' });
    }
  } catch (error) {
    console.error('Update tenant error');
  }
}
// update tenant function 
async function updateTenantInfo(tenant_id, tenant, property_manager_id) {
  try {
    let update_tenant = {
      id: tenant_id,
      resident_id: tenant.resident_id,
      first_name: tenant.first_name,
      middle_name: tenant.middle_name,
      last_name: tenant.last_name,
      ssn_number: tenant.ssn_number,
      address: tenant.address,
      city: tenant.city,
      state: tenant.state,
      postalcode: tenant.postalcode,
      county: tenant.county,
      country: tenant.country,
      tel_number: tenant.tel_number,
      id_number: tenant.id_number,
      id_state: tenant.id_state,
      house_size: tenant.house_size,
      race: tenant.race,
      ethnicity: tenant.ethnicity,
      date_of_birth: tenant.date_of_birth,
      relationship: tenant.relationship,
      household_relationship: tenant.household_relationship,
      disable: tenant.disable,
      move_in_date: tenant.move_in_date,
      certification_date: tenant.certification_date,
      student_status: tenant.student_status,
      email: tenant.email,
      affordable_option: tenant.affordable_option,
      property_manager_id: property_manager_id,
      unit_number: tenant.unit_number,
      identification_type: tenant.identification_type,
      role: tenant.role,
    };
    const updated_tenant = await putUser(tenant_id, update_tenant);
    if (update_tenant.id) {
      return updated_tenant.id;
    }
    else {
      console.log("update tenant info error")
    }
  } catch (error) {
    console.log(error)
  }
}

// hema - api to get a tenant details
async function getByTenantId(req, res) {
  try {
    let tenant_id = req.params.id;
    if (tenant_id) {
      const tenant = await getTenantById(tenant_id);
      if (tenant.length == 0) {
        res.status(200).json("tenant not Found");
      } else {
        res.status(200).json(tenant);
      }
    } else {
      res.status(404).json({ error: 'tenant id{$req.params.tenant_id} not found.' });
    }
  } catch (error) {
    console.error('Get a tenant By Id Error');
  }
}
// hema - api to delete tenant
async function deleteTenant(req, res) {
  try {
    let property_manager_id = req.query.property_manager_id;
    if (property_manager_id) {
      let tenant_id = req.query.tenant_id;
      if (!tenant_id) {
        return res.status(400).json({ errors: 'Tenant Id Not Found' });
      } else {
        // TODO: move this to rental_service.js
        let remove_rental = await getRentalsUsingTenantId(tenant_id)
        if (remove_rental.length > 0) {
          remove_rental.forEach(async _rental => {
            let filtered_rental = _rental.requiredQAs.findIndex(_tenant => _tenant.tenant_id === tenant_id);
            if (filtered_rental > -1) {
              _rental.requiredQAs.splice(filtered_rental, 1)
              console.log(_rental)
            }
            let remove_from_tenant_array = _rental.tenant_id.findIndex(_id => _id == tenant_id)
            if (remove_from_tenant_array > -1) {
              _rental.tenant_id.splice(remove_from_tenant_array, 1)
              console.log(_rental)
            }
            let update_rental = await putRental(_rental.id, _rental, databaseConfig)
          })
          console.log(remove_rental)
        }
        let remove_status = await removeTenant(tenant_id);
        if (remove_status == true) {
          res.status(200).json({ message: "tenant deleted successfully", id: tenant_id })
        } else {
          res.status(400).json({ error: "tenant deleted error" })
        }
      }
    } else {
      res.status(400).json({ error: "property manager id not found" })
    }
  } catch (error) {
    console.error('Tenent not found ');
  }
}

async function deleteAllTenant(req, res) {
  try {
    let property_manager_id = req.query.property_manager_id;
    if (property_manager_id) {
      let result = await clearTenant(property_manager_id);
      let all_records = await getAllTenants(property_manager_id, 'tenant');
      if (all_records.length == 0) {
        res.status(200).json({ message: 'All tenants deleted' });
      } else {
        res.status(400).json("Delete all tenanat error");
      }
    } else {
      res.status(400).json("Property manager id not found");
    }
  } catch (error) {
    console.log("Delete all tenant error")
  }
}
//API to get all shadow user
async function getAllShadowUser(req, res) {
  try {
    let property_manager_id = req.query.property_manager_id;
    if (property_manager_id) {
      let all_records = await listAllShadowUsers(property_manager_id);
      if (all_records.length == 0) {
        res.status(200).json({ message: 'No shadow user  found' });
      } else {
        res.status(200).json(all_records);
      }
    }
    else {
      res.status(404).json({ error: 'Property Manager id not found.' });
    }
  } catch (error) {
    console.error('Get all shadow user  error:');
  }
}
//Api to get all property manager
async function getAllPropertyManager(req, res) {
  try {
    let property_manager_id = req.query.property_manager_id;
    if (property_manager_id) {
      let all_records = await listAllPropertyManagers(property_manager_id);
      if (all_records.length == 0) {
        res.status(200).json({ message: 'No property manager found' });
      } else {
        res.status(200).json(all_records);
      }
    }
    else {
      res.status(404).json({ error: 'Property Manager id not found.' });
    }
  } catch (error) {
    console.error('Get all property manager error:');
  }
}
//Assign properties to shadow user
async function assignPropertiesToShadowUser(req, res) {
  try {
    let shadow_user_id = req.body.shadow_user_id;
    let properties = req.body.properties || [];
    let property_manager_ids = req.body.property_manager_id || [];
    let removed_properties = req.body.removed_properties || [];
    let currentPropertyManagerID = property_manager_ids[0];
    //fetch shadow user
    if (shadow_user_id && properties.length && property_manager_ids.length) {
      let user = await getItem(shadow_user_id);
      // if (user && user[0]) {
      //   let existingPropertyID = user[0].options.properties;
      //   let updatedPropertyIDs = [...properties];
      //   let updatedPropertyManagerIDs = [...property_manager_ids];
      //   if (existingPropertyID && existingPropertyID.length > 0) {
      //     updatedPropertyIDs = [...new Set(...existingPropertyID, ...properties)];
      //   }

      if (user && user[0]) {
        let existingPropertyID = user[0]?.options.properties;
        let updatedPropertyIDs = [...properties];
        let updatedPropertyManagerIDs = [...property_manager_ids];
        if (existingPropertyID && existingPropertyID.length > 0) {
          updatedPropertyIDs = [...new Set([...existingPropertyID, ...properties])];
        }
        if (removed_properties && removed_properties.length > 0) {
          updatedPropertyIDs = [...new Set(updatedPropertyIDs.filter(prop => !removed_properties.includes(prop)))];

        }

        let existingPropertyManagerID = user[0]?.options.users;
        updatedPropertyManagerIDs = [...property_manager_ids];
        if (existingPropertyManagerID && existingPropertyManagerID.length > 0) {
          updatedPropertyManagerIDs = [...new Set([...existingPropertyManagerID, ...property_manager_ids])];
        }

        user[0].options.properties = updatedPropertyIDs;
        user[0].options.users = updatedPropertyManagerIDs;
        let assignResponse = await updateItem(user[0]);

        //get shadow manager mail
        let shadow_manager_details = await getUserById(shadow_user_id)
        let shadow_manager_email = shadow_manager_details[0]?.email

        //get property by id
        let property_manager_details = await getUserById(currentPropertyManagerID)

        let property_manager_name = "";
        let property_manager_email = "";
        if (property_manager_details && property_manager_details[0]) {
          property_manager_name = property_manager_details[0]?.first_name + " " + property_manager_details[0]?.last_name;
          property_manager_email = property_manager_details[0]?.email;
        }

        let shadow_manager_name = shadow_manager_details[0]?.first_name + " " + shadow_manager_details[0]?.last_name;

        // notification changes - start
        let invite_notification = await sendNotification("assignPropertiesToShadowManager", { property_manager_name, shadow_manager_name })
        let property_manager_notification = await sendNotification("assignNotificationsToPropertyManager", { property_manager_name: property_manager_name, shadow_manager_name: shadow_manager_name });
        let tenant_email_notification = await sendEmailNotification(invite_notification, shadow_manager_email);
        let property_manager_email_notification = await sendEmailNotification(property_manager_notification, property_manager_email);
        let notification_response = await addNotification(property_manager_notification, invite_notification, shadow_user_id, currentPropertyManagerID)
        // notification changes - end

        if (assignResponse) {
          res.status(200).json({ status: "success" })
        }
      }
      else {
        //user not found
        res.status(400).json({ status: "user is not available" })
      }
    }
    else {
      res.status(400).json({ status: "mandatory fields not available" })
      //not enought data
    }
  } catch (error) {
    console.error('Get all shadow user  error:');
  }
}


async function deletePropertyManager(req, res) {
  try {
    let property_manager_id = req.query.property_manager_id;
    if (property_manager_id) {
      let delete_property_manager_id = req.query.delete_property_manager_id;
      if (!delete_property_manager_id) {
        return res.status(400).json({ errors: 'Property manager Id Not Found' });
      } else {
        let remove_property_manager = await getUserById(delete_property_manager_id);
        if (remove_property_manager.length > 0) {
          let remove_status = await removePropertyManager(delete_property_manager_id);
          if (remove_status == true) {
            res.status(200).json({ message: "property manger deleted successfully", id: delete_property_manager_id })
          } else {
            res.status(400).json({ error: "property manager deleted error" })
          }
        }
        else {
          res.status(400).json({ error: "property manager id not found" })
        }
      }
    }
  }
  catch (error) {
    console.error('Property manager not found ');

  }
}



module.exports = {
  getAllTenant,
  addTenant,
  updateTenant,
  getByTenantId,
  deleteTenant,
  deleteAllTenant,

  getUserByEmailId,
  onLogin,
  addPropertyManager,
  addShadowManager,

  getMultipleTenantDetails,

  getAllShadowUser,
  getAllPropertyManager,
  assignPropertiesToShadowUser,
  deletePropertyManager

}
