const { body } = require('express-validator');

const validateItem = body('answer')
  .isObject()
  .custom((value) => {
    for (const key in value) {
      if (!value[key]) {
        throw new Error(`The field "${key}" within "answer" must not be empty.`);
      }
    }
    return true;
  });
  
//      }
//     body("code", 'code should not be empty').not().isEmpty().run(req);
//     body("response", 'response should not be empty').isObject().run(req);
//     next();
// };


module.exports = {
    validateItem
}
