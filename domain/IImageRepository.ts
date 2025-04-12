import { OcrImage } from "./OCRImage";

export interface IImageRepository {
    saveOcrResult(id: number, isPrescription: boolean): unknown;
    save(fileName: string, url: string): Promise<void>;
    getAndMarkPendingImages(): Promise<OcrImage[]>;
    markAsError(id: number): Promise<void>
}