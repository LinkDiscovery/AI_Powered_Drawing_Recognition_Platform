import { useEffect, useRef, useState } from 'react';
import * as pdfjsLib from 'pdfjs-dist';

interface PdfThumbnailProps {
    pdf: any;
    pageNumber: number;
    width?: number; // Target width for the thumbnail
    isActive: boolean;
    onClick: () => void;
}

export default function PdfThumbnail({ pdf, pageNumber, width = 120, isActive, onClick }: PdfThumbnailProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [rendering, setRendering] = useState(false);

    useEffect(() => {
        let active = true;
        let renderTask: any = null;

        const render = async () => {
            if (!pdf || !canvasRef.current) return;
            setRendering(true);

            try {
                const page = await pdf.getPage(pageNumber);
                if (!active) return;

                // 1. Calculate Scale based on desired Width
                const viewport = page.getViewport({ scale: 1.0 });
                const scale = width / viewport.width;
                const scaledViewport = page.getViewport({ scale });

                // 2. Prepare Canvas
                const canvas = canvasRef.current;
                const context = canvas.getContext('2d');
                if (!context) return;

                canvas.height = scaledViewport.height;
                canvas.width = scaledViewport.width;

                // 3. Render
                const renderContext = {
                    canvasContext: context,
                    viewport: scaledViewport,
                };

                renderTask = page.render(renderContext);
                await renderTask.promise;
            } catch (err) {
                console.error(`Error rendering thumbnail ${pageNumber}:`, err);
            } finally {
                if (active) setRendering(false);
            }
        };

        render();

        return () => {
            active = false;
            if (renderTask) renderTask.cancel();
        };
    }, [pdf, pageNumber, width]);

    return (
        <div
            onClick={onClick}
            style={{
                cursor: 'pointer',
                marginBottom: 16,
                padding: 4,
                borderRadius: 4,
                border: isActive ? '2px solid #0052cc' : '2px solid transparent',
                backgroundColor: isActive ? 'rgba(0, 82, 204, 0.05)' : 'transparent',
                textAlign: 'center',
                transition: 'all 0.2s',
            }}
        >
            <div style={{
                position: 'relative',
                display: 'inline-block',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                backgroundColor: 'white',
                minHeight: width * 1.4 // Aspect ratio placeholder
            }}>
                <canvas ref={canvasRef} style={{ display: 'block' }} />
                {rendering && (
                    <div style={{
                        position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
                        backgroundColor: 'rgba(255,255,255,0.5)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 10, color: '#666'
                    }}>
                        Loading...
                    </div>
                )}
            </div>
            <div style={{ marginTop: 4, fontSize: 12, color: isActive ? '#0052cc' : '#666', fontWeight: 500 }}>
                {pageNumber}
            </div>
        </div>
    );
}
