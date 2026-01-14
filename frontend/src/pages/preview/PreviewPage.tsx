import React from 'react';
import { useNavigate } from 'react-router-dom';
import PdfViewer from '../../components/PdfViewer';
import { useFiles } from '../../context/FileContext';

export default function PreviewPage() {
    const navigate = useNavigate();
    const { items, activeItem, selectedId, setSelectedId, hasItems } = useFiles();

    // Redirect if no files
    React.useEffect(() => {
        if (!hasItems) {
            navigate('/upload');
        }
    }, [hasItems, navigate]);

    if (!hasItems) return null;

    return (
        <main style={styles.page}>
            <div style={styles.container}>
                <section style={styles.preview}>
                    <div style={styles.previewHeader}>
                        <div>
                            <div style={styles.listTitle}>미리보기</div>
                            <div style={styles.muted}>{activeItem ? activeItem.name : '선택된 파일 없음'}</div>
                        </div>

                        <button type="button" style={styles.ghostBtn} onClick={() => navigate('/upload')}>
                            업로드로 돌아가기
                        </button>
                    </div>

                    <div style={styles.previewBody}>
                        <div style={{ ...styles.previewBox, display: 'block', padding: 10 }}>
                            {activeItem?.file ? (
                                <PdfViewer file={activeItem.file} />
                            ) : (
                                <div style={{ display: 'grid', placeItems: 'center', height: '100%' }}>
                                    [PDF/이미지 미리보기 영역] - 파일이 없습니다
                                </div>
                            )}
                        </div>

                        {/* 우측 사이드바: 파일 목록 선택 */}
                        <div style={styles.previewSidebar}>
                            <div style={{ fontWeight: 700, marginBottom: 10 }}>파일 목록</div>
                            <ul style={styles.sideList}>
                                {items.map(it => (
                                    <li
                                        key={it.id}
                                        style={{
                                            ...styles.sideItem,
                                            background: selectedId === it.id ? '#f3f4f6' : 'transparent',
                                            borderColor: selectedId === it.id ? '#1a73e8' : 'transparent',
                                        }}
                                        onClick={() => setSelectedId(it.id)}
                                    >
                                        <div style={{ fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                            {it.name}
                                        </div>
                                        <div style={{ fontSize: 11, color: '#666' }}>{it.status}</div>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>
                </section>
            </div>
        </main>
    );
}

const styles: Record<string, React.CSSProperties> = {
    page: {
        background: '#f6f7f9',
        minHeight: 'calc(100vh - 60px)',
        padding: '24px 12px',
    },
    container: {
        maxWidth: 1400,
        margin: '0 auto',
    },
    listTitle: {
        fontWeight: 900,
        fontSize: 16,
    },
    muted: {
        color: '#64748b',
    },
    ghostBtn: {
        border: '1px solid #cbd5e1',
        borderRadius: 12,
        padding: '8px 12px',
        background: '#fff',
        fontWeight: 800,
        cursor: 'pointer',
    },
    preview: {
        background: '#fff',
        borderRadius: 16,
        padding: 14,
        border: '1px solid #e5e7eb',
    },
    previewHeader: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: 12,
        marginBottom: 12,
    },
    previewBody: {
        display: 'grid',
        gridTemplateColumns: '1fr 240px',
        gap: 12,
    },
    previewBox: {
        border: '1px solid #eef2f7',
        borderRadius: 16,
        minHeight: 360,
        display: 'grid',
        placeItems: 'center',
        color: '#64748b',
    },
    previewSidebar: {
        border: '1px solid #eef2f7',
        borderRadius: 16,
        padding: 12,
        background: '#fafafa',
    },
    sideList: {
        listStyle: 'none',
        padding: 0,
        margin: 0,
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
    },
    sideItem: {
        padding: '8px 10px',
        borderRadius: 8,
        cursor: 'pointer',
        border: '1px solid transparent',
    }
};
