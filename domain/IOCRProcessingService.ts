export interface ProcessResult {
    processed: { id: number; isPrescription: boolean }[];
    errors: { id: number; error: Error }[];
}

export interface IOCRProcessingService {
    execute(): Promise<ProcessResult>;
}