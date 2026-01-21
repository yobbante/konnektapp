import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MessageSquare, AlertTriangle, Shield } from "lucide-react";
import { AdminSupportTickets } from "./AdminSupportTickets";
import { AdminDisputeArbitration } from "./AdminDisputeArbitration";

/**
 * Section combinée Support & Litiges pour le dashboard admin
 * Fusionne les tickets de support et les litiges en une interface unifiée
 */
export function AdminSupportAndDisputes() {
  const [activeSubTab, setActiveSubTab] = useState<"support" | "disputes">("support");

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary" />
            Centre de résolution
          </CardTitle>
          <div className="flex gap-2">
            <Badge variant="outline" className="gap-1">
              <MessageSquare className="w-3 h-3" />
              Support
            </Badge>
            <Badge variant="outline" className="gap-1">
              <AlertTriangle className="w-3 h-3" />
              Litiges
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs value={activeSubTab} onValueChange={(v) => setActiveSubTab(v as "support" | "disputes")}>
          <TabsList className="grid w-full grid-cols-2 mb-4">
            <TabsTrigger value="support" className="gap-2">
              <MessageSquare className="w-4 h-4" />
              Tickets Support
            </TabsTrigger>
            <TabsTrigger value="disputes" className="gap-2">
              <AlertTriangle className="w-4 h-4" />
              Litiges & Arbitrage
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="support" className="mt-0">
            <AdminSupportTickets />
          </TabsContent>
          
          <TabsContent value="disputes" className="mt-0">
            <AdminDisputeArbitration />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
