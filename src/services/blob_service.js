const { getRentalById, putRental } = require('../data_store/rentals')
const { getPropertyById } = require('../data_store/data_store_azure_cosmos')
const { getTenantById } = require('../data_store/users')
const { sendNotification, sendEmailNotification, addNotification } = require('../routes/controllers/notificationController')
const { FormStatus } = require('../enum/status')
const config = require('../../config/config')
const databaseConfig = {
    endpoint: config.endpoint,
    key: config.key,
    databaseId: config.database.id,
    containerId: config.container.rentals,
};



// hema - function to send notification for bith tenant and property manager
async function sendNotificationToUsers(property_id, rental_id, tenant_id, document_name) {
    try {
        let status = false;
        let rental_details = await getRentalById(rental_id);
        let unit_id = rental_details[0].unit_id
        let property_details = await getPropertyById(property_id);
        let unit_details = property_details[0].units.filter(_unit => _unit.id == unit_id);
        let unit_name = unit_details[0].unit_id;
        let tenant_details = await getTenantById(tenant_id);
        let tenant_name = tenant_details[0].first_name;
        let property_manager_id = tenant_details[0].property_manager_id;
        let property_manager_details = await getTenantById(property_manager_id);
        let property_manager_email = property_manager_details[0].email
        //   let document_name = document_full_name.substring(document_full_name.lastIndexOf('/') + 1);
        let property_manager_notification = await sendNotification("propertyMangerAfterTenantSignUpload", { property_id, tenant_name, document_name: document_name, unit_name ,unit_id,tenant_id})
        let tenant_notification = await sendNotification("tenantAfterSignUpload", { document_name: document_name, unit_name });
        let tenant_email_notification = await sendEmailNotification(tenant_notification, tenant_details[0].email)
        let property_manager_email_notification = await sendEmailNotification(property_manager_notification, property_manager_email)
        let notification_response = await addNotification(property_manager_notification, tenant_notification, tenant_id, property_manager_id)
        if (notification_response) {
            let formID = `${property_manager_id}/${document_name}`;
            // change form status
            let change_form_status = await changeFormStatusToSigned(rental_details, tenant_id, formID)
            if (change_form_status == true) {
                status = true
            } else {
                status = false
            }
        }
        return status;
    } catch (error) {

    }
}

// hema - function to change its fome status
async function changeFormStatusToSigned(rental_details, tenant_id, formID) {
    try {
        let status = false;
        let tenantQuestionnaire = rental_details[0].requiredQAs.find(_qa => _qa.tenant_id == tenant_id)
        tenantQuestionnaire.requiredForms.map(_form => {
            if (_form.title == formID) {
                _form.status = FormStatus.Signed;  //CHANGE FORM STATUS TO PENDING
            }
            else {
                return _form
            }
        })
        // update rental
        let updated_result = await putRental(rental_details[0].id, rental_details[0], databaseConfig)
        if (updated_result.id) {
            status = true;
        } else {
            console.log("Error in updating status")
            status = false;
        }
        return status;
    } catch {
        console.log(error)
    }
}
async function changeFormStatusToSubmitted(rental_id, tenant_id, formID) {
    try {
        let status = false;
        let rental_details = await getRentalById(rental_id)
        let tenantQuestionnaire = rental_details[0].requiredQAs.find(_qa => _qa.tenant_id == tenant_id)
        tenantQuestionnaire.requiredForms.map(_form => {
            if (_form.title == formID) {
                _form.status = FormStatus.Submitted;  //CHANGE FORM STATUS TO PENDING
            }
            else {
                return _form
            }
        })
        // update rental
        let updated_result = await putRental(rental_details[0].id, rental_details[0], databaseConfig)
        if (updated_result.id) {
            status = true;
        } else {
            console.log("Error in updating status")
            status = false;
        }
        return status;
    } catch {
        console.log(error)
    }
}
module.exports = {
    sendNotificationToUsers,
    changeFormStatusToSubmitted
}