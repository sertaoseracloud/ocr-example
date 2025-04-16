import { PrescriptionKeywords } from "../constants";
import { IImageRepository } from "../domain/IImageRepository";
import { IImageStorage } from "../domain/IImageStorage";
import { IOCRProcessingService, ProcessResult } from "../domain/IOCRProcessingService";
import { IOCRService } from "../domain/IOCRService";
import { OcrImage } from "../domain/OCRImage";



export class ProcessPendingImages implements IOCRProcessingService {
    constructor(
        private readonly imageRepository: IImageRepository,
        private readonly ocrService: IOCRService
    ) {}

    async execute(): Promise<ProcessResult> {
        const images = await this.imageRepository.getAndMarkPendingImages();

        const processed: { id: number; isPrescription: boolean }[] = [];
        const errors: { id: number; error: Error }[] = [];

        await Promise.all(
            images.map(async ({ id, url  }: OcrImage) => {
                try {
                    const text = await this.ocrService.extractText(url);
                    const isPrescription = this.isPrescription(text);
                    await this.imageRepository.saveOcrResult(id, isPrescription);
                    processed.push({ id, isPrescription });
                } catch (error) {
                    errors.push({ id, error });
                }
            })
        );

        return { processed, errors };
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