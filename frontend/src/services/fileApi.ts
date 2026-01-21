import type { UserFile, BBox, Folder } from '../types/api';

const API_BASE = 'http://localhost:8080/api';

// Helper to get auth header
const getAuthHeader = (token: string) => ({
    'Authorization': `Bearer ${token}`
});

export const fileApi = {
    /**
     * Upload a file (creates UserFile with empty bboxes)
     */
    upload: async (file: File, token: string): Promise<UserFile> => {
        const formData = new FormData();
        formData.append('file', file);

        const response = await fetch(`${API_BASE}/../files`, {
            method: 'POST',
            headers: getAuthHeader(token),
            body: formData
        });

        if (!response.ok) {
            throw new Error(`Upload failed: ${response.statusText}`);
        }

        return response.json();
    },

    /**
     * Save BBoxes and rotation for a file
     */
    saveBBoxes: async (
        fileId: number,
        bboxes: BBox[],
        rotation: number,
        token: string
    ): Promise<void> => {
        const coordinatesJson = JSON.stringify(
            bboxes.map(bbox => ({
                type: bbox.type,
                id: bbox.frontendId,
                rect: {
                    x: bbox.x,
                    y: bbox.y,
                    width: bbox.width,
                    height: bbox.height
                },
                page: bbox.page
            }))
        );

        const response = await fetch(`${API_BASE}/files/${fileId}/coordinates`, {
            method: 'POST',
            headers: {
                ...getAuthHeader(token),
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                coordinates: coordinatesJson,
                rotation
            })
        });

        if (!response.ok) {
            throw new Error(`Save coordinates failed: ${response.statusText}`);
        }
    },

    /**
     * List files with optional filters
     */
    listFiles: async (
        folderId?: number | null,
        trashed?: boolean,
        token?: string
    ): Promise<UserFile[]> => {
        if (!token) {
            throw new Error('Token required');
        }

        const params = new URLSearchParams();
        if (folderId !== undefined && folderId !== null) {
            params.append('folderId', folderId.toString());
        }
        if (trashed) {
            params.append('trashed', 'true');
        }

        const query = params.toString();
        const url = `${API_BASE}/user/files${query ? '?' + query : ''}`;

        const response = await fetch(url, {
            headers: getAuthHeader(token)
        });

        if (!response.ok) {
            throw new Error(`List files failed: ${response.statusText}`);
        }

        return response.json();
    },

    /**
     * Get a single file with all bboxes
     */
    getFile: async (fileId: number, token: string): Promise<UserFile> => {
        const response = await fetch(`${API_BASE}/files/${fileId}`, {
            headers: getAuthHeader(token)
        });

        if (!response.ok) {
            throw new Error(`Get file failed: ${response.statusText}`);
        }

        return response.json();
    },

    /**
     * Get download URL for file binary
     */
    getDownloadUrl: (fileId: number, token: string): string => {
        return `${API_BASE}/files/${fileId}/download`;
    },

    /**
     * Delete a file
     */
    deleteFile: async (fileId: number, token: string): Promise<void> => {
        const response = await fetch(`${API_BASE}/files/${fileId}`, {
            method: 'DELETE',
            headers: getAuthHeader(token)
        });

        if (!response.ok) {
            throw new Error(`Delete file failed: ${response.statusText}`);
        }
    },

    /**
     * Trash a file (soft delete)
     */
    trashFile: async (fileId: number, token: string): Promise<void> => {
        const response = await fetch(`${API_BASE}/files/${fileId}/trash`, {
            method: 'POST',
            headers: getAuthHeader(token)
        });

        if (!response.ok) {
            throw new Error(`Trash file failed: ${response.statusText}`);
        }
    },

    /**
     * Restore a file from trash
     */
    restoreFile: async (fileId: number, token: string): Promise<void> => {
        const response = await fetch(`${API_BASE}/files/${fileId}/restore`, {
            method: 'POST',
            headers: getAuthHeader(token)
        });

        if (!response.ok) {
            throw new Error(`Restore file failed: ${response.statusText}`);
        }
    }
};

export const folderApi = {
    /**
     * Create a new folder
     */
    create: async (name: string, parentId: number | null, token: string): Promise<Folder> => {
        const response = await fetch(`${API_BASE}/folders`, {
            method: 'POST',
            headers: {
                ...getAuthHeader(token),
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ name, parentId })
        });

        if (!response.ok) {
            throw new Error(`Create folder failed: ${response.statusText}`);
        }

        return response.json();
    },

    /**
     * List folders
     */
    list: async (parentId?: number | null, trashed?: boolean, token?: string): Promise<Folder[]> => {
        if (!token) {
            throw new Error('Token required');
        }

        const params = new URLSearchParams();
        if (parentId !== undefined && parentId !== null) {
            params.append('parentId', parentId.toString());
        }
        if (trashed) {
            params.append('trashed', 'true');
        }

        const query = params.toString();
        const url = `${API_BASE}/folders${query ? '?' + query : ''}`;

        const response = await fetch(url, {
            headers: getAuthHeader(token)
        });

        if (!response.ok) {
            throw new Error(`List folders failed: ${response.statusText}`);
        }

        return response.json();
    }
};
