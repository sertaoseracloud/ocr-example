import { IImageStorage } from "../domain/IImageStorage";
import { v4 as uuidv4 } from "uuid";
/**
 * UploadImageService is responsible for handling the upload of images.
 * It uses an image storage service to upload the image and returns the URL and file name.
 */
export class UploadImageService {
    constructor(private readonly imageStorage: IImageStorage) {}
    async handleUpload(buffer: Buffer): Promise<{ url: string; fileName: string }> {
        const fileName = `${uuidv4()}.jpg`;
        const url = await this.imageStorage.uploadImage(buffer, fileName);
        return { url, fileName };
    }
}