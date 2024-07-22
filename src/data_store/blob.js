const { BlobServiceClient, StorageSharedKeyCredential } = require("@azure/storage-blob");
const config = require('../../config/config')
const fs = require('fs');
const path = require('path');

const account = config.BLOB_ACCOUNT || "";
const accountKey = config.BLOB_ACCOUNT_KEY || "";
const containerName = config.BLOB_CONTAINER_NAME || "";
const uploadOptions = { bufferSize: 4 * 1024, maxBuffers: 20 };
// Use StorageSharedKeyCredential with storage account and account key
// StorageSharedKeyCredential is only available in Node.js runtime, not in browsers
const sharedKeyCredential = new StorageSharedKeyCredential(account, accountKey);
const blobServiceClient = new BlobServiceClient(
    `https://${account}.blob.core.windows.net/`,
    sharedKeyCredential
);
// upload document
async function addNewFile(stream, property_id, rental_id, tenant_id, filename) {
    try {
        const containerClient = blobServiceClient.getContainerClient(containerName);
        const blobName = property_id + "/" + rental_id + "/" + tenant_id + "/" + filename;
        const blockBlobClient = containerClient.getBlockBlobClient(blobName);
        const uploadBlobResponse = await blockBlobClient.uploadData(stream);
        console.log(`Upload block blob ${blobName} successfully`, uploadBlobResponse.requestId);
        return blobName;

    } catch (error) {
        console.error('Add file to blob storage error');
    }
}

async function setBlobMetadata(blobName, metadata) {
    const containerClient = blobServiceClient.getContainerClient(containerName);
    const blockBlobClient = containerClient.getBlockBlobClient(blobName);
    await blockBlobClient.setMetadata(metadata);
    console.log(`Metadata set successfully for blob '${blobName}'.`);
}

async function getBlobMetadata(blobName) {
    const containerClient = blobServiceClient.getContainerClient(containerName);
    const blockBlobClient = containerClient.getBlockBlobClient(blobName);
    const blobProperties = await blockBlobClient.getProperties();
    const metadata = blobProperties.metadata;
    console.log(`Metadata retrieved successfully for blob '${blobName}':`, metadata);
    return metadata;
}

async function deleteFile(fileName) {
    try {
        let remove_status = false;
        // First create a container client for the Azure Blob Storage account
        const containerClient = blobServiceClient.getContainerClient(containerName);

        // Create blob client for the specific file location
        const blockBlobClient = containerClient.getBlockBlobClient(fileName);

        // Invoke delete function from the blobClient object to delete the particular blob.
        let result = await blockBlobClient.delete();
        if (result) {
            remove_status = true;
            // return { success: true, message: `File ${fileName} deleted successfully.` };
        }
        // Return a success message or any relevant information
        return remove_status
    } catch (error) {
        console.error(`Error deleting file from storage: ${error.message}`);

        // Return a failure message or any relevant information
        return { success: false, message: `Error deleting file from storage: ${error.message}` };
    }
}
// api to list a document
async function listFiles(property_id, rental_id, tenant_id) {
    try {
        const containerClient = blobServiceClient.getContainerClient(containerName);
        let result = [];
        let prefix = '';
        if (property_id && rental_id && tenant_id) {
            prefix = `${property_id}/${rental_id}/${tenant_id}`;
        } else if (property_id && rental_id) {
            prefix = `${property_id}/${rental_id}/`;
        } else {
            console.error('Insufficient parameters provided.');
            return []; // Return an empty array or handle this case as needed
        }
        const iter1 = containerClient.listBlobsByHierarchy("/", { prefix });
        for await (const item of iter1) {
            if (item) {
                if (item.kind === "prefix") {
                    console.log(`BlobPrefix: ${item.name}`);
                    const blobResults = await listblobs(containerClient, item.name);
                    result = result.concat(blobResults); // Append the results to the existing result array
                } else {
                    console.log(`BlobItem: name - ${item.name}`);
                    result.push(item.name); // Store blob names in the result array
                }
            }
        }
        console.log("List of Blobs:", result);
        return result;
    } catch (error) {
        console.error('List file from blob storage error');
    }
}
//sujithkumar -Api to view signed uploaded documents
async function listSignedFiles(property_id, rental_id, tenant_id) {
    try {
        const containerClient = blobServiceClient.getContainerClient(containerName);
        let result = [];
        let prefix = '';
        let folder_name = "Uploaded_Documents";
        if (property_id && rental_id && tenant_id) {
            prefix = `${folder_name}/${property_id}/${rental_id}/${tenant_id}`;
        } else if (property_id && rental_id) {
            prefix = `${folder_name}/${property_id}/${rental_id}/`;
        } else {
            console.error('Insufficient parameters provided.');
            return []; // Return an empty array or handle this case as needed
        }
        const iter1 = containerClient.listBlobsByHierarchy("/", { prefix });
        for await (const item of iter1) {
            if (item) {
                if (item.kind === "prefix") {
                    console.log(`BlobPrefix: ${item.name}`);
                    const blobResults = await listblobs(containerClient, item.name);
                    result = result.concat(blobResults); // Append the results to the existing result array
                } else {
                    console.log(`BlobItem: name - ${item.name}`);
                    result.push(item.name); // Store blob names in the result array
                }
            }
        }
        console.log("List of Blobs:", result);
        return result;
    } catch (error) {
        console.error('List file from blob storage error');
    }
}
//Api to list the review documents
async function listReviewedDocuments(property_id, rental_id, tenant_id) {
    try {
        const containerClient = blobServiceClient.getContainerClient(containerName);
        let result = [];
        let prefix = '';
        let folder_name = "Reviewed_Documents";
        if (property_id && rental_id && tenant_id) {
            prefix = `${folder_name}/${property_id}/${rental_id}/${tenant_id}`;
        } else if (property_id && rental_id) {
            prefix = `${folder_name}/${property_id}/${rental_id}/`;
        } else {
            console.error('Insufficient parameters provided.');
            return []; // Return an empty array or handle this case as needed
        }
        const iter1 = containerClient.listBlobsByHierarchy("/", { prefix });
        for await (const item of iter1) {
            if (item) {
                if (item.kind === "prefix") {
                    console.log(`BlobPrefix: ${item.name}`);
                    const blobResults = await listblobs(containerClient, item.name);
                    result = result.concat(blobResults); // Append the results to the existing result array
                } else {
                    console.log(`BlobItem: name - ${item.name}`);
                    result.push(item.name); // Store blob names in the result array
                }
            }
        }
        console.log("List of Blobs:", result);
        return result;
    } catch (error) {
        console.error('List file from blob storage error');
    }
}
// to view specific document with prefix
async function listblobs(containerClient, prefix) {
    let result = [];
    const iter1 = containerClient.listBlobsByHierarchy("/", { prefix: prefix });

    for await (const item of iter1) {
        if (item) {
            if (item.kind === "prefix") {
                console.log(`\tBlobPrefix: ${item.name}`);
                const blobResults = await listblobs(containerClient, item.name); // Recursively call listblobs for nested prefixes
                result = result.concat(blobResults); // Append the results to the existing result array
            } else {
                console.log(`\tBlobItem: name - ${item.name}`);
                let {lastModified} = item.properties;
                let blobItem = {
                    name:item.name,
                    last_modified_date:lastModified
                }
                result.push(blobItem);
            }
        }
    }
    return result;
}

// to view all document in blob
async function viewAllBlob() {
    try {
        const containerClient = blobServiceClient.getContainerClient(containerName);
        let i = 1;
        let result = [];
        let blobs = containerClient.listBlobsFlat();
        for await (const blob of blobs) {
            if (blob) {
                console.log(`Blob ${i++}: ${blob.name}`);
                result.push(blob.name);
            }
        }
        return result;
    } catch (error) {
        console.error('List All file from blob storage error');
    }
}

// to download a document from  blob 
async function documentDownload(blobName) {
    try {
        const desktopPath = require('os').homedir() + '/Desktop';
        const containerClient = blobServiceClient.getContainerClient(containerName);
        const blobClient = containerClient.getBlobClient(blobName);
        const blobStream = await blobClient.download(); // Get blob content as a readable stream
        const downloadPath = path.join(desktopPath, 'Blob_download');
        const filePath = path.join(downloadPath, blobName); // Define the full path where the downloaded blob will be saved
        await fs.promises.mkdir(path.dirname(filePath), { recursive: true });    // Create directories recursively if they don't exist
        const writableStream = fs.createWriteStream(filePath);   // Create a write stream to save the blob contents
        await new Promise((resolve, reject) => {            // Pipe the blob stream to the writable stream
            blobStream.readableStreamBody.pipe(writableStream)
                .on('finish', () => {
                    console.log(`Blob "${blobName}" has been downloaded to "${filePath}" successfully.`);
                    resolve();
                })
                .on('error', reject);
        });
        return filePath;

    } catch (error) {
        console.error(`Error occurred while downloading blob "${blobName}":`, error.message);
    }
}

// upload form for mapping
async function addNewForm(stream, property_manager_id, filename) {
    try {
        const containerClient = blobServiceClient.getContainerClient(containerName);
        const blobName = property_manager_id + "/" + filename;
        const blockBlobClient = containerClient.getBlockBlobClient(blobName);
        const uploadBlobResponse = await blockBlobClient.uploadData(stream);
        console.log(`Upload Form for mapping  blob ${blobName} successfully`, uploadBlobResponse.requestId);
        console.log(uploadBlobResponse)
        console.log(blockBlobClient)
        console.log(blockBlobClient.url)
        return blobName;

    } catch (error) {
        console.error('addNewForm  to blob storage error');
    }
}
// list form that mapped
async function listForm(property_manager_id) {
    try {
        const containerClient = blobServiceClient.getContainerClient(containerName);
        let result = [];
        const iter1 = containerClient.listBlobsByHierarchy(`${property_manager_id}`);
        for await (const item of iter1) {
            if (item) {
                if (item.kind === "prefix") {
                    console.log(`BlobPrefix: ${item.name}`);
                    const blobResults = await listblobs(containerClient, item.name);
                    result = result.concat(blobResults);
                }
            }
        }
        console.log("List of Blobs:", result);
        return result;
    } catch (error) {
        console.error('List file from blob storage error');
    }
}
//// sujithkumar -Api to save uploaded  signed documents by tenant

async function addSignedDocuments(stream, property_id, rental_id, tenant_id, filename) {
    try {
        const containerClient = blobServiceClient.getContainerClient(containerName);
        const blobName = "Uploaded_Documents/" + property_id + "/" + rental_id + "/" + tenant_id + "/" + filename;
        const blockBlobClient = containerClient.getBlockBlobClient(blobName);
        const uploadBlobResponse = await blockBlobClient.uploadData(stream);
        console.log(`Upload block blob ${blobName} successfully`, uploadBlobResponse.requestId);
        return blobName;

    } catch (error) {
        console.error('Add file to blob storage error');
    }
}
// Api to save the reviewed documents
async function addReviewedDocuments(stream, property_id, rental_id, tenant_id, filename) {
    try {
        const containerClient = blobServiceClient.getContainerClient(containerName);
        const blobName = "Reviewed_Documents/" + property_id + "/" + rental_id + "/" + tenant_id + "/" + filename;
        const blockBlobClient = containerClient.getBlockBlobClient(blobName);
        const uploadBlobResponse = await blockBlobClient.uploadData(stream);
        console.log(`Upload block blob ${blobName} successfully`, uploadBlobResponse.requestId);
        return blobName;

    } catch (error) {
        console.error('Add file to blob storage error');
    }
}
//sujith - api to save property manager signed document
async function addSignedDocumentsByPropertyManager(stream, property_id, rental_id, tenant_id, filename) {
    try {
        const containerClient = blobServiceClient.getContainerClient(containerName);
        const blobName = "Signed_Documents/" + property_id + "/" + rental_id + "/" + tenant_id + "/" + filename;
        const blockBlobClient = containerClient.getBlockBlobClient(blobName);
        const uploadBlobResponse = await blockBlobClient.uploadData(stream);
        console.log(`Upload block blob ${blobName} successfully`, uploadBlobResponse.requestId);
        return blobName;

    } catch (error) {
        console.error('Add file to blob storage error');
    }
}
// sujith - api to view property manager signed document
async function listPropertyManagerSignedFiles(property_id, rental_id, tenant_id) {
    try {
        const containerClient = blobServiceClient.getContainerClient(containerName);
        let result = [];
        let prefix = '';
        let folder_name = "Signed_Documents";
        if (property_id && rental_id && tenant_id) {
            prefix = `${folder_name}/${property_id}/${rental_id}/${tenant_id}`;
        } else if (property_id && rental_id) {
            prefix = `${folder_name}/${property_id}/${rental_id}/`;
        } else {
            console.error('Insufficient parameters provided.');
            return []; // Return an empty array or handle this case as needed
        }
        const iter1 = containerClient.listBlobsByHierarchy("/", { prefix });
        for await (const item of iter1) {
            if (item) {
                if (item.kind === "prefix") {
                    console.log(`BlobPrefix: ${item.name}`);
                    const blobResults = await listblobs(containerClient, item.name);
                    result = result.concat(blobResults); // Append the results to the existing result array
                } else {
                    console.log(`BlobItem: name - ${item.name}`);
                    result.push(item.name); // Store blob names in the result array
                }
            }
        }
        console.log("List of Blobs:", result);
        return result;
    } catch (error) {
        console.error('List file from blob storage error');
    }
}

module.exports = {
    addNewFile,
    deleteFile,
    listFiles,
    viewAllBlob,
    documentDownload,
    addNewForm,
    listForm,
    //After tenant sigining and uploading
    addSignedDocuments,
    listSignedFiles,
    //After property manager signing
    addSignedDocumentsByPropertyManager,
    //view property manager signing
    listPropertyManagerSignedFiles,
    setBlobMetadata,
    getBlobMetadata,
    addReviewedDocuments,
    listReviewedDocuments
}

