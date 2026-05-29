import { useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { Home, ArrowRight } from "lucide-react";

const NotFound = () => {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    console.warn("404: route introuvable:", location.pathname);
  }, [location.pathname]);

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-6 py-16 text-center"
      style={{ backgroundColor: "#0D1B2A" }}
    >
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md mx-auto"
      >
        <p
          className="text-[120px] sm:text-[160px] font-black leading-none tracking-tight"
          style={{ color: "#3DAA8A" }}
        >
          404
        </p>

        <h1 className="text-2xl sm:text-3xl font-bold text-white mt-2 mb-3">
          Cette page n'existe pas encore.
        </h1>
        <p className="text-white/70 text-base mb-10">
          Mais Konnekt, si.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={() => navigate("/")}
            className="inline-flex items-center justify-center gap-2 min-h-[44px] px-6 rounded-xl font-semibold text-white transition-transform hover:scale-[1.02] active:scale-95 border border-white/20"
            style={{ backgroundColor: "rgba(255,255,255,0.06)" }}
          >
            <Home className="w-5 h-5" />
            Retour à l'accueil
          </button>
          <button
            onClick={() => navigate("/beta")}
            className="inline-flex items-center justify-center gap-2 min-h-[44px] px-6 rounded-xl font-semibold text-[#0D1B2A] transition-transform hover:scale-[1.02] active:scale-95"
            style={{ backgroundColor: "#3DAA8A" }}
          >
            Rejoindre Konnekt
            <ArrowRight className="w-5 h-5" />
          </button>
        </div>
      </motion.div>
    </div>
  );
};

export default NotFound;
