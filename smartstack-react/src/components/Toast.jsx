import { useEffect, useState } from 'react';
import { CheckCircle, AlertCircle, X, Info } from 'lucide-react';
import './Toast.css';

export function ToastContainer({ toasts, removeToast }) {
    return (
        <div className="toast-container">
            {toasts.map(toast => (
                <ToastItem key={toast.id} toast={toast} onClose={() => removeToast(toast.id)} />
            ))}
        </div>
    );
}

function ToastItem({ toast, onClose }) {
    const [exiting, setExiting] = useState(false);

    useEffect(() => {
        const timer = setTimeout(() => {
            setExiting(true);
            setTimeout(onClose, 300);
        }, toast.duration || 3000);
        return () => clearTimeout(timer);
    }, []);

    const icons = {
        success: <CheckCircle size={18} />,
        error: <AlertCircle size={18} />,
        info: <Info size={18} />
    };

    return (
        <div className={`toast-item ${toast.type} ${exiting ? 'exit' : ''}`}>
            <span className="toast-icon">{icons[toast.type] || icons.info}</span>
            <span className="toast-message">{toast.message}</span>
            <button className="toast-close" onClick={() => { setExiting(true); setTimeout(onClose, 300); }}>
                <X size={14} />
            </button>
        </div>
    );
}
