export interface IOCRService {
    extractText(image: Buffer): Promise<string>;
}