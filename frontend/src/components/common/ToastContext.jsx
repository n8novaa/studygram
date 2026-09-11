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
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`toast-item toast-${toast.type} animate-fade-in`}
            style={{
              pointerEvents: 'auto',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '10px 14px',
              background: '#ffffff',
              border: '1px solid #dfdfdc',
              borderRadius: '8px',
              boxShadow: '0 4px 16px rgba(15, 15, 15, 0.1), 0 1px 3px rgba(15, 15, 15, 0.05)',
              color: '#37352f',
              fontSize: '13.5px',
              fontWeight: '500',
              maxWidth: '360px'
            }}
          >
            <span style={{
              color: toast.type === 'error' ? '#c5221f' : toast.type === 'success' ? '#137333' : '#2383e2',
              display: 'flex',
              alignItems: 'center'
            }}>
              {toast.type === 'success' ? <CheckIcon size={15} /> : <ShieldIcon size={15} />}
            </span>
            <span style={{ flex: 1, lineHeight: 1.4 }}>{toast.message}</span>
            <button
              type="button"
              onClick={() => removeToast(toast.id)}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#9b9a97',
                cursor: 'pointer',
                display: 'flex',
                padding: '2px'
              }}
            >
              <CloseIcon size={13} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

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
