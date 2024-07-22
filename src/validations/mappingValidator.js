const { body } = require('express-validator');

const createField=[
    body("label", 'label should not be empty').not().isEmpty(),
    body("question_code", 'question_code should not be empty').not().isEmpty()
]

const addMapping=[
    body("form_id", 'form_id should not be empty').not().isEmpty(),
    body("fields.*.position", 'Text should not be empty').not().isEmpty(),
    body("fields.*.id", 'Id should not be empty').not().isEmpty(),
    body("fields.*.question_code", 'Description should not be empty').not().isEmpty(),
    body("fields.*.pg_no", 'Answer_type should not be empty').not().isEmpty(),
    body("form_title.*.id", 'Id should not be empty').not().isEmpty()
    
]
module.exports={
    createField,
    addMapping
}