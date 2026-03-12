import { useCallback, useState, useRef } from 'react';

export default function ImageDropZone({ onImageSelect, disabled }) {
    const [dragOver, setDragOver] = useState(false);
    const inputRef = useRef(null);

    const processFile = useCallback((file) => {
        if (!file) return;
        if (!file.type.match(/^image\/(jpeg|png)$/)) {
            alert('JPEG または PNG 画像のみ対応しています。');
            return;
        }
        const img = new Image();
        const url = URL.createObjectURL(file);
        img.onload = () => {
            if (img.naturalWidth > 4096 || img.naturalHeight > 4096) {
                alert(`画像サイズが大きすぎます (${img.naturalWidth}×${img.naturalHeight})。4096×4096 以下を推奨します。`);
            }
            onImageSelect(file, url);
        };
        img.src = url;
    }, [onImageSelect]);

    const handleDrop = useCallback((e) => {
        e.preventDefault();
        setDragOver(false);
        const file = e.dataTransfer.files[0];
        processFile(file);
    }, [processFile]);

    const handleDragOver = useCallback((e) => {
        e.preventDefault();
        setDragOver(true);
    }, []);

    const handleDragLeave = useCallback(() => {
        setDragOver(false);
    }, []);

    const handleFileChange = useCallback((e) => {
        processFile(e.target.files[0]);
        e.target.value = '';
    }, [processFile]);

    return (
        <div
            className={`drop-zone ${dragOver ? 'drag-over' : ''}`}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onClick={() => !disabled && inputRef.current?.click()}
        >
            <input
                ref={inputRef}
                type="file"
                accept="image/jpeg,image/png"
                onChange={handleFileChange}
                style={{ display: 'none' }}
                disabled={disabled}
            />
            <div className="drop-zone-content">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12" />
                </svg>
                <p>画像をドラッグ＆ドロップ</p>
                <p className="drop-zone-sub">またはクリックしてファイルを選択</p>
                <p className="drop-zone-sub">JPEG / PNG 対応</p>
            </div>
        </div>
    );
}
