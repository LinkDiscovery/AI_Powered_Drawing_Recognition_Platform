import React from 'react';

const Sidebar = () => {
    return (
        <aside style={styles.sidebar}>
            <div style={styles.logoItem}>
                <div style={styles.logoBox}>
                    {/* Small Logo or Icon */}
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="white"><path d="M4 4h16v16H4z" /></svg>
                </div>
            </div>

            <nav style={styles.nav}>
                <NavItem icon="🗜️" label="압축" />
                <NavItem icon="🔄" label="변환" active />
                <NavItem icon="🧱" label="병합" />
                <NavItem icon="✂️" label="편집" />
                <NavItem icon="✍️" label="서명" />
                <NavItem icon="🤖" label="AI PDF" />
            </nav>

            <div style={styles.bottom}>
                <NavItem icon="📂" label="문서" />
                <NavItem icon="👤" label="계정" />
            </div>
        </aside>
    );
};

const NavItem = ({ icon, label, active = false }: { icon: string; label: string; active?: boolean }) => (
    <div style={{ ...styles.item, ...(active ? styles.activeItem : {}) }}>
        <div style={styles.icon}>{icon}</div>
        <div style={styles.label}>{label}</div>
    </div>
);

const styles: Record<string, React.CSSProperties> = {
    sidebar: {
        width: 64,
        background: '#071a3a', // Dark Navy
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '12px 0',
        color: 'white',
        flexShrink: 0,
        zIndex: 50
    },
    logoItem: {
        marginBottom: 20,
        cursor: 'pointer'
    },
    logoBox: {
        width: 36,
        height: 36,
        background: 'linear-gradient(135deg, #ff512f, #dd2476)',
        borderRadius: 8,
        display: 'grid',
        placeItems: 'center'
    },
    nav: {
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        width: '100%',
        alignItems: 'center'
    },
    bottom: {
        marginTop: 'auto',
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        width: '100%',
        alignItems: 'center'
    },
    item: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        width: 56,
        height: 56,
        borderRadius: 8,
        cursor: 'pointer',
        color: 'rgba(255,255,255,0.7)',
        transition: 'all 0.2s',
    },
    activeItem: {
        background: 'rgba(255, 255, 255, 0.1)',
        color: 'white'
    },
    icon: {
        fontSize: 20,
        marginBottom: 2
    },
    label: {
        fontSize: 9,
        fontWeight: 500
    }
};

export default Sidebar;
