import { useState, useEffect } from "react";
import { Shield, Search, UserCog, Check, X, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
  { value: "user", label: "Client", color: "default" as const },
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
    // Get profiles with their roles
    const { data: profiles, error: profilesError } = await supabase
      .from("profiles")
      .select("user_id, email, full_name")
      .order("created_at", { ascending: false });

    if (profilesError) {
      console.error("Error loading profiles:", profilesError);
      return;
    }

    // Get all user roles
    const { data: roles, error: rolesError } = await supabase
      .from("user_roles")
      .select("user_id, role");

    if (rolesError) {
      console.error("Error loading roles:", rolesError);
      return;
    }

    // Merge data
    const usersWithRoles = (profiles || []).map((profile) => ({
      id: profile.user_id,
      email: profile.email || "",
      full_name: profile.full_name,
      roles: roles?.filter((r) => r.user_id === profile.user_id).map((r) => r.role) || [],
    }));

    setUsers(usersWithRoles);
  };

  const loadPermissions = async () => {
    const { data, error } = await supabase
      .from("permissions")
      .select("*")
      .order("category", { ascending: true });

    if (error) {
      console.error("Error loading permissions:", error);
      return;
    }

    setPermissions(data || []);
  };

  const loadRolePermissions = async () => {
    const { data, error } = await supabase
      .from("role_permissions")
      .select("role, permission_id");

    if (error) {
      console.error("Error loading role permissions:", error);
      return;
    }

    setRolePermissions(data || []);
  };

  const assignRole = async (userId: string, role: "admin" | "moderator" | "user") => {
    setSavingRole(true);
    try {
      const { error } = await supabase.rpc("assign_user_role", {
        _target_user_id: userId,
        _role: role,
      });

      if (error) throw error;

      toast({ title: "Rôle assigné avec succès" });
      await loadUsers();
      
      if (selectedUser) {
        setSelectedUser({
          ...selectedUser,
          roles: [...selectedUser.roles, role],
        });
      }
    } catch (error: any) {
      console.error("Error assigning role:", error);
      toast({
        title: "Erreur",
        description: error.message || "Impossible d'assigner le rôle",
        variant: "destructive",
      });
    } finally {
      setSavingRole(false);
    }
  };

  const removeRole = async (userId: string, role: "admin" | "moderator" | "user") => {
    setSavingRole(true);
    try {
      const { error } = await supabase.rpc("remove_user_role", {
        _target_user_id: userId,
        _role: role,
      });

      if (error) throw error;

      toast({ title: "Rôle retiré avec succès" });
      await loadUsers();
      
      if (selectedUser) {
        setSelectedUser({
          ...selectedUser,
          roles: selectedUser.roles.filter((r) => r !== role),
        });
      }
    } catch (error: any) {
      console.error("Error removing role:", error);
      toast({
        title: "Erreur",
        description: error.message || "Impossible de retirer le rôle",
        variant: "destructive",
      });
    } finally {
      setSavingRole(false);
    }
  };

  const toggleRolePermission = async (role: "admin" | "moderator" | "user", permissionId: string, enabled: boolean) => {
    try {
      if (enabled) {
        const { error } = await supabase
          .from("role_permissions")
          .insert([{ role, permission_id: permissionId }]);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("role_permissions")
          .delete()
          .eq("role", role)
          .eq("permission_id", permissionId);

        if (error) throw error;
      }

      toast({ title: enabled ? "Permission ajoutée" : "Permission retirée" });
      await loadRolePermissions();
    } catch (error: any) {
      console.error("Error toggling permission:", error);
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const hasRolePermission = (role: string, permissionId: string) => {
    return rolePermissions.some(
      (rp) => rp.role === role && rp.permission_id === permissionId
    );
  };

  const filteredUsers = users.filter(
    (user) =>
      user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.full_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const groupedPermissions = permissions.reduce((acc, perm) => {
    if (!acc[perm.category]) {
      acc[perm.category] = [];
    }
    acc[perm.category].push(perm);
    return acc;
  }, {} as Record<string, Permission[]>);

  const getRoleBadge = (role: string) => {
    const roleConfig = ROLES.find((r) => r.value === role);
    return (
      <Badge variant={roleConfig?.color || "default"} className="text-xs">
        {roleConfig?.label || role}
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

        {/* Users & Roles Tab */}
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

          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Utilisateur</TableHead>
                    <TableHead>Rôles</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.slice(0, 50).map((user) => (
                    <TableRow key={user.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{user.full_name || "Sans nom"}</p>
                          <p className="text-sm text-muted-foreground">{user.email}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {user.roles.length > 0 ? (
                            user.roles.map((role) => (
                              <span key={role}>{getRoleBadge(role)}</span>
                            ))
                          ) : (
                            <Badge variant="outline" className="text-xs">
                              Client (par défaut)
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <Dialog
                          open={userDialogOpen && selectedUser?.id === user.id}
                          onOpenChange={(open) => {
                            setUserDialogOpen(open);
                            if (open) setSelectedUser(user);
                          }}
                        >
                          <DialogTrigger asChild>
                            <Button variant="outline" size="sm">
                              <UserCog className="w-4 h-4 mr-1" />
                              Gérer
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
                                      className="flex items-center justify-between p-3 rounded-lg border"
                                    >
                                      <div className="flex items-center gap-2">
                                        {getRoleBadge(role.value)}
                                        <span className="text-sm text-muted-foreground">
                                          {role.label}
                                        </span>
                                      </div>
                                      <Button
                                        size="sm"
                                        variant={hasRole ? "destructive" : "default"}
                                        onClick={() =>
                                          hasRole
                                            ? removeRole(user.id, role.value as "admin" | "moderator" | "user")
                                            : assignRole(user.id, role.value as "admin" | "moderator" | "user")
                                        }
                                        disabled={savingRole}
                                      >
                                        {savingRole ? (
                                          <Loader2 className="w-4 h-4 animate-spin" />
                                        ) : hasRole ? (
                                          <>
                                            <X className="w-4 h-4 mr-1" />
                                            Retirer
                                          </>
                                        ) : (
                                          <>
                                            <Check className="w-4 h-4 mr-1" />
                                            Assigner
                                          </>
                                        )}
                                      </Button>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          </DialogContent>
                        </Dialog>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Permissions Tab */}
        <TabsContent value="permissions" className="space-y-4">
          {Object.entries(groupedPermissions).map(([category, perms]) => (
            <Card key={category}>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium capitalize flex items-center gap-2">
                  <Shield className="w-4 h-4 text-primary" />
                  {category}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Permission</TableHead>
                      {ROLES.map((role) => (
                        <TableHead key={role.value} className="text-center w-24">
                          {role.label}
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {perms.map((perm) => (
                      <TableRow key={perm.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium text-sm">{perm.name}</p>
                            {perm.description && (
                              <p className="text-xs text-muted-foreground">
                                {perm.description}
                              </p>
                            )}
                          </div>
                        </TableCell>
                        {ROLES.map((role) => (
                          <TableCell key={role.value} className="text-center">
                            <Switch
                              checked={hasRolePermission(role.value, perm.id)}
                              onCheckedChange={(checked) =>
                                toggleRolePermission(role.value as "admin" | "moderator" | "user", perm.id, checked)
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
