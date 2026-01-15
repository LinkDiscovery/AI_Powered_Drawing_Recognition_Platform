import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';

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
                        이곳은 {user?.name}님의 마이 페이지입니다. 업로드한 도면 파일을 확인하세요.
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
                            </tr>
                        </thead>
                        <tbody>
                            {fileList.map((file) => (
                                <tr key={file.id} style={{ borderTop: '1px solid #eee' }}>
                                    <td style={{ padding: '12px 16px', color: '#333' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <span>📄</span>
                                            {file.fileName}
                                        </div>
                                    </td>
                                    <td style={{ padding: '12px 16px', color: '#666' }}>
                                        {(file.fileSize / 1024).toFixed(0)} KB
                                    </td>
                                    <td style={{ padding: '12px 16px', color: '#666' }}>
                                        {new Date(file.uploadTime).toLocaleString()}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
