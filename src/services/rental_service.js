const {getAnswerByTenantID} = require('../data_store/answers')
const {createRental, getRentalsUsingTenantId} = require('../data_store/rentals')
const {getQuestionnaireById} = require('../data_store/questionnaire')
const { getNextUnansweredQuestionInCurrentFlow } = require('./answer_service');

async function removeAlreadyAnsweredQuestions(tenant_id, questionnaire_details) {
    let tenant_answer = await getAnswerByTenantID(tenant_id)
    if (tenant_answer.length > 0) { // if answered return filter result
        let _answer = tenant_answer[0].answer;
        filtered_result = questionnaire_details.filter(_form => {
            let keys = Object.keys(_answer);
            _form.questions = _form.questions.filter(_code => !keys.includes(_code.code));

            if (_form.questions.length > 0) {
                return _form
            }
        });
        // filter the questions that already answereds
        return filtered_result;
    } else { //if not answered return questionnaire details
        return questionnaire_details;
    }
}

async function addRental(rental_info) {
    try {
      if (rental_info.property_id) {
        rental_info.requiredQAs = [];
        let rental = await createRental(rental_info);
        return rental;
      }
    } catch (error) {
      console.log(error)
    }
  
}

const assignTenantToUnit_Impl = async (rentalInfo) => {
    let rental = await getRentalsUsingTenantId(rentalInfo.tenantId);
    if (rental.length === 0) {
      // Add a new rental record
      const newRental = await addRental(rentalInfo);
      return "NewRental";
    }
    else {
      // Check if existing record is assigned to this unit
      const existingRental = rental.find(rental => rental.unit_id === rentalInfo.unit_id);
      if (existingRental?.unit_id) {
        // No changes - return 200.
        return "AlreadyAssigned";

      } else {
        // Create a new record to assign the tenant to the unit
        const updatedRental = await addRental(rentalInfo);
        if (updatedRental.id) {
          return "NewRental";
        } else {
          return "Error";
        }
      }
    }
  }

  async function partiallyAnswered(tenant_id, questionnaire_details,_currentQuestionnaireID,rental_id) {
    let tenant_answer = await getAnswerByTenantID(tenant_id)
    if (tenant_answer.length > 0) { // if answered return filter result
        let _answer = tenant_answer[0].answer;
        result = await getQuestionnaireById(questionnaire_details[0].id);
        let _rootQuestion = result[0]?.questions.find(_question => _question.question_id == "root");
        if (_rootQuestion) {
            let _currentQuestionID = _rootQuestion.id;
            _nextQuestion = { questionnaire_id: _currentQuestionnaireID, question_id: _rootQuestion.id, };
        }
        //filtered_result = questionnaire_details.filter(_form => {
        let keys = Object.keys(_answer);
        let isAnswerExists = keys.find(_code => _code == _rootQuestion.code);
        if (isAnswerExists) {
            let nextQA = await getNextUnansweredQuestionInCurrentFlow(_currentQuestionnaireID, question_id = _rootQuestion.id, tenant_id, rental_id)

            if (nextQA.question_id) {
                return { status: true, question_id: nextQA.question_id };
            }
            else {
                return { status: false }; // No more unanswered questions
            }
        }
        else {
            //if not answered return questionnaire details
            return questionnaire_details;
        }
    }
}

module.exports = {
    assignTenantToUnit_Impl,
    removeAlreadyAnsweredQuestions,
    addRental,
    partiallyAnswered
}