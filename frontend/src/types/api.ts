// API Response Types - Matches Backend Entities Exactly

export interface BBox {
    id: number;
    type: 'title' | 'front' | 'side' | 'plan';
    x: number;
    y: number;
    width: number;
    height: number;
    page: number;
    frontendId?: string;
}

export interface UserFile {
    id: number;
    userId: number | null;
    name: string;
    filePath: string;
    fileSize: number;
    uploadTime: string; // ISO 8601 format
    folderId: number | null;
    isTrashed: boolean;
    rotation: number;
    bboxes: BBox[];
}

export interface Folder {
    id: number;
    name: string;
    userId: number;
    parentFolderId: number | null;
    isTrashed: boolean;
    createdAt: string;
}
