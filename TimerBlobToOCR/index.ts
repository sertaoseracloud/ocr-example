import { AzureFunction, Context } from "@azure/functions"
import { DefaultAzureCredential } from "@azure/identity";
import createImageAnalysisClient  from "@azure-rest/ai-vision-image-analysis";
import { Pool } from "pg";
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
        context.log("Fetching credentials for Azure PostegreAzure Cognitive Services...");
        const credential = new DefaultAzureCredential({
            managedIdentityClientId,
        });
        context.log("Credentials fetched successfully.");
        context.log("Creating Azure Postgres SQL connection...");
        const { token: password } = await credential.getToken('https://ossrdbms-aad.database.windows.net/.default');
        const pool = new Pool({
            host,
            user,
            password,
            database,
            port,
            ssl,
        });
        context.log("Azure Postgres SQL connection created successfully.");
        
        context.log("Creating OCR image repository...");
        const repository = new OcrImageRepository(pool);
        context.log("OCR image repository created successfully.");
        context.log("Creating Azure Cognitive Services client...");
        const client = createImageAnalysisClient(endpoint, credential);
        context.log("Azure Cognitive Services client created successfully.");
        context.log("Creating OCR service...");
        const ocrService = new TextAnalyticsService(client, context);
        context.log("OCR service created successfully.");
        context.log("Creating process pending images service...");
        const processPendingImages = new ProcessPendingImages(repository, ocrService);
        context.log("Process pending images service created successfully.");
        context.log("Executing process pending images service...");
        await processPendingImages.execute();
        context.log("Process pending images service executed successfully.");
        context.log("Closing Azure Postgres SQL connection...");
        await pool.end();
        context.log("Azure Postgres SQL connection closed successfully.");
        context.log("Pending images processed successfully.");
    } catch (error) {
        context.log(`Error processing pending images: ${error}`);
    }
};

export default timerTrigger;
