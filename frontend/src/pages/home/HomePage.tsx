import React from 'react';
import { Link } from 'react-router-dom';

export default function HomePage() {
    return (
        <div style={styles.container}>
            <header style={styles.hero}>
                <h1 style={styles.title}>AI 도면 분석 플랫폼</h1>
                <p style={styles.subtitle}>
                    건축, 건설 도면(PDF, 이미지)을 업로드하여<br />
                    텍스트, 심볼, 테이블 정보를 AI로 자동 추출하고 데이터로 변환하세요.
                </p>
                <div style={styles.actions}>
                    <Link to="/upload" style={styles.primaryButton}>
                        도면 업로드 시작하기
                    </Link>
                    <Link to="/dashboard" style={styles.secondaryButton}>
                        내 도면함 (대시보드)
                    </Link>
                </div>
            </header>

            <section style={styles.features}>
                <div style={styles.featureCard}>
                    <div style={styles.icon}>🚀</div>
                    <h3>빠른 처리</h3>
                    <p>AI가 도면을 신속하게 분석하여 데이터를 추출합니다.</p>
                </div>
                <div style={styles.featureCard}>
                    <div style={styles.icon}>📊</div>
                    <h3>정확한 데이터</h3>
                    <p>텍스트, 심볼, 테이블을 정밀하게 인식합니다.</p>
                </div>
                <div style={styles.featureCard}>
                    <div style={styles.icon}>💾</div>
                    <h3>편리한 관리</h3>
                    <p>대시보드에서 분석된 데이터를 손쉽게 관리하세요.</p>
                </div>
            </section>
        </div>
    );
}

const styles: Record<string, React.CSSProperties> = {
    container: {
        minHeight: 'calc(100vh - 60px)', // Header height assumed ~60px
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        background: '#f7f9fc',
        fontFamily: '"Inter", sans-serif',
    },
    hero: {
        textAlign: 'center',
        padding: '80px 20px',
        maxWidth: '800px',
    },
    title: {
        fontSize: '48px',
        fontWeight: '800',
        color: '#1e293b',
        marginBottom: '24px',
        letterSpacing: '-1px',
    },
    subtitle: {
        fontSize: '20px',
        color: '#64748b',
        lineHeight: '1.6',
        marginBottom: '40px',
    },
    actions: {
        display: 'flex',
        gap: '16px',
        justifyContent: 'center',
    },
    primaryButton: {
        padding: '14px 32px',
        fontSize: '18px',
        fontWeight: '600',
        color: 'white',
        backgroundColor: '#dc2e2e',
        borderRadius: '8px',
        textDecoration: 'none',
        boxShadow: '0 4px 6px -1px rgba(220, 46, 46, 0.2)',
        transition: 'transform 0.2s',
    },
    secondaryButton: {
        padding: '14px 32px',
        fontSize: '18px',
        fontWeight: '600',
        color: '#1e293b',
        backgroundColor: 'white',
        borderRadius: '8px',
        textDecoration: 'none',
        border: '1px solid #e2e8f0',
        transition: 'background-color 0.2s',
    },
    features: {
        display: 'flex',
        gap: '30px',
        padding: '40px 20px',
        maxWidth: '1200px',
        width: '100%',
        justifyContent: 'center',
        flexWrap: 'wrap',
    },
    featureCard: {
        flex: '1 1 300px',
        background: 'white',
        padding: '32px',
        borderRadius: '16px',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)',
        textAlign: 'center',
        maxWidth: '350px',
    },
    icon: {
        fontSize: '40px',
        marginBottom: '16px',
    },
};
