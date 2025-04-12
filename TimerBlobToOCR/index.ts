import { AzureFunction, Context } from "@azure/functions"
import { DefaultAzureCredential } from "@azure/identity";
import createImageAnalysisClient  from "@azure-rest/ai-vision-image-analysis";
import { Client } from "pg";
import { OcrImageRepository } from "../infrastructure/OcrImageRepository";
import { ProcessPendingImages } from "../application/ProcessPendingImages";
import { TextAnalyticsService } from "../infrastructure/TextAnalyticsService";

// Azure Cognitive Services connection details
const managedIdentityClientId = process.env.AZURE_COGNITIVESERVICES_CLIENTID;
const endpoint = process.env.AZURE_COGNITIVESERVICES_RESOURCEENDPOINT;

// Azure Postgres SQL Database connection details
const host = process.env.AZURE_POSTGRESQL_HOST;
const user = process.env.AZURE_POSTGRESQL_USER;
const database = process.env.AZURE_POSTGRESQL_DATABASE;
const port = parseInt(process.env.AZURE_POSTGRESQL_PORT);
const ssl = process.env.AZURE_POSTGRESQL_SSL === "true" ? { rejectUnauthorized: false } : false;

const timerTrigger: AzureFunction = async function (context: Context, myTimer: any): Promise<void> {
    try {

        context.log("Processing pending images...");
        const credential = new DefaultAzureCredential({
            managedIdentityClientId,
        });

        const password = await credential.getToken('https://ossrdbms-aad.database.windows.net/.default');
        
        const pool = new Client({
            host,
            user,
            password,
            database,
            port,
            ssl,
        });
        
        const repository = new OcrImageRepository(pool);


        const client = createImageAnalysisClient(endpoint, credential);

        const ocrService = new TextAnalyticsService(client, context);

        const processPendingImages = new ProcessPendingImages(repository, ocrService);

        await processPendingImages.execute();

        context.log("Pending images processed successfully.");
    } catch (error) {
        context.log(`Error processing pending images: ${error}`);
    }
};

export default timerTrigger;
