import { Context } from "@azure/functions";
import { IImageRepository } from "../domain/IImageRepository";
import { IImageStorage } from "../domain/IImageStorage";
import { v4 as uuidv4 } from "uuid";

export class UploadImageService {
    constructor(
        private readonly imageStorage: IImageStorage,
        private readonly imageRepository: IImageRepository,
        private readonly context: Context
    ) {}
    async handleUpload(buffer: Buffer): Promise<{ url: string; fileName: string }> {
        this.context.log("Iniciando o upload da imagem");
        const fileName = `${uuidv4()}.png`;
        const url = await this.imageStorage.uploadImage(buffer, fileName);
        const repository = this.imageRepository.save(fileName, url);
        if (!repository) {
            throw new Error("Erro ao salvar a imagem no repositório");
        }
        this.context.log("Imagem armazenada com sucesso", url);
        return { url, fileName };
    }
}