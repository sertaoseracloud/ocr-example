import { ImageAnalysisClient } from "@azure-rest/ai-vision-image-analysis";
import { IOCRService } from "../domain/IOCRService";
import { Context } from "@azure/functions";

interface ReadResult {
    lines: { text: string }[];
}

export class TextAnalyticsService implements IOCRService {
    constructor(
        private readonly client: ImageAnalysisClient,
        private readonly context: Context
    ){}
    async extractText(image: NodeJS.ReadableStream): Promise<string> {
        try {
            const result = await this.client.path(
               "/imageanalysis:analyze"
            ).post({
                queryParameters: {
                    features: ["Read"],
                    "smartCrops-aspect-ratios": [0.9, 1.33],
                },
                body: image,
                contentType: "application/octet-stream",
            });
            const { body } = result;
            if (!body || !('readResults' in body)) {
                throw new Error("Unexpected response format");
            }
            const { readResults } = body as { readResults?: ReadResult[] };
            if (!readResults || readResults.length === 0) {
                throw new Error("No text found in the image");
            }
            const lines = readResults[0].lines;
            if (!lines || lines.length === 0) {
                throw new Error("No lines found in the image");
            }
            return lines.map((line) => line.text).join("\n");
        } catch (error) {
            throw new Error(`Error extracting text: ${error}`);
        }
    }

}