'use client';

import PageHeader from '@/components/common/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Lightbulb, Zap, Loader2, PlusCircle, ListChecks } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { suggestLearningMilestones, type SuggestLearningMilestonesInput } from '@/ai/flows/suggest-milestones';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';

export default function AiMilestoneSuggestionsPage() {
  const [goal, setGoal] = useState('');
  const [currentSkills, setCurrentSkills] = useState('');
  const [learningPreferences, setLearningPreferences] = useState('');
  const [suggestedMilestones, setSuggestedMilestones] = useState<string[]>([]);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const { toast } = useToast();

  const handleSuggestMilestones = async (e: FormEvent) => {
    e.preventDefault();
    if (!goal) {
      toast({ title: "Goal is required", description: "Please enter your learning goal.", variant: "destructive" });
      return;
    }
    setIsLoadingSuggestions(true);
    setSuggestedMilestones([]);
    try {
      const input: SuggestLearningMilestonesInput = { goal, currentSkills, learningPreferences };
      const result = await suggestLearningMilestones(input);
      setSuggestedMilestones(result.milestones);
      toast({ title: "Milestones Suggested!", description: "AI has generated some milestone ideas for you." });
    } catch (error) {
      console.error('Error suggesting milestones:', error);
      toast({ title: "Suggestion Failed", description: "Could not generate milestone suggestions. Please try again.", variant: "destructive" });
    } finally {
      setIsLoadingSuggestions(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="AI Milestone Suggestions"
        description="Let AI help you break down your learning goals into manageable milestones."
        actions={
          <Link href="/roadmap" passHref>
            <Button variant="outline">
              <ListChecks className="mr-2 h-4 w-4" /> View Full Roadmap
            </Button>
          </Link>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Lightbulb className="mr-2 h-5 w-5 text-primary" />
              Define Your Goal
            </CardTitle>
            <CardDescription>Tell us what you want to learn.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSuggestMilestones} className="space-y-4">
              <div>
                <Label htmlFor="goal">Primary Learning Goal</Label>
                <Input id="goal" value={goal} onChange={(e) => setGoal(e.target.value)} placeholder="e.g., Become a proficient data scientist" required />
              </div>
              <div>
                <Label htmlFor="currentSkills">Current Skills (Optional)</Label>
                <Textarea id="currentSkills" value={currentSkills} onChange={(e) => setCurrentSkills(e.target.value)} placeholder="e.g., Python basics, some statistics knowledge" />
              </div>
              <div>
                <Label htmlFor="learningPreferences">Learning Preferences (Optional)</Label>
                <Textarea id="learningPreferences" value={learningPreferences} onChange={(e) => setLearningPreferences(e.target.value)} placeholder="e.g., Hands-on projects, video tutorials, structured courses" />
              </div>
              <Button type="submit" className="w-full" disabled={isLoadingSuggestions}>
                {isLoadingSuggestions ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Zap className="mr-2 h-4 w-4" />}
                Suggest Milestones
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card className="flex flex-col">
          <CardHeader>
            <CardTitle>Suggested Milestones</CardTitle>
            <CardDescription>Here are some AI-generated milestones based on your input.</CardDescription>
          </CardHeader>
          <CardContent className="flex-grow">
            {isLoadingSuggestions && (
              <div className="flex justify-center items-center h-full">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            )}
            {!isLoadingSuggestions && suggestedMilestones.length === 0 && (
              <div className="text-center text-muted-foreground py-10">
                <Lightbulb className="mx-auto h-12 w-12 opacity-50 mb-4" />
                <p>Your suggested milestones will appear here once generated.</p>
                <p className="text-sm">Fill in your goal and click "Suggest Milestones".</p>
              </div>
            )}
            {!isLoadingSuggestions && suggestedMilestones.length > 0 && (
              <ul className="space-y-3">
                {suggestedMilestones.map((suggestion, index) => (
                  <li key={index} className="flex items-start justify-between p-3 border rounded-md bg-card hover:bg-accent/10 transition-colors">
                    <p className="text-sm flex-grow pr-2">{index + 1}. {suggestion}</p>
                    <Button size="sm" variant="ghost" onClick={() => alert(`Add "${suggestion}" to roadmap (Not implemented)`)} title="Add to Roadmap">
                      <PlusCircle className="h-4 w-4" />
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
           {suggestedMilestones.length > 0 && (
            <CardContent className="border-t pt-4">
                 <Link href="/roadmap" passHref>
                    <Button className="w-full">
                        <ListChecks className="mr-2 h-4 w-4" /> Add to My Roadmap (Not implemented)
                    </Button>
                </Link>
            </CardContent>
           )}
        </Card>
      </div>
    </div>
  );
}
