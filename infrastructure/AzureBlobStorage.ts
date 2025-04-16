import { BlobServiceClient } from "@azure/storage-blob";
import { DefaultAzureCredential } from "@azure/identity";
import { IImageStorage } from "../domain/IImageStorage";
import { AllowedContentTypes } from "../constants";

export class AzureBlobStorage implements IImageStorage {
    private blobServiceClient: BlobServiceClient;
    constructor(
        url: string, 
        private readonly containerName: string, 
        credential: DefaultAzureCredential,
        private readonly contentType: AllowedContentTypes = AllowedContentTypes.PNG,
    ) {
        this.blobServiceClient = new BlobServiceClient(
            url,
            credential
        );
    }

    async uploadImage(image: any, fileName: string): Promise<string> {
       try {
           const containerClient = this.blobServiceClient.getContainerClient(this.containerName);
           const blobClient = containerClient.getBlockBlobClient(fileName);
           await blobClient.uploadFile(image);
           return blobClient.url;
       } catch (error) {
           throw new Error(`Error uploading image: ${error}`);
       }
    }
}
