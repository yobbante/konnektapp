import { useState, useEffect } from "react";
import { Shield, Search, UserCog, Check, X, Loader2, Truck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface User {
  id: string;
  email: string;
  full_name: string | null;
  roles: string[];
}

interface Permission {
  id: string;
  name: string;
  description: string | null;
  category: string;
}

interface RolePermission {
  role: string;
  permission_id: string;
}

const ROLES = [
  { value: "admin", label: "Super Admin", color: "destructive" as const },
  { value: "moderator", label: "Modérateur", color: "secondary" as const },
  { value: "agent_logistique", label: "Livreur Konnekt", color: "default" as const, icon: Truck },
  { value: "user", label: "Client", color: "outline" as const },
];

export function AdminPermissionsManager() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<User[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [rolePermissions, setRolePermissions] = useState<RolePermission[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [userDialogOpen, setUserDialogOpen] = useState(false);
  const [savingRole, setSavingRole] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      await Promise.all([loadUsers(), loadPermissions(), loadRolePermissions()]);
    } finally {
      setLoading(false);
    }
  };

  const loadUsers = async () => {
    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id, email, full_name")
      .order("created_at", { ascending: false });

    const { data: roles } = await supabase.from("user_roles").select("user_id, role");

    const usersWithRoles = (profiles || []).map((profile) => ({
      id: profile.user_id,
      email: profile.email || "",
      full_name: profile.full_name,
      roles: roles?.filter((r) => r.user_id === profile.user_id).map((r) => r.role) || [],
    }));

    setUsers(usersWithRoles);
  };

  const loadPermissions = async () => {
    const { data } = await supabase.from("permissions").select("*").order("category", { ascending: true });
    setPermissions(data || []);
  };

  const loadRolePermissions = async () => {
    const { data } = await supabase.from("role_permissions").select("role, permission_id");
    setRolePermissions(data || []);
  };

  const assignRole = async (userId: string, role: string) => {
    setSavingRole(true);
    try {
      // For agent_logistique, insert directly (not in app_role enum for RPC)
      if (role === "agent_logistique") {
        const { error } = await supabase.from("user_roles").insert({
          user_id: userId,
          role: "agent_logistique" as any,
        });
        if (error) throw error;
      } else {
        const { error } = await supabase.rpc("assign_user_role", {
          _target_user_id: userId,
          _role: role as "admin" | "moderator" | "user",
        });
        if (error) throw error;
      }

      toast({ title: "Rôle assigné avec succès" });
      await loadUsers();
      
      if (selectedUser) {
        setSelectedUser({ ...selectedUser, roles: [...selectedUser.roles, role] });
      }
    } catch (error: any) {
      console.error("Error assigning role:", error);
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    } finally {
      setSavingRole(false);
    }
  };

  const removeRole = async (userId: string, role: string) => {
    setSavingRole(true);
    try {
      if (role === "agent_logistique") {
        const { error } = await supabase.from("user_roles")
          .delete()
          .eq("user_id", userId)
          .eq("role", role as any);
        if (error) throw error;
      } else {
        const { error } = await supabase.rpc("remove_user_role", {
          _target_user_id: userId,
          _role: role as "admin" | "moderator" | "user",
        });
        if (error) throw error;
      }

      toast({ title: "Rôle retiré avec succès" });
      await loadUsers();
      
      if (selectedUser) {
        setSelectedUser({ ...selectedUser, roles: selectedUser.roles.filter((r) => r !== role) });
      }
    } catch (error: any) {
      console.error("Error removing role:", error);
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    } finally {
      setSavingRole(false);
    }
  };

  const toggleRolePermission = async (role: string, permissionId: string, enabled: boolean) => {
    try {
      if (enabled) {
        await supabase.from("role_permissions").insert([{ role: role as any, permission_id: permissionId }]);
      } else {
        await supabase.from("role_permissions").delete().eq("role", role as any).eq("permission_id", permissionId);
      }
      toast({ title: enabled ? "Permission ajoutée" : "Permission retirée" });
      await loadRolePermissions();
    } catch (error: any) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    }
  };

  const hasRolePermission = (role: string, permissionId: string) =>
    rolePermissions.some((rp) => rp.role === role && rp.permission_id === permissionId);

  const filteredUsers = users.filter(
    (user) =>
      user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.full_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const groupedPermissions = permissions.reduce((acc, perm) => {
    if (!acc[perm.category]) acc[perm.category] = [];
    acc[perm.category].push(perm);
    return acc;
  }, {} as Record<string, Permission[]>);

  const getRoleBadge = (role: string) => {
    const roleConfig = ROLES.find((r) => r.value === role);
    if (!roleConfig) return <Badge variant="outline" className="text-xs">{role}</Badge>;
    return (
      <Badge variant={roleConfig.color as any} className="text-xs gap-1">
        {roleConfig.icon && <roleConfig.icon className="w-3 h-3" />}
        {roleConfig.label}
      </Badge>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Tabs defaultValue="users">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="users">Utilisateurs & Rôles</TabsTrigger>
          <TabsTrigger value="permissions">Permissions par rôle</TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="space-y-4">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher un utilisateur..."
                className="pl-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          {/* Mobile-friendly card list */}
          <div className="space-y-2">
            {filteredUsers.slice(0, 50).map((user) => (
              <Card key={user.id} className="overflow-hidden">
                <CardContent className="p-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{user.full_name || "Sans nom"}</p>
                      <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {user.roles.length > 0 ? (
                          user.roles.map((role) => (
                            <span key={role}>{getRoleBadge(role)}</span>
                          ))
                        ) : (
                          <Badge variant="outline" className="text-[10px]">Client</Badge>
                        )}
                      </div>
                    </div>
                    <Dialog
                      open={userDialogOpen && selectedUser?.id === user.id}
                      onOpenChange={(open) => {
                        setUserDialogOpen(open);
                        if (open) setSelectedUser(user);
                      }}
                    >
                      <DialogTrigger asChild>
                        <Button variant="outline" size="sm" className="shrink-0">
                          <UserCog className="w-4 h-4" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Gérer les rôles</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                          <div>
                            <p className="font-medium">{user.full_name || "Sans nom"}</p>
                            <p className="text-sm text-muted-foreground">{user.email}</p>
                          </div>

                          <div className="space-y-3">
                            {ROLES.map((role) => {
                              const hasRole = user.roles.includes(role.value);
                              return (
                                <div
                                  key={role.value}
                                  className="flex items-center justify-between p-3 rounded-xl border"
                                >
                                  <div className="flex items-center gap-2">
                                    {getRoleBadge(role.value)}
                                  </div>
                                  <Button
                                    size="sm"
                                    variant={hasRole ? "destructive" : "default"}
                                    onClick={() =>
                                      hasRole ? removeRole(user.id, role.value) : assignRole(user.id, role.value)
                                    }
                                    disabled={savingRole}
                                  >
                                    {savingRole ? (
                                      <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : hasRole ? (
                                      <><X className="w-4 h-4 mr-1" />Retirer</>
                                    ) : (
                                      <><Check className="w-4 h-4 mr-1" />Assigner</>
                                    )}
                                  </Button>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="permissions" className="space-y-4">
          {Object.entries(groupedPermissions).map(([category, perms]) => (
            <Card key={category}>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium capitalize flex items-center gap-2">
                  <Shield className="w-4 h-4 text-primary" />
                  {category}
                </CardTitle>
              </CardHeader>
              <CardContent className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Permission</TableHead>
                      {ROLES.map((role) => (
                        <TableHead key={role.value} className="text-center w-20">
                          {role.label}
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {perms.map((perm) => (
                      <TableRow key={perm.id}>
                        <TableCell>
                          <p className="font-medium text-sm">{perm.name}</p>
                          {perm.description && (
                            <p className="text-xs text-muted-foreground">{perm.description}</p>
                          )}
                        </TableCell>
                        {ROLES.map((role) => (
                          <TableCell key={role.value} className="text-center">
                            <Switch
                              checked={hasRolePermission(role.value, perm.id)}
                              onCheckedChange={(checked) =>
                                toggleRolePermission(role.value, perm.id, checked)
                              }
                            />
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          ))}
        </TabsContent>
      </Tabs>
    </div>
  );
}
