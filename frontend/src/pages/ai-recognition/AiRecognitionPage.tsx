import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Scan, FileText, FolderOpen, Image as ImageIcon, Upload, Eye, AlertCircle, Save, X } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import PdfViewer, { type ToolType } from '../../components/PdfViewer';
import type { BBox } from '../../components/SelectionOverlay';
import './AiRecognitionPage.css';

// 파일 타입 정의
interface FileItem {
    id: number;
    name: string;
    filePath: string;
    uploadTime: string;
    isTrashed: boolean;
    size?: number;
    thumbnailUrl?: string;
    bboxes?: BBox[]; // Optional bboxes from list
}

interface TitleBlockResult {
    id: number;
    extractedText: string;
    projectName: string;
    drawingName: string;
    drawingNumber: string;
    scale: string;
    processedAt?: string;
}

// 탭 타입 정의
type SourceTab = 'preview' | 'storage';

export default function AiRecognitionPage() {
    const location = useLocation();
    const { user, token, openLoginModal, isLoading: isAuthLoading } = useAuth();

    // 상태 관리
    const [activeTab, setActiveTab] = useState<SourceTab>('storage');
    const [files, setFiles] = useState<FileItem[]>([]);

    // 선택된 파일 관련 상태
    const [selectedFile, setSelectedFile] = useState<FileItem | null>(null);
    const [selectedFileBlob, setSelectedFileBlob] = useState<File | null>(null);
    const [initialBBoxes, setInitialBBoxes] = useState<BBox[]>([]);
    const [currentBBoxes, setCurrentBBoxes] = useState<BBox[]>([]);

    const [isLoading, setIsLoading] = useState(false);
    const [isFileLoading, setIsFileLoading] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [ocrResult, setOcrResult] = useState<TitleBlockResult | null>(null);
    const [showResultForm, setShowResultForm] = useState(false);
    const [hasExistingOcr, setHasExistingOcr] = useState(false);

    // PDF 뷰어 상태
    const [activeTool, setActiveTool] = useState<ToolType>('none');
    const [currentRotation, setCurrentRotation] = useState<number>(0); // OCR rotation

    // Ref for auto-scroll to results
    const resultsRef = React.useRef<HTMLDivElement>(null);

    // 로그인 확인
    useEffect(() => {
        if (!isAuthLoading && !user) {
            openLoginModal();
        }
    }, [user, isAuthLoading, openLoginModal]);

    // 파일 목록 로드
    useEffect(() => {
        if (user && token) {
            fetchFiles();
        }
    }, [user, token, activeTab]);

    // Handle auto-selection from navigation state
    useEffect(() => {
        const state = location.state as { fileId?: number } | null;
        if (state?.fileId && files.length > 0 && !selectedFile) {
            const targetFile = files.find(f => f.id === state.fileId);
            if (targetFile) {
                handleFileSelect(targetFile);
            }
        }
    }, [files, location.state]);

    // Auto-scroll to results when OCR completes
    useEffect(() => {
        if (showResultForm && resultsRef.current) {
            resultsRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    }, [showResultForm]);

    const fetchFiles = async () => {
        if (!token) return;

        setIsLoading(true);
        setError(null);

        try {
            const response = await fetch('/api/user/files', {
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
            });

            if (!response.ok) {
                throw new Error('파일 목록을 불러오는데 실패했습니다.');
            }

            const data = await response.json();
            setFiles(data.filter((f: FileItem) => !f.isTrashed));
        } catch (err) {
            setError(err instanceof Error ? err.message : '오류가 발생했습니다.');
        } finally {
            setIsLoading(false);
        }
    };

    const fetchExistingOcrResult = async (fileId: number) => {
        if (!token) return;

        try {
            const response = await fetch(`/api/ocr/results/${fileId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (response.ok) {
                const results: TitleBlockResult[] = await response.json();
                if (results && results.length > 0) {
                    // Use the most recent result
                    const latest = results[results.length - 1];
                    setOcrResult(latest);
                    setHasExistingOcr(true);
                    setShowResultForm(true);
                    return;
                }
            }
        } catch (err) {
            console.error('Failed to fetch OCR results:', err);
        }

        // No results found or error occurred
        setHasExistingOcr(false);
        setOcrResult(null);
        setShowResultForm(false);
    };

    const handleFileSelect = async (file: FileItem) => {
        if (!token) return;

        setSelectedFile(file);
        setSelectedFileBlob(null);
        setInitialBBoxes([]);
        setCurrentBBoxes([]);
        setOcrResult(null);
        setShowResultForm(false);
        setHasExistingOcr(false);
        setIsFileLoading(true);

        try {
            // 1. 파일 내용(Blob) 다운로드
            const downloadRes = await fetch(`/api/files/${file.id}/download`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!downloadRes.ok) throw new Error('파일을 다운로드할 수 없습니다.');

            const blob = await downloadRes.blob();
            // 확장자 기반 MIME 타입 추론 보완
            const ext = file.name.split('.').pop()?.toLowerCase();
            let mimeType = downloadRes.headers.get('Content-Type') || 'application/octet-stream';
            if (ext === 'pdf' && mimeType === 'application/octet-stream') mimeType = 'application/pdf';
            if (['png', 'jpg', 'jpeg'].includes(ext || '') && mimeType === 'application/octet-stream') mimeType = `image/${ext === 'jpg' ? 'jpeg' : ext}`;

            const fileObj = new File([blob], file.name, { type: mimeType });

            // 2. 파일 상세 정보(BBox 포함) 조회
            const detailRes = await fetch(`/api/files/${file.id}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            let bboxes: BBox[] = [];
            let fileRotation = 0;  // Default rotation
            if (detailRes.ok) {
                const detailData = await detailRes.json();

                // Get file-level rotation
                if (detailData.rotation !== undefined && detailData.rotation !== null) {
                    fileRotation = detailData.rotation;
                }

                if (detailData.bboxes && Array.isArray(detailData.bboxes)) {
                    // Backend BBox: { id, x, y, width, height, type, page, frontendId }
                    // Frontend BBox: { id, rect: { x, y, width, height }, type, page }
                    bboxes = detailData.bboxes.map((b: any) => ({
                        id: b.frontendId || String(b.id),
                        rect: {
                            x: b.x,
                            y: b.y,
                            width: b.width,
                            height: b.height
                        },
                        type: b.type,
                        page: b.page
                    }));
                }
            }

            // Set rotation first so PdfViewer gets correct initial value
            setCurrentRotation(fileRotation);
            setSelectedFileBlob(fileObj);
            setInitialBBoxes(bboxes);
            setCurrentBBoxes(bboxes);

            // 3. 기존 OCR 결과 조회
            await fetchExistingOcrResult(file.id);

        } catch (err) {
            console.error(err);
            setError('파일을 불러오는 중 오류가 발생했습니다.');
        } finally {
            setIsFileLoading(false);
        }
    };

    const handleOcrStart = async () => {
        if (!selectedFile || !token) return;

        // 표제부 영역 찾기 (title 타입 우선, 없으면 첫 번째 박스)
        const titleBox = currentBBoxes.find(b => b.type === 'title') || currentBBoxes[0];

        if (!titleBox) {
            alert('상단 도구에서 "표제란"을 선택하고 영역을 지정해주세요.');
            setActiveTool('title');
            return;
        }

        setIsProcessing(true);
        setError(null);
        setOcrResult(null);

        try {
            // Fix: Map frontend bbox to backend expected format
            // Backend OcrController.processOcr expects @RequestBody BBox
            // Backend BBox has fields x, y, width, height, page.
            const payload = {
                x: titleBox.rect.x,
                y: titleBox.rect.y,
                width: titleBox.rect.width,
                height: titleBox.rect.height,
                page: titleBox.page || 1,
                type: titleBox.type,
                rotation: currentRotation  // Include rotation for vertical text OCR
            };

            const response = await fetch(`/api/ocr/process/${selectedFile.id}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                const errMsg = await response.text();
                throw new Error(`OCR 처리 실패: ${errMsg}`);
            }

            const result: TitleBlockResult = await response.json();
            setOcrResult(result);
            setShowResultForm(true);

        } catch (err) {
            console.error(err);
            setError(err instanceof Error ? err.message : 'OCR 처리 중 오류가 발생했습니다.');
        } finally {
            setIsProcessing(false);
        }
    };

    // 결과 폼 핸들러
    const handleResultChange = (field: keyof TitleBlockResult, value: string) => {
        if (ocrResult) {
            setOcrResult({ ...ocrResult, [field]: value });
        }
    };

    // 결과 저장 (지금은 로컬 상태만 업데이트하지만, 실제로는 PUT API 필요)
    const handleSaveResult = () => {
        // TODO: Implement Update API
        alert('저장되었습니다 (DB에는 이미 초기 결과가 저장됨)');
        setShowResultForm(false);
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('ko-KR', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
        });
    };

    const getFileIcon = (fileName: string) => {
        const ext = fileName.toLowerCase().split('.').pop();
        if (ext === 'pdf') {
            return <FileText size={20} />;
        }
        return <ImageIcon size={20} />;
    };

    const isImageFile = (fileName: string) => {
        const ext = fileName.toLowerCase().split('.').pop();
        return ['png', 'jpg', 'jpeg', 'gif', 'webp'].includes(ext || '');
    };

    // 로그인하지 않은 경우
    if (!user) {
        return (
            <div className="ai-recognition-container">
                <div className="empty-state">
                    <AlertCircle />
                    <p>로그인이 필요합니다.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="ai-recognition-container">
            <div className="ai-recognition-main">
                {/* Header */}
                <header className="ai-recognition-header">
                    <h1>
                        <Scan size={24} />
                        AI 인식
                    </h1>
                    {/* Toolbar for selecting box type */}
                    <div style={{ display: 'flex', gap: 8 }}>
                        <button
                            className={`source-tab ${activeTool === 'title' ? 'active' : ''}`}
                            onClick={() => setActiveTool(activeTool === 'title' ? 'none' : 'title')}
                            disabled={!selectedFileBlob}
                            title="표제란 영역 지정"
                        >
                            <Scan size={16} /> 표제란 지정
                        </button>
                    </div>
                </header>

                {/* Content */}
                <div className="ai-recognition-content">
                    {/* 파일 선택 섹션 */}
                    <section className="file-selection-section">
                        <div className="section-header">
                            <h2>
                                <FolderOpen size={18} />
                                도면 선택
                            </h2>
                        </div>

                        {/* 소스 탭 */}
                        <div className="file-source-tabs">
                            <button
                                className={`source-tab ${activeTab === 'preview' ? 'active' : ''}`}
                                onClick={() => setActiveTab('preview')}
                            >
                                <Eye size={16} />
                                미리보기
                            </button>
                            <button
                                className={`source-tab ${activeTab === 'storage' ? 'active' : ''}`}
                                onClick={() => setActiveTab('storage')}
                            >
                                <FolderOpen size={16} />
                                도면 보관함
                            </button>
                        </div>

                        {/* 파일 목록 */}
                        <div className="file-list-container">
                            {isLoading ? (
                                <div className="empty-state">
                                    <div className="loading-spinner"></div>
                                    <p>파일을 불러오는 중...</p>
                                </div>
                            ) : error ? (
                                <div className="empty-state">
                                    <AlertCircle />
                                    <p>{error}</p>
                                </div>
                            ) : files.length === 0 ? (
                                <div className="empty-state">
                                    <Upload />
                                    <p>저장된 도면이 없습니다.</p>
                                </div>
                            ) : (
                                files.map((file) => (
                                    <div
                                        key={file.id}
                                        className={`file-list-item ${selectedFile?.id === file.id ? 'selected' : ''}`}
                                        onClick={() => handleFileSelect(file)}
                                    >
                                        <div className={`file-icon ${isImageFile(file.name) ? 'image' : ''}`}>
                                            {getFileIcon(file.name)}
                                        </div>
                                        <div className="file-info">
                                            <div className="file-name">{file.name}</div>
                                            <div className="file-meta">
                                                {formatDate(file.uploadTime)}
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </section>

                    {/* 중앙 섹션 (미리보기) */}
                    <section className="preview-section">
                        <div className="section-header">
                            <h2>
                                <Eye size={18} />
                                표제부 미리보기
                            </h2>
                            {selectedFile && (
                                <div style={{ fontSize: '13px', color: '#6B7280', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    {selectedFile.name}
                                    {hasExistingOcr && ocrResult && (
                                        <span style={{
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            gap: '4px',
                                            padding: '2px 8px',
                                            borderRadius: '4px',
                                            backgroundColor: '#10B981',
                                            color: 'white',
                                            fontSize: '11px',
                                            fontWeight: '500'
                                        }}>
                                            ✓ OCR 처리 완료
                                            {ocrResult.processedAt && (
                                                <span style={{ opacity: 0.9 }}>
                                                    ({new Date(ocrResult.processedAt).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })})
                                                </span>
                                            )}
                                        </span>
                                    )}
                                </div>
                            )}
                        </div>

                        <div className="preview-container" style={{ flex: 1, position: 'relative', minHeight: 0, display: 'flex', flexDirection: 'column' }}>
                            {isFileLoading ? (
                                <div className="preview-placeholder">
                                    <div className="loading-spinner"></div>
                                    <p>파일 로딩 중...</p>
                                </div>
                            ) : selectedFileBlob ? (
                                <div style={{ flex: 1, border: '1px solid #E5E7EB', borderRadius: '8px', overflow: 'hidden' }}>
                                    <PdfViewer
                                        file={selectedFileBlob}
                                        activeTool={activeTool}
                                        onToolChange={setActiveTool}
                                        initialBBoxes={initialBBoxes}
                                        initialRotation={currentRotation}
                                        onBBoxChange={setCurrentBBoxes}
                                        onRotationChange={setCurrentRotation}
                                    />
                                </div>
                            ) : (
                                <div className="preview-placeholder">
                                    <div className="preview-placeholder-content">
                                        <FileText />
                                        <p>왼쪽에서 도면을 선택해주세요</p>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* OCR 컨트롤 */}
                        <div className="ocr-controls">
                            {/* Rotation selector synced with PDF viewer rotation button */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginRight: '12px' }}>
                                <label style={{ fontSize: '13px', color: '#6B7280', whiteSpace: 'nowrap' }} title="PDF 뷰어의 회전 버튼(↻)과 연동됩니다">
                                    OCR 회전:
                                </label>
                                <select
                                    value={currentRotation}
                                    onChange={(e) => setCurrentRotation(Number(e.target.value))}
                                    style={{
                                        padding: '6px 10px',
                                        borderRadius: '6px',
                                        border: '1px solid #D1D5DB',
                                        fontSize: '13px',
                                        backgroundColor: 'white',
                                        cursor: 'pointer'
                                    }}
                                >
                                    <option value={0}>0° (가로)</option>
                                    <option value={90}>90° (세로↑)</option>
                                    <option value={180}>180°</option>
                                    <option value={270}>270° (세로↓)</option>
                                </select>
                            </div>
                            <button
                                className="btn-primary"
                                disabled={!selectedFileBlob || isFileLoading || isProcessing}
                                onClick={handleOcrStart}
                            >
                                {isProcessing ? (
                                    <>
                                        <div className="loading-spinner" style={{ width: 16, height: 16 }}></div>
                                        인식 중...
                                    </>
                                ) : (
                                    <>
                                        <Scan size={18} />
                                        {hasExistingOcr ? '다시 인식하기' : 'OCR 인식 시작'}
                                    </>
                                )}
                            </button>
                        </div>
                    </section>

                    {/* 결과 섹션 (조건부 렌더링) */}
                    {showResultForm && ocrResult && (
                        <div className="ocr-results-section" ref={resultsRef}>
                            <div className="section-header">
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <h2><FileText size={18} /> 인식 결과</h2>
                                    {ocrResult.processedAt && (
                                        <span style={{ fontSize: '12px', color: '#6B7280', fontWeight: 'normal' }}>
                                            처리 시간: {new Date(ocrResult.processedAt).toLocaleString('ko-KR')}
                                        </span>
                                    )}
                                </div>
                                <button onClick={() => setShowResultForm(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                                    <X size={18} />
                                </button>
                            </div>

                            <div className="results-form">
                                <div className="form-group">
                                    <label>공사명</label>
                                    <input
                                        value={ocrResult.projectName || ''}
                                        onChange={(e) => handleResultChange('projectName', e.target.value)}
                                    />
                                </div>
                                <div className="form-group">
                                    <label>도면명</label>
                                    <input
                                        value={ocrResult.drawingName || ''}
                                        onChange={(e) => handleResultChange('drawingName', e.target.value)}
                                    />
                                </div>
                                <div className="form-group">
                                    <label>도면번호</label>
                                    <input
                                        value={ocrResult.drawingNumber || ''}
                                        onChange={(e) => handleResultChange('drawingNumber', e.target.value)}
                                    />
                                </div>
                                <div className="form-group">
                                    <label>축척</label>
                                    <input
                                        value={ocrResult.scale || ''}
                                        onChange={(e) => handleResultChange('scale', e.target.value)}
                                    />
                                </div>
                                <div className="form-group full-width">
                                    <label>원본 추출 텍스트</label>
                                    <textarea
                                        value={ocrResult.extractedText || ''}
                                        onChange={(e) => handleResultChange('extractedText', e.target.value)}
                                    />
                                </div>
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}>
                                <button className="btn-primary" onClick={handleSaveResult}>
                                    <Save size={16} /> 저장 및 닫기
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
