declare module 'pdfjs-dist' {
    export const GlobalWorkerOptions: {
        workerSrc: string;
    };
    export function getDocument(source: any): {
        promise: Promise<PDFDocumentProxy>;
    };
    export type PDFDocumentProxy = {
        numPages: number;
        getPage(number: number): Promise<any>;
        destroy(): void;
    };
    // Add other types as needed or use any
}
