import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import PdfViewer from '../../components/PdfViewer';

interface UserFile {
    id: number;
    fileName: string;
    fileSize: number;
    uploadTime: string;
}

export default function UserDashboard() {
    const { user, isAuthenticated, token } = useAuth();
    const navigate = useNavigate();
    const [fileList, setFileList] = useState<UserFile[]>([]);
    const [loading, setLoading] = useState(false);

    // Preview State
    const [previewFile, setPreviewFile] = useState<File | null>(null);
    const [isPreviewOpen, setIsPreviewOpen] = useState(false);
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
                setPreviewFile(downloadedFile);
                setIsPreviewOpen(true);
            } else {
                alert("파일을 불러오는데 실패했습니다.");
            }
        } catch (error) {
            console.error(error);
            alert("오류가 발생했습니다.");
        } finally {
            setLoadingPreview(false);
        }
    };

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
                alert("삭제되었습니다.");
            } else {
                alert("삭제 실패");
            }
        } catch (error) {
            console.error(error);
            alert("오류가 발생했습니다.");
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
            <h1 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '20px' }}>
                마이 페이지
            </h1>

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

            <h2 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '16px' }}>
                내 도면 히스토리
            </h2>

            {loading ? (
                <p>로딩 중...</p>
            ) : fileList.length === 0 ? (
                <div style={{
                    padding: '40px',
                    textAlign: 'center',
                    background: '#fff',
                    borderRadius: '8px',
                    border: '1px solid #eee',
                    color: '#888'
                }}>
                    아직 업로드한 파일이 없습니다.
                </div>
            ) : (
                <div style={{ background: 'white', borderRadius: '8px', border: '1px solid #eee', overflow: 'hidden' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                        <thead style={{ background: '#f5f5f5' }}>
                            <tr>
                                <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: '600', color: '#555' }}>파일 이름</th>
                                <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: '600', color: '#555' }}>크기</th>
                                <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: '600', color: '#555' }}>업로드 일시</th>
                                <th style={{ padding: '12px 16px', textAlign: 'right', fontWeight: '600', color: '#555' }}>작업</th>
                            </tr>
                        </thead>
                        <tbody>
                            {fileList.map((file) => (
                                <tr key={file.id} style={{ borderTop: '1px solid #eee' }}>
                                    <td style={{ padding: '12px 16px', color: '#333' }}>
                                        <div
                                            style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}
                                            onClick={() => handlePreview(file)}
                                        >
                                            <span>📄</span>
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
                                    <td style={{ padding: '12px 16px', textAlign: 'right' }}>
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
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Preview Modal */}
            {isPreviewOpen && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: 'rgba(0,0,0,0.5)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 1000
                }} onClick={() => setIsPreviewOpen(false)}>
                    <div style={{
                        background: 'white',
                        width: '90vw',
                        height: '90vh',
                        borderRadius: '8px',
                        overflow: 'hidden',
                        position: 'relative',
                        display: 'flex',
                        flexDirection: 'column'
                    }} onClick={e => e.stopPropagation()}>
                        <div style={{
                            padding: '12px 20px',
                            borderBottom: '1px solid #eee',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center'
                        }}>
                            <h3 style={{ margin: 0, fontSize: '16px' }}>미리보기: {previewFile?.name}</h3>
                            <button
                                onClick={() => setIsPreviewOpen(false)}
                                style={{
                                    background: 'none',
                                    border: 'none',
                                    fontSize: '24px',
                                    cursor: 'pointer',
                                    padding: '0 8px'
                                }}
                            >
                                &times;
                            </button>
                        </div>
                        <div style={{ flex: 1, overflow: 'hidden', padding: '10px', background: '#f0f0f0' }}>
                            {loadingPreview ? (
                                <div style={{ display: 'grid', placeItems: 'center', height: '100%' }}>로딩 중...</div>
                            ) : (
                                <PdfViewer file={previewFile} />
                            )}
                        </div>
                    </div>
                </div>
            )}

            {loadingPreview && !isPreviewOpen && (
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
                        padding: '20px',
                        background: 'white',
                        borderRadius: '8px',
                        boxShadow: '0 2px 10px rgba(0,0,0,0.1)'
                    }}>
                        파일 불러오는 중...
                    </div>
                </div>
            )}
        </div>
    );
}
