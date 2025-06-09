
'use client';

import { useState, type FormEvent, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import PageHeader from '@/components/common/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { Target, Save, Loader2, AlertCircle } from 'lucide-react';
import { db } from '@/lib/firebase';
import { doc, setDoc, addDoc, collection, serverTimestamp } from 'firebase/firestore';

export default function NewRoadmapGoalPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const { toast } = useToast();

  const [goalTitle, setGoalTitle] = useState('');
  const [goalDescription, setGoalDescription] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  
  useEffect(() => {
    if (!authLoading && !user) {
      toast({ title: "Authentication Required", description: "Please log in to set a new goal.", variant: "destructive" });
      router.push(`/login?redirect=${pathname}`);
    }
  }, [user, authLoading, router, pathname, toast]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!user) {
      toast({ title: "Not Authenticated", description: "You must be logged in to set a goal.", variant: "destructive" });
      return;
    }
    if (!goalTitle.trim()) {
      toast({ title: 'Goal title is required', variant: 'destructive' });
      return;
    }
    setIsSaving(true);
    try {
      // Save to new learningGoals subcollection
      const learningGoalsColRef = collection(db, 'users', user.uid, 'learningGoals');
      const newGoalRef = await addDoc(learningGoalsColRef, {
        title: goalTitle.trim(),
        description: goalDescription.trim(),
        isArchived: false,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      // Set this new goal as active
      const profileRef = doc(db, 'users', user.uid, 'profile', 'main');
      await setDoc(profileRef, { 
        activeLearningGoalId: newGoalRef.id 
      }, { merge: true });
      
      toast({ title: 'New Goal Set!', description: `Your goal "${goalTitle}" has been saved and set as active.` });
      router.push(`/roadmap`);
    } catch (error) {
      console.error("Error setting goal: ", error);
      toast({ title: 'Error Setting Goal', description: (error as Error).message, variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  };

  if (authLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4 text-center">
        <AlertCircle className="w-16 h-16 text-destructive mb-4" />
        <h1 className="text-2xl font-bold mb-2">Access Denied</h1>
        <p className="text-muted-foreground mb-4">You need to be logged in to set a new goal.</p>
        <Button onClick={() => router.push(`/login?redirect=${pathname}`)}>Go to Login</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Set a New Learning Goal"
        description="Define your primary objective. You can add milestones and get AI suggestions on the Roadmap page."
      />
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Target className="mr-2 h-5 w-5 text-primary" />
            What do you want to achieve?
          </CardTitle>
          <CardDescription>
            Clearly defining your goal is the first step to success.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="goal-title">Goal Title</Label>
              <Input
                id="goal-title"
                value={goalTitle}
                onChange={(e) => setGoalTitle(e.target.value)}
                placeholder="e.g., Master Quantum Computing"
                required
                disabled={isSaving}
              />
            </div>
            <div>
              <Label htmlFor="goal-description">Goal Description (Optional)</Label>
              <Textarea
                id="goal-description"
                value={goalDescription}
                onChange={(e) => setGoalDescription(e.target.value)}
                placeholder="Add some details about what this goal entails or why it's important to you."
                rows={3}
                disabled={isSaving}
              />
            </div>
            <Button type="submit" className="w-full" disabled={isSaving}>
              {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              {isSaving ? 'Saving...' : 'Set Goal & View Roadmap'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
