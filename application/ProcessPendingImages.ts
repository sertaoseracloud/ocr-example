import { PrescriptionKeywords } from "../constants";
import { IImageRepository } from "../domain/IImageRepository";
import { IImageStorage } from "../domain/IImageStorage";
import { IOCRService } from "../domain/IOCRService";

export class ProcessPendingImages {
    constructor(
        private readonly imageRepository: IImageRepository,
        private readonly imageStorage: IImageStorage,
        private readonly ocrService: IOCRService 
    ) {}
    async execute(): Promise<void> {
        let err = [];
        const images = await this.imageRepository.getAndMarkPendingImages();
        
        for (const { fileName, id } of images) {
            try {
                const image = await this.imageStorage.downloadImage(fileName);
                if (!image) {
                    throw new Error(`Image not found: ${fileName}`);
                }
                const text = await this.ocrService.extractText(image);
                const isPrescription = this.isPrescription(text);
                await this.imageRepository.saveOcrResult(id, isPrescription);
            } catch (error) {
                err.push(error);
                await this.imageRepository.markAsError(id);
            }
        }
        if (err.length > 0) {
            throw new Error(`Errors processing images: ${err.join(", ")}`);
        }
    }
    private isPrescription(text: string): boolean {
        const keywords = Object.values(PrescriptionKeywords);
        for (const keyword of keywords) {
            if (text.toLowerCase().includes(keyword.toLowerCase())) {
                return true;
            }
        }
        return false;
    }
}