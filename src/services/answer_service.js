const { getAnswerByTenantID, storeAnswer, updateAnswerByTenant } = require('../data_store/answers')
const { getQuestionnaireById } = require('../data_store/questionnaire')
const { getRentalById, putRental } = require('../data_store/rentals')
const { FormStatus } = require('../enum/status');

const { getPropertyById } = require('../data_store/data_store_azure_cosmos')
const config = require('../../config/config')
const { getTenantById } = require('../data_store/users')

const databaseConfig = {
    endpoint: config.endpoint,
    key: config.key,
    databaseId: config.database.id,
    containerId: config.container.rentals,
};

async function getNextQuestion(questionnaire_id, question_id, tenant_id, rental_id) {
    let nextQuestionInfo = await getNextQuestionByTarget(questionnaire_id, question_id, tenant_id, rental_id);
    if (nextQuestionInfo.question_id == null) {
        //move to next questionnaire
        let update_status = await updateFormStatus(tenant_id, questionnaire_id, rental_id);
         // let nextQuestionnaireFirstQuestion = await getRemainingNotAnsweredQuestionnaire(tenant_id, rental_id);
       // let _nextQA = await getNextQuestionByTarget(nextQuestionnaireFirstQuestion.questionnaire_id, nextQuestionnaireFirstQuestion.question_id, tenant_id, rental_id);
        return "EOF";
    }
    else {
        return nextQuestionInfo;
        //return the current questionnaire id and question id
    }
}

async function getNextQuestionByTarget(questionnaire_id, question_id, tenant_id, rental_id) {
    try {
        let _questionnaireID = questionnaire_id;
        let _questionID = question_id;
        let _questionTarget = { questionnaire_id: _questionnaireID, question_id: _questionID };
        let _question = null; 

        // do {
        if (_questionTarget.question_id != null || _questionTarget.question_id != undefined) {
            _question = await getQuestionDetails(_questionTarget.questionnaire_id, _questionTarget.question_id, tenant_id, rental_id);

            let tenant_answer = await getAnswerByTenantID(tenant_id);
            let answers = tenant_answer[0].answer;

            if (Array.isArray(_question) && _question.length > 0) {
                // clg _question
                // _question = option[0].target
                //question_id target ?
                // return target
                    _targetAlreadyAnswered = await getTargetByanswerType(_questionnaireID, _question[0], answers, tenant_id, rental_id);
                    _questionTarget.question_id = _targetAlreadyAnswered?.target
                
                let next_question_id = _question[0].options[0].target;
                return { question_id:   _questionTarget.question_id , questionnaire_id: _questionTarget.questionnaire_id }
            } else {
                console.log("NO question found in this id")
            }
        }
        // } while (_questionTarget?.question_id != null)
        // if (_targetAlreadyAnswered == null) {
        //     let questionID = null;
        //     if (_question && _question.length > 0 && _question[0]) {
        //         questionID = _question[0]?.id;
        //     }

        //     return { question_id: questionID, questionnaire_id: questionnaire_id }
        // }
        // else {
        //     return _questionTarget;
        // }

    } catch (error) {
        console.log(error)
    }
}

// from remining questionnaire sends the next questionnaires first question
async function getRemainingNotAnsweredQuestionnaire(tenant_id, rental_id) {
    let remaining_questionnaire = []
    let target_questionnaire;
    let target_question;
    let rental_details = await getRentalById(rental_id)
    let tenantQuestionnaire = rental_details[0].requiredQAs.find(_qa => _qa.tenant_id == tenant_id)
    remaining_questionnaire = tenantQuestionnaire.requiredForms.filter(allForm => allForm.status == FormStatus.New);
    if (remaining_questionnaire.length > 0) {
        target_questionnaire = remaining_questionnaire[0].formID;
    } else {
        target_questionnaire = null
    }
    // to send next target question
    if (target_questionnaire != null) {
        target_question = await isFlowEnd(target_questionnaire) // need to loop the next questionnaiores first question , send nect question and
    } else {
        target_question = "EOF";
    }
    return target_question
}

// check its anserw type and gwt target i
async function getTargetByanswerType(questionnaire_id, question_details, answer, tenant_id, rental_id) {
    try {
        let found_question = question_details
        if (Object.keys(answer).includes(found_question.code)) {  // if answer available -> check its target , if target available return or return (end of flow)
            if (found_question.answer_type == 'radio') {
                let answered_question_target = found_question.options.find(_option => _option.value == answer[found_question.code].value[0].value)
                if (answered_question_target) {
                    return answered_question_target;
                }
                else {
                    return null;
                }
            } else {
                let answered_question_target = found_question.options.find(_option => answer[found_question.code].value[0].value)
                if (answered_question_target) {
                    return answered_question_target;
                }
                else {
                    return null;
                }
            }
        } else {  // it answer not available return null
            return null; // if not answered return null
        }
    } catch (error) {
        console.log(error)
    }
}

// update questionnaire status
async function updateFormStatus(tenant_id, questionnaire_id, rental_id) {
    // using tenant id get renatl details
    // using questionnaire id update status
    // update rental details
    if (questionnaire_id) {
        let rental_details = await getRentalById(rental_id)
        
        let tenantQuestionnaire = rental_details[0].requiredQAs.find(_qa => _qa.tenant_id == tenant_id)
        tenantQuestionnaire.requiredForms.map(_form => {
            if (_form.formID == questionnaire_id) {
              if(_form.isTask) {
                _form.status = FormStatus.Submitted; 
              }
              else {
                _form.status = FormStatus.Pending;  //CHANGE FORM STATUS TO PENDING
              }
            }
            else {
                return _form
            }
        })
        // update rental
        let updated_result = await putRental(rental_details[0].id, rental_details[0], databaseConfig)
        if (updated_result.id) {
            return updated_result.id
        } else {
            console.log("Error in updating status")
        }
    } else {
        console.log("This questionnaire id not available")
    }
}

async function getNextUnansweredQuestionInCurrentFlow(questionnaire_id, question_id, tenant_id, rental_id) {
    try {
        let _questionnaireID = questionnaire_id;
        let _questionID = question_id;
        let _questionTarget = { questionnaire_id: _questionnaireID, question_id: _questionID };
        let _targetAlreadyAnswered = null;
        let _question = null;

        let tenant_answer = await getAnswerByTenantID(tenant_id);
        let answers = tenant_answer[0].answer;
        do {
            if (_questionTarget.question_id != null || _questionTarget.question_id != undefined) {
                _question = await getQuestionDetails(_questionTarget.questionnaire_id, _questionTarget.question_id, answers, tenant_id, rental_id);

                if (Array.isArray(_question) && _question.length > 0) {
                    _targetAlreadyAnswered = await getTargetByanswerType(questionnaire_id, _question[0], answers, tenant_id, rental_id);
                    _questionTarget.question_id = _targetAlreadyAnswered?.target
                } else {
                    console.log("NO question found in this id")
                }
            }
        } while (_questionTarget?.question_id != null)
        if (_targetAlreadyAnswered == null) {
            let questionID = null;
            if (_question && _question.length > 0 && _question[0]) {
                questionID = _question[0]?.id;
            }

            return { question_id: questionID, questionnaire_id: questionnaire_id }
        }
        else {
            return _questionTarget;
        }

    } catch (error) {
        console.log(error)
    }
}

// async function to gext next target
async function getQuestionDetails(questionnaire_id, question_id, answer, tenant_id, rental_id) {
    try {
        let all_question_details = await getQuestionnaireById(questionnaire_id);
        let question_details = all_question_details[0].questions.filter(_question => _question.id == question_id)
        // console.log(question_details)
        return question_details;

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
                let next_source = questionnaire_details[0].questions.filter(_question => _question.question_id == 'root')
                console.log(next_source)
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
}// hema - function to update tenant and property answer ( for common field)
async function syncTenantAndPropertyInfo(tenant_id, rental_id) {
    try {
        let status = false;
        let rental = await getRentalById(rental_id);
        if (Array.isArray(rental)) {
            let tenant_info = await getTenantById(tenant_id);
            let property_info = await getPropertyById(rental[0].property_id);
            // map answer from property and tenant info 
            let tenant_info_to_answer = await changeInfoToAnswer("tenant", tenant_info[0]);
            let property_info_to_answer = await changeInfoToAnswer("property", property_info[0]);
            let odyssey_info_to_answer = await changeInfoToAnswer("ODYSSEY");
            // Merge two objects into a single Set
            let updated_answer = Object.assign({}, tenant_info_to_answer, property_info_to_answer,odyssey_info_to_answer);
            let tenant_answer = await getAnswerByTenantID(tenant_id);
            if (tenant_answer.length == 0) {
                let answer = {};
                answer.answer = updated_answer;
                answer.tenant_id = tenant_id;
                let result = await storeAnswer(answer);
                if (result.id) {
                    status = true;

                } else {
                    status = false;
                }
            } else {
                let available_answer = tenant_answer[0].answer;
                // Merge two objects into a single Set
                let all_answers = Object.assign({}, available_answer, updated_answer);
                tenant_answer[0].answer = all_answers;
                let updated_result = await updateAnswerByTenant(tenant_answer[0].id, tenant_answer[0]); // UPDATE ANSWER
                if (updated_result.id) {
                    status = true;
                } else {
                    status = false;
                }
            }
        } else {
            console.log("Rental is empty")
            status = false;
        }
        return status;
    } catch (error) {

    }
}

// convert property and tenant info to answer
async function changeInfoToAnswer(code, info) {
    try {
      if (!info) {
        return null;
      }
      switch (code) {
        case "tenant":
          let tenant_resident_id;  //tenant resident id
          if (info.resident_id) {
            tenant_resident_id = info.resident_id;
          } else {
            tenant_resident_id = null;
          }
          let tenant_race;  //race
          if (info.race && info.race.length > 0) {
            tenant_race = info.race[0].option;
          } else {
            tenant_race = null;
          }
          let tenant_first_name;  //tenant first name
          if (info.first_name) {
            tenant_first_name = info.first_name;
          } else {
            tenant_first_name = null;
          }
          let tenant_middle_name; //tenant middle name
          if (info.middle_name) {
            tenant_middle_name = info.middle_name;
          } else {
            tenant_middle_name = null;
          }
          let tenant_last_name;
          if (info.last_name) {
            tenant_last_name = info.last_name;
          } else {
            tenant_last_name = null;
          }
          let ssn_number;
          if (info.ssn_number) {
            ssn_number = info.ssn_number;
          } else {
            ssn_number = null;
          }
          let postalcode;
          if (info.postalcode) {
            postalcode = info.postalcode;
          } else {
            postalcode = null;
          }
          let ethnicity;
          if (info.ethnicity) {
            ethnicity = info.ethnicity;
          } else {
            ethnicity = null;
          }
          let date_of_birth;
          if (info.date_of_birth) {
            date_of_birth = info.date_of_birth;
          } else {
            date_of_birth = null;
          }
          let id_number;
          if (info.id_number) {
            id_number = info.id_number;
          } else {
            id_number = null;
          }
          let id_state;
          if (info.id_state) {
            id_state = info.id_state;
          } else {
            id_state = null;
          }
          let tel_number;
          if (info.tel_number) {
            tel_number = info.tel_number;
          } else {
            tel_number = null;
          }
          let city;
          if (info.city) {
            city = info.city;
          } else {
            city = null;
          }
          let email;
          if (info.email) {
            email = info.email;
          } else {
            email = null;
          }
          let house_size;
          if (info.house_size) {
            house_size = info.house_size;
          } else {
            house_size = null;
          }
          let unit_number;
          if (info.unit_number) {
            unit_number = info.unit_number;
          } else {
            unit_number = null;
          }
          let state;
          if (info.state) {
            state = info.state;
          } else {
            state = null;
          }
          let identification_type;
          if (info.identification_type && info.identification_type.length > 0) {
            identification_type = info.identification_type.label;
          } else {
            identification_type = null;
          }
          let disable;
          if (info.disable && info.disable.length > 0) {
            disable = info.disable.label;
          } else {
            disable = null;
          }
          let relationship;
          if (info.relationship && info.relationship.length > 0) {
            relationship = info.relationship.label;
          } else {
            relationship = null;
          }
          let student_status;
          if (info.student_status && info.student_status.length > 0) {
            student_status = info.student_status.label;
          } else {
            student_status = null;
          }
          let affordable_option
          if (info.affordable_option && info.affordable_option.length > 0) {
            affordable_option = info.affordable_option.map(affordable => affordable.option);
          } else {
            affordable_option = null;
          }
          // tenant info bulk upload
          let unit_type;
          if (info.unit_type) {
            unit_type = info.unit_type;
          } else {
            unit_type = null;
          }
          let program_type;
          if (info.program_type) {
            program_type = info.program_type;
          } else {
            program_type = null;
          }
          let number_of_adult_household_members;
          if (info.number_of_adult_household_members) {
            number_of_adult_household_members = info.number_of_adult_household_members;
          } else {
            number_of_adult_household_members = null;
          }
          let current_rent;
          if (info.current_rent) {
            current_rent = info.current_rent;
          } else {
            unit_type = null;
          }
          let security_deposit_held;
          if (info.security_deposit_held) {
            security_deposit_held = info.security_deposit_held;
          } else {
            security_deposit_held = null;
          }
  
          // tenants created by bulk upload have fields (handle every scenario)
  
          // change tenant info to answer
          let tenant_data = {
            TENANT_RESIDENT_ID: {
              value: [{ "value": tenant_resident_id, answerType: "text", target: null }],
              data_type: "text"
            },
  
            TENANT_FIRST_NAME: {
              value: [{ "value": tenant_first_name, answerType: "text", target: null }],
              data_type: "text"
            },
            TENANT_MIDDLE_NAME: {
              value: [{ "value": tenant_middle_name, answerType: "text", target: null }],
              data_type: "text"
            },
            TENANT_LAST_NAME: {
              value: [{ "value": tenant_last_name, answerType: "text", target: null }],
              data_type: "text"
            },
            TENANT_SS_NUMBER: {
              value: [{ "value": ssn_number, answerType: "text", target: null }],
              data_type: "text"
            },
  
            TENANT_POSTAL_CODE: {
              value: [{ "value": postalcode, answerType: "text", target: null }],
              data_type: "text"
            },
  
            TENANT_ETHNICITY: {
              value: [{ "value": ethnicity, answerType: "text", target: null }],
              data_type: "text"
            },
  
            TENANT_RACE: {
              value: [{ "value": tenant_race, answerType: "text", target: null }],
              data_type: "text"
            },
  
            TENANT_DATE_OF_BIRTH: {
              value: [{ "value": date_of_birth, answerType: "text", target: null }],
              data_type: "text"
            },
  
            TENANT_IDENTIFICATION_NUMBER: {
              value: [{ "value": id_number, answerType: "text", target: null }],
              data_type: "text"
            },
            TENANT_IDENTIFICATION_STATE: {
              value: [{ "value": id_state, answerType: "text", target: null }],
              data_type: "text"
            },
  
            TENANT_TEL_NUMBER: {
              value: [{ "value": tel_number, answerType: "text", target: null }],
              data_type: "text"
            },
            TENANT_CITY: {
              value: [{ "value": city, answerType: "text", target: null }],
              data_type: "text"
            },
            TENANT_STATE: {
              value: [{ "value": state, answerType: "text", target: null }],
              data_type: "text"
            },
            TENANT_IDENTIFICATION_TYPE: {
              value: [{ "value": identification_type, answerType: "text", target: null }],
              data_type: "text"
            },
            TENANT_EMAIL: {
              value: [{ "value": email, answerType: "text", target: null }],
              data_type: "text"
            },
            TENANT_RELATIONSHIP: {
              value: [{ "value": relationship, answerType: "text", target: null }],
              data_type: "text"
            },
            TENANT_HOUSE_SIZE: {
              value: [{ "value": house_size, answerType: "text", target: null }],
              data_type: "text"
            },
            TENANT_DISABLE: {
              value: [{ "value": disable, answerType: "text", target: null }],
              data_type: "text"
            },
            TENANT_UNIT_NUMBER: {
              value: [{ "value": unit_number, answerType: "text", target: null }],
              data_type: "text"
            },
            TENANT_STUDENT_STATUS: {
              value: [{ "value": student_status, answerType: "text", target: null }],
              data_type: "text"
            },
            TENANT_AFFORDABLE_OPTION: {
              value: [{ "value": affordable_option, answerType: "text", target: null }],
              data_type: "text"
            },
            TENANT_UNIT_TYPE: {
              value: [{ "value": unit_type, answerType: "text", target: null }],
              data_type: "text"
            },
            TENANT_PROGRAM_TYPE: {
              value: [{ "value": program_type, answerType: "text", target: null }],
              data_type: "text"
            },
            TENANT_NO_OF_HOUSEHOLD_MEMBER: {
              value: [{ "value": number_of_adult_household_members, answerType: "text", target: null }],
              data_type: "text"
            },
            TENANT_CURRENT_RENT: {
              value: [{ "value": current_rent, answerType: "text", target: null }],
              data_type: "text"
            },
            TENANT_SECURITY_DEPOSIT_HELD: {
              value: [{ "value": security_deposit_held, answerType: "text", target: null }],
              data_type: "text"
            },
          };
          return tenant_data;
  
        case "property":
          // change property info to answer
          let property_data = {
            PROPERTY_NAME: {
              value: [{ "value": info?.name, answerType: "text", target: null }],
              data_type: "text"
            },
            PROPERTY_LEGAL_NAME: {
              value: [{ "value": info?.legal_name, answerType: "text", target: null }],
              data_type: "text"
            },
            PROPERTY_ADDRESS: {
              value: [{ "value": info?.address, answerType: "text", target: null }],
              data_type: "text"
            },
            PROPERTY_CITY: {
              value: [{ "value": info?.city, answerType: "text", target: null }],
              data_type: "text"
            },
            PROPERTY_STATE: {
              value: [{ "value": info?.state, answerType: "text", target: null }],
              data_type: "text"
            },
            PROPERTY_COUNTRY: {
              value: [{ "value": info?.country, answerType: "text", target: null }],
              data_type: "text"
            },
            PROPERTY_POSTAL_CODE: {
              value: [{ "value": info?.postalcode, answerType: "text", target: null }],
              data_type: "text"
            },
            PROPERTY_COUNTY: {
              value: [{ "value": info?.county, answerType: "text", target: null }],
              data_type: "text"
            },
            PROPERTY_PHONE_NUMBER: {
              value: [{ "value": info?.phone_number, answerType: "text", target: null }],
              data_type: "text"
            },
            PROPERTY_FAX_NUMBER: {
              value: [{ "value": info?.fax_number, answerType: "text", target: null }],
              data_type: "text"
            },
            PROPERTY_EMAIL: {
              value: [{ "value": info?.email, answerType: "text", target: null }],
              data_type: "text"
            },
            PROPERTY_BILLING_EMAIL: {
              value: [{ "value": info?.billing_email, answerType: "text", target: null }],
              data_type: "text"
            },
            PROPERTY_MANAGEMENT_AGENCY_NAME: {
              value: [{ "value": info?.management_agency_name, answerType: "text", target: null }],
              data_type: "text"
            },
            PROPERTY_WEBSITE: {
              value: [{ "value": info?.website, answerType: "text", target: null }],
              data_type: "text"
            },
            PROPERTY_NO_OF_UNITS: {
              value: [{ "value": info?.no_of_units, answerType: "text", target: null }],
              data_type: "text"
            }
          };
          return property_data;
        default:
          return
      }
    } catch (error) {
      console.error(error)
    }
}

// Populate tenant answers to property and tenant questions
async function updateTenantAnswers(tenant_id, property_id) {
    let tenant_info = await getTenantById(tenant_id);
    let property_info = await getPropertyById(property_id);
    // map answer from property and tenant info 
    let tenant_info_to_answer = await changeInfoToAnswer("tenant", tenant_info[0]);
    let property_info_to_answer = await changeInfoToAnswer("property", property_info[0]);
    // Merge two objects into a single Set
    let updated_answer = Object.assign({}, tenant_info_to_answer, property_info_to_answer);
    let tenant_answer = await getAnswerByTenantID(tenant_id);
    if (tenant_answer.length == 0) {
      let answer = {};
      answer.answer = updated_answer;
      answer.tenant_id = tenant_id;
      let result = await storeAnswer(answer);
    } else {
      let available_answer = tenant_answer[0].answer;
      // Merge two objects into a single Set
      let all_answers = Object.assign({}, available_answer, updated_answer);
      tenant_answer[0].answer = all_answers;
      let updated_result = await updateAnswerByTenant(tenant_answer[0].id, tenant_answer[0]); // UPDATE ANSWER
    }
  }

module.exports = {
    changeInfoToAnswer,
    getNextQuestion,
    syncTenantAndPropertyInfo,
    updateTenantAnswers,
    getNextUnansweredQuestionInCurrentFlow
}