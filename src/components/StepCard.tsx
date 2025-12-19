import { motion } from "framer-motion";
import { LucideIcon } from "lucide-react";

interface StepCardProps {
  step: number;
  icon: LucideIcon;
  title: string;
  description: string;
  delay?: number;
}

export function StepCard({ step, icon: Icon, title, description, delay = 0 }: StepCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, delay }}
      className="relative flex flex-col items-center text-center"
    >
      {/* Step Number */}
      <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-8 h-8 rounded-full bg-secondary text-secondary-foreground font-bold text-sm flex items-center justify-center shadow-md z-10">
        {step}
      </div>
      
      {/* Card */}
      <div className="pt-8 p-6 rounded-2xl bg-card border border-border shadow-card w-full">
        <div className="w-16 h-16 rounded-2xl bg-gold-gradient flex items-center justify-center mx-auto mb-4 shadow-md">
          <Icon className="w-8 h-8 text-primary" />
        </div>
        <h3 className="font-semibold text-lg text-foreground mb-2">{title}</h3>
        <p className="text-muted-foreground text-sm leading-relaxed">{description}</p>
      </div>
    </motion.div>
  );
}
