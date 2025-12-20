import { useState, useEffect } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { MoreHorizontal, Search, UserPlus, Shield, Ban, RefreshCw, Loader2, Mail } from 'lucide-react';

interface UserData {
  id: string;
  email: string;
  email_confirmed: boolean;
  created_at: string;
  last_sign_in: string | null;
  display_name: string | null;
  plan: string;
  status: string;
  role: string | null;
}

export default function AdminUsers() {
  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [assignRoleDialogOpen, setAssignRoleDialogOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [selectedRole, setSelectedRole] = useState<'admin' | 'moderator' | 'user'>('user');

  useEffect(() => {
    fetchUsers();
  }, []);

  async function fetchUsers() {
    try {
      setLoading(true);
      
      const { data: session } = await supabase.auth.getSession();
      if (!session?.session?.access_token) {
        throw new Error('No session');
      }

      const { data, error } = await supabase.functions.invoke('admin-get-users', {
        headers: {
          Authorization: `Bearer ${session.session.access_token}`,
        },
      });

      if (error) throw error;

      if (data?.users) {
        setUsers(data.users);
      }
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
      
      toast.success(`User plan updated to ${plan}`);
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

  async function handleAssignRole() {
    if (!selectedUserId) return;
    
    try {
      if (selectedRole === 'user') {
        // Remove all roles
        const { error } = await supabase
          .from('user_roles')
          .delete()
          .eq('user_id', selectedUserId);
        
        if (error) throw error;
      } else {
        // First delete existing roles then insert new
        await supabase
          .from('user_roles')
          .delete()
          .eq('user_id', selectedUserId);
        
        const { error } = await supabase
          .from('user_roles')
          .insert({ user_id: selectedUserId, role: selectedRole });
        
        if (error) throw error;
      }
      
      toast.success(`Role updated to ${selectedRole}`);
      setAssignRoleDialogOpen(false);
      fetchUsers();
    } catch (err) {
      console.error('Error assigning role:', err);
      toast.error('Failed to assign role');
    }
  }

  const filteredUsers = users.filter(user =>
    user.display_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">User Management</h1>
            <p className="text-muted-foreground">
              {loading ? 'Loading...' : `${users.length} total users`}
            </p>
          </div>
          <Button onClick={fetchUsers} variant="outline" size="sm" disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        {/* Role Assignment Dialog */}
        <Dialog open={assignRoleDialogOpen} onOpenChange={setAssignRoleDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Assign Role</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label>Select Role</Label>
                <Select value={selectedRole} onValueChange={(v) => setSelectedRole(v as 'admin' | 'moderator' | 'user')}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="user">User (No special permissions)</SelectItem>
                    <SelectItem value="moderator">Moderator</SelectItem>
                    <SelectItem value="admin">Admin (Full access)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={handleAssignRole} className="w-full">
                Assign Role
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name, email, or ID..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                {searchTerm ? 'No users match your search' : 'No users found'}
              </div>
            ) : (
              <>
                {/* Desktop Table View */}
                <div className="hidden md:block overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>User</TableHead>
                        <TableHead>Email</TableHead>
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
                              <div className="text-xs text-muted-foreground truncate max-w-[120px]">
                                {user.id.slice(0, 8)}...
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Mail className="h-3 w-3 text-muted-foreground" />
                              <span className="text-sm">{user.email || 'N/A'}</span>
                              {user.email_confirmed && (
                                <Badge variant="outline" className="text-xs">Verified</Badge>
                              )}
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
                            {user.role && (
                              <Badge 
                                variant="default" 
                                className={user.role === 'admin' ? 'bg-purple-500' : 'bg-blue-500'}
                              >
                                {user.role}
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-muted-foreground text-sm">
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
                                <DropdownMenuItem onClick={() => {
                                  setSelectedUserId(user.id);
                                  setSelectedRole((user.role as 'admin' | 'moderator') || 'user');
                                  setAssignRoleDialogOpen(true);
                                }}>
                                  <Shield className="h-4 w-4 mr-2" />
                                  Assign Role
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {/* Mobile Card View */}
                <div className="md:hidden space-y-3">
                  {filteredUsers.map((user) => (
                    <div key={user.id} className="p-4 bg-muted/50 rounded-lg space-y-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="font-medium">{user.display_name || 'Unknown'}</div>
                          <div className="text-xs text-muted-foreground">{user.email}</div>
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => updateUserPlan(user.id, user.plan === 'pro' ? 'free' : 'pro')}>
                              <UserPlus className="h-4 w-4 mr-2" />
                              {user.plan === 'pro' ? 'Downgrade' : 'Upgrade'}
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => updateUserStatus(user.id, user.status === 'active' ? 'suspended' : 'active')}>
                              <Ban className="h-4 w-4 mr-2" />
                              {user.status === 'active' ? 'Suspend' : 'Reactivate'}
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => {
                              setSelectedUserId(user.id);
                              setSelectedRole((user.role as 'admin' | 'moderator') || 'user');
                              setAssignRoleDialogOpen(true);
                            }}>
                              <Shield className="h-4 w-4 mr-2" />
                              Assign Role
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Badge variant={user.plan === 'pro' ? 'default' : 'secondary'}>
                          {user.plan}
                        </Badge>
                        <Badge variant={user.status === 'active' ? 'outline' : 'destructive'}>
                          {user.status}
                        </Badge>
                        {user.role && (
                          <Badge 
                            variant="default" 
                            className={user.role === 'admin' ? 'bg-purple-500' : 'bg-blue-500'}
                          >
                            {user.role}
                          </Badge>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Joined: {new Date(user.created_at).toLocaleDateString()}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
