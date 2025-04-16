export interface IOCRService {
    extractText(image: NodeJS.ReadableStream): Promise<string>;
}