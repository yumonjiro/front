export default function ThresholdSlider({ value, onChange, disabled }) {
    return (
        <div className="threshold-slider">
            <h3>検出閾値</h3>
            <div className="slider-row">
                <input
                    type="range"
                    min="0.05"
                    max="0.95"
                    step="0.01"
                    value={value}
                    onChange={(e) => onChange(parseFloat(e.target.value))}
                    disabled={disabled}
                />
                <span className="slider-value">{value.toFixed(2)}</span>
            </div>
        </div>
    );
}
