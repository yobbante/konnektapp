import { motion, AnimatePresence } from "framer-motion";
import { X, MessageCircle, CheckCircle, AlertTriangle, Info, Bell, Package, Truck } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

export interface EnhancedToastProps {
  id: string;
  type: "success" | "error" | "warning" | "info" | "message" | "order";
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  link?: string;
  duration?: number;
  onDismiss: (id: string) => void;
  senderName?: string;
  senderAvatar?: string;
}

const iconMap = {
  success: CheckCircle,
  error: AlertTriangle,
  warning: AlertTriangle,
  info: Info,
  message: MessageCircle,
  order: Package,
};

const colorMap = {
  success: "from-emerald-500 to-green-600",
  error: "from-red-500 to-rose-600",
  warning: "from-amber-500 to-orange-600",
  info: "from-blue-500 to-indigo-600",
  message: "from-primary to-accent",
  order: "from-violet-500 to-purple-600",
};

const bgColorMap = {
  success: "bg-emerald-500/10 border-emerald-500/30",
  error: "bg-red-500/10 border-red-500/30",
  warning: "bg-amber-500/10 border-amber-500/30",
  info: "bg-blue-500/10 border-blue-500/30",
  message: "bg-primary/10 border-primary/30",
  order: "bg-violet-500/10 border-violet-500/30",
};

export function EnhancedToast({
  id,
  type,
  title,
  description,
  action,
  link,
  duration = 6000,
  onDismiss,
  senderName,
  senderAvatar,
}: EnhancedToastProps) {
  const navigate = useNavigate();
  const [progress, setProgress] = useState(100);
  const Icon = iconMap[type];

  useEffect(() => {
    const interval = setInterval(() => {
      setProgress((prev) => {
        const newProgress = prev - (100 / (duration / 100));
        if (newProgress <= 0) {
          clearInterval(interval);
          setTimeout(() => onDismiss(id), 200);
          return 0;
        }
        return newProgress;
      });
    }, 100);

    return () => clearInterval(interval);
  }, [duration, id, onDismiss]);

  const handleClick = () => {
    if (link) {
      navigate(link);
      onDismiss(id);
    } else if (action) {
      action.onClick();
      onDismiss(id);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -20, scale: 0.95, filter: "blur(4px)" }}
      animate={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
      exit={{ opacity: 0, y: -12, scale: 0.97, filter: "blur(2px)" }}
      transition={{ 
        duration: 0.4, 
        ease: [0.25, 0.46, 0.45, 0.94],
      }}
      className={`relative w-full max-w-sm overflow-hidden rounded-xl border backdrop-blur-xl shadow-2xl ${bgColorMap[type]} ${
        link || action ? "cursor-pointer hover:scale-[1.02] transition-transform" : ""
      }`}
      onClick={handleClick}
    >
      {/* Gradient border effect */}
      <div className={`absolute inset-0 opacity-20 bg-gradient-to-r ${colorMap[type]}`} />
      
      <div className="relative p-4">
        <div className="flex items-start gap-3">
          {/* Icon or Avatar */}
          {type === "message" && senderAvatar ? (
            <div className="relative">
              <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center overflow-hidden">
                {senderAvatar.startsWith("http") ? (
                  <img src={senderAvatar} alt={senderName} className="w-full h-full object-cover" />
                ) : (
                  <span className="font-semibold text-primary">{senderAvatar}</span>
                )}
              </div>
              <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-background" />
            </div>
          ) : (
            <div className={`w-10 h-10 rounded-full flex items-center justify-center bg-gradient-to-br ${colorMap[type]}`}>
              <Icon className="w-5 h-5 text-white" />
            </div>
          )}

          <div className="flex-1 min-w-0">
            {type === "message" && senderName && (
              <p className="text-xs text-muted-foreground mb-0.5">{senderName}</p>
            )}
            <p className="font-semibold text-sm text-foreground">{title}</p>
            {description && (
              <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{description}</p>
            )}
            {(link || action) && (
              <p className="text-xs text-primary mt-1 font-medium">
                {action?.label || "Voir plus →"}
              </p>
            )}
          </div>

          <button
            onClick={(e) => {
              e.stopPropagation();
              onDismiss(id);
            }}
            className="p-1 rounded-full hover:bg-foreground/10 transition-colors"
          >
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>
      </div>

      {/* Progress bar */}
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-foreground/10">
        <motion.div
          className={`h-full bg-gradient-to-r ${colorMap[type]}`}
          initial={{ width: "100%" }}
          animate={{ width: `${progress}%` }}
          transition={{ ease: "linear" }}
        />
      </div>
    </motion.div>
  );
}

// Toast container that manages multiple toasts
export function EnhancedToastContainer() {
  const [toasts, setToasts] = useState<EnhancedToastProps[]>([]);

  const dismiss = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Expose add function globally
  useEffect(() => {
    (window as any).showEnhancedToast = (toast: Omit<EnhancedToastProps, "id" | "onDismiss">) => {
      const id = `toast-${Date.now()}-${Math.random().toString(36).substring(7)}`;
      setToasts((prev) => [...prev.slice(-2), { ...toast, id, onDismiss: dismiss }]);
    };

    return () => {
      delete (window as any).showEnhancedToast;
    };
  }, []);

  return (
    <div className="fixed top-4 right-4 left-4 md:left-auto md:w-96 z-[100] flex flex-col gap-3 pointer-events-none">
      <AnimatePresence>
        {toasts.map((toast) => (
          <div key={toast.id} className="pointer-events-auto">
            <EnhancedToast {...toast} onDismiss={dismiss} />
          </div>
        ))}
      </AnimatePresence>
    </div>
  );
}

// Helper function to show toasts
export function showEnhancedToast(toast: Omit<EnhancedToastProps, "id" | "onDismiss">) {
  if ((window as any).showEnhancedToast) {
    (window as any).showEnhancedToast(toast);
  }
}
