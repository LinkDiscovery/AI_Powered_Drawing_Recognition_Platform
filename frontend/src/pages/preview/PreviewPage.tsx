import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import PdfViewer from '../../components/PdfViewer';
import { useFiles } from '../../context/FileContext';
import Sidebar from '../../components/layout/Sidebar';
import { useAuth } from '../../context/AuthContext';

export default function PreviewPage() {
    const navigate = useNavigate();
    const { token } = useAuth();
    const { activeItem, selectedId, hasItems } = useFiles();
    const [isProcessing, setIsProcessing] = useState(true);
    const [savedRect, setSavedRect] = useState(activeItem?.initialSelection);

    // activeItem changes, update savedRect
    useEffect(() => {
        setSavedRect(activeItem?.initialSelection);
    }, [activeItem]);

    const handleDownload = () => {
        if (!activeItem?.file) return;

        // 1. Download File
        const fileUrl = URL.createObjectURL(activeItem.file);
        const a = document.createElement('a');
        a.href = fileUrl;
        a.download = activeItem.name;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(fileUrl);

        // 2. Download JSON (if coordinates exist)
        if (savedRect) {
            const jsonContent = JSON.stringify({
                fileName: activeItem.name,
                coordinates: savedRect,
                savedAt: new Date().toISOString()
            }, null, 2);

            const blob = new Blob([jsonContent], { type: 'application/json' });
            const jsonUrl = URL.createObjectURL(blob);
            const b = document.createElement('a');
            b.href = jsonUrl;
            b.download = `${activeItem.name}.json`;
            document.body.appendChild(b);
            b.click();
            document.body.removeChild(b);
            URL.revokeObjectURL(jsonUrl);
        }
    };

    // Redirect if no files
    useEffect(() => {
        if (!hasItems) {
            navigate('/upload');
        }
    }, [hasItems, navigate]);

    // Simulate Processing Delay
    useEffect(() => {
        if (hasItems) {
            setIsProcessing(true);
            const timer = setTimeout(() => {
                setIsProcessing(false);
            }, 1800);
            return () => clearTimeout(timer);
        }
    }, [hasItems, selectedId]); // Re-run when file selection changes

    if (!hasItems) return null;

    return (
        <div style={styles.appShell}>
            {/* Left Sidebar */}
            <Sidebar />

            <div style={styles.mainArea}>
                {/* Header (re-use existing header or make simplified version? reusing existing for consistency) */}
                <div style={styles.headerWrapper}>
                    {/* We might want to hide the full header here or keep it. 
                       Smallpdf usually has a simplified header in tool view.
                       For now, let's keep it simple or use a custom top bar. */}
                </div>

                {isProcessing ? (
                    /* Processing Screen */
                    <div style={styles.processingScreen}>
                        <div style={styles.processingContent}>
                            <div style={styles.previewCard}>
                                <div style={styles.docIcon}>
                                    📄
                                </div>
                                <div style={styles.docLines}>
                                    <div style={{ ...styles.line, width: '80%' }} />
                                    <div style={{ ...styles.line, width: '60%' }} />
                                    <div style={{ ...styles.line, width: '90%' }} />
                                </div>
                                {/* Scanning line animation */}
                                <div className="scan-line" />
                            </div>

                            <h2 style={styles.procTitle}>{activeItem?.name}</h2>
                            <p style={styles.procSub}>처리 중...</p>

                            <div className="spinner" style={{ width: 24, height: 24, borderWidth: 3 }} />
                        </div>
                    </div>
                ) : (
                    /* Main Viewer */
                    <main style={styles.page}>
                        <div style={styles.previewHeader}>
                            <div style={styles.titleInfo}>
                                <div style={styles.fileIcon}>📄</div>
                                <div style={{ fontWeight: 700, fontSize: 18 }}>PDF 변환 프로그램</div>
                                <div style={styles.divider} />
                                <div style={styles.fileName}>{activeItem?.name}</div>
                            </div>

                            <div style={styles.actions}>
                                <button
                                    style={styles.actionBtn}
                                    onClick={() => navigate('/')}
                                    title="홈으로 이동"
                                >
                                    처음으로
                                </button>
                                <button
                                    style={styles.actionBtn}
                                    onClick={() => navigate('/dashboard')}
                                    title="데이터 확인 및 수정 페이지로 이동"
                                >
                                    데이터 확인 및 수정
                                </button>
                                <button style={styles.actionBtn}>공유</button>
                                <button
                                    style={{ ...styles.actionBtn, background: '#2563eb', color: 'white', borderColor: '#2563eb' }}
                                    onClick={handleDownload}
                                >
                                    다운로드
                                </button>
                            </div>
                        </div>

                        <div style={styles.viewerContainer}>
                            {activeItem?.file ? (
                                <PdfViewer
                                    file={activeItem.file}
                                    initialSelection={activeItem.initialSelection}
                                    onSaveSelection={async (rect) => {
                                        if (!activeItem.dbId) {
                                            alert('파일이 서버에 저장되지 않아 좌표를 저장할 수 없습니다.');
                                            return;
                                        }

                                        if (!token) {
                                            alert('로그인이 필요합니다.');
                                            return;
                                        }

                                        // If rect is null, we are deleting
                                        const payload = rect || { x: null, y: null, width: null, height: null };

                                        try {
                                            const res = await fetch(`http://localhost:8080/api/files/${activeItem.dbId}/coordinates`, {
                                                method: 'POST',
                                                headers: {
                                                    'Content-Type': 'application/json',
                                                    'Authorization': `Bearer ${token}`
                                                },
                                                body: JSON.stringify(payload)
                                            });

                                            if (res.ok) {
                                                setSavedRect(rect); // Can be null
                                                alert(rect ? '표제란 영역이 저장되었습니다.' : '표제란 설정이 삭제되었습니다.');
                                            } else {
                                                const txt = await res.text();
                                                alert(`요청 실패: ${res.status} ${txt}`);
                                            }
                                        } catch (e) {
                                            console.error(e);
                                            alert('오류 발생');
                                        }
                                    }}
                                />
                            ) : (
                                <div>파일 없음</div>
                            )}
                        </div>
                    </main>
                )}
            </div>

            <style>{`
                .scan-line {
                    position: absolute;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 2px;
                    background: #2563eb;
                    box-shadow: 0 0 4px #2563eb;
                    animation: scan 1.5s linear infinite;
                }
                @keyframes scan {
                    0% { top: 10%; opacity: 0; }
                    10% { opacity: 1; }
                    90% { opacity: 1; }
                    100% { top: 90%; opacity: 0; }
                }
            `}</style>
        </div>
    );
}

const styles: Record<string, React.CSSProperties> = {
    appShell: {
        display: 'flex',
        height: '100vh',
        width: '100%',
        overflow: 'hidden',
        background: '#f7f9fc'
    },
    mainArea: {
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        position: 'relative'
    },
    processingScreen: {
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#f7f9fc'
    },
    processingContent: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 16
    },
    previewCard: {
        width: 140,
        height: 180,
        background: 'white',
        borderRadius: 8,
        boxShadow: '0 4px 15px rgba(0,0,0,0.08)',
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: 24,
        overflow: 'hidden',
        border: '1px solid #e1e5ea'
    },
    docIcon: {
        fontSize: 40,
        marginBottom: 16
    },
    docLines: {
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        alignItems: 'center'
    },
    line: {
        height: 6,
        background: '#eff2f5',
        borderRadius: 4
    },
    procTitle: {
        fontSize: 16,
        fontWeight: 600,
        color: '#1e293b',
        marginTop: 10
    },
    procSub: {
        fontSize: 14,
        color: '#64748b',
        fontWeight: 500
    },

    // Viewer Styles
    page: {
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden'
    },
    previewHeader: {
        height: 60,
        background: 'white',
        borderBottom: '1px solid #e1e5ea',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 24px',
        flexShrink: 0
    },
    titleInfo: {
        display: 'flex',
        alignItems: 'center',
        gap: 12
    },
    fileIcon: {
        fontSize: 20
    },
    divider: {
        width: 1,
        height: 16,
        background: '#e1e5ea'
    },
    fileName: {
        fontSize: 14,
        color: '#64748b'
    },
    actions: {
        display: 'flex',
        gap: 10
    },
    actionBtn: {
        height: 36,
        padding: '0 16px',
        borderRadius: 6,
        border: '1px solid #e1e5ea',
        background: 'white',
        fontSize: 13,
        fontWeight: 600,
        cursor: 'pointer',
        display: 'grid',
        placeItems: 'center'
    },
    viewerContainer: {
        flex: 1,
        background: '#f0f0f0',
        padding: 24,
        overflow: 'hidden',
        display: 'flex',
        justifyContent: 'center'
    }
};

