import { X, CheckCircle2, XCircle, Info, Plus } from 'lucide-react';
import { Toast as ToastType } from '../hooks/useCommandExecutor';
import { useCartStore } from '../store/useCartStore';
import { clsx } from 'clsx';

interface Props {
  toasts: ToastType[];
  onDismiss: (id: string) => void;
}

export default function ToastStack({ toasts, onDismiss }: Props) {
  const addItem = useCartStore(s => s.addItem);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-20 md:bottom-6 left-4 right-4 md:left-auto md:right-6 md:w-96 z-[60] flex flex-col gap-2">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={clsx(
            "rounded-lg p-4 shadow-card border animate-slide-up",
            toast.type === 'success' && "bg-emerald-50 border-emerald-200 text-emerald-800",
            toast.type === 'error' && "bg-red-50 border-red-200 text-red-800",
            toast.type === 'info' && "bg-blue-50 border-blue-200 text-blue-800",
            toast.type === 'substitutes' && "bg-white border-neutral-200 text-neutral-800",
          )}
        >
          <div className="flex items-start gap-2.5">
            <div className="mt-0.5">
              {toast.type === 'success' && <CheckCircle2 size={18} />}
              {toast.type === 'error' && <XCircle size={18} />}
              {toast.type === 'info' && <Info size={18} />}
              {toast.type === 'substitutes' && <Info size={18} className="text-brand-500" />}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium">{toast.message}</p>
              {toast.type === 'substitutes' && toast.substitutes && (
                <div className="mt-3 space-y-2">
                  {toast.substitutes.map(sub => (
                    <div key={sub.id} className="flex items-center justify-between bg-neutral-50 rounded-lg p-2.5 border border-neutral-100">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-neutral-900 truncate">{sub.name}</p>
                        <p className="text-[10px] text-neutral-500">{sub.brand} · ₹{sub.price}</p>
                      </div>
                      <button
                        onClick={() => addItem(sub)}
                        className="ml-2 w-7 h-7 bg-brand-50 text-brand-600 rounded-lg flex items-center justify-center hover:bg-brand-600 hover:text-white transition-colors flex-shrink-0"
                      >
                        <Plus size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <button onClick={() => onDismiss(toast.id)} className="text-current opacity-40 hover:opacity-100 transition-opacity flex-shrink-0">
              <X size={16} />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
