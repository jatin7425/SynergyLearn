
'use client';

import PageHeader from '@/components/common/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebase';
import { collection, doc, getDoc, onSnapshot, Timestamp } from 'firebase/firestore';
import { AlertCircle, CheckCircle, Circle, Loader2, MapPin, CalendarDays, PlusCircle, Target } from 'lucide-react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import React, { useEffect, useState, useMemo } from 'react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { parseISO, isBefore, isAfter, startOfToday, format, isWithinInterval, addDays } from 'date-fns';

interface WeeklyGoalItem {
  weekNumber: number;
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD
  goalOrTopic: string;
  dailyTasks?: any[]; // Keep if present in StoredScheduleData
  dailyScheduleGenerated?: boolean; // Keep if present in StoredScheduleData
  summary?: string; // Keep if present in StoredScheduleData
}

interface StoredScheduleData {
  id: string; // mainSchedule
  overallGoal: string; // This might be different from the profile's learningGoal, or redundant.
  weeklyOutline: WeeklyGoalItem[];
  // ... other schedule fields if needed for context, though weeklyOutline is primary here
}

type WeekStatus = 'todo' | 'inprogress' | 'done';

interface MappedWeekItem extends WeeklyGoalItem {
  status: WeekStatus;
}

const statusConfig: Record<WeekStatus, { icon: React.ElementType; color: string; bgColor: string; borderColor: string; animate?: boolean }> = {
  todo: { icon: Circle, color: 'text-muted-foreground', bgColor: 'bg-muted/30', borderColor: 'border-muted/50' },
  inprogress: { icon: Loader2, color: 'text-blue-500', bgColor: 'bg-blue-500/10', borderColor: 'border-blue-500/50', animate: true },
  done: { icon: CheckCircle, color: 'text-green-500', bgColor: 'bg-green-500/10', borderColor: 'border-green-500/50' },
};

export default function ProgressMapPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const { toast } = useToast();

  const [profileLearningGoal, setProfileLearningGoal] = useState<string | null>(null);
  const [scheduleData, setScheduleData] = useState<StoredScheduleData | null>(null);
  const [isLoadingData, setIsLoadingData] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      toast({ title: "Authentication Required", description: "Please log in to view your progress map.", variant: "destructive" });
      router.push(`/login?redirect=${pathname}`);
      return;
    }

    setIsLoadingData(true);
    let goalUnsubscribe: (() => void) | null = null;
    let scheduleUnsubscribe: (() => void) | null = null;

    // Fetch learning goal from profile
    const profileRef = doc(db, 'users', user.uid, 'profile', 'main');
    goalUnsubscribe = onSnapshot(profileRef, (docSnap) => {
      if (docSnap.exists() && docSnap.data()?.learningGoal) {
        setProfileLearningGoal(docSnap.data()?.learningGoal);
      } else {
        setProfileLearningGoal(null);
      }
    }, (error) => {
      console.error("Error fetching learning goal: ", error);
      toast({ title: "Error", description: "Could not fetch learning goal.", variant: "destructive" });
    });

    // Fetch schedule data (which contains weeklyOutline)
    const scheduleDocRef = doc(db, 'users', user.uid, 'schedule', 'mainSchedule');
    scheduleUnsubscribe = onSnapshot(scheduleDocRef, (docSnap) => {
      if (docSnap.exists()) {
        setScheduleData({ id: docSnap.id, ...docSnap.data() } as StoredScheduleData);
      } else {
        setScheduleData(null);
      }
      setIsLoadingData(false); 
    }, (error) => {
      console.error("Error fetching schedule data: ", error);
      toast({ title: "Error", description: "Could not fetch schedule data.", variant: "destructive" });
      setScheduleData(null);
      setIsLoadingData(false);
    });
    
    return () => {
      if (goalUnsubscribe) goalUnsubscribe();
      if (scheduleUnsubscribe) scheduleUnsubscribe();
    };

  }, [user, authLoading, router, pathname, toast]);

  const mappedWeeklyGoals: MappedWeekItem[] = useMemo(() => {
    if (!scheduleData?.weeklyOutline) return [];
    
    const today = startOfToday();
    return scheduleData.weeklyOutline.map(week => {
      const weekStartDate = parseISO(week.startDate);
      const weekEndDate = parseISO(week.endDate);
      let status: WeekStatus;

      if (isBefore(weekEndDate, today)) {
        status = 'done';
      } else if (isAfter(weekStartDate, today)) {
        status = 'todo';
      } else { // Current week: startDate is today or in past, endDate is today or in future
        status = 'inprogress';
      }
      return { ...week, status };
    }).sort((a, b) => a.weekNumber - b.weekNumber); // Ensure sorted by week number
  }, [scheduleData]);


  if (authLoading || isLoadingData) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) { // Fallback, should be handled by useEffect redirect
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4 text-center">
        <AlertCircle className="w-16 h-16 text-destructive mb-4" />
        <h1 className="text-2xl font-bold mb-2">Access Denied</h1>
        <Button onClick={() => router.push(`/login?redirect=${pathname}`)}>Go to Login</Button>
      </div>
    );
  }
  
  if (!profileLearningGoal) {
    return (
      <div className="space-y-6">
        <PageHeader title="Your Learning Journey" description="Visualize your path to success." />
        <Card className="text-center">
          <CardHeader>
            <Target className="mx-auto h-12 w-12 text-muted-foreground opacity-50 mb-4" />
            <CardTitle>Set Your Main Learning Goal</CardTitle>
            <CardDescription>Define your primary learning objective to start your journey map. This can be set on the Roadmap page.</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/roadmap/new" passHref>
              <Button>
                <PlusCircle className="mr-2 h-4 w-4" /> Set Learning Goal
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!scheduleData || !scheduleData.weeklyOutline || scheduleData.weeklyOutline.length === 0) {
     return (
      <div className="space-y-6">
        <PageHeader title="Your Learning Journey" description={`Goal: ${profileLearningGoal}`} />
        <Card>
          <CardHeader className="text-center">
            <CalendarDays className="mx-auto h-12 w-12 text-muted-foreground opacity-50 mb-4" />
            <CardTitle>No Weekly Schedule Outline Found</CardTitle>
            <CardDescription>Generate your weekly learning outline on the "Schedule" page to see it on the map.</CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Link href="/schedule" passHref>
              <Button variant="outline">Go to Schedule Page</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }


  return (
    <div className="space-y-6 w-full">
      <PageHeader title="Your Learning Journey" description={`Goal: ${profileLearningGoal}`} />

      <div className="overflow-x-auto pb-4">
          <div className="flex items-start py-8 px-4 min-w-max space-x-4">
            {/* Start Point */}
            <div className="flex flex-col items-center space-y-2 flex-shrink-0 pt-12">
                <div className="h-8 w-8 bg-primary rounded-full flex items-center justify-center text-primary-foreground shadow-md">
                    <Target size={18} />
                </div>
                <p className="text-xs font-semibold text-primary">Start</p>
            </div>

            {/* Weekly Goal Cards */}
            {mappedWeeklyGoals.map((week) => {
              const config = statusConfig[week.status];
              const Icon = config.icon;
              return (
                <React.Fragment key={`week-${week.weekNumber}`}>
                  {/* Connecting Line */}
                  <div className={cn(
                      "flex-grow h-1 mt-[58px]", // Align with middle of icon
                      week.status === 'done' ? 'bg-green-500' : 'bg-border',
                      "min-w-[50px] md:min-w-[80px]"
                  )} />

                  {/* Weekly Goal Node */}
                  <div className="flex flex-col items-center space-y-2 flex-shrink-0">
                    <div className={cn("h-8 w-8 rounded-full flex items-center justify-center shadow-md", config.bgColor, config.borderColor, "border-2")}>
                      <Icon size={18} className={cn(config.color, config.animate && "animate-spin")} />
                    </div>
                    <Card className={cn("w-56 md:w-64 shadow-lg", config.borderColor, "border-2")}>
                      <CardHeader className={cn("p-3", config.bgColor)}>
                        <CardTitle className="text-sm truncate">Week {week.weekNumber}: {week.goalOrTopic}</CardTitle>
                         <CardDescription className="text-xs">
                           {format(parseISO(week.startDate), 'MMM d')} - {format(parseISO(week.endDate), 'MMM d, yyyy')}
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="p-3">
                        <p className={cn("text-xs font-semibold capitalize", config.color)}>{week.status}</p>
                        {week.summary && <p className="text-xs text-muted-foreground line-clamp-2 mt-1">Summary: {week.summary}</p>}
                      </CardContent>
                    </Card>
                  </div>
                </React.Fragment>
              );
            })}

            {/* Connecting Line to Goal */}
            <div className={cn(
                "flex-grow h-1 mt-[58px]",
                mappedWeeklyGoals.every(w => w.status === 'done') ? 'bg-green-500' : 'bg-border',
                "min-w-[50px] md:min-w-[80px]"
            )} />
            
            {/* Goal / End Point */}
             <div className="flex flex-col items-center space-y-2 flex-shrink-0 pt-12">
                <div className={cn(
                    "h-10 w-10 rounded-full flex items-center justify-center text-primary-foreground shadow-xl",
                    mappedWeeklyGoals.every(w => w.status === 'done') ? 'bg-green-500' : 'bg-primary'
                )}>
                    <MapPin size={22} />
                </div>
                <p className={cn(
                    "text-sm font-bold w-40 text-center truncate",
                     mappedWeeklyGoals.every(w => w.status === 'done') ? 'text-green-600' : 'text-primary'
                )}>{profileLearningGoal}</p>
            </div>
          </div>
        </div>
    </div>
  );
}
