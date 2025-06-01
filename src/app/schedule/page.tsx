
'use client';

import PageHeader from '@/components/common/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, Zap, AlertCircle, CalendarDays, Clock, Coffee, Utensils, Play, Pause } from 'lucide-react';
import { useState, type FormEvent, useEffect, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { generateLearningSchedule, type GenerateLearningScheduleInput, type GenerateLearningScheduleOutput } from '@/ai/flows/generate-learning-schedule';
import { db } from '@/lib/firebase';
import { doc, getDoc, setDoc, addDoc, collection, serverTimestamp, Timestamp, onSnapshot, updateDoc, writeBatch } from 'firebase/firestore';
import { format } from 'date-fns';

interface DailyTask {
  date: string;
  dayOfWeek: string;
  topic: string;
  estimatedDuration?: string;
  timeSlot?: string;
}

interface StoredSchedule {
  id: string;
  parameters: GenerateLearningScheduleInput;
  schedule: DailyTask[];
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

type TimeTrackingStatus = 'clocked_out' | 'clocked_in' | 'on_break' | 'on_lunch';

interface TimeTrackingState {
  status: TimeTrackingStatus;
  lastClockInTime?: Timestamp | null;
  lastBreakStartTime?: Timestamp | null;
  lastLunchStartTime?: Timestamp | null;
  currentSessionId?: string | null; // ID of the current study_session in timeTrackingLogs
}

export default function SchedulePage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const { toast } = useToast();

  const [learningGoal, setLearningGoal] = useState('');
  const [scheduleDuration, setScheduleDuration] = useState<'1 month' | '1 year' | '2 years'>('1 month');
  const [dailyAvailability, setDailyAvailability] = useState('');
  const [weeklyHolidays, setWeeklyHolidays] = useState('');
  const [utilizeHolidays, setUtilizeHolidays] = useState(false);

  const [generatedSchedule, setGeneratedSchedule] = useState<DailyTask[]>([]);
  const [scheduleSummary, setScheduleSummary] = useState<string | null>(null);
  const [isLoadingScheduleAI, setIsLoadingScheduleAI] = useState(false);
  const [isLoadingStoredSchedule, setIsLoadingStoredSchedule] = useState(true);
  const [storedScheduleData, setStoredScheduleData] = useState<StoredSchedule | null>(null);

  const [timeTrackingState, setTimeTrackingState] = useState<TimeTrackingState | null>(null);
  const [isLoadingTimeState, setIsLoadingTimeState] = useState(true);


  const fetchLearningGoalFromProfile = useCallback(async () => {
    if (!user) return;
    try {
      const profileRef = doc(db, 'users', user.uid, 'profile', 'main');
      const docSnap = await getDoc(profileRef);
      if (docSnap.exists() && docSnap.data()?.learningGoal) {
        setLearningGoal(docSnap.data()?.learningGoal);
      }
    } catch (error) {
      console.error("Error fetching learning goal: ", error);
      // Non-critical, user can input manually
    }
  }, [user]);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      toast({ title: "Authentication Required", variant: "destructive" });
      router.push(`/login?redirect=${pathname}`);
      return;
    }
    fetchLearningGoalFromProfile();

    // Fetch stored schedule
    const scheduleDocRef = doc(db, 'users', user.uid, 'schedule', 'main');
    const unsubscribeSchedule = onSnapshot(scheduleDocRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = { id: docSnap.id, ...docSnap.data() } as StoredSchedule;
        setStoredScheduleData(data);
        setGeneratedSchedule(data.schedule);
        setScheduleSummary(data.parameters.learningGoal); // Or a dedicated summary field if stored
        // Pre-fill form from stored parameters if user wants to regenerate
        setLearningGoal(data.parameters.learningGoal);
        setScheduleDuration(data.parameters.scheduleDuration);
        setDailyAvailability(data.parameters.dailyAvailability);
        setWeeklyHolidays(data.parameters.weeklyHolidays || '');
        setUtilizeHolidays(data.parameters.utilizeHolidays);
      } else {
        setStoredScheduleData(null);
        setGeneratedSchedule([]);
      }
      setIsLoadingStoredSchedule(false);
    }, (error) => {
      console.error("Error fetching stored schedule: ", error);
      toast({ title: "Error loading schedule", variant: "destructive" });
      setIsLoadingStoredSchedule(false);
    });
    
    // Fetch time tracking state
    const timeStateDocRef = doc(db, 'users', user.uid, 'timeTrackingState', 'currentState');
    const unsubscribeTimeState = onSnapshot(timeStateDocRef, (docSnap) => {
        if (docSnap.exists()) {
            setTimeTrackingState(docSnap.data() as TimeTrackingState);
        } else {
            // Initialize state if not found
            const initialTimeState: TimeTrackingState = { status: 'clocked_out' };
            setDoc(timeStateDocRef, initialTimeState).catch(err => console.error("Error initializing time state", err));
            setTimeTrackingState(initialTimeState);
        }
        setIsLoadingTimeState(false);
    }, (error) => {
        console.error("Error fetching time tracking state: ", error);
        toast({title: "Error loading time state", variant: "destructive"});
        setIsLoadingTimeState(false);
    });


    return () => {
        unsubscribeSchedule();
        unsubscribeTimeState();
    };
  }, [user, authLoading, router, pathname, toast, fetchLearningGoalFromProfile]);

  const handleGenerateSchedule = async (e: FormEvent) => {
    e.preventDefault();
    if (!learningGoal.trim() || !dailyAvailability.trim()) {
      toast({ title: "Missing Information", description: "Learning goal and daily availability are required.", variant: "destructive" });
      return;
    }
    if (!user) return;

    setIsLoadingScheduleAI(true);
    setGeneratedSchedule([]);
    setScheduleSummary(null);

    try {
      const startDate = format(new Date(), 'yyyy-MM-dd');
      const input: GenerateLearningScheduleInput = {
        learningGoal, scheduleDuration, dailyAvailability,
        weeklyHolidays: weeklyHolidays.trim() || undefined, // Send undefined if empty for AI
        utilizeHolidays, startDate
      };
      const result: GenerateLearningScheduleOutput = await generateLearningSchedule(input);
      setGeneratedSchedule(result.schedule);
      setScheduleSummary(result.summary || `Schedule for: ${learningGoal}`);

      // Save to Firestore
      const scheduleDocRef = doc(db, 'users', user.uid, 'schedule', 'main');
      await setDoc(scheduleDocRef, {
        parameters: input,
        schedule: result.schedule,
        summary: result.summary,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      }, { merge: true });

      toast({ title: "Schedule Generated!", description: "Your new learning schedule is ready." });
    } catch (error) {
      console.error('Error generating schedule:', error);
      toast({ title: "Schedule Generation Failed", description: (error as Error).message, variant: "destructive" });
    } finally {
      setIsLoadingScheduleAI(false);
    }
  };
  
  const updateTimeTrackingState = async (newState: Partial<TimeTrackingState>) => {
    if (!user) return;
    const timeStateDocRef = doc(db, 'users', user.uid, 'timeTrackingState', 'currentState');
    try {
        await setDoc(timeStateDocRef, newState, { merge: true });
    } catch (error) {
        console.error("Error updating time tracking state:", error);
        toast({ title: "Time Tracking Error", description: "Could not update status.", variant: "destructive" });
    }
  };
  
  const handleClockIn = async () => {
    if (!user || !timeTrackingState || timeTrackingState.status !== 'clocked_out') return;
    const newSessionId = doc(collection(db, 'users', user.uid, 'timeTrackingLogs')).id; // Generate ID upfront
    const newLog = {
        sessionId: newSessionId,
        type: 'study_session_start',
        startTime: serverTimestamp(),
        endTime: null,
        durationMinutes: 0, // Will be calculated on clock out
        activities: [] // For breaks/lunch within this session
    };
    await addDoc(collection(db, 'users', user.uid, 'timeTrackingLogs'), newLog);
    await updateTimeTrackingState({ 
        status: 'clocked_in', 
        lastClockInTime: serverTimestamp() as Timestamp, // Cast for optimistic update
        currentSessionId: newSessionId 
    });
  };

  const handleClockOut = async () => {
    if (!user || !timeTrackingState || timeTrackingState.status !== 'clocked_in' || !timeTrackingState.currentSessionId || !timeTrackingState.lastClockInTime) return;
    
    const now = Timestamp.now();
    let durationMinutes = 0;
    if (timeTrackingState.lastClockInTime) {
        // Ensure lastClockInTime is a Firestore Timestamp before calculating duration
        const lastClockIn = timeTrackingState.lastClockInTime as Timestamp;
        durationMinutes = Math.round((now.seconds - lastClockIn.seconds) / 60);
    }

    // Update the specific session log
    const sessionLogRef = doc(db, 'users', user.uid, 'timeTrackingLogs', timeTrackingState.currentSessionId);
    await updateDoc(sessionLogRef, {
        endTime: now,
        durationMinutes: durationMinutes
    });
    
    await updateTimeTrackingState({ 
        status: 'clocked_out', 
        lastClockInTime: null, 
        currentSessionId: null 
    });
  };
  
  const handleStartBreak = async () => {
      if (!user || !timeTrackingState || timeTrackingState.status !== 'clocked_in' || !timeTrackingState.currentSessionId) return;
      
      const breakActivity = {
          type: 'break_start',
          timestamp: serverTimestamp()
      };
      const sessionLogRef = doc(db, 'users', user.uid, 'timeTrackingLogs', timeTrackingState.currentSessionId);
      await updateDoc(sessionLogRef, {
          activities: arrayUnion(breakActivity)
      });
      
      await updateTimeTrackingState({ status: 'on_break', lastBreakStartTime: serverTimestamp() as Timestamp });
  };

  const handleEndBreak = async () => {
      if (!user || !timeTrackingState || timeTrackingState.status !== 'on_break' || !timeTrackingState.currentSessionId) return;
      
      const breakEndActivity = {
          type: 'break_end',
          timestamp: serverTimestamp()
      };
      const sessionLogRef = doc(db, 'users', user.uid, 'timeTrackingLogs', timeTrackingState.currentSessionId);
      await updateDoc(sessionLogRef, {
          activities: arrayUnion(breakEndActivity)
      });
      
      await updateTimeTrackingState({ status: 'clocked_in', lastBreakStartTime: null });
  };
  
   const handleStartLunch = async () => {
      if (!user || !timeTrackingState || timeTrackingState.status !== 'clocked_in' || !timeTrackingState.currentSessionId) return;
      
      const lunchActivity = {
          type: 'lunch_start',
          timestamp: serverTimestamp()
      };
      const sessionLogRef = doc(db, 'users', user.uid, 'timeTrackingLogs', timeTrackingState.currentSessionId);
      await updateDoc(sessionLogRef, {
          activities: arrayUnion(lunchActivity)
      });

      await updateTimeTrackingState({ status: 'on_lunch', lastLunchStartTime: serverTimestamp() as Timestamp });
  };

  const handleEndLunch = async () => {
      if (!user || !timeTrackingState || timeTrackingState.status !== 'on_lunch' || !timeTrackingState.currentSessionId) return;
      
      const lunchEndActivity = {
          type: 'lunch_end',
          timestamp: serverTimestamp()
      };
       const sessionLogRef = doc(db, 'users', user.uid, 'timeTrackingLogs', timeTrackingState.currentSessionId);
      await updateDoc(sessionLogRef, {
          activities: arrayUnion(lunchEndActivity)
      });

      await updateTimeTrackingState({ status: 'clocked_in', lastLunchStartTime: null });
  };


  if (authLoading || isLoadingStoredSchedule || isLoadingTimeState) {
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
  
  const canClockIn = timeTrackingState?.status === 'clocked_out';
  const canClockOut = timeTrackingState?.status === 'clocked_in';
  const canStartBreak = timeTrackingState?.status === 'clocked_in';
  const canEndBreak = timeTrackingState?.status === 'on_break';
  const canStartLunch = timeTrackingState?.status === 'clocked_in';
  const canEndLunch = timeTrackingState?.status === 'on_lunch';


  return (
    <div className="space-y-6">
      <PageHeader
        title="Learning Schedule & Time Tracking"
        description="Generate your personalized study plan and track your learning sessions."
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle>Generate Your Schedule</CardTitle>
            <CardDescription>Tell the AI about your goals and availability.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleGenerateSchedule} className="space-y-4">
              <div>
                <Label htmlFor="learningGoal">Primary Learning Goal</Label>
                <Input id="learningGoal" value={learningGoal} onChange={(e) => setLearningGoal(e.target.value)} placeholder="e.g., Master Next.js and Tailwind CSS" required />
              </div>
              <div>
                <Label htmlFor="scheduleDuration">Schedule Duration</Label>
                <Select value={scheduleDuration} onValueChange={(value: '1 month' | '1 year' | '2 years') => setScheduleDuration(value)}>
                  <SelectTrigger id="scheduleDuration"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1 month">1 Month</SelectItem>
                    <SelectItem value="1 year">1 Year</SelectItem>
                    <SelectItem value="2 years">2 Years</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="dailyAvailability">Daily Availability</Label>
                <Input id="dailyAvailability" value={dailyAvailability} onChange={(e) => setDailyAvailability(e.target.value)} placeholder="e.g., Mon-Fri 6 PM - 9 PM, Sat 10 AM - 2 PM or 2 hours daily" required />
              </div>
              <div>
                <Label htmlFor="weeklyHolidays">Weekly Holidays (Optional)</Label>
                <Input id="weeklyHolidays" value={weeklyHolidays} onChange={(e) => setWeeklyHolidays(e.target.value)} placeholder="e.g., Sunday" />
              </div>
              <div className="flex items-center space-x-2">
                <Switch id="utilizeHolidays" checked={utilizeHolidays} onCheckedChange={setUtilizeHolidays} />
                <Label htmlFor="utilizeHolidays">Utilize holidays for learning if needed?</Label>
              </div>
              <Button type="submit" className="w-full" disabled={isLoadingScheduleAI}>
                {isLoadingScheduleAI ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Zap className="mr-2 h-4 w-4" />}
                {isLoadingScheduleAI ? 'Generating...' : (storedScheduleData ? 'Regenerate Schedule' : 'Generate Schedule')}
              </Button>
            </form>
          </CardContent>
        </Card>

        <div className="md:col-span-2 space-y-6">
          <Card>
            <CardHeader>
                <CardTitle className="flex items-center"><Clock className="mr-2 h-5 w-5 text-primary" /> Time Tracking</CardTitle>
                <CardDescription>
                    Current Status: <span className="font-semibold capitalize">{timeTrackingState?.status.replace('_', ' ') || 'Loading...'}</span>
                </CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                <Button onClick={handleClockIn} disabled={!canClockIn || isLoadingTimeState} className="bg-green-500 hover:bg-green-600 text-white"><Play className="mr-2 h-4 w-4" /> Clock In</Button>
                <Button onClick={handleClockOut} disabled={!canClockOut || isLoadingTimeState} className="bg-red-500 hover:bg-red-600 text-white"><Pause className="mr-2 h-4 w-4" /> Clock Out</Button>
                <Button onClick={handleStartBreak} disabled={!canStartBreak || isLoadingTimeState} variant="outline"><Coffee className="mr-2 h-4 w-4" /> Start Break</Button>
                <Button onClick={handleEndBreak} disabled={!canEndBreak || isLoadingTimeState} variant="outline"><Play className="mr-2 h-4 w-4" /> End Break</Button>
                <Button onClick={handleStartLunch} disabled={!canStartLunch || isLoadingTimeState} variant="outline"><Utensils className="mr-2 h-4 w-4" /> Start Lunch</Button>
                <Button onClick={handleEndLunch} disabled={!canEndLunch || isLoadingTimeState} variant="outline"><Play className="mr-2 h-4 w-4" /> End Lunch</Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Your Learning Schedule</CardTitle>
              {scheduleSummary && <CardDescription>{scheduleSummary}</CardDescription>}
            </CardHeader>
            <CardContent>
              {isLoadingScheduleAI && <div className="flex justify-center items-center py-8"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}
              {!isLoadingScheduleAI && generatedSchedule.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <CalendarDays className="mx-auto h-12 w-12 opacity-50 mb-4" />
                  <p>Your generated schedule will appear here.</p>
                  <p className="text-sm">Fill the form and click "Generate Schedule".</p>
                </div>
              )}
              {!isLoadingScheduleAI && generatedSchedule.length > 0 && (
                <div className="overflow-x-auto max-h-[600px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Day</TableHead>
                        <TableHead>Topic / Task</TableHead>
                        <TableHead>Est. Duration</TableHead>
                        <TableHead>Time Slot</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {generatedSchedule.map((task, index) => (
                        <TableRow key={index}>
                          <TableCell>{task.date}</TableCell>
                          <TableCell>{task.dayOfWeek}</TableCell>
                          <TableCell>{task.topic}</TableCell>
                          <TableCell>{task.estimatedDuration || 'N/A'}</TableCell>
                          <TableCell>{task.timeSlot || 'Flexible'}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
