
const { body } = require('express-validator');

const createTenantValidator = [
    body("first_name", 'First Name should not be empty').not().isEmpty(),
    body("last_name", 'Last Name should not be empty').not().isEmpty(),
    //body("ssn_number", 'SSN Number should not be empty').not().isEmpty(),
    //body("address", 'Address should not be empty').not().isEmpty(),
   // body("city", 'City should not be empty').not().isEmpty(),
    //body("state", 'State should not be empty').not().isEmpty(),
   // body("postalcode", 'Postalcode should not be empty').not().isEmpty(),
   // body("country", 'Country should not be empty').not().isEmpty(),
    body("role", ' Role should not be empty').not().isEmpty(),
    body("house_size", 'House Hold Size should not be empty').not().isEmpty(),
    body("race.*.option", 'Race option should not be empty').not().isEmpty(),
    //body("race.*.group", 'Race group should not be empty').not().isEmpty(),
    body("ethnicity.*.group", 'Ethnicity group should not be empty').not().isEmpty(),
    body("ethnicity.*.option", 'Ethnicity option should not be empty').not().isEmpty(),
    body("date_of_birth", 'Date of Birth should not be empty').not().isEmpty(),
    body("relationship", 'Relationship should not be empty').not().isEmpty(),
    body("disable", 'Disable status should not be empty').not().isEmpty(),
    body("student_status", 'Student status should not be empty').not().isEmpty(),
    // body("email", 'Email should not be empty').not().isEmpty(),
    body("identification_type", 'Identification Type should not be empty').not().isEmpty(),
];
const createPropertyManagerValidator = [
    body("first_name", 'First Name should not be empty').not().isEmpty(),
    body("last_name", 'Last Name should not be empty').not().isEmpty(),
    body("company_id", 'Company Id should not be empty').not().isEmpty(),
    body("address", 'Address should not be empty').not().isEmpty(),
    body("city", 'City should not be empty').not().isEmpty(),
    body("state", 'State should not be empty').not().isEmpty(),
    body("role", ' Role should not be empty').not().isEmpty(),
    // body("date_of_birth", 'Date of Birth should not be empty').not().isEmpty(),
    body("email", 'Email should not be empty').not().isEmpty()
];
const createShadowManagerValidator = [
    body("user.first_name", 'First Name should not be empty').not().isEmpty(),
    body("user.last_name", 'Last Name should not be empty').not().isEmpty(),
    body("user.company_id", 'Company Id should not be empty').not().isEmpty(),
    body("user.address", 'Address should not be empty').not().isEmpty(),
    body("user.city", 'City should not be empty').not().isEmpty(),
    body("user.state", 'State should not be empty').not().isEmpty(),
    body("user.role", ' Role should not be empty').not().isEmpty(),
    // body("user.date_of_birth", 'Date of Birth should not be empty').not().isEmpty(),
    body("user.email", 'Email should not be empty').not().isEmpty(),
    // body("user.property_manager_id", 'property_manager_id should not be empty').not().isEmpty(),     // This will be populated by the code.
    // body("options.items", 'Option items should not be empty').not().isEmpty()
]

const createCompanyValidator = [
    body("company_name", 'Company Name should not be empty').not().isEmpty(),
    body("email", 'Email should not be empty').not().isEmpty(),
    body("phone_no", 'phone no should not be empty').not().isEmpty()

]


module.exports = {
    createTenantValidator,
    createPropertyManagerValidator,
    createShadowManagerValidator,
    createCompanyValidator
}
