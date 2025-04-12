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
    async extractText(imageUrl: string): Promise<string> {
        this.context.log("Iniciando a extração de texto da imagem");
        try {
            const result = await this.client.path(
               "/imageanalysis:analyze"
            ).post({
                body: {
                    url: imageUrl,
                },
                queryParameters: {
                    features: ["Read"],
                    "smartCrops-aspect-ratios": [0.9, 1.33],
                },
                contentType: "application/json",
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
            this.context.log("Texto extraído com sucesso");
            return lines.map((line) => line.text).join("\n");
        } catch (error) {
            this.context.log("Erro ao extrair texto da imagem", error);
            throw new Error(`Error extracting text: ${error}`);
        }
    }

}