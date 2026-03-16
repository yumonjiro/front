import { useState, useCallback, useRef } from 'react';
import StatusIndicator from '../components/StatusIndicator';
import { predictAutoImage } from '../api';
import './MobilePage.css';

const THRESHOLD = 0.1;

export default function MobilePage() {
    // 'idle' | 'preview' | 'loading' | 'result'
    const [phase, setPhase] = useState('idle');
    const [imageFile, setImageFile] = useState(null);
    const [previewSrc, setPreviewSrc] = useState(null);
    const [resultImageSrc, setResultImageSrc] = useState(null);
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
        setResultImageSrc(null);
        setError(null);
        setPhase('preview');

        // Reset input so same file can be re-selected
        e.target.value = '';
    }, [cleanup]);

    const handleRetake = useCallback(() => {
        cleanup();
        setImageFile(null);
        setPreviewSrc(null);
        setResultImageSrc(null);
        setError(null);
        setPhase('idle');
    }, [cleanup]);

    const handleSubmit = useCallback(async () => {
        if (!imageFile) return;
        setPhase('loading');
        setError(null);

        try {
            const imageUrl = await predictAutoImage(imageFile, THRESHOLD);

            if (prevResultUrl.current) URL.revokeObjectURL(prevResultUrl.current);
            prevResultUrl.current = imageUrl;

            setResultImageSrc(imageUrl);
            setPhase('result');
        } catch (err) {
            setError(err.message || 'カウント処理に失敗しました。');
            setPhase('preview');
        }
    }, [imageFile]);

    const handleNext = useCallback(() => {
        cleanup();
        setImageFile(null);
        setPreviewSrc(null);
        setResultImageSrc(null);
        setError(null);
        setPhase('idle');
    }, [cleanup]);

    return (
        <div className="mobile-page">
            <header className="mobile-header">
                <h1>カウント</h1>
                <StatusIndicator />
            </header>

            <main className="mobile-main">
                {/* Hidden native camera input */}
                <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={handleFileChange}
                    className="mobile-file-input"
                />

                {phase === 'idle' && (
                    <div className="mobile-idle">
                        <button className="mobile-capture-btn" onClick={handleCapture}>
                            <svg viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                                <circle cx="12" cy="13" r="4" />
                            </svg>
                            <span>カメラで撮影</span>
                        </button>
                    </div>
                )}

                {phase === 'preview' && (
                    <div className="mobile-preview">
                        <div className="mobile-image-container">
                            <img src={previewSrc} alt="撮影画像" className="mobile-image" />
                        </div>
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
                    <div className="mobile-loading">
                        <div className="mobile-spinner" />
                        <p>カウント中...</p>
                    </div>
                )}

                {phase === 'result' && (
                    <div className="mobile-result">
                        <div className="mobile-image-container">
                            <img src={resultImageSrc} alt="カウント結果" className="mobile-image" />
                        </div>
                        <div className="mobile-actions">
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
