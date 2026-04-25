import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, ShieldAlert, X } from 'lucide-react';

export default function Toast({ message, type = 'success', onClose }) {
  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(onClose, 4000);
    return () => clearTimeout(timer);
  }, [message, onClose]);

  const isSuccess = type === 'success';

  return (
    <AnimatePresence>
      {message && (
        <motion.div 
          key="toast"
          initial={{ opacity: 0, y: 50, scale: 0.9, x: "-50%" }}
          animate={{ opacity: 1, y: 0, scale: 1, x: "-50%" }}
          exit={{ opacity: 0, y: 20, scale: 0.9, x: "-50%" }}
          transition={{ type: "spring", bounce: 0.35, duration: 0.5 }}
          className="fixed bottom-6 left-1/2 z-[100] w-max max-w-[90vw]"
        >
          <div className={`flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-2xl backdrop-blur-md border border-white/20 text-sm font-bold tracking-wide
            ${isSuccess ? 'bg-emerald-600/95 text-white shadow-emerald-900/30' : 'bg-red-600/95 text-white shadow-red-900/30'}`}>
            {isSuccess ? <CheckCircle2 className="w-5 h-5 opacity-90" /> : <ShieldAlert className="w-5 h-5 opacity-90" />}
            <span className="flex-1">{message}</span>
            <button onClick={onClose} className="p-1 hover:bg-white/20 rounded-full transition-colors ml-2">
              <X className="w-4 h-4 opacity-80" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
