import { AzureFunction, Context, HttpRequest } from "@azure/functions"
import { DefaultAzureCredential } from "@azure/identity";
import { AzureBlobStorage } from "../infrastructure/AzureBlobStorage";
import { UploadImageService } from "../application/UploadImageService";
import { OcrImageRepository } from "../infrastructure/OcrImageRepository";
import { Pool } from "pg";

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


/**
 * This function is triggered by an HTTP request.
 * It expects an image in the request body and uploads it to Azure Blob Storage.
 * If the upload is successful, it returns the URL of the uploaded image.
 */
const httpTrigger: AzureFunction = async function (context: Context, req: HttpRequest): Promise<void> {
    context.log("Processing image upload...");
    try {
        context.log("Verificando se o corpo da requisição contém uma imagem válida");
        if (!req.body || !req.headers["content-type"]?.startsWith("image/")) {
            context.res = {
                status: 400,
                body: "Imagem inválida ou ausente"
            };
            return;
        }
        context.log("Corpo da requisição contém uma imagem válida");
        context.log("Verificando o tamanho da imagem");
        const buffer = Buffer.isBuffer(req.body) ? req.body : Buffer.from(req.body);
        context.log("Tamanho da imagem:", buffer.length);
        if (buffer.length > 15 * 1024 * 1024) {
            throw new Error("Imagem excede o tamanho máximo de 15MB.");
        }
        context.log("Tamanho da imagem válido");
        context.log("Buscando credenciais do Azure Blob Storage");
        const credential = new DefaultAzureCredential({
            managedIdentityClientId: managedIdentityClientId,
        });
        context.log("Credenciais do Azure Blob Storage obtidas com sucesso");
        context.log("Iniciando o cliente do Azure Blob Storage");
        const storage = new AzureBlobStorage(
            accountUrl,
            containerName,
            credential,
        );
        context.log("Cliente do Azure Blob Storage criado com sucesso");
        context.log("Buscando credenciais do Azure PostgresSQL Database");
        const { token: password } = await credential.getToken('https://ossrdbms-aad.database.windows.net/.default');
        context.log("Credenciais do Azure PostgresSQL Database obtidas com sucesso");
        context.log("Iniciando o cliente do Azure PostgresSQL Database");
        const pool = new Pool({
            host,
            user,
            password,
            database,
            port,
            ssl,
        });
        context.log("Cliente do Azure PostgresSQL Database criado com sucesso");
        context.log("Iniciando o repositório de imagens OCR");
        const repository = new OcrImageRepository(pool);
        context.log("Repositório de imagens OCR criado com sucesso");
        context.log("Iniciando o serviço de upload de imagens");
        const uploadService = new UploadImageService(
            storage, 
            repository, 
        );
        context.log("Serviço de upload de imagens criado com sucesso");
        context.log("Iniciando o upload da imagem");
        const { url, fileName } = await uploadService.handleUpload(buffer);
        context.log("Upload da imagem concluído com sucesso");
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

