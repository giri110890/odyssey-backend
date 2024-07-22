const { getAllRecord, getMappingOfForm, getMultipleQuestionCodeDetails, createField, getField, updateMapping, getMappingDetails, getMultipleFormDetailsUsingQAId, removeFormMappings, deleteField, emptyFieldTable, updateField } = require('../../data_store/mapping')
const config = require('../../../config/config');
const { getQuestionnaireById, putQuestionnaire } = require('../../data_store/questionnaire')
const { validationResult } = require('express-validator');
const uuid = require('uuid');
const { getPropertyById } = require('../../data_store/data_store_azure_cosmos')
const { FieldType } = require('../../enum/status');
const { addField, createCommonField, getAllFields,getStandardQuestionsForCodeFromCSV } = require('../../services/mapping_service');
const { getAllCustomFields } = require('../../data_store/mapping');
const { getQuestionDetails } = require('../../data_store/questionnaire');
const FormDatabaseConfig = {
    endpoint: config.endpoint,
    key: config.key,
    databaseId: config.database.id,
    containerId: config.container.forms,
};
const FieldDatabaseConfig = {
    endpoint: config.endpoint,
    key: config.key,
    databaseId: config.database.id,
    containerId: config.container.fields,
};

//field
// hema - api to add question_code
/*input: {
        "questionnaireID": "352fc1fb-3af9-4280-8c11-ff6a5cf47639",
        "question_code": "PROPERTY_NAME",
        "label": "Property name",
        "questionID": "76b70c77-59a6-4e14-8dfd-7fcacd6a3eea",
    }, -> body
*/
async function addQuestionCode(req, res) {
    try {
        let property_manager_id = req.query.property_manager_id;
        if (!property_manager_id) {
            return res.status(400).json({ error: "Property_manager_id not provided" });
        }
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }
        let question_code = req.body;
        question_code.property_manager_id = property_manager_id;
        question_code.field_type = FieldType;
        let result = await addField(question_code, property_manager_id, FieldDatabaseConfig);
        res.status(200).json(result)
    } catch (error) {
        console.log("Add question code error:", error);
    }
}
// hema - api to remove field
async function removeField(req, res) {
    try {
        let field_id = req.query.field_id;
        let property_manager_id = req.query.property_manager_id;
        if (property_manager_id && field_id) {
            let remove_field = await deleteField(field_id, property_manager_id, FieldDatabaseConfig)
            if (remove_field == true) {
                res.status(200).json({ message: "Field deleted successfully", status: true, deleted_id: field_id })
            } else {
                res.status(400).json({ error: "Error while deleting field", status: false })
            }

        } else {
            res.status(400).json({ error: "Property manager id / field is missing" })
        }
    } catch (error) {
        console.log(error)
    }
}

// hema - api to update questionnaire using form fields
async function updateQuestionnaireByFormFields(req, res) {
    try {
        let property_manager_id = req.query.property_manager_id;
        let questionnaire_id = req.query.questionnaire_id;
        let form_id = req.query.form_id;
        if (!property_manager_id) {
            return res.status(400).json({ error: "Property_manager_id not provided" });
        }
        if (!questionnaire_id) {
            return res.status(400).json({ error: "questionnaire_id not provided" });
        }
        if (!form_id) {
            return res.status(400).json({ error: "form_id not provided" });
        }
        let form_mapping = await getMappingOfForm(form_id, FormDatabaseConfig);
        let form_to_send = null;
        //Form_mapping gets duplicated
        if (Array.isArray(form_mapping)) {
            if (form_mapping.length > 1) {
                form_to_send = [form_mapping[1]]
            }
            else {
                form_to_send = [form_mapping[0]];
            }
        }
        else {
            form_to_send = form_mapping;
        }
        let formMappings = form_to_send;
        let notAvailableQuestions = [];
        let questionnaire = await getQuestionnaireById(questionnaire_id);
        if (formMappings && formMappings.length > 0) {
            if (questionnaire && questionnaire.length > 0) {
                formMappings[0].fields.forEach(_field => {
                    let foundField = questionnaire[0].questions.find(_question => _field.question_code === _question.code)
                    if (!foundField) {
                        notAvailableQuestions.push(_field);
                    }
                });
                let question_codes = notAvailableQuestions.map(_question => _question.question_code)    // filter the question code
                let code_details = await getMultipleQuestionCodeDetails(question_codes, property_manager_id, FieldDatabaseConfig) // get the code details (contains questionnaire id and question id)
                let standard_code_details = await getStandardQuestionsForCodeFromCSV(question_codes); // get code from csv file
                let all_unavailable_codes = [...code_details, ...standard_code_details];
                let new_questions = [];
                if (all_unavailable_codes && all_unavailable_codes.length > 0) {
                    let question_id_of_code = await Promise.all(all_unavailable_codes.map(async _question => {
                        if (_question.questionnaireID) {
                            let question = await getQuestionnaireById(_question.questionnaireID)

                            question.forEach(_questionnaire => { // from questionnaire filter the questions
                                let foundOuestion = _questionnaire.questions.find(_question_id => _question_id.id == _question.questionID)
                                if (foundOuestion) {
                                    foundOuestion.source = null;    // update new questions target and source to null
                                    foundOuestion.options.forEach(_target => {
                                        _target.target = null
                                    })

                                    new_questions.push(foundOuestion)   //push new questions
                                }

                            })
                        } else if (_question.text) {
                            inlineQuestion = {
                                source: null,
                                code: _question.question_code,
                                label: _question.label,
                                description: _question.description,
                                text: _question.text,
                                options: _question.options,
                                answer_type: _question.answer_type,
                                id: _question.id
                            };

                            new_questions.push(inlineQuestion);
                        }
                        else {
                            console.log("this question nas no question id")
                        }


                    }))

                }
                let old_questions = questionnaire[0].questions || [];
                // if (old_questions.length > 0) {    // update old questions target and source to null
                //     old_questions.forEach(_question => {
                //         _question.source = null;
                //         _question.options.forEach(_target => {
                //             _target.target = null;
                //         })
                //     })
                // }

                let all_mapped_codes = formMappings[0].fields.map(_codeField => _codeField.question_code);
                let filteredQuestions = old_questions.filter(_question => all_mapped_codes.includes(_question.code));
                let updated_questions = [];
                if (filteredQuestions && new_questions.length > 0) {
                    updated_questions = [...filteredQuestions, ...new_questions] // merg both questions
                }
                else if (filteredQuestions.length) {
                    updated_questions = filteredQuestions;
                }
                questionnaire[0].questions = updated_questions;
                let _rootQuestion = questionnaire[0]?.questions.find(_question => _question.question_id == "root");
                if (!_rootQuestion && questionnaire[0]?.questions[0]) {
                    questionnaire[0].questions[0].question_id = "root";
                }
                // update questionnaire
                let updated_questionnaire = await putQuestionnaire(questionnaire[0].id, questionnaire[0])    // update questionnaire

                if (updated_questionnaire.id) {
                    res.status(200).json({ message: "Questionnaire updated successfully", id: questionnaire_id })
                } else {
                    res.status(400).json({ error: "Error while updateQuestionnaireByFormFields" })
                }
            } else {
                res.status(400).json({ error: "Questionnaire has no details" })
            }
        } else {
            res.status(400).json({ error: "Mappings has no details" })
        }

    } catch (error) {
        console.log("Add question code error:", error);
    }
}

// hema api to get question code by form id
// input -> property _manager _id in query
async function getAllQuestionCode(req, res) {
    try {
        let property_manager_id = req.query.property_manager_id;
        if (!property_manager_id) {
            return res.status(400).json("Property_manager_id not provided");
        }
        let all_code = await getAllFields(property_manager_id, req.query.questionnaire_id, FieldDatabaseConfig);
        res.status(200).json(all_code);
    }
    catch (error) {
        console.log("Get all question code error");
    }
}
/*
output:
   [ {
        "label": "property_name",
        "question_code": "PROPERTY_NAME",
        "property_manager_id": "c458f4a8-c0f1-7051-261d-09cb8b007f51",
        "id": "82dd7e6c-6a17-4bd2-924f-6398ca173c83",
        "_rid": "vz0iALe-QacBAAAAAAAAAA==",
        "_self": "dbs/vz0iAA==/colls/vz0iALe-Qac=/docs/vz0iALe-QacBAAAAAAAAAA==/",
        "_etag": "\"9812525a-0000-0100-0000-657a9db40000\"",
        "_attachments": "attachments/",
        "_ts": 1702534580
    },{....} ]
*/
// sujith - api to create common field
async function generateCommonFields(req, res) {
    try {
        let common_field = await createCommonField(FieldDatabaseConfig);
        res.status(200).json({ message: "Fields generated successfully" });
    } catch (error) {
        console.log("generate common field error");
    }
}
// form


// hema - api to add mapping of a form with specific page( specific page and its mapping)
/*
input:
{
    "form_id": "7",
    "fields": [
        {
            "position": [50, 70, 100, 200],
            "question_code": "PROPERTY_OWNER",
            "pg_no": "1"
        }
    ],
    "form_title": "Resident Notification Letter"
}
*/
async function addMappings(req, res) {
    try {
        let new_mapping = req.body.fields[0];   //read the input mapping
        let property_manager_id = req.query.property_manager_id;
        if (!property_manager_id) {
            return res.status(400).json("Property_manager_id not provided");
        }
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }
        let form_data = req.body;
        let form_id = form_data.form_id;
        let current_form;
        let form_details = await getMappingOfForm(form_id, FormDatabaseConfig)
        if (form_details.length == 0) {
            form_data.property_manager_id = property_manager_id;
            let form_mappings = await createField(form_data, FormDatabaseConfig);
            res.status(200).json({ message: "Field added successfully", id: form_mappings.id });
        } else {
            if (form_details.length == 1) {
                current_form = form_details[0];
            }
            else {
                current_form = form_details[1];
            }
            let updated_fields = [...current_form.fields, new_mapping];
            current_form.fields = updated_fields;

            current_form.property_manager_id = property_manager_id;
            let form_mappings = await updateMapping(current_form.id, current_form, FormDatabaseConfig);
            res.status(200).json({ message: "Field Updated successfully", id: form_mappings.id });
        }
    } catch (error) {
        console.log("Add mappings error");
    }

}
// add initial dummy mappings for linking questionaire with form
async function addEmptyMapping(form_name, property_manager_id) {
    let form_data = {
        form_id: form_name,
        fields: [
            {
                id: uuid.v4(),
                pg_no: 0,
                position: [
                    {
                        X: 0,
                        Y: 0
                    },
                    {
                        X: 0,
                        Y: 0
                    },
                    {
                        X: 0,
                        Y: 0
                    },
                    {
                        X: 0,
                        Y: 0
                    }
                ],
                "question_code": "INITIAL"
            }
        ],
        form_title: form_name,
    };
    form_data.property_manager_id = property_manager_id;
    let form_mappings = await createField(form_data, FormDatabaseConfig);
    if (form_mappings.id) {
        return form_mappings
    } else {
        console.log("Error in adding empty field")
    }
}

// update maping
async function removeMappings(req, res) {
    try {
        let property_manager_id = req.query.property_manager_id;
        if (property_manager_id) {
            let form_id = req.query.form_id;
            let field_id = req.query.field_id;

            let form_info;
            let form_details = await getMappingOfForm(form_id, FormDatabaseConfig);
            if (form_details.length == 1) {
                form_info = form_details[0];
            } else {
                form_info = form_details[1];
            }

            let field_found = form_info.fields.findIndex(_fields => _fields.id === field_id);
            if (field_found > -1) {
                form_info.fields.splice(field_found, 1);

                let form_mappings = await updateMapping(form_info.id, form_info, FormDatabaseConfig);
                res.status(200).json({ message: "Field Updated successfully", id: form_mappings.id });
            } else {
                res.status(200).json({ error: "Error Field Updated" });
            }


        } else {
            res.status(400).json({ error: "Property_manager_id not provided" });
        }

    } catch (error) {
        console.log("Add mappings error");
    }
}
//hema- api to get all mapped form 
async function getMappedForms(req, res) {
    try {
        let property_manager_id = req.query.property_manager_id;
        if (!property_manager_id) {
            return res.status(400).json("Property_manager_id not provided");
        }
        let all_form = await getAllRecord(property_manager_id, FormDatabaseConfig)
        let filtered_result = all_form.map(_form => ({ formID: _form.form_id, name: _form.form_title, id: _form.id, checked: false, available: true, enabled: true, qaId: _form.qaId }))
        // filtering only the form id, qa id and its status
        res.status(200).json(filtered_result);
    } catch (error) {
        console.log("Get mapped form error");
    }
}
/*
sample output:
[
    {
        "formID": "1",
        "name": "Resident Notification Letter",
        "id": "0a13b2e2-82c7-4179-8f28-9247397aca31",
        "checked": false,
        "availabel": true,
        "enabled": true
    }, ....
]
*/
// api to get form data by QA id
async function getFormdataByQaId(req, res) {
    try {
        let property_manager_id = req.query.property_manager_id;
        if (req.query.property_id) {
            let property_info = await getPropertyById(req.query.property_id);
            if (Array.isArray(property_info) && property_info.length > 0) {
                property_manager_id = property_info[0].property_manager_id;
            }
        }
        if (!property_manager_id) {
            return res.status(400).json("Property_manager_id not provided");
        }
        let qaId = req.query.qaId;
        if (qaId) {
            let all_form = await getAllRecord(property_manager_id, FormDatabaseConfig);
            let from_with_qaId = all_form.filter(form => form.qaId === qaId)

            res.status(200).json(from_with_qaId);
        } else {
            res.status(400).json("QA Id not available");
        }

    } catch (error) {
        res.status(400).json("Get form data by QA Id error")
    }
}
// hema - api to get mapping of a form id
async function getMappingByFormId(req, res) {
    try {
        let form_id = req.query.form_id;
        if (!form_id) {
            return res.status(400).json("form_id not provided");
        }
        let form_mapping = await getMappingOfForm(form_id, FormDatabaseConfig);
        let form_to_send = null;
        //Form_mapping gets duplicated
        if (Array.isArray(form_mapping)) {
            if (form_mapping.length > 1) {
                form_to_send = [form_mapping[1]]
            }
            else {
                form_to_send = [form_mapping[0]];
            }
        }
        else {
            form_to_send = form_mapping;
        }

        res.status(200).json(form_to_send);
    } catch (error) {
        console.log("Get all mapped form error");
    }

}
/*
sample output:
[
    {
        "form_id": "2",
        "pg_no": "1",
        "fields": [
            {
                "position": [
                    89,
                    988,
                    344
                ],
                "question_code": "UNIT_NO"
            }
        ],
        "form_title": "Resident Notification Letter",
        "property_manager_id": "c458f4a8-c0f1-7051-261d-09cb8b007f51",
        "id": "f1f35afd-c494-4889-b15a-6a913186f71e",
        "_rid": "vz0iAN9VCjcEAAAAAAAAAA==",
        "_self": "dbs/vz0iAA==/colls/vz0iAN9VCjc=/docs/vz0iAN9VCjcEAAAAAAAAAA==/",
        "_etag": "\"9300bb95-0000-0100-0000-657aa9af0000\"",
        "_attachments": "attachments/",
        "_ts": 1702537647
    }
]
*/

// api to update mapping position (only position ie, resize)
async function updateMappingPosition(req, res) {
    try {
        let form_id = req.query.form_id;
        let field_id = req.query.field_id;
        let position = req.body.position;
        let property_manager_id = req.query.property_manager_id;
        let form_info;
        if (property_manager_id) {
            if (form_id && field_id) {
                if (Array.isArray(position) && position.length > 0) {
                    let all_mappings = await getMappingOfForm(form_id, FormDatabaseConfig);
                    if (all_mappings.length == 1) {
                        form_info = all_mappings[0];
                    } else {
                        form_info = all_mappings[1];
                    }
                    // if (Array.isArray(all_mappings) && all_mappings.length > 0) {
                    //     let current_form_mapping = all_mappings[0];
                    if (form_info.fields && form_info.fields.length > 0) {
                        let found_field = form_info.fields.find(_field => _field.id == field_id)
                        if (found_field) {
                            found_field.position = position;

                            // update mappings
                            let updated_form_mappings = await updateMapping(form_id, form_info, FormDatabaseConfig);
                            if (updated_form_mappings.id) {
                                res.status(200).json({ message: "Form updated successfully", formID: form_id, field_id: field_id, status: true })
                            } else {
                                res.status({ error: "Update mapping position error", status: false })
                            }

                        } else {
                            res.status(400).json({ error: "No field found with this field id" })
                        }

                    } else {
                        res.status(400).json({ error: "Field array is empty" })
                    }

                    // } else {
                    //     res.status(400).json({ error: "Form has no details" })
                    // }


                } else {
                    res.status(400).json({ error: "Position array is empty" })
                }

            } else {
                res.status(400).json({ error: "Form id / field id not provided" });
            }
        } else {
            res.status(400).json({ error: "Property manager id not found" })
        }
    } catch (error) {
        console.log(error)
    }
}


// api to link questionnaire ad along with form info
/*
property_manager_id -> query
questionnaire id and cosmos generated form id in body
*/
async function associateFormAndQuestionnaire(req, res) {
    try {
        let property_manager_id = req.query.property_manager_id;
        if (property_manager_id) {
            let questionnaire_id = req.body.questionnaire_id;
            let form_unique_id = req.body.id;
            let form_data;
            let existing_form_data;
            //check if existing mapping found
            let all_form = await getAllRecord(property_manager_id, FormDatabaseConfig);
            let from_with_qaId = all_form.filter(form => form.qaId === questionnaire_id) // filter it by questionnaire id

            from_with_qaId.map(async _form => {
                _form.qaId = null;
                let update_form_qaId = await updateMapping(_form.id, _form, FormDatabaseConfig)
            });

            let form_details = await getMappingDetails(form_unique_id, FormDatabaseConfig);
            if (form_details.length == 0) {
                return res.status(400).json("Form details are empty");
            } else {
                if (form_details.length == 1) {
                    form_data = form_details[0];
                }
                else {
                    form_data = form_details[1];
                }
                form_data.qaId = questionnaire_id;  // updating the questionnaire in
                let form_name = form_data.form_title;
                let name = form_name.split('/');
                let file_name = name[name.length - 1];

                let update_form_data = await updateMapping(form_unique_id, form_data, FormDatabaseConfig)
                res.status(200).json({ message: `Questionnaire linked successfully with ${file_name}`, file_name: update_form_data.id });
            }


        }
    } catch (error) {
        console.log("Error in associate form and questionnaire");
    }
}
// associate questionnaire with form
async function associateQuestionnaireWithFormName(property_manager_id, questionnaire_id, form_name) {
    try {
        // let all_form = await getAllRecord(property_manager_id, FormDatabaseConfig);
        // let form_id = all_form.find(_form => _form.form_title == form_name);
        // if (!form_id) { // if it is new form add mappings (to show in all mapped record)
        //     let addInitialMapping = await addEmptyMapping(form_name, property_manager_id);
        // }
        let mapped_form = await getAllRecord(property_manager_id, FormDatabaseConfig);
        let mapped_form_id = mapped_form.find(_form => _form.form_title == form_name)
        let from_with_qaId = mapped_form.filter(form => form.qaId === questionnaire_id) // filter it by questionnaire id

        from_with_qaId.map(async _form => {
            _form.qaId = null;
            let update_form_qaId = await updateMapping(_form.id, _form, FormDatabaseConfig)
        });

        let form_details = await getMappingDetails(mapped_form_id.id, FormDatabaseConfig);
        if (form_details.length == 0) {
            return res.status(400).json("Form details are empty");
        } else {
            if (form_details.length == 1) {
                form_data = form_details[0];
            }
            else {
                form_data = form_details[1];
            }
            form_data.qaId = questionnaire_id;  // updating the questionnaire in
            let form_name = form_data.form_title;
            let name = form_name.split('/');
            let file_name = name[name.length - 1];

            let update_form_data = await updateMapping(mapped_form_id.id, form_data, FormDatabaseConfig)
            return update_form_data;
        }
    } catch (error) {
        console.log(error)
    }
}
// get mapping details by qa ids
async function getFormDetailsUsingQAId(qaids) {
    try {
        let qa_ids = qaids;
        let qa_details = await getMultipleFormDetailsUsingQAId(qa_ids, FormDatabaseConfig)
        return qa_details
    } catch (error) {
        console.log(error)
    }
}
// delete mapped form
async function deleteMappedForm(req, res) {
    try {
        let id = req.query.id;
        let result = await removeFormMappings(id, FormDatabaseConfig);
        if (result == true) {
            res.status(200).json({ status: true, id: id, message: "deleted successfully" })
        } else {
            res.status(400).json({ status: false, id: id, message: "Error while deleting mapped form" })
        }
    } catch (error) {

    }
}

// hema - api to clear field table (only for office purpose)
async function clearFieldTable(req, res) {
    try {
        let delete_field = await emptyFieldTable(FieldDatabaseConfig)
        res.status(200).json({ status: true, message: "deleted successfully" })
    } catch (error) {
        console.log(error)
    }
}
async function migrateOldCustomField(req, res) {
    try {
        let property_manager_id = req.query.property_manager_id;
        let custom_fields = await getAllCustomFields(property_manager_id, FieldDatabaseConfig);
        let updatedCustomFields = await Promise.all(custom_fields.map(async _field => {
            let questionnaire = await getQuestionnaireById(_field.questionnaireID);
            let question = await getQuestionDetails(_field.questionID);
            if (question.length > 0) {
                // Update the fields
                _field.answer_type = question[0].q.answer_type; // Update answer_type
                _field.question_code = question[0].q.code;
                _field.text = question[0].q.text;
                _field.description = question[0].q.description;
                _field.options = question[0].q.options;
                delete _field.questionID;
                delete _field.questionnaireID;
                let updatedQuestion = _field;
                let updated_field = await updateField(property_manager_id, updatedQuestion, FieldDatabaseConfig);
                res.status(200).json({ message: "update  successfully" })
            }
            else {
                return res.status(200).json("Question id  not found");
            }
        }));

    } catch (error) {
        console.log("Error in updating old custom fields");
    }
}
module.exports = {
    addQuestionCode,
    removeField,
    getAllQuestionCode,
    getMappedForms,
    getMappingByFormId,
    addMappings,
    removeMappings,
    associateFormAndQuestionnaire,
    getFormdataByQaId,
    getFormDetailsUsingQAId,
    deleteMappedForm,
    associateQuestionnaireWithFormName,
    addEmptyMapping,
    updateQuestionnaireByFormFields,
    updateMappingPosition,
    generateCommonFields,
    clearFieldTable,
    migrateOldCustomField
}