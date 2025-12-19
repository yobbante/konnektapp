import { motion } from "framer-motion";
import { Star, Quote } from "lucide-react";

interface TestimonialCardProps {
  name: string;
  role: string;
  content: string;
  rating: number;
  avatar?: string;
  delay?: number;
}

export function TestimonialCard({ name, role, content, rating, avatar, delay = 0 }: TestimonialCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, delay }}
      className="relative p-6 rounded-2xl bg-card border border-border shadow-card"
    >
      <Quote className="absolute top-6 right-6 w-8 h-8 text-secondary/20" />
      
      <div className="flex items-center gap-1 mb-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <Star
            key={i}
            className={`w-4 h-4 ${i < rating ? "text-secondary fill-secondary" : "text-muted"}`}
          />
        ))}
      </div>
      
      <p className="text-foreground mb-6 leading-relaxed">{content}</p>
      
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-full bg-gold-gradient flex items-center justify-center text-primary font-bold">
          {avatar ? (
            <img src={avatar} alt={name} className="w-full h-full rounded-full object-cover" />
          ) : (
            name.charAt(0)
          )}
        </div>
        <div>
          <p className="font-semibold text-foreground">{name}</p>
          <p className="text-sm text-muted-foreground">{role}</p>
        </div>
      </div>
    </motion.div>
  );
}
