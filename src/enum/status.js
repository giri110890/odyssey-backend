const CertificationStatus = {
    Started: "started",
    Progress: "progress",
    Completed: "completed",
    Review: "review",
    Reject:"reject"
}
const NotificationStatus ={
    Read :"read",
    Unread :"unread"
}
const FormStatus ={
    New :"new",
    Pending:"pending",
    Review:"review",
    Signed :'signed',
    Reject:"reject",
    Submitted :"submitted"
}
const Role ={
    Tenant : "tenant",
    Property_Manager :"property_manager"
}
const property_status ={
    Active :"active",
    Deleted:"deleted"
}
const FieldType =  "custom_field"
module.exports ={
CertificationStatus,
NotificationStatus,
FormStatus,
Role,
property_status,
FieldType
}