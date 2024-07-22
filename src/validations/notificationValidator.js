const { body } = require('express-validator');
const addMessage=[
   
    body("message.*.from", 'Text should not be empty').not().isEmpty(),
    body("message.*.to", 'Text should not be empty').not().isEmpty(),
    body("message.*.content", 'Text should not be empty').not().isEmpty(),
    
    
]
module.exports={
    addMessage
    
}