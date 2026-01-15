import { createContext, useContext, useState, useMemo, useEffect, useRef, type ReactNode } from 'react';
import { useAuth } from './AuthContext';

// ... (Types extracted from UploadPage, unchanged)
// Types extracted from UploadPage
export type Step = 'upload' | 'preview';
export type Status = 'idle' | 'uploading' | 'processing' | 'ready' | 'error';

export type UploadItem = {
    id: string; // Frontend ID
    dbId?: number; // Backend DB ID
    name: string;
    sizeText: string;
    progress: number; // 0~100
    status: Status;
    message?: string;
    mime: string;
    file?: File;
    initialSelection?: { x: number, y: number, width: number, height: number };
};

// ... (Helper functions unchanged)
function formatSize(bytes: number) {
    const mb = bytes / (1024 * 1024);
    if (mb >= 1) return `${mb.toFixed(2)} MB`;
    const kb = bytes / 1024;
    return `${kb.toFixed(0)} KB`;
}

function isSupported(file: File) {
    const okPdf = file.type === 'application/pdf';
    const okImg = file.type.startsWith('image/');
    return okPdf || okImg;
}

function uid() {
    return `${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

interface FileContextType {
    items: UploadItem[];
    addFiles: (fileList: FileList | null) => void;
    removeItem: (id: string) => void;
    selectedId: string | null;
    setSelectedId: (id: string | null) => void;
    activeItem: UploadItem | undefined;
    hasItems: boolean;
    canGoPreview: boolean;
    claimFile: (dbId: number) => Promise<void>;
    openSingleFile: (file: File, dbId?: number, initialSelection?: { x: number, y: number, width: number, height: number }) => void;
}

const FileContext = createContext<FileContextType | undefined>(undefined);

export function useFiles() {
    const context = useContext(FileContext);
    if (!context) {
        throw new Error('useFiles must be used within a FileProvider');
    }
    return context;
}

export function FileProvider({ children }: { children: ReactNode }) {
    const { token } = useAuth(); // Access authentication token
    const [items, setItems] = useState<UploadItem[]>([]);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const prevTokenRef = useRef<string | null>(token);

    // Effect: Clear items when user logs out (transition from token -> no token)
    useEffect(() => {
        if (prevTokenRef.current && !token) {
            setItems([]);
            setSelectedId(null);
        }
        prevTokenRef.current = token;
    }, [token]);

    const hasItems = items.length > 0;

    // Use useMemo for activeItem to ensure it updates correctly when items change
    const activeItem = useMemo(() => {
        return items.find((x) => x.id === selectedId) || items[0];
    }, [items, selectedId]);

    const canGoPreview = useMemo(() => {
        return items.some((it) => it.status === 'ready' || it.status === 'processing' || it.status === 'uploading');
    }, [items]);

    function updateItemStatus(id: string, progress: number, status: Status, message: string) {
        setItems((prev) =>
            prev.map((x) => {
                if (x.id !== id) return x;
                return { ...x, progress, status, message };
            })
        );
    }

    async function uploadFile(item: UploadItem) {
        // If authenticated, perform real upload
        // (Even if not authenticated for this specific task scope, we might want to upload to backend to get 'processing' logic later.
        // But for now, user requested 'saved when logged in'. Unauthenticated users might just get simulation or anonymous upload.)
        // Let's do real upload if token exists, fallback to sim if not (or maybe real upload without token if backend allows anonymous).
        // FileController allows anonymous upload (token optional). So let's ALWAYS upload to backend to be consistent!

        const formData = new FormData();
        if (item.file) {
            formData.append('file', item.file);
        }

        try {
            const xhr = new XMLHttpRequest();
            xhr.open('POST', 'http://localhost:8080/files', true);
            if (token) {
                xhr.setRequestHeader('Authorization', `Bearer ${token}`);
            }

            xhr.upload.onprogress = (e) => {
                if (e.lengthComputable) {
                    const percentComplete = Math.round((e.loaded / e.total) * 100);
                    // Update progress (0-99 during upload)
                    updateItemStatus(item.id, percentComplete < 100 ? percentComplete : 99, 'uploading', '업로드 중...');
                }
            };

            xhr.onload = function () {
                if (xhr.status === 200) {
                    try {
                        const res = JSON.parse(xhr.responseText);
                        // Atomic update: Set DB ID and Status to Ready
                        setItems((prev) => prev.map(x => {
                            if (x.id !== item.id) return x;
                            return {
                                ...x,
                                dbId: res.id,
                                progress: 100,
                                status: 'ready',
                                message: '검사 완료'
                            };
                        }));
                    } catch (e) {
                        // Fallback if parsing fails (shouldn't happen with correct backend)
                        updateItemStatus(item.id, 100, 'ready', '검사 완료 (ID missing)');
                    }
                } else {
                    updateItemStatus(item.id, 0, 'error', '업로드 실패');
                }
            };

            xhr.onerror = function () {
                updateItemStatus(item.id, 0, 'error', '네트워크 오류');
            };

            xhr.send(formData);

        } catch (e) {
            console.error(e);
            updateItemStatus(item.id, 0, 'error', '오류 발생');
        }
    }

    function addFiles(fileList: FileList | null) {
        if (!fileList || fileList.length === 0) return;

        const next: UploadItem[] = [];
        for (const file of Array.from(fileList)) {
            if (!isSupported(file)) {
                next.push({
                    id: uid(),
                    name: file.name,
                    sizeText: formatSize(file.size),
                    progress: 0,
                    status: 'error',
                    message: '지원하지 않는 파일 형식입니다. (PDF/이미지만 가능)',
                    mime: file.type,
                    file,
                });
                continue;
            }

            next.push({
                id: uid(),
                name: file.name,
                sizeText: formatSize(file.size),
                progress: 0,
                status: 'uploading',
                message: '업로드 준비 중...',
                mime: file.type,
                file,
            });
        }

        setItems((prev) => {
            const merged = [...next, ...prev];
            // Select the first newly added file if no selection exists or just as a default behavior
            if (next.length > 0 && !selectedId) setSelectedId(next[0].id);
            return merged;
        });

        // Trigger Upload
        next.forEach((it) => {
            if (it.status === 'error') return;
            uploadFile(it);
        });
    }

    function removeItem(id: string) {
        setItems((prev) => {
            const newItems = prev.filter((x) => x.id !== id);
            return newItems;
        });
        if (selectedId === id) setSelectedId(null);
    }

    async function claimFile(dbId: number) {
        if (!token) throw new Error("Login required");
        const res = await fetch(`http://localhost:8080/api/files/${dbId}/assign`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) throw new Error("Failed to claim file");
    }

    // Open a single file (e.g. from Dashboard)
    // - Clears existing list
    // - Adds this file
    // - Selects it
    // - Optionally sets DB ID if known (to avoid re-upload if logic allows, but simplistic approach is fine)
    function openSingleFile(file: File, dbId?: number, initialSelection?: { x: number, y: number, width: number, height: number }) {
        if (!isSupported(file)) {
            alert("지원하지 않는 파일 형식입니다.");
            return;
        }

        const id = uid();
        const newItem: UploadItem = {
            id,
            dbId, // If provided, we assume it's already on server
            name: file.name,
            sizeText: formatSize(file.size),
            progress: 100, // Assumed ready if opening from dashboard
            status: 'ready',
            message: '불러오기 완료',
            mime: file.type,
            file,
            initialSelection
        };

        setItems([newItem]);
        setSelectedId(id);
    }

    const value = {
        items,
        addFiles,
        removeItem,
        selectedId,
        setSelectedId,
        activeItem,
        hasItems,
        canGoPreview,
        claimFile,
        openSingleFile
    };

    return <FileContext.Provider value={value}>{children}</FileContext.Provider>;
}
