import { AzureFunction, Context, HttpRequest } from "@azure/functions"
import { DefaultAzureCredential } from "@azure/identity";
import { AzureBlobStorage } from "../infrastructure/AzureBlobStorage";
import { UploadImageService } from "../application/UploadImageService";


// Azure Blob Storage connection details
const accountUrl = process.env.AZURE_STORAGEBLOB_RESOURCEENDPOINT;
const managedIdentityClientId = process.env.AZURE_STORAGEBLOB_CLIENTID;
const containerName = process.env.AZURE_STORAGEBLOB_CONTAINERNAME || "ocr-container";

// Azure SQL Database connection details
const server = process.env.AZURE_SQL_SERVER;
const port = process.env.AZURE_SQL_PORT;
const database = process.env.AZURE_SQL_DATABASE;
const clientId = process.env.AZURE_SQL_CLIENTID;


/**
 * This function is triggered by an HTTP request.
 * It expects an image in the request body and uploads it to Azure Blob Storage.
 * If the upload is successful, it returns the URL of the uploaded image.
 */
const httpTrigger: AzureFunction = async function (context: Context, req: HttpRequest): Promise<void> {
    try {
        if (!req.body || !req.headers["content-type"]?.startsWith("image/")) {
            context.res = {
                status: 400,
                body: "Imagem inválida ou ausente"
            };
            return;
        }

        const buffer = Buffer.isBuffer(req.body) ? req.body : Buffer.from(req.body);
       
        const credential = new DefaultAzureCredential({
            managedIdentityClientId: managedIdentityClientId,
        });

        const storage = new AzureBlobStorage(
            accountUrl,
            containerName,
            credential
        );

        const uploadService = new UploadImageService(storage);
        const { url, fileName } = await uploadService.handleUpload(buffer);

        context.res = {
            status: 200,
            body: {
                message: "Imagem armazenada com sucesso",
                url,
            }
        };
    
    } catch (error) {
        context.log.error("Erro ao armazenar imagem", error);
        context.res = {
            status: 500,
            body: "Erro ao armazenar imagem"
        };
    }
    
};

export default httpTrigger;

// crie um curl para essa requisicao com a imagem peixe na raiz desse projeto
// 
// curl -X POST "http://localhost:7071/api/HttpAddToBlob" -H "Content-Type: image/jpeg" --data-binary "@path/to/your/image.jpg"

