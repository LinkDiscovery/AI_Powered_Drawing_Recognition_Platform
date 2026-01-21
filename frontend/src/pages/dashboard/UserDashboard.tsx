import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
// Removed DashboardSidebar import as it is now inlined for custom styling
import ProjectCard from '../../components/ProjectCard';
import {
    Search, Bell, Grid, List as ListIcon, MoreVertical,
    Folder as FolderIcon, FileText, Image as ImageIcon,
    Trash2, Upload, Plus, HardDrive, Clock, FolderPlus
} from 'lucide-react';
import { useFileContext } from '../../context/FileContext';
import './UserDashboard.css';

// Define types locally
type Folder = {
    id: number;
    name: string;
    userId: number;
    parentFolderId: number | null;
    createdAt: string;
    trashed: boolean;
};

type FileItem = {
    id: number;
    name: string;
    filePath: string;
    uploadTime: string;
    folderId: number | null;
    isTrashed: boolean;
    size?: number; // Optional size property
    thumbnailUrl?: string; // Optional thumbnail
};

// Breadcrumb Item
type Breadcrumb = {
    id: number | null;
    name: string;
};

const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
};

const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return `${date.getFullYear()}. ${date.getMonth() + 1}. ${date.getDate()}.`;
};

const UserDashboard = () => {
    const { user, token } = useAuth();
    const navigate = useNavigate();
    const { openSingleFile } = useFileContext();

    // State
    const [activeNav, setActiveNav] = useState<'drive' | 'recent' | 'trash'>('drive');
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
    const [currentFolderId, setCurrentFolderId] = useState<number | null>(null);
    const [folderStack, setFolderStack] = useState<Breadcrumb[]>([{ id: null, name: '내 드라이브' }]);

    // Data
    const [folders, setFolders] = useState<Folder[]>([]);
    const [files, setFiles] = useState<FileItem[]>([]);
    // const [isLoading, setIsLoading] = useState(false); // Unused for now

    // Modals & UI States
    const [isCreateFolderOpen, setIsCreateFolderOpen] = useState(false);
    const [isNewDropdownOpen, setIsNewDropdownOpen] = useState(false); // Controls the + New dropdown
    const [newFolderName, setNewFolderName] = useState('제목없는 폴더');

    useEffect(() => {
        fetchData();
    }, [user, token, activeNav, currentFolderId]);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (isNewDropdownOpen && !(event.target as Element).closest('.new-folder-wrapper')) {
                setIsNewDropdownOpen(false);
            }
        };
        document.addEventListener('click', handleClickOutside);
        return () => document.removeEventListener('click', handleClickOutside);
    }, [isNewDropdownOpen]);

    const fetchData = async () => {
        if (!user || !token) return;
        // setIsLoading(true);
        try {
            const headers = { 'Authorization': `Bearer ${token}` };

            let filesUrl = 'http://localhost:8080/api/user/files';
            const foldersUrl = 'http://localhost:8080/api/folders';

            const isTrash = activeNav === 'trash';
            const fileParams = new URLSearchParams();
            const folderParams = new URLSearchParams();

            if (isTrash) {
                fileParams.append('trashed', 'true');
                folderParams.append('trashed', 'true');
            } else {
                if (activeNav === 'recent') {
                    // Recent defaults to flattened view, implementation detail on backend usually
                } else {
                    if (currentFolderId) {
                        fileParams.append('folderId', currentFolderId.toString());
                        folderParams.append('parentId', currentFolderId.toString());
                    } else {
                        // Root
                        filesUrl = 'http://localhost:8080/api/user/drive/files';
                    }
                }
            }

            // Fetch Folders
            let fetchedFolders: Folder[] = [];
            if (activeNav !== 'recent') {
                const folderRes = await fetch(`${foldersUrl}?${folderParams}`, { headers });
                if (folderRes.ok) fetchedFolders = await folderRes.json();
            }

            // Fetch Files
            const fileRes = await (activeNav === 'drive' && !currentFolderId
                ? fetch(filesUrl, { headers })
                : fetch(`${filesUrl}?${fileParams}`, { headers }));

            if (fileRes.ok) setFiles(await fileRes.json());
            setFolders(fetchedFolders);

        } catch (error) {
            console.error(error);
        } finally {
            // setIsLoading(false);
        }
    };

    const handleCreateFolder = async () => {
        if (!newFolderName.trim() || !token) return;
        try {
            const res = await fetch('http://localhost:8080/api/folders', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    name: newFolderName,
                    parentFolderId: currentFolderId
                })
            });
            if (res.ok) {
                setNewFolderName('제목없는 폴더');
                setIsCreateFolderOpen(false);
                fetchData();
            }
        } catch (error) {
            console.error(error);
        }
    };

    const handleFolderClick = (folder: Folder | Breadcrumb, isBreadcrumb = false) => {
        // Safe check for trashed property which only exists on Folder type
        if ('trashed' in folder && folder.trashed) return;

        if (isBreadcrumb) {
            const newStackIndex = folderStack.findIndex(f => f.id === folder.id);
            if (newStackIndex !== -1) {
                setFolderStack(folderStack.slice(0, newStackIndex + 1));
                setCurrentFolderId(folder.id);
            }
        } else {
            setCurrentFolderId(folder.id);
            setFolderStack([...folderStack, { id: folder.id, name: folder.name }]);
        }
    };

    const handleFileClick = async (file: FileItem) => {
        if (!token) return;
        // setIsLoading(true);
        try {
            const headers = { 'Authorization': `Bearer ${token}` };

            // 1. Fetch File Details WITH BBoxes
            const fileDetailsRes = await fetch(`http://localhost:8080/api/files/${file.id}`, { headers });
            if (!fileDetailsRes.ok) throw new Error('Failed to fetch file details');
            const fileDetails = await fileDetailsRes.json();
            console.log('File with BBoxes:', fileDetails);

            // 2. Download File Blob
            const res = await fetch(`http://localhost:8080/api/files/${file.id}/download`, { headers });
            if (!res.ok) throw new Error('Download failed');
            const blob = await res.blob();
            const fileObj = new File([blob], file.name, { type: blob.type });

            // 3. Convert BBoxes to coordinates format
            let coordinatesJson = undefined;
            if (fileDetails.bboxes && fileDetails.bboxes.length > 0) {
                const coordsArray = fileDetails.bboxes.map((bbox: any) => ({
                    type: bbox.type,
                    id: bbox.frontendId || `bbox-${bbox.id}`,
                    rect: { x: bbox.x, y: bbox.y, width: bbox.width, height: bbox.height },
                    page: bbox.page || 1
                }));
                coordinatesJson = JSON.stringify(coordsArray);
            }

            // 4. Open in Context with bbox data
            openSingleFile(fileObj, file.id, undefined, coordinatesJson, fileDetails.rotation || 0);
            navigate('/preview');
        } catch (e) {
            console.error(e);
            alert('파일을 열 수 없습니다.');
        } finally {
            // setIsLoading(false);
        }
    };

    const moveToTrash = async (id: number, type: 'file' | 'folder') => {
        if (!token) return;

        const isConfirmed = window.confirm(`${type === 'file' ? '파일' : '폴더'}을(를) 휴지통으로 이동하시겠습니까?`);
        if (!isConfirmed) return;

        const endpoint = type === 'file' ? `/api/files/${id}/trash` : `/api/folders/${id}`;
        try {
            await fetch(`http://localhost:8080${endpoint}`, {
                method: type === 'folder' ? 'DELETE' : 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            fetchData();
        } catch (e) { console.error(e); }
    };

    return (
        <div className="dashboard-container">
            {/* Sidebar */}
            <div className="dashboard-sidebar">
                <div className="sidebar-content">
                    {/* New Button Wrapper */}
                    <div className="new-folder-wrapper">
                        <button
                            className="new-folder-btn"
                            onClick={(e) => {
                                e.stopPropagation();
                                setIsNewDropdownOpen(!isNewDropdownOpen);
                            }}
                        >
                            <Plus size={24} />
                            <span>신규</span>
                        </button>

                        {/* Dropdown Menu */}
                        {isNewDropdownOpen && (
                            <div className="new-dropdown-menu">
                                <div
                                    className="dropdown-item"
                                    onClick={() => {
                                        setIsNewDropdownOpen(false);
                                        setIsCreateFolderOpen(true);
                                    }}
                                >
                                    <FolderPlus size={18} />
                                    <span>새 폴더</span>
                                </div>
                                <div className="dropdown-divider"></div>
                                <div className="dropdown-item" onClick={() => navigate('/upload')}>
                                    <Upload size={18} />
                                    <span>파일 업로드</span>
                                </div>
                                <div className="dropdown-item">
                                    <FolderIcon size={18} />
                                    <span>폴더 업로드</span>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Navigation */}
                    <nav className="sidebar-nav">
                        <div
                            className={`nav-item ${activeNav === 'drive' ? 'active' : ''}`}
                            onClick={() => { setActiveNav('drive'); setCurrentFolderId(null); setFolderStack([{ id: null, name: '내 드라이브' }]); }}
                        >
                            <HardDrive size={18} />
                            <span>내 드라이브</span>
                        </div>
                        <div
                            className={`nav-item ${activeNav === 'recent' ? 'active' : ''}`}
                            onClick={() => setActiveNav('recent')}
                        >
                            <Clock size={18} />
                            <span>최근 문서함</span>
                        </div>
                        <div
                            className={`nav-item ${activeNav === 'trash' ? 'active' : ''}`}
                            onClick={() => setActiveNav('trash')}
                        >
                            <Trash2 size={18} />
                            <span>휴지통</span>
                        </div>
                    </nav>

                    {/* Footer */}
                    <div className="sidebar-footer">
                        <div className="storage-status">
                            <div className="text-xs text-gray-500 mb-1">저장공간</div>
                            <div className="w-full bg-gray-200 rounded-full h-1.5 mb-1">
                                <div className="bg-blue-600 h-1.5 rounded-full" style={{ width: '24%' }}></div>
                            </div>
                            <div className="text-xs text-gray-500">24.4GB / 100GB 사용 중</div>
                        </div>
                        <button className="btn-upgrade">
                            추가 저장용량 구매
                        </button>
                    </div>
                </div>
            </div>

            {/* Main Content Area */}
            <div className="dashboard-main">
                {/* Header */}
                <div className="dashboard-header">
                    <div className="breadcrumb-nav">
                        {activeNav === 'drive' ? (
                            <div className="nav-segments">
                                <span
                                    className={`nav-segment ${folderStack.length === 1 ? 'active' : ''}`}
                                    onClick={() => {
                                        setFolderStack([{ id: null, name: '내 드라이브' }]);
                                        setCurrentFolderId(null);
                                        setActiveNav('drive');
                                    }}
                                >
                                    내 드라이브
                                </span>
                                {folderStack.slice(1).map((folder, index) => (
                                    <div key={folder.id} className="flex items-center">
                                        <span className="separator">/</span>
                                        <span
                                            className={`nav-segment ${index === folderStack.length - 2 ? 'active' : ''}`}
                                            onClick={() => handleFolderClick(folder, true)}
                                        >
                                            {folder.name}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <h2 className="text-xl font-bold">
                                {activeNav === 'recent' ? '최근 문서함' : '휴지통'}
                            </h2>
                        )}
                    </div>

                    <div className="header-controls">
                        <div className="view-toggle">
                            <button
                                className={`toggle-btn ${viewMode === 'list' ? 'active' : ''}`}
                                onClick={() => setViewMode('list')}
                            >
                                <ListIcon size={18} />
                            </button>
                            <button
                                className={`toggle-btn ${viewMode === 'grid' ? 'active' : ''}`}
                                onClick={() => setViewMode('grid')}
                            >
                                <Grid size={18} />
                            </button>
                        </div>
                        <button className="icon-btn"><Search size={20} /></button>
                        <button className="icon-btn"><Bell size={20} /></button>
                        <div className="user-profile">
                            <div className="avatar">
                                {/* Fallback to 'U' if name is missing */}
                                {user?.name?.charAt(0).toUpperCase() || 'U'}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Dashboard Content */}
                <div className="dashboard-content no-scrollbar">
                    {/* Folders Section */}
                    {folders.length > 0 && (
                        <div className="section-group">
                            <h3 className="section-title">Folders</h3>
                            <div className="folder-grid">
                                {folders.map(folder => (
                                    <div
                                        key={`folder-${folder.id}`}
                                        className="folder-card group"
                                        onDoubleClick={() => handleFolderClick(folder)}
                                    >
                                        <div className="folder-icon-wrapper">
                                            <FolderIcon size={24} className="folder-icon-fill" />
                                        </div>
                                        <span className="folder-name">{folder.name}</span>
                                        <div className="card-actions">
                                            <button
                                                onClick={(e) => { e.stopPropagation(); moveToTrash(folder.id, 'folder'); }}
                                                className="action-btn hover:text-red-500 hover:bg-red-50"
                                                title="삭제"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Files Section */}
                    <div className="section-group">
                        <h3 className="section-title">Files</h3>
                        <div className={viewMode === 'grid' ? 'file-grid' : 'file-list'}>
                            {files && files.map(file => (
                                viewMode === 'grid' ? (
                                    <div key={file.id} className="group relative">
                                        <ProjectCard
                                            title={file.name}
                                            date={new Date(file.uploadTime).toLocaleDateString()}
                                            thumbnail={file.thumbnailUrl || '/placeholder-pdf.png'}
                                            onClick={() => handleFileClick(file)}
                                        />
                                        <div className="card-actions">
                                            <button
                                                onClick={(e) => { e.stopPropagation(); moveToTrash(file.id, 'file'); }}
                                                className="action-btn hover:text-red-500 hover:bg-red-50"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <div
                                        key={file.id}
                                        className="list-row group"
                                        onClick={() => handleFileClick(file)}
                                    >
                                        <div className={`icon-wrapper-base ${file.name.toLowerCase().endsWith('.pdf') ? 'icon-pdf' : 'icon-image'}`}>
                                            {file.name.toLowerCase().endsWith('.pdf') ? (
                                                <FileText size={20} />
                                            ) : (
                                                <ImageIcon size={20} />
                                            )}
                                        </div>
                                        <div className="row-title truncate">{file.name}</div>
                                        <div className="row-meta">나</div>
                                        <div className="row-meta">{formatDate(file.uploadTime)}</div>
                                        <div className="row-meta">{formatFileSize(file.size || 0)}</div>
                                        <div className="action-buttons-row">
                                            <button
                                                onClick={(e) => { e.stopPropagation(); moveToTrash(file.id, 'file'); }}
                                                className="action-btn hover:text-red-500 hover:bg-red-50"
                                                title="삭제"
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                            <button
                                                className="action-btn hover:text-gray-700 hover:bg-gray-100"
                                                onClick={(e) => { e.stopPropagation(); }}
                                            >
                                                <MoreVertical size={18} />
                                            </button>
                                        </div>
                                    </div>
                                )
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* Create Folder Modal */}
            {isCreateFolderOpen && (
                <div className="modal-overlay" onClick={() => setIsCreateFolderOpen(false)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">새 폴더</div>
                        <input
                            type="text"
                            className="modal-input"
                            value={newFolderName}
                            onChange={(e) => setNewFolderName(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') handleCreateFolder();
                            }}
                            placeholder="제목없는 폴더"
                            autoFocus
                            onFocus={(e) => e.target.select()}
                        />
                        <div className="modal-actions">
                            <button className="modal-btn cancel" onClick={() => setIsCreateFolderOpen(false)}>취소</button>
                            <button className="modal-btn create" onClick={handleCreateFolder}>만들기</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default UserDashboard;
