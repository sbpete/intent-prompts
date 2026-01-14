import { useEffect, useState } from "react";
import { Check } from "lucide-react";

/**
 * Props for the Toast component
 */
export interface ToastProps {
  message: string;
  duration?: number;
  onClose: () => void;
}

/**
 * Toast Notification Component
 *
 * A subtle, temporary notification that appears briefly and fades away.
 * Used for non-critical feedback like successful operations.
 */
export const Toast: React.FC<ToastProps> = ({
  message,
  duration = 3000,
  onClose,
}) => {
  const [isVisible, setIsVisible] = useState(true);
  const [isLeaving, setIsLeaving] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLeaving(true);
      setTimeout(() => {
        setIsVisible(false);
        onClose();
      }, 300); // Match transition duration
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onClose]);

  if (!isVisible) return null;

  return (
    <div
      className={`fixed top-6 right-6 z-50 transition-all duration-300 ease-out ${
        isLeaving
          ? "opacity-0 translate-y-[-10px] pointer-events-none"
          : "opacity-100 translate-y-0"
      }`}
    >
      <div className="bg-white/95 backdrop-blur-sm border border-white/20 rounded-xl shadow-lg px-4 py-3 flex items-center gap-3 min-w-[280px] max-w-md">
        <div className="flex-shrink-0 w-5 h-5 rounded-full bg-gradient-to-r from-green-400 to-emerald-500 flex items-center justify-center">
          <Check className="w-3 h-3 text-white" strokeWidth={2.5} />
        </div>
        <p className="text-sm font-light text-gray-900 flex-1">{message}</p>
      </div>
    </div>
  );
};
