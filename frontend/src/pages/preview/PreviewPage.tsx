import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import PdfViewer, { type ToolType } from '../../components/PdfViewer';
import { useFiles } from '../../context/FileContext';
import Sidebar from '../../components/layout/Sidebar';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import type { BBox } from '../../components/SelectionOverlay'; // Import BBox type
import PreviewOnboardingTour from '../../components/PreviewOnboardingTour';

export default function PreviewPage() {
    const navigate = useNavigate();
    const { token } = useAuth();
    const { showToast } = useToast();
    const { activeItem, selectedId, hasItems, updateItemCoordinates, claimFile } = useFiles();
    const [isProcessing, setIsProcessing] = useState(true);
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

    const handleDownload = () => {
        if (!activeItem?.file) return;

        // 1. Download File (이미지/PDF)
        const fileUrl = URL.createObjectURL(activeItem.file);
        const a = document.createElement('a');
        a.href = fileUrl;
        a.download = activeItem.name;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(fileUrl);

        // 2. Download JSON with ALL BBoxes and Rotation
        const hasBBoxData = activeItem.coordinates || initialBBoxes.length > 0;

        if (hasBBoxData) {
            // Parse coordinates to get bbox array
            let bboxes = [];
            try {
                if (activeItem.coordinates) {
                    bboxes = JSON.parse(activeItem.coordinates);
                } else if (initialBBoxes.length > 0) {
                    bboxes = initialBBoxes;
                }
            } catch (e) {
                console.error('Failed to parse bbox data:', e);
            }

            const jsonContent = JSON.stringify({
                fileName: activeItem.name,
                fileId: activeItem.dbId,
                exportedAt: new Date().toISOString(),
                rotation: activeItem.rotation || 0,
                bboxes: bboxes,
                metadata: {
                    fileSize: activeItem.file.size,
                    mimeType: activeItem.file.type
                }
            }, null, 2);

            const blob = new Blob([jsonContent], { type: 'application/json' });
            const jsonUrl = URL.createObjectURL(blob);
            const b = document.createElement('a');
            b.href = jsonUrl;
            b.download = `${activeItem.name.replace(/\.[^/.]+$/, '')}_metadata.json`;
            document.body.appendChild(b);
            b.click();
            document.body.removeChild(b);
            URL.revokeObjectURL(jsonUrl);

            console.log('Downloaded image and metadata JSON');
        } else {
            console.log('Downloaded image only (no bbox data)');
        }
    };

    // Redirect if no files
    const toastShownRef = useRef(false);
    useEffect(() => {
        if (!hasItems) {
            if (!toastShownRef.current) {
                showToast('파일을 업로드 해주세요 !', 'error');
                toastShownRef.current = true;
            }
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
            <PreviewOnboardingTour />
            {/* Left Sidebar with Tool Control */}
            <div id="sidebar-tools">
                <Sidebar
                    activeTool={activeTool}
                    onToolChange={(tool: ToolType) => setActiveTool(activeTool === tool ? 'none' : tool)}
                />
            </div>

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
                                    title="파일 목록으로 이동"
                                >
                                    파일 목록
                                </button>
                                <button
                                    style={styles.actionBtn}
                                    onClick={() => activeItem && navigate('/ai-recognition', { state: { fileId: activeItem.dbId } })}
                                    title="AI 인식으로 이동"
                                    id="preview-ai-btn" // Added ID for Tour
                                >
                                    AI 인식
                                </button>
                                <button
                                    style={styles.actionBtn}
                                    onClick={() => navigate('/dashboard')}
                                    title="도면 보관함로 이동"
                                >
                                    도면 보관함
                                </button>
                                <button style={styles.actionBtn}>공유</button>
                                <button
                                    style={{ ...styles.actionBtn, background: '#2563eb', color: 'white', borderColor: '#2563eb' }}
                                    onClick={handleDownload}
                                    id="preview-download-btn" // Added ID for Tour
                                >
                                    다운로드
                                </button>
                            </div>
                        </div>

                        <div style={styles.viewerContainer} id="preview-viewer">
                            {activeItem?.file ? (
                                <PdfViewer
                                    file={activeItem.file}
                                    initialSelection={activeItem.initialSelection}
                                    initialBBoxes={initialBBoxes}
                                    initialRotation={activeItem.rotation}
                                    activeTool={activeTool} // Pass Active Tool
                                    onToolChange={setActiveTool} // Allow PdfViewer to close tools (ESC)
                                    onSaveSelection={async (bboxes: BBox[], rotation: number) => {
                                        if (!activeItem.dbId) {
                                            showToast('파일이 서버에 저장되지 않아 좌표를 저장할 수 없습니다.', 'error');
                                            return;
                                        }

                                        if (!token) {
                                            showToast('로그인이 필요합니다.', 'error');
                                            return;
                                        }

                                        // New JSON Payload
                                        const jsonCoords = JSON.stringify(bboxes);
                                        const payload = {
                                            coordinates: jsonCoords,
                                            rotation: rotation
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
                                                updateItemCoordinates(activeItem.id, jsonCoords, rotation);

                                                // 2. Assign to User (Auto-save to Dashboard)
                                                try {
                                                    await claimFile(activeItem.dbId);
                                                } catch (err) {
                                                    console.warn("Failed to assign to user:", err);
                                                }

                                                showToast('저장되었습니다. (도면 보관함에서 확인 가능)', 'success');
                                            } else {
                                                const txt = await res.text();
                                                showToast(`요청 실패: ${res.status} ${txt}`, 'error');
                                            }
                                        } catch (e) {
                                            console.error(e);
                                            showToast('오류 발생', 'error');
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
