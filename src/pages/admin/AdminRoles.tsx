import { useState, useEffect } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { MoreHorizontal, Shield, UserMinus, Loader2 } from 'lucide-react';

interface RoleData {
  id: string;
  user_id: string;
  role: string;
  created_at: string;
  display_name: string | null;
}

export default function AdminRoles() {
  const [roles, setRoles] = useState<RoleData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRoles();
  }, []);

  async function fetchRoles() {
    try {
      setLoading(true);
      
      const { data: rolesData, error: rolesError } = await supabase
        .from('user_roles')
        .select('*')
        .order('created_at', { ascending: false });

      if (rolesError) throw rolesError;

      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('user_id, display_name');

      if (profilesError) throw profilesError;

      const enrichedRoles = rolesData?.map(role => {
        const profile = profiles?.find(p => p.user_id === role.user_id);
        return {
          ...role,
          display_name: profile?.display_name || null,
        };
      }) || [];

      setRoles(enrichedRoles);
    } catch (err) {
      console.error('Error fetching roles:', err);
      toast.error('Failed to load roles');
    } finally {
      setLoading(false);
    }
  }

  async function removeRole(roleId: string) {
    if (!confirm('Are you sure you want to remove this role?')) return;

    try {
      const { error } = await supabase
        .from('user_roles')
        .delete()
        .eq('id', roleId);

      if (error) throw error;
      
      toast.success('Role removed');
      fetchRoles();
    } catch (err) {
      console.error('Error removing role:', err);
      toast.error('Failed to remove role');
    }
  }

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Role Management</h1>
          <p className="text-muted-foreground">View and manage user roles</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Assigned Roles</CardTitle>
            <CardDescription>Users with special permissions</CardDescription>
          </CardHeader>
          <CardContent>
            {roles.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No special roles assigned yet. Assign roles from the Users page.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Assigned</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {roles.map((role) => (
                    <TableRow key={role.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{role.display_name || 'Unknown User'}</div>
                          <div className="text-xs text-muted-foreground truncate max-w-[200px]">
                            {role.user_id}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant="default" 
                          className={role.role === 'admin' ? 'bg-purple-500' : role.role === 'moderator' ? 'bg-blue-500' : ''}
                        >
                          {role.role}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {new Date(role.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => removeRole(role.id)}>
                              <UserMinus className="h-4 w-4 mr-2" />
                              Remove Role
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Role Permissions</CardTitle>
            <CardDescription>What each role can do</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="p-4 border border-border rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Shield className="h-5 w-5 text-purple-500" />
                  <h3 className="font-semibold">Admin</h3>
                </div>
                <ul className="text-sm text-muted-foreground space-y-1 ml-7">
                  <li>• Full access to admin dashboard</li>
                  <li>• Manage all users and their plans</li>
                  <li>• Configure app settings and modules</li>
                  <li>• Manage billing and payment providers</li>
                  <li>• Edit email templates and help content</li>
                </ul>
              </div>
              <div className="p-4 border border-border rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Shield className="h-5 w-5 text-blue-500" />
                  <h3 className="font-semibold">Moderator</h3>
                </div>
                <ul className="text-sm text-muted-foreground space-y-1 ml-7">
                  <li>• View user information</li>
                  <li>• Manage help content</li>
                  <li>• Limited admin access</li>
                </ul>
              </div>
              <div className="p-4 border border-border rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Shield className="h-5 w-5 text-muted-foreground" />
                  <h3 className="font-semibold">User</h3>
                </div>
                <ul className="text-sm text-muted-foreground space-y-1 ml-7">
                  <li>• Standard app access</li>
                  <li>• Manage own data and settings</li>
                  <li>• No admin dashboard access</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
