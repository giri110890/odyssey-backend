var nodeEnv = "dev-2" // process.env.NODE_ENV || "development";

// console.log (nodeEnv);
const env_specific_config = require('./env/' + nodeEnv);
const deriveConfig = require('./config.common.derived');

//
// Common config for all environments
// 

var config = {};

config.PORT = process.env.PORT || 8080;

config.container = {
    id: 'properties',
    questions: 'questions',
    users: 'users',
    answers:'answers',
    rentals : 'rentals',
    notifications:'notifications',
    fields:'fields',
    forms:'forms',
    access: 'access',
    companies: 'companies',
    messages: 'messages'
  }
  
config.property_names = {
  property_id: 'property_id',
  property_manager_id: 'property_manager_id',
  rental_id: 'rental_id',
  id: 'id',
  email: 'email',
  form_id: 'form_id',
  unit_id: 'unit_id',
  user_id:'user_id',
  access:'access',

}

// 
// Overrides for environment specific values
//

env_specific_config(config);

//
// Derives config values from other config values
//

deriveConfig(config);

module.exports = config

