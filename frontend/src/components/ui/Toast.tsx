import React, { useEffect, useState } from 'react';

export type ToastType = 'success' | 'error' | 'info';

export interface ToastMessage {
    id: string;
    message: string;
    type: ToastType;
}

interface ToastProps {
    toast: ToastMessage;
    onClose: (id: string) => void;
}

export const Toast: React.FC<ToastProps> = ({ toast, onClose }) => {
    const [isExiting, setIsExiting] = useState(false);

    useEffect(() => {
        const timer = setTimeout(() => {
            handleClose();
        }, 3000); // Auto close after 3s

        return () => clearTimeout(timer);
    }, []);

    const handleClose = () => {
        setIsExiting(true);
        setTimeout(() => {
            onClose(toast.id);
        }, 300); // Wait for animation
    };

    const getBackgroundColor = (type: ToastType) => {
        switch (type) {
            case 'success': return '#4caf50';
            case 'error': return '#f44336';
            case 'info': return '#2196f3';
            default: return '#333';
        }
    };

    const getIcon = (type: ToastType) => {
        switch (type) {
            case 'success': return '✅';
            case 'error': return '⚠️';
            case 'info': return 'ℹ️';
            default: return '';
        }
    };

    return (
        <div style={{
            display: 'flex',
            alignItems: 'center',
            background: 'white',
            color: '#333',
            padding: '12px 20px',
            borderRadius: '8px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            marginBottom: '10px',
            minWidth: '300px',
            maxWidth: '400px',
            borderLeft: `6px solid ${getBackgroundColor(toast.type)}`,
            opacity: isExiting ? 0 : 1,
            transform: isExiting ? 'translateX(20px)' : 'translateX(0)',
            transition: 'all 0.3s cubic-bezier(0.68, -0.55, 0.27, 1.55)',
            pointerEvents: 'auto',
            animation: 'slideIn 0.3s cubic-bezier(0.18, 0.89, 0.32, 1.28)'
        }}>
            <span style={{ marginRight: '10px', fontSize: '18px' }}>
                {getIcon(toast.type)}
            </span>
            <span style={{ flex: 1, fontSize: '14px', fontWeight: 500 }}>
                {toast.message}
            </span>
            <button
                onClick={handleClose}
                style={{
                    background: 'none',
                    border: 'none',
                    color: '#999',
                    fontSize: '18px',
                    cursor: 'pointer',
                    padding: '0',
                    marginLeft: '10px',
                    lineHeight: 1
                }}
            >
                &times;
            </button>
            <style>{`
                @keyframes slideIn {
                    from { transform: translateX(100%); opacity: 0; }
                    to { transform: translateX(0); opacity: 1; }
                }
            `}</style>
        </div>
    );
};
