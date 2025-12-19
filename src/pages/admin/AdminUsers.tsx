import { useState, useEffect } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
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
import { MoreHorizontal, Search, UserPlus, Shield, Ban, Trash2, RefreshCw } from 'lucide-react';

interface UserData {
  id: string;
  email: string;
  created_at: string;
  display_name: string | null;
  plan: string;
  status: string;
  role: string | null;
}

export default function AdminUsers() {
  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchUsers();
  }, []);

  async function fetchUsers() {
    try {
      setLoading(true);
      
      // Fetch profiles with plans and roles
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('user_id, display_name, created_at');

      if (profilesError) throw profilesError;

      const { data: plans, error: plansError } = await supabase
        .from('user_plans')
        .select('user_id, plan, status');

      if (plansError) throw plansError;

      const { data: roles, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id, role');

      if (rolesError) throw rolesError;

      // Combine data
      const usersData: UserData[] = profiles?.map(profile => {
        const plan = plans?.find(p => p.user_id === profile.user_id);
        const role = roles?.find(r => r.user_id === profile.user_id);
        
        return {
          id: profile.user_id,
          email: '', // We don't have direct access to auth.users
          created_at: profile.created_at,
          display_name: profile.display_name,
          plan: plan?.plan || 'free',
          status: plan?.status || 'active',
          role: role?.role || null,
        };
      }) || [];

      setUsers(usersData);
    } catch (err) {
      console.error('Error fetching users:', err);
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  }

  async function updateUserPlan(userId: string, plan: 'free' | 'pro') {
    try {
      const { error } = await supabase
        .from('user_plans')
        .upsert({ user_id: userId, plan }, { onConflict: 'user_id' });

      if (error) throw error;
      
      toast.success(`User upgraded to ${plan}`);
      fetchUsers();
    } catch (err) {
      console.error('Error updating plan:', err);
      toast.error('Failed to update user plan');
    }
  }

  async function updateUserStatus(userId: string, status: 'active' | 'suspended') {
    try {
      const { error } = await supabase
        .from('user_plans')
        .upsert({ user_id: userId, status }, { onConflict: 'user_id' });

      if (error) throw error;
      
      toast.success(`User ${status === 'suspended' ? 'suspended' : 'reactivated'}`);
      fetchUsers();
    } catch (err) {
      console.error('Error updating status:', err);
      toast.error('Failed to update user status');
    }
  }

  async function assignAdminRole(userId: string) {
    try {
      const { error } = await supabase
        .from('user_roles')
        .upsert({ user_id: userId, role: 'admin' }, { onConflict: 'user_id,role' });

      if (error) throw error;
      
      toast.success('Admin role assigned');
      fetchUsers();
    } catch (err) {
      console.error('Error assigning role:', err);
      toast.error('Failed to assign admin role');
    }
  }

  async function removeAdminRole(userId: string) {
    try {
      const { error } = await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', userId)
        .eq('role', 'admin');

      if (error) throw error;
      
      toast.success('Admin role removed');
      fetchUsers();
    } catch (err) {
      console.error('Error removing role:', err);
      toast.error('Failed to remove admin role');
    }
  }

  const filteredUsers = users.filter(user =>
    user.display_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">User Management</h1>
            <p className="text-muted-foreground">Manage all users and their access</p>
          </div>
          <Button onClick={fetchUsers} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>

        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search users..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8 text-muted-foreground">Loading users...</div>
            ) : filteredUsers.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">No users found</div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead>Plan</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Joined</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredUsers.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{user.display_name || 'Unknown'}</div>
                            <div className="text-xs text-muted-foreground truncate max-w-[200px]">
                              {user.id}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={user.plan === 'pro' ? 'default' : 'secondary'}>
                            {user.plan}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={user.status === 'active' ? 'outline' : 'destructive'}>
                            {user.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {user.role === 'admin' && (
                            <Badge variant="default" className="bg-purple-500">
                              Admin
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {new Date(user.created_at).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => updateUserPlan(user.id, user.plan === 'pro' ? 'free' : 'pro')}>
                                <UserPlus className="h-4 w-4 mr-2" />
                                {user.plan === 'pro' ? 'Downgrade to Free' : 'Upgrade to Pro'}
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => updateUserStatus(user.id, user.status === 'active' ? 'suspended' : 'active')}>
                                <Ban className="h-4 w-4 mr-2" />
                                {user.status === 'active' ? 'Suspend User' : 'Reactivate User'}
                              </DropdownMenuItem>
                              {user.role === 'admin' ? (
                                <DropdownMenuItem onClick={() => removeAdminRole(user.id)}>
                                  <Shield className="h-4 w-4 mr-2" />
                                  Remove Admin Role
                                </DropdownMenuItem>
                              ) : (
                                <DropdownMenuItem onClick={() => assignAdminRole(user.id)}>
                                  <Shield className="h-4 w-4 mr-2" />
                                  Make Admin
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
