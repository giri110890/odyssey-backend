const { body } = require('express-validator');


const createUnitValidator = [
    // body('unit_id', 'Unit id should not be empty').not().isEmpty(),
    // body('unit_number', 'unit number should not be empty').not().isEmpty(),
    // body('city', 'City should not be empty').not().isEmpty(),
    // body('current_rent', 'Citycurrent_rent should not be empty').not().isEmpty(),
    // body('date_of_birth', 'Date_of_birth should not be empty').not().isEmpty(),
    // body('email_address', 'Email_address should not be empty').not().isEmpty(),
    // body('name', 'Name should not be empty').not().isEmpty(),
    // body('number_of_adult_household_members', 'Number_of_adult_household_members should not be empty').not().isEmpty(),
    // body('phone_number', 'Phone_number should not be empty').not().isEmpty(),
    // body('program_type', 'Program_type should not be empty').not().isEmpty(),
    // body('resident', 'Resident should not be empty').not().isEmpty(),
    // body('security_deposit_held', 'Security_deposit_held should not be empty').not().isEmpty(),
    // body('state', 'State should not be empty').not().isEmpty(),
    // body('unit', 'Unit should not be empty').not().isEmpty(),
   // body('unit_type', 'Unit_type should not be empty').not().isEmpty(),
    // body('bedroom_count', 'Bedroom count should not be empty').not().isEmpty(),
   // body('no_of_bed', 'Bed count should not be empty').not().isEmpty(),
     body('no_of_bathroom', 'Bathroom count should not be empty').not().isEmpty(),
];



module.exports = {
    createUnitValidator
}