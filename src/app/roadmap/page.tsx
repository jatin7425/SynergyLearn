
'use client';

import PageHeader from '@/components/common/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { PlusCircle, Lightbulb, Zap, CheckSquare, Loader2, Plus } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { suggestLearningMilestones, type SuggestLearningMilestonesInput } from '@/ai/flows/suggest-milestones';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Milestone {
  id: string;
  title: string;
  description: string;
  status: 'todo' | 'inprogress' | 'done';
}

const initialMilestones: Milestone[] = [
  { id: '1', title: 'Understand Core Concepts', description: 'Learn the fundamentals of the subject.', status: 'done' },
  { id: '2', title: 'Build First Project', description: 'Apply knowledge to a hands-on project.', status: 'inprogress' },
  { id: '3', title: 'Advanced Topics', description: 'Explore more complex areas.', status: 'todo' },
];

export default function RoadmapPage() {
  const [goal, setGoal] = useState('');
  const [currentSkills, setCurrentSkills] = useState('');
  const [learningPreferences, setLearningPreferences] = useState('');
  const [suggestedMilestones, setSuggestedMilestones] = useState<string[]>([]);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const { toast } = useToast();

  const [milestones, setMilestones] = useState<Milestone[]>(initialMilestones);
  const [showAddMilestoneDialog, setShowAddMilestoneDialog] = useState(false);
  const [newMilestoneTitle, setNewMilestoneTitle] = useState('');
  const [newMilestoneDescription, setNewMilestoneDescription] = useState('');

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

  const addSuggestedMilestoneToRoadmap = (title: string) => {
    const newMilestone: Milestone = {
      id: String(Date.now()),
      title: title,
      description: "AI Suggested Milestone",
      status: 'todo',
    };
    setMilestones(prev => [...prev, newMilestone]);
    setSuggestedMilestones(prev => prev.filter(m => m !== title));
    toast({ title: "Milestone Added", description: `"${title}" added to your roadmap.` });
  };

  const handleAddCustomMilestone = (e: FormEvent) => {
    e.preventDefault();
    if (!newMilestoneTitle.trim()) {
      toast({ title: "Title is required", description: "Please enter a title for your milestone.", variant: "destructive"});
      return;
    }
    const newMilestone: Milestone = {
      id: String(Date.now()),
      title: newMilestoneTitle,
      description: newMilestoneDescription,
      status: 'todo',
    };
    setMilestones(prev => [...prev, newMilestone]);
    toast({ title: "Milestone Added", description: `"${newMilestoneTitle}" added to your roadmap.` });
    setNewMilestoneTitle('');
    setNewMilestoneDescription('');
    setShowAddMilestoneDialog(false);
  };

  const handleMilestoneStatusChange = (milestoneId: string, newStatus: Milestone['status']) => {
    setMilestones(prevMilestones =>
      prevMilestones.map(m =>
        m.id === milestoneId ? { ...m, status: newStatus } : m
      )
    );
    toast({ title: "Status Updated", description: `Milestone status changed to "${newStatus}".`});
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Learning Roadmap"
        description="Plan and track your learning milestones."
        actions={
          <Dialog open={showAddMilestoneDialog} onOpenChange={setShowAddMilestoneDialog}>
            <DialogTrigger asChild>
              <Button>
                <PlusCircle className="mr-2 h-4 w-4" /> Add Custom Milestone
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Add Custom Milestone</DialogTitle>
                <DialogDescription>
                  Define a new milestone for your learning roadmap.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleAddCustomMilestone}>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="milestone-title" className="text-right">
                      Title
                    </Label>
                    <Input
                      id="milestone-title"
                      value={newMilestoneTitle}
                      onChange={(e) => setNewMilestoneTitle(e.target.value)}
                      className="col-span-3"
                      required
                    />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="milestone-description" className="text-right">
                      Description
                    </Label>
                    <Textarea
                      id="milestone-description"
                      value={newMilestoneDescription}
                      onChange={(e) => setNewMilestoneDescription(e.target.value)}
                      className="col-span-3"
                      placeholder="Optional: add more details"
                    />
                  </div>
                </div>
                <DialogFooter>
                  <DialogClose asChild>
                    <Button type="button" variant="outline">Cancel</Button>
                  </DialogClose>
                  <Button type="submit">Add Milestone</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        }
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Current Milestones</CardTitle>
              <CardDescription>Your planned learning path.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {milestones.map((milestone) => (
                <Card key={milestone.id} className="p-4 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-semibold text-lg">{milestone.title}</h3>
                      <p className="text-sm text-muted-foreground mt-1">{milestone.description}</p>
                    </div>
                    <Select
                      value={milestone.status}
                      onValueChange={(value: Milestone['status']) => handleMilestoneStatusChange(milestone.id, value)}
                    >
                      <SelectTrigger className="w-[130px] text-xs">
                        <SelectValue placeholder="Set status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="todo">Todo</SelectItem>
                        <SelectItem value="inprogress">In Progress</SelectItem>
                        <SelectItem value="done">Done</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="mt-3 flex gap-2">
                     <Button variant="outline" size="sm" onClick={() => alert(`Edit ${milestone.title} (Not implemented)`)}>Edit</Button>
                     {/* Removed mark as, using select now */}
                  </div>
                </Card>
              ))}
              {milestones.length === 0 && (
                <p className="text-muted-foreground text-center py-4">No milestones yet. Add some or get AI suggestions!</p>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-1 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Lightbulb className="mr-2 h-5 w-5 text-primary" />
                AI Milestone Suggestions
              </CardTitle>
              <CardDescription>Get AI-powered suggestions for your learning path.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSuggestMilestones} className="space-y-4">
                <div>
                  <Label htmlFor="goal">Learning Goal</Label>
                  <Input id="goal" value={goal} onChange={(e) => setGoal(e.target.value)} placeholder="e.g., Master Next.js" required />
                </div>
                <div>
                  <Label htmlFor="currentSkills">Current Skills (Optional)</Label>
                  <Textarea id="currentSkills" value={currentSkills} onChange={(e) => setCurrentSkills(e.target.value)} placeholder="e.g., Basic HTML, CSS, JavaScript" />
                </div>
                <div>
                  <Label htmlFor="learningPreferences">Learning Preferences (Optional)</Label>
                  <Textarea id="learningPreferences" value={learningPreferences} onChange={(e) => setLearningPreferences(e.target.value)} placeholder="e.g., Prefer project-based learning, visual examples" />
                </div>
                <Button type="submit" className="w-full" disabled={isLoadingSuggestions}>
                  {isLoadingSuggestions ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Zap className="mr-2 h-4 w-4" />}
                  Suggest Milestones
                </Button>
              </form>
            </CardContent>
          </Card>

          {suggestedMilestones.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Suggested Milestones</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {suggestedMilestones.map((suggestion, index) => (
                  <div key={index} className="flex items-center justify-between p-2 border rounded-md bg-card hover:bg-accent/10">
                    <p className="text-sm flex-grow pr-2">{suggestion}</p>
                    <Button size="sm" variant="ghost" onClick={() => addSuggestedMilestoneToRoadmap(suggestion)} title="Add to Roadmap">
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
