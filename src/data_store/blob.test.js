const { addNewFile, deleteFile } = require('./blob.js');
const { BlobServiceClient } = require('@azure/storage-blob');
const config = require("../../config/config.js");

let connectionString = "https://devproscanblobstorage.blob.core.windows.net";

// Mock Azure Blob Storage dependencies
jest.mock('@azure/storage-blob', () => ({
    StorageSharedKeyCredential: jest.fn(),
    getContainerClient: jest.fn(() => ({
        getBlockBlobClient: jest.fn(() => ({
            delete: jest.fn(() => Promise.resolve()),
        })),
    })),
    BlobServiceClient: jest.fn(() => ({
        getContainerClient: jest.fn(() => ({
            getBlockBlobClient: jest.fn(() => ({
                delete: jest.fn(() => Promise.resolve()),
                upload: jest.fn(() => Promise.resolve({ requestId: '123' }))
            })),
        })),
    }))
}));

describe('addNewFile', () => {

    // test('should upload a new file successfully', async () => {
    //     const containerName = process.env.devproscanblobstoragecontainer;
    //     const content = 'Hello world!';
    //     const blobName = 'newblob';

    //     // Mock the methods and responses for BlobServiceClient
    //     const uploadMock = jest.fn(content, content.length).mockResolvedValue({ requestId: '123' });
    //     const getContainerClientMock = jest.fn(containerName).mockReturnValue({
    //         getBlockBlobClient: jest.fn().mockReturnValue({
    //             upload: uploadMock,
    //         }),
    //     });
    //     BlobServiceClient.mockImplementation(() => ({
    //         getContainerClient: getContainerClientMock
    //     }));

    //     // Call the function
    //     await addNewFile(content);

    //     // Assertions
    //     expect(BlobServiceClient).toHaveBeenCalledWith(connectionString, {});
    //     expect(getContainerClientMock).toHaveBeenCalled();
    //     expect(uploadMock).toHaveBeenCalledWith(content, content.length);
    //     // You might want to add more assertions based on your specific needs
    // });

    test('deletes a file successfully', async () => {
        //Todo - Insert a file and delete it in the same flow
        /*
        // Arrange
        const fileName = 'document1.pdf';

        // Act
        const result = await deleteFile(fileName);

        // Assert
        expect(result).toBeUndefined(); // Assuming delete() resolves without a value
        */
    });
    /*
        test('handles deletion failure', async () => {
            // Arrange
            const fileName = 'nonExistentFile.txt';
    
            // Act and Assert
            await expect(deleteFile(fileName)).rejects.toThrowError(); // Adjust as needed
        });
        */
});