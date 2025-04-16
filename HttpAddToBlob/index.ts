import { AzureFunction, Context, HttpRequest } from "@azure/functions";
import { DefaultAzureCredential } from "@azure/identity";
import { AzureBlobStorage } from "../infrastructure/AzureBlobStorage";
import { UploadImageService } from "../application/UploadImageService";
import { OcrImageRepository } from "../infrastructure/OcrImageRepository";
import { Pool } from "pg";
import { ContentTypeValidator } from "../validations/ContentTypeValidator";
import { AllowedContentTypes } from "../constants";

// Azure Blob Storage connection details
const accountUrl = process.env.AZURE_STORAGEBLOB_RESOURCEENDPOINT;
const managedIdentityClientId = process.env.AZURE_STORAGEBLOB_CLIENTID;
const containerName = process.env.AZURE_STORAGEBLOB_CONTAINERNAME || "ocr-container";

// Azure Postgres SQL Database connection details
const host = process.env.AZURE_POSTGRESQL_HOST;
const user = process.env.AZURE_POSTGRESQL_USER;
const database = process.env.AZURE_POSTGRESQL_DATABASE;
const port = parseInt(process.env.AZURE_POSTGRESQL_PORT);
const ssl = process.env.AZURE_POSTGRESQL_SSL === "true" ? { rejectUnauthorized: false } : false;

const httpTrigger: AzureFunction = async function (context: Context, req: HttpRequest): Promise<void> {
    try {
        if (!req.body) {
            context.res = {
                status: 400,
                body: "Imagem inválida ou ausente"
            };
            return;
        }

        const contentType = req.headers['content-type'];
        ContentTypeValidator.validate(contentType as AllowedContentTypes);
        
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
            AllowedContentTypes[contentType],
        );
       
        const { token: password } = await credential.getToken('https://ossrdbms-aad.database.windows.net/.default');
        
        const pool = new Pool({
            host,
            user,
            password,
            database,
            port,
            ssl,
        });
       
        const repository = new OcrImageRepository(pool);
        
        const uploadService = new UploadImageService(
            storage, 
            repository, 
        );
       
        const { url, fileName } = await uploadService.handleUpload(buffer);

        await pool.end();

        context.res = {
            status: 200,
            body: {
                message: "Imagem armazenada com sucesso",
                url,
                fileName
            }
        };
    
    } catch (error) {
        context.log.error("Erro ao armazenar imagem", error);
        context.res = {
            status: 500,
            body: "Erro ao armazenar imagem",
            error
        };
    } 
    
};

export default httpTrigger;

// crie um curl para essa requisicao com a imagem peixe na raiz desse projeto
// 
// curl -X POST "http://localhost:7071/api/HttpAddToBlob" -H "Content-Type: image/jpeg" --data-binary "@path/to/your/image.jpg"

