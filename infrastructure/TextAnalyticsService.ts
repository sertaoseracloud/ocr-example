import { ImageAnalysisClient } from "@azure-rest/ai-vision-image-analysis";
import { IOCRService } from "../domain/IOCRService";

interface ReadResult {
    lines: { text: string }[];
}

export class TextAnalyticsService implements IOCRService {
    constructor(
        private readonly client: ImageAnalysisClient,
    ) {}

    async extractText(imageUrl: string): Promise<string> {
        if (!imageUrl) {
            throw new Error("Image URL is required");
        }
        try {
            const url = new URL(imageUrl);
            if (!url.protocol.startsWith("http")) {
                throw new Error("Invalid URL protocol");
            }
            } catch (error) {
            throw new Error("Invalid URL format");
        }
        const body = await this.analyzeImage(imageUrl);
        const readResults = this.getReadResults(body);
        return this.extractLinesText(readResults);
    }

    private async analyzeImage(imageUrl: string): Promise<any> {
        const result = await this.client.path("/imageanalysis:analyze").post({
            queryParameters: {
                features: ["Read"],
            },
            body: { url: imageUrl },
            contentType: "application/json",
        });

        if (!result.body) {
            throw new Error("No response body received from the service");
        }

        return result.body;
    }

    private getReadResults(body: any): ReadResult[] {
        if (!('readResults' in body)) {
            throw new Error("Unexpected response format");
        }

        const { readResults } = body as { readResults?: ReadResult[] };
        if (!readResults || readResults.length === 0) {
            throw new Error("No text found in the image");
        }

        return readResults;
    }

    private extractLinesText(readResults: ReadResult[]): string {
        const lines = readResults[0].lines;
        if (!lines || lines.length === 0) {
            throw new Error("No lines found in the image");
        }

        return lines.map((line) => line.text).join("\n");
    }
}