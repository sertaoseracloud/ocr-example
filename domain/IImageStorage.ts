export interface IImageStorage {
    uploadImage(buffer: Buffer, fileName: string): Promise<string>;
}