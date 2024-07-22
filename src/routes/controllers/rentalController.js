const { getAllRentals, getRentalById, putRental, getRentalsUsingTenantId, getRentalsUsingUnitId } = require('../../data_store/rentals');
const { assignTenantToUnit_Impl } = require('../../services/rental_service');
const { getPropertyById } = require('../../data_store/data_store_azure_cosmos')

const { getMultipleTenantById, getTenantById } = require('../../data_store/users')
const { sendEmailNotification, addNotification, sendNotification } = require('../controllers/notificationController')
const { CertificationStatus, FormStatus } = require('../../enum/status');
const { removeAlreadyAnsweredQuestions, partiallyAnswered } = require('../../services/rental_service')
const config = require('../../../config/config');
const { getNextQuestion, getNextUnansweredQuestionInCurrentFlow, updateTenantAnswers } = require('../../services/answer_service');
const { getAllRecord } = require('../../data_store/mapping');
const { getQuestionnaireById } = require('../../data_store/questionnaire');
const { putUser } = require('../../data_store/users')

const FormDatabaseConfig = {
  endpoint: config.endpoint,
  key: config.key,
  databaseId: config.database.id,
  containerId: config.container.forms,
};
const RentalsDatabaseConfig = {
  endpoint: config.endpoint,
  key: config.key,
  databaseId: config.database.id,
  containerId: config.container.rentals,
};

/*
 to get all rental details 
 property_id ->in params
 all_rentals/b6984028-99f3-41e4-9249-a613d3b3c9be
*/
//hema - api to get all rental details
async function getAllRental(req, res) {
  try {
    let property_id = req.params.property_id;
    if (!property_id) {
      return res.status(400).json({ error: 'property  id not found' });
    }
    let result = await getAllRentals(property_id);
    res.status(200).json(result);
  } catch (error) {
    console.error('Add rental Error');
  }
}
// hema api to get all tenants under rental tabel
async function getRentalsByTenantId(req, res) {
  try {
    let {tenant_id} = req?.query;
    if (!tenant_id) {
      return res.status(400).json({ error: 'tenant_id not found' });
    }
    let result = await getRentalsUsingTenantId(tenant_id);
    res.status(200).json(result);
    return(result);
  } catch (error) {
    console.error('Get rental by tenant id errorr');
  }
}
// hema api to get all tenants under rental tabel
async function getRentalsByUnitId(req, res) {
  try {
    let unit_id = req.query.unit_id;
    if (!unit_id) {
      return res.status(400).json({ error: 'unit_id not found' });
    }
    let result = await getRentalsUsingUnitId(unit_id);
    res.status(200).json(result);
  } catch (error) {
    console.error('Get rental by unit id error Error');
  }
}
// get rental details by rental id
async function getRentalDetails(req, res) {
  try {
    let rental_id = req.query.rental_id;
    if (!rental_id) {
      return res.status(400).json({ error: 'rental_id   not found' });
    }
    let result = await getRentalById(rental_id);
    let updatedRequiredQAs = await Promise.all(result[0].requiredQAs.map(async _tenant => {
      let updatedForms = await Promise.all(_tenant.requiredForms.map(async _form => {
        let questionnaire = await getQuestionnaireById(_form.formID);
        if (questionnaire.length > 0) {
          return {
            qaid: questionnaire[0].id,
            qaTitle: questionnaire[0].title,
            ..._form
          };
        } else {
          console.log(questionnaire);
          return _form; // Return something to maintain the array structure
        }
      }));
      return {
        ..._tenant,
        requiredForms: updatedForms
      };
    }));
    result[0].requiredQAs = updatedRequiredQAs;
    res.status(200).json(result);

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
}


let getRentalQuestionnaireSemaphore = false; // Semaphore to control access to getRentalQuestionnaire

async function getRentalQuestionnaire(req, res) {
  try {
    // Check if the semaphore is not acquired by another execution
    if (!getRentalQuestionnaireSemaphore) {
      // Acquire the semaphore
      // getRentalQuestionnaireSemaphore = true;

      // fetch rental record
      // fetch the questionnaires from the rental record
      // get the questionnaire ids and pull them from questionnaire table.
      // merge the questionnaires and send in response.
      let result = null;
      let rental_id = req.params.rental_id;
      let tenant_id = req.query.tenant_id;
      let questionnaire_id = req.query.questionnaire_id;
      console.log("fetching questions for questionnaire id:" + questionnaire_id);
      let _nextQuestion = null;
      if (!rental_id) {
        return res.status(400).json({ error: 'rental_id not found' });
      }
      let filtered_result;
      let details = await getRentalById(rental_id);
      if (details && details.length > 0) {
        if (details[0]?.requiredQAs && details[0]?.requiredQAs.length > 0) {
          let tenantQuestionnaire = details[0]?.requiredQAs.find(_qa => _qa.tenant_id == tenant_id)
          let questionnaire = tenantQuestionnaire?.requiredForms?.find(_qa => _qa.formID == questionnaire_id);
          if (questionnaire) {
            result = await getQuestionnaireById(questionnaire.formID);
          }

          if (result && result[0].questions && result[0].questions.length > 0) {
            let _currentQuestionnaireID = result[0]?.id;
            let _rootQuestion = result[0]?.questions.find(_question => _question.question_id == "root");

            let isResumeFlow = false; // await partiallyAnswered(tenant_id, result, _currentQuestionnaireID, rental_id);

            if (isResumeFlow?.status) {
              let _nxtQues = await getNextUnansweredQuestionInCurrentFlow(questionnaire_id, question_id = _rootQuestion.id, tenant_id, rental_id)
              console.log(_nxtQues)
              _nextQuestion = { questionnaire_id: _nxtQues.questionnaire_id, question_id: _nxtQues.question_id };
            }
            else if (_rootQuestion) {
              let _currentQuestionID = _rootQuestion.id;
              _nextQuestion = { questionnaire_id: _currentQuestionnaireID, question_id: _currentQuestionID };
            }
          }

          res.status(200).json({ qaSet: result, nextQA: _nextQuestion });
        } else {
          res.status(400).json("Questionnaire details are missing");
        }
      } else {
        res.status(400).json("Rental Details are empty");
      }

      // Release the semaphore after processing
      getRentalQuestionnaireSemaphore = false;
    } else {
      //If another execution is in progress, wait and retry
      await new Promise(resolve => setTimeout(resolve, 100)); // Wait for a short duration
      return await getRentalQuestionnaire(req, res); // Retry
    }
  } catch (error) {
    console.error('Error occurred:', error);
    res.status(500).json({ error: 'An error occurred' });

    // Release the semaphore in case of error
    getRentalQuestionnaireSemaphore = false;
  }
}

/*
This function is used to populate the required forms to be shown to the tenant for action.
isCreateTaskFlow is a param, questionnaire without a form, so once the questionnaire is created and answered, it flows directly to completed state.
*/
async function getRequiredQAForForms(forms, existingFormsForTenant, property_manager_id, isCreateTaskFlow) {
  let required_forms = existingFormsForTenant ? [...existingFormsForTenant] : [];
  await Promise.all(forms.map(async _require_form => {
    const existingFormIndex = required_forms.findIndex(existingForm => existingForm.formID === _require_form.qaId);
    let custom_field = [];
    // get mappings by qa id
    let all_form = await getAllRecord(property_manager_id, FormDatabaseConfig);
    let mappings = all_form.filter(form => form.qaId === _require_form.qaId);
    if (isCreateTaskFlow) {
      //to read from question id
      mappings = [{ fields: [{ field_type: "STUDENT", question_code: "RP_UPLOAD" }] }];
    }
    console.log(mappings)
    // loop mappings, get type and select status
    if (Array.isArray(mappings) && mappings.length > 0) {
      custom_field = mappings[0].fields.filter(_field => _field.field_type == "custom_field"),
        standard_field = mappings[0].fields.filter(_field => _field.field_type == "STUDENT" ||
          _field.field_type == "ASSET" ||
          _field.field_type == "INCOME" ||
          _field.field_type == "ODYSSEY")
      const fieldsToRemove = ["PR_NAME", "MAIL_ADDRESS", "PH_NUMBER", "FAX_NUMBER", "MAIN_EMAIL", "IN_EMAIL"];
      standard_field = standard_field.filter(field => !fieldsToRemove.includes(field.question_code));
    }
    if (existingFormIndex < 0) {
      let newForm = null;
      if (_require_form.qaId && (custom_field.length > 0 || standard_field.length > 0)) {
        newForm = { formID: _require_form.qaId, title: _require_form.name, status: "new", isTask: isCreateTaskFlow };
      } else {
        newForm = { formID: _require_form.qaId, title: _require_form.name, status: "pending", isTask: isCreateTaskFlow };
      }
      if (newForm) {
        required_forms.push(newForm);
      }
    } else {
      if (custom_field.length > 0 || standard_field.length > 0) {
        required_forms[existingFormIndex].status = "new";
      } else {
        required_forms[existingFormIndex].status = "pending";
      }
    }

  }));
  return required_forms;
}



async function updateRequiredQAsetForTenantIDs(requiredForms, requiredTenants, allTenants, qaSet = [], property_manager_id, isCreateTaskFlow) {
  try {
    let requiredQAs = qaSet;

    await Promise.all(requiredTenants.map(async _requiredTenant => {
      if (allTenants.includes(_requiredTenant)) {
        const _existingFormsRequiredForTenant = qaSet.find(_item => _item.tenant_id === _requiredTenant) || { requiredForms: [] };
        const existingFormsForTenant = _existingFormsRequiredForTenant.requiredForms || [];

        const requiredFormIDs = await getRequiredQAForForms(requiredForms, existingFormsForTenant, property_manager_id, isCreateTaskFlow);
        const _qaSetItem = {
          requiredForms: requiredFormIDs,
          tenant_id: _requiredTenant
        };
        let existingItemIndex = requiredQAs.findIndex(_qaItem => _qaItem.tenant_id === _qaSetItem.tenant_id);

        if (existingItemIndex !== -1) {
          // If the existing item is found, remove it from the array
          requiredQAs.splice(existingItemIndex, 1);
        }

        // Push the new item into the array
        requiredQAs.push(_qaSetItem);
      }
    }));

    return requiredQAs;
  } catch (ex) {
    console.error('An error occurred:', ex);
    return [];
  }
}


// hema api to send client form and notification
/*
rental_id -> in query
tenant_id and requiredQa -> body
get rental by rental id , get required forms by id, update the rental and store in db, get tenant array details from tenant db
and finally send email and notification to both tenant and property_manager.
*/
async function sendClientForm(req, res) {
  try {
    let rental_id = req.query.rental_id;
    let unit_id = req.query.unit_id;
    let required_forms = req.body.required_forms;
    let isCreateTaskFlow = req.body.createTaskFlow;
    let tenant_ids_to_send = req.body.tenant_ids; //[]

    if (!rental_id) {
      return res.status(400).json({ error: 'rental_id   not found' });
    }
    let redirectUrl = "";

    await Promise.all(tenant_ids_to_send.map(async _tenantID => {
      let all_rental_info = await getRentalsUsingTenantId(_tenantID);
      let selectedRental = all_rental_info?.find(_rental => _rental.unit_id == unit_id);
      let rental_info = [selectedRental];
      let property_id = rental_info[0]?.property_id;
      let property_info = await getPropertyById(property_id)
      let property_manager_id = property_info[0]?.property_manager_id;
      if(  rental_info[0]) {
      rental_info[0].certification_status = CertificationStatus.Started;
      rental_info[0].requiredQAs = await updateRequiredQAsetForTenantIDs(req.body.required_forms, tenant_ids_to_send, rental_info[0].tenant_id, rental_info[0].requiredQAs, property_manager_id, isCreateTaskFlow);
      let result = await putRental(rental_id, rental_info[0], RentalsDatabaseConfig);
      }
      let tenants = await getTenantById(_tenantID);
      if (tenants.length) {

        //Moved notification specific variables here
        let rental_info = await getRentalById(rental_id);
        let property_manager_details = await getTenantById(property_manager_id);
        let property_manager_email = property_manager_details[0]?.email;
        let unit_id = rental_info[0]?.unit_id;
        let unit_details = property_info[0]?.units.filter(_units => _units.id == unit_id)
        let unit_name ="";
        let property_name = "";
        if(unit_details && unit_details[0]){
         unit_name = unit_details[0]?.unit_id;
         property_name = property_info[0]?.name;
        }
        //End
        await Promise.all(tenants.map(async _tenant => {
          let property_manager_notification = await sendNotification("propertyManager", { property_id, unit_name, tenant_name: _tenant.first_name })
          let tenant_notification = await sendNotification("tenant", { property_name });
          let tenant_email_notification = await sendEmailNotification(tenant_notification, _tenant.email)
          let property_manager_email_notification = await sendEmailNotification(property_manager_notification, property_manager_email)
          let notification_response = await addNotification(property_manager_notification, tenant_notification, _tenant.id, _tenant.property_manager_id)
          return notification_response;
        }))
      }
    }));
    res.status(200).json({ redirectUrl: redirectUrl, notification: "Email sent to client" });
  } catch (error) {
    console.error('Error occurred:', error);
    res.status(500).json({ error: 'An error occurred' });
  }
}


//hema - api to assign a tenant to the property
async function assignTenant(req, res) {
  try {

    if (!req.body?.tenant_id) {
      return res.status(400).json("No tenant_id provided");
    }
    if (!req.body?.property_id) {
      return res.status(400).json("No property_id provided");
    }
    if (!req.body?.unit_id) {
      return res.status(400).json("No unit_id provided");
    }
    let rentalInfo = {
      property_id: req.body?.property_id,
      unit_id: req.body?.unit_id,
      unit_number: req.body?.unit_number,
      tenant_id: [req.body?.tenant_id],   // Deprecate.
      tenantId: req.body?.tenant_id,
      move_in_date: req.body?.move_in_date,
      move_out_date: req.body?.move_out_date,
      certification_date: req.body?.certification_date,
    }
    let status = await assignTenantToUnit_Impl(rentalInfo);
    let tenant_info = await getTenantById(req.body.tenant_id);
    let property_info = await getPropertyById(req.body.property_id);

    let allRentals = await getRentalsUsingUnitId(req.body.unit_id);
    let allTenants = allRentals.map(_rental => _rental.tenantId);
    let all_tenant_details = await getMultipleTenantById(allTenants);
    let headOfHouseholdRecords = all_tenant_details.filter(tenant_details => tenant_details.relationship.value === "head_of_household");
    let updated_tenant = { ...tenant_info[0], address: property_info[0]?.address, city: property_info[0]?.city, state: property_info[0]?.state, county: property_info[0]?.county, postalcode: property_info[0]?.postalcode, country: property_info[0]?.country?.label, house_size: headOfHouseholdRecords[0].house_size }
    const update_tenant = await putUser(req.body.tenant_id, updated_tenant);
    switch (status) {
      case "NewRental":
        res.status(200).json({ status: "success" });

        // Ensure that the tenant and property answers are updated with the property and unit info.
        let result = await updateTenantAnswers(rentalInfo.tenant_id, rentalInfo.property_id);

        break;
      case "AlreadyAssigned":
        res.status(200).json({ status: "AlreadyAssigned" });
        break;
      case "Error":
        res.status(500).json({ error: "Internal server error" });
        break;
      default:
        res.status(500).json({ error: "Unknown server error" });
        break;
    }
  }
  catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }

}


// DUPLICATE OF assignTenant??? No, but similar. This is used by bulk import.
// assign tenant function
//  If rental already contains tenant, do not change anything - for safety and simplicity.
//  Otherwise, put tenant into the current rental for that unit, and populate tenant answers
//  to property and tenant questions.
async function assignTenantIntoUnit(rentalInfo) {
  try {

    let status = await assignTenantToUnit_Impl(rentalInfo);

    switch (status) {
      case "NewRental":

        // Ensure that the tenant and property answers are updated with the property and unit info.
        let result = await updateTenantAnswers(rentalInfo.tenantId, rentalInfo.property_id);

        break;
      default:
        break;
    }
    return status;

  } catch (error) {
    console.log("Assign tenant into unit error")
  }
}


module.exports = {
  assignTenant,
  assignTenantIntoUnit,
  getAllRental,
  getRentalDetails,
  getRentalQuestionnaire,
  sendClientForm,
  getRentalsByTenantId,
  getRentalsByUnitId,
  updateRequiredQAsetForTenantIDs

}