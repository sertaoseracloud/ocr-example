/**
 * @file IImageStorage.ts
 * @description This file defines the IImageStorage interface for image storage services.
 * It includes a method for uploading images.
 * The interface is used to abstract the implementation of image storage services,
 * allowing for different storage solutions (e.g., Azure Blob Storage, AWS S3, etc.) to be used interchangeably.
 * This is part of a larger application that handles image uploads and processing.
 * The application is designed to be modular and extensible, following best practices in software design.
 * The interface is implemented by concrete classes that provide the actual storage functionality.
 */
export interface IImageStorage {
    uploadImage(buffer: Buffer, fileName: string): Promise<string>;
    downloadImage(fileName: string): Promise<NodeJS.ReadableStream>;
}