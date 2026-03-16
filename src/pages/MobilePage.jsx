import { useState, useCallback, useRef, useEffect } from 'react';
import { predictAutoImage, predictPointImage, predictBBoxImage } from '../api';
import './MobilePage.css';

const THRESHOLD = 0.2;
const MIN_SCALE = 1;
const MAX_SCALE = 5;

function ZoomableImage({ src, alt }) {
    const containerRef = useRef(null);
    const imgRef = useRef(null);
    const stateRef = useRef({ scale: 1, x: 0, y: 0 });
    const touchRef = useRef({ startDist: 0, startScale: 1, startX: 0, startY: 0, startPanX: 0, startPanY: 0, isPinching: false });

    const applyTransform = useCallback(() => {
        const img = imgRef.current;
        if (!img) return;
        const { scale, x, y } = stateRef.current;
        img.style.transform = `translate(${x}px, ${y}px) scale(${scale})`;
    }, []);

    const clampPosition = useCallback(() => {
        const container = containerRef.current;
        const img = imgRef.current;
        if (!container || !img) return;
        const { scale } = stateRef.current;
        const cRect = container.getBoundingClientRect();
        const iw = img.naturalWidth || img.offsetWidth;
        const ih = img.naturalHeight || img.offsetHeight;
        // Compute displayed size (object-fit: contain)
        const containerAR = cRect.width / cRect.height;
        const imgAR = iw / ih;
        let dispW, dispH;
        if (imgAR > containerAR) {
            dispW = cRect.width;
            dispH = cRect.width / imgAR;
        } else {
            dispH = cRect.height;
            dispW = cRect.height * imgAR;
        }
        const scaledW = dispW * scale;
        const scaledH = dispH * scale;
        const maxX = Math.max(0, (scaledW - cRect.width) / 2);
        const maxY = Math.max(0, (scaledH - cRect.height) / 2);
        stateRef.current.x = Math.max(-maxX, Math.min(maxX, stateRef.current.x));
        stateRef.current.y = Math.max(-maxY, Math.min(maxY, stateRef.current.y));
    }, []);

    const resetZoom = useCallback(() => {
        stateRef.current = { scale: 1, x: 0, y: 0 };
        applyTransform();
    }, [applyTransform]);

    // Re-apply current transform when src changes (keep zoom state)
    useEffect(() => { applyTransform(); }, [src, applyTransform]);

    const getTouchDist = (t1, t2) => Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
    const getTouchMid = (t1, t2) => ({ x: (t1.clientX + t2.clientX) / 2, y: (t1.clientY + t2.clientY) / 2 });

    const handleTouchStart = useCallback((e) => {
        if (e.touches.length === 2) {
            e.preventDefault();
            const dist = getTouchDist(e.touches[0], e.touches[1]);
            touchRef.current = {
                startDist: dist,
                startScale: stateRef.current.scale,
                startX: stateRef.current.x,
                startY: stateRef.current.y,
                startPanX: getTouchMid(e.touches[0], e.touches[1]).x,
                startPanY: getTouchMid(e.touches[0], e.touches[1]).y,
                isPinching: true,
            };
        } else if (e.touches.length === 1 && stateRef.current.scale > 1) {
            e.preventDefault();
            touchRef.current = {
                ...touchRef.current,
                startPanX: e.touches[0].clientX,
                startPanY: e.touches[0].clientY,
                startX: stateRef.current.x,
                startY: stateRef.current.y,
                isPinching: false,
            };
        }
    }, []);

    const handleTouchMove = useCallback((e) => {
        if (e.touches.length === 2 && touchRef.current.isPinching) {
            e.preventDefault();
            const dist = getTouchDist(e.touches[0], e.touches[1]);
            const newScale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, touchRef.current.startScale * (dist / touchRef.current.startDist)));
            const mid = getTouchMid(e.touches[0], e.touches[1]);
            stateRef.current.scale = newScale;
            stateRef.current.x = touchRef.current.startX + (mid.x - touchRef.current.startPanX);
            stateRef.current.y = touchRef.current.startY + (mid.y - touchRef.current.startPanY);
            clampPosition();
            applyTransform();
        } else if (e.touches.length === 1 && stateRef.current.scale > 1 && !touchRef.current.isPinching) {
            e.preventDefault();
            stateRef.current.x = touchRef.current.startX + (e.touches[0].clientX - touchRef.current.startPanX);
            stateRef.current.y = touchRef.current.startY + (e.touches[0].clientY - touchRef.current.startPanY);
            clampPosition();
            applyTransform();
        }
    }, [applyTransform, clampPosition]);

    const handleTouchEnd = useCallback((e) => {
        if (e.touches.length < 2) {
            touchRef.current.isPinching = false;
        }
        if (e.touches.length === 0 && stateRef.current.scale <= 1) {
            resetZoom();
        }
    }, [resetZoom]);

    // Double-tap to toggle zoom
    const lastTapRef = useRef(0);
    const handleDoubleTap = useCallback((e) => {
        if (e.touches.length !== 1) return;
        const now = Date.now();
        if (now - lastTapRef.current < 300) {
            e.preventDefault();
            if (stateRef.current.scale > 1) {
                resetZoom();
            } else {
                stateRef.current.scale = 2.5;
                clampPosition();
                applyTransform();
            }
        }
        lastTapRef.current = now;
    }, [resetZoom, applyTransform, clampPosition]);

    // Attach non-passive touch listeners
    useEffect(() => {
        const el = containerRef.current;
        if (!el) return;
        const opts = { passive: false };
        el.addEventListener('touchstart', handleTouchStart, opts);
        el.addEventListener('touchmove', handleTouchMove, opts);
        el.addEventListener('touchend', handleTouchEnd);
        el.addEventListener('touchstart', handleDoubleTap, opts);
        return () => {
            el.removeEventListener('touchstart', handleTouchStart, opts);
            el.removeEventListener('touchmove', handleTouchMove, opts);
            el.removeEventListener('touchend', handleTouchEnd);
            el.removeEventListener('touchstart', handleDoubleTap, opts);
        };
    }, [handleTouchStart, handleTouchMove, handleTouchEnd, handleDoubleTap]);

    return (
        <div ref={containerRef} className="mobile-image-container">
            <img ref={imgRef} src={src} alt={alt} className="mobile-image" draggable={false} />
        </div>
    );
}

function AnnotatableImage({ src, mode, points, bboxes, onAddPoint, onAddBBox }) {
    const containerRef = useRef(null);
    const imgRef = useRef(null);
    const canvasRef = useRef(null);
    const dragRef = useRef(null);

    const getLayout = useCallback(() => {
        const c = containerRef.current;
        const img = imgRef.current;
        if (!c || !img || !img.naturalWidth) return null;
        const cw = c.clientWidth, ch = c.clientHeight;
        const iw = img.naturalWidth, ih = img.naturalHeight;
        const scale = Math.min(cw / iw, ch / ih);
        return { ox: (cw - iw * scale) / 2, oy: (ch - ih * scale) / 2, scale, iw, ih };
    }, []);

    const toImageCoords = useCallback((cx, cy) => {
        const L = getLayout();
        if (!L) return null;
        const ix = (cx - L.ox) / L.scale;
        const iy = (cy - L.oy) / L.scale;
        if (ix < 0 || iy < 0 || ix > L.iw || iy > L.ih) return null;
        return [Math.round(ix), Math.round(iy)];
    }, [getLayout]);

    const redraw = useCallback(() => {
        const canvas = canvasRef.current;
        const c = containerRef.current;
        if (!canvas || !c) return;
        const L = getLayout();
        if (!L) return;
        const dpr = window.devicePixelRatio || 1;
        canvas.width = c.clientWidth * dpr;
        canvas.height = c.clientHeight * dpr;
        const ctx = canvas.getContext('2d');
        ctx.scale(dpr, dpr);
        ctx.clearRect(0, 0, c.clientWidth, c.clientHeight);

        for (const [ix, iy] of points) {
            const cx = L.ox + ix * L.scale;
            const cy = L.oy + iy * L.scale;
            ctx.beginPath();
            ctx.arc(cx, cy, 8, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(34,197,94,0.85)';
            ctx.fill();
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 2;
            ctx.stroke();
        }

        for (const [x1, y1, x2, y2] of bboxes) {
            const cx1 = L.ox + x1 * L.scale, cy1 = L.oy + y1 * L.scale;
            const bw = (x2 - x1) * L.scale, bh = (y2 - y1) * L.scale;
            ctx.strokeStyle = 'rgba(59,130,246,0.9)';
            ctx.lineWidth = 2;
            ctx.strokeRect(cx1, cy1, bw, bh);
            ctx.fillStyle = 'rgba(59,130,246,0.15)';
            ctx.fillRect(cx1, cy1, bw, bh);
        }

        const d = dragRef.current;
        if (d && d.curX != null) {
            ctx.setLineDash([6, 3]);
            ctx.strokeStyle = 'rgba(59,130,246,0.7)';
            ctx.lineWidth = 2;
            ctx.strokeRect(d.sx, d.sy, d.curX - d.sx, d.curY - d.sy);
            ctx.setLineDash([]);
        }
    }, [points, bboxes, getLayout]);

    useEffect(() => { redraw(); }, [redraw, src]);

    useEffect(() => {
        const el = containerRef.current;
        if (!el) return;
        let sx, sy, t0;

        const onStart = (e) => {
            if (e.touches.length !== 1) return;
            e.preventDefault();
            const r = el.getBoundingClientRect();
            sx = e.touches[0].clientX - r.left;
            sy = e.touches[0].clientY - r.top;
            t0 = Date.now();
            if (mode === 'bbox') dragRef.current = { sx, sy, curX: null, curY: null };
        };
        const onMove = (e) => {
            if (e.touches.length !== 1 || mode !== 'bbox' || !dragRef.current) return;
            e.preventDefault();
            const r = el.getBoundingClientRect();
            dragRef.current.curX = e.touches[0].clientX - r.left;
            dragRef.current.curY = e.touches[0].clientY - r.top;
            redraw();
        };
        const onEnd = (e) => {
            if (!e.changedTouches[0]) return;
            const ct = e.changedTouches[0];
            const r = el.getBoundingClientRect();
            const ex = ct.clientX - r.left, ey = ct.clientY - r.top;
            if (mode === 'point') {
                if (Date.now() - t0 < 500 && Math.hypot(ex - sx, ey - sy) < 15) {
                    const pt = toImageCoords(ex, ey);
                    if (pt) onAddPoint(pt);
                }
            } else if (mode === 'bbox' && dragRef.current) {
                const d = dragRef.current;
                if (d.curX != null && Math.abs(ex - d.sx) > 10 && Math.abs(ey - d.sy) > 10) {
                    const tl = toImageCoords(Math.min(d.sx, ex), Math.min(d.sy, ey));
                    const br = toImageCoords(Math.max(d.sx, ex), Math.max(d.sy, ey));
                    if (tl && br) onAddBBox([tl[0], tl[1], br[0], br[1]]);
                }
                dragRef.current = null;
                redraw();
            }
            sx = sy = t0 = null;
        };

        const opts = { passive: false };
        el.addEventListener('touchstart', onStart, opts);
        el.addEventListener('touchmove', onMove, opts);
        el.addEventListener('touchend', onEnd);
        return () => {
            el.removeEventListener('touchstart', onStart, opts);
            el.removeEventListener('touchmove', onMove, opts);
            el.removeEventListener('touchend', onEnd);
        };
    }, [mode, toImageCoords, onAddPoint, onAddBBox, redraw]);

    return (
        <div ref={containerRef} className="mobile-image-container">
            <img ref={imgRef} src={src} alt="annotate" className="mobile-image" draggable={false} onLoad={redraw} />
            <canvas ref={canvasRef} className="mobile-annotation-canvas" />
        </div>
    );
}

export default function MobilePage() {
    // 'idle' | 'preview' | 'loading' | 'result'
    const [phase, setPhase] = useState('idle');
    const [imageFile, setImageFile] = useState(null);
    const [previewSrc, setPreviewSrc] = useState(null);
    const [resultSrc, setResultSrc] = useState(null);
    const [resultCount, setResultCount] = useState(null);
    const [showOriginal, setShowOriginal] = useState(false);
    const [countMode, setCountMode] = useState('auto'); // 'auto' | 'point' | 'bboxExemplar'
    const [points, setPoints] = useState([]);
    const [bboxes, setBboxes] = useState([]);
    const [error, setError] = useState(null);

    const fileInputRef = useRef(null);
    const prevPreviewUrl = useRef(null);
    const prevResultUrl = useRef(null);

    const cleanup = useCallback(() => {
        if (prevPreviewUrl.current) URL.revokeObjectURL(prevPreviewUrl.current);
        if (prevResultUrl.current) URL.revokeObjectURL(prevResultUrl.current);
        prevPreviewUrl.current = null;
        prevResultUrl.current = null;
    }, []);

    const handleCapture = useCallback(() => {
        fileInputRef.current?.click();
    }, []);

    const handleFileChange = useCallback((e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        cleanup();
        const url = URL.createObjectURL(file);
        prevPreviewUrl.current = url;

        setImageFile(file);
        setPreviewSrc(url);
        setResultSrc(null);
        setResultCount(null);
        setShowOriginal(false);
        setPoints([]);
        setBboxes([]);
        setError(null);
        setPhase('preview');

        e.target.value = '';
    }, [cleanup]);

    const handleRetake = useCallback(() => {
        cleanup();
        setImageFile(null);
        setPreviewSrc(null);
        setResultSrc(null);
        setResultCount(null);
        setShowOriginal(false);
        setPoints([]);
        setBboxes([]);
        setError(null);
        setPhase('idle');
    }, [cleanup]);

    const handleSubmit = useCallback(async () => {
        if (!imageFile) return;
        if (countMode === 'point' && points.length === 0) return;
        if (countMode === 'bboxExemplar' && bboxes.length === 0) return;
        setPhase('loading');
        setError(null);

        try {
            let result;
            if (countMode === 'auto') {
                result = await predictAutoImage(imageFile, THRESHOLD);
            } else if (countMode === 'point') {
                result = await predictPointImage(imageFile, points, points.map(() => 1), THRESHOLD);
            } else {
                result = await predictBBoxImage(imageFile, bboxes, THRESHOLD);
            }

            if (prevResultUrl.current) URL.revokeObjectURL(prevResultUrl.current);
            prevResultUrl.current = result.url;

            setResultSrc(result.url);
            setResultCount(result.count);
            setShowOriginal(false);
            setPhase('result');
        } catch (err) {
            setError(err.message || 'カウント処理に失敗しました。');
            setPhase('preview');
        }
    }, [imageFile, countMode, points, bboxes]);

    const handleUndo = useCallback(() => {
        if (countMode === 'point') setPoints(prev => prev.slice(0, -1));
        else if (countMode === 'bboxExemplar') setBboxes(prev => prev.slice(0, -1));
    }, [countMode]);

    const handleNext = useCallback(() => {
        cleanup();
        setImageFile(null);
        setPreviewSrc(null);
        setResultSrc(null);
        setResultCount(null);
        setShowOriginal(false);
        setPoints([]);
        setBboxes([]);
        setError(null);
        setPhase('idle');
        setTimeout(() => fileInputRef.current?.click(), 0);
    }, [cleanup]);

    return (
        <div className="mobile-page">
            <main className="mobile-main">
                <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={handleFileChange}
                    className="mobile-file-input"
                />

                {phase === 'idle' && (
                    <div className="mobile-preview">
                        <div className="mobile-image-container mobile-idle-placeholder" onClick={handleCapture}>
                            <svg viewBox="0 0 24 24" width="56" height="56" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                                <circle cx="12" cy="13" r="4" />
                            </svg>
                            <span>タップして撮影</span>
                        </div>
                        <div className="mobile-actions">
                            <button className="mobile-btn mobile-btn-primary" onClick={handleCapture}>
                                カメラで撮影
                            </button>
                        </div>
                    </div>
                )}

                {phase === 'preview' && (
                    <div className="mobile-preview">
                        {countMode === 'auto' ? (
                            <ZoomableImage src={previewSrc} alt="撮影画像" />
                        ) : (
                            <>
                                <AnnotatableImage
                                    src={previewSrc}
                                    mode={countMode === 'point' ? 'point' : 'bbox'}
                                    points={points}
                                    bboxes={bboxes}
                                    onAddPoint={(pt) => setPoints(prev => [...prev, pt])}
                                    onAddBBox={(bb) => setBboxes(prev => [...prev, bb])}
                                />
                                <div className="mobile-annotation-info">
                                    {countMode === 'point'
                                        ? `${points.length}点指定 — タップで追加`
                                        : `${bboxes.length}個指定 — ドラッグで追加`}
                                </div>
                            </>
                        )}
                        <div className="mobile-tabs">
                            <button
                                className={`mobile-tab ${countMode === 'auto' ? 'mobile-tab-active' : ''}`}
                                onClick={() => { setCountMode('auto'); setPoints([]); setBboxes([]); }}
                            >
                                そのまま送信
                            </button>
                            <button
                                className={`mobile-tab ${countMode === 'point' ? 'mobile-tab-active' : ''}`}
                                onClick={() => { setCountMode('point'); setBboxes([]); }}
                            >
                                ポイント指定
                            </button>
                            <button
                                className={`mobile-tab ${countMode === 'bboxExemplar' ? 'mobile-tab-active' : ''}`}
                                onClick={() => { setCountMode('bboxExemplar'); setPoints([]); }}
                            >
                                BBox指定
                            </button>
                        </div>
                        {error && <div className="mobile-error">{error}</div>}
                        <div className="mobile-actions">
                            {countMode !== 'auto' && (points.length > 0 || bboxes.length > 0) && (
                                <button className="mobile-btn mobile-btn-secondary" onClick={handleUndo}>
                                    取消
                                </button>
                            )}
                            <button className="mobile-btn mobile-btn-secondary" onClick={handleRetake}>
                                撮り直す
                            </button>
                            <button
                                className="mobile-btn mobile-btn-primary"
                                onClick={handleSubmit}
                                disabled={countMode === 'point' ? points.length === 0 : countMode === 'bboxExemplar' ? bboxes.length === 0 : false}
                            >
                                送信
                            </button>
                        </div>
                    </div>
                )}

                {phase === 'loading' && (
                    <div className="mobile-loading-view">
                        <div className="mobile-image-container">
                            <img src={previewSrc} alt="撮影画像" className="mobile-image" draggable={false} />
                            <div className="mobile-loading-overlay">
                                <div className="mobile-spinner" />
                                <p>カウント中...</p>
                            </div>
                        </div>
                    </div>
                )}

                {phase === 'result' && (
                    <div className="mobile-result">
                        {resultCount != null && (
                            <div className="mobile-count">
                                <span className="mobile-count-label">検出数</span>
                                <span className="mobile-count-value">{resultCount}</span>
                            </div>
                        )}
                        <ZoomableImage
                            src={showOriginal ? previewSrc : resultSrc}
                            alt={showOriginal ? '元画像' : 'カウント結果'}
                        />
                        <div className="mobile-actions">
                            <button
                                className={`mobile-btn ${showOriginal ? 'mobile-btn-toggle-active' : 'mobile-btn-toggle'}`}
                                onClick={() => setShowOriginal(v => !v)}
                            >
                                {showOriginal ? '結果を表示' : '元画像を表示'}
                            </button>
                            <button className="mobile-btn mobile-btn-primary" onClick={handleNext}>
                                次を撮影
                            </button>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}
