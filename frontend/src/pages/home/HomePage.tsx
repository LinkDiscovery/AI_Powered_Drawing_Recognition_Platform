import React from 'react';
import { Link } from 'react-router-dom';

export default function HomePage() {
    return (
        <div style={styles.container}>
            {/* Background Video */}
            <video
                src="/assets/intro-video.mp4"
                style={styles.videoBackground}
                autoPlay
                muted
                loop
                playsInline
            />
            {/* Dark Overlay */}
            <div style={styles.overlay} />

            {/* Content */}
            <div style={styles.content}>
                <header style={styles.hero}>
                    <h1 style={styles.title}>AI-Powered Automation<br />for Every Decision</h1>
                    <p style={styles.subtitle}>
                        건축/건설 도면의 텍스트, 심볼, 테이블 정보를<br />
                        AI로 즉시 추출하고 데이터 자산으로 변환하십시오.
                    </p>
                    <div style={styles.actions}>
                        <Link to="/upload" style={styles.primaryButton}>
                            Get Started
                        </Link>
                        <Link to="/dashboard" style={styles.secondaryButton}>
                            Dashboard
                        </Link>
                    </div>
                </header>

                {/* Features Section - Moved below or can be hidden. 
                   For now, let's keep it but maybe style it differently or just hide it? 
                   The user asked for "Palantir style" which is often just the hero.
                   I will comment it out effectively by not rendering it, 
                   or I can render it below the fold. 
                   Let's render it but styled to overlap or be discreet.
                   Actually, let's keep the focus on the hero video as requested.
                */}
            </div>
        </div>
    );
}

const styles: Record<string, React.CSSProperties> = {
    container: {
        position: 'relative',
        width: '100%',
        height: 'calc(100vh - 60px)', // Adjust based on header height
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        fontFamily: '"Inter", sans-serif',
        backgroundColor: '#111', // Fallback color
    },
    videoBackground: {
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        objectFit: 'cover',
        zIndex: 0,
    },
    overlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        backgroundColor: 'rgba(0, 0, 0, 0.65)', // Dark overlay for contrast
        zIndex: 1,
    },
    content: {
        position: 'relative',
        zIndex: 2,
        width: '100%',
        maxWidth: '1200px',
        padding: '0 20px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
    },
    hero: {
        textAlign: 'center',
        maxWidth: '900px',
    },
    title: {
        fontSize: '3.5rem', // Large, impactful size
        fontWeight: '700',
        color: '#ffffff',
        marginBottom: '24px',
        letterSpacing: '-0.02em',
        lineHeight: '1.1',
    },
    subtitle: {
        fontSize: '1.25rem',
        color: '#d1d5db', // Light gray text
        lineHeight: '1.6',
        marginBottom: '48px',
        fontWeight: '400',
    },
    actions: {
        display: 'flex',
        gap: '24px',
        justifyContent: 'center',
    },
    primaryButton: {
        padding: '16px 40px',
        fontSize: '16px',
        fontWeight: '600',
        color: '#000',
        backgroundColor: '#ffffff', // White button
        borderRadius: '4px', // Squares styling like Palantir
        textDecoration: 'none',
        transition: 'all 0.2s ease',
        border: '1px solid #ffffff',
        cursor: 'pointer',
    },
    secondaryButton: {
        padding: '16px 40px',
        fontSize: '16px',
        fontWeight: '600',
        color: '#ffffff',
        backgroundColor: 'transparent',
        borderRadius: '4px',
        textDecoration: 'none',
        border: '1px solid #ffffff', // White border
        transition: 'all 0.2s ease',
        cursor: 'pointer',
    },
};
