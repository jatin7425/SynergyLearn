
'use client';

import PageHeader from '@/components/common/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, Zap, AlertCircle, CalendarDays, Clock, Coffee, Utensils, Play, Pause, ListChecks, CalendarPlus } from 'lucide-react';
import { useState, type FormEvent, useEffect, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { generateWeeklyOutline, type GenerateWeeklyOutlineInput, type GenerateWeeklyOutlineOutput, type WeeklyGoalItem } from '@/ai/flows/generate-weekly-outline';
import { generateDailyTasks, type GenerateDailyTasksInput, type GenerateDailyTasksOutput, type DailyTask } from '@/ai/flows/generate-daily-tasks';
import { db } from '@/lib/firebase';
import { doc, getDoc, setDoc, addDoc, collection, serverTimestamp, Timestamp, onSnapshot, updateDoc, arrayUnion } from 'firebase/firestore';
import { format, parseISO } from 'date-fns';

interface StoredScheduleData {
  id: string; // mainSchedule
  overallGoal: string;
  overallDuration: '1 month' | '1 year' | '2 years';
  workingDayStartTime: string;
  workingDayEndTime: string;
  weeklyHolidays: string[];
  holidayStartTime?: string;
  holidayEndTime?: string;
  utilizeHolidays: boolean;
  startDateForOutline: string;
  weeklyOutline: (WeeklyGoalItem & { dailyTasks?: DailyTask[], dailyScheduleGenerated?: boolean, summary?: string })[];
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

type TimeTrackingStatus = 'clocked_out' | 'clocked_in' | 'on_break' | 'on_lunch';

interface TimeTrackingState {
  status: TimeTrackingStatus;
  lastClockInTime?: Timestamp | null;
  lastBreakStartTime?: Timestamp | null;
  lastLunchStartTime?: Timestamp | null;
  currentSessionId?: string | null;
}

const allDaysOfWeek = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export default function SchedulePage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const { toast } = useToast();

  const [learningGoal, setLearningGoal] = useState('');
  const [scheduleDuration, setScheduleDuration] = useState<'1 month' | '1 year' | '2 years'>('1 month');
  const [workingDayStartTime, setWorkingDayStartTime] = useState('09:00');
  const [workingDayEndTime, setWorkingDayEndTime] = useState('17:00');
  const [selectedHolidays, setSelectedHolidays] = useState<string[]>([]);
  const [holidayStartTime, setHolidayStartTime] = useState('');
  const [holidayEndTime, setHolidayEndTime] = useState('');
  const [utilizeHolidays, setUtilizeHolidays] = useState(false);

  const [isLoadingWeeklyOutline, setIsLoadingWeeklyOutline] = useState(false);
  const [isLoadingDailyTasksForWeek, setIsLoadingDailyTasksForWeek] = useState<number | null>(null);

  const [activeMainTab, setActiveMainTab] = useState<string>("configure");
  const [selectedWeekNumberForDetails, setSelectedWeekNumberForDetails] = useState<number | null>(null);

  const [isLoadingStoredSchedule, setIsLoadingStoredSchedule] = useState(true);
  const [storedScheduleData, setStoredScheduleData] = useState<StoredScheduleData | null>(null);

  const [timeTrackingState, setTimeTrackingState] = useState<TimeTrackingState | null>(null);
  const [isLoadingTimeState, setIsLoadingTimeState] = useState(true);

  const handleHolidayChange = (day: string) => {
    setSelectedHolidays(prev =>
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
    );
  };

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

    const scheduleDocRef = doc(db, 'users', user.uid, 'schedule', 'mainSchedule');
    const unsubscribeSchedule = onSnapshot(scheduleDocRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = { id: docSnap.id, ...docSnap.data() } as StoredScheduleData;
        setStoredScheduleData(data);
        setLearningGoal(data.overallGoal);
        setScheduleDuration(data.overallDuration);
        setWorkingDayStartTime(data.workingDayStartTime || '09:00');
        setWorkingDayEndTime(data.workingDayEndTime || '17:00');
        setSelectedHolidays(data.weeklyHolidays || []);
        setHolidayStartTime(data.holidayStartTime || '');
        setHolidayEndTime(data.holidayEndTime || '');
        setUtilizeHolidays(data.utilizeHolidays || false);
        
        if ((data.weeklyOutline || []).length > 0) {
            if (!selectedWeekNumberForDetails && data.weeklyOutline[0]) {
              setSelectedWeekNumberForDetails(data.weeklyOutline[0].weekNumber);
            }
            if (activeMainTab === "configure" && data.weeklyOutline.length > 0) {
                 setActiveMainTab("weeklyDetails");
            }
        } else {
            setSelectedWeekNumberForDetails(null);
            if (activeMainTab === "weeklyDetails") {
                setActiveMainTab("configure");
            }
        }
      } else {
        setStoredScheduleData(null);
        setSelectedWeekNumberForDetails(null);
        setActiveMainTab("configure");
      }
      setIsLoadingStoredSchedule(false);
    }, (error) => {
      console.error("Error fetching stored schedule: ", error);
      toast({ title: "Error loading schedule", variant: "destructive" });
      setIsLoadingStoredSchedule(false);
    });

    const timeStateDocRef = doc(db, 'users', user.uid, 'timeTrackingState', 'currentState');
    const unsubscribeTimeState = onSnapshot(timeStateDocRef, async (docSnap) => {
      if (docSnap.exists()) {
        const fetchedState = docSnap.data() as TimeTrackingState;
        
        if (fetchedState.status !== 'clocked_out' && fetchedState.currentSessionId) {
          const logDocRef = doc(db, 'users', user.uid, 'timeTrackingLogs', fetchedState.currentSessionId);
          const logDocSnap = await getDoc(logDocRef);
          if (!logDocSnap.exists()) {
            console.warn(`Log document ${fetchedState.currentSessionId} not found. Resetting time tracking state.`);
            const correctedState: TimeTrackingState = { status: 'clocked_out', currentSessionId: null, lastClockInTime: null, lastBreakStartTime: null, lastLunchStartTime: null };
            await setDoc(timeStateDocRef, correctedState); 
            setTimeTrackingState(correctedState); 
          } else {
            setTimeTrackingState(fetchedState); 
          }
        } else {
          setTimeTrackingState(fetchedState); 
        }
      } else {
        const initialTimeState: TimeTrackingState = { status: 'clocked_out' };
        setDoc(timeStateDocRef, initialTimeState).catch(err => console.error("Error initializing time state", err));
        setTimeTrackingState(initialTimeState);
      }
      setIsLoadingTimeState(false);
    }, (error) => {
      console.error("Error fetching time tracking state: ", error);
      toast({ title: "Error loading time state", variant: "destructive" });
      setIsLoadingTimeState(false);
    });

    return () => {
      unsubscribeSchedule();
      unsubscribeTimeState();
    };
  }, [user, authLoading, router, pathname, toast, fetchLearningGoalFromProfile, activeMainTab]);

  const handleGenerateWeeklyOutline = async (e: FormEvent) => {
    e.preventDefault();
    if (!learningGoal.trim() || !workingDayStartTime || !workingDayEndTime) {
      toast({ title: "Missing Information", description: "Learning goal and working day start/end times are required.", variant: "destructive" });
      return;
    }
    if (!user) return;

    setIsLoadingWeeklyOutline(true);
    setSelectedWeekNumberForDetails(null); 

    try {
      const startDateForOutline = format(new Date(), 'yyyy-MM-dd');
      const input: GenerateWeeklyOutlineInput = {
        overallLearningGoal: learningGoal,
        scheduleDuration,
        workingDayStartTime,
        workingDayEndTime,
        weeklyHolidays: selectedHolidays,
        holidayStartTime: selectedHolidays.length > 0 && holidayStartTime ? holidayStartTime : undefined,
        holidayEndTime: selectedHolidays.length > 0 && holidayEndTime ? holidayEndTime : undefined,
        utilizeHolidays,
        startDateForOutline
      };
      const result: GenerateWeeklyOutlineOutput = await generateWeeklyOutline(input);
      
      const outlineWithEmptyTasks = result.weeklyOutline.map(week => ({...week, dailyTasks: [], dailyScheduleGenerated: false, summary: week.summary || '' }));
      
      const scheduleDocRef = doc(db, 'users', user.uid, 'schedule', 'mainSchedule');
      const dataToSave = {
        overallGoal: learningGoal,
        overallDuration: scheduleDuration,
        workingDayStartTime,
        workingDayEndTime,
        weeklyHolidays: selectedHolidays,
        holidayStartTime: selectedHolidays.length > 0 && holidayStartTime ? holidayStartTime : undefined,
        holidayEndTime: selectedHolidays.length > 0 && holidayEndTime ? holidayEndTime : undefined,
        utilizeHolidays,
        startDateForOutline,
        weeklyOutline: outlineWithEmptyTasks,
        createdAt: storedScheduleData?.createdAt || serverTimestamp(),
        updatedAt: serverTimestamp()
      };

      await setDoc(scheduleDocRef, dataToSave, { merge: true });
      
      if (outlineWithEmptyTasks.length > 0) {
        setSelectedWeekNumberForDetails(outlineWithEmptyTasks[0].weekNumber);
        setActiveMainTab("weeklyDetails");
      } else {
        setActiveMainTab("configure");
      }

      toast({ title: "Weekly Outline Generated!", description: "Your high-level weekly plan is ready." });
    } catch (error) {
      console.error('Error generating weekly outline:', error);
      toast({ title: "Outline Generation Failed", description: (error as Error).message, variant: "destructive" });
    } finally {
      setIsLoadingWeeklyOutline(false);
    }
  };

  const handleGenerateDailyTasksForWeek = async (week: WeeklyGoalItem) => {
    if (!user || !storedScheduleData) return;
    setIsLoadingDailyTasksForWeek(week.weekNumber);

    try {
      const input: GenerateDailyTasksInput = {
        periodGoal: week.goalOrTopic,
        periodStartDate: week.startDate,
        periodDurationDays: 7,
        workingDayStartTime: storedScheduleData.workingDayStartTime,
        workingDayEndTime: storedScheduleData.workingDayEndTime,
        weeklyHolidays: storedScheduleData.weeklyHolidays,
        holidayStartTime: storedScheduleData.holidayStartTime,
        holidayEndTime: storedScheduleData.holidayEndTime,
        utilizeHolidays: storedScheduleData.utilizeHolidays,
      };

      const result: GenerateDailyTasksOutput = await generateDailyTasks(input);
      
      const updatedWeeklyOutline = storedScheduleData.weeklyOutline.map(w => 
        w.weekNumber === week.weekNumber 
        ? { ...w, dailyTasks: result.tasks, dailyScheduleGenerated: true, summary: result.summary || w.summary } 
        : w
      );
      
      const scheduleDocRef = doc(db, 'users', user.uid, 'schedule', 'mainSchedule');
      await updateDoc(scheduleDocRef, {
        weeklyOutline: updatedWeeklyOutline,
        updatedAt: serverTimestamp()
      });

      toast({ title: `Daily Plan for Week ${week.weekNumber} Generated!`, description: `Topic: ${week.goalOrTopic}` });
    } catch (error) {
      console.error(`Error generating daily tasks for week ${week.weekNumber}:`, error);
      toast({ title: "Daily Plan Generation Failed", description: (error as Error).message, variant: "destructive" });
    } finally {
      setIsLoadingDailyTasksForWeek(null);
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
    
    const newSessionId = doc(collection(db, 'users', user.uid, 'timeTrackingLogs')).id; 
    const newLogRef = doc(db, 'users', user.uid, 'timeTrackingLogs', newSessionId);
    const newLog = {
        // sessionId: newSessionId, // Not strictly needed if doc ID is the session ID
        type: 'study_session_start',
        startTime: serverTimestamp(),
        endTime: null,
        durationMinutes: 0,
        activities: []
    };
    
    try {
        await setDoc(newLogRef, newLog);
        await updateTimeTrackingState({ 
            status: 'clocked_in', 
            lastClockInTime: serverTimestamp() as Timestamp, 
            currentSessionId: newSessionId 
        });
    } catch (error) {
        console.error("Error clocking in:", error);
        toast({ title: "Clock In Failed", description: (error as Error).message, variant: "destructive" });
    }
  };

  const handleClockOut = async () => {
    if (!user || !timeTrackingState || timeTrackingState.status !== 'clocked_in' || !timeTrackingState.currentSessionId || !timeTrackingState.lastClockInTime) return;
    
    const now = Timestamp.now();
    let durationMinutes = 0;
    if (timeTrackingState.lastClockInTime) {
        const lastClockInDate = (timeTrackingState.lastClockInTime as Timestamp).toDate();
        durationMinutes = Math.round((now.toMillis() - lastClockInDate.getTime()) / (1000 * 60));
    }

    const sessionLogRef = doc(db, 'users', user.uid, 'timeTrackingLogs', timeTrackingState.currentSessionId);
    try {
        await updateDoc(sessionLogRef, {
            endTime: now,
            durationMinutes: durationMinutes
        });
        await updateTimeTrackingState({ 
            status: 'clocked_out', 
            lastClockInTime: null, 
            currentSessionId: null 
        });
    } catch (error) {
        console.error("Error clocking out:", error);
        toast({ title: "Clock Out Failed", description: (error as Error).message, variant: "destructive" });
    }
  };
  
  const handleStartBreak = async () => {
      if (!user || !timeTrackingState || timeTrackingState.status !== 'clocked_in' || !timeTrackingState.currentSessionId) return;
      
      const breakActivity = { type: 'break_start', timestamp: Timestamp.now() };
      const sessionLogRef = doc(db, 'users', user.uid, 'timeTrackingLogs', timeTrackingState.currentSessionId);
      try {
        await updateDoc(sessionLogRef, { activities: arrayUnion(breakActivity) });
        await updateTimeTrackingState({ status: 'on_break', lastBreakStartTime: Timestamp.now() });
      } catch (error) {
        console.error("Error starting break:", error);
        toast({ title: "Action Failed", description: (error as Error).message, variant: "destructive" });
      }
  };

  const handleEndBreak = async () => {
      if (!user || !timeTrackingState || timeTrackingState.status !== 'on_break' || !timeTrackingState.currentSessionId) return;
      
      const breakEndActivity = { type: 'break_end', timestamp: Timestamp.now() };
      const sessionLogRef = doc(db, 'users', user.uid, 'timeTrackingLogs', timeTrackingState.currentSessionId);
      try {
        await updateDoc(sessionLogRef, { activities: arrayUnion(breakEndActivity) });
        await updateTimeTrackingState({ status: 'clocked_in', lastBreakStartTime: null });
      } catch (error) {
        console.error("Error ending break:", error);
        toast({ title: "Action Failed", description: (error as Error).message, variant: "destructive" });
      }
  };
  
   const handleStartLunch = async () => {
      if (!user || !timeTrackingState || timeTrackingState.status !== 'clocked_in' || !timeTrackingState.currentSessionId) return;
      
      const lunchActivity = { type: 'lunch_start', timestamp: Timestamp.now() };
      const sessionLogRef = doc(db, 'users', user.uid, 'timeTrackingLogs', timeTrackingState.currentSessionId);
      try {
        await updateDoc(sessionLogRef, { activities: arrayUnion(lunchActivity) });
        await updateTimeTrackingState({ status: 'on_lunch', lastLunchStartTime: Timestamp.now() });
      } catch (error) {
        console.error("Error starting lunch:", error);
        toast({ title: "Action Failed", description: (error as Error).message, variant: "destructive" });
      }
  };

  const handleEndLunch = async () => {
      if (!user || !timeTrackingState || timeTrackingState.status !== 'on_lunch' || !timeTrackingState.currentSessionId) return;
      
      const lunchEndActivity = { type: 'lunch_end', timestamp: Timestamp.now() };
      const sessionLogRef = doc(db, 'users', user.uid, 'timeTrackingLogs', timeTrackingState.currentSessionId);
      try {
        await updateDoc(sessionLogRef, { activities: arrayUnion(lunchEndActivity) });
        await updateTimeTrackingState({ status: 'clocked_in', lastLunchStartTime: null });
      } catch (error) {
        console.error("Error ending lunch:", error);
        toast({ title: "Action Failed", description: (error as Error).message, variant: "destructive" });
      }
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
  const canStartBreakOrLunch = timeTrackingState?.status === 'clocked_in';
  const canEndBreak = timeTrackingState?.status === 'on_break';
  const canEndLunch = timeTrackingState?.status === 'on_lunch';

  const currentSelectedWeekData = storedScheduleData?.weeklyOutline?.find(w => w.weekNumber === selectedWeekNumberForDetails);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Learning Schedule & Time Tracking"
        description="Define your learning plan and track your study sessions."
      />
      
      <Card>
        <CardHeader>
            <CardTitle className="flex items-center"><Clock className="mr-2 h-5 w-5 text-primary" /> Time Tracking</CardTitle>
            <CardDescription>
                Current Status: <span className="font-semibold capitalize">{timeTrackingState?.status.replace('_', ' ') || 'Loading...'}</span>
            </CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
            <Button onClick={handleClockIn} disabled={!canClockIn || isLoadingTimeState} className="bg-green-500 hover:bg-green-600 text-white"><Play className="mr-2 h-4 w-4" /> Clock In</Button>
            <Button onClick={handleClockOut} disabled={!canClockOut || isLoadingTimeState} className="bg-red-500 hover:bg-red-600 text-white"><Pause className="mr-2 h-4 w-4" /> Clock Out</Button>
            <Button onClick={handleStartBreak} disabled={!canStartBreakOrLunch || isLoadingTimeState} variant="outline"><Coffee className="mr-2 h-4 w-4" /> Start Break</Button>
            <Button onClick={handleEndBreak} disabled={!canEndBreak || isLoadingTimeState} variant="outline"><Play className="mr-2 h-4 w-4" /> End Break</Button>
            <Button onClick={handleStartLunch} disabled={!canStartBreakOrLunch || isLoadingTimeState} variant="outline"><Utensils className="mr-2 h-4 w-4" /> Start Lunch</Button>
            <Button onClick={handleEndLunch} disabled={!canEndLunch || isLoadingTimeState} variant="outline"><Play className="mr-2 h-4 w-4" /> End Lunch</Button>
        </CardContent>
      </Card>

      <Tabs value={activeMainTab} onValueChange={setActiveMainTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="configure">Configure & Outline</TabsTrigger>
          <TabsTrigger value="weeklyDetails" disabled={!storedScheduleData?.weeklyOutline || storedScheduleData.weeklyOutline.length === 0}>
            Weekly Details
          </TabsTrigger>
        </TabsList>

        <TabsContent value="configure" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle>Schedule Parameters</CardTitle>
                <CardDescription>Define your overall learning goal and availability to generate a weekly outline.</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleGenerateWeeklyOutline} className="space-y-4">
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
                    <Label>Working Day Availability</Label>
                    <div className="flex gap-2">
                        <Input type="time" id="workingDayStartTime" value={workingDayStartTime} onChange={(e) => setWorkingDayStartTime(e.target.value)} required aria-label="Working day start time"/>
                        <Input type="time" id="workingDayEndTime" value={workingDayEndTime} onChange={(e) => setWorkingDayEndTime(e.target.value)} required aria-label="Working day end time"/>
                    </div>
                  </div>

                  <div>
                    <Label>Weekly Holidays (Select days off)</Label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 mt-1">
                        {allDaysOfWeek.map(day => (
                            <div key={day} className="flex items-center space-x-2 p-2 border rounded-md hover:bg-accent/50 transition-colors">
                                <Checkbox 
                                    id={`holiday-${day}`} 
                                    checked={selectedHolidays.includes(day)} 
                                    onCheckedChange={() => handleHolidayChange(day)}
                                />
                                <Label htmlFor={`holiday-${day}`} className="text-sm font-normal cursor-pointer flex-grow">{day}</Label>
                            </div>
                        ))}
                    </div>
                  </div>

                  {selectedHolidays.length > 0 && (
                    <div>
                        <Label>Holiday Availability (If studying on selected holidays)</Label>
                        <div className="flex gap-2">
                            <Input type="time" id="holidayStartTime" value={holidayStartTime} onChange={(e) => setHolidayStartTime(e.target.value)} aria-label="Holiday start time"/>
                            <Input type="time" id="holidayEndTime" value={holidayEndTime} onChange={(e) => setHolidayEndTime(e.target.value)} aria-label="Holiday end time"/>
                        </div>
                         <p className="text-xs text-muted-foreground mt-1">Define study times for selected holidays. Leave blank if holidays are full rest days (unless "Utilize Holidays" is checked below).</p>
                    </div>
                  )}
                   <div className="flex items-center space-x-2 pt-2">
                    <Checkbox id="utilizeHolidays" checked={utilizeHolidays} onCheckedChange={(checked) => setUtilizeHolidays(Boolean(checked))} />
                    <Label htmlFor="utilizeHolidays" className="text-sm font-normal">
                      Allow AI to schedule tasks on selected holidays if crucial, even if specific holiday study times aren't set (AI will assume reasonable duration).
                    </Label>
                  </div>

                  <Button type="submit" className="w-full" disabled={isLoadingWeeklyOutline}>
                    {isLoadingWeeklyOutline ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ListChecks className="mr-2 h-4 w-4" />}
                    {isLoadingWeeklyOutline ? 'Generating Outline...' : (storedScheduleData?.weeklyOutline?.length > 0 ? 'Regenerate Weekly Outline' : 'Generate Weekly Outline')}
                  </Button>
                </form>
              </CardContent>
            </Card>
        </TabsContent>

        <TabsContent value="weeklyDetails" className="mt-4">
            <Card>
                <CardHeader>
                <CardTitle>Weekly Learning Plan</CardTitle>
                {(!storedScheduleData?.weeklyOutline || storedScheduleData.weeklyOutline.length === 0) && <CardDescription>Generate a weekly outline first from the "Configure & Outline" tab.</CardDescription>}
                {(storedScheduleData?.weeklyOutline && storedScheduleData.weeklyOutline.length > 0) && <CardDescription>Select a week to view or generate its detailed daily tasks.</CardDescription>}
                </CardHeader>
                <CardContent>
                {isLoadingWeeklyOutline && <div className="flex justify-center items-center py-8"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}
                
                {!isLoadingWeeklyOutline && storedScheduleData?.weeklyOutline && storedScheduleData.weeklyOutline.length > 0 && (
                  <div className="space-y-4">
                    <Select 
                        value={selectedWeekNumberForDetails?.toString()} 
                        onValueChange={(value) => setSelectedWeekNumberForDetails(Number(value))}
                    >
                      <SelectTrigger className="w-full md:w-[300px]">
                        <SelectValue placeholder="Select a week" />
                      </SelectTrigger>
                      <SelectContent>
                        {storedScheduleData.weeklyOutline.map(week => (
                          <SelectItem key={`week-select-${week.weekNumber}`} value={week.weekNumber.toString()}>
                            Week {week.weekNumber}: {week.goalOrTopic.substring(0,30)}{week.goalOrTopic.length > 30 ? '...' : ''} ({format(parseISO(week.startDate), 'MMM d')} - {format(parseISO(week.endDate), 'MMM d')})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    {currentSelectedWeekData && (
                       <Card className="mt-4">
                        <CardHeader>
                            <CardTitle>Week {currentSelectedWeekData.weekNumber}: {currentSelectedWeekData.goalOrTopic}</CardTitle>
                            <CardDescription>Dates: {format(parseISO(currentSelectedWeekData.startDate), 'MMM d, yyyy')} - {format(parseISO(currentSelectedWeekData.endDate), 'MMM d, yyyy')}</CardDescription>
                            {currentSelectedWeekData.summary && <p className="text-sm text-muted-foreground mt-2"><em>Weekly Summary: {currentSelectedWeekData.summary}</em></p>}
                        </CardHeader>
                        <CardContent>
                            {isLoadingDailyTasksForWeek === currentSelectedWeekData.weekNumber && (
                            <div className="flex justify-center items-center py-8"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
                            )}
                            {isLoadingDailyTasksForWeek !== currentSelectedWeekData.weekNumber && (!currentSelectedWeekData.dailyTasks || currentSelectedWeekData.dailyTasks.length === 0) && (
                            <div className="text-center py-4">
                                <p className="text-sm text-muted-foreground mb-2">No daily tasks generated for this week yet.</p>
                                <Button onClick={() => handleGenerateDailyTasksForWeek(currentSelectedWeekData)} disabled={isLoadingDailyTasksForWeek === currentSelectedWeekData.weekNumber}>
                                <CalendarPlus className="mr-2 h-4 w-4" /> Generate Daily Plan for Week {currentSelectedWeekData.weekNumber}
                                </Button>
                            </div>
                            )}
                            {isLoadingDailyTasksForWeek !== currentSelectedWeekData.weekNumber && currentSelectedWeekData.dailyTasks && currentSelectedWeekData.dailyTasks.length > 0 && (
                            <>
                                <div className="overflow-x-auto max-h-[400px] mb-4">
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
                                    {currentSelectedWeekData.dailyTasks.map((task, index) => (
                                        <TableRow key={index}>
                                        <TableCell>{task.date ? format(parseISO(task.date), 'MMM d, yyyy') : 'N/A'}</TableCell>
                                        <TableCell>{task.dayOfWeek}</TableCell>
                                        <TableCell>{task.topic}</TableCell>
                                        <TableCell>{task.estimatedDuration || 'N/A'}</TableCell>
                                        <TableCell>{task.timeSlot || 'Flexible'}</TableCell>
                                        </TableRow>
                                    ))}
                                    </TableBody>
                                </Table>
                                </div>
                                <Button onClick={() => handleGenerateDailyTasksForWeek(currentSelectedWeekData)} variant="outline" disabled={isLoadingDailyTasksForWeek === currentSelectedWeekData.weekNumber}>
                                {isLoadingDailyTasksForWeek === currentSelectedWeekData.weekNumber ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Zap className="mr-2 h-4 w-4" />}
                                Regenerate Daily Plan
                                </Button>
                            </>
                            )}
                        </CardContent>
                        </Card>
                    )}
                  </div>
                )}
                {!isLoadingWeeklyOutline && (!storedScheduleData?.weeklyOutline || storedScheduleData.weeklyOutline.length === 0) && (
                    <div className="text-center py-8 text-muted-foreground">
                    <CalendarDays className="mx-auto h-12 w-12 opacity-50 mb-4" />
                    <p>No weekly outline generated yet.</p>
                    <p className="text-sm">Go to the "Configure & Outline" tab to generate one.</p>
                    </div>
                )}
                </CardContent>
            </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
