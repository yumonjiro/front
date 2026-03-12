import { useRef, useEffect, useCallback, useState } from 'react';

export default function ImageCanvas({
    imageSrc,
    resultImageSrc,
    mode,
    points,
    labels,
    bboxes,
    onAddPoint,
    onAddBBox,
}) {
    const containerRef = useRef(null);
    const canvasRef = useRef(null);
    const imgRef = useRef(null);
    const [imgLoaded, setImgLoaded] = useState(false);
    const [drawState, setDrawState] = useState(null); // { startX, startY, currentX, currentY }

    // The image to display: result image takes priority over original
    const displaySrc = resultImageSrc || imageSrc;

    // Load image and set canvas dimensions
    useEffect(() => {
        if (!displaySrc) {
            setImgLoaded(false);
            return;
        }
        setImgLoaded(false); // Reset so that onload triggers a re-render
        const img = new Image();
        img.onload = () => {
            imgRef.current = img;
            setImgLoaded(true);
        };
        img.src = displaySrc;
    }, [displaySrc]);

    // Redraw canvas whenever anything changes
    useEffect(() => {
        const canvas = canvasRef.current;
        const container = containerRef.current;
        const img = imgRef.current;
        if (!canvas || !container || !img || !imgLoaded) return;

        // Fit canvas to container, preserving aspect ratio
        const containerW = container.clientWidth;
        const containerH = container.clientHeight;
        const imgAspect = img.naturalWidth / img.naturalHeight;
        const containerAspect = containerW / containerH;

        let drawW, drawH;
        if (imgAspect > containerAspect) {
            drawW = containerW;
            drawH = containerW / imgAspect;
        } else {
            drawH = containerH;
            drawW = containerH * imgAspect;
        }

        canvas.width = drawW;
        canvas.height = drawH;
        canvas.style.width = drawW + 'px';
        canvas.style.height = drawH + 'px';

        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, drawW, drawH);
        ctx.drawImage(img, 0, 0, drawW, drawH);

        // Only draw annotations on the original image (not on result image)
        if (!resultImageSrc) {
            const scaleX = drawW / img.naturalWidth;
            const scaleY = drawH / img.naturalHeight;

            // Draw points
            if (mode === 'point' && points) {
                points.forEach((pt, i) => {
                    const cx = pt[0] * scaleX;
                    const cy = pt[1] * scaleY;
                    const isFg = labels[i] === 1;
                    ctx.beginPath();
                    ctx.arc(cx, cy, 6, 0, Math.PI * 2);
                    ctx.fillStyle = isFg ? 'rgba(0,200,0,0.8)' : 'rgba(220,0,0,0.8)';
                    ctx.fill();
                    ctx.strokeStyle = '#fff';
                    ctx.lineWidth = 2;
                    ctx.stroke();
                });
            }

            // Draw bboxes
            if (mode === 'bbox' && bboxes) {
                bboxes.forEach((box) => {
                    const x = box[0] * scaleX;
                    const y = box[1] * scaleY;
                    const w = (box[2] - box[0]) * scaleX;
                    const h = (box[3] - box[1]) * scaleY;
                    ctx.strokeStyle = 'rgba(0,120,255,0.9)';
                    ctx.lineWidth = 2;
                    ctx.strokeRect(x, y, w, h);
                    ctx.fillStyle = 'rgba(0,120,255,0.1)';
                    ctx.fillRect(x, y, w, h);
                });
            }

            // Draw in-progress bbox drag
            if (drawState && mode === 'bbox') {
                const x = Math.min(drawState.startX, drawState.currentX);
                const y = Math.min(drawState.startY, drawState.currentY);
                const w = Math.abs(drawState.currentX - drawState.startX);
                const h = Math.abs(drawState.currentY - drawState.startY);
                ctx.setLineDash([5, 5]);
                ctx.strokeStyle = 'rgba(0,120,255,0.9)';
                ctx.lineWidth = 2;
                ctx.strokeRect(x, y, w, h);
                ctx.fillStyle = 'rgba(0,120,255,0.15)';
                ctx.fillRect(x, y, w, h);
                ctx.setLineDash([]);
            }
        }
    }, [imgLoaded, displaySrc, resultImageSrc, mode, points, labels, bboxes, drawState]);

    // Convert canvas pixel coords to original image coords
    const canvasToImage = useCallback((canvasX, canvasY) => {
        const canvas = canvasRef.current;
        const img = imgRef.current;
        if (!canvas || !img) return [0, 0];
        const scaleX = img.naturalWidth / canvas.width;
        const scaleY = img.naturalHeight / canvas.height;
        return [canvasX * scaleX, canvasY * scaleY];
    }, []);

    const getCanvasCoords = useCallback((e) => {
        const rect = canvasRef.current.getBoundingClientRect();
        return [e.clientX - rect.left, e.clientY - rect.top];
    }, []);

    // Point mode: click handler
    const handleClick = useCallback((e) => {
        if (resultImageSrc || mode !== 'point') return;
        const [cx, cy] = getCanvasCoords(e);
        const [ix, iy] = canvasToImage(cx, cy);
        // Left click = fg (1)
        onAddPoint([ix, iy], 1);
    }, [mode, resultImageSrc, getCanvasCoords, canvasToImage, onAddPoint]);

    // Point mode: right click handler
    const handleContextMenu = useCallback((e) => {
        e.preventDefault();
        if (resultImageSrc || mode !== 'point') return;
        const [cx, cy] = getCanvasCoords(e);
        const [ix, iy] = canvasToImage(cx, cy);
        // Right click = bg (0)
        onAddPoint([ix, iy], 0);
    }, [mode, resultImageSrc, getCanvasCoords, canvasToImage, onAddPoint]);

    // BBox mode: drag handlers
    const handleMouseDown = useCallback((e) => {
        if (resultImageSrc || mode !== 'bbox' || e.button !== 0) return;
        const [cx, cy] = getCanvasCoords(e);
        setDrawState({ startX: cx, startY: cy, currentX: cx, currentY: cy });
    }, [mode, resultImageSrc, getCanvasCoords]);

    const handleMouseMove = useCallback((e) => {
        if (!drawState || mode !== 'bbox') return;
        const [cx, cy] = getCanvasCoords(e);
        setDrawState((prev) => ({ ...prev, currentX: cx, currentY: cy }));
    }, [drawState, mode, getCanvasCoords]);

    const handleMouseUp = useCallback((e) => {
        if (!drawState || mode !== 'bbox') return;
        const [cx, cy] = getCanvasCoords(e);
        const x1 = Math.min(drawState.startX, cx);
        const y1 = Math.min(drawState.startY, cy);
        const x2 = Math.max(drawState.startX, cx);
        const y2 = Math.max(drawState.startY, cy);

        // Only add if the box has some minimum size
        if (x2 - x1 > 3 && y2 - y1 > 3) {
            const [ix1, iy1] = canvasToImage(x1, y1);
            const [ix2, iy2] = canvasToImage(x2, y2);
            onAddBBox([ix1, iy1, ix2, iy2]);
        }
        setDrawState(null);
    }, [drawState, mode, getCanvasCoords, canvasToImage, onAddBBox]);

    if (!displaySrc) return null;

    const cursorClass = resultImageSrc
        ? ''
        : mode === 'point'
            ? 'cursor-crosshair'
            : mode === 'bbox'
                ? 'cursor-crosshair'
                : '';

    return (
        <div className="canvas-container" ref={containerRef}>
            <canvas
                ref={canvasRef}
                className={`image-canvas ${cursorClass}`}
                onClick={handleClick}
                onContextMenu={handleContextMenu}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={() => drawState && setDrawState(null)}
            />
        </div>
    );
}
