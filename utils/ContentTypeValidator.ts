import { AllowedContentTypes } from "../constants";


export class ContentTypeValidator {
    private static allowedTypes = Object.values(AllowedContentTypes);

    static validate(contentType?: AllowedContentTypes): void {
        if (!contentType || !this.allowedTypes.includes(contentType)) {
            throw new Error('Tipo de conteúdo não suportado. Envie uma imagem JPEG ou PNG.');
        }
    }
}