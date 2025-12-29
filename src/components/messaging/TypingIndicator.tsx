import { motion } from "framer-motion";

interface TypingIndicatorProps {
  contactName?: string;
}

export function TypingIndicator({ contactName }: TypingIndicatorProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 10 }}
      className="flex items-center gap-2 px-4 py-2"
    >
      <div className="flex items-center gap-1 bg-muted rounded-2xl px-4 py-3">
        <div className="flex gap-1">
          <motion.span
            className="w-2 h-2 bg-muted-foreground/60 rounded-full"
            animate={{ y: [0, -4, 0] }}
            transition={{ duration: 0.6, repeat: Infinity, delay: 0 }}
          />
          <motion.span
            className="w-2 h-2 bg-muted-foreground/60 rounded-full"
            animate={{ y: [0, -4, 0] }}
            transition={{ duration: 0.6, repeat: Infinity, delay: 0.15 }}
          />
          <motion.span
            className="w-2 h-2 bg-muted-foreground/60 rounded-full"
            animate={{ y: [0, -4, 0] }}
            transition={{ duration: 0.6, repeat: Infinity, delay: 0.3 }}
          />
        </div>
      </div>
      <span className="text-xs text-muted-foreground">
        {contactName ? `${contactName} écrit...` : "En train d'écrire..."}
      </span>
    </motion.div>
  );
}
