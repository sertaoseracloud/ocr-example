import { AzureFunction, Context, HttpRequest } from "@azure/functions"
import { DefaultAzureCredential } from "@azure/identity";
import { AzureBlobStorage } from "../infrastructure/AzureBlobStorage";
import { UploadImageService } from "../application/UploadImageService";
import { OcrImageRepository } from "../infrastructure/OcrImageRepository";
import sql from "mssql";

// Azure Blob Storage connection details
const accountUrl = process.env.AZURE_STORAGEBLOB_RESOURCEENDPOINT;
const managedIdentityClientId = process.env.AZURE_STORAGEBLOB_CLIENTID;
const containerName = process.env.AZURE_STORAGEBLOB_CONTAINERNAME || "ocr-container";

// Azure SQL Database connection details
const server = process.env.AZURE_SQL_SERVER;
const database = process.env.AZURE_SQL_DATABASE;
const port = parseInt(process.env.AZURE_SQL_PORT);
const authenticationType = process.env.AZURE_SQL_AUTHENTICATIONTYPE;
const clientId = process.env.AZURE_SQL_CLIENTID;


/**
 * This function is triggered by an HTTP request.
 * It expects an image in the request body and uploads it to Azure Blob Storage.
 * If the upload is successful, it returns the URL of the uploaded image.
 */
const httpTrigger: AzureFunction = async function (context: Context, req: HttpRequest): Promise<void> {
    context.log("Processing image upload...");
    try {
        if (!req.body || !req.headers["content-type"]?.startsWith("image/")) {
            context.res = {
                status: 400,
                body: "Imagem inválida ou ausente"
            };
            return;
        }

        const buffer = Buffer.isBuffer(req.body) ? req.body : Buffer.from(req.body);
       
        if (buffer.length > 15 * 1024 * 1024) {
            throw new Error("Imagem excede o tamanho máximo de 15MB.");
        }

        const credential = new DefaultAzureCredential({
            managedIdentityClientId: managedIdentityClientId,
        });

        const storage = new AzureBlobStorage(
            accountUrl,
            containerName,
            credential,
            context
        );

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
        
        const repository = new OcrImageRepository(pool, context);

        const uploadService = new UploadImageService(
            storage, 
            repository, 
            context
        );
        
        const { url, fileName } = await uploadService.handleUpload(buffer);

        context.res = {
            status: 200,
            body: {
                message: "Imagem armazenada com sucesso",
                url,
                fileName
            }
        };
    
    } catch (error) {
        context.log.error("Erro ao armazenar imagem", error.message);
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

