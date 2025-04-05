import { BlobServiceClient } from "@azure/storage-blob";
import { DefaultAzureCredential } from "@azure/identity";
import { IImageStorage } from "../domain/IImageStorage";
/**
 * @file AzureBlobStorage.ts
 * @description This file defines the AzureBlobStorage class, which implements the IImageStorage interface.
 * The class is responsible for uploading images to Azure Blob Storage.
 * It uses the Azure Storage Blob SDK to interact with Azure Blob Storage.
 * The class constructor takes the Azure Blob Storage account URL, container name, and a credential object.
 * The uploadImage method uploads an image buffer to the specified container in Azure Blob Storage.
 * It returns the URL of the uploaded image.
 */
export class AzureBlobStorage implements IImageStorage {
    private containerName: string;
    private blobServiceClient: BlobServiceClient;

    constructor(
        url: string, 
        containerName: string, 
        credential: DefaultAzureCredential) {
        this.containerName = containerName;
        this.blobServiceClient = new BlobServiceClient(
            url,
            credential
        );
    }

    async uploadImage(buffer: Buffer, fileName: string): Promise<string> {
        const containerClient = this.blobServiceClient.getContainerClient(this.containerName);
        const blobClient = containerClient.getBlockBlobClient(fileName);
        await blobClient.upload(buffer, buffer.length);
        return blobClient.url;
    }
}
