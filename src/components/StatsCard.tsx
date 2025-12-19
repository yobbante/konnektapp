import { motion } from "framer-motion";
import { LucideIcon } from "lucide-react";

interface StatsCardProps {
  icon: LucideIcon;
  value: string;
  label: string;
  delay?: number;
}

export function StatsCard({ icon: Icon, value, label, delay = 0 }: StatsCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, delay }}
      className="flex flex-col items-center text-center p-6"
    >
      <div className="w-14 h-14 rounded-2xl bg-secondary/10 flex items-center justify-center mb-4">
        <Icon className="w-7 h-7 text-secondary" />
      </div>
      <span className="text-3xl md:text-4xl font-bold text-foreground mb-1">{value}</span>
      <span className="text-muted-foreground">{label}</span>
    </motion.div>
  );
}
