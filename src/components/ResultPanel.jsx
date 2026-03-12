export default function ResultPanel({ resultCount, resultBoxes }) {
    if (resultCount === null) return null;

    return (
        <div className="result-panel">
            <h3>検出結果</h3>
            <div className="result-count">
                <span className="count-number">{resultCount}</span>
                <span className="count-label">objects detected</span>
            </div>
            {resultBoxes && resultBoxes.length > 0 && (
                <details className="result-boxes">
                    <summary>検出 BBox 一覧 ({resultBoxes.length})</summary>
                    <div className="bbox-list">
                        <table>
                            <thead>
                                <tr><th>#</th><th>x1</th><th>y1</th><th>x2</th><th>y2</th></tr>
                            </thead>
                            <tbody>
                                {resultBoxes.map((box, i) => (
                                    <tr key={i}>
                                        <td>{i + 1}</td>
                                        <td>{Math.round(box[0])}</td>
                                        <td>{Math.round(box[1])}</td>
                                        <td>{Math.round(box[2])}</td>
                                        <td>{Math.round(box[3])}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </details>
            )}
        </div>
    );
}
