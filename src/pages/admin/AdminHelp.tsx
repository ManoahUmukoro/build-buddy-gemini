import { useState, useEffect } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
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
import { Save, Loader2, Plus, Edit, Trash2, GripVertical } from 'lucide-react';

interface HelpContent {
  id: string;
  title: string;
  content: string;
  category: string;
  order_index: number;
  is_published: boolean;
}

const categories = ['general', 'dashboard', 'systems', 'finance', 'journal', 'account'];

export default function AdminHelp() {
  const [content, setContent] = useState<HelpContent[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editItem, setEditItem] = useState<HelpContent | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    fetchContent();
  }, []);

  async function fetchContent() {
    try {
      const { data, error } = await supabase
        .from('help_content')
        .select('*')
        .order('category')
        .order('order_index');

      if (error) throw error;
      setContent(data || []);
    } catch (err) {
      console.error('Error fetching content:', err);
      toast.error('Failed to load help content');
    } finally {
      setLoading(false);
    }
  }

  async function saveItem() {
    if (!editItem) return;

    try {
      setSaving(true);

      if (editItem.id) {
        const { error } = await supabase
          .from('help_content')
          .update({
            title: editItem.title,
            content: editItem.content,
            category: editItem.category,
            order_index: editItem.order_index,
            is_published: editItem.is_published,
          })
          .eq('id', editItem.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('help_content')
          .insert({
            title: editItem.title,
            content: editItem.content,
            category: editItem.category,
            order_index: editItem.order_index,
            is_published: editItem.is_published,
          });

        if (error) throw error;
      }

      toast.success('Help content saved');
      setDialogOpen(false);
      setEditItem(null);
      fetchContent();
    } catch (err) {
      console.error('Error saving content:', err);
      toast.error('Failed to save content');
    } finally {
      setSaving(false);
    }
  }

  async function deleteItem(id: string) {
    if (!confirm('Are you sure you want to delete this help article?')) return;

    try {
      const { error } = await supabase
        .from('help_content')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success('Help content deleted');
      fetchContent();
    } catch (err) {
      console.error('Error deleting content:', err);
      toast.error('Failed to delete content');
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
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Help Center Content</h1>
            <p className="text-muted-foreground">Manage help articles shown to users</p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button
                onClick={() => setEditItem({
                  id: '',
                  title: '',
                  content: '',
                  category: 'general',
                  order_index: content.length,
                  is_published: true,
                })}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Article
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>{editItem?.id ? 'Edit Article' : 'New Article'}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="article-title">Title</Label>
                    <Input
                      id="article-title"
                      value={editItem?.title || ''}
                      onChange={(e) => setEditItem(prev => prev ? { ...prev, title: e.target.value } : null)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="article-category">Category</Label>
                    <Select
                      value={editItem?.category || 'general'}
                      onValueChange={(value) => setEditItem(prev => prev ? { ...prev, category: value } : null)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map((cat) => (
                          <SelectItem key={cat} value={cat} className="capitalize">
                            {cat}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="article-content">Content</Label>
                  <Textarea
                    id="article-content"
                    rows={10}
                    value={editItem?.content || ''}
                    onChange={(e) => setEditItem(prev => prev ? { ...prev, content: e.target.value } : null)}
                    placeholder="Supports markdown formatting..."
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Switch
                      id="article-published"
                      checked={editItem?.is_published ?? true}
                      onCheckedChange={(checked) => setEditItem(prev => prev ? { ...prev, is_published: checked } : null)}
                    />
                    <Label htmlFor="article-published">Published</Label>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
                    <Button onClick={saveItem} disabled={saving}>
                      {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                      Save
                    </Button>
                  </div>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <Card>
          <CardContent className="pt-6">
            {content.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No help articles yet. Create your first article to get started.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {content.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">{item.title}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="capitalize">
                          {item.category}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={item.is_published ? 'default' : 'secondary'}>
                          {item.is_published ? 'Published' : 'Draft'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setEditItem(item);
                              setDialogOpen(true);
                            }}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteItem(item.id)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
