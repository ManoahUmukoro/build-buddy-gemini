import { useState, useEffect, useRef } from 'react';
import { 
  Settings, Download, Upload, Key, Check, X, Eye, EyeOff, User, Bell, 
  Palette, Globe, Trash2, AlertTriangle, Loader2, Camera, Mail, Crown, Clock, LogOut
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/useProfile';
import { useUserSettings } from '@/hooks/useUserSettings';
import { supabase } from '@/integrations/supabase/client';
import { 
  scheduleDailyCheckin, 
  requestNotificationPermission, 
  showTestNotification,
  initializeNotifications 
} from '@/lib/notificationScheduler';

interface SettingsTabProps {
  onBackup: () => void;
  onRestore: (e: React.ChangeEvent<HTMLInputElement>) => void;
  geminiApiKey: string;
  onSaveApiKey: (key: string) => void;
}

export function SettingsTab({ onBackup, onRestore, geminiApiKey, onSaveApiKey }: SettingsTabProps) {
  const { user } = useAuth();
  const { profile, loading: profileLoading } = useProfile();
  const { 
    preferences, 
    notifications, 
    loading: settingsLoading, 
    updatePreferences, 
    updateNotifications 
  } = useUserSettings();
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  
  const [displayName, setDisplayName] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);
  
  const [apiKeyInput, setApiKeyInput] = useState(geminiApiKey);
  const [showApiKey, setShowApiKey] = useState(false);
  const [savingApiKey, setSavingApiKey] = useState(false);
  
  const [savingSettings, setSavingSettings] = useState(false);
  
  const [userPlan, setUserPlan] = useState<string>('free');
  const [dailyCheckinEnabled, setDailyCheckinEnabled] = useState(false);
  const [settingUpNotifications, setSettingUpNotifications] = useState(false);

  // Initialize notifications on mount
  useEffect(() => {
    initializeNotifications();
    
    // Check if daily checkin is enabled
    const schedule = localStorage.getItem('lifeos_daily_checkin_schedule');
    if (schedule) {
      try {
        const parsed = JSON.parse(schedule);
        setDailyCheckinEnabled(parsed.enabled);
      } catch (e) {
        // Ignore
      }
    }
  }, []);

  // Load profile data
  useEffect(() => {
    if (profile) {
      setDisplayName(profile.display_name);
      setAvatarUrl((profile as any).avatar_url || null);
    }
  }, [profile]);

  // Load user plan
  useEffect(() => {
    async function loadPlan() {
      if (!user) return;
      
      try {
        const { data: planRes } = await supabase
          .from('user_plans')
          .select('plan')
          .eq('user_id', user.id)
          .maybeSingle();

        if (planRes) {
          setUserPlan(planRes.plan);
        }
      } catch (err) {
        console.error('Error loading plan:', err);
      }
    }

    loadPlan();
  }, [user]);

  // Save API key
  const handleSaveApiKey = async () => {
    setSavingApiKey(true);
    try {
      await onSaveApiKey(apiKeyInput);
      toast.success('API key saved successfully');
    } catch (error) {
      toast.error('Failed to save API key');
    } finally {
      setSavingApiKey(false);
    }
  };

  const handleRemoveApiKey = async () => {
    setSavingApiKey(true);
    try {
      await onSaveApiKey('');
      setApiKeyInput('');
      toast.success('API key removed');
    } catch (error) {
      toast.error('Failed to remove API key');
    } finally {
      setSavingApiKey(false);
    }
  };

  // Save profile
  const handleSaveProfile = async () => {
    if (!user) return;
    setSavingProfile(true);
    
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ display_name: displayName, updated_at: new Date().toISOString() })
        .eq('user_id', user.id);

      if (error) throw error;
      toast.success('Profile updated');
    } catch (err) {
      console.error('Error updating profile:', err);
      toast.error('Failed to update profile');
    } finally {
      setSavingProfile(false);
    }
  };

  // Handle avatar upload
  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    setUploadingAvatar(true);
    try {
      const fileExt = file.name.split('.').pop();
      const filePath = `${user.id}/avatar.${fileExt}`;

      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      // Update profile with avatar URL
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl, updated_at: new Date().toISOString() })
        .eq('user_id', user.id);

      if (updateError) throw updateError;

      setAvatarUrl(publicUrl);
      toast.success('Profile picture updated!');
    } catch (err) {
      console.error('Error uploading avatar:', err);
      toast.error('Failed to upload profile picture');
    } finally {
      setUploadingAvatar(false);
    }
  };

  // Request browser notifications
  const handleRequestPush = async () => {
    if (!('Notification' in window)) {
      toast.error('Your browser does not support notifications');
      return;
    }

    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      await updateNotifications({ push_enabled: true });
      toast.success('Push notifications enabled!');
      new Notification('LifeOS', { body: 'Notifications are now enabled!', icon: '/lifeos-logo.png' });
    } else {
      toast.error('Please enable notifications in your browser settings');
    }
  };

  // Enable daily check-in notifications
  const handleEnableDailyCheckin = async () => {
    setSettingUpNotifications(true);
    try {
      const success = await scheduleDailyCheckin();
      if (success) {
        setDailyCheckinEnabled(true);
        await showTestNotification();
        toast.success('Daily reminders enabled! You\'ll receive a check-in at 8:00 PM daily.');
      } else {
        // On iOS, need manual permission
        const permission = await requestNotificationPermission();
        if (permission === 'denied') {
          toast.error('Please enable notifications in your device settings, then try again.');
        } else if (permission === 'default') {
          toast.info('Please tap "Allow" when prompted to enable notifications.');
        }
      }
    } catch (error) {
      console.error('Error enabling daily checkin:', error);
      toast.error('Failed to enable notifications. Please try again.');
    } finally {
      setSettingUpNotifications(false);
    }
  };

  // Disable daily check-in
  const handleDisableDailyCheckin = () => {
    localStorage.removeItem('lifeos_daily_checkin_schedule');
    setDailyCheckinEnabled(false);
    toast.success('Daily reminders disabled.');
  };

  // Account reset
  const handleResetAccount = async () => {
    if (!user) return;
    
    try {
      // Delete user data but keep profile
      await Promise.all([
        supabase.from('tasks').delete().eq('user_id', user.id),
        supabase.from('transactions').delete().eq('user_id', user.id),
        supabase.from('journal_entries').delete().eq('user_id', user.id),
        supabase.from('habits').delete().eq('user_id', user.id),
        supabase.from('systems').delete().eq('user_id', user.id),
        supabase.from('savings_goals').delete().eq('user_id', user.id),
      ]);
      
      toast.success('Account data has been reset');
    } catch (err) {
      console.error('Error resetting account:', err);
      toast.error('Failed to reset account');
    }
  };

  const isApiKeyConnected = !!geminiApiKey;

  if (settingsLoading || profileLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-4 px-2 md:px-0 mt-4 md:mt-6 pb-24 md:pb-0">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-foreground">Settings</h2>
        <p className="text-muted-foreground text-sm">Manage your preferences and account</p>
      </div>

      <Tabs defaultValue="account" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4 h-auto">
          <TabsTrigger value="account" className="text-xs md:text-sm py-2">Account</TabsTrigger>
          <TabsTrigger value="preferences" className="text-xs md:text-sm py-2">Preferences</TabsTrigger>
          <TabsTrigger value="notifications" className="text-xs md:text-sm py-2">Notifications</TabsTrigger>
          <TabsTrigger value="data" className="text-xs md:text-sm py-2">Data</TabsTrigger>
        </TabsList>

        {/* Account Tab */}
        <TabsContent value="account" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User size={18} />
                Profile
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Avatar */}
              <div className="flex items-center gap-4">
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className="relative w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center cursor-pointer group overflow-hidden"
                >
                  {uploadingAvatar ? (
                    <Loader2 className="animate-spin text-primary" size={24} />
                  ) : avatarUrl ? (
                    <img src={avatarUrl} alt="Profile" className="w-full h-full object-cover" />
                  ) : (
                    <User className="text-primary" size={32} />
                  )}
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <Camera className="text-white" size={20} />
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarChange}
                    className="hidden"
                  />
                </div>
                <div>
                  <p className="font-medium">Profile Picture</p>
                  <p className="text-xs text-muted-foreground">Click to upload</p>
                </div>
              </div>

              {/* Name */}
              <div className="space-y-2">
                <Label>Display Name</Label>
                <Input
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Your name"
                />
              </div>

              {/* Email (read-only) */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Mail size={14} />
                  Email
                </Label>
                <Input value={user?.email || ''} disabled className="bg-muted" />
                <p className="text-xs text-muted-foreground">Email cannot be changed</p>
              </div>

              <Button onClick={handleSaveProfile} disabled={savingProfile || displayName === profile?.display_name}>
                {savingProfile ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Check size={16} className="mr-2" />}
                Save Profile
              </Button>

              <div className="pt-4 border-t border-border">
                <Button 
                  variant="outline" 
                  onClick={async () => {
                    await supabase.auth.signOut();
                    window.location.href = '/auth';
                  }}
                  className="w-full"
                >
                  <LogOut size={16} className="mr-2" />
                  Sign Out
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Plan */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Crown size={18} />
                Subscription
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium capitalize">{userPlan} Plan</p>
                  <p className="text-xs text-muted-foreground">
                    {userPlan === 'pro' ? 'Full access to all features' : 'Upgrade for more features'}
                  </p>
                </div>
                {userPlan !== 'pro' && (
                  <Button variant="default" size="sm" asChild>
                    <a href="/pricing">Upgrade</a>
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* AI Configuration */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Key size={18} />
                AI Configuration
              </CardTitle>
              <CardDescription>Connect your Gemini API key for AI features</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-2 text-sm">
                <div className={`w-2 h-2 rounded-full ${isApiKeyConnected ? 'bg-green-500' : 'bg-muted-foreground'}`} />
                <span className={isApiKeyConnected ? 'text-green-600' : 'text-muted-foreground'}>
                  {isApiKeyConnected ? 'Connected' : 'Not connected'}
                </span>
              </div>

              <div className="relative">
                <Input
                  type={showApiKey ? 'text' : 'password'}
                  value={apiKeyInput}
                  onChange={(e) => setApiKeyInput(e.target.value)}
                  placeholder="Enter your Gemini API key"
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowApiKey(!showApiKey)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showApiKey ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>

              <div className="flex gap-2">
                <Button onClick={handleSaveApiKey} disabled={savingApiKey || !apiKeyInput || apiKeyInput === geminiApiKey} className="flex-1">
                  <Check size={14} className="mr-2" />
                  Save Key
                </Button>
                {isApiKeyConnected && (
                  <Button variant="outline" onClick={handleRemoveApiKey} disabled={savingApiKey}>
                    <X size={14} className="mr-2" />
                    Remove
                  </Button>
                )}
              </div>

              <p className="text-xs text-muted-foreground bg-muted p-3 rounded-lg">
                💡 Get your free API key from{' '}
                <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                  Google AI Studio
                </a>
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Preferences Tab */}
        <TabsContent value="preferences" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Palette size={18} />
                Display
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Theme</Label>
                <Select 
                  value={preferences.theme} 
                  onValueChange={(v) => updatePreferences({ theme: v as 'light' | 'dark' | 'system' })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="light">Light</SelectItem>
                    <SelectItem value="dark">Dark</SelectItem>
                    <SelectItem value="system">System</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">Theme changes apply immediately</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe size={18} />
                Regional
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Currency</Label>
                <Select 
                  value={preferences.currency} 
                  onValueChange={(v) => updatePreferences({ currency: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="₦">₦ Naira (NGN)</SelectItem>
                    <SelectItem value="$">$ Dollar (USD)</SelectItem>
                    <SelectItem value="€">€ Euro (EUR)</SelectItem>
                    <SelectItem value="£">£ Pound (GBP)</SelectItem>
                    <SelectItem value="₹">₹ Rupee (INR)</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">Currency updates throughout Finance</p>
              </div>

            </CardContent>
          </Card>
        </TabsContent>

        {/* Notifications Tab */}
        <TabsContent value="notifications" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell size={18} />
                Notification Preferences
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Email Notifications</p>
                  <p className="text-xs text-muted-foreground">Receive updates via email</p>
                </div>
                <Switch
                  checked={notifications.email_enabled}
                  onCheckedChange={(v) => updateNotifications({ email_enabled: v })}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Push Notifications</p>
                  <p className="text-xs text-muted-foreground">Browser notifications for reminders</p>
                </div>
                <div className="flex items-center gap-2">
                  {!notifications.push_enabled && (
                    <Button variant="outline" size="sm" onClick={handleRequestPush}>
                      Enable
                    </Button>
                  )}
                  <Switch
                    checked={notifications.push_enabled}
                    onCheckedChange={(v) => updateNotifications({ push_enabled: v })}
                    disabled={!('Notification' in window) || Notification.permission !== 'granted'}
                  />
                </div>
              </div>

              {/* Daily Check-in Reminder - Critical for iOS */}
              <div className="p-4 bg-primary/5 rounded-xl border border-primary/20">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <Clock size={16} className="text-primary" />
                      <p className="font-medium">Daily Check-in Reminder</p>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Receive a daily reminder at 8:00 PM to check your Systems & Goals
                    </p>
                  </div>
                  <div className="ml-4">
                    {dailyCheckinEnabled ? (
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={handleDisableDailyCheckin}
                        className="text-destructive border-destructive/50 hover:bg-destructive/10"
                      >
                        Disable
                      </Button>
                    ) : (
                      <Button 
                        variant="default" 
                        size="sm" 
                        onClick={handleEnableDailyCheckin}
                        disabled={settingUpNotifications}
                      >
                        {settingUpNotifications ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          'Enable'
                        )}
                      </Button>
                    )}
                  </div>
                </div>
                {dailyCheckinEnabled && (
                  <p className="text-xs text-success mt-2 flex items-center gap-1">
                    <Check size={12} /> Active - You'll receive reminders at 8:00 PM
                  </p>
                )}
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Daily Digest</p>
                  <p className="text-xs text-muted-foreground">Morning summary of your day</p>
                </div>
                <Switch
                  checked={notifications.daily_digest}
                  onCheckedChange={(v) => updateNotifications({ daily_digest: v })}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Weekly Digest</p>
                  <p className="text-xs text-muted-foreground">Weekly progress report</p>
                </div>
                <Switch
                  checked={notifications.weekly_digest}
                  onCheckedChange={(v) => updateNotifications({ weekly_digest: v })}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Data Tab */}
        <TabsContent value="data" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings size={18} />
                Data Vault
              </CardTitle>
              <CardDescription>Export or import your data</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <button 
                  onClick={onBackup} 
                  className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-border rounded-xl hover:border-primary hover:bg-primary/5 transition-all group"
                >
                  <Download size={24} className="text-primary mb-2 group-hover:scale-110 transition-transform" />
                  <span className="font-medium text-sm">Backup</span>
                  <span className="text-xs text-muted-foreground">Download JSON</span>
                </button>
                
                <label className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-border rounded-xl hover:border-green-500 hover:bg-green-500/5 transition-all group cursor-pointer">
                  <Upload size={24} className="text-green-500 mb-2 group-hover:scale-110 transition-transform" />
                  <span className="font-medium text-sm">Restore</span>
                  <span className="text-xs text-muted-foreground">Upload JSON</span>
                  <input type="file" accept=".json" onChange={onRestore} className="hidden" />
                </label>
              </div>
            </CardContent>
          </Card>

          <Card className="border-destructive/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-destructive">
                <AlertTriangle size={18} />
                Danger Zone
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" className="w-full border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground">
                    <Trash2 size={16} className="mr-2" />
                    Reset Account Data
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will permanently delete all your tasks, transactions, journal entries, and goals. Your profile and settings will be preserved.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleResetAccount} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                      Yes, Reset Everything
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
              <p className="text-xs text-muted-foreground text-center">
                This action cannot be undone. Make a backup first.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
