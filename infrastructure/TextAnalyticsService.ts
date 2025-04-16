import { ImageAnalysisClient, ImageAnalysisResultOutput, isUnexpected } from "@azure-rest/ai-vision-image-analysis";
import { IOCRService } from "../domain/IOCRService";

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
        return this.extractLinesText(body);
    }

    private async analyzeImage(imageUrl: string): Promise<ImageAnalysisResultOutput> {
        const response = await this.client.path("/imageanalysis:analyze").post({
            queryParameters: {
                features: ["Read"],
            },
            body: { url: imageUrl },
            contentType: "application/json",
        });

        if (isUnexpected(response)) {
            throw new Error(`Unexpected response: ${response.body.error.message}`);
        }

        const result = response.body as ImageAnalysisResultOutput;

        return result;
    }

    private extractLinesText(result: ImageAnalysisResultOutput): string {
        if (result.readResult && result.readResult.blocks.length > 0) {
            return result.readResult.blocks
                .map(block => block.lines.map(line => line.text).join(" "))
                .join("\n");
        }
        return "";
    }
}