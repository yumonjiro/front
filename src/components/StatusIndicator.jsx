import { useEffect, useState, useRef } from 'react';
import { checkHealth } from '../api';

export default function StatusIndicator() {
    const [status, setStatus] = useState('checking');
    const intervalRef = useRef(null);

    useEffect(() => {
        const poll = async () => {
            try {
                await checkHealth();
                setStatus('connected');
            } catch {
                setStatus('error');
            }
        };

        poll();
        intervalRef.current = setInterval(poll, 30000);
        return () => clearInterval(intervalRef.current);
    }, []);

    const label = {
        connected: 'API 接続中',
        error: 'API 未接続',
        checking: '確認中...',
    }[status];

    return (
        <div className={`status-indicator status-${status}`}>
            <span className="status-dot" />
            <span className="status-label">{label}</span>
        </div>
    );
}
