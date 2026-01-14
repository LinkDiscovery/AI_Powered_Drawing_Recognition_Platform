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
        if (!isActive || !containerRef.current) return;
        e.preventDefault();
        e.stopPropagation();

        const containerRect = containerRef.current.getBoundingClientRect();
        const mouseX = e.clientX - containerRect.left;
        const mouseY = e.clientY - containerRect.top;

        // If we clicked simply on the container "background", we start creating.
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
        e.stopPropagation(); // Don't trigger container create

        // Start Move
        setDragState({
            mode: 'move',
            startX: e.clientX,
            startY: e.clientY,
            startRect: { ...rect } // Copy PDF rect
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

    const handleMouseMove = (e: React.MouseEvent) => {
        if (!isActive || !dragState || !containerRef.current) return;
        e.preventDefault();

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
        else if (dragState.mode === 'move' && dragState.startRect) {
            const dx = (e.clientX - dragState.startX) / scale; // delta in PDF points
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

            // Should properly handle negative flipping... simple version first:
            // Assuming startRect width/height are positive.

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

            // Normalize if width/height < 0
            if (r.width < 0) { r.x += r.width; r.width = -r.width; }
            if (r.height < 0) { r.y += r.height; r.height = -r.height; }

            onChange(r);
        }
    };

    const handleMouseUp = () => {
        if (!isActive || !dragState) return;

        if (dragState.mode === 'create' && tempRect) {
            // Finalize creation
            if (tempRect.width > 5 && tempRect.height > 5) {
                onChange(toPdf(tempRect));
            }
            setTempRect(null);
        }

        setDragState(null);
    };

    // Render logic
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
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp} // Stop drag if leaves container
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
                                width: 8, height: 8,
                                background: '#fff',
                                border: '1px solid #2563eb',
                                [h.includes('n') ? 'top' : 'bottom']: -4,
                                [h.includes('w') ? 'left' : 'right']: -4,
                                cursor: `${h}-resize`,
                                zIndex: 1
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
                        border: '2px dashed #d93025',
                        backgroundColor: 'rgba(255, 0, 0, 0.1)',
                        pointerEvents: 'none'
                    }}
                />
            )}
        </div>
    );
}
