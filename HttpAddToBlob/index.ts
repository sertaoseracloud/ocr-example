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
        context.log("Iniciando a conexão com o banco de dados SQL Server");
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
        this.context.log("Conexão com o banco de dados SQL Server estabelecida com sucesso");
        this.context.log("Iniciando o repositório de imagens OCR");
        const repository = new OcrImageRepository(pool);
        this.context.log("Repositório de imagens OCR criado com sucesso");
        this.context.log("Iniciando o serviço de upload de imagens");
        const uploadService = new UploadImageService(
            storage, 
            repository, 
        );
        this.context.log("Serviço de upload de imagens criado com sucesso");
        this.context.log("Iniciando o upload da imagem");
        const { url, fileName } = await uploadService.handleUpload(buffer);
        this.context.log("Upload da imagem concluído com sucesso");
        context.res = {
            status: 200,
            body: {
                message: "Imagem armazenada com sucesso",
                url,
                fileName
            }
        };
    
    } catch (error) {
        context.log.error("Erro ao armazenar imagem", JSON.stringify(error, null, 2));
        context.res = {
            status: 500,
            body: "Erro ao armazenar imagem",
        };
    }
    
};

export default httpTrigger;

// crie um curl para essa requisicao com a imagem peixe na raiz desse projeto
// 
// curl -X POST "http://localhost:7071/api/HttpAddToBlob" -H "Content-Type: image/jpeg" --data-binary "@path/to/your/image.jpg"

