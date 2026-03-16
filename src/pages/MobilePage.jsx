import { useState, useCallback, useRef, useEffect } from 'react';
import { predictAutoImage, predictAutoDots } from '../api';
import './MobilePage.css';

const THRESHOLD = 0.1;
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

export default function MobilePage() {
    // 'idle' | 'preview' | 'loading' | 'result'
    const [phase, setPhase] = useState('idle');
    const [imageFile, setImageFile] = useState(null);
    const [previewSrc, setPreviewSrc] = useState(null);
    const [resultSrc, setResultSrc] = useState(null);
    const [resultCount, setResultCount] = useState(null);
    const [showOriginal, setShowOriginal] = useState(false);
    const [displayMode, setDisplayMode] = useState('dots'); // 'dots' | 'bbox'
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
        setError(null);
        setPhase('idle');
    }, [cleanup]);

    const handleSubmit = useCallback(async () => {
        if (!imageFile) return;
        setPhase('loading');
        setError(null);

        try {
            const predict = displayMode === 'dots' ? predictAutoDots : predictAutoImage;
            const result = await predict(imageFile, THRESHOLD);

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
    }, [imageFile, displayMode]);

    const handleNext = useCallback(() => {
        cleanup();
        setImageFile(null);
        setPreviewSrc(null);
        setResultSrc(null);
        setResultCount(null);
        setShowOriginal(false);
        setError(null);
        setPhase('idle');
        // Immediately open camera for next shot
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
                        <div className="mobile-tabs">
                            <button
                                className={`mobile-tab ${displayMode === 'dots' ? 'mobile-tab-active' : ''}`}
                                onClick={() => setDisplayMode('dots')}
                            >
                                ドット
                            </button>
                            <button
                                className={`mobile-tab ${displayMode === 'bbox' ? 'mobile-tab-active' : ''}`}
                                onClick={() => setDisplayMode('bbox')}
                            >
                                BBox
                            </button>
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
                        <ZoomableImage src={previewSrc} alt="撮影画像" />
                        {error && <div className="mobile-error">{error}</div>}
                        <div className="mobile-actions">
                            <button className="mobile-btn mobile-btn-secondary" onClick={handleRetake}>
                                撮り直す
                            </button>
                            <button className="mobile-btn mobile-btn-primary" onClick={handleSubmit}>
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
