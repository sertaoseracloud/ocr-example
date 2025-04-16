export interface IOCRService {
    extractText(imageUrl: string): Promise<string>;
}