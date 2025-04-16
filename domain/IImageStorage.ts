export interface IImageStorage {
    uploadImage(buffer: any, fileName: string): Promise<string>;
}