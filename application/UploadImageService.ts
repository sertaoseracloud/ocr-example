import { Context } from "@azure/functions";
import { IImageRepository } from "../domain/IImageRepository";
import { IImageStorage } from "../domain/IImageStorage";
import { v4 as uuidv4 } from "uuid";

export class UploadImageService {
    constructor(
        private readonly imageStorage: IImageStorage,
        private readonly imageRepository: IImageRepository,
    ) {}
    async handleUpload(buffer: Buffer): Promise<{ url: string; fileName: string }> {
        try {
            const fileName = `${uuidv4()}.png`;
            const url = await this.imageStorage.uploadImage(buffer, fileName);
            await this.imageRepository.save(fileName, url);
            return { url, fileName };
        } catch (error) {
            throw new Error(`Error uploading image: ${error}`);
        }
    }
}