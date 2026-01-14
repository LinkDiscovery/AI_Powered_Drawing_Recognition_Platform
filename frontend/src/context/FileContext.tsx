import { createContext, useContext, useState, useMemo, type ReactNode } from 'react';

// Types extracted from UploadPage
export type Step = 'upload' | 'preview';
export type Status = 'idle' | 'uploading' | 'processing' | 'ready' | 'error';

export type UploadItem = {
    id: string;
    name: string;
    sizeText: string;
    progress: number; // 0~100
    status: Status;
    message?: string;
    mime: string;
    file?: File;
};

// Helper functions (could be moved to utility, but keeping here for now)
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
    const [items, setItems] = useState<UploadItem[]>([]);
    const [selectedId, setSelectedId] = useState<string | null>(null);

    const hasItems = items.length > 0;

    // Use useMemo for activeItem to ensure it updates correctly when items change
    const activeItem = useMemo(() => {
        return items.find((x) => x.id === selectedId) || items[0];
    }, [items, selectedId]);

    const canGoPreview = useMemo(() => {
        return items.some((it) => it.status === 'ready' || it.status === 'processing' || it.status === 'uploading');
    }, [items]);

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

        // Simulate upload/processing
        next.forEach((it) => {
            if (it.status === 'error') return;

            const id = it.id;
            let p = 0;
            const timer = window.setInterval(() => {
                p += 8;
                setItems((prev) =>
                    prev.map((x) => {
                        if (x.id !== id) return x;
                        const nextP = Math.min(100, p);

                        if (nextP < 60) {
                            return { ...x, progress: nextP, status: 'uploading', message: '업로드 중...' };
                        }
                        if (nextP < 95) {
                            return { ...x, progress: nextP, status: 'processing', message: '변환 준비 중...' };
                        }
                        if (nextP >= 100) {
                            return { ...x, progress: 100, status: 'ready', message: 'Ready' };
                        }
                        return { ...x, progress: nextP, status: 'processing', message: '처리 중...' };
                    })
                );

                if (p >= 100) window.clearInterval(timer);
            }, 120);
        });
    }

    function removeItem(id: string) {
        setItems((prev) => {
            const newItems = prev.filter((x) => x.id !== id);
            return newItems;
        });
        if (selectedId === id) setSelectedId(null);
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
    };

    return <FileContext.Provider value={value}>{children}</FileContext.Provider>;
}
