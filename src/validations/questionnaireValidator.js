const { body } = require('express-validator');

const createQuestionnaireValidator = [
    body("title", 'title should not be empty').not().isEmpty(),
    body("questions.*.text", 'Text should not be empty').not().isEmpty(),
    body("questions.*.description", 'Description should not be empty').not().isEmpty(),
    body("questions.*.answer_type", 'Answer_type should not be empty').not().isEmpty(),
    body("questions.*.id", 'Id should not be empty').not().isEmpty(),
    body("questions.*.code", 'Question Code should not be empty').not().isEmpty(),
    // body("questions.*.options.*.label", 'Question label should not be empty').not().isEmpty(),
    // body("questions.*.options.*.value", 'Question value should not be empty').not().isEmpty(),
    // body("questions.*.options.*.target", 'Question target should not be empty').not().isEmpty(),
    // body("questions.*.options.*.type", 'Question type should not be empty').not().isEmpty()
]


module.exports = {
    createQuestionnaireValidator
}
