import { BlobServiceClient } from "@azure/storage-blob";
import { DefaultAzureCredential } from "@azure/identity";
import { IImageStorage } from "../domain/IImageStorage";
import { Context } from "@azure/functions";

export class AzureBlobStorage implements IImageStorage {
    private blobServiceClient: BlobServiceClient;
    constructor(
        url: string, 
        private readonly containerName: string, 
        credential: DefaultAzureCredential,
    ) {
        this.blobServiceClient = new BlobServiceClient(
            url,
            credential
        );
    }

    async uploadImage(buffer: Buffer, fileName: string): Promise<string> {
       try {
           const containerClient = this.blobServiceClient.getContainerClient(this.containerName);
           const blobClient = containerClient.getBlockBlobClient(fileName);
           await blobClient.upload(buffer, buffer.length);
           return blobClient.url;
       } catch (error) {
           throw new Error(`Error uploading image: ${error}`);
       }
    }
}
