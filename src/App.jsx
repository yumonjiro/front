import { useState, useCallback, useRef } from 'react';
import ImageDropZone from './components/ImageDropZone';
import ImageCanvas from './components/ImageCanvas';
import ModeSelector from './components/ModeSelector';
import ThresholdSlider from './components/ThresholdSlider';
import ResultPanel from './components/ResultPanel';
import StatusIndicator from './components/StatusIndicator';
import {
  predictAuto,
  predictAutoImage,
  predictPointJson,
  predictPointImage,
  predictBBoxJson,
  predictBBoxImage,
  fetchDensityMap,
} from './api';
import './App.css';

export default function App() {
  const [mode, setMode] = useState('auto');
  const [imageFile, setImageFile] = useState(null);
  const [imageSrc, setImageSrc] = useState(null);
  const [points, setPoints] = useState([]);
  const [labels, setLabels] = useState([]);
  const [bboxes, setBboxes] = useState([]);
  const [threshold, setThreshold] = useState(0.33);
  const [resultImageSrc, setResultImageSrc] = useState(null);
  const [resultCount, setResultCount] = useState(null);
  const [resultBoxes, setResultBoxes] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [densityMapSrc, setDensityMapSrc] = useState(null);
  const prevDensityUrl = useRef(null);

  // Track object URLs to revoke on cleanup
  const prevResultUrl = useRef(null);
  const prevImageUrl = useRef(null);

  const handleImageSelect = useCallback((file, url) => {
    if (prevImageUrl.current) URL.revokeObjectURL(prevImageUrl.current);
    if (prevResultUrl.current) URL.revokeObjectURL(prevResultUrl.current);
    prevImageUrl.current = url;
    prevResultUrl.current = null;

    setImageFile(file);
    setImageSrc(url);
    setPoints([]);
    setLabels([]);
    setBboxes([]);
    setResultImageSrc(null);
    setResultCount(null);
    setResultBoxes([]);
    setError(null);
    if (prevDensityUrl.current) URL.revokeObjectURL(prevDensityUrl.current);
    prevDensityUrl.current = null;
    setDensityMapSrc(null);
  }, []);

  const handleModeChange = useCallback((newMode) => {
    setMode(newMode);
    setPoints([]);
    setLabels([]);
    setBboxes([]);
    if (prevResultUrl.current) URL.revokeObjectURL(prevResultUrl.current);
    prevResultUrl.current = null;
    setResultImageSrc(null);
    setResultCount(null);
    setResultBoxes([]);
    setError(null);
    if (prevDensityUrl.current) URL.revokeObjectURL(prevDensityUrl.current);
    prevDensityUrl.current = null;
    setDensityMapSrc(null);
  }, []);

  const handleAddPoint = useCallback((point, label) => {
    setPoints((prev) => [...prev, point]);
    setLabels((prev) => [...prev, label]);
  }, []);

  const handleAddBBox = useCallback((bbox) => {
    setBboxes((prev) => [...prev, bbox]);
  }, []);

  const handleReset = useCallback(() => {
    setPoints([]);
    setLabels([]);
    setBboxes([]);
    if (prevResultUrl.current) URL.revokeObjectURL(prevResultUrl.current);
    prevResultUrl.current = null;
    setResultImageSrc(null);
    setResultCount(null);
    setResultBoxes([]);
    setError(null);
    if (prevDensityUrl.current) URL.revokeObjectURL(prevDensityUrl.current);
    prevDensityUrl.current = null;
    setDensityMapSrc(null);
  }, []);

  const handleDensityMap = useCallback(async () => {
    if (!imageFile) return;
    setIsLoading(true);
    setError(null);
    try {
      const url = await fetchDensityMap(imageFile);
      if (prevDensityUrl.current) URL.revokeObjectURL(prevDensityUrl.current);
      prevDensityUrl.current = url;
      setDensityMapSrc(url);
    } catch (err) {
      setError(err.message || '密度マップの取得に失敗しました。');
    } finally {
      setIsLoading(false);
    }
  }, [imageFile]);

  const handleExecute = useCallback(async () => {
    if (!imageFile) return;
    setIsLoading(true);
    setError(null);

    try {
      let jsonResult, imageResult;

      if (mode === 'auto') {
        [jsonResult, imageResult] = await Promise.all([
          predictAuto(imageFile, threshold),
          predictAutoImage(imageFile, threshold),
        ]);
      } else if (mode === 'point') {
        if (points.length === 0) {
          setError('画像上でポイントを指定してください。');
          setIsLoading(false);
          return;
        }
        [jsonResult, imageResult] = await Promise.all([
          predictPointJson(imageFile, points, labels, threshold),
          predictPointImage(imageFile, points, labels, threshold),
        ]);
      } else if (mode === 'bbox') {
        if (bboxes.length === 0) {
          setError('画像上でバウンディングボックスを描画してください。');
          setIsLoading(false);
          return;
        }
        [jsonResult, imageResult] = await Promise.all([
          predictBBoxJson(imageFile, bboxes, threshold),
          predictBBoxImage(imageFile, bboxes, threshold),
        ]);
      }

      if (prevResultUrl.current) URL.revokeObjectURL(prevResultUrl.current);
      prevResultUrl.current = imageResult.url;

      setResultImageSrc(imageResult.url);
      setResultCount(jsonResult.count);
      setResultBoxes(jsonResult.pred_boxes || []);
    } catch (err) {
      setError(err.message || 'API エラーが発生しました。');
    } finally {
      setIsLoading(false);
    }
  }, [imageFile, mode, points, labels, bboxes, threshold]);

  const handleDownload = useCallback(() => {
    if (!resultImageSrc) return;
    const a = document.createElement('a');
    a.href = resultImageSrc;
    a.download = `geco2_result_${Date.now()}.png`;
    a.click();
  }, [resultImageSrc]);

  const canExecute = imageFile && !isLoading;
  const hasAnnotations = points.length > 0 || bboxes.length > 0;

  return (
    <div className="app">
      <header className="app-header">
        <h1></h1>
        <StatusIndicator />
      </header>

      <div className="app-body">
        <aside className="sidebar">
          <ModeSelector mode={mode} onChange={handleModeChange} disabled={isLoading} />
          <ThresholdSlider value={threshold} onChange={setThreshold} disabled={isLoading} />

          {resultCount !== null && (
            <div className="sidebar-result">
              <h3>カウント結果</h3>
              <div className="sidebar-count">{resultCount}</div>
            </div>
          )}

          <div className="sidebar-actions">
            <button
              className="btn btn-primary"
              onClick={handleExecute}
              disabled={!canExecute}
            >
              {isLoading ? '処理中...' : '実行'}
            </button>

            {(hasAnnotations || resultImageSrc) && (
              <button
                className="btn btn-secondary"
                onClick={handleReset}
                disabled={isLoading}
              >
                リセット
              </button>
            )}

            {resultImageSrc && (
              <button
                className="btn btn-download"
                onClick={handleDownload}
              >
                結果画像をダウンロード
              </button>
            )}

            <button
              className="btn btn-density"
              onClick={handleDensityMap}
              disabled={!canExecute}
            >
              {densityMapSrc ? '密度マップ更新' : '密度マップ表示'}
            </button>
          </div>
        </aside>

        <main className="main-area">
          {!imageSrc ? (
            <ImageDropZone onImageSelect={handleImageSelect} disabled={isLoading} />
          ) : (
            <>
              <div className="canvas-wrapper">
                <ImageCanvas
                  imageSrc={imageSrc}
                  resultImageSrc={resultImageSrc}
                  mode={mode}
                  points={points}
                  labels={labels}
                  bboxes={bboxes}
                  onAddPoint={handleAddPoint}
                  onAddBBox={handleAddBBox}
                />
                {isLoading && (
                  <div className="loading-overlay">
                    <div className="spinner" />
                    <p>処理中...</p>
                  </div>
                )}
              </div>

              <div className="main-toolbar">
                <button
                  className="btn btn-sm"
                  onClick={() => {
                    handleReset();
                    if (prevImageUrl.current) URL.revokeObjectURL(prevImageUrl.current);
                    prevImageUrl.current = null;
                    setImageFile(null);
                    setImageSrc(null);
                  }}
                >
                  別の画像を使用
                </button>

                {mode !== 'auto' && !resultImageSrc && (
                  <span className="annotation-hint">
                    {mode === 'point'
                      ? `左クリック: 対象指定 (${points.length}点)　右クリック: 背景指定`
                      : `ドラッグで矩形を描画 (${bboxes.length}個)`
                    }
                  </span>
                )}
              </div>

              {error && <div className="error-message">{error}</div>}

              {densityMapSrc && (
                <div className="density-map-panel">
                  <h3>密度マップ</h3>
                  <img src={densityMapSrc} alt="Density Map" className="density-map-img" />
                </div>
              )}

              <ResultPanel resultCount={resultCount} resultBoxes={resultBoxes} />
            </>
          )}
        </main>
      </div>
    </div>
  );
}
