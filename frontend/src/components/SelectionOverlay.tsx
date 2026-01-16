import { useState, useRef, useEffect } from 'react';

interface Rect {
    x: number;
    y: number;
    width: number;
    height: number;
}

interface SelectionOverlayProps {
    isActive: boolean;
    scale: number;
    rect: Rect | null; // Current selected rect in PDF coordinates
    onChange: (rect: Rect | null) => void;
}

export default function SelectionOverlay({ isActive, scale, rect, onChange }: SelectionOverlayProps) {
    const containerRef = useRef<HTMLDivElement>(null);

    // Interaction states
    const [dragState, setDragState] = useState<{
        mode: 'create' | 'move' | 'resize';
        startX: number;
        startY: number;
        startRect: Rect | null; // For move/resize, the rect at start of drag
        handle?: string; // For resize: 'nw', 'ne', 'sw', 'se'
    } | null>(null);

    // Temporary rect during creation (screen coords relative to container)
    const [tempRect, setTempRect] = useState<Rect | null>(null);

    // reset interaction when inactive
    useEffect(() => {
        if (!isActive) {
            setDragState(null);
            setTempRect(null);
        }
    }, [isActive]);

    // Helpers to convert between PDF Points and Screen Pixels
    const toScreen = (r: Rect) => ({
        x: r.x * scale,
        y: r.y * scale,
        width: r.width * scale,
        height: r.height * scale
    });

    const toPdf = (r: Rect) => ({
        x: r.x / scale,
        y: r.y / scale,
        width: r.width / scale,
        height: r.height / scale
    });

    const handleMouseDown = (e: React.MouseEvent) => {
        if (!isActive) return;
        // Don't prevent default here to allow focus, but we stop propagation
        e.stopPropagation();

        // Use consistent coordinate system: clientX/Y relative to clientRect
        // This is safer than mixing offsetX/Y which can differ in rounding or origin
        const rect = e.currentTarget.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        setDragState({
            mode: 'create',
            startX: mouseX,
            startY: mouseY,
            startRect: null
        });
        setTempRect({ x: mouseX, y: mouseY, width: 0, height: 0 });
    };

    const handleBoxMouseDown = (e: React.MouseEvent) => {
        if (!isActive || !rect) return;
        e.stopPropagation();

        // Start Move
        setDragState({
            mode: 'move',
            startX: e.clientX,
            startY: e.clientY,
            startRect: { ...rect }
        });
    };

    const handleHandleMouseDown = (e: React.MouseEvent, handle: string) => {
        if (!isActive || !rect) return;
        e.stopPropagation();

        // Start Resize
        setDragState({
            mode: 'resize',
            startX: e.clientX,
            startY: e.clientY,
            startRect: { ...rect },
            handle
        });
    };

    // Global event listeners for drag
    useEffect(() => {
        if (!dragState || !isActive) return;

        const handleGlobalMouseMove = (e: MouseEvent) => {
            if (!containerRef.current) return;
            e.preventDefault();

            // Use containerRef for coordinate calculation
            const containerRect = containerRef.current.getBoundingClientRect();

            if (dragState.mode === 'create') {
                const currX = e.clientX - containerRect.left;
                const currY = e.clientY - containerRect.top;

                const x = Math.min(dragState.startX, currX);
                const y = Math.min(dragState.startY, currY);
                const width = Math.abs(currX - dragState.startX);
                const height = Math.abs(currY - dragState.startY);

                setTempRect({ x, y, width, height });
            }
            else if (dragState.mode === 'move' && dragState.startRect) {
                const dx = (e.clientX - dragState.startX) / scale;
                const dy = (e.clientY - dragState.startY) / scale;

                onChange({
                    ...dragState.startRect,
                    x: dragState.startRect.x + dx,
                    y: dragState.startRect.y + dy
                });
            }
            else if (dragState.mode === 'resize' && dragState.startRect) {
                const dx = (e.clientX - dragState.startX) / scale;
                const dy = (e.clientY - dragState.startY) / scale;

                const r = { ...dragState.startRect };

                if (dragState.handle?.includes('e')) r.width += dx;
                if (dragState.handle?.includes('s')) r.height += dy;
                if (dragState.handle?.includes('w')) {
                    r.x += dx;
                    r.width -= dx;
                }
                if (dragState.handle?.includes('n')) {
                    r.y += dy;
                    r.height -= dy;
                }

                if (r.width < 0) { r.x += r.width; r.width = -r.width; }
                if (r.height < 0) { r.y += r.height; r.height = -r.height; }

                onChange(r);
            }
        };

        const handleGlobalMouseUp = () => {
            if (dragState.mode === 'create' && tempRect) {
                if (tempRect.width > 5 && tempRect.height > 5) {
                    onChange(toPdf(tempRect));
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
    }, [dragState, isActive, scale, tempRect, onChange]); // Note: tempRect dependency for mouseUp check, ensuring we capture latest state if needed, though mostly relying on closure or state updates

    const screenRect = rect ? toScreen(rect) : null;

    return (
        <div
            ref={containerRef}
            style={{
                position: 'absolute',
                top: 0, left: 0, right: 0, bottom: 0,
                zIndex: 10,
                cursor: dragState?.mode === 'create' ? 'crosshair' : 'default',
            }}
            onMouseDown={handleMouseDown}
        >
            {/* Existing Selection Box */}
            {screenRect && (
                <div
                    style={{
                        position: 'absolute',
                        left: screenRect.x,
                        top: screenRect.y,
                        width: Math.abs(screenRect.width),
                        height: Math.abs(screenRect.height),
                        border: '2px solid #2563eb',
                        backgroundColor: 'rgba(37, 99, 235, 0.15)',
                        cursor: 'move',
                        boxSizing: 'border-box',
                        // Vital: Disable pointer events during creation to ensure offsetX is relative to container
                        pointerEvents: dragState?.mode === 'create' ? 'none' : 'auto'
                    }}
                    onMouseDown={handleBoxMouseDown}
                >
                    {/* Resize Handles */}
                    {['nw', 'ne', 'sw', 'se'].map(h => (
                        <div
                            key={h}
                            onMouseDown={(e) => handleHandleMouseDown(e, h)}
                            style={{
                                position: 'absolute',
                                width: 10, height: 10,
                                background: 'white',
                                border: '2px solid #2563eb',
                                borderRadius: '50%',
                                boxShadow: '0 0 2px rgba(0,0,0,0.2)',
                                [h.includes('n') ? 'top' : 'bottom']: -4,
                                [h.includes('w') ? 'left' : 'right']: -4,
                                cursor: `${h}-resize`,
                                zIndex: 1,
                                pointerEvents: dragState?.mode === 'create' ? 'none' : 'auto'
                            }}
                        />
                    ))}

                    {/* Info Tag */}
                    <div style={{
                        position: 'absolute',
                        top: -24,
                        left: 0,
                        background: '#2563eb',
                        color: 'white',
                        fontSize: 11,
                        padding: '2px 6px',
                        borderRadius: 4,
                        whiteSpace: 'nowrap'
                    }}>
                        표제란 선택 영역
                    </div>
                </div>
            )}

            {/* Temporary Dragging Box */}
            {tempRect && (
                <div
                    style={{
                        position: 'absolute',
                        left: tempRect.x,
                        top: tempRect.y,
                        width: tempRect.width,
                        height: tempRect.height,
                        border: '1px solid #d93025',
                        backgroundColor: 'rgba(255, 0, 0, 0.1)',
                        boxSizing: 'border-box',
                        pointerEvents: 'none'
                    }}
                />
            )}
        </div>
    );
}
