const { createQuestionnaire, getAllRecord, getQuestionnaireById } = require('../data_store/questionnaire');
const { associateQuestionnaireWithFormName, addEmptyMapping } = require('../routes/controllers/mappingController')
const config = require('../../config/config')
const FormDatabaseConfig = {
  endpoint: config.endpoint,
  key: config.key,
  databaseId: config.database.id,
  containerId: config.container.forms,
};
// initialize questionnaire with mapping
let getQaIdSemaphore = false; // Semaphore to control access to getQaIdIfMappingExist

async function getQaIdIfMappingExist(formName, property_manager_id, questionnaire) {
  try {
    // Check if the semaphore is not acquired by another execution
    if (!getQaIdSemaphore) {
      // Acquire the semaphore
      getQaIdSemaphore = true;

      let all_form = await getAllRecord(property_manager_id, FormDatabaseConfig);
      let form_id = all_form.filter(_form => _form.form_title == formName); // mapped form
      // double check
      if (form_id[0].qaId) {
        let questionnaire_id = form_id[0].qaId; // qa is exist
        let question_details = await getQuestionnaireById(questionnaire_id);
        if (Array.isArray(question_details) && question_details.length > 0) {
          // Release the semaphore before returning
          getQaIdSemaphore = false;
          return question_details[0].id; // if exist return qa id
        }
      }
      // If QA ID doesn't exist or the associated QA is not found, create and associate a new QA ID
      let qa_id = await createAndAssociateQuestionnaire(formName, property_manager_id, questionnaire);

      // Release the semaphore before returning
      getQaIdSemaphore = false;
      return qa_id;
    } else {
      // If another execution is in progress, wait and retry
      await new Promise(resolve => setTimeout(resolve, 100)); // Wait for a short duration
      return await getQaIdIfMappingExist(formName, property_manager_id, questionnaire); // Retry
    }
  } catch (error) {
    console.log(error);
    throw error; // Propagate the error for proper error handling
  }
}

// create and associate questionnaire
async function createAndAssociateQuestionnaire(formName, property_manager_id, questionnaire) {
  try {
    //create
    let result = await createQuestionnaire(questionnaire); // create dummy questionnaire
    if (result && result.id) {
      // call associateFormAndQuestionnaire
      // using questionnaire id (ie result id ) and cosmos generated form id (form_id)
      let linkWithForm = await associateQuestionnaireWithFormName(property_manager_id, result.id, formName)
      if (linkWithForm.id) {
        return result.id;
      } else {
        console.log({ error: "Error in linking questionnaire" })
      }
    } else {
      console.log({ error: "Error in creating questionnaire" })
    }
  } catch (error) {
    console.log(error)
  }
}
// initialize questionnaire without mapping
async function getQaIdIfMappingDoesnotExist(formName, property_manager_id, questionnaire) {
  try {
    let all_form = await getAllRecord(property_manager_id, FormDatabaseConfig);
    let form_id = all_form.filter(_form => _form.form_title == formName); // mapped form
    //double check
    if (form_id.length == 0) {
      let addInitialMapping = await addEmptyMapping(formName, property_manager_id);
      if (addInitialMapping) {
        let qa_id = await createAndAssociateQuestionnaire(formName, property_manager_id, questionnaire)
        return qa_id
      } else {
        console.log({ error: "Error in creating innitial mapping" })
      }
    } else {
      let qa_id = await getQaIdIfMappingExist(formName, property_manager_id, questionnaire)
      return qa_id;
    }

  } catch (error) {
    console.log(error)
  }
}

module.exports = {
  getQaIdIfMappingDoesnotExist,
  getQaIdIfMappingExist
}