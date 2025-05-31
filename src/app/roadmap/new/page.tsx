
'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import PageHeader from '@/components/common/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Target, Save } from 'lucide-react';

export default function NewRoadmapGoalPage() {
  const [goalTitle, setGoalTitle] = useState('');
  const [goalDescription, setGoalDescription] = useState('');
  const router = useRouter();
  const { toast } = useToast();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!goalTitle.trim()) {
      toast({ title: 'Goal title is required', variant: 'destructive' });
      return;
    }
    // In a real app, this goal would typically be saved (e.g., to context or Firebase).
    // For now, we'll pass it to the main roadmap page via query params.
    toast({ title: 'New Goal Set!', description: `Your goal "${goalTitle}" will be used on the Roadmap page.` });
    
    router.push(`/roadmap?newGoal=${encodeURIComponent(goalTitle)}`);
  };

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
              />
            </div>
            <Button type="submit" className="w-full">
              <Save className="mr-2 h-4 w-4" /> Set Goal & Continue to Roadmap
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
