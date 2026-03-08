/**
 * Admin Support Module — Support tickets management
 */
import { useState, useEffect } from "react";
import { HeadphonesIcon, Search, Clock, CheckCircle, AlertCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";

export function AdminSupportModule() {
  const [tickets, setTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<string>("all");

  useEffect(() => {
    loadTickets();
  }, []);

  const loadTickets = async () => {
    const { data } = await supabase
      .from("support_tickets")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100);
    setTickets(data || []);
    setLoading(false);
  };

  const statusColors: Record<string, string> = {
    open: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
    in_progress: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300",
    resolved: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
    closed: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300",
  };

  const priorityColors: Record<string, string> = {
    low: "text-gray-500",
    medium: "text-amber-500",
    high: "text-orange-500",
    urgent: "text-red-600",
  };

  const openTickets = tickets.filter(t => t.status === "open").length;
  const inProgressTickets = tickets.filter(t => t.status === "in_progress").length;
  const resolvedTickets = tickets.filter(t => t.status === "resolved" || t.status === "closed").length;

  const filtered = tickets.filter(t => {
    if (filter !== "all" && t.status !== filter) return false;
    if (search) {
      const q = search.toLowerCase();
      return t.ticket_number?.toLowerCase().includes(q) ||
        t.subject?.toLowerCase().includes(q) ||
        t.description?.toLowerCase().includes(q);
    }
    return true;
  });

  if (loading) {
    return <div className="flex justify-center py-12"><div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;
  }

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold flex items-center gap-2">
        <HeadphonesIcon className="w-5 h-5 text-blue-500" />
        Support
        <Badge variant="secondary" className="text-xs">{tickets.length}</Badge>
      </h2>

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-3">
        <div className="p-3 rounded-xl border border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-950/20">
          <div className="flex items-center gap-1.5 mb-0.5">
            <AlertCircle className="w-3 h-3 text-blue-500" />
            <span className="text-xs text-muted-foreground">Ouverts</span>
          </div>
          <p className="text-xl font-bold text-blue-600">{openTickets}</p>
        </div>
        <div className="p-3 rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/20">
          <div className="flex items-center gap-1.5 mb-0.5">
            <Clock className="w-3 h-3 text-amber-500" />
            <span className="text-xs text-muted-foreground">En cours</span>
          </div>
          <p className="text-xl font-bold text-amber-600">{inProgressTickets}</p>
        </div>
        <div className="p-3 rounded-xl border border-green-200 dark:border-green-800 bg-green-50/50 dark:bg-green-950/20">
          <div className="flex items-center gap-1.5 mb-0.5">
            <CheckCircle className="w-3 h-3 text-green-500" />
            <span className="text-xs text-muted-foreground">Résolus</span>
          </div>
          <p className="text-xl font-bold text-green-600">{resolvedTickets}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
        {[
          { id: "all", label: "Tous" },
          { id: "open", label: "Ouverts" },
          { id: "in_progress", label: "En cours" },
          { id: "resolved", label: "Résolus" },
          { id: "closed", label: "Fermés" },
        ].map(f => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
              filter === f.id
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Rechercher ticket..."
          className="pl-9 h-9"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Ticket List */}
      <div className="space-y-2">
        {filtered.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <HeadphonesIcon className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p className="text-sm">Aucun ticket trouvé</p>
          </div>
        ) : (
          filtered.slice(0, 30).map(ticket => (
            <div key={ticket.id} className="p-3 rounded-xl border bg-card hover:shadow-sm transition-all">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm font-medium">{ticket.ticket_number}</span>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full ${statusColors[ticket.status] || statusColors.open}`}>
                    {ticket.status}
                  </span>
                  <span className={`text-[10px] font-medium ${priorityColors[ticket.priority] || ""}`}>
                    {ticket.priority}
                  </span>
                </div>
                <span className="text-[10px] text-muted-foreground">
                  {new Date(ticket.created_at).toLocaleDateString("fr")}
                </span>
              </div>
              <p className="text-sm font-medium">{ticket.subject}</p>
              <p className="text-xs text-muted-foreground truncate mt-0.5">{ticket.description}</p>
              <div className="flex items-center gap-2 mt-1 text-[10px] text-muted-foreground">
                <Badge variant="outline" className="text-[10px]">{ticket.type}</Badge>
                {ticket.resolution && <span className="text-green-600">✓ {ticket.resolution}</span>}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
