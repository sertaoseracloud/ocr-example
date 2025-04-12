import { PrescriptionKeywords } from "../constants";
import { IImageRepository } from "../domain/IImageRepository";
import { IOCRService } from "../domain/IOCRService";

export class ProcessPendingImages {
    constructor(
        private readonly imageRepository: IImageRepository,
        private readonly ocrService: IOCRService 
    ) {}
    async execute(): Promise<void> {
        const images = await this.imageRepository.getAndMarkPendingImages();

        for (const image of images) {
            try {
                const text = await this.ocrService.extractText(image.url);
                const isPrescription = this.isPrescription(text);
                await this.imageRepository.saveOcrResult(image.id, isPrescription);
            } catch (error) {
                await this.imageRepository.markAsError(image.id);
            }
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