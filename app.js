const express = require('express');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const auth = require('./src/routes/middleware/auth_validator');
const access = require('./src/routes/middleware/permission/permissions');
const permissions = require('./src/routes/middleware/permission/permission_validator');
const cors = require('./src/routes/middleware/cors/cors_handler');
const app = express();
app.use(cookieParser());
app.use(bodyParser.json({ limit: '5mb' }));
const fs = require('fs');


const { getRecordByKey, putRecord } = require('./src/data_store/data_store_local'); // Adjust the path as needed
const data_store = require('./src/data_store/data_store_azure_cosmos');

// Doesn't work
// const property = require('./src/routes/property');
// app.use('/property', property);

const propertyController = require('./src/routes/controllers/propertyController');
const unitController = require('./src/routes/controllers/unitController');
const questionnaireController = require('./src/routes/controllers/questionnaireController');
const userController = require('./src/routes/controllers/userController');
const answerController = require('./src/routes/controllers/answerController');
const rentalController = require('./src/routes/controllers/rentalController');
const notificationController = require('./src/routes/controllers/notificationController')
const blobController = require('./src/routes/controllers/blobController');
const mappingController = require('./src/routes/controllers/mappingController');
const companyController = require('./src/routes/controllers/companyController');
const accessController = require('./src/routes/controllers/accessController');

const propertyValidator = require("./src/validations/propertyValidator");
const unitValidator = require("./src/validations/unitValidator");
const questionnaireValidator = require("./src/validations/questionnaireValidator");
const userValidator = require('./src/validations/userValidator');
const answerValidator = require('./src/validations/answerValidator');
const mappingValidator = require('./src/validations/mappingValidator');
const companyValidator = require('./src/validations/companyValidator');
const notificationValidator = require('./src/validations/notificationValidator');




const blob = require('./src/data_store/blob');

//Very important change for enabling cross domain origin ----------------Start
app.use(cors.cors_handler);
//Very important change for enabling cross domain origin ----------------End

//
// Public Routes
//

// About
app.get('/about', (req, res) => {
  console.log("about");
  let build_number_file = 'unknown'
  try {
    build_number_file = fs.readFileSync('./build_number', 'utf8');
    res.set('X-Build-Number', build_number_file.trim());
  } catch (err) {
    console.log('Error reading build_number file:', err);
  }
  res.status(200); res.send({ status: 'success', build_number: build_number_file.trim() });
});

//
// Protected Routes
//

// Enable token validation on API calls below this point.
//  NEVER COMMENT THIS OUT IN COMMITTED CODE - WITHOUT THIS PUBLIC USERS CAN MAKE UNAUTHENTICATED API CALLS.
app.use(auth.authenticateToken);

// Property Manager
app.get('/property_manager/:property_manager_id',
  (req, res, next) => { permissions.validate_permission([access.AccessPermission.Read], req, res, next); },
  async (req, res) => {
    const propertyManagers =
      await getRecordByKey('property_manager', req.params.property_manager_id);
    // console.log('after await');
    if (propertyManagers)
      res.json(propertyManagers);
    else {
      // console.log('404 status');
      res.status(404).json({ error: 'Property Manager ' + req.params.property_manager_id + ' not found.' });
    }
    // console.log('end of get');
  });

app.post('/property_manager',
  (req, res, next) => { permissions.validate_permission([access.AccessPermission.Read], req, res, next); },
  async (req, res) => {
    const newPropertyManager = req.body;
    await putRecord('property_manager', newPropertyManager.property_manager_id, newPropertyManager);
    res.status(201).json(newPropertyManager);
  });

// Login and get user information and permissions information
app.get('/on_login', userController.onLogin);   // NO validation_permission required.
// Api to fetch role - TO BE REPLACED BY /login
app.get('/get_role', userController.getUserByEmailId);  // NO validation_permission required.

// Get permissions for a user. 
app.get('/access',
  (req, res, next) => { permissions.validate_permission([access.AccessPermission.Read], req, res, next); },
  accessController.getAccess);

//Property
// hemalatha - api for all Active properties 
app.get('/all_properties/:property_manager_id',
  (req, res, next) => { permissions.validate_permission([access.AccessPermission.Manager], req, res, next); },
  propertyController.getAllActivePropertyData);

// API for users with access to properties they do not own. Will return all properties contained in permissions token. 
app.get('/properties',
  (req, res, next) => { permissions.validate_permission([access.AccessPermission.Manager], req, res, next); },
  propertyController.getPropertiesByPropertyIds);

// hema - to get all deleted property
app.get('/all_deleted_properties/:property_manager_id',
  (req, res, next) => { permissions.validate_permission([access.AccessPermission.Manager], req, res, next); },
  propertyController.getAllDeletedPropertyData);
// Get property by id
app.get('/property/:id',
  (req, res, next) => { permissions.validate_permission([access.AccessPermission.Read], req, res, next); },
  propertyController.getById);

// api to update property
app.post('/property',
  (req, res, next) => { permissions.validate_permission([access.AccessPermission.Read, access.AccessPermission.Write], req, res, next); },
  propertyValidator.addPropertyValidator,
  propertyController.update);

// hemalatha -api for creating property start
app.post('/add_property/', propertyValidator.addPropertyValidator,
  (req, res, next) => { permissions.validate_permission([access.AccessPermission.Write], req, res, next); },
  propertyController.addProperty);
//
app.delete('/delete_all_property/:property_manager_id',
  (req, res, next) => { permissions.validate_permission([access.AccessPermission.Manager], req, res, next); },
  propertyController.deleteAllProperty);

//hema - api to delete property (delete from db)
app.delete('/delete_property',
  (req, res, next) => { permissions.validate_permission([access.AccessPermission.Manager], req, res, next); },
  propertyController.deleteProperty);
// hema - api to delete property softly (by changing its status)
app.post('/soft_delete_property',
  (req, res, next) => { permissions.validate_permission([access.AccessPermission.Manager], req, res, next); },
  propertyController.softDeleteProperty);
// change all property status to active
app.post('/change_property_status',
  (req, res, next) => { permissions.validate_permission([access.AccessPermission.Write], req, res, next); },
  data_store.changePropertyStatus);

// special instruction
//api to add special instruction to the property
app.post('/add_special_instructions',
  (req, res, next) => { permissions.validate_permission([access.AccessPermission.Write], req, res, next); },
  propertyValidator.specialInstruction, propertyController.addSpecialInstruction);

// Unit
// hema - api to get all units
app.get('/all_units',
  (req, res, next) => { permissions.validate_permission([access.AccessPermission.Read], req, res, next); },
  unitController.getAllUnitData);

// hema - api to create unit 
app.post('/create_unit',
  (req, res, next) => { permissions.validate_permission([access.AccessPermission.Write], req, res, next); },
  unitValidator.createUnitValidator, unitController.addUnit);

// hema - api to read csv unit file and save data in database
app.post('/bulk_upload_units',
  (req, res, next) => { permissions.validate_permission([access.AccessPermission.Write], req, res, next); },
  unitController.bulkUploadUnits);
// hema - api to update unit
app.post('/update_unit',
  (req, res, next) => { permissions.validate_permission([access.AccessPermission.Write], req, res, next); },
  unitValidator.createUnitValidator, unitController.updateUnit);
// to get unit details
app.get('/unit_details',
  (req, res, next) => { permissions.validate_permission([access.AccessPermission.Read], req, res, next); },
  unitController.getById);
//hema - api to delete unit
app.delete('/delete_unit',
  (req, res, next) => { permissions.validate_permission([access.AccessPermission.Manager], req, res, next); },
  unitController.deleteUnit);


// questionnaire
// hema - api to get all Questionnaire
app.get('/all_questionnaire', questionnaireController.getAllQuestionnaire);
//hema- api get question by id
app.get('/questionnaire/:id', questionnaireController.getByQuestionnaireId);
//hema - api to create a Questionnaire
app.post('/create_questionnaire',
  (req, res, next) => { permissions.validate_permission([access.AccessPermission.Write], req, res, next); },
  questionnaireValidator.createQuestionnaireValidator, questionnaireController.addQuestionnaire);
// hema - api to update question 
app.post('/update_questionnaire',
  (req, res, next) => { permissions.validate_permission([access.AccessPermission.Write], req, res, next); },
  questionnaireValidator.createQuestionnaireValidator, questionnaireController.updateQuestionnaire);
// hema - api to delete questionnaire
app.delete('/delete_questionnaire',
  (req, res, next) => { permissions.validate_permission([access.AccessPermission.Manager], req, res, next); },
  questionnaireController.deleteQuestionnaire);
// hema - api to mark a questionnaire as favorite and unfavourite
app.post('/toggle_favorite',
  (req, res, next) => { permissions.validate_permission([access.AccessPermission.Write], req, res, next); },
  questionnaireController.setFavorite);
//hema - api to initialize questionnaire for form mapping (ie to create dummy questionnaire)
app.post('/initialize_questionnaire_for_form_mapping',
  (req, res, next) => { permissions.validate_permission([access.AccessPermission.Write], req, res, next); },
  questionnaireController.initializeQuestionnaireForFormMapping);




//Mapping
//fields
// hema - api to add field
app.post('/create_field',
  (req, res, next) => { permissions.validate_permission([access.AccessPermission.Write], req, res, next); },
  mappingValidator.createField, mappingController.addQuestionCode)
// hema - to get all fields along with label, question_code and property_manager_id
app.get('/all_question_code/',
  (req, res, next) => { permissions.validate_permission([access.AccessPermission.Read], req, res, next); },
  mappingController.getAllQuestionCode);
// hema - api to update mapped fields
app.post('/remove_mappings',
  (req, res, next) => { permissions.validate_permission([access.AccessPermission.Write], req, res, next); },
  mappingController.removeMappings)
// api to link form with questionnaire
app.post('/link_form_with_questionnaire',
  (req, res, next) => { permissions.validate_permission([access.AccessPermission.Write], req, res, next); },
  mappingController.associateFormAndQuestionnaire)
// api to update questionnaire by mappings (create automatic questionnaire based on mappings)
app.post('/update_questionnaire_by_form_fields',
  (req, res, next) => { permissions.validate_permission([access.AccessPermission.Write], req, res, next); },
  mappingController.updateQuestionnaireByFormFields)
// hema - api to update mapping position
app.post('/update_mapping_position',
  (req, res, next) => { permissions.validate_permission([access.AccessPermission.Write], req, res, next); },
  mappingController.updateMappingPosition)
// sujith- api to get all common field
app.post('/create_common_field/',
  (req, res, next) => { permissions.validate_permission([access.AccessPermission.Write], req, res, next); },
  mappingController.generateCommonFields);

app.get('/update_old_custom_field/',
  (req, res, next) => { permissions.validate_permission([access.AccessPermission.Read], req, res, next); },
  mappingController.migrateOldCustomField);
// hema - api to clear field table (only for office purpose)
//app.delete('/clear_field_table', 
// (req, res, next) => { permissions.validate_permission([access.AccessPermission.Never], req, res, next);},
// mappingController.clearFieldTable)

// form
// hema - api to add mapping for specific page
app.post('/add_mapping',
  (req, res, next) => { permissions.validate_permission([access.AccessPermission.Write], req, res, next); },
  mappingValidator.addMapping, mappingController.addMappings)
// hema - api to get all mapped form (mapped form contains form id, position and question code)
app.get('/all_mapped_form/',
  (req, res, next) => { permissions.validate_permission([access.AccessPermission.Read], req, res, next); },
  mappingController.getMappedForms)
// hema - api to get mapping of a form id
app.get('/mapping_by_form_id/',
  (req, res, next) => { permissions.validate_permission([access.AccessPermission.Read], req, res, next); },
  mappingController.getMappingByFormId)
// api to get form data by qa id
app.get('/get_form_data_by_qa_id',
  (req, res, next) => { permissions.validate_permission([access.AccessPermission.Read], req, res, next); },
  mappingController.getFormdataByQaId)
// delete mapped form
app.delete('/delete_mapped_form',
  (req, res, next) => { permissions.validate_permission([access.AccessPermission.Manager], req, res, next); },
  mappingController.deleteMappedForm)
// delete field
app.delete('/delete_field',
  (req, res, next) => { permissions.validate_permission([access.AccessPermission.Write], req, res, next); },
  mappingController.removeField);

// hema - api to create a tenant
app.post('/create_tenant',
  (req, res, next) => { permissions.validate_permission([access.AccessPermission.Write], req, res, next); },
  userValidator.createTenantValidator, userController.addTenant);
// hema - api to create a property_manager
app.post('/create_property_manager',
  (req, res, next) => { permissions.validate_permission([access.AccessPermission.Manager], req, res, next); },
  userValidator.createPropertyManagerValidator, userController.addPropertyManager);
//api to delete a property manager
app.delete('/remove_property_manager/',
  (req, res, next) => { permissions.validate_permission([access.AccessPermission.Manager], req, res, next); },
  userController.deletePropertyManager);

// steve - api to create a shadow manager
app.post('/create_shadow_manager',
  (req, res, next) => { permissions.validate_permission([access.AccessPermission.Write], req, res, next); },
  userValidator.createShadowManagerValidator, userController.addShadowManager);
//api to get all shadow user
app.get('/list_all_shadow_user',
  (req, res, next) => { permissions.validate_permission([access.AccessPermission.Manager], req, res, next); },
  userController.getAllShadowUser);
//api to get all property manager
app.get('/list_all_property_manager',
  (req, res, next) => { permissions.validate_permission([access.AccessPermission.Manager], req, res, next); },
  userController.getAllPropertyManager);
// api to assign properties to shadow manager
app.post('/assign_properties_shadow_user',
  (req, res, next) => { permissions.validate_permission([access.AccessPermission.Write, access.AccessPermission.Manager], req, res, next); },
  userController.assignPropertiesToShadowUser);
//api to shadow user properties
app.get('/list_shadow_manager_properties',
  (req, res, next) => { permissions.validate_permission([access.AccessPermission.Write, access.AccessPermission.Manager], req, res, next); },
  accessController.getShadowManagerProperties);

//sujith - ApI TO create company
app.post('/create_company',
  (req, res, next) => { permissions.validate_permission([access.AccessPermission.Write], req, res, next); },
  companyValidator.createCompanyValidator, companyController.addCompany);
//sujith - api to get all companies
app.get('/all_company/:company_id',
  (req, res, next) => { permissions.validate_permission([access.AccessPermission.Read], req, res, next); },
  companyController.getAllCompanies)
//sujith - api to get company by id
app.get('/company_id',
  (req, res, next) => { permissions.validate_permission([access.AccessPermission.Read], req, res, next); },
  companyController.getCompanyInfoById)

// tenant
// hema - api to get all tenants
app.get('/all_tenants/:property_manager_id',
  (req, res, next) => { permissions.validate_permission([access.AccessPermission.Read], req, res, next); },
  userController.getAllTenant);
// hema - api to update tenant
app.post('/update_tenant',
  (req, res, next) => { permissions.validate_permission([access.AccessPermission.Write], req, res, next); },
  userValidator.createTenantValidator, userController.updateTenant);
//hema- api get tenant by id
app.get('/tenant/:id',
  (req, res, next) => { permissions.validate_permission([access.AccessPermission.Read], req, res, next); },
  userController.getByTenantId);
// hema - api to delete tenant
app.delete('/delete_tenant/',
  (req, res, next) => { permissions.validate_permission([access.AccessPermission.Manager], req, res, next); },
  userController.deleteTenant);
//hema - api to delete all tenant
// app.delete('/delete_all_tenant', 
// (req, res, next) => { permissions.validate_permission([access.AccessPermission.Never], req, res, next);},
// userController.deleteAllTenant);
// hema - assign tenant to the property
app.post('/assign_tenant',
  (req, res, next) => { permissions.validate_permission([access.AccessPermission.Manager], req, res, next); },
  rentalController.assignTenant);
// get multiple tenant info by their ids
app.get('/get_multiple_tenant_info_by_id',
  (req, res, next) => { permissions.validate_permission([access.AccessPermission.Read], req, res, next); },
  userController.getMultipleTenantDetails)


// Answers
app.post('/add_answer',
  (req, res, next) => { permissions.validate_permission([access.AccessPermission.Write], req, res, next); },
  answerValidator.validateItem, answerController.addAnswer);
//hema- api get answer by id
app.get('/answer',
  (req, res, next) => { permissions.validate_permission([access.AccessPermission.Read], req, res, next); },
  answerController.getByAnswer);
//api get answer by rental id and unit id
app.get('/get_answers',
  (req, res, next) => { permissions.validate_permission([access.AccessPermission.Read], req, res, next); },
  answerController.getAnswerOfTenant);
//api to get the questionnaire id by 


// Rental
// hema - all tenants under rental tabel
app.get('/get_rentals_by_tenant_id',
  (req, res, next) => { permissions.validate_permission([access.AccessPermission.Read], req, res, next); },
  rentalController.getRentalsByTenantId);
// hema - all tenants under rental tabel
app.get('/get_rentals_by_unit_id',
  (req, res, next) => { permissions.validate_permission([access.AccessPermission.Read], req, res, next); },
  rentalController.getRentalsByUnitId);
// hema - api to create rental
app.get('/all_rentals/:property_id',
  (req, res, next) => { permissions.validate_permission([access.AccessPermission.Manager], req, res, next); },
  rentalController.getAllRental);
//hema - api to fetch rental questionnaires
//This api fetches the collection of all questionnaires required for the rental unit.
app.get('/rental_questionnaires/:rental_id',
  (req, res, next) => { permissions.validate_permission([access.AccessPermission.Read], req, res, next); },
  rentalController.getRentalQuestionnaire);
// api to get rental details
app.get('/get_rental_details',
  (req, res, next) => { permissions.validate_permission([access.AccessPermission.Read], req, res, next); },
  rentalController.getRentalDetails);
//hema - api to fetch rental questionnaires
//This api updates the collection of rental with the required QA forms.
app.post('/send_client_form/',
  (req, res, next) => { permissions.validate_permission([access.AccessPermission.Write], req, res, next); },
  rentalController.sendClientForm);
// api to change status to review
app.post('/change_status',
  (req, res, next) => { permissions.validate_permission([access.AccessPermission.Write], req, res, next); },
  answerController.changeStatus);
// api to change status to reject
app.post('/change_status_reject',
  (req, res, next) => { permissions.validate_permission([access.AccessPermission.Write], req, res, next); },
  answerController.changeStatusToReject);
app.post('/remove_questionnaire_for_tenant',
  (req, res, next) => { permissions.validate_permission([access.AccessPermission.Manager], req, res, next); },
  answerController.removeQuestionnaireForTenant);

// notification
//hema- create notification 
app.post('/add_notification',
  (req, res, next) => { permissions.validate_permission([access.AccessPermission.Write], req, res, next); },
  notificationController.addNotification);
//hema- update notification
app.post('/update_notification',
  (req, res, next) => { permissions.validate_permission([access.AccessPermission.Read], req, res, next); },
  notificationController.setNotificationStatusById);
//hema- get notification by user
app.get('/get_notification',
  (req, res, next) => { permissions.validate_permission([access.AccessPermission.Read], req, res, next); },
  notificationController.getNotificationsByUser);
//sujith - Create message
app.post('/create_message',
  (req, res, next) => { permissions.validate_permission([access.AccessPermission.Read], req, res, next); },
  notificationValidator.addMessage, notificationController.addMessage);
//Sujith - get all message
app.get('/get_all_message',
  (req, res, next) => { permissions.validate_permission([access.AccessPermission.Read], req, res, next); },
  notificationController.getAllMessages);


//Blob storage
// api to upload file in blob storage
app.post('/upload/document',
  (req, res, next) => { permissions.validate_permission([access.AccessPermission.Write], req, res, next); },
  blobController.uploadDocument);
//api to view specific document
app.get('/view/document',
  (req, res, next) => { permissions.validate_permission([access.AccessPermission.Read], req, res, next); },
  blobController.viewDocument);
// api to view all document
app.get('/view/all/document',
  (req, res, next) => { permissions.validate_permission([access.AccessPermission.Read], req, res, next); },
  blobController.viewAllDocument);
// api to download blob 
app.get('/download/document',
  (req, res, next) => { permissions.validate_permission([access.AccessPermission.Read], req, res, next); },
  blobController.downloadDocument);
// delete file
app.delete('/delete/file',
  (req, res, next) => { permissions.validate_permission([access.AccessPermission.Write], req, res, next); },
  blobController.deleteForm)
// upload signed document by property manager
app.post('/upload/propertymanager/signed/document',
  (req, res, next) => { permissions.validate_permission([access.AccessPermission.Write], req, res, next); },
  blobController.uploadSignedDocumentByPropertyManager);
// view property manager signed document
app.post('/view/propertymanager/signed/document',
  (req, res, next) => { permissions.validate_permission([access.AccessPermission.Read], req, res, next); },
  blobController.viewSignedDocumentByPropertyManager);

//mapping Blob form
app.post('/add_form',
  (req, res, next) => { permissions.validate_permission([access.AccessPermission.Write], req, res, next); },
  blobController.addForm);
//api to view specific mapped form
app.get('/view_form',
  (req, res, next) => { permissions.validate_permission([access.AccessPermission.Read], req, res, next); },
  blobController.viewForm,);
//// sujithkumar -Api to save uploaded  signed documents
app.post('/upload/signed/document',
  (req, res, next) => { permissions.validate_permission([access.AccessPermission.Write], req, res, next); },
  blobController.uploadSignedDocument);
//sujithkumar -Api to view signed uploaded documents
app.get('/view/signed/document',
  (req, res, next) => { permissions.validate_permission([access.AccessPermission.Read], req, res, next); },
  blobController.viewSignedDocument);
  //Api  to upload review document
  app.post('/upload/review/document',
  (req, res, next) => { permissions.validate_permission([access.AccessPermission.Write], req, res, next); },
  blobController.uploadReviewedDocument);
  //Api to view review document
  app.get('/view/review/document',
  (req, res, next) => { permissions.validate_permission([access.AccessPermission.Read], req, res, next); },
  blobController.viewReviewedDocument);


module.exports = app; // Export the app for testing
