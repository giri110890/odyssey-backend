const { getAllQuestionnaires, getQuestionnaireById, createQuestionnaire, putQuestionnaire, removeQuestionnaire, getAllRecord } = require('../../data_store/questionnaire'); // Adjust the path as needed
const { validationResult } = require('express-validator');
const { getQaIdIfMappingExist, getQaIdIfMappingDoesnotExist } = require('../../services/questionnaire_service')
const config = require('../../../config/config')
const uuid = require('uuid');
const FormDatabaseConfig = {
  endpoint: config.endpoint,
  key: config.key,
  databaseId: config.database.id,
  containerId: config.container.forms,
};
/*  
to get all questionnaires
property_manager_id -> query
propertty_manager_id: c458f4a8-c0f1-7051-261d-09cb8b007f51
*/
// hema - to get all Questionnaire
async function getAllQuestionnaire(req, res) {
  try {
    let property_manager_id = req.query.property_manager_id;
    if (property_manager_id) {
      let all_questionnaire = await getAllQuestionnaires(property_manager_id);
      let all_form_details = await getAllRecord(property_manager_id, FormDatabaseConfig)
      all_questionnaire.forEach(questionnaire => {
        let form_found = all_form_details.find(form => form.qaId === questionnaire.id);
        if (form_found) {
          //questionnaire.qaId = all_records.qaId;
          let form_full_name = form_found.form_title;
          // Extracting the PDF name from the form_title string
          let form_name = form_full_name.substring(form_full_name.lastIndexOf('/') + 1);
          // Assigning values to questionnaire properties
          questionnaire.form_name = form_name;
        }
      });
      res.status(200).json(all_questionnaire);
      //return filtered_result;
    }
    else {
      res.status(404).json({ error: 'Property Manager id not found.' });
    }
  } catch (error) {
    console.error('Get all Quentionnaire error:');
  }
}
/*
output of above program:
[
    {
        "id": "4f47e74f-0cd5-4956-a22b-a5bd934b2ac8",
        "title": "My Property related questions",
        "questions": [
            {
                "text": "<p>What is your education?</p>",
                "answer_type": "number",
                "code": "property_name",
                "id": "32b31911-dd54-44b7-99e6-50d8395967c2",
                "description": "<p>Tell us your major</p>"
            },.....
          ]
        "property_manager_id": "1d3093a5-cea7-4811-8c0b-9977e4998b51",
        "_rid": "vz0iAP2Epxt5BAAAAAAAAA==",
        "_self": "dbs/vz0iAA==/colls/vz0iAP2Epxs=/docs/vz0iAP2Epxt5BAAAAAAAAA==/",
        "_etag": "\"e0038ecb-0000-0100-0000-658c6aa40000\"",
        "_attachments": "attachments/",
        "_ts": 1703701156,
        "form_name": "Resident Notification Letter.pdf"
    },
*/



/*
to get a questionnaire details by id
questionnaire_id -> in params
questionnaire/5129c88-9dbe-4a81-8863-94cc960d44b6
*/
// hema - api to get a questionnaire details
async function getByQuestionnaireId(req, res) {
  try {
    let questionnaire_id = req.params.id;
    if (questionnaire_id) {
      const questionnaire = await getQuestionnaireById(questionnaire_id);
      if (questionnaire.length == 0) {
        res.status(400).json("Questionnaire not Found");
      }
      res.status(200).json(questionnaire);
    } else {
      res.status(404).json({ error: 'Questionnaire id{$req.params.questionnaire_id} not found.' });
    }
  } catch (error) {
    console.error('Get a Question By Id Error');
  }
}



/*
to create a questionnaire
property_manager_id -> query
questionnaire details -> in body
 {
        "title": "income 1",
        "questions": [
            {
                "text": "<p>what is your income</p>",
                "answer_type": "number",
                "code": "INCOME",
                "id": "1234567890",
                "description": "<p>enter your income</p>",
                "options": [
                    {
                        "label":"yse",
                        "value":"true",
                        "target":"54356246752463457",
                        "type":"radio"
                    }
                ]
            },
            {
                "text": "<p>what is your name</p>",
                "answer_type": "text_short",
                "code": "NAME",
                "id": "098766554321",
                "description": "<p>what is your name</p>",
                "options": [
                        {
                        "label":"no",
                        "value":"false",
                        "target":"869838hdiu34y986",
                        "type":"multi_select"
                    }
                ]
            }
        ]
 }
*/
// hema- api to create a Questionnaire
async function addQuestionnaire(req, res) {
  try {
    let property_manager_id = req.query.property_manager_id;
    if (property_manager_id) {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      let questionnaire = req.body;
      questionnaire.property_manager_id = property_manager_id;
      let result = await createQuestionnaire(questionnaire);
      res.status(200).json({ id: result.id, property_manager_id: property_manager_id });
      // console.log("add Questionnaire: " + result.id);
    } else {
      res.status(404).json({ error: 'Property Manager id not found.' });
    }
  } catch (error) {
    console.error('Add Questionnaire Error');
  }
}

// api to initialize questionnaire for form mapping (ie to create dummy questionnaire)
/*
using form name get the form details
in form details 
        if(qa id available return the qa id)
        else (if form details availabel but no qa id available  or in no form details availablez, create questionnaire and associate it )
  // form_id -> mapped form
if(form_id){
  if(form_id.qaId){
    //return qa id
  }else {
    //create qa
    //associate
  }
}else{
  //empty mapping
  //create questionnaire
  //associate
}
        */
async function initializeQuestionnaireForFormMapping(req, res) {
  try {
    let property_manager_id = req.query.property_manager_id;
    let formName = req.body.form_name;
    if (property_manager_id) {
      let questionnaire = {
        title: uuid.v4(),
        questions: [],
        property_manager_id: property_manager_id
      }
      let all_form = await getAllRecord(property_manager_id, FormDatabaseConfig);
      let form_id = all_form.filter(_form => _form.form_title == formName); // mapped form
      if (form_id.length > 0) {
        let qa_id = await getQaIdIfMappingExist(formName, property_manager_id, questionnaire)

        res.status(200).json({ message: `Questionnaire already linked  with ${formName}`, questionnaire_id: qa_id });
      } else {
        let questionnaire_id = await getQaIdIfMappingDoesnotExist(formName, property_manager_id, questionnaire)

        res.status(200).json({ message: `Questionnaire linked successfully ${formName}`, questionnaire_id: questionnaire_id });
      }
    } else {
      res.status(400).json({ error: "Property manager id not found" })
    }

  } catch (error) {
    console.log(error)
  }
}

// hema - api to update a questionnaire
async function updateQuestionnaire(req, res) {
  try {

    let property_manager_id = req.query.property_manager_id;
    if (property_manager_id) {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }
      let question_id = req.query.question_id;
      if (!question_id) {
        return res.status(400).json({ errors: 'question Id Not Found' });
      }
      let questionnaire = req.body;
      let update_questionnaire = {
        id: question_id,
        title: questionnaire.title,
        questions: questionnaire.questions,
        property_manager_id: property_manager_id,
      };

      const question = await putQuestionnaire(question_id, update_questionnaire);
      res.status(200).json(question.id);
    }
    else {
      res.status(404).json({ error: 'Property Manager {property_manager_id} not found.' });
    }
  } catch (error) {
    console.error('Update Property error');
  }
}

/*
to delete a questionnaire
property_manager_id  and questionnaire_id -> in query
property_manager_id:c458f4a8-c0f1-7051-261d-09cb8b007f51
questionnaire_id:5129c88-9dbe-4a81-8863-94cc960d44b6
*/
// hema - api to delete questionnaire
async function deleteQuestionnaire(req, res) {
  try {
    let property_manager_id = req.query.property_manager_id;
    let questionnaire_id = req.query.questionnaire_id;
    if (!questionnaire_id) {
      return res.status(400).json({ errors: 'questionnaire Id Not Found' });
    }
    let delete_question_id = await getQuestionnaireById(questionnaire_id);
    if (property_manager_id == delete_question_id[0].property_manager_id) {
      const result = await removeQuestionnaire(questionnaire_id);
      res.status(200).json("Questionnaire deleted");
    } else {
      res.status(404).json({ error: 'Property Manager id is not same.' });
    }
  } catch (error) {
    console.error('Questionnaire not found in');
  }
}

// hema - api to mark a questionnaire as favorite and unfavourite
async function setFavorite(req, res) {
  try {
    let property_manager_id = req.body.property_manager_id;
    if (property_manager_id) {
      let questionnaire_id = req.body.questionnaire_id;
      if (!questionnaire_id) {
        return res.status(400).json({ errors: 'questionnaire Id Not Found' });
      }
      let question = await getQuestionnaireById(questionnaire_id);
      if (question && question.length > 0) {
        question[0].isFavorite = !question[0].isFavorite;
        const updated_item = await putQuestionnaire(questionnaire_id, question[0]);
        res.json(updated_item.id);
      }
      else {
        res.status(404).json({ error: 'Questionnaire Id {questionnaire_id} not found in database.' });
      }
    } else {
      res.status(404).json({ error: 'Property Manager {property_manager_id} not found.' });
    }
  } catch (error) {
    console.error('Favorite error');
  }
}
module.exports = {
  getAllQuestionnaire,
  getByQuestionnaireId,
  addQuestionnaire,
  updateQuestionnaire,
  deleteQuestionnaire,
  setFavorite,
  initializeQuestionnaireForFormMapping,
}