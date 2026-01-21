import React from 'react';
import { Home, Trash2, Clock, FolderPlus } from 'lucide-react';

export type ToolType = 'drive' | 'trash' | 'recent';

type DashboardSidebarProps = {
    activeItem: ToolType;
    onNavigate: (item: ToolType) => void;
    onCreateFolder: () => void;
};

const NAV_ITEMS: { id: ToolType; label: string; icon: React.ReactNode }[] = [
    { id: 'drive', label: '내 드라이브', icon: <Home size={20} /> },
    { id: 'recent', label: '최근 문서함', icon: <Clock size={20} /> },
    { id: 'trash', label: '휴지통', icon: <Trash2 size={20} /> },
];

const DashboardSidebar: React.FC<DashboardSidebarProps> = ({ activeItem, onNavigate, onCreateFolder }) => {
    return (
        <div className="dashboard-sidebar">
            <div className="sidebar-content">
                <button
                    onClick={onCreateFolder}
                    className="new-folder-btn"
                >
                    <FolderPlus size={20} color="#2563eb" />
                    <span>새 폴더</span>
                </button>

                <nav className="space-y-1">
                    {NAV_ITEMS.map((item) => (
                        <button
                            key={item.id}
                            onClick={() => onNavigate(item.id)}
                            className={`nav-item ${activeItem === item.id ? 'active' : ''}`}
                        >
                            {item.icon}
                            {item.label}
                        </button>
                    ))}
                </nav>
            </div>

            <div className="sidebar-footer">
                <div className="storage-status">
                    <div className="status-dot"></div>
                    <span>스토리지 상태: 양호</span>
                </div>
            </div>
        </div>
    );
};

export default DashboardSidebar;
