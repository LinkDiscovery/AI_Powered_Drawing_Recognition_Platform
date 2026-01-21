import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../../context/ToastContext';
import { useFiles } from '../../context/FileContext';

interface BBox {
    id: number;
    frontendId?: string;
    type: string;
    x: number;
    y: number;
    width: number;
    height: number;
    page?: number;
}

interface UserFile {
    id: number;
    fileName: string;
    fileSize: number;
    uploadTime: string;
    rotation?: number;
    bboxes?: BBox[];
    contentType?: string; // Add optional if backend sends it, otherwise ignore
}

export default function UserDashboard() {
    const { user, isAuthenticated, token } = useAuth();
    const navigate = useNavigate();
    const { showToast } = useToast();
    const { openSingleFile } = useFiles();
    const [fileList, setFileList] = useState<UserFile[]>([]);
    const [loading, setLoading] = useState(false);

    const [loadingPreview, setLoadingPreview] = useState(false);

    useEffect(() => {
        if (!isAuthenticated) {
            navigate('/');
            return;
        }

        const fetchFiles = async () => {
            if (!token) return;
            setLoading(true);
            try {
                const res = await fetch('http://localhost:8080/api/user/files', {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (res.ok) {
                    const data = await res.json();
                    setFileList(data);
                } else {
                    console.error("Failed to fetch files");
                }
            } catch (err) {
                console.error("Error fetching files", err);
            } finally {
                setLoading(false);
            }
        };

        fetchFiles();
    }, [isAuthenticated, navigate, token]);

    const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());


    // Reset selection when loading new list
    useEffect(() => {
        setSelectedIds(new Set());
    }, [fileList.length]);

    const handleSelectAll = (checked: boolean) => {
        if (checked) {
            setSelectedIds(new Set(fileList.map(f => f.id)));
        } else {
            setSelectedIds(new Set());
        }
    };

    const handleSelectOne = (id: number, checked: boolean) => {
        const next = new Set(selectedIds);
        if (checked) next.add(id);
        else next.delete(id);
        setSelectedIds(next);
    };

    const handleBatchDelete = async () => {
        if (!token) return;
        if (!window.confirm(`선택한 ${selectedIds.size}개 파일을 영구적으로 삭제하시겠습니까?`)) return;

        setLoading(true);
        try {
            const deletePromises = Array.from(selectedIds).map(id =>
                fetch(`http://localhost:8080/api/files/${id}`, {
                    method: 'DELETE',
                    headers: { 'Authorization': `Bearer ${token}` }
                })
            );

            await Promise.all(deletePromises);

            // Optimistic update
            setFileList(prev => prev.filter(f => !selectedIds.has(f.id)));
            setSelectedIds(new Set());
            showToast(`${selectedIds.size}개 파일이 삭제되었습니다.`, 'success');
        } catch (e) {
            console.error(e);
            showToast("일괄 삭제 중 오류가 발생했습니다.", 'error');
        } finally {
            setLoading(false);
        }
    };

    const handlePreview = async (file: UserFile) => {
        if (!token) return;
        setLoadingPreview(true);
        try {
            const res = await fetch(`http://localhost:8080/api/files/${file.id}/download`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const blob = await res.blob();
                const downloadedFile = new File([blob], file.fileName, { type: blob.type });

                // Prepare initial selection from BBoxes if exists (focus on title)
                let initialSelection;
                let coordinatesStr;

                if (file.bboxes && file.bboxes.length > 0) {
                    const frontendBBoxes = file.bboxes.map(b => ({
                        id: b.frontendId || String(b.id),
                        type: b.type,
                        rect: {
                            x: b.x,
                            y: b.y,
                            width: b.width,
                            height: b.height
                        },
                        page: b.page || 1
                    }));
                    coordinatesStr = JSON.stringify(frontendBBoxes);

                    const titleBox = frontendBBoxes.find(b => b.type === 'title');
                    if (titleBox) {
                        initialSelection = titleBox.rect;
                    }
                }

                // Open in Context and Navigate
                openSingleFile(
                    downloadedFile,
                    file.id,
                    initialSelection,
                    coordinatesStr,
                    file.rotation
                );
                navigate('/preview');


            } else {
                showToast("파일을 불러오는데 실패했습니다.", 'error');
            }
        } catch (error) {
            console.error(error);
            showToast("오류가 발생했습니다.", 'error');
        } finally {
            setLoadingPreview(false);
        }
    };

    // handleSaveCoordinates is no longer needed here as it is handled in PreviewPage/PdfViewer interactions
    // But wait, PreviewPage needs to know how to save.
    // PreviewPage uses PdfViewer. PdfViewer handles onSave.
    // Does PreviewPage implement onSave?
    // Let's check PreviewPage code later. 
    // Actually, PreviewPage doesn't have onSaveSelection prop on PdfViewer yet?
    // UserDashboard previously passed `handleSaveCoordinates`.
    // We should ensure PreviewPage/PdfViewer can handle saving.
    // For now, removing `handleSaveCoordinates` from here is correct as we are leaving this page.

    const handleDelete = async (fileId: number) => {
        if (!token) return;
        if (!window.confirm("정말로 이 파일을 삭제하시겠습니까?")) return;

        try {
            const res = await fetch(`http://localhost:8080/api/files/${fileId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                setFileList(prev => prev.filter(f => f.id !== fileId));
                showToast("삭제되었습니다.", 'success');
            } else {
                showToast("삭제 실패", 'error');
            }
        } catch (error) {
            console.error(error);
            showToast("오류가 발생했습니다.", 'error');
        }
    };

    const handleDownload = async (file: UserFile) => {
        if (!token) return;
        try {
            const res = await fetch(`http://localhost:8080/api/files/${file.id}/download`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const blob = await res.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = file.fileName;
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
                document.body.removeChild(a);
            } else {
                showToast("다운로드 실패", 'error');
            }
        } catch (e) {
            console.error(e);
            showToast("오류가 발생했습니다.", 'error');
        }
    };

    if (!isAuthenticated) return null;

    return (
        <div style={{
            maxWidth: '1000px',
            margin: '40px auto',
            padding: '20px',
            fontFamily: 'sans-serif'
        }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
                <h1 style={{ fontSize: '24px', fontWeight: 'bold', margin: 0 }}>
                    마이 페이지
                </h1>
                <button
                    onClick={() => navigate('/upload')}
                    style={{
                        background: 'none', border: 'none', color: '#666', cursor: 'pointer',
                        display: 'flex', alignItems: 'center', gap: '4px', fontSize: '14px', fontWeight: 500
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.color = '#333'}
                    onMouseLeave={(e) => e.currentTarget.style.color = '#666'}
                >
                    <span>←</span> 파일 업로드
                </button>
            </div>

            <div style={{
                background: '#f7f9fc',
                padding: '24px',
                borderRadius: '8px',
                border: '1px solid #e1e5ea',
                marginBottom: '24px'
            }}>
                <div style={{ marginBottom: '16px' }}>
                    <p style={{ fontWeight: '600', marginBottom: '8px' }}>
                        안녕하세요, {user?.name || '사용자'}님
                    </p>
                    <p style={{ fontSize: '14px', color: '#666' }}>
                        이곳은 {user?.name}님의 마이 페이지입니다. 업로드한 도면 파일을 확인하고 관리하세요.
                    </p>
                </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h2 style={{ fontSize: '20px', fontWeight: 'bold' }}>
                    내 도면 히스토리
                </h2>
                {selectedIds.size > 0 && (
                    <button
                        onClick={handleBatchDelete}
                        style={{
                            padding: '8px 12px',
                            background: '#ff4d4f',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '13px',
                            fontWeight: 600
                        }}
                    >
                        선택한 {selectedIds.size}개 삭제
                    </button>
                )}
            </div>

            {loading ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: '60px' }}>
                    <div className="spinner" />
                </div>
            ) : fileList.length === 0 ? (
                <div style={{
                    padding: '60px 20px',
                    textAlign: 'center',
                    background: '#fff',
                    borderRadius: '8px',
                    border: '1px solid #eee',
                    color: '#888',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '16px'
                }}>
                    <p>아직 업로드한 파일이 없습니다.</p>
                    <button
                        onClick={() => navigate('/upload')}
                        style={{
                            padding: '10px 20px',
                            background: '#e03a3a',
                            color: 'white',
                            border: 'none',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            fontSize: '14px',
                            fontWeight: 600
                        }}
                    >
                        도면 업로드하러 가기
                    </button>
                </div>
            ) : (
                <div style={{ background: 'white', borderRadius: '8px', border: '1px solid #eee', overflow: 'hidden' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                        <thead style={{ background: '#f5f5f5' }}>
                            <tr>
                                <th style={{ padding: '12px 16px', width: 40, textAlign: 'center' }}>
                                    <input
                                        type="checkbox"
                                        onChange={(e) => handleSelectAll(e.target.checked)}
                                        checked={fileList.length > 0 && selectedIds.size === fileList.length}
                                    />
                                </th>
                                <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: '600', color: '#555' }}>파일 이름</th>
                                <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: '600', color: '#555' }}>크기</th>
                                <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: '600', color: '#555' }}>업로드 일시</th>
                                <th style={{ padding: '12px 16px', textAlign: 'right', fontWeight: '600', color: '#555' }}></th>
                            </tr>
                        </thead>
                        <tbody>
                            {fileList.map((file) => (
                                <tr key={file.id} style={{ borderTop: '1px solid #eee', background: selectedIds.has(file.id) ? '#f0f5ff' : 'white' }}>
                                    <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                                        <input
                                            type="checkbox"
                                            checked={selectedIds.has(file.id)}
                                            onChange={(e) => handleSelectOne(file.id, e.target.checked)}
                                        />
                                    </td>
                                    <td style={{ padding: '12px 16px', color: '#333' }}>
                                        <div
                                            style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}
                                            onClick={() => handlePreview(file)}
                                        >
                                            <span>{file.fileName.toLowerCase().endsWith('.pdf') ? '📄' : '🖼️'}</span>
                                            <span style={{ textDecoration: 'underline', color: '#1a73e8' }}>
                                                {file.fileName}
                                            </span>
                                        </div>
                                    </td>
                                    <td style={{ padding: '12px 16px', color: '#666' }}>
                                        {(file.fileSize / 1024).toFixed(0)} KB
                                    </td>
                                    <td style={{ padding: '12px 16px', color: '#666' }}>
                                        {new Date(file.uploadTime).toLocaleString()}
                                    </td>
                                    <td style={{ padding: '12px 16px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '8px' }}>
                                            <button
                                                onClick={() => handleDownload(file)}
                                                style={{
                                                    padding: '6px 12px',
                                                    borderRadius: '4px',
                                                    border: '1px solid #ddd',
                                                    background: 'white',
                                                    color: '#666',
                                                    cursor: 'pointer',
                                                    fontSize: '12px'
                                                }}
                                            >
                                                다운로드
                                            </button>
                                            <button
                                                onClick={() => handleDelete(file.id)}
                                                style={{
                                                    padding: '6px 12px',
                                                    borderRadius: '4px',
                                                    border: '1px solid #ff4d4f',
                                                    background: 'white',
                                                    color: '#ff4d4f',
                                                    cursor: 'pointer',
                                                    fontSize: '12px'
                                                }}
                                            >
                                                삭제
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {loadingPreview && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: 'rgba(255,255,255,0.7)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 2000
                }}>
                    <div style={{
                        padding: '24px',
                        background: 'white',
                        borderRadius: '12px',
                        boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '12px'
                    }}>
                        <div className="spinner" />
                        <span style={{ color: '#555', fontWeight: 500 }}>파일 불러오는 중...</span>
                    </div>
                </div>
            )}
        </div>
    );
}
