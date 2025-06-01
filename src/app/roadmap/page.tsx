
'use client';

import PageHeader from '@/components/common/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { PlusCircle, Lightbulb, Zap, CheckSquare, Loader2, Plus, AlertCircle, Edit3, Trash2 } from 'lucide-react';
import { useState, type FormEvent, useEffect, useCallback } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { suggestLearningMilestones, type SuggestLearningMilestonesInput } from '@/ai/flows/suggest-milestones';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { db } from '@/lib/firebase';
import { 
  doc, getDoc, setDoc, 
  collection, query, onSnapshot, addDoc, updateDoc, deleteDoc, 
  serverTimestamp, Timestamp, orderBy 
} from 'firebase/firestore';
import { buttonVariants } from '@/components/ui/button';

interface Milestone {
  id: string;
  title: string;
  description: string;
  status: 'todo' | 'inprogress' | 'done';
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export default function RoadmapPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const { toast } = useToast();

  const [learningGoal, setLearningGoal] = useState(''); 
  const [currentSkills, setCurrentSkills] = useState(''); // For AI input, not persisted yet
  const [learningPreferences, setLearningPreferences] = useState(''); // For AI input, not persisted yet
  
  const [suggestedAIMilestones, setSuggestedAIMilestones] = useState<string[]>([]);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const searchParams = useSearchParams();

  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [showAddEditMilestoneDialog, setShowAddEditMilestoneDialog] = useState(false);
  const [editingMilestone, setEditingMilestone] = useState<Milestone | null>(null);
  const [milestoneTitle, setMilestoneTitle] = useState('');
  const [milestoneDescription, setMilestoneDescription] = useState('');
  const [milestoneStatus, setMilestoneStatus] = useState<Milestone['status']>('todo');


  // Fetch learning goal
  const fetchLearningGoal = useCallback(async () => {
    if (!user) return;
    setIsLoadingData(true);
    try {
      const profileRef = doc(db, 'users', user.uid, 'profile', 'main');
      const docSnap = await getDoc(profileRef);
      if (docSnap.exists() && docSnap.data()?.learningGoal) {
        setLearningGoal(docSnap.data()?.learningGoal);
      } else {
        setLearningGoal(''); // No goal set
      }
    } catch (error) {
      console.error("Error fetching learning goal: ", error);
      toast({ title: "Error", description: "Could not fetch learning goal.", variant: "destructive" });
    } finally {
        // setIsLoadingData(false) will be handled by milestone fetching
    }
  }, [user, toast]);

  useEffect(() => {
    if (!authLoading && !user) {
      toast({ title: "Authentication Required", description: "Please log in to access your roadmap.", variant: "destructive" });
      router.push(`/login?redirect=${pathname}`);
      return;
    }
    if (user) {
        fetchLearningGoal();
        // Fetch milestones
        const milestonesColRef = collection(db, 'users', user.uid, 'milestones');
        const q = query(milestonesColRef, orderBy('createdAt', 'asc'));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const fetchedMilestones: Milestone[] = [];
            snapshot.forEach(doc => fetchedMilestones.push({ id: doc.id, ...doc.data() } as Milestone));
            setMilestones(fetchedMilestones);
            setIsLoadingData(false);
        }, (error) => {
            console.error("Error fetching milestones: ", error);
            toast({ title: "Error", description: "Could not fetch milestones.", variant: "destructive" });
            setIsLoadingData(false);
        });
        return () => unsubscribe();
    }
  }, [user, authLoading, router, pathname, toast, fetchLearningGoal]);


  const handleSuggestMilestones = async (e: FormEvent) => {
    e.preventDefault();
    if (!learningGoal) {
      toast({ title: "Goal is required", description: "Please set your learning goal first.", variant: "destructive" });
      return;
    }
    setIsLoadingSuggestions(true);
    setSuggestedAIMilestones([]);
    try {
      const input: SuggestLearningMilestonesInput = { goal: learningGoal, currentSkills, learningPreferences };
      const result = await suggestLearningMilestones(input);
      setSuggestedAIMilestones(result.milestones);
      toast({ title: "Milestones Suggested!", description: "AI has generated some milestone ideas for you." });
    } catch (error) {
      console.error('Error suggesting milestones:', error);
      toast({ title: "Suggestion Failed", description: (error as Error).message, variant: "destructive" });
    } finally {
      setIsLoadingSuggestions(false);
    }
  };

  const addSuggestedMilestoneToRoadmap = async (title: string) => {
    if (!user) return;
    const newMilestoneData = {
      title: title,
      description: "AI Suggested Milestone",
      status: 'todo' as Milestone['status'],
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    try {
      const milestonesColRef = collection(db, 'users', user.uid, 'milestones');
      await addDoc(milestonesColRef, newMilestoneData);
      setSuggestedAIMilestones(prev => prev.filter(m => m !== title)); 
      toast({ title: "Milestone Added", description: `"${title}" added to your roadmap.` });
    } catch (error) {
      console.error("Error adding AI suggested milestone: ", error);
      toast({ title: "Error", description: "Could not add AI milestone.", variant: "destructive" });
    }
  };

  const openAddMilestoneDialog = () => {
    setEditingMilestone(null);
    setMilestoneTitle('');
    setMilestoneDescription('');
    setMilestoneStatus('todo');
    setShowAddEditMilestoneDialog(true);
  };

  const openEditMilestoneDialog = (milestone: Milestone) => {
    setEditingMilestone(milestone);
    setMilestoneTitle(milestone.title);
    setMilestoneDescription(milestone.description);
    setMilestoneStatus(milestone.status);
    setShowAddEditMilestoneDialog(true);
  };

  const handleSaveMilestone = async (e: FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!milestoneTitle.trim()) {
      toast({ title: "Title is required", description: "Please enter a title for your milestone.", variant: "destructive"});
      return;
    }

    const milestoneData = {
      title: milestoneTitle.trim(),
      description: milestoneDescription.trim(),
      status: milestoneStatus,
      updatedAt: serverTimestamp(),
    };

    try {
      if (editingMilestone) { // Update existing milestone
        const milestoneRef = doc(db, 'users', user.uid, 'milestones', editingMilestone.id);
        await updateDoc(milestoneRef, milestoneData);
        toast({ title: "Milestone Updated", description: `"${milestoneData.title}" has been updated.` });
      } else { // Add new milestone
        const milestonesColRef = collection(db, 'users', user.uid, 'milestones');
        await addDoc(milestonesColRef, { ...milestoneData, createdAt: serverTimestamp() });
        toast({ title: "Milestone Added", description: `"${milestoneData.title}" added to your roadmap.` });
      }
      setShowAddEditMilestoneDialog(false);
      setEditingMilestone(null);
    } catch (error) {
      console.error("Error saving milestone: ", error);
      toast({ title: "Error", description: "Could not save milestone.", variant: "destructive" });
    }
  };

  const handleMilestoneStatusChange = async (milestoneId: string, newStatus: Milestone['status']) => {
    if (!user) return;
    try {
      const milestoneRef = doc(db, 'users', user.uid, 'milestones', milestoneId);
      await updateDoc(milestoneRef, { status: newStatus, updatedAt: serverTimestamp() });
      toast({ title: "Status Updated", description: `Milestone status changed to "${newStatus}".`});
    } catch (error) {
      console.error("Error updating milestone status: ", error);
      toast({ title: "Error", description: "Could not update status.", variant: "destructive" });
    }
  };

  const handleDeleteMilestone = async (milestoneId: string) => {
    if (!user) return;
    try {
      const milestoneRef = doc(db, 'users', user.uid, 'milestones', milestoneId);
      await deleteDoc(milestoneRef);
      toast({ title: "Milestone Deleted", description: "The milestone has been removed."});
    } catch (error) {
      console.error("Error deleting milestone: ", error);
      toast({ title: "Error", description: "Could not delete milestone.", variant: "destructive" });
    }
  };
  
  if (authLoading || isLoadingData) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) { // Should be caught by useEffect, but as a fallback
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4 text-center">
        <AlertCircle className="w-16 h-16 text-destructive mb-4" />
        <h1 className="text-2xl font-bold mb-2">Access Denied</h1>
        <p className="text-muted-foreground mb-4">You need to be logged in to view your roadmap.</p>
        <Button onClick={() => router.push(`/login?redirect=${pathname}`)}>Go to Login</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Learning Roadmap"
        description={learningGoal ? `Current Goal: ${learningGoal}` : "Plan and track your learning milestones."}
        actions={
            <Button onClick={openAddMilestoneDialog}>
                <PlusCircle className="mr-2 h-4 w-4" /> Add Custom Milestone
            </Button>
        }
      />
      
      <Dialog open={showAddEditMilestoneDialog} onOpenChange={setShowAddEditMilestoneDialog}>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>{editingMilestone ? 'Edit Milestone' : 'Add Custom Milestone'}</DialogTitle>
                <DialogDescription>
                  {editingMilestone ? 'Update the details of your milestone.' : 'Define a new milestone for your learning roadmap.'}
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSaveMilestone}>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="milestone-title" className="text-right">Title</Label>
                    <Input id="milestone-title" value={milestoneTitle} onChange={(e) => setMilestoneTitle(e.target.value)} className="col-span-3" placeholder="e.g., Complete Chapter 1" required />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="milestone-description" className="text-right">Description</Label>
                    <Textarea id="milestone-description" value={milestoneDescription} onChange={(e) => setMilestoneDescription(e.target.value)} className="col-span-3" placeholder="Optional: add more details" />
                  </div>
                   {editingMilestone && (
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="milestone-status-dialog" className="text-right">Status</Label>
                        <Select value={milestoneStatus} onValueChange={(value: Milestone['status']) => setMilestoneStatus(value)}>
                            <SelectTrigger id="milestone-status-dialog" className="col-span-3">
                                <SelectValue placeholder="Set status" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="todo">Todo</SelectItem>
                                <SelectItem value="inprogress">In Progress</SelectItem>
                                <SelectItem value="done">Done</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                   )}
                </div>
                <DialogFooter>
                  <DialogClose asChild><Button type="button" variant="outline">Cancel</Button></DialogClose>
                  <Button type="submit">{editingMilestone ? 'Save Changes' : 'Add Milestone'}</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          {!learningGoal && (
            <Card>
                <CardHeader>
                    <CardTitle>Set Your Learning Goal</CardTitle>
                    <CardDescription>Define your main learning objective to get started with your roadmap.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Button onClick={() => router.push('/roadmap/new')}>Set Learning Goal</Button>
                </CardContent>
            </Card>
          )}
          <Card>
            <CardHeader>
              <CardTitle>Current Milestones</CardTitle>
              <CardDescription>Your planned learning path.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {milestones.map((milestone) => (
                <Card key={milestone.id} className="p-4 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between gap-2">
                    <div className='flex-grow'>
                      <h3 className="font-semibold text-lg">{milestone.title}</h3>
                      <p className="text-sm text-muted-foreground mt-1">{milestone.description}</p>
                    </div>
                    <Select
                      value={milestone.status}
                      onValueChange={(value: Milestone['status']) => handleMilestoneStatusChange(milestone.id, value)}
                    >
                      <SelectTrigger className="w-[130px] text-xs shrink-0">
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
                     <Button variant="outline" size="sm" onClick={() => openEditMilestoneDialog(milestone)}><Edit3 className="mr-1.5 h-3.5 w-3.5" /> Edit</Button>
                     <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <Button variant="outline" size="sm" className="text-destructive hover:text-destructive"><Trash2 className="mr-1.5 h-3.5 w-3.5" /> Delete</Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                            <AlertDialogDescription>
                                This action cannot be undone. This will permanently delete the milestone "{milestone.title}".
                            </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                                className={buttonVariants({ variant: "destructive" })}
                                onClick={() => handleDeleteMilestone(milestone.id)}
                            >
                                Delete
                            </AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </Card>
              ))}
              {milestones.length === 0 && !isLoadingData && (
                <p className="text-muted-foreground text-center py-4">No milestones yet. Add some or get AI suggestions!</p>
              )}
               {isLoadingData && milestones.length === 0 && (
                 <div className="flex justify-center py-4"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
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
                  <Label htmlFor="goal-ai">Learning Goal (Using current roadmap goal)</Label>
                  <Input id="goal-ai" value={learningGoal} placeholder="Set your main goal first" disabled className="bg-muted/50" />
                </div>
                <div>
                  <Label htmlFor="currentSkills">Current Skills (Optional)</Label>
                  <Textarea id="currentSkills" value={currentSkills} onChange={(e) => setCurrentSkills(e.target.value)} placeholder="e.g., Basic HTML, CSS, JavaScript" />
                </div>
                <div>
                  <Label htmlFor="learningPreferences">Learning Preferences (Optional)</Label>
                  <Textarea id="learningPreferences" value={learningPreferences} onChange={(e) => setLearningPreferences(e.target.value)} placeholder="e.g., Prefer project-based learning, visual examples" />
                </div>
                <Button type="submit" className="w-full" disabled={isLoadingSuggestions || !learningGoal}>
                  {isLoadingSuggestions ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Zap className="mr-2 h-4 w-4" />}
                  Suggest Milestones
                </Button>
              </form>
            </CardContent>
          </Card>

          {isLoadingSuggestions && (
            <div className="flex justify-center items-center py-4">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          )}

          {suggestedAIMilestones.length > 0 && !isLoadingSuggestions && (
            <Card>
              <CardHeader>
                <CardTitle>Suggested Milestones</CardTitle>
                 <CardDescription>Click + to add to your roadmap.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2 max-h-80 overflow-y-auto">
                {suggestedAIMilestones.map((suggestion, index) => (
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

    