import { createContext, useContext, useState, useCallback } from 'react';
import { CheckIcon, CloseIcon, ShieldIcon } from './Icons';

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((message, type = 'info', duration = 3000) => {
    const id = Date.now() + Math.random().toString(36).slice(2, 7);
    setToasts((prev) => [...prev, { id, message, type }]);

    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, duration);
  }, []);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ addToast, removeToast }}>
      {children}
      <div className="toast-container" style={{
        position: 'fixed',
        bottom: '20px',
        right: '20px',
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        pointerEvents: 'none'
      }}>
        {toasts.map((toast) => {
          const iconColor =
            toast.type === 'error'
              ? 'var(--danger)'
              : toast.type === 'success'
              ? 'var(--success)'
              : 'var(--text-secondary)';

          const borderColor =
            toast.type === 'error'
              ? 'var(--danger-border)'
              : toast.type === 'success'
              ? 'var(--success-border)'
              : 'var(--border-default)';

          return (
            <div
              key={toast.id}
              className={`toast-item toast-${toast.type} animate-fade-in`}
              style={{
                pointerEvents: 'auto',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '10px 14px',
                background: 'var(--bg-card)',
                border: `1px solid ${borderColor}`,
                borderRadius: 'var(--radius-md)',
                boxShadow: 'var(--shadow-md)',
                color: 'var(--text-primary)',
                fontSize: '13.5px',
                fontWeight: '500',
                maxWidth: '360px',
                animation: 'fadeIn 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
              }}
            >
              <span style={{ color: iconColor, display: 'flex', alignItems: 'center', flexShrink: 0 }}>
                {toast.type === 'success' ? <CheckIcon size={15} /> : <ShieldIcon size={15} />}
              </span>
              <span style={{ flex: 1, lineHeight: 1.4 }}>{toast.message}</span>
              <button
                type="button"
                onClick={() => removeToast(toast.id)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                  display: 'flex',
                  padding: '2px',
                  flexShrink: 0,
                }}
                aria-label="Dismiss notification"
              >
                <CloseIcon size={13} />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    return {
      addToast: () => {},
      removeToast: () => {}
    };
  }
  return context;
}
