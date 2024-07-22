const { body } = require('express-validator');



const addPropertyValidator = [
  body('name', 'Name should not be empty').not().isEmpty(),
  body('legal_name', 'Legal Name should not be empty').not().isEmpty(),
  body('address', 'Address should not be empty').not().isEmpty(),
  body('city', 'City should not be empty').not().isEmpty(),
  body('state', 'State should not be empty').not().isEmpty(),
  body('postalcode', 'Postal Code should not be empty').not().isEmpty(),
  body('phone_number', 'Phone NUmber should not be empty').not().isEmpty(),
  body('no_of_units', 'No Of Units  should not be empty').not().isEmpty()
];

const specialInstruction = [
  body('form_name', 'Form_name should not be empty').not().isEmpty(),
  body('form_field', 'Form_field should not be empty').not().isEmpty(),
  body('field_operator', 'Field_operator should not be empty').not().isEmpty(),
  body('field_expected_value', 'Field_expected_value should not be empty').not().isEmpty(),
  //body('rule_action', 'Rule_action should not be empty').not().isEmpty()
]
module.exports = {
  addPropertyValidator,
  specialInstruction

}