
const { getField, createField, getAllRecord, getAllCommonFields, validateCommonField } = require('../data_store/mapping');
const { getQuestionnaireById } = require('../data_store/questionnaire');
const uuid = require('uuid')

// sujith- api to add fields
async function addField(question_code, property_manager_id, FieldDatabaseConfig) {
    try {
        let validate_field = await getField(question_code, property_manager_id, FieldDatabaseConfig);
        if (validate_field.length > 0) {
            return { error: "Code or label already exists. Please use a different code or label." };
        } else {
            let add_field = await createField(question_code, FieldDatabaseConfig);
            return { message: "Field added successfully", id: add_field.id };
        }

    } catch (error) {
        console.log(error)
    }
}

// Read csv files and return standard field codes and questions.
async function readStandardQuestionsFromCSVs() {
    const csv = require('csvtojson');
    const fs = require('fs');
    const questionsDir = './src/services/questions';
    const files = fs.readdirSync(questionsDir);
    const questions = [];
    for (const file of files) {
        const data = await csv().fromFile(questionsDir + '/' + file);
        let convertedData = convertStandardQuestions(data);
        questions.push(...convertedData);
    }
    return questions;
}

async function getStandardQuestionsForCodeFromCSV(newlyMappedCodes) {
    let _all_standard_questions = await readStandardQuestionsFromCSVs();
    let newlyMappedStandardCodes = _all_standard_questions.filter(_standard_code => newlyMappedCodes.indexOf(_standard_code.question_code) !== -1);
    return newlyMappedStandardCodes;
}

function convertStandardQuestions(standard_questions) {
    return standard_questions.map(question => ({
        rank: question.Rank,
        text: question.Question,
        description: question.QuestionInfo,
        answer_type: question.AnswerType,
        label: question.FieldName,
        question_code: question.FieldCode,
        field_type: question.Category,
        options: getDefaultOptionsByAnswerType(question.AnswerType, question.Options),
        id: uuid.v4()
    }));
}

function getDefaultOptionsByAnswerType(answer_type, options) {
    let option = null;
    switch (answer_type) {
        case "text_short":
            option = [{
                target: null,
                value: "text",
                answerType: answer_type

            }
            ]
            break;

        case "radio":
            option = [
                {
                    target: null,
                    value: "YES",
                    answerType: "boolean"
                },
                {
                    target: null,
                    value: "NO",
                    answerType: "boolean"
                }
            ];
            break;
        case "currency":
            option = [{
                target: null,
                value: "currency",
                answerType: answer_type
            }
            ];
            break;
        case "file":
            option = [{
                target: null,
                value: "File",
                answerType: answer_type
            }];
            break;
        case "date":
            option = [{
                target: null,
                value: "date",
                answerType: answer_type
            }]
            break;
        case "number":
            option = [{
                target: null,
                value: "number",
                answerType: answer_type
            }]
            break;

    }
    return option;
}


function csvToObject(csvString) {
    const objects = [];
    if (csvString) {
        // Split the CSV string into rows
        const rows = csvString.trim().split('\n');

        // Extract headers from the first row
        const headers = rows[0].split(',');

        // Iterate over the rows starting from the second row
        for (let i = 1; i < rows.length; i++) {
            // Split the row into columns
            const columns = rows[i].split(',');

            // Create an object for the current row
            const obj = {};

            // Iterate over the columns and assign values to the corresponding properties
            for (let j = 0; j < headers.length; j++) {
                obj[headers[j]] = columns[j];
            }

            // Push the object to the array
            objects.push(obj);
        }
    }

    return objects;
}

// hema - api to get field ( custom and common field)
async function getAllFields(property_manager_id, questionnaire_id, FieldDatabaseConfig) {
    try {
        // get any custom question codes that were created by the property manager
        let custom_fields = await getAllRecord(property_manager_id, FieldDatabaseConfig);

        let common_fields_and_questions = await readStandardQuestionsFromCSVs();

        // merge both comon and custom fields
        let all_fields = [...custom_fields, ...common_fields_and_questions]

        // If we have a questionnaire, get the questions as they will overwrite the standard questions.
        if (questionnaire_id) {
            let questionnaire = await getQuestionnaireById(questionnaire_id);
            all_fields = await Promise.all(all_fields.map(async _field => {

                let question = questionnaire[0]?.questions.find(_question => _question.code == _field.question_code);
                // Add question properties to the field e.g. text, description, answer_type
                if (question) {
                    _field.text = question.text;
                    _field.description = question.description;
                    _field.answer_type = question.answer_type;
                }
                return _field;

            }));
        }

        return all_fields
    } catch (error) {
        console.log(error)
    }
}
// sujith- api to get common field
async function createCommonField(FieldDatabaseConfig) {
    try {
        let add_field;
        let tenant_fields = await getCommonPropertyAndTenantFields("tenant");
        for (let key in tenant_fields) {
            //create question code
            let field = {
                question_code: key,
                label: key,
                field_type: "tenant"
            }
            console.log(field)
            let validate_tenant_field = await validateCommonField(field, FieldDatabaseConfig);
            if (validate_tenant_field.length == 0) {
                add_field = await createField(field, FieldDatabaseConfig);
                console.log(add_field)
                if (add_field.error) {
                    throw new Error(`Failed to add field for tenant: ${add_field.error}`);
                }
            } else {
                console.log("This common Field already exist ")
            }

        }
        // property code
        let property_fields = await getCommonPropertyAndTenantFields("property");
        for (let key in property_fields) {
            //create question code
            let field = {
                question_code: key,
                label: key,
                field_type: "property"
            }
            console.log(field)

            let validate_property_field = await validateCommonField(field, FieldDatabaseConfig);
            if (validate_property_field.length == 0) {
                add_field = await createField(field, FieldDatabaseConfig);
                console.log(add_field)
                if (add_field.error) {
                    throw new Error(`Failed to add field for tenant: ${add_field.error}`);
                }
            } else {
                console.log("This common Field already exist ")
            }
        }
    } catch (error) {
        console.log("get commom field error")
    }
}
async function getCommonPropertyAndTenantFields(code) {
    switch (code) {
        case "tenant":
            let tenant_data = {
                TENANT_RESIDENT_ID: "",
                TENANT_FIRST_NAME: "",
                TENANT_MIDDLE_NAME: "",
                TENANT_LAST_NAME: "",
                TENANT_SS_NUMBER: "",
                TENANT_POSTAL_CODE: "",
                TENANT_ETHNICITY: "",
                TENANT_RACE: "",
                TENANT_DATE_OF_BIRTH: "",
                TENANT_IDENTIFICATION_NUMBER: "",
                TENANT_IDENTIFICATION_STATE: "",
                TENANT_TEL_NUMBER: "",
                TENANT_CITY: "",
                TENANT_STATE: "",
                TENANT_IDENTIFICATION_TYPE: "",
                TENANT_EMAIL: "",
                TENANT_RELATIONSHIP: "",
                TENANT_HOUSE_SIZE: "",
                TENANT_DISABLE: "",
                TENANT_UNIT_NUMBER: "",
                TENANT_STUDENT_STATUS: "",
                TENANT_AFFORDABLE_OPTION: "",
                TENANT_UNIT_TYPE: "",
                TENANT_PROGRAM_TYPE: "",
                TENANT_NO_OF_HOUSEHOLD_MEMBER: "",
                TENANT_CURRENT_RENT: "",
                TENANT_SECURITY_DEPOSIT_HELD: ""
            }
            return tenant_data;
        case "property":
            let property_data = {
                PROPERTY_NAME: "",
                PROPERTY_LEGAL_NAME: "",
                PROPERTY_ADDRESS: "",
                PROPERTY_CITY: "",
                PROPERTY_STATE: "",
                PROPERTY_COUNTRY: "",
                PROPERTY_POSTAL_CODE: "",
                PROPERTY_COUNTY: "",
                PROPERTY_PHONE_NUMBER: "",
                PROPERTY_FAX_NUMBER: "",
                PROPERTY_EMAIL: "",
                PROPERTY_BILLING_EMAIL: "",
                PROPERTY_MANAGEMENT_AGENCY_NAME: "",
                PROPERTY_WEBSITE: "",
                PROPERTY_NO_OF_UNITS: ""
            }
            return property_data;
        default:
            return
    }
}


module.exports = {

    addField,
    createCommonField,
    getAllFields,
    getStandardQuestionsForCodeFromCSV

}