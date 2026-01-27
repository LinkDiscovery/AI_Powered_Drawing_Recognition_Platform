import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
// Removed DashboardSidebar import as it is now inlined for custom styling
import ProjectCard from '../../components/ProjectCard';
import {
    Search, Bell, Grid, List as ListIcon, MoreVertical,
    Folder as FolderIcon, FileText, Image as ImageIcon,
    Trash2, Upload, Plus, HardDrive, Clock, FolderPlus, RotateCcw
} from 'lucide-react';
import { useFileContext } from '../../context/FileContext';
import DashboardOnboardingTour from '../../components/DashboardOnboardingTour';
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

            let filesUrl = '/api/user/files';
            const foldersUrl = '/api/folders';

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
                        filesUrl = '/api/user/drive/files';
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
            const res = await fetch('/api/folders', {
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
            const fileDetailsRes = await fetch(`/api/files/${file.id}`, { headers });
            if (!fileDetailsRes.ok) throw new Error('Failed to fetch file details');
            const fileDetails = await fileDetailsRes.json();
            // console.log('File with BBoxes:', fileDetails);

            // 2. Download File Blob
            const res = await fetch(`/api/files/${file.id}/download`, { headers });
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

        // If already in trash, confirm permanent delete
        if (activeNav === 'trash') {
            permanentDeleteFile(id, type);
            return;
        }

        const isConfirmed = window.confirm(`${type === 'file' ? '파일' : '폴더'}을(를) 휴지통으로 이동하시겠습니까?`);
        if (!isConfirmed) return;

        const endpoint = type === 'file' ? `/api/files/${id}/trash` : `/api/folders/${id}/trash`;
        try {
            const res = await fetch(endpoint, {
                method: 'PUT',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                fetchData();
            } else {
                const msg = await res.text();
                alert(`이동 실패: ${msg}`);
            }
        } catch (e) { console.error(e); alert('오류가 발생했습니다.'); }
    };

    const restoreFile = async (id: number, type: 'file' | 'folder') => {
        if (!token) return;

        const endpoint = type === 'file' ? `/api/files/${id}/restore` : `/api/folders/${id}/restore`;
        try {
            const res = await fetch(endpoint, {
                method: 'PUT',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                fetchData();
            } else {
                const msg = await res.text();
                alert(`복원 실패: ${msg}`);
            }
        } catch (e) { console.error(e); alert('오류가 발생했습니다.'); }
    };

    const permanentDeleteFile = async (id: number, type: 'file' | 'folder') => {
        if (!token) return;

        const isConfirmed = window.confirm(`정말로 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.`);
        if (!isConfirmed) return;

        const endpoint = type === 'file' ? `/api/files/${id}` : `/api/folders/${id}`;
        try {
            const res = await fetch(endpoint, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                fetchData();
            } else {
                const msg = await res.text();
                alert(`삭제 실패: ${msg}`);
            }
        } catch (e) { console.error(e); alert('오류가 발생했습니다.'); }
    };

    const [moveData, setMoveData] = useState<{ id: number, type: 'file' | 'folder' } | null>(null);
    const [selectedTargetId, setSelectedTargetId] = useState<number | null>(null);
    const [draggedItem, setDraggedItem] = useState<{ id: number, type: 'file' | 'folder', name: string } | null>(null);
    const dragLayerRef = useRef<HTMLDivElement>(null);

    // Reset selection when modal opens/closes
    useEffect(() => {
        if (moveData) setSelectedTargetId(null);
    }, [moveData]);

    const executeMove = async () => {
        if (!moveData || !token) return;

        await performMove(moveData.id, moveData.type, selectedTargetId);
        setMoveData(null);
    };

    const performMove = async (id: number, type: 'file' | 'folder', targetId: number | null) => {
        if (!token) return;

        // Circular check
        if (type === 'folder' && id === targetId) {
            alert('자신에게로 이동할 수 없습니다.');
            return;
        }

        const endpoint = type === 'file'
            ? `/api/files/${id}/move`
            : `/api/folders/${id}/move`;

        try {
            const res = await fetch(endpoint, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ targetFolderId: targetId })
            });

            if (res.ok) {
                fetchData();
            } else {
                const msg = await res.text();
                alert(`이동 실패: ${msg}`);
            }
        } catch (e) { console.error(e); alert('오류가 발생했습니다.'); }
    };

    const handleDragStart = (e: React.DragEvent, id: number, type: 'file' | 'folder', name: string) => {
        e.dataTransfer.setData('application/json', JSON.stringify({ id, type }));
        e.dataTransfer.effectAllowed = 'move';

        // Set empty drag image to hide native ghost
        const emptyImg = new Image();
        emptyImg.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
        e.dataTransfer.setDragImage(emptyImg, 0, 0);

        setDraggedItem({ id, type, name });
    };

    // Global drag over to track cursor position
    const handleContainerDragOver = (e: React.DragEvent) => {
        e.preventDefault(); // Necessary to allow dropping anywhere (and track mouse)
        // Direct DOM manipulation for performance (no re-renders)
        if (draggedItem && dragLayerRef.current) {
            const x = e.clientX + 12; // Offset right so cursor sits nicely next to it
            const y = e.clientY;      // Align with cursor Y
            // translateY(-50%) centers the element vertically on the cursor Y
            dragLayerRef.current.style.transform = `translate(${x}px, ${y}px) translateY(-50%)`;
        }
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation(); // Keep specific target active
        e.dataTransfer.dropEffect = 'move';
        e.currentTarget.classList.add('drag-over');
    };

    const handleDragLeave = (e: React.DragEvent) => {
        e.currentTarget.classList.remove('drag-over');
    };

    const handleDrop = async (e: React.DragEvent, targetFolderId: number) => {
        e.preventDefault();
        e.stopPropagation();
        e.currentTarget.classList.remove('drag-over');

        const data = e.dataTransfer.getData('application/json');
        if (!data) {
            // Clean up if drop happened but no data (shouldn't happen with our D&D)
            setDraggedItem(null);
            return;
        }

        try {
            const item = JSON.parse(data);
            if (item.type === 'folder' && item.id === targetFolderId) {
                setDraggedItem(null);
                return; // Prevent self-drop
            }

            await performMove(item.id, item.type, targetFolderId);
        } catch (err) {
            console.error('Drop error', err);
        } finally {
            setDraggedItem(null);
        }
    };

    // End drag if dropped outside or cancelled
    const handleDragEnd = () => {
        setDraggedItem(null);
    };

    return (
        <div
            className="dashboard-container"
            onDragOver={handleContainerDragOver}
            onDragEnd={handleDragEnd}
        >
            <DashboardOnboardingTour />
            {/* Custom Drag Layer */}
            {draggedItem && (
                <div
                    ref={dragLayerRef}
                    style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        pointerEvents: 'none',
                        zIndex: 9999,
                        backgroundColor: 'white',
                        padding: '8px 12px',
                        borderRadius: '8px',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        border: '1px solid #E5E7EB',
                        opacity: 1, // Explicitly opaque
                        willChange: 'transform' // Hint for optimization
                    }}
                >
                    {draggedItem.type === 'folder' ? (
                        <FolderIcon size={20} className="text-gray-400" fill="currentColor" />
                    ) : (
                        <FileText size={20} className="text-red-500" />
                    )}
                    <span className="font-medium text-sm text-gray-900">{draggedItem.name}</span>
                </div>
            )}

            {/* Sidebar */}
            <div className="dashboard-sidebar">
                <div className="sidebar-content">
                    {/* New Button Wrapper */}
                    <div className="new-folder-wrapper">
                        <button
                            className="new-folder-btn"
                            id="dashboard-new-btn" // Added ID for Tour
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
                    <nav className="sidebar-nav" id="dashboard-sidebar-nav">
                        <div
                            className={`nav-item ${activeNav === 'drive' ? 'active' : ''}`}
                            onClick={() => { setActiveNav('drive'); setCurrentFolderId(null); setFolderStack([{ id: null, name: '내 드라이브' }]); }}
                            onDragOver={(e) => {
                                if (activeNav === 'drive') {
                                    handleDragOver(e);
                                    e.currentTarget.classList.add('nav-drag-over'); // Keep specific class
                                }
                            }}
                            onDragLeave={(e) => e.currentTarget.classList.remove('nav-drag-over')}
                            onDrop={(e) => {
                                if (activeNav === 'drive') {
                                    e.currentTarget.classList.remove('nav-drag-over');
                                    handleDrop(e, 0);
                                }
                            }}
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
                            id="nav-item-trash" // Added ID for Tour
                        >
                            <Trash2 size={18} />
                            <span>휴지통</span>
                        </div>

                        {/* Help / Tour Replay - Pushed to bottom */}
                        <div
                            className="nav-item"
                            onClick={() => window.dispatchEvent(new Event('restart-dashboard-tour'))}
                            style={{ marginTop: 'auto' }}
                        >
                            <span style={{ fontSize: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '18px' }}>❓</span>
                            <span>도움말</span>
                        </div>
                    </nav>
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
                                    onDragOver={(e) => { handleDragOver(e); e.currentTarget.classList.add('drag-over-text'); }}
                                    onDragLeave={(e) => e.currentTarget.classList.remove('drag-over-text')}
                                    onDrop={(e) => {
                                        e.preventDefault();
                                        e.currentTarget.classList.remove('drag-over-text');
                                        // Drop on Root Breadcrumb
                                        const data = e.dataTransfer.getData('application/json');
                                        if (data) {
                                            const item = JSON.parse(data);
                                            performMove(item.id, item.type, null);
                                        }
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
                                            onDragOver={(e) => { handleDragOver(e); e.currentTarget.classList.add('drag-over-text'); }}
                                            onDragLeave={(e) => e.currentTarget.classList.remove('drag-over-text')}
                                            onDrop={(e) => {
                                                e.preventDefault();
                                                e.currentTarget.classList.remove('drag-over-text');
                                                const data = e.dataTransfer.getData('application/json');
                                                if (data) {
                                                    const item = JSON.parse(data);
                                                    if (item.type === 'folder' && item.id === folder.id) return;
                                                    performMove(item.id, item.type, folder.id);
                                                }
                                            }}
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
                <div className="dashboard-content no-scrollbar" id="dashboard-file-list">
                    {/* Folders Section */}
                    {folders.length > 0 && (
                        <div className="section-group">
                            <h3 className="section-title">Folders</h3>
                            <div className="folder-grid">
                                {folders.map(folder => (
                                    <div
                                        key={`folder-${folder.id}`}
                                        className="folder-card group"
                                        draggable={!folder.trashed}
                                        onDragStart={(e) => handleDragStart(e, folder.id, 'folder', folder.name)}
                                        onDragOver={(e) => !folder.trashed && handleDragOver(e)}
                                        onDragLeave={handleDragLeave}
                                        onDrop={(e) => !folder.trashed && handleDrop(e, folder.id)}
                                        onDoubleClick={() => handleFolderClick(folder)}
                                    >
                                        <div className="folder-icon-wrapper">
                                            <FolderIcon size={24} className="folder-icon-fill" />
                                        </div>
                                        <span className="folder-name">{folder.name}</span>
                                        <div className="card-actions">
                                            {activeNav !== 'trash' && (
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); setMoveData({ id: folder.id, type: 'folder' }); }}
                                                    className="action-btn hover:text-blue-500 hover:bg-blue-50"
                                                    title="이동"
                                                >
                                                    <FolderIcon size={16} /> {/* Move Icon substitute */}
                                                </button>
                                            )}
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
                        <h3 className="section-title" id="dashboard-files-title">Files</h3>
                        <div className={viewMode === 'grid' ? 'file-grid' : 'file-list'}>
                            {files && files.map(file => (
                                viewMode === 'grid' ? (
                                    <div
                                        key={file.id}
                                        className="group relative"
                                        draggable={!file.isTrashed}
                                        onDragStart={(e) => handleDragStart(e, file.id, 'file', file.name)}
                                    >
                                        <ProjectCard
                                            title={file.name}
                                            date={new Date(file.uploadTime).toLocaleDateString()}
                                            thumbnail={file.thumbnailUrl || '/placeholder-pdf.png'}
                                            onClick={() => handleFileClick(file)}
                                        />
                                        <div className="card-actions">
                                            {activeNav === 'trash' ? (
                                                <>
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); restoreFile(file.id, 'file'); }}
                                                        className="action-btn hover:text-green-600 hover:bg-green-50"
                                                        title="복원"
                                                    >
                                                        <RotateCcw size={16} />
                                                    </button>
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); permanentDeleteFile(file.id, 'file'); }}
                                                        className="action-btn hover:text-red-600 hover:bg-red-50"
                                                        title="영구 삭제"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                </>
                                            ) : (
                                                <>
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); setMoveData({ id: file.id, type: 'file' }); }}
                                                        className="action-btn hover:text-blue-500 hover:bg-blue-50"
                                                        title="이동"
                                                    >
                                                        <FolderIcon size={16} />
                                                    </button>
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); moveToTrash(file.id, 'file'); }}
                                                        className="action-btn hover:text-red-500 hover:bg-red-50"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                ) : (
                                    <div
                                        key={file.id}
                                        className="list-row group"
                                        onClick={() => handleFileClick(file)}
                                        draggable={!file.isTrashed}
                                        onDragStart={(e) => handleDragStart(e, file.id, 'file', file.name)}
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
                                            {activeNav === 'trash' ? (
                                                <>
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); restoreFile(file.id, 'file'); }}
                                                        className="action-btn hover:text-green-600 hover:bg-green-50"
                                                        title="복원"
                                                    >
                                                        <RotateCcw size={18} />
                                                    </button>
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); permanentDeleteFile(file.id, 'file'); }}
                                                        className="action-btn hover:text-red-600 hover:bg-red-50"
                                                        title="영구 삭제"
                                                    >
                                                        <Trash2 size={18} />
                                                    </button>
                                                </>
                                            ) : (
                                                <>
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); setMoveData({ id: file.id, type: 'file' }); }}
                                                        className="action-btn hover:text-blue-500 hover:bg-blue-50"
                                                        title="이동"
                                                    >
                                                        <FolderIcon size={18} />
                                                    </button>
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
                                                </>
                                            )}
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

            {/* Move Modal (Folder Picker) */}
            {moveData && (
                <div className="modal-overlay" onClick={() => setMoveData(null)}>
                    <div className="modal-content move-modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">이동할 위치 선택</div>
                        <div className="folder-list-container full-scrollbar">
                            {/* Root option */}
                            <div
                                className={`folder-item ${selectedTargetId === null ? 'selected' : ''}`}
                                onClick={() => setSelectedTargetId(null)}
                            >
                                <HardDrive size={18} />
                                <span>내 드라이브</span>
                            </div>
                            {/* Folder list */}
                            {folders.filter(f => !f.trashed && f.id !== moveData.id).map(folder => (
                                <div
                                    key={`target-${folder.id}`}
                                    className={`folder-item ${selectedTargetId === folder.id ? 'selected' : ''}`}
                                    onClick={() => setSelectedTargetId(folder.id)}
                                    style={{ paddingLeft: '32px' }} // Indent for hierarchy visual (fake for now)
                                >
                                    <FolderIcon size={18} />
                                    <span>{folder.name}</span>
                                </div>
                            ))}
                            {folders.length === 0 && <div className="p-4 text-center text-gray-500">폴더가 없습니다.</div>}
                        </div>
                        <div className="modal-actions">
                            <button className="modal-btn cancel" onClick={() => setMoveData(null)}>취소</button>
                            <button className="modal-btn create" onClick={executeMove}>여기로 이동</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default UserDashboard;
