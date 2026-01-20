import React, { useState, useRef, useEffect } from 'react';

export interface BBox {
    id: string;
    type: 'title' | 'front' | 'side' | 'plan';
    rect: { x: number; y: number; width: number; height: number };
    page?: number;
}

interface SelectionOverlayProps {
    isActive: boolean;
    activeTool: 'none' | 'title' | 'front' | 'side' | 'plan';
    scale: number;
    bboxes: BBox[];
    onChange: (bboxes: BBox[]) => void;
    // New Props
    selectedId?: string | null;
    onSelect?: (id: string | null) => void;
    onDelete?: (id: string) => void; // Explicit delete handler
    onDoubleClick?: (id: string) => void; // New Double Click Handler
}

const TYPE_CONFIG = {
    title: { label: '표제란', color: '#2563eb', bg: 'rgba(37, 99, 235, 0.15)' },
    front: { label: '정면도', color: '#d93025', bg: 'rgba(217, 48, 37, 0.15)' },
    side: { label: '측면도', color: '#188038', bg: 'rgba(24, 128, 56, 0.15)' },
    plan: { label: '평면도', color: '#f9ab00', bg: 'rgba(249, 171, 0, 0.15)' },
};

export default function SelectionOverlay({ isActive, activeTool, scale, bboxes, onChange, selectedId, onSelect, onDelete, onDoubleClick }: SelectionOverlayProps) {
    const containerRef = useRef<HTMLDivElement>(null);

    // Interaction states
    const [dragState, setDragState] = useState<{
        mode: 'create' | 'move' | 'resize';
        startX: number;
        startY: number;
        targetId?: string; // ID of the box being moved/resized
        startRect?: { x: number; y: number; width: number; height: number }; // Original rect for move/resize
        handle?: string; // For resize
    } | null>(null);

    // Temporary rect during creation (screen coords)
    const [tempRect, setTempRect] = useState<{ x: number, y: number, width: number, height: number } | null>(null);

    // Reset when inactive
    useEffect(() => {
        if (!isActive) {
            setDragState(null);
            setTempRect(null);
        }
    }, [isActive]);

    // Helpers
    const toScreen = (r: { x: number, y: number, width: number, height: number }) => ({
        x: r.x * scale,
        y: r.y * scale,
        width: r.width * scale,
        height: r.height * scale
    });

    const toPdf = (r: { x: number, y: number, width: number, height: number }) => ({
        x: r.x / scale,
        y: r.y / scale,
        width: r.width / scale,
        height: r.height / scale
    });

    // Start CREATING a new box OR Deselect
    const handleMouseDown = (e: React.MouseEvent) => {
        if (!isActive) return;

        // If clicking empty space, deselect
        if (e.target === containerRef.current) {
            onSelect?.(null);
        }

        if (activeTool === 'none') return;

        const rect = e.currentTarget.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        setDragState({
            mode: 'create',
            startX: mouseX,
            startY: mouseY
        });
        setTempRect({ x: mouseX, y: mouseY, width: 0, height: 0 });
    };

    const lastClickRef = useRef<{ id: string, time: number } | null>(null);

    // Start MOVING an existing box
    const handleBoxMouseDown = (e: React.MouseEvent, id: string, rect: { x: number, y: number, width: number, height: number }) => {
        if (!isActive) return;
        e.stopPropagation();

        // Manual Double Click Detection
        const now = Date.now();
        if (lastClickRef.current && lastClickRef.current.id === id && (now - lastClickRef.current.time < 300)) {
            onDoubleClick?.(id);
            lastClickRef.current = null;
            // Optional: Return here to prevent drag start on double click? 
            // Letting drag start is fine, but maybe redundant. 
            // Let's allow drag to start so "click-click-drag" works or just consistent feel.
        } else {
            lastClickRef.current = { id, time: now };
        }

        // Select logic
        onSelect?.(id);

        setDragState({
            mode: 'move',
            startX: e.clientX,
            startY: e.clientY,
            targetId: id,
            startRect: { ...rect }
        });
    };

    // Start RESIZING an existing box
    const handleHandleMouseDown = (e: React.MouseEvent, id: string, rect: { x: number, y: number, width: number, height: number }, handle: string) => {
        if (!isActive) return;
        e.stopPropagation();

        setDragState({
            mode: 'resize',
            startX: e.clientX,
            startY: e.clientY,
            targetId: id,
            startRect: { ...rect },
            handle
        });
    };

    // Global Mouse Move / Up
    useEffect(() => {
        if (!dragState || !isActive) return;

        const handleGlobalMouseMove = (e: MouseEvent) => {
            if (!containerRef.current) return;
            e.preventDefault();

            // 1. Create Mode
            if (dragState.mode === 'create') {
                const containerRect = containerRef.current.getBoundingClientRect();
                const currX = e.clientX - containerRect.left;
                const currY = e.clientY - containerRect.top;

                const x = Math.min(dragState.startX, currX);
                const y = Math.min(dragState.startY, currY);
                const width = Math.abs(currX - dragState.startX);
                const height = Math.abs(currY - dragState.startY);

                setTempRect({ x, y, width, height });
            }
            // 2. Move Mode
            else if (dragState.mode === 'move' && dragState.startRect && dragState.targetId) {
                const dx = (e.clientX - dragState.startX) / scale;
                const dy = (e.clientY - dragState.startY) / scale;

                const newBBoxes = bboxes.map(b => {
                    if (b.id === dragState.targetId) {
                        return {
                            ...b,
                            rect: {
                                ...b.rect,
                                x: dragState.startRect!.x + dx,
                                y: dragState.startRect!.y + dy
                            }
                        };
                    }
                    return b;
                });
                onChange(newBBoxes);
            }
            // 3. Resize Mode
            else if (dragState.mode === 'resize' && dragState.startRect && dragState.targetId) {
                const dx = (e.clientX - dragState.startX) / scale;
                const dy = (e.clientY - dragState.startY) / scale;

                const newBBoxes = bboxes.map(b => {
                    if (b.id === dragState.targetId) {
                        const r = { ...dragState.startRect! };
                        if (dragState.handle?.includes('e')) r.width += dx;
                        if (dragState.handle?.includes('s')) r.height += dy;
                        if (dragState.handle?.includes('w')) { r.x += dx; r.width -= dx; }
                        if (dragState.handle?.includes('n')) { r.y += dy; r.height -= dy; }

                        if (r.width < 0) { r.x += r.width; r.width = -r.width; }
                        if (r.height < 0) { r.y += r.height; r.height = -r.height; }

                        return { ...b, rect: r };
                    }
                    return b;
                });
                onChange(newBBoxes);
            }
        };

        const handleGlobalMouseUp = () => {
            if (dragState.mode === 'create' && tempRect) {
                if (tempRect.width > 5 && tempRect.height > 5 && activeTool !== 'none') {
                    // Add new box
                    const newBox: BBox = {
                        id: Date.now().toString(),
                        type: activeTool,
                        rect: toPdf(tempRect)
                    };
                    onChange([...bboxes, newBox]);
                    // Auto select newly created box
                    onSelect?.(newBox.id);
                }
                setTempRect(null);
            }
            setDragState(null);
        };

        window.addEventListener('mousemove', handleGlobalMouseMove);
        window.addEventListener('mouseup', handleGlobalMouseUp);

        return () => {
            window.removeEventListener('mousemove', handleGlobalMouseMove);
            window.removeEventListener('mouseup', handleGlobalMouseUp);
        };
    }, [dragState, isActive, scale, tempRect, bboxes, onChange, activeTool, onSelect]);


    return (
        <div
            ref={containerRef}
            style={{
                position: 'absolute',
                top: 0, left: 0, right: 0, bottom: 0,
                zIndex: 10,
                cursor: activeTool !== 'none' ? 'crosshair' : 'default',
                // Visual cue for drawable area
                border: activeTool !== 'none' ? `2px dashed ${TYPE_CONFIG[activeTool as keyof typeof TYPE_CONFIG]?.color || '#2563eb'}` : 'none',
                backgroundColor: activeTool !== 'none' ? 'rgba(0, 0, 0, 0.03)' : 'transparent',
                boxShadow: activeTool !== 'none' ? `0 0 0 2px rgba(255, 255, 255, 0.5) inset` : 'none', // Inner white outline for contrast
            }}
            onMouseDown={handleMouseDown}
        >
            {/* Render Existing Boxes */}
            {(bboxes || []).map(box => {
                const screenRect = toScreen(box.rect);
                const config = TYPE_CONFIG[box.type] || TYPE_CONFIG.title;
                const isDragTarget = dragState?.targetId === box.id;
                const isSelected = selectedId === box.id;
                // Highlight if dragged OR selected
                const highlight = isDragTarget || isSelected;

                return (
                    <div
                        key={box.id}
                        style={{
                            position: 'absolute',
                            left: screenRect.x,
                            top: screenRect.y,
                            width: Math.abs(screenRect.width),
                            height: Math.abs(screenRect.height),
                            border: `2px solid ${highlight ? '#000' : config.color}`,
                            boxShadow: highlight ? '0 0 0 2px rgba(255,255,255,0.8)' : 'none',
                            backgroundColor: config.bg,
                            cursor: 'move',
                            boxSizing: 'border-box',
                            pointerEvents: dragState?.mode === 'create' ? 'none' : 'auto',
                            zIndex: highlight ? 20 : 11,
                            transition: 'border-color 0.2s'
                        }}
                        onMouseDown={(e) => handleBoxMouseDown(e, box.id, box.rect)}
                    >
                        {/* Resize Handles (Only show if Selected or Dragging) */}
                        {highlight && dragState?.mode !== 'create' && ['nw', 'ne', 'sw', 'se'].map(h => (
                            <div
                                key={h}
                                onMouseDown={(e) => handleHandleMouseDown(e, box.id, box.rect, h)}
                                style={{
                                    position: 'absolute',
                                    width: 10, height: 10,
                                    background: 'white',
                                    border: `2px solid ${config.color}`,
                                    borderRadius: '50%',
                                    [h.includes('n') ? 'top' : 'bottom']: -6,
                                    [h.includes('w') ? 'left' : 'right']: -6,
                                    cursor: `${h}-resize`,
                                    zIndex: 2,
                                    boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                                }}
                            />
                        ))}

                        {/* Label Tag (with Delete Button) */}
                        <div style={{
                            position: 'absolute',
                            top: -26,
                            left: 0,
                            display: 'flex',
                            gap: 4,
                            alignItems: 'center',
                            zIndex: 3
                        }}>
                            <div style={{
                                background: config.color,
                                color: 'white',
                                fontSize: 11,
                                padding: '2px 6px',
                                borderRadius: 4,
                                whiteSpace: 'nowrap',
                                fontWeight: 600,
                                boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                            }}>
                                {config.label}
                            </div>
                            {/* Always show delete on selected, or on hover? Keep it simple for now */}
                            <button
                                style={{
                                    background: 'white',
                                    border: '1px solid #ddd',
                                    borderRadius: 4,
                                    width: 20,
                                    height: 20,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    cursor: 'pointer',
                                    fontSize: 14,
                                    color: '#666',
                                    boxShadow: '0 1px 2px rgba(0,0,0,0.1)'
                                }}
                                onMouseDown={(e) => {
                                    e.stopPropagation(); // prevent drag start
                                    // Local delete or parent delete?
                                    // Use onDelete prop if available, else fallback
                                    if (onDelete) onDelete(box.id);
                                    else onChange(bboxes.filter(b => b.id !== box.id));
                                }}
                                title="삭제"
                            >
                                ×
                            </button>
                        </div>
                    </div>
                );
            })}

            {/* Temporary Dragging Box */}
            {tempRect && activeTool !== 'none' && (
                <div
                    style={{
                        position: 'absolute',
                        left: tempRect.x,
                        top: tempRect.y,
                        width: tempRect.width,
                        height: tempRect.height,
                        border: `1px solid ${TYPE_CONFIG[activeTool].color}`,
                        backgroundColor: TYPE_CONFIG[activeTool].bg,
                        boxSizing: 'border-box',
                        pointerEvents: 'none'
                    }}
                />
            )}
        </div>
    );
}
