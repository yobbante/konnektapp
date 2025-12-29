import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Shield, Users, Search, Plus, Trash2, Check, X, 
  Loader2, ChevronDown, ChevronUp, Settings
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Checkbox } from "@/components/ui/checkbox";

type AppRole = "admin" | "moderator" | "user";

interface UserWithRole {
  id: string;
  user_id: string;
  role: AppRole;
  created_at: string;
  email?: string;
  full_name?: string;
}

interface Permission {
  id: string;
  name: string;
  description: string | null;
  category: string;
}

interface RolePermission {
  id: string;
  role: AppRole;
  permission_id: string;
}

const ROLES: { value: AppRole; label: string; color: string }[] = [
  { value: "admin", label: "Admin", color: "bg-destructive text-destructive-foreground" },
  { value: "moderator", label: "Modérateur", color: "bg-warning text-warning-foreground" },
  { value: "user", label: "Utilisateur", color: "bg-muted text-muted-foreground" },
];

export function AdminPermissionsManager() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [rolePermissions, setRolePermissions] = useState<RolePermission[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [deleteUserId, setDeleteUserId] = useState<string | null>(null);
  const [addingUser, setAddingUser] = useState(false);
  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserRole, setNewUserRole] = useState<AppRole>("user");
  const [expandedRoles, setExpandedRoles] = useState<AppRole[]>([]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch users with roles
      const { data: userRoles, error: rolesError } = await supabase
        .from("user_roles")
        .select("*")
        .order("created_at", { ascending: false });

      if (rolesError) throw rolesError;

      // Fetch profiles for user names
      if (userRoles && userRoles.length > 0) {
        const userIds = userRoles.map(ur => ur.user_id);
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, full_name, email")
          .in("user_id", userIds);

        const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);
        
        setUsers(userRoles.map(ur => ({
          ...ur,
          email: profileMap.get(ur.user_id)?.email || "",
          full_name: profileMap.get(ur.user_id)?.full_name || "",
        })));
      } else {
        setUsers([]);
      }

      // Fetch permissions
      const { data: perms } = await supabase
        .from("permissions")
        .select("*")
        .order("category", { ascending: true });
      setPermissions(perms || []);

      // Fetch role permissions
      const { data: rp } = await supabase
        .from("role_permissions")
        .select("*");
      setRolePermissions(rp || []);

    } catch (error) {
      console.error("Error fetching data:", error);
      toast({ title: "Erreur de chargement", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleAddUserRole = async () => {
    if (!newUserEmail) {
      toast({ title: "Entrez un email", variant: "destructive" });
      return;
    }

    setAddingUser(true);
    try {
      // Find user by email
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("user_id")
        .eq("email", newUserEmail)
        .single();

      if (profileError || !profile) {
        toast({ title: "Utilisateur non trouvé", description: "Vérifiez l'email", variant: "destructive" });
        return;
      }

      // Check if role already exists
      const existing = users.find(u => u.user_id === profile.user_id && u.role === newUserRole);
      if (existing) {
        toast({ title: "Rôle déjà attribué", variant: "destructive" });
        return;
      }

      const { error } = await supabase
        .from("user_roles")
        .insert({ user_id: profile.user_id, role: newUserRole });

      if (error) throw error;

      toast({ title: "Rôle attribué avec succès" });
      setNewUserEmail("");
      fetchData();
    } catch (error: any) {
      console.error("Error adding role:", error);
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    } finally {
      setAddingUser(false);
    }
  };

  const handleDeleteRole = async () => {
    if (!deleteUserId) return;

    try {
      const { error } = await supabase
        .from("user_roles")
        .delete()
        .eq("id", deleteUserId);

      if (error) throw error;

      toast({ title: "Rôle supprimé" });
      setDeleteUserId(null);
      fetchData();
    } catch (error) {
      toast({ title: "Erreur lors de la suppression", variant: "destructive" });
    }
  };

  const handleUpdateRole = async (id: string, newRole: AppRole) => {
    try {
      const { error } = await supabase
        .from("user_roles")
        .update({ role: newRole })
        .eq("id", id);

      if (error) throw error;

      toast({ title: "Rôle mis à jour" });
      fetchData();
    } catch (error) {
      toast({ title: "Erreur", variant: "destructive" });
    }
  };

  const toggleRolePermission = async (role: AppRole, permissionId: string, hasPermission: boolean) => {
    try {
      if (hasPermission) {
        // Remove permission
        const { error } = await supabase
          .from("role_permissions")
          .delete()
          .eq("role", role)
          .eq("permission_id", permissionId);
        if (error) throw error;
      } else {
        // Add permission
        const { error } = await supabase
          .from("role_permissions")
          .insert({ role, permission_id: permissionId });
        if (error) throw error;
      }
      fetchData();
      toast({ title: hasPermission ? "Permission retirée" : "Permission ajoutée" });
    } catch (error) {
      toast({ title: "Erreur", variant: "destructive" });
    }
  };

  const roleHasPermission = (role: AppRole, permissionId: string) => {
    return rolePermissions.some(rp => rp.role === role && rp.permission_id === permissionId);
  };

  const toggleRoleExpanded = (role: AppRole) => {
    setExpandedRoles(prev => 
      prev.includes(role) ? prev.filter(r => r !== role) : [...prev, role]
    );
  };

  const filteredUsers = users.filter(u => 
    (u.email?.toLowerCase() || "").includes(searchQuery.toLowerCase()) ||
    (u.full_name?.toLowerCase() || "").includes(searchQuery.toLowerCase())
  );

  // Group permissions by category
  const permissionsByCategory = permissions.reduce((acc, perm) => {
    if (!acc[perm.category]) acc[perm.category] = [];
    acc[perm.category].push(perm);
    return acc;
  }, {} as Record<string, Permission[]>);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Users with Roles */}
      <div className="bg-card rounded-xl border border-border p-4 md:p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-lg flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" />
            Utilisateurs et Rôles
          </h3>
        </div>

        {/* Search & Add */}
        <div className="flex flex-col md:flex-row gap-3 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher par email ou nom..."
              className="pl-10"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="flex gap-2">
            <Input
              placeholder="Email utilisateur"
              value={newUserEmail}
              onChange={(e) => setNewUserEmail(e.target.value)}
              className="w-48"
            />
            <Select value={newUserRole} onValueChange={(v) => setNewUserRole(v as AppRole)}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ROLES.map(role => (
                  <SelectItem key={role.value} value={role.value}>{role.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={handleAddUserRole} disabled={addingUser}>
              {addingUser ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            </Button>
          </div>
        </div>

        {/* Users Table */}
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Utilisateur</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Rôle</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                    Aucun utilisateur avec rôle assigné
                  </TableCell>
                </TableRow>
              ) : (
                filteredUsers.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">{user.full_name || "—"}</TableCell>
                    <TableCell>{user.email || "—"}</TableCell>
                    <TableCell>
                      <Select 
                        value={user.role} 
                        onValueChange={(v) => handleUpdateRole(user.id, v as AppRole)}
                      >
                        <SelectTrigger className="w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {ROLES.map(role => (
                            <SelectItem key={role.value} value={role.value}>{role.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(user.created_at).toLocaleDateString('fr-FR')}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:bg-destructive/10"
                        onClick={() => setDeleteUserId(user.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Permissions by Role */}
      <div className="bg-card rounded-xl border border-border p-4 md:p-6">
        <h3 className="font-semibold text-lg flex items-center gap-2 mb-4">
          <Shield className="w-5 h-5 text-primary" />
          Permissions par Rôle
        </h3>

        <div className="space-y-4">
          {ROLES.map((role) => (
            <Collapsible
              key={role.value}
              open={expandedRoles.includes(role.value)}
              onOpenChange={() => toggleRoleExpanded(role.value)}
            >
              <CollapsibleTrigger asChild>
                <Button variant="outline" className="w-full justify-between">
                  <div className="flex items-center gap-2">
                    <Badge className={role.color}>{role.label}</Badge>
                    <span className="text-sm text-muted-foreground">
                      {rolePermissions.filter(rp => rp.role === role.value).length} permissions
                    </span>
                  </div>
                  {expandedRoles.includes(role.value) ? (
                    <ChevronUp className="w-4 h-4" />
                  ) : (
                    <ChevronDown className="w-4 h-4" />
                  )}
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-3">
                <div className="border border-border rounded-lg p-4 space-y-4">
                  {Object.entries(permissionsByCategory).map(([category, perms]) => (
                    <div key={category}>
                      <h4 className="text-sm font-medium text-muted-foreground mb-2 capitalize">{category}</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {perms.map((perm) => {
                          const hasPermission = roleHasPermission(role.value, perm.id);
                          return (
                            <div
                              key={perm.id}
                              className="flex items-center gap-2 p-2 rounded-lg hover:bg-muted/50"
                            >
                              <Checkbox
                                checked={hasPermission}
                                onCheckedChange={() => toggleRolePermission(role.value, perm.id, hasPermission)}
                              />
                              <div className="flex-1">
                                <p className="text-sm font-medium">{perm.name}</p>
                                {perm.description && (
                                  <p className="text-xs text-muted-foreground">{perm.description}</p>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </CollapsibleContent>
            </Collapsible>
          ))}
        </div>
      </div>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteUserId} onOpenChange={() => setDeleteUserId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer ce rôle ?</AlertDialogTitle>
            <AlertDialogDescription>
              L'utilisateur perdra les permissions associées à ce rôle.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteRole}
              className="bg-destructive hover:bg-destructive/90"
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
