const { body } = require('express-validator');

const createAccessValidator =[
    body("user_id", 'user_id should not be empty').not().isEmpty(),
    body("access", 'access should not be empty').not().isEmpty(),
    body("options", 'options.properties should not be empty').not().isEmpty(),
    body("options.users", 'options.users should not be empty').not().isEmpty(),
    body("options.properties", 'options.users should not be empty').not().isEmpty(),
]
module.exports = {
    createAccessValidator
}