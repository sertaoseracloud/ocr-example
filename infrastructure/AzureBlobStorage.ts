import { BlobServiceClient } from "@azure/storage-blob";
import { DefaultAzureCredential } from "@azure/identity";
import { IImageStorage } from "../domain/IImageStorage";

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

    async downloadImage(url: string): Promise<Buffer> {
        const urlParts = url.split("/");
        const containerName = urlParts[3];
        const blobName = urlParts.slice(4).join("/");
        const containerClient = this.blobServiceClient.getContainerClient(containerName);
        const blobClient = containerClient.getBlockBlobClient(blobName);
        const downloadResponse = await blobClient.download(0);
        const downloadedBuffer = await this.streamToBuffer(downloadResponse.readableStreamBody);
        return downloadedBuffer;
    }

    private async streamToBuffer(readableStream: NodeJS.ReadableStream): Promise<Buffer> {
        return new Promise((resolve, reject) => {
            const chunks: Uint8Array[] = [];
            readableStream.on("data", (chunk) => {
                chunks.push(chunk);
            });
            readableStream.on("end", () => {
                resolve(Buffer.concat(chunks));
            });
            readableStream.on("error", reject);
        });
    }
}
