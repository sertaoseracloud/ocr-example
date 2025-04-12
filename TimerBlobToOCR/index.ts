import { AzureFunction, Context } from "@azure/functions"
import { DefaultAzureCredential } from "@azure/identity";
import createImageAnalysisClient  from "@azure-rest/ai-vision-image-analysis";
import sql from "mssql";
import { OcrImageRepository } from "../infrastructure/OcrImageRepository";
import { ProcessPendingImages } from "../application/ProcessPendingImages";
import { TextAnalyticsService } from "../infrastructure/TextAnalyticsService";

// Azure Cognitive Services connection details
const managedIdentityClientId = process.env.AZURE_COGNITIVESERVICES_CLIENTID;
const endpoint = process.env.AZURE_COGNITIVESERVICES_RESOURCEENDPOINT;

// Azure SQL Database connection details
const server = process.env.AZURE_SQL_SERVER;
const database = process.env.AZURE_SQL_DATABASE;
const port = parseInt(process.env.AZURE_SQL_PORT);
const authenticationType = process.env.AZURE_SQL_AUTHENTICATIONTYPE;
const clientId = process.env.AZURE_SQL_CLIENTID;

const timerTrigger: AzureFunction = async function (context: Context, myTimer: any): Promise<void> {
    try {

        const pool = await sql.connect({
            server,
            port,
            database,
            authentication: {
                type: authenticationType
            },
            options: {
                encrypt: true,
                clientId,
            }
        });

        const repository = new OcrImageRepository(pool);

        const credential = new DefaultAzureCredential({
            managedIdentityClientId,
        });

        const client = createImageAnalysisClient(endpoint, credential);

        const ocrService = new TextAnalyticsService(client);

        const processPendingImages = new ProcessPendingImages(repository, ocrService);

        await processPendingImages.execute();

        context.log("Pending images processed successfully.");
    } catch (error) {
        context.log(`Error processing pending images: ${error}`);
    }
};

export default timerTrigger;
