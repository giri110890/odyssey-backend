
const { sendEmail } = require("../../transport/mail");
const { notificationByUser, updateNotification, createNotification, updateNotificationStatus, createMessage, getAllMessage } = require('../../data_store/notification')
const { NotificationStatus } = require('../../enum/status');
const { getTenantById } = require('../../data_store/users')
const config = require('../../../config/config');
const { getRentalsUsingTenantId } = require('../../data_store/rentals')
const { getPropertyById } = require('../../data_store/data_store_azure_cosmos')
// const MessageDatabaseConfig = {
//   endpoint: config.endpoint,
//   key: config.key,
//   databaseId: config.database.id,
//   containerId: config.container.messages,
// };
const { validationResult } = require('express-validator');


// hema - to get all unit
async function getNotificationsByUser(req, res) {
  try {
    let user_id = req.query.user_id;
    let property_id = req.query.property_id;
    let all_records = await notificationByUser(user_id, property_id);
    res.status(200).json(all_records);
  } catch (error) {
    console.error('Get All Unit eeror');
  }
}


// sujith- update notification status

async function setNotificationStatusById(req, res) {
  try {
    const notification_ids = req.body.notification_ids;
    let update_notification = await updateNotificationStatus(notification_ids);
    if (update_notification == true) {
      res.status(200).json({ message: "Notification status updated successfully" });
    } else {
      res.status(400).json({ error: "Update notification error" })

    }
    // Send a response indicating success
  } catch (error) {
    console.error('setNotificationStatusById error:', error);
    // Send a response indicating failure
    res.status(500).json({ error: "An error occurred while updating notification status" });
  }
}


// hema - to add notification
/*
 for adding notification
 notification in body contains
 title,info,message,time and user_id
 */
async function addNotification(property_manager_notification, tenant_notification, user_id, property_manager_id) {
  try {
    if (user_id) {
      let user_notification = Object.assign({}, tenant_notification);
      delete user_notification.html
      user_notification.status = NotificationStatus.Unread;
      user_notification.user_id = user_id;
      user_notification.time_stamp = new Date().getTime();
      let user_notification_response = await createNotification(user_notification);

      let manager_notification = Object.assign({}, property_manager_notification);
      delete manager_notification.html
      manager_notification.status = NotificationStatus.Unread;
      manager_notification.time_stamp = new Date().getTime();
      manager_notification.user_id = property_manager_id;
      let manager_notification_response = await createNotification(manager_notification);
      return { manager_notification_response, user_notification_response }
    } else {
      return null;
    }
  } catch (error) {
    console.error('Add notification Error');
  }
}

async function emailContent(notification) {
  switch (notification.type) {
    case 'tenant_client_form':
      return (
        ` <img src="${config.odyssey_host}/_next/static/media/odyssey_logo_large.39580cec.png" alt="Odyssey Logo" style="width: 300px; height: auto; max-width: 400px; max-height: 100px;">
          <p>
            <br>
            Greetings from Odyssey! 
            <br><br>
            Some information has been requested from you relating to your household at ${notification.propertyName}. 
            <br>
            </p><p>
            If you already have an account, click here to <a href="${config.landing_page}">log in</a>.
            <br><br>
            If not, click here to <a href="${config.aws.cognito.cognito_sign_up_url}">sign up</a>.
                <br>            <br>
            If you have any questions, please contact your management team.
            <br><br>
          </p>
        `)
        ;
    case 'property_manager_client_form':
      return (
        `
        <img src="${config.odyssey_host}/_next/static/media/odyssey_logo_large.39580cec.png" alt="Odyssey Logo" style="width: 300px; height: auto; max-width: 400px; max-height: 100px;">
        <p> User dashboard link has been sent to ${notification.tenantName} In regards to Unit ${notification.unitName}
        <br><br>
      </p>`
      )
    case 'property_manager_after_answer':
      return (
        `
        <a href="${notification.redirectUrl}">Click here</a> to review their Task list.
        <p> Tenant  ${notification.tenant_name}  completed or uploaded a document. 
      </p>
        `
      )
    case 'tenant_after_answer':
      return (
        `
        <img src="${config.odyssey_host}/_next/static/media/odyssey_logo_large.39580cec.png" alt="Odyssey Logo" style="width: 300px; height: auto; max-width: 400px; max-height: 100px;">
        <p>"${notification.tenant_name}"  - Your document(s) has been submitted and will be reviewed shortly.
        <br><br>
      </p> `
      )

    case 'property_manager_after_reviewed':
      return (
        `
        <img src="${config.odyssey_host}/_next/static/media/odyssey_logo_large.39580cec.png" alt="Odyssey Logo" style="width: 300px; height: auto; max-width: 400px; max-height: 100px;">
          <p>"${notification.document_name}" submitted by "${notification.tenant_name}" for "${notification.unit_name}" has been reviewed
          <br><br>
      </p>`
      )
    case 'tenant_after_reviewed':
      return (
        `
        <img src="${config.odyssey_host}/_next/static/media/odyssey_logo_large.39580cec.png" alt="Odyssey Logo" style="width: 300px; height: auto; max-width: 400px; max-height: 100px;">
            <p>Your "${notification.document_name}" has been reviewed. We will contact you if any additional information is required.
            <a href="${notification.redirectUrl}">Click Here</a> to login and view the message. 
            <br>
            <br>
      </p>`
      )
    case 'property_manager_after_rejected':
      return (
        `
        <img src="${config.odyssey_host}/_next/static/media/odyssey_logo_large.39580cec.png" alt="Odyssey Logo" style="width: 300px; height: auto; max-width: 400px; max-height: 100px;">
            <p>"${notification.document_name}" submitted by "${notification.tenant_name}" for "${notification.unit_name}" has been rejected
            <br>
            <br>
        </p>`
      )
    case 'property_manager_after_message':
      return (
        `
        <img src="${config.odyssey_host}/_next/static/media/odyssey_logo_large.39580cec.png" alt="Odyssey Logo" style="width: 300px; height: auto; max-width: 400px; max-height: 100px;">
            <p>You have received a message in the Odyssey system. <a href="${config.landing_page}">Click here</a> to login and  see the message.
            <br>
            <br>
        </p>`
      )

    case 'tenant_after_rejected':
      return (
        `
        <img src="${config.odyssey_host}/_next/static/media/odyssey_logo_large.39580cec.png" alt="Odyssey Logo" style="width: 300px; height: auto; max-width: 400px; max-height: 100px;">
              <p>Your document has been returned for correction(s). Please refer to your "Messaging" tab for further details.
              <br><br>
        </p>`
      )
    case 'tenant_after_message':
      return (
        `
        <img src="${config.odyssey_host}/_next/static/media/odyssey_logo_large.39580cec.png" alt="Odyssey Logo" style="width: 300px; height: auto; max-width: 400px; max-height: 100px;">
              <p>You have received a message. <a href="${notification.redirectUrl}">Click Here</a> to login and view the message.   
              <br><br>
        </p>`
      )
    case 'property_manager_after_tenant_sign_upload':
      return (
        `
        <img src="${config.odyssey_host}/_next/static/media/odyssey_logo_large.39580cec.png" alt="Odyssey Logo" style="width: 300px; height: auto; max-width: 400px; max-height: 100px;">    
        <p>"${notification.tenant_name}" signed and upload the "${notification.document_name}" for "${notification.unit_name}" Kindly review and sign the document.
          <br><br>
           <a href="${notification.redirectUrl}">Click Here</a> to login and view the task. 
          <br><br>
          <a href="${notification.redirectUrl}">Click here</a> to see their Task list.
            </p>`

      )
    case 'tenant_after_sign_upload':
      return (
        `
        <img src="${config.odyssey_host}/_next/static/media/odyssey_logo_large.39580cec.png" alt="Odyssey Logo" style="width: 300px; height: auto; max-width: 400px; max-height: 100px;">      
        <p>Thanks for completing this step with Odyssey. If any additional information is required, you will be notified. . 
            <br><br>
        </p>`

      )
    case 'create_shadow_manager':
      return (
        `
        <img src="${config.odyssey_host}/_next/static/media/odyssey_logo_large.39580cec.png" alt="Odyssey Logo" style="width: 300px; height: auto; max-width: 400px; max-height: 100px;">      
        <p>Welcome to Odyssey!
        <br>
        <br>
        You have been invited by ${notification.property_manager_name} to join Odyssey as a user.
              <br><br>
            Click here to <a href="${config.aws.cognito.cognito_sign_up_url}">sign up</a> and start viewing properties.
            <br><br>
            If you already have an account, click here to <a href="${config.landing_page}">log in</a>.
            <br>
        </p>`

      )
    case 'create_property_manager':
      return (
        `
        <img src="${config.odyssey_host}/_next/static/media/odyssey_logo_large.39580cec.png" alt="Odyssey Logo" style="width: 300px; height: auto; max-width: 400px; max-height: 100px;">      
       <p> You have invited ${notification.add_property_manager_name} to Odyssey as a property manager.
       </p>`
      )

    case 'notify_shadow_manager_creation':
      return (
        `
        <img src="${config.odyssey_host}/_next/static/media/odyssey_logo_large.39580cec.png" alt="Odyssey Logo" style="width: 300px; height: auto; max-width: 400px; max-height: 100px;">      
        <p>You have invited ${notification.shadow_manager_name} to Odyssey as a shadow manager.
              <br>
        </p>`
      )
    case 'notify_property_manager_creation':
      return (
        `
        <img src="${config.odyssey_host}/_next/static/media/odyssey_logo_large.39580cec.png" alt="Odyssey Logo" style="width: 300px; height: auto; max-width: 400px; max-height: 100px;">      
        <p>Welcome to Odyssey!
        <br>
        <br>
        You have been invited by ${notification.property_manager_name} to join Odyssey as a property manager.
              <br><br>
            Click here to <a href="${config.aws.cognito.cognito_sign_up_url}">sign up</a> and start viewing properties.
            <br><br>
            If you already have an account, click here to <a href="${config.landing_page}">log in</a>.
            <br>
        </p>`

      )
    case 'notify_shadow_manager_assignment':
      return (
        `
        <img src="${config.odyssey_host}/_next/static/media/odyssey_logo_large.39580cec.png" alt="Odyssey Logo" style="width: 300px; height: auto; max-width: 400px; max-height: 100px;">      
        <p>Greetings from Odyssey!
        <br><br>
        You have been assigned a property as a user.
        </p><p>
        If you already have an account, click here to <a href="${config.landing_page}">log in</a>.
        <br><br>
        If not, click here to <a href="${config.aws.cognito.cognito_sign_up_url}">sign up</a>.
            <br>
        </p>
        `
      )

    case 'notify_property_manager_assignment':
      return (
        `
        <img src="${config.odyssey_host}/_next/static/media/odyssey_logo_large.39580cec.png" alt="Odyssey Logo" style="width: 300px; height: auto; max-width: 400px; max-height: 100px;">      
        <p>You have assigned ${notification.add_property_manager_name} as a property manager to a property.
          <br>
          </p>
          `
      )

    default:
      throw new Error('Invalid notification type');
  }
}

// hema - to get all unit
async function sendEmailNotification(notification, toEmail) {
  try {
    // get template for mail
    let emailText = await emailContent(notification)
    notification.html = emailText;
    let mailResponse = await sendEmail(notification, toEmail);
  } catch (error) {
    console.error('Get All Unit eeror');
  }
}
async function
  sendNotification(type, options) {
  switch (type) {
    case 'tenant':
      return sendTenantNotification(options.property_name);
    case 'propertyManager':
      return sendPropertyManagerNotification(options.property_id, options.unit_name, options.tenant_name);
    case 'propertyManagerAfterAnswered':
      return sendPropertyManagerNotificationAfterAnswered(options.property_id, options.unit_name, options.tenant_name, options._tenantID, options.unit_id);
    case 'tenantAfterAnswered':
      return sendTenantNotificationAfterAnswered(options.unit_name, options.tenant_name);
    case 'propertyManagerAfterReviewed':
      return sendPropertyManagerNotificationAfterReviewed(options.property_id, options.document_name, options.tenant_name, options.unit_name)

    case 'tenantAfterReviewed':
      return sendTenantNotificationAfterReviewed(options.document_name, options.unit_name)
    case 'propertyManagerAfterRejected':
      return sendPropertyManagerNotificationAfterRejected(options.property_id, options.document_name, options.tenant_name, options.unit_name)
    case 'propertyManagerAfterMessage':
      return sendPropertyManagerNotificationAfterMessage(options.property_manager_name)
    case 'tenantAfterRejected':
      return sendTenantNotificationAfterRejected(options.property_name)
    case 'tenantAfterMessage':
      return sendTenantNotificationAfterMessage(options.property_manager_name, options.tenant_name, options.property_name, options.property_id)
    case 'propertyMangerAfterTenantSignUpload':
      return sendPropertyManagerNotificationAfterTenantSignUpload(options.property_id, options.tenant_name, options.document_name, options.unit_name, options.unit_id, options.tenant_id)
    case 'tenantAfterSignUpload':
      return sendTenantNotificationAfterSignUpload(options.document_name, options.unit_name)
    case 'shadowManagerSignup':
      return getShadowManagerSignupNotification(options.property_manager_name);

    case 'propertyManagerInviteShadowManager':
      return getPropertyManagerInvitesShadowManagerNotification(options.property_manager_name, options.shadow_manager_name);
    case 'assignPropertiesToShadowManager':
      return sendAssignPropertiesToShadowManagerNotification(options.property_manager_name, options.shadow_manager_name, options.propertyName)

    case 'assignNotificationsToPropertyManager':
      return assignPropertiesManagerrNotification(options.property_manager_name, options.shadow_manager_name, options.propertyName);
    case 'propertyManagerSignup':
      return getPropertyManagerSignupNotification(options.add_property_manager_name);
    case 'propertyManagerInvitePropertyManager':
      return getPropertyManagerInvitesPropertyManagerNotification(options.property_manager_name, options.add_property_manager_name);

    default:
      throw new Error('Invalid notification type');
  }
}
// hema - notification format for client (while hitting send client form api)
async function sendTenantNotification(property_name) {
  let notification = {
    propertyName: property_name,
    title: property_name + " - Action Required",
    message: "client form",
    redirectUrl: config.redirectUrl,
    type: "tenant_client_form"
  }
  return notification
}
async function sendPropertyManagerNotification(property_id, unit_name, tenant_name) {
  let notification = {
    property_id: property_id,
    unitName: unit_name,
    tenantName: tenant_name,
    title: tenant_name + " - has been invited to " + unit_name + " unit successfully",
    message: "Documents Requested",
    type: "property_manager_client_form"
  }
  return notification
}
async function sendPropertyManagerNotificationAfterAnswered(property_id, unit_name, tenant_name, tenantID, unitID) {
  let notification = {
    property_id: property_id,
    unit_name: unit_name,
    tenant_name: tenant_name,
    title: "Tenant " + tenant_name + " completed or uploaded a document. Click here to review their Task list.",
    message: "Answer Submitted",
    redirectUrl: config.odyssey_host + '/dashboard/property-details/',
    type: "property_manager_after_answer"
  }
  return notification
}
async function sendTenantNotificationAfterAnswered(unit_name, tenant_name) {
  let notification = {
    unit_name: unit_name,
    tenant_name: tenant_name,
    title: tenant_name + " - your response has been submitted",
    message: "Answer submitted sucessfully",
    type: "tenant_after_answer"
  }
  return notification
}
async function sendPropertyManagerNotificationAfterReviewed(property_id, document_name, tenant_name, unit_name) {
  let notification = {
    property_id: property_id,
    document_name: document_name,
    unit_name: unit_name,
    tenant_name: tenant_name,
    title: document_name + " submitted by  " + tenant_name + " for " + unit_name + " has been reviewed ",
    message: "Document Reviewed",
    type: "property_manager_after_reviewed"
  }
  return notification
}
async function sendTenantNotificationAfterReviewed(document_name, unit_name) {
  let notification = {
    document_name: document_name,
    unit_name: unit_name,
    title: " Odyssey Has Completed Review ",
    redirectUrl: config.redirectUrl,
    message: "Sign and upload the document",
    type: "tenant_after_reviewed"
  }
  return notification
}
async function sendPropertyManagerNotificationAfterRejected(property_id, document_name, tenant_name, unit_name) {
  let notification = {
    property_id: property_id,
    document_name: document_name,
    unit_name: unit_name,
    tenant_name: tenant_name,
    title: document_name + " submitted by  " + tenant_name + " for " + unit_name + " has been rejected ",
    message: "Document Rejected",
    type: "property_manager_after_rejected"
  }
  return notification
}
async function sendPropertyManagerNotificationAfterMessage(property_manager_name) {
  let notification = {
    property_manager_name: property_manager_name,
    title: "Message Received",
    message: "Message  received from tenant",
    redirectUrl: config.odyssey_host + '/dashboard/property-messenger/',
    type: "property_manager_after_message"
  }
  return notification
}
async function sendTenantNotificationAfterRejected(property_name) {
  let notification = {
    propertyName: property_name,
    title: " Odyssey - " + property_name + " Attention Required ",
    message: "Document Rejected",
    type: "tenant_after_rejected"
  }
  return notification
}
async function sendTenantNotificationAfterMessage(property_manager_name, tenant_name, property_name) {
  let notification = {
    propertyManagerName: property_manager_name,
    title: " Message Received - " + property_name + " - " + tenant_name,
    message: "Message received",
    redirectUrl: config.odyssey_host + '/users-dashboard/messaging/' ,
    type: "tenant_after_message"
  }
  return notification
}
async function sendPropertyManagerNotificationAfterTenantSignUpload(property_id, tenant_name, document_name, unit_name, unit_id, tenant_id) {
  let notification = {
    property_id: property_id,
    tenant_name: tenant_name,
    document_name: document_name,
    unit_name: unit_name,
    title: tenant_name + " signed and upload the " + document_name + " for " + unit_name + " Kindly review and sign the document",
    message: "Review and sign the document",
    redirectUrl: config.odyssey_host + '/dashboard/property-details/' + property_id + '?tab_index=4&autoLaunch=true&tenant_id=' + tenant_id + '&launchUnitID=' + unit_id,
    type: 'property_manager_after_tenant_sign_upload'
  }
  return notification
}
async function sendTenantNotificationAfterSignUpload(document_name, unit_name) {
  let notification = {
    document_name: document_name,
    unit_name: unit_name,
    title: " Your document has been signed & submitted",
    message: " Thanks for uploading ",
    type: 'tenant_after_sign_upload'
  }
  return notification
}

async function getShadowManagerSignupNotification(property_manager_name) {
  let notification = {
    property_manager_name: property_manager_name,
    title: " You have been invited to Odyssey by " + property_manager_name,
    message: "Invited to Odyssey property management",
    redirectUrl: config.redirectUrl,
    type: 'create_shadow_manager'
  }
  return notification;
}
async function getPropertyManagerSignupNotification(add_property_manager_name) {
  let notification = {
    add_property_manager_name: add_property_manager_name,
    title: add_property_manager_name + " has been invited by you to Odyssey.",
    message: "Invited to Odyssey property management",
    redirectUrl: config.redirectUrl,
    type: 'create_property_manager'
  }
  return notification;
}

async function getPropertyManagerInvitesShadowManagerNotification(property_manager_name, shadow_manager_name) {
  let notification = {
    shadow_manager_name: shadow_manager_name,
    property_manager_name: property_manager_name,

    title: " Shadow manager " + shadow_manager_name + " has been invited by you to Odyssey.",
    message: "Invitation sent to " + shadow_manager_name,
    //  redirectUrl: config.redirectUrl,
    type: 'notify_shadow_manager_creation'
  }
  return notification;
}
async function getPropertyManagerInvitesPropertyManagerNotification(property_manager_name, add_property_manager_name) {
  let notification = {
    add_property_manager_name: add_property_manager_name,
    property_manager_name: property_manager_name,

    title: " You have been invited to Odyssey by " + property_manager_name,
    message: "Invitation sent to " + add_property_manager_name,
    //  redirectUrl: config.redirectUrl,
    type: 'notify_property_manager_creation'
  }
  return notification;
}
async function sendAssignPropertiesToShadowManagerNotification(property_manager_name, shadow_manager_name, property_name) {
  let notification = {
    propertyName: property_name,
    shadow_manager_name: shadow_manager_name,
    property_manager_name: property_manager_name,
    title: "You have been assigned a property " + "by " + property_manager_name,
    message: "Property assigned to you",
    //  redirectUrl: config.redirectUrl,
    type: 'notify_shadow_manager_assignment'
  }
  return notification;
}

async function assignPropertiesManagerrNotification(property_manager_name, shadow_manager_name, property_name) {
  let notification = {
    propertyName: property_name,
    shadow_manager_name: shadow_manager_name,
    property_manager_name: property_manager_name,
    title: "You have assigned properties to " + shadow_manager_name,
    message: "Property assigned to " + shadow_manager_name,
    property_name: property_name,
    //  redirectUrl: config.redirectUrl,
    type: 'notify_property_manager_assignment'
  }
  return notification;
}

//sujith - API to add message

async function addMessage(req, res) {
  try {
    let property_manager_id = req.query.property_manager_id;
    let tenant_id = req.query.tenant_id;
    let role = req.body.role;
    let message = req.body.message;
    if (message) {
      message.time_stamp = new Date().getTime()
    }
    if (!property_manager_id) {
      return res.status(400).json({ error: 'property_manager_id not found.' });
    }
    if (!tenant_id) {
      return res.status(400).json({ error: 'tenant_id not found.' });
    }
    if (!role) {
      return res.status(400).json({ error: 'role not found.' });
    }
    if (!message) {
      return res.status(400).json({ error: 'message not found.' });
    }

    let errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    if (message.from === property_manager_id) {
      receiverID = tenant_id;
    } else {
      receiverID = property_manager_id;
    }
    let data = {
      property_manager_id,
      tenant_id,
      role,
      message,
      user_id: receiverID,
      status: "unread"
    };
    let property_manager_details = await getTenantById(property_manager_id);
    let property_manager_name = property_manager_details[0]?.first_name + " " + property_manager_details[0]?.last_name;
    let tenant_details = await getTenantById(tenant_id);
    let tenant_name = tenant_details[0]?.first_name + " " + tenant_details[0]?.last_name;
    let property_manager_email = property_manager_details[0]?.email
    let rental_details = await getRentalsUsingTenantId(tenant_id);
    let unit_id = rental_details[0]?.unit_id;
    let property_id = rental_details[0]?.property_id;
    let property_details = await getPropertyById(property_id);
    let property_name = property_details[0]?.name;
    let property_manager_notification = await sendNotification("propertyManagerAfterMessage", { property_manager_name,property_id,})
    let tenant_notification = await sendNotification("tenantAfterMessage", { property_manager_name, tenant_name, property_name, property_id, });
    let notification_response = await addNotification(property_manager_notification, tenant_notification, tenant_id, property_manager_id)

    // Conditionally send email notifications based on sender
    if (message.from === property_manager_id) {
      let tenant_email_notification = await sendEmailNotification(tenant_notification, tenant_details[0].email);
    } else if (message.from === tenant_id) {
      let property_manager_email_notification = await sendEmailNotification(property_manager_notification, property_manager_email);
    } else {
      console.log("error ")
    }
    let result = await createMessage(data);
    if (result) {
      let messageId = result.id;
      return res.status(200).json({ id: messageId });
    } else {

      return res.status(500).json({ error: 'Error while adding message' });
    }
  } catch (error) {
    console.error('Add message Error:', error);
    return res.status(500).json({ error: 'An error occurred while processing your request' });
  }
}
// sujith - API to getall messages

async function getAllMessages(req, res) {
  try {
    const { property_manager_id, tenant_id } = req.query;
    let all_records;

    if (property_manager_id) {
      all_records = await getAllMessage({ property_manager_id: property_manager_id });
    } else if (tenant_id) {
      all_records = await getAllMessage({ tenant_id: tenant_id });
    } else {
      console.error('Neither property_manager_id nor tenant_id is provided');
      return res.status(400).json({ error: 'Neither property_manager_id nor tenant_id is provided' });
    }

    return res.status(200).json(all_records);
  } catch (error) {
    console.error('Get all messages error:', error);
    return res.status(500).json({ error: 'An error occurred while processing your request' });
  }
}
module.exports = {
  getNotificationsByUser,
  setNotificationStatusById,
  addNotification,
  sendEmailNotification,
  sendNotification,
  addMessage,
  getAllMessages
  // sendTenantNotification,
  // sendPropertyManagerNotification,
  // sendPropertyManagerNotificationAfterAnswered,
  // sendTenantNotificationAfterAnswered
}