export class OcrImage {
    constructor(
        public readonly id: number,
        public readonly fileName: string,
        public readonly url: string,
        public readonly uploadDate: Date,
        public status: string,
        public readonly isPrescription: boolean
    ) {}
}
