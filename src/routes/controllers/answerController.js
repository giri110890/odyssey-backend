
const { storeAnswer, getAnswer, getAnswerByTenantID, updateAnswerByTenant } = require('./../../data_store/answers');
const { FormStatus } = require('../../enum/status');
const { getRentalById, putRental, getRentalsUsingTenantId } = require('../../data_store/rentals')
const { validationResult } = require('express-validator');
const { validateItem } = require('../../validations/answerValidator');
const { getQuestionnaireById, getQuestionDetails } = require('../../data_store/questionnaire')
const config = require('../../../config/config')
const { updateRequiredQAsetForTenantIDs } = require('../controllers/rentalController');
const { getPropertyById } = require('../../data_store/data_store_azure_cosmos');
const { getFormDetailsUsingQAId } = require('../controllers/mappingController');
const { update } = require('./propertyController');
const { getNextQuestion, syncTenantAndPropertyInfo } = require('../../services/answer_service');
const { sendNotification, sendEmailNotification, addNotification, } = require('./notificationController');
const { getTenantById } = require('../../data_store/users')
const { CertificationStatus } = require('../../enum/status')
const { createMessage } = require('../../data_store/notification')
const databaseConfig = {
  endpoint: config.endpoint,
  key: config.key,
  databaseId: config.database.id,
  containerId: config.container.rentals,
};

// check if flow end
async function isFlowCompletelyAnswered(questionnaire_id, question_id, tenant_id, rental_id) {
  try {
    let _questionnaireID = questionnaire_id;
    let _questionID = question_id;
    let _questionTarget = { questionnaire_id: _questionnaireID, question_id: _questionID };


    let tenant_answer = await getAnswerByTenantID(tenant_id);
    let answers = tenant_answer[0].answer;
    do {
      if (_questionTarget.question_id != null || _questionTarget.question_id != undefined) {
        let next_question_details = await getQuestionDeatilsUsingQuest(_questionTarget.questionnaire_id, _questionTarget.question_id, answers, tenant_id, rental_id);
        if (next_question_details.question_id != null) {
          question_id = next_question_details.question_id
          questionnaire_id = next_question_details.questionnaire_id
        }
        else {
          question_id = _questionTarget.question_id;
          questionnaire_id = _questionTarget.questionnaire_id
        }
      }
      next_question_target = await getQuestionDeatilsUsingQuest(questionnaire_id, question_id, answers, tenant_id, rental_id)
    } while (next_question_target.question_id != null && next_question_target != "EOF")
    // } while (next_question_target != null && != "EOF")
    if (next_question_target == "EOF") {
      return null
    }
    return { question_id: question_id, questionnaire_id: questionnaire_id }
  } catch (error) {
    console.log(error)
  }
}
// async function to gext next target
async function getQuestionDeatilsUsingQuest(questionnaire_id, next_question_target, answer, tenant_id, rental_id) {
  try {
    let all_question_details = await getQuestionnaireById(questionnaire_id);
    let question_details = all_question_details[0].questions.filter(_question => _question.id == next_question_target)

    if (Array.isArray(question_details) && question_details.length > 0) {
      let next_question_id = await getTargetByanswerType(questionnaire_id, question_details[0], answer, tenant_id, rental_id)
      return next_question_id
    } else {
      console.log("NO question found in this id")
    }
  } catch (error) {
    console.log(error)
  }
}

// hema - api to add answer
async function addAnswer(req, res) {
  try {
    let _currentQuestionnaireID = req.query.questionnaire_id;
    let _currentQuestionID = req.query.question_id;
    let _rentalID = req.query.rental_id;
    let _tenantID = req.query.tenant_id;
    if (!_tenantID) {
      return res.status(400).json({ errors: 'tenant_id  Not Found' });
    }
    if (_tenantID) {
      let _newAnswer = req.body;
      _newAnswer.tenant_id = _tenantID;
      // store tenant answer 
      await storeTenantAnswer(_newAnswer, _tenantID)
      let rental_details = await getRentalById(_rentalID);
      await runSpecialInstructions(rental_details, _tenantID, databaseConfig);
      //get next question id and questionnaire id for UI
      // TODO: remove tenant and rental parameters. They are not needed.
      // TODO: add the answer value from the previous question to the parameters.
      let _nextQuestion = await getNextQuestion(_currentQuestionnaireID, _currentQuestionID, _tenantID, _rentalID);
      if (_nextQuestion == 'EOF') {
        // mail
        // notification
        let property_id = rental_details[0].property_id;
        let unit_id = rental_details[0].unit_id;
        let property_details = await getPropertyById(property_id);
        let unit_details = property_details[0].units.filter(_unit => _unit.id == unit_id)
        let unit_name = unit_details[0].unit_id
        let tenant_details = await getTenantById(_tenantID);
        let tenant_name = tenant_details[0]?.first_name + " " + tenant_details[0]?.last_name;
        let property_manager_id = tenant_details[0].property_manager_id
        let property_manager_details = await getTenantById(property_manager_id)
        let property_manager_email = property_manager_details[0].email

        let property_manager_notification = await sendNotification("propertyManagerAfterAnswered", { property_id, unit_name, tenant_name,_tenantID,unit_id })
        let tenant_notification = await sendNotification("tenantAfterAnswered", { unit_name, tenant_name });
        let tenant_email_notification = await sendEmailNotification(tenant_notification, tenant_details[0].email)
        let property_manager_email_notification = await sendEmailNotification(property_manager_notification, property_manager_email)
        let notification_response = await addNotification(property_manager_notification, tenant_notification, _tenantID, property_manager_id)
        _nextQuestion = { question_id: null, questionnaire_id: null }

      }
      res.status(200).json({ question_id: _nextQuestion.question_id, questionnaire_id: _nextQuestion.questionnaire_id });
    }
    else {
      console.log('tenant Id not found');
      res.status(200).json("Tenant id not found");
    }
  } catch (error) {
    console.error('update rental and submit answer Error');
  }
}


/*getNextQuestion(){
    if(flowCompletelyAnswered)
    // Pick next questionnaire and take the start marked question

    else {
    // return the new target
    }
}*/

// function to invoke special instructions
async function runSpecialInstructions(rental_details, tenant_id, databaseConfig) {
  try {
    let property_details = await getPropertyById(rental_details[0].property_id)
    if (property_details[0].special_instructions) {   //IF PROPERTY HAS SPECIAL INSTRUCTIONS 
      //invoke special instructions function 
      let tenant_answer = await getAnswerByTenantID(tenant_id);
      let special_instruction = await getSpecialRules(rental_details[0], tenant_answer, tenant_id)

      // update tenant's required QA with computed required QA's 
      let all_tenants = rental_details[0].tenant_id
      rental_details[0].requiredQAs = special_instruction.requireQAs;
      rental_details[0].requireProofs = special_instruction.requireProofs;
    }
    // update rental
    let updated_result = await putRental(rental_details[0].id, rental_details[0], databaseConfig)
    if (updated_result.id) {
      return updated_result.id
    } else {
      console.log("Error in updating rentals")
    }
  } catch (error) {
    console.log(error)
  }
}
// store tenant answer (merge old and new answer)
async function storeTenantAnswer(new_answer, tenant_id,) {
  try {
    let answer = await getAnswerByTenantID(tenant_id);
    if (answer.length == 0) { // if answer is empty , just store answer
      let result = await storeAnswer(new_answer);
      if (result.id) {
        return result.id
      } else {
        console.log("Storing new tenant answer error")
      }
    } else {
      let old_answer = answer[0].answer;
      let updated_answer = new_answer.answer
      // Merge two objects into a single Set
      let all_answers = Object.assign({}, old_answer, updated_answer);
      answer[0].answer = all_answers
      let updated_result = await updateAnswerByTenant(answer[0].id, answer[0]); // UPDATE ANSWER
      if (updated_result.id) {
        return updated_result.id
      } else {
        console.log("Updating answer error")
      }
    }
  } catch (error) {
    console.log(error)
  }
}
// is flow end 
async function isFlowEnd(questionnaire_id) {
  try {
    let questionnaire_details = await getQuestionnaireById(questionnaire_id);
    if (Array.isArray(questionnaire_details) && questionnaire_details.length > 0) {
      if (questionnaire_details[0].questions && questionnaire_details[0].questions.length > 0) {
        // from this questions filter the question whose source equals to null
        let next_source = questionnaire_details[0].questions.filter(_question => _question.source == null)

        let next_question_id = next_source[0].id;
        return { question_id: next_question_id, questionnaire_id: questionnaire_id };
      } else {
        console.log("Questionnaire has no questions / question id")
      }
    } else {
      console.log("questionnaire is empty")
    }

  } catch {
    console.log(error)
  }
}
/*
SAMPLE SPECIAL INSTRUCTIONS:
  "special_instructions": [
            {
                "form_name": {
                    "label": "SALARY.pdf",
                    "value": "74fca442-64c4-4960-abc0-df213d5b36d1"
                },
                "form_field": {
                    "label": "income",
                    "value": "INCOME"
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
                        "option": "INCOME_TAX.pdf",
                        "id": "0c8bcb06-4309-4e1d-9660-db94c2b1b718"
                    }
                ]
            },
        ],
*/
//  api to get addition qs
async function getAdditionalQa(qaIds, rental, tenant_id) {
  try {
    let rental_details = rental;

    let addition_QA = qaIds.map(_form => ({ qaId: _form.id, status: "pending", name: _form.option }))
    // update tenant's required QA with computed required QA's 
    let all_tenants = rental_details.tenant_id
    let _form_list = await updateRequiredQAsetForTenantIDs(addition_QA, [tenant_id], all_tenants, rental_details.requiredQAs);
    return { requireQAs: _form_list }
  } catch (error) {
    console.error('getAdditionalQa error');
  }
}
// get Special instruction and answer
async function getSpecialRules(rental, answer, tenant_id) {
  try {
    let property_id = rental.property_id;
    let rules = [];
    let property_details = await getPropertyById(property_id);
    if (property_details && property_details.length > 0) {
      let special_instructions = property_details[0].special_instructions;// FROM PROPERTY DETAILS SEND SPECIAL INSTRUCTION AND ANSWER TO GET RULES
      rules = await getTriggerAction(special_instructions, answer[0].answer, rental, tenant_id)

    } else {
      console.log({ error: "Property details not found" })
    }
    return { requireQAs: rules[0].requireQAs, requireProofs: rules[0].requireProofs }
  } catch (error) {
    console.log(error)
  }
}
// special instruction match with answer and trigger action
async function getTriggerAction(special_instructions, answers, rental, tenant_id) {
  try {
    let result = [];
    let myValue = await Promise.all(Object.keys(answers).map(async _answer => {
      let similar_formName = special_instructions.filter(_instruction => _instruction.form_field.value.toLowerCase() == _answer.toLowerCase())

      let stValue = await similar_formName.map(async _instruction => {
        let trigger = null;
        switch (_instruction.field_operator.value) {
          case "equals":
            if (answers[_answer].data_type == 'number') {
              answers[_answer].value = parseInt(answers[_answer].value)
            }
            if (_instruction.field_expected_value == answers[_answer].value) {

              trigger = await triggerSpecialInstruction(_instruction.form_field_intent.value, _instruction, rental, tenant_id);
            }
            break;
          case "lesser":
            if (answers[_answer].data_type == 'number') {
              answers[_answer].value = parseInt(answers[_answer].value)
            }
            if (_instruction.field_expected_value > answers[_answer].value) {
              trigger = await triggerSpecialInstruction(_instruction.form_field_intent.value, _instruction, rental, tenant_id);
            }
            break;
          case "greater":
            if (answers[_answer].data_type == 'number') {
              answers[_answer].value = parseInt(answers[_answer].value)
            }
            if (_instruction.field_expected_value < answers[_answer].value) {
              trigger = await triggerSpecialInstruction(_instruction.form_field_intent.value, _instruction, rental, tenant_id);
            }
            break;
          case "notequal":
            if (answers[_answer].data_type == 'number') {
              answers[_answer].value = parseInt(answers[_answer].value)
            }
            if (_instruction.field_expected_value != answers[_answer].value) {
              trigger = await triggerSpecialInstruction(_instruction.form_field_intent.value, _instruction, rental, tenant_id);
            }
            break;
          default:
            break;
        }

        result.push(trigger);

      })
    }));
    return result;
  } catch (error) {
    console.log(error)
  }
}
// trigger special instructions
async function triggerSpecialInstruction(action, instructions, rental, tenant_id) {
  try {
    let triggers = {};
    switch (action) {
      case "send_documents":
        // send Document
        //  trigger.requireProofs = await getProofs
        break;
      case "send_forms":
        // request proof
        let forms = instructions.form_field_value;
        let additional_qa = await getAdditionalQa(forms, rental, tenant_id);
        triggers.requireQAs = additional_qa.requireQAs;
        break;
      default:
        return;
    }
    return triggers;
  } catch (error) {
    console.log(error)
  }
}

// Remove Questionnaire / Task for tenants view
async function removeQuestionnaireForTenant(req, res) {
  try {
    let rental_id = req.query.rental_id;
    let formID = req.query.formID;
    let tenant_id = req.query.tenant_id;
    if (!rental_id) {
      return res.status(400).json({ errors: 'rental_id  Not Found' });
    }

    if (tenant_id) {
      let rental_details = await getRentalById(rental_id);
      if (rental_details && rental_details.length > 0) {
        let tenantQuestionnaire = rental_details[0].requiredQAs.find(_qa => _qa.tenant_id == tenant_id)
        if (tenantQuestionnaire) {
          tenantQuestionnaire.requiredForms = tenantQuestionnaire.requiredForms.filter(_form => _form.formID != formID);

          // questionnaireIDs.forEach(_formID => {
          //   if (_formID.formID === formID) {
          //     document_full_name = _formID.title
          //     _formID.status = FormStatus.Review;
          //   }
          //   else {
          //     return form;
          //   }
          //   tenantQuestionnaire.requiredForms.forEach(_form => {
          //     if (_form.status !== 'review') {
          //       allPending = false;
          //     }
          //   })
          // });
          // if (allPending == true) {
          //   //All forms are pending. so change certification status to review
          //   rental_details[0].certification_status = CertificationStatus.Review;
          // } else {
          //   rental_details[0].certification_status = CertificationStatus.Progress;

          // }
          let updated_result = await putRental(rental_id, rental_details[0], databaseConfig)


          // let unit_id = rental_details[0].unit_id;
          // let property_id = rental_details[0].property_id;
          // let property_details = await getPropertyById(property_id);
          // let unit_details = property_details[0].units.filter(_unit => _unit.id == unit_id);
          // let unit_name = unit_details[0].unit_id;
          // let tenant_details = await getTenantById(tenant_id);
          // let tenant_name = tenant_details[0].first_name;
          // let property_manager_id = tenant_details[0].property_manager_id;
          // let property_manager_details = await getTenantById(property_manager_id);
          // let property_manager_email = property_manager_details[0].email
          // let document_name = document_full_name.substring(document_full_name.lastIndexOf('/') + 1);




          // let property_manager_notification = await sendNotification("propertyManagerAfterReviewed", { property_id, document_name, tenant_name, unit_name })
          // let tenant_notification = await sendNotification("tenantAfterReviewed", { document_name, unit_name });
          // let tenant_email_notification = await sendEmailNotification(tenant_notification, tenant_details[0].email)
          // let property_manager_email_notification = await sendEmailNotification(property_manager_notification, property_manager_email)
          // let notification_response = await addNotification(property_manager_notification, tenant_notification, tenant_id, property_manager_id)


          // console.log("Updated rental info", updated_result.id)
          res.status(200).json({ message: "Removed Dependent Form Successfully", id: updated_result.id });
        } else {
          console.log("Tenant has no questionnaire")
          res.status(200).json({ message: "Tenant has no questionnaire", id: "NO_QA" });
        }

      } else {
        return res.status(404).json("Rental details not found");
      }
    } else {
      res.status(400).json("Tenant id not found");
    }

  } catch (error) {
    console.log("Add changeStatus based on answer error")
  }
}

// api to change form status
// CHANGE FORM STATUS FROM PENDING TO REVIEW
async function changeStatus(req, res) {
  try {
    let rental_id = req.query.rental_id;
    if (!rental_id) {
      return res.status(400).json({ errors: 'rental_id  Not Found' });
    }
    let allPending = true;
    let document_full_name;
    let tenant_id = req.query.tenant_id;
    if (tenant_id) {
      let formID = req.query.formID;
      let rental_details = await getRentalById(rental_id);
      if (rental_details && rental_details.length > 0) {
        let tenantQuestionnaire = rental_details[0].requiredQAs.find(_qa => _qa.tenant_id == tenant_id)
        if (tenantQuestionnaire) {
          let questionnaireIDs = tenantQuestionnaire.requiredForms.filter(_form => _form.formID == formID);
          questionnaireIDs.forEach(_formID => {
            if (_formID.formID === formID) {
              document_full_name = _formID.title
              _formID.status = FormStatus.Review;
            }
            else {
              return form;
            }
            tenantQuestionnaire.requiredForms.forEach(_form => {
              if (_form.status !== 'review') {
                allPending = false;
              }
            })
          });
          if (allPending == true) {
            //All forms are pending. so change certification status to review
            rental_details[0].certification_status = CertificationStatus.Review;
          } else {
            rental_details[0].certification_status = CertificationStatus.Progress;

          }
          // tenantQuestionnaire.requiredForms.forEach(_form => {
          //   if (_form.status == 'review') {
          //     rental_details[0].certification_status = CertificationStatus.Completed;
          //   }

          // })

          let updated_result = await putRental(rental_id, rental_details[0], databaseConfig)


          let unit_id = rental_details[0].unit_id;
          let property_id = rental_details[0].property_id;
          let property_details = await getPropertyById(property_id);
          let unit_details = property_details[0].units.filter(_unit => _unit.id == unit_id);
          let unit_name = unit_details[0].unit_id;
          let tenant_details = await getTenantById(tenant_id);
          let tenant_name = tenant_details[0].first_name;
          let property_manager_id = tenant_details[0].property_manager_id;
          let property_manager_details = await getTenantById(property_manager_id);
          let property_manager_email = property_manager_details[0].email
          let document_name = document_full_name.substring(document_full_name.lastIndexOf('/') + 1);




          let property_manager_notification = await sendNotification("propertyManagerAfterReviewed", { property_id, document_name, tenant_name, unit_name })
          let tenant_notification = await sendNotification("tenantAfterReviewed", { document_name, unit_name });
          let tenant_email_notification = await sendEmailNotification(tenant_notification, tenant_details[0].email)
          let property_manager_email_notification = await sendEmailNotification(property_manager_notification, property_manager_email)
          let notification_response = await addNotification(property_manager_notification, tenant_notification, tenant_id, property_manager_id)


          // console.log("Updated rental info", updated_result.id)
          res.status(200).json({ message: "Updated Status Successfully", id: updated_result.id });
        } else {
          console.log("Tenant has no questionnaire")
          res.status(200).json({ message: "Tenant has no questionnaire", id: "NO_QA" });
        }

      } else {
        return res.status(404).json("Rental details not found");
      }
    } else {
      res.status(400).json("Tenant id not found");
    }

  } catch (error) {
    console.log("Add changeStatus based on answer error")
  }
}
//Api  to change form status to reject
async function changeStatusToReject(req, res) {
  try {
    let rental_id = req.query.rental_id;
    if (!rental_id) {
      return res.status(400).json({ errors: 'rental_id  Not Found' });
    }
    let role = 'property_manager';
    let allPending = true;
    let document_full_name;
    let tenant_id = req.query.tenant_id;

    let tenant_details = await getTenantById(tenant_id);
    let property_manager_id = tenant_details[0].property_manager_id;
    let message = {
      from: property_manager_id,
      to: tenant_id,
      message: req.body.message,
    };
    if (message) {
      message.time_stamp = new Date().getTime()
    }
    if (tenant_id) {
      let formID = req.query.formID;
      let rental_details = await getRentalById(rental_id);
      if (rental_details && rental_details.length > 0) {
        let tenantQuestionnaire = rental_details[0].requiredQAs.find(_qa => _qa.tenant_id == tenant_id)
        if (tenantQuestionnaire) {
          let questionnaireIDs = tenantQuestionnaire.requiredForms.filter(_form => _form.title == formID);
          questionnaireIDs.forEach(_formID => {
            if (_formID.title === formID) {
              document_full_name = _formID.title
              _formID.status = FormStatus.Reject;
              _formID.message = message;
            }
            else {
              return form;
            }

          });
          rental_details[0].certification_status = CertificationStatus.Reject;

          //Create Message
          let data = {
            property_manager_id,
            tenant_id,
            role,
            message,
          };

          let result_message = await createMessage(data);
          let updated_result = await putRental(rental_id, rental_details[0], databaseConfig)
          let unit_id = rental_details[0].unit_id;
          let property_id = rental_details[0].property_id;
          let property_details = await getPropertyById(property_id);
          let property_name = property_details[0].name;
          let unit_details = property_details[0].units.filter(_unit => _unit.id == unit_id);
          let unit_name = unit_details[0].unit_id;
          //let tenant_details = await getTenantById(tenant_id);
          let tenant_name = tenant_details[0].first_name;
          //let property_manager_id = tenant_details[0].property_manager_id;
          let property_manager_details = await getTenantById(property_manager_id);
          let property_manager_email = property_manager_details[0].email
          let document_name = document_full_name.substring(document_full_name.lastIndexOf('/') + 1);
          let property_manager_notification = await sendNotification("propertyManagerAfterRejected", { property_id, document_name, tenant_name, unit_name })
          let tenant_notification = await sendNotification("tenantAfterRejected", { property_name });
          let tenant_email_notification = await sendEmailNotification(tenant_notification, tenant_details[0].email)
          let property_manager_email_notification = await sendEmailNotification(property_manager_notification, property_manager_email)
          let notification_response = await addNotification(property_manager_notification, tenant_notification, tenant_id, property_manager_id)

          // console.log("Updated rental info", updated_result.id)
          res.status(200).json({ message: "Form rejected Successfully", id: updated_result.id });

        } else {
          console.log("Tenant has no questionnaire")
          res.status(200).json({ message: "Tenant has no questionnaire", id: "NO_QA" });
        }

      } else {
        return res.status(404).json("Rental details not found");
      }
    } else {
      res.status(400).json("Tenant id not found");
    }

  } catch (error) {
    console.log("Add changeStatus based on answer error")
  }
}






// based on answer add question id
async function getByAnswer(req, res) {
  try {
    let unit_id = req.query.unit_id;
    let tenant_id = req.query.tenant_id;
    let questionnaire_id = req.query.questionnaire_id;
    if (!tenant_id) {
      return res.status(400).json({ errors: 'tenant_id  Not Found' });
    }
    if (!unit_id) {
      return res.status(400).json({ errors: 'unit_id  Not Found' });
    }
    const answer = await getAnswer(unit_id, tenant_id, questionnaire_id);
    if (answer.length == 0) {
      res.status(400).json("answer not Found");
    }
    res.status(200).json(answer);
  }
  catch (error) {
    console.error('Get a answer By Id Error');
  }
}

// get answer by tenant id
async function getAnswerOfTenant(req, res) {
  try {
    let tenant_id = req.query.tenant_id;
    let rental_id = req.query.rental_id;
    if (!rental_id) {
      return res.status(400).json({ errors: 'rental_id  Not Found' });
    }
    if (!tenant_id) {
      return res.status(400).json({ errors: 'tenant_id  Not Found' });
    }
    // befor fetching tenants answer , update the tenants answer (to update details for common field)
    let syncTenantAnswer = await syncTenantAndPropertyInfo(tenant_id, rental_id)
    if (syncTenantAnswer == true) {
      const answer = await getAnswerByTenantID(tenant_id);
      if (answer.length == 0) {
        res.status(400).json("answer not Found");
      }
      res.status(200).json(answer);
    } else {
      res.status(400).json({ error: "Failed to update answer" });
    }

  } catch (error) {
    console.error('Get an answer By tenant id Error');
  }
}
/*
sample output :
[
    {
        "answer": {
            "INCOME": {
                "value": "1000",
                "data_type": "number"
            },
            "NAME": {
                "value": "HEMA",
                "data_type": "text"
            },
            "CITY": {
                "value": "newyork",
                "data_type": "text"
            },
            "ST
        },
        "tenant_id": "acb7eab7-1dce-4f75-9691-0b69362f55d5",
        "id": "78b96e59-5be3-44b8-96a2-9d500d756434",
        "_rid": "vz0iAPsy9RxDAAAAAAAAAA==",
        "_self": "dbs/vz0iAA==/colls/vz0iAPsy9Rw=/docs/vz0iAPsy9RxDAAAAAAAAAA==/",
        "_etag": "\"3f002b16-0000-0100-0000-65a919570000\"",
        "_attachments": "attachments/",
        "_ts": 1705580887
    }
]
*/module.exports = {
  addAnswer,
  getByAnswer,
  getAnswerOfTenant,
  changeStatus,
  isFlowCompletelyAnswered,
  changeStatusToReject,
  removeQuestionnaireForTenant
}