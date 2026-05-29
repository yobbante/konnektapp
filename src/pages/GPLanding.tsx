import { useEffect } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { ArrowRight, CheckCircle, Users, Globe } from "lucide-react";
import { useUserRole } from "@/hooks/useUserRole";

const NAVY = "#0D1B2A";
const GREEN = "#3DAA8A";

const features = [
  "Inscription gratuite en 3 minutes",
  "Missions Yobbanté et bien plus",
  "Paiement Wave ou Orange Money",
  "Bot WhatsApp + dashboard web",
];

const stats = [
  { icon: Users, value: "20+", label: "transporteurs actifs" },
  { icon: Globe, value: "25", label: "pays" },
];

export default function GPLanding() {
  const navigate = useNavigate();
  const { isGP } = useUserRole();

  // Rediriger les transporteurs déjà inscrits vers leur dashboard
  useEffect(() => {
    if (isGP) {
      navigate("/gp/dashboard", { replace: true });
    }
  }, [isGP, navigate]);

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: NAVY }}>
      <Helmet>
        <title>Rejoignez le réseau Konnekt — Transporteurs</title>
        <meta
          name="description"
          content="Gérez vos missions de transport partout dans le monde. Inscription gratuite, paiement Wave ou Orange Money, dashboard web et bot WhatsApp."
        />
        <link rel="canonical" href="https://usekonnekt.com/gp" />
        <meta property="og:title" content="Rejoignez le réseau Konnekt" />
        <meta property="og:url" content="https://usekonnekt.com/gp" />
      </Helmet>

      <main className="flex-1 flex flex-col justify-center px-6 py-16">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="w-full max-w-xl mx-auto"
        >
          {/* Badge */}
          <span
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold mb-6"
            style={{ backgroundColor: "rgba(61,170,138,0.15)", color: GREEN }}
          >
            <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: GREEN }} />
            Réseau transporteurs
          </span>

          {/* Titres */}
          <h1 className="text-3xl sm:text-4xl font-black text-white leading-tight mb-3">
            Rejoignez le réseau Konnekt.
          </h1>
          <h2 className="text-lg sm:text-xl font-medium text-white/80 mb-8">
            Gérez vos missions de transport, partout dans le monde.
          </h2>

          {/* Features */}
          <ul className="space-y-3 mb-8">
            {features.map((item) => (
              <li key={item} className="flex items-center gap-3">
                <CheckCircle
                  className="w-5 h-5 flex-shrink-0"
                  style={{ color: GREEN }}
                />
                <span className="text-white text-base">{item}</span>
              </li>
            ))}
          </ul>

          {/* Chiffres */}
          <div className="flex flex-wrap items-center gap-x-6 gap-y-3 mb-10">
            {stats.map((stat) => (
              <div key={stat.label} className="flex items-center gap-2">
                <stat.icon className="w-5 h-5" style={{ color: GREEN }} />
                <span className="text-white font-bold text-lg">{stat.value}</span>
                <span className="text-white/70 text-sm">{stat.label}</span>
              </div>
            ))}
          </div>

          {/* CTA unique */}
          <button
            onClick={() => navigate("/beta")}
            className="inline-flex items-center justify-center gap-2 w-full sm:w-auto min-h-[48px] px-8 rounded-xl font-bold transition-transform hover:scale-[1.02] active:scale-95"
            style={{ backgroundColor: GREEN, color: NAVY }}
          >
            Rejoindre Konnekt
            <ArrowRight className="w-5 h-5" />
          </button>
        </motion.div>
      </main>
    </div>
  );
}
