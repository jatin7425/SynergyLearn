
'use client';

import PageHeader from '@/components/common/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { User, Bell, Palette, Brain, Lock, Save, Bot, Loader2 } from 'lucide-react'; // Added Bot, Loader2
import { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { ensureAIHelperProfileExists } from '@/lib/data-setup'; // Import the new function

export default function SettingsPage() {
  const { toast } = useToast();
  const [learningStyle, setLearningStyle] = useState('visual');
  const [preferredTopics, setPreferredTopics] = useState('Technology, Science');
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [isProcessingAIProfile, setIsProcessingAIProfile] = useState(false);

  const [mounted, setMounted] = useState(false);
  const [currentTheme, setCurrentTheme] = useState<'light' | 'dark'>('light');

  useEffect(() => {
    setMounted(true);
    const storedTheme = localStorage.getItem('theme') as 'light' | 'dark' | null;
    const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    setCurrentTheme(storedTheme || systemTheme);
  }, []);

  useEffect(() => {
    if (mounted) {
      if (currentTheme === 'dark') {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
      localStorage.setItem('theme', currentTheme);
    }
  }, [currentTheme, mounted]);

  const handleSaveChanges = () => {
    // Simulate saving settings
    toast({
      title: "Settings Saved",
      description: "Your preferences have been updated.",
    });
    // Here you would also save learningStyle, preferredTopics, etc. to Firebase for the user
  };

  const handleThemeToggle = (checked: boolean) => {
    setCurrentTheme(checked ? 'dark' : 'light');
  };

  const handleEnsureAIProfile = async () => {
    setIsProcessingAIProfile(true);
    const result = await ensureAIHelperProfileExists();
    if (result.success) {
      toast({
        title: "AI Profile Processed",
        description: result.message,
      });
    } else {
      toast({
        title: "AI Profile Error",
        description: result.message,
        variant: "destructive",
      });
    }
    setIsProcessingAIProfile(false);
  };

  if (!mounted) {
    // Return a placeholder or null to prevent hydration mismatch.
    // The actual switch will render once mounted.
    return null; 
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Settings"
        description="Manage your account preferences and app settings."
         actions={
          <Button onClick={handleSaveChanges}>
            <Save className="mr-2 h-4 w-4" /> Save Changes
          </Button>
        }
      />

      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        <div className="md:col-span-1 space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center"><User className="mr-2 h-5 w-5 text-primary" /> Profile</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div>
                        <Label htmlFor="username">Username</Label>
                        <Input id="username" defaultValue="SynergyUser" />
                    </div>
                    <div>
                        <Label htmlFor="email">Email</Label>
                        <Input id="email" type="email" defaultValue="user@example.com" />
                    </div>
                    <Button variant="outline" className="w-full" onClick={() => toast({title: "Feature not implemented", description: "Password change is not yet available."})}>Change Password</Button>
                </CardContent>
            </Card>
             <Card>
                <CardHeader>
                    <CardTitle className="flex items-center"><Palette className="mr-2 h-5 w-5 text-primary" /> Appearance</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                     <div className="flex items-center justify-between">
                        <Label htmlFor="darkMode" className="flex flex-col space-y-1">
                            <span>Dark Mode</span>
                            <span className="font-normal leading-snug text-muted-foreground">
                                Toggle between light and dark themes.
                            </span>
                        </Label>
                        <Switch
                            id="darkMode"
                            checked={currentTheme === 'dark'}
                            onCheckedChange={handleThemeToggle}
                            aria-label="Toggle dark mode"
                        />
                    </div>
                </CardContent>
            </Card>
        </div>
        
        <div className="md:col-span-2 space-y-6">
            <Card>
                <CardHeader>
                <CardTitle className="flex items-center"><Brain className="mr-2 h-5 w-5 text-primary" /> AI & Learning Preferences</CardTitle>
                <CardDescription>Customize how AI assists your learning journey.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                <div>
                    <Label htmlFor="learningStyle">Preferred Learning Style</Label>
                    <Select value={learningStyle} onValueChange={setLearningStyle}>
                    <SelectTrigger id="learningStyle">
                        <SelectValue placeholder="Select your learning style" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="visual">Visual (Diagrams, Videos)</SelectItem>
                        <SelectItem value="auditory">Auditory (Lectures, Discussions)</SelectItem>
                        <SelectItem value="kinesthetic">Kinesthetic (Hands-on Practice)</SelectItem>
                        <SelectItem value="reading">Reading/Writing (Texts, Notes)</SelectItem>
                        <SelectItem value="balanced">Balanced / Not Sure</SelectItem>
                    </SelectContent>
                    </Select>
                </div>
                <div>
                    <Label htmlFor="preferredTopics">Preferred Topics/Interests</Label>
                    <Input
                    id="preferredTopics"
                    value={preferredTopics}
                    onChange={(e) => setPreferredTopics(e.target.value)}
                    placeholder="e.g., Web Development, AI, History"
                    />
                    <p className="text-xs text-muted-foreground mt-1">Helps AI suggest relevant content. Separate by commas.</p>
                </div>
                <div className="flex items-center space-x-2 pt-2">
                    <Checkbox id="aiPathGeneration" defaultChecked />
                    <Label htmlFor="aiPathGeneration" className="text-sm font-normal">
                    Enable AI Personalized Learning Path suggestions.
                    </Label>
                </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                <CardTitle className="flex items-center"><Bell className="mr-2 h-5 w-5 text-primary" /> Notifications</CardTitle>
                <CardDescription>Manage how you receive updates and reminders.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                <div className="flex items-center justify-between rounded-lg border p-4">
                    <Label htmlFor="notificationsEnabled" className="flex flex-col space-y-1">
                        <span>Enable App Notifications</span>
                        <span className="font-normal leading-snug text-muted-foreground">
                            Receive in-app alerts for deadlines, new content, etc.
                        </span>
                    </Label>
                    <Switch
                        id="notificationsEnabled"
                        checked={notificationsEnabled}
                        onCheckedChange={setNotificationsEnabled}
                        aria-label="Toggle app notifications"
                    />
                </div>
                <div className="flex items-center justify-between rounded-lg border p-4">
                    <Label htmlFor="emailNotifications" className="flex flex-col space-y-1">
                        <span>Email Notifications</span>
                         <span className="font-normal leading-snug text-muted-foreground">
                            Get important updates via email.
                        </span>
                    </Label>
                     <Switch
                        id="emailNotifications"
                        checked={emailNotifications}
                        onCheckedChange={setEmailNotifications}
                        aria-label="Toggle email notifications"
                    />
                </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center"><Lock className="mr-2 h-5 w-5 text-primary" /> Account & Security</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <Button variant="outline" className="w-full" onClick={() => toast({title: "Feature not implemented", description: "Subscription management is not yet available."})}>Manage Subscription (Not implemented)</Button>
                    <Button variant="outline" className="w-full" onClick={() => toast({title: "Placeholder", description: "Privacy Policy link would go here."})}>View Privacy Policy</Button>
                    <Button variant="destructive" className="w-full" onClick={() => toast({title: "Feature not implemented", description: "Account deletion is not yet available."})}>Delete Account (Not implemented)</Button>
                </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center"><Bot className="mr-2 h-5 w-5 text-primary" /> System Data Setup</CardTitle>
                <CardDescription>Initialize or update system-level data like AI profiles.</CardDescription>
              </CardHeader>
              <CardContent>
                <Button onClick={handleEnsureAIProfile} disabled={isProcessingAIProfile} className="w-full">
                  {isProcessingAIProfile ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Bot className="mr-2 h-4 w-4" />}
                  {isProcessingAIProfile ? 'Processing...' : 'Ensure AI Helper Profile'}
                </Button>
                <p className="text-xs text-muted-foreground mt-2">
                  This will create or update the AI Helper's profile in the 'systemAgents' collection in Firestore. It's safe to click multiple times.
                </p>
              </CardContent>
            </Card>
        </div>
      </div>
    </div>
  );
}
