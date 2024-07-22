const formidable = require('formidable');
const fs = require('fs');
const { addNewFile, listFiles, viewAllBlob, documentDownload, addNewForm, listForm, deleteFile, addSignedDocuments, listSignedFiles, addSignedDocumentsByPropertyManager, listPropertyManagerSignedFiles } = require('../../data_store/blob');
const { getAllRecord, removeFormMappings } = require('../../data_store/mapping');
const { sendNotificationToUsers, changeFormStatusToSubmitted } = require('../../services/blob_service');
const { addReviewedDocuments, listReviewedDocuments } = require('../../data_store/blob')
const config = require('../../../config/config');
const FormDatabaseConfig = {
    endpoint: config.endpoint,
    key: config.key,
    databaseId: config.database.id,
    containerId: config.container.forms,
};
// api to upload a blob 
/*
for uploading a blob, property_id, rental_id and tenant_id in query
file in body
*/
async function uploadDocument(req, res, next) {
    try {
        let property_id = req.query.property_id;
        if (!property_id) {
            return res.status(400).json({ error: 'property_id   not found' });
        }
        let rental_id = req.query.rental_id;
        if (!rental_id) {
            return res.status(400).json({ error: 'rental_id   not found' });
        }
        let tenant_id = req.query.tenant_id;
        if (!tenant_id) {
            return res.status(400).json({ error: 'tenant_id   not found' });
        }
        const form = new formidable.IncomingForm();
        const [fields, files] = await form.parse(req);
        let readBuffer = await fs.readFileSync(files.myFile[0].filepath);
        let filename = files.myFile[0].originalFilename;
        let upload = await addNewFile(readBuffer, property_id, rental_id, tenant_id, filename);
        res.status(200).json({ upload: "File successfully uploaded " })
    } catch (error) {
        console.error("Error in uploadDocument: " + error);
        next(error);
    }
}
//api to view a specific document
/*
property_id, rental_id, tenant_id, property manager id -> in query 
property_manager -> can view all tenants documents under a rental(ie unit) 
where tenant can view only his uploaded documents
*/
async function viewDocument(req, res) {
    try {
        let property_id = req.query.property_id;
        if (!property_id) {
            return res.status(400).json({ error: 'property_id   not found' });
        }
        let rental_id = req.query.rental_id;
        if (!rental_id) {
            return res.status(400).json({ error: 'rental_id   not found' });
        }
        let tenant_id = req.query.tenant_id;
        let property_manager_id = req.query.property_manager_id;
        if (property_manager_id) {  // can view all documents under rental
            let result = await listFiles(property_id, rental_id);
            res.status(200).json(result)
        }
        else if (tenant_id) {
            let result = await listFiles(property_id, rental_id, tenant_id);    //can view only his document
            res.status(200).json(result)
        } else {
            return res.status(401).send('Unauthorized');
        }
    } catch (error) {
        console.error("Error in viewDocument: " + error);
        next(error);
    }
}
/*
sample output of above view document is
[
  'fa26373d-3208-4a1a-99ba-a4c9e62fbe84/2d29f4e5-02c4-4acd-94f8-ef3a126e8107/aea652d6-9ddc-47f3-8b8c-dccb564e7786/myfile (2).png',
  'fa26373d-3208-4a1a-99ba-a4c9e62fbe84/2d29f4e5-02c4-4acd-94f8-ef3a126e8107/aea652d6-9ddc-47f3-8b8c-dccb564e7786/signature.png'
]
*/
//api to view all document
async function viewAllDocument(req, res) {
    try {

        let result = await viewAllBlob();
        res.status(200).json(result)
    } catch (error) {
        console.error("Error in viewAllDocument: " + error);
        next(error);
    }
}
// api to download document
/*
for downloading a documnet
file_name in query
*/
async function downloadDocument(req, res) {
    try {
        let blob_name = req.query.file_name;
        let file_path = await documentDownload(blob_name);

        res.sendFile(file_path, {}, function (err) {
            if (err) {
                next(err);
            } else {
                console.log('Sent:', file_path);
            }
        });
        // res.status(200).json("Blob  downloaded successfully");
    } catch (error) {
        console.error("Error in downloadDocument: " + error);
        res.status(400).json("Download document error");
    }
}
// hema - api to upload form for mapping
async function addForm(req, res, next) {
    try {
        let property_manager_id = req.query.property_manager_id;
        if (!property_manager_id) {
            return res.status(400).json({ error: 'property_manager_id   not found' });
        }
        const form = new formidable.IncomingForm();
        const [fields, files] = await form.parse(req);
        let readBuffer = await fs.readFileSync(files.myFile[0].filepath);
        let filename = files.myFile[0].originalFilename;
        // Check if the filename already exists
        let existingFiles = await listForm(property_manager_id);
        let existingFileNames = existingFiles.map(_form => _form.name);
        let existingFileIndex = existingFileNames.indexOf(`${property_manager_id}/${filename}`);
        let addFileName = filename;
        if (existingFileIndex >= 0) {
            let i = 1;
            let newFileName = filename;

            do {
                let parts = newFileName.split('.');
                let baseName = parts[0]; // Filename part without extension
                let extension = parts.slice(1).join('.');

                // Combine filename with incremental suffix and extension
                addFileName = baseName + i + '.' + extension;

                // Check if the new filename exists
                existingFileIndex = existingFileNames.indexOf(`${property_manager_id}/${addFileName}`);

                i++; // Increment i for the next iteration
            } while (existingFileIndex >= 0);
        }


        let upload = await addNewForm(readBuffer, property_manager_id, addFileName);
        res.status(200).json({ id: upload, message: "File successfully uploaded " })
    } catch (error) {
        console.error("addForm error: " + error);
        next(error);
    }
}
/*
sample output:
{
    "id": "c458f4a8-c0f1-7051-261d-09cb8b007f51/resident-notification-letter (1).pdf",
    "message": "File successfully uploaded "
}
*/
// api to view a mapped form

async function viewForm(req, res) {
    try {
        let property_manager_id = req.query.property_manager_id;
        if (!property_manager_id) {
            return res.status(400).json({ error: 'property_manager_id   not found' });
        }
        let result = await listForm(property_manager_id);
        res.status(200).json(result)

    } catch (error) {
        console.error("Failed to view form: " + error);
        res.status(500).json({ error: "Failed to view form" });
        next(error);
    }
}
/*
SAMPLE OUTPUT
[
    "39894836-a2b0-4383-89ca-4dfe0d23b30b/Guarantor Agreement.pdf",
    "39894836-a2b0-4383-89ca-4dfe0d23b30b/OoPdfFormExample.pdf",
    "39894836-a2b0-4383-89ca-4dfe0d23b30b/Tenant Income Certification.pdf",
    "39894836-a2b0-4383-89ca-4dfe0d23b30b/hema 1.pdf",
    "39894836-a2b0-4383-89ca-4dfe0d23b30b/hema 2.pdf",
    "39894836-a2b0-4383-89ca-4dfe0d23b30b/resident-notification-letter (1).pdf"
]
*/
// API TO DELETE UPLOADED FORM 
async function deleteForm(req, res) {
    try {
        let property_manager_id = req.query.property_manager_id;
        if (property_manager_id) {
            let blob_name = req.query.form_name;
            let delete_result = await deleteFile(blob_name);
            if (delete_result == true) {
                let mapped_forms = await getAllRecord(property_manager_id, FormDatabaseConfig);
                let removing_form = mapped_forms.filter(_form => _form.form_id == blob_name)
                if (removing_form.length > 0) {
                    let result = await removeFormMappings(removing_form[0].id, FormDatabaseConfig)
                    if (result == true) {
                        res.status(200).json({ success: true, message: `Form ${blob_name} and its mappings are deleted successfully.` })
                    } else {
                        res.status(400).json("Delete mappings error")
                    }
                } else {
                    res.status(200).json({ success: true, message: `Form ${blob_name} deleted successfully.` })
                }
            } else {
                res.status(400).json(delete_result)
            }
        } else {
            res.status(400).json("Property manager id not found")
        }
    } catch (error) {
        console.log(error)
    }
}

// sujithkumar -Api to upload tenant signed documents by tenant

async function uploadSignedDocument(req, res, next) {
    try {
        let property_id = req.query.property_id;
        if (!property_id) {
            return res.status(400).json({ error: 'property_id   not found' });
        }
        let rental_id = req.query.rental_id;
        if (!rental_id) {
            return res.status(400).json({ error: 'rental_id   not found' });
        }
        let tenant_id = req.query.tenant_id;
        if (!tenant_id) {
            return res.status(400).json({ error: 'tenant_id   not found' });
        }
        const form = new formidable.IncomingForm();
        const [fields, files] = await form.parse(req);  //parse document
        let readBuffer = await fs.readFileSync(files.myFile[0].filepath);   //writable to readable
        let filename = files.myFile[0].originalFilename;
        let document_name = filename.substring(filename.lastIndexOf('/') + 1);
        let upload = await addSignedDocuments(readBuffer, property_id, rental_id, tenant_id, document_name);
        let notification = await sendNotificationToUsers(property_id, rental_id, tenant_id, document_name)
        if (notification == true) {
            res.status(200).json({ upload: "File successfully uploaded " })
        } else {
            res.status(400).json({ Error: "File  uploaded Error" })
        }
    } catch (error) {
        console.error("Error in uploadSignedDocument: " + error);
        next(error);
    }
}
//Api to upload the review document
async function uploadReviewedDocument(req, res, next) {
    try {
        let property_id = req.query.property_id;
        if (!property_id) {
            return res.status(400).json({ error: 'property_id   not found' });
        }
        let rental_id = req.query.rental_id;
        if (!rental_id) {
            return res.status(400).json({ error: 'rental_id   not found' });
        }
        let tenant_id = req.query.tenant_id;
        if (!tenant_id) {
            return res.status(400).json({ error: 'tenant_id   not found' });
        }
        const form = new formidable.IncomingForm();
        const [fields, files] = await form.parse(req);  //parse document
        let readBuffer = await fs.readFileSync(files.myFile[0].filepath);   //writable to readable
        let filename = files.myFile[0].originalFilename;
        let document_name = filename.substring(filename.lastIndexOf('/') + 1);
        let upload = await addReviewedDocuments(readBuffer, property_id, rental_id, tenant_id, document_name);
        //   let notification = await sendNotificationToUsers(property_id, rental_id, tenant_id, document_name)
        if (notification == true) {
            res.status(200).json({ upload: "File successfully uploaded " })
        } else {
            res.status(400).json({ Error: "File  uploaded Error" })
        }
    } catch (error) {
        console.error("Error in uploadReviewedDocument: " + error);
        next(error);
    }
}
// Api to view the reviewed document
async function viewReviewedDocument(req, res) {
    try {
        let property_id = req.query.property_id;
        if (!property_id) {
            return res.status(400).json({ error: 'property_id   not found' });
        }
        let rental_id = req.query.rental_id;
        if (!rental_id) {
            return res.status(400).json({ error: 'rental_id   not found' });
        }
        let tenant_id = req.query.tenant_id;
        let property_manager_id = req.query.property_manager_id;
        if (property_manager_id) {  // can view all documents under rental
            let result = await listReviewedDocuments(property_id, rental_id);
            res.status(200).json(result)
        }
        else if (tenant_id) {
            let result = await listReviewedDocuments(property_id, rental_id, tenant_id);    //can view only his document
            res.status(200).json(result)
        } else {
            return res.status(401).send('Unauthorized');
        }
    } catch (error) {
        console.error("Error in viewReviewedDocument: " + error);
        next(error);
    }
}
//sujithkumar -Api to view tenant  signed document by property manager
async function viewSignedDocument(req, res) {
    try {
        let property_id = req.query.property_id;
        if (!property_id) {
            return res.status(400).json({ error: 'property_id   not found' });
        }
        let rental_id = req.query.rental_id;
        if (!rental_id) {
            return res.status(400).json({ error: 'rental_id   not found' });
        }
        let tenant_id = req.query.tenant_id;
        let property_manager_id = req.query.property_manager_id;
        if (property_manager_id) {  // can view all documents under rental
            let result = await listSignedFiles(property_id, rental_id);
            res.status(200).json(result)
        }
        else if (tenant_id) {
            let result = await listSignedFiles(property_id, rental_id, tenant_id);    //can view only his document
            res.status(200).json(result)
        } else {
            return res.status(401).send('Unauthorized');
        }
    } catch (error) {
        console.error("Error in viewSignedDocument: " + error);
        next(error);
    }
}
//Sujith - Api for upload property manager signed document by property manager
async function uploadSignedDocumentByPropertyManager(req, res, next) {
    try {
        let property_id = req.query.property_id;
        let property_manager_id = req.query.property_manager_id;
        if (!property_id) {
            res.status(400).json({ error: 'property_id   not found' });
            return;
        }
        let rental_id = req.query.rental_id;
        if (!rental_id) {
            res.status(400).json({ error: 'rental_id   not found' });
            return;
        }
        let tenant_id = req.query.tenant_id;
        if (!tenant_id) {
            res.status(400).json({ error: 'tenant_id   not found' });
            return;
        }
        const form = new formidable.IncomingForm();
        const [fields, files] = await form.parse(req);  //parse document
        let readBuffer = await fs.readFileSync(files.myFile[0].filepath);   //writable to readable
        let filename = files.myFile[0].originalFilename;
        let document_name = filename.substring(filename.lastIndexOf('/') + 1);
        console.log(document_name);
        let formID = `${property_manager_id}/${document_name}`;
        // generate blob name 
        const Delete_blobName = "Uploaded_Documents/" + property_id + "/" + rental_id + "/" + tenant_id + "/" + document_name;
        //delete that blob
        let delete_result = await deleteFile(Delete_blobName);
        if (delete_result == true) {
            // save new blob
            let upload = await addSignedDocumentsByPropertyManager(readBuffer, property_id, rental_id, tenant_id, document_name);
            if (upload) {
                let change_status = await changeFormStatusToSubmitted(rental_id, tenant_id, formID);
            }
            res.status(200).json({ upload: "File successfully uploaded " })
            return;
        } else {
            res.status(400).json({ upload: "Failed in signed document upload by property manager " })
            return;
        }
        //notification
        // let rental_details = await getRentalById(rental_id);
        // let unit_id = rental_details[0].unit_id
        // let property_details = await getPropertyById(property_id);
        // let unit_details = property_details[0].units.filter(_unit => _unit.id == unit_id);
        // let unit_name = unit_details[0].unit_id;
        // let tenant_details = await getTenantById(tenant_id);
        // let tenant_name = tenant_details[0].first_name;
        // let property_manager_id = tenant_details[0].property_manager_id;
        // let property_manager_details = await getTenantById(property_manager_id);
        // let property_manager_email = property_manager_details[0].email
        // //   let document_name = document_full_name.substring(document_full_name.lastIndexOf('/') + 1);
        // let property_manager_notification = await sendNotification("propertyMangerAfterTenantSignUpload", { property_id, tenant_name, document_name:filename, unit_name })
        // let tenant_notification = await sendNotification("tenantAfterSignUpload", {document_name: filename, unit_name });
        // let tenant_email_notification = await sendEmailNotification(tenant_notification, tenant_details[0].email)
        // let property_manager_email_notification = await sendEmailNotification(property_manager_notification, property_manager_email)
        // let notification_response = await addNotification(property_manager_notification, tenant_notification, tenant_id, property_manager_id)



    } catch (error) {
        console.error("Error in uploadSignedDocumentByPropertyManager: " + error);
        next(error);
    }
}
// sujith - Api for view  property manager signed document by property manager
async function viewSignedDocumentByPropertyManager(req, res) {
    try {
        let property_id = req.query.property_id;
        if (!property_id) {
            return res.status(400).json({ error: 'property_id   not found' });
        }
        let rental_id = req.query.rental_id;
        if (!rental_id) {
            return res.status(400).json({ error: 'rental_id   not found' });
        }
        let tenant_id = req.query.tenant_id;
        let property_manager_id = req.query.property_manager_id;
        if (property_manager_id) {  // can view all documents under rental
            let result = await listPropertyManagerSignedFiles(property_id, rental_id);
            res.status(200).json(result)
        }
        else if (tenant_id) {
            let result = await listPropertyManagerSignedFiles(property_id, rental_id, tenant_id);    //can view only his document
            res.status(200).json(result)
        } else {
            return res.status(401).send('Unauthorized');
        }
    } catch (error) {
        console.error("Error in viewSignedDocumentByPropertyManager: " + error);
        next(error);
    }
}

module.exports = {
    //Documents upload
    uploadDocument,
    viewDocument,
    viewAllDocument,
    downloadDocument,
    //(form upload)
    addForm,
    viewForm,
    deleteForm,
    //(reviewed document)
    uploadSignedDocument,
    viewSignedDocument,
    //(Signed and viewed by property manager)
    uploadSignedDocumentByPropertyManager,
    viewSignedDocumentByPropertyManager,
    uploadReviewedDocument,
    viewReviewedDocument
}