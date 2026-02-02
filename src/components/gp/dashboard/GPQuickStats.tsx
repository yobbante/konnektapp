import { Package, Clock, TrendingUp, Calendar, Eye, Plus, History, BarChart3 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { ExpandableStatsCard, ExpandableStatsGrid } from "./ExpandableStatsCard";

interface GPQuickStatsProps {
  pendingCount: number;
  activeCount: number;
  completedThisMonth: number;
  nextDeparture?: string;
}

/**
 * GPQuickStats - Interactive expandable stats cards for GP Bagages
 * 
 * Each card can be tapped to reveal quick actions
 */
export function GPQuickStats({ 
  pendingCount, 
  activeCount, 
  completedThisMonth,
  nextDeparture 
}: GPQuickStatsProps) {
  const navigate = useNavigate();

  return (
    <ExpandableStatsGrid>
      <ExpandableStatsCard
        label="En attente"
        value={pendingCount}
        icon={Package}
        color="text-amber-600"
        bgColor="bg-amber-500/10"
        actions={[
          { 
            label: "Voir demandes", 
            icon: Eye,
            onClick: () => navigate("/gp/demandes") 
          },
        ]}
      />
      
      <ExpandableStatsCard
        label="En cours"
        value={activeCount}
        icon={Clock}
        color="text-blue-600"
        bgColor="bg-blue-500/10"
        actions={[
          { 
            label: "Missions actives", 
            icon: Eye,
            onClick: () => navigate("/gp/en-cours") 
          },
        ]}
      />
      
      <ExpandableStatsCard
        label="Ce mois"
        value={completedThisMonth}
        icon={TrendingUp}
        color="text-green-600"
        bgColor="bg-green-500/10"
        actions={[
          { 
            label: "Historique", 
            icon: History,
            onClick: () => navigate("/gp/historique") 
          },
          { 
            label: "Statistiques", 
            icon: BarChart3,
            onClick: () => navigate("/gp/stats") 
          },
        ]}
      />
      
      <ExpandableStatsCard
        label="Prochain"
        value={nextDeparture || "-"}
        icon={Calendar}
        color="text-purple-600"
        bgColor="bg-purple-500/10"
        isText={true}
        actions={[
          { 
            label: "Calendrier", 
            icon: Calendar,
            onClick: () => navigate("/gp/calendrier") 
          },
          { 
            label: "Nouveau voyage", 
            icon: Plus,
            onClick: () => {} // Open create voyage dialog
          },
        ]}
      />
    </ExpandableStatsGrid>
  );
}
