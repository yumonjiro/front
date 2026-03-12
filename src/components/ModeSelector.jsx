const MODES = [
    { value: 'auto', label: 'reference-less', desc: '完全自動でカウント' },
    { value: 'point', label: 'point-exempler', desc: '対象をクリックして指定' },
    { value: 'bbox', label: 'bbox-exempler', desc: 'バウンディングボックスで指定' },
];

export default function ModeSelector({ mode, onChange, disabled }) {
    return (
        <div className="mode-selector">
            <h3>モード</h3>
            {MODES.map((m) => (
                <label key={m.value} className={`mode-option ${mode === m.value ? 'active' : ''}`}>
                    <input
                        type="radio"
                        name="mode"
                        value={m.value}
                        checked={mode === m.value}
                        onChange={() => onChange(m.value)}
                        disabled={disabled}
                    />
                    <div>
                        <span className="mode-label">{m.label}</span>
                        <span className="mode-desc">{m.desc}</span>
                    </div>
                </label>
            ))}
        </div>
    );
}
