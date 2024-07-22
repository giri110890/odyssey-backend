const { body } = require('express-validator');



const createCompanyValidator =[
    body("company_name", 'Company Name should not be empty').not().isEmpty(),
    body("email", 'Email should not be empty').not().isEmpty(),
    body("phone_no", 'phone no should not be empty').not().isEmpty(),
    body("address", 'phone no should not be empty').not().isEmpty(),
    body("branch_code", 'phone no should not be empty').not().isEmpty()

]
module.exports = {
    createCompanyValidator
}