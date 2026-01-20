import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import PdfViewer, { type ToolType } from '../../components/PdfViewer';
import { useFiles } from '../../context/FileContext';
import Sidebar from '../../components/layout/Sidebar';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import type { BBox } from '../../components/SelectionOverlay'; // Import BBox type

export default function PreviewPage() {
    const navigate = useNavigate();
    const { token } = useAuth();
    const { showToast } = useToast();
    const { activeItem, selectedId, hasItems, updateItemCoordinates } = useFiles();
    const [isProcessing, setIsProcessing] = useState(true);
    const [savedRect, setSavedRect] = useState<{ x: number, y: number, width: number, height: number } | null | undefined>(activeItem?.initialSelection);
    // Parse initial coordinates if available as JSON string (fallback to initialSelection for legacy)
    // Parse initial coordinates if available as JSON string
    const [initialBBoxes, setInitialBBoxes] = useState<BBox[]>([]);
    useEffect(() => {
        if (activeItem?.coordinates) {
            try {
                const parsed = JSON.parse(activeItem.coordinates);
                if (Array.isArray(parsed)) {
                    setInitialBBoxes(parsed);
                }
            } catch (e) {
                // Fallback or ignore
            }
        } else {
            setInitialBBoxes([]);
        }
    }, [activeItem]);

    // State Hoisting: Manage Active Tool here to share between Sidebar and PdfViewer
    const [activeTool, setActiveTool] = useState<ToolType>('none');

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
            showToast('파일을 업로드 해주세요 !', 'error');
            navigate('/upload');
        }
    }, [hasItems, navigate, showToast]);

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
            {/* Left Sidebar with Tool Control */}
            <Sidebar
                activeTool={activeTool}
                onToolChange={(tool: ToolType) => setActiveTool(activeTool === tool ? 'none' : tool)}
            />

            <div style={styles.mainArea}>
                {/* Header */}
                <div style={styles.headerWrapper}>
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
                                <div style={{ fontWeight: 700, fontSize: 18 }}>데이터 추출 프로그램</div>
                                <div style={styles.divider} />
                                <div style={styles.fileName}>{activeItem?.name}</div>
                            </div>

                            <div style={styles.actions}>
                                <button
                                    style={styles.actionBtn}
                                    onClick={() => navigate('/upload')}
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
                                    initialBBoxes={initialBBoxes}
                                    activeTool={activeTool} // Pass Active Tool
                                    onToolChange={setActiveTool} // Allow PdfViewer to close tools (ESC)
                                    onSaveSelection={async (bboxes: BBox[]) => {
                                        if (!activeItem.dbId) {
                                            alert('파일이 서버에 저장되지 않아 좌표를 저장할 수 없습니다.');
                                            return;
                                        }

                                        if (!token) {
                                            alert('로그인이 필요합니다.');
                                            return;
                                        }

                                        // New JSON Payload
                                        const jsonCoords = JSON.stringify(bboxes);
                                        const payload = {
                                            coordinates: jsonCoords
                                        };

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
                                                updateItemCoordinates && updateItemCoordinates(activeItem.id, jsonCoords);

                                                // Also update legacy title block for consistency if single box
                                                // (Optional: not strictly needed if we rely on coordinates)
                                                // const titleBox = bboxes.find(b => b.type === 'title');
                                                // updateItemSelection(activeItem.id, titleBox?.rect);

                                                alert('모든 영역이 저장되었습니다.');
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
        flexDirection: 'column', // Changed from default (row) implies check
        alignItems: 'stretch', // Ensure children take full width
        justifyContent: 'flex-start' // Don't center vertically/horizontally in a way that shifts
    }
};
