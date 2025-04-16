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

    //downlaod with stream
    async downloadImage(fileName: string): Promise<NodeJS.ReadableStream> {
        try {
            const containerClient = this.blobServiceClient.getContainerClient(this.containerName);
            const blobClient = containerClient.getBlockBlobClient(fileName);
            const downloadBlockBlobResponse = await blobClient.download(0);
            const readableStream = downloadBlockBlobResponse.readableStreamBody;
            if (!readableStream) {
                throw new Error("Readable stream is undefined");
            }
            return readableStream;
        } catch (error) {
            throw new Error(`Error downloading image: ${error}`);
        }
    }
}
