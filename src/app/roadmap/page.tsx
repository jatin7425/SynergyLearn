
'use client';

import PageHeader from '@/components/common/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { PlusCircle, Lightbulb, Zap, CheckSquare, Loader2, Plus, AlertCircle, Edit3, Trash2, ListChecks, FolderArchive, CheckCircle2 } from 'lucide-react';
import { useState, type FormEvent, useEffect, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { suggestLearningMilestones, type SuggestLearningMilestonesInput } from '@/ai/flows/suggest-milestones';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogClose, DialogTrigger
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { db } from '@/lib/firebase';
import { 
  doc, getDoc, setDoc, 
  collection, query, onSnapshot, addDoc, updateDoc, deleteDoc, 
  serverTimestamp, Timestamp, orderBy, writeBatch
} from 'firebase/firestore';
import { buttonVariants } from '@/components/ui/button';
import Link from 'next/link';
import { cn } from '@/lib/utils';


interface LearningGoal {
  id: string;
  title: string;
  description?: string;
  isArchived: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

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

  const [allLearningGoals, setAllLearningGoals] = useState<LearningGoal[]>([]);
  const [activeGoalId, setActiveGoalId] = useState<string | null>(null);
  const [activeGoal, setActiveGoal] = useState<LearningGoal | null>(null);
  
  const [currentSkills, setCurrentSkills] = useState('');
  const [learningPreferences, setLearningPreferences] = useState('');
  
  const [suggestedAIMilestones, setSuggestedAIMilestones] = useState<string[]>([]);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(true);

  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [showAddEditMilestoneDialog, setShowAddEditMilestoneDialog] = useState(false);
  const [editingMilestone, setEditingMilestone] = useState<Milestone | null>(null);
  const [milestoneTitle, setMilestoneTitle] = useState('');
  const [milestoneDescription, setMilestoneDescription] = useState('');
  const [milestoneStatus, setMilestoneStatus] = useState<Milestone['status']>('todo');

  // Fetch all learning goals and the active goal ID
  useEffect(() => {
    if (!user) return;
    setIsLoadingData(true);

    const profileRef = doc(db, 'users', user.uid, 'profile', 'main');
    const unsubscribeProfile = onSnapshot(profileRef, (docSnap) => {
      if (docSnap.exists() && docSnap.data()?.activeLearningGoalId) {
        setActiveGoalId(docSnap.data()?.activeLearningGoalId);
      } else {
        setActiveGoalId(null);
        setActiveGoal(null); // Clear active goal if ID is not found
      }
    });

    const goalsColRef = collection(db, 'users', user.uid, 'learningGoals');
    const qGoals = query(goalsColRef, orderBy('createdAt', 'desc'));
    const unsubscribeGoals = onSnapshot(qGoals, (snapshot) => {
      const fetchedGoals: LearningGoal[] = [];
      snapshot.forEach(doc => fetchedGoals.push({ id: doc.id, ...doc.data() } as LearningGoal));
      setAllLearningGoals(fetchedGoals);
      if (!activeGoalId && fetchedGoals.length > 0 && !fetchedGoals.find(g => g.id === activeGoalId)) {
        // If no active goal ID set, or current active ID is invalid, set the first non-archived as active
        const firstNonArchived = fetchedGoals.find(g => !g.isArchived);
        if (firstNonArchived) {
          handleSetActiveGoal(firstNonArchived.id);
        } else if (fetchedGoals.length > 0) {
          handleSetActiveGoal(fetchedGoals[0].id); // fallback to first if all archived
        }
      }
      // setIsLoadingData(false) // Milestones will set this
    }, (error) => {
      console.error("Error fetching learning goals: ", error);
      toast({ title: "Error", description: "Could not fetch learning goals.", variant: "destructive" });
      setIsLoadingData(false);
    });

    return () => {
      unsubscribeProfile();
      unsubscribeGoals();
    };
  }, [user, toast]); // activeGoalId removed from dependency to avoid loop on initial set

  // Fetch active goal details and its milestones
  useEffect(() => {
    if (!user || !activeGoalId) {
      setActiveGoal(null);
      setMilestones([]);
      if (allLearningGoals.length === 0 && !authLoading && user) setIsLoadingData(false); // No goals, no active goal, done loading.
      return;
    }
    
    setIsLoadingData(true);
    const goalDocRef = doc(db, 'users', user.uid, 'learningGoals', activeGoalId);
    const unsubscribeActiveGoal = onSnapshot(goalDocRef, (docSnap) => {
      if (docSnap.exists()) {
        setActiveGoal({ id: docSnap.id, ...docSnap.data() } as LearningGoal);
      } else {
        setActiveGoal(null);
        // Active goal ID might be stale, try to pick another one if available
        if (allLearningGoals.length > 0) {
            const firstNonArchived = allLearningGoals.find(g => !g.isArchived);
            if (firstNonArchived) handleSetActiveGoal(firstNonArchived.id);
        }
      }
    });

    const milestonesColRef = collection(db, 'users', user.uid, 'learningGoals', activeGoalId, 'milestones');
    const qMilestones = query(milestonesColRef, orderBy('createdAt', 'asc'));
    const unsubscribeMilestones = onSnapshot(qMilestones, (snapshot) => {
        const fetchedMilestones: Milestone[] = [];
        snapshot.forEach(doc => fetchedMilestones.push({ id: doc.id, ...doc.data() } as Milestone));
        setMilestones(fetchedMilestones);
        setIsLoadingData(false);
    }, (error) => {
        console.error("Error fetching milestones: ", error);
        toast({ title: "Error", description: "Could not fetch milestones for the active goal.", variant: "destructive" });
        setIsLoadingData(false);
    });

    return () => {
      unsubscribeActiveGoal();
      unsubscribeMilestones();
    };
  }, [user, activeGoalId, toast, allLearningGoals]);

  const handleSetActiveGoal = async (goalId: string) => {
    if (!user) return;
    const profileRef = doc(db, 'users', user.uid, 'profile', 'main');
    try {
      await setDoc(profileRef, { activeLearningGoalId: goalId }, { merge: true });
      setActiveGoalId(goalId); // Optimistically update local state
      toast({ title: "Active Goal Changed", description: "Your roadmap now reflects the selected goal." });
    } catch (error) {
      console.error("Error setting active goal:", error);
      toast({ title: "Error", description: "Could not change active goal.", variant: "destructive" });
    }
  };
  
  const handleArchiveGoal = async (goalId: string, currentArchivedStatus: boolean) => {
    if (!user) return;
    const goalRef = doc(db, 'users', user.uid, 'learningGoals', goalId);
    try {
        await updateDoc(goalRef, { isArchived: !currentArchivedStatus, updatedAt: serverTimestamp() });
        toast({ title: `Goal ${!currentArchivedStatus ? 'Archived' : 'Unarchived'}` });
        // If archiving the active goal, pick a new active goal if possible
        if (goalId === activeGoalId && !currentArchivedStatus) {
            const nextActiveGoal = allLearningGoals.find(g => g.id !== goalId && !g.isArchived) || allLearningGoals.find(g => g.id !== goalId);
            if (nextActiveGoal) {
                handleSetActiveGoal(nextActiveGoal.id);
            } else {
                setActiveGoalId(null); // No other goals to make active
            }
        }
    } catch (error) {
        console.error("Error (un)archiving goal:", error);
        toast({ title: "Error", description: "Could not update goal archive status.", variant: "destructive" });
    }
  };

  const handleDeleteGoal = async (goalId: string, goalTitle: string) => {
    if (!user) return;
    // Deletion is complex: needs to delete goal doc AND its milestones subcollection
    // Using a batch write for atomicity
    const batch = writeBatch(db);
    const goalRef = doc(db, 'users', user.uid, 'learningGoals', goalId);
    
    // Delete milestones subcollection (Firebase CLI can do this, client-side is harder for full subcollections)
    // For client: query all milestones and delete them one by one in the batch.
    const milestonesColRef = collection(db, 'users', user.uid, 'learningGoals', goalId, 'milestones');
    try {
        const milestonesSnapshot = await getDocs(milestonesColRef);
        milestonesSnapshot.forEach(milestoneDoc => {
            batch.delete(milestoneDoc.ref);
        });
        batch.delete(goalRef); // Delete the goal document itself
        await batch.commit();

        toast({ title: "Goal Deleted", description: `"${goalTitle}" and its milestones have been removed.`});
        if (goalId === activeGoalId) {
            const nextActiveGoal = allLearningGoals.find(g => g.id !== goalId && !g.isArchived) || allLearningGoals.find(g => g.id !== goalId);
            if (nextActiveGoal) {
                handleSetActiveGoal(nextActiveGoal.id);
            } else {
                setActiveGoalId(null); 
            }
        }
    } catch (error) {
        console.error("Error deleting goal and its milestones:", error);
        toast({ title: "Error Deleting Goal", description: (error as Error).message, variant: "destructive" });
    }
  };


  const handleSuggestMilestones = async (e: FormEvent) => {
    e.preventDefault();
    if (!activeGoal) {
      toast({ title: "No Active Goal", description: "Please set an active learning goal first.", variant: "destructive" });
      return;
    }
    setIsLoadingSuggestions(true);
    setSuggestedAIMilestones([]);
    try {
      const input: SuggestLearningMilestonesInput = { goal: activeGoal.title, currentSkills, learningPreferences };
      const result = await suggestLearningMilestones(input);
      setSuggestedAIMilestones(result.milestones);
      toast({ title: "Milestones Suggested!", description: "AI has generated some milestone ideas for your active goal." });
    } catch (error) {
      console.error('Error suggesting milestones:', error);
      toast({ title: "Suggestion Failed", description: (error as Error).message, variant: "destructive" });
    } finally {
      setIsLoadingSuggestions(false);
    }
  };

  const addSuggestedMilestoneToRoadmap = async (title: string) => {
    if (!user || !activeGoalId) return;
    const newMilestoneData = {
      title: title,
      description: "AI Suggested Milestone",
      status: 'todo' as Milestone['status'],
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    try {
      const milestonesColRef = collection(db, 'users', user.uid, 'learningGoals', activeGoalId, 'milestones');
      await addDoc(milestonesColRef, newMilestoneData);
      setSuggestedAIMilestones(prev => prev.filter(m => m !== title)); 
      toast({ title: "Milestone Added", description: `"${title}" added to your roadmap for "${activeGoal?.title}".` });
    } catch (error) {
      console.error("Error adding AI suggested milestone: ", error);
      toast({ title: "Error", description: "Could not add AI milestone.", variant: "destructive" });
    }
  };

  const openAddMilestoneDialog = () => {
    if (!activeGoalId) {
      toast({ title: "No Active Goal", description: "Please select or create a goal before adding milestones.", variant: "destructive"});
      return;
    }
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
    if (!user || !activeGoalId) return;
    if (!milestoneTitle.trim()) {
      toast({ title: "Title is required", description: "Please enter a title for your milestone.", variant: "destructive"});
      return;
    }

    const milestoneDataToSave = {
      title: milestoneTitle.trim(),
      description: milestoneDescription.trim(),
      status: milestoneStatus,
      updatedAt: serverTimestamp(),
    };

    try {
      const milestonesColRef = collection(db, 'users', user.uid, 'learningGoals', activeGoalId, 'milestones');
      if (editingMilestone) { 
        const milestoneRef = doc(milestonesColRef, editingMilestone.id);
        await updateDoc(milestoneRef, milestoneDataToSave);
        toast({ title: "Milestone Updated", description: `"${milestoneDataToSave.title}" has been updated.` });
      } else { 
        await addDoc(milestonesColRef, { ...milestoneDataToSave, createdAt: serverTimestamp() });
        toast({ title: "Milestone Added", description: `"${milestoneDataToSave.title}" added to roadmap.` });
      }
      setShowAddEditMilestoneDialog(false);
      setEditingMilestone(null);
    } catch (error) {
      console.error("Error saving milestone: ", error);
      toast({ title: "Error", description: "Could not save milestone.", variant: "destructive" });
    }
  };

  const handleMilestoneStatusChange = async (milestoneId: string, newStatus: Milestone['status']) => {
    if (!user || !activeGoalId) return;
    try {
      const milestoneRef = doc(db, 'users', user.uid, 'learningGoals', activeGoalId, 'milestones', milestoneId);
      await updateDoc(milestoneRef, { status: newStatus, updatedAt: serverTimestamp() });
      toast({ title: "Status Updated", description: `Milestone status changed to "${newStatus}".`});
    } catch (error) {
      console.error("Error updating milestone status: ", error);
      toast({ title: "Error", description: "Could not update status.", variant: "destructive" });
    }
  };

  const handleDeleteMilestone = async (milestoneId: string) => {
    if (!user || !activeGoalId) return;
    try {
      const milestoneRef = doc(db, 'users', user.uid, 'learningGoals', activeGoalId, 'milestones', milestoneId);
      await deleteDoc(milestoneRef);
      toast({ title: "Milestone Deleted", description: "The milestone has been removed."});
    } catch (error) {
      console.error("Error deleting milestone: ", error);
      toast({ title: "Error", description: "Could not delete milestone.", variant: "destructive" });
    }
  };
  
  if (authLoading || (isLoadingData && !activeGoal)) { // Show loader if main data or active goal details are loading
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
        <Button onClick={() => router.push(`/login?redirect=${pathname}`)}>Go to Login</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Learning Roadmap"
        description={activeGoal ? `Active Goal: ${activeGoal.title}` : (allLearningGoals.length > 0 ? "Select a goal or create a new one." : "Create your first learning goal to get started.")}
        actions={
          <div className="flex gap-2">
            <Link href="/roadmap/new" passHref>
                <Button variant="default"><PlusCircle className="mr-2 h-4 w-4" /> New Goal</Button>
            </Link>
            <Button onClick={openAddMilestoneDialog} disabled={!activeGoal || activeGoal.isArchived}>
                <PlusCircle className="mr-2 h-4 w-4" /> Add Custom Milestone
            </Button>
          </div>
        }
      />
      
      <Dialog open={showAddEditMilestoneDialog} onOpenChange={setShowAddEditMilestoneDialog}>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>{editingMilestone ? 'Edit Milestone' : 'Add Custom Milestone'}</DialogTitle>
                <DialogDescription>
                  {activeGoal ? `For goal: ${activeGoal.title}` : "No active goal selected."}
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
                   {(editingMilestone || !activeGoal?.isArchived) && ( // Show status only if editing or goal is not archived
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="milestone-status-dialog" className="text-right">Status</Label>
                        <Select value={milestoneStatus} onValueChange={(value: Milestone['status']) => setMilestoneStatus(value)} disabled={activeGoal?.isArchived && !editingMilestone}>
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
                  <Button type="submit" disabled={activeGoal?.isArchived && !editingMilestone}>{editingMilestone ? 'Save Changes' : 'Add Milestone'}</Button>
                </DialogFooter>
              </form>
            </DialogContent>
      </Dialog>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
                <CardTitle>Your Learning Goals</CardTitle>
                <CardDescription>Select a goal to view its roadmap or create a new one.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
                {allLearningGoals.length === 0 && !isLoadingData && (
                    <div className="text-center py-4">
                        <p className="text-muted-foreground">You haven&apos;t set any learning goals yet.</p>
                        <Link href="/roadmap/new" passHref className="mt-2">
                            <Button variant="link"><PlusCircle className="mr-2 h-4 w-4" />Create your first goal</Button>
                        </Link>
                    </div>
                )}
                 {isLoadingData && allLearningGoals.length === 0 && (
                   <div className="flex justify-center py-4"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
                 )}
                {allLearningGoals.map(goal => (
                    <Card key={goal.id} className={cn("p-3 transition-all", goal.id === activeGoalId ? "border-primary ring-2 ring-primary shadow-lg" : "hover:shadow-md", goal.isArchived && "opacity-60 bg-muted/50")}>
                        <div className="flex items-start justify-between gap-2">
                            <div className="flex-grow">
                                <h3 className="font-semibold">{goal.title} {goal.isArchived && "(Archived)"}</h3>
                                <p className="text-xs text-muted-foreground line-clamp-1">{goal.description}</p>
                                <p className="text-xs text-muted-foreground">Created: {goal.createdAt?.toDate().toLocaleDateString()}</p>
                            </div>
                            <div className="flex flex-col sm:flex-row gap-1.5 items-end sm:items-center shrink-0">
                                {goal.id !== activeGoalId && !goal.isArchived && (
                                    <Button size="sm" variant="outline" onClick={() => handleSetActiveGoal(goal.id)}>Set Active</Button>
                                )}
                                {goal.id === activeGoalId && (
                                    <span className="text-xs font-semibold text-primary py-1 px-2 rounded-md bg-primary/10 flex items-center"><CheckCircle2 className="mr-1 h-3 w-3"/>Active</span>
                                )}
                                <Button size="sm" variant="ghost" onClick={() => handleArchiveGoal(goal.id, goal.isArchived)} title={goal.isArchived ? "Unarchive Goal" : "Archive Goal"}>
                                    <FolderArchive className="h-4 w-4" />
                                </Button>
                                <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                        <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" title="Delete Goal"><Trash2 className="h-4 w-4" /></Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                        <AlertDialogHeader>
                                        <AlertDialogTitle>Delete Goal "{goal.title}"?</AlertDialogTitle>
                                        <AlertDialogDescription>
                                            This action cannot be undone. This will permanently delete the goal and ALL its associated milestones.
                                        </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                        <AlertDialogAction
                                            className={buttonVariants({ variant: "destructive" })}
                                            onClick={() => handleDeleteGoal(goal.id, goal.title)}
                                        >
                                            Delete Goal
                                        </AlertDialogAction>
                                        </AlertDialogFooter>
                                    </AlertDialogContent>
                                </AlertDialog>
                            </div>
                        </div>
                    </Card>
                ))}
            </CardContent>
          </Card>

          {activeGoal && (
            <Card>
                <CardHeader>
                <CardTitle>Milestones for "{activeGoal.title}"</CardTitle>
                <CardDescription>Your planned learning path for the active goal. {activeGoal.isArchived && <span className="font-semibold text-destructive">(Archived Goal - Read Only)</span>}</CardDescription>
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
                        disabled={activeGoal.isArchived}
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
                    {!activeGoal.isArchived && (
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
                    )}
                    </Card>
                ))}
                {milestones.length === 0 && !isLoadingData && (
                    <p className="text-muted-foreground text-center py-4">No milestones for this goal yet. Add some or get AI suggestions!</p>
                )}
                {isLoadingData && milestones.length === 0 && (
                    <div className="flex justify-center py-4"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
                )}
                </CardContent>
            </Card>
          )}
        </div>

        <div className="lg:col-span-1 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Lightbulb className="mr-2 h-5 w-5 text-primary" />
                AI Milestone Suggestions
              </CardTitle>
              <CardDescription>Get AI-powered suggestions for your active learning goal.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSuggestMilestones} className="space-y-4">
                <div>
                  <Label htmlFor="goal-ai">Active Learning Goal</Label>
                  <Input id="goal-ai" value={activeGoal?.title || ''} placeholder="Select an active goal first" disabled className="bg-muted/50" />
                </div>
                <div>
                  <Label htmlFor="currentSkills">Current Skills (Optional)</Label>
                  <Textarea id="currentSkills" value={currentSkills} onChange={(e) => setCurrentSkills(e.target.value)} placeholder="e.g., Basic HTML, CSS, JavaScript" />
                </div>
                <div>
                  <Label htmlFor="learningPreferences">Learning Preferences (Optional)</Label>
                  <Textarea id="learningPreferences" value={learningPreferences} onChange={(e) => setLearningPreferences(e.target.value)} placeholder="e.g., Prefer project-based learning" />
                </div>
                <Button type="submit" className="w-full" disabled={isLoadingSuggestions || !activeGoal || activeGoal.isArchived}>
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
                 <CardDescription>Click + to add to your roadmap for "{activeGoal?.title}".</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2 max-h-80 overflow-y-auto">
                {suggestedAIMilestones.map((suggestion, index) => (
                  <div key={index} className="flex items-center justify-between p-2 border rounded-md bg-card hover:bg-accent/10">
                    <p className="text-sm flex-grow pr-2">{suggestion}</p>
                    <Button size="sm" variant="ghost" onClick={() => addSuggestedMilestoneToRoadmap(suggestion)} title="Add to Roadmap" disabled={!activeGoal || activeGoal.isArchived}>
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
