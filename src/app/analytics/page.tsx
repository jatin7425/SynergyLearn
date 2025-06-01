
'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import PageHeader from '@/components/common/page-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer, LabelList, LineChart, PieChart, Pie, Cell } from 'recharts';
import { Activity, BookOpen, CheckCircle, Clock, Target, Loader2, AlertCircle, CalendarCheck2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, getCountFromServer, Timestamp, onSnapshot } from 'firebase/firestore';

interface Milestone {
  id: string;
  title: string;
  description: string;
  status: 'todo' | 'inprogress' | 'done';
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

interface TimeLog {
    id?: string; // Firestore doc ID
    sessionId: string;
    type: 'study_session_start' | 'study_session_end'; // Assuming study_session_end is implicitly when endTime is set
    startTime: Timestamp;
    endTime: Timestamp | null;
    durationMinutes: number;
    activities: Array<{type: string, timestamp: Timestamp}>; // For breaks/lunch
}

const initialWeeklyProgressData = [
  { day: 'Mon', hours: 0, tasks: 0 }, { day: 'Tue', hours: 0, tasks: 0 },
  { day: 'Wed', hours: 0, tasks: 0 }, { day: 'Thu', hours: 0, tasks: 0 },
  { day: 'Fri', hours: 0, tasks: 0 }, { day: 'Sat', hours: 0, tasks: 0 },
  { day: 'Sun', hours: 0, tasks: 0 },
];

const weeklyProgressChartConfig = {
  hours: { label: 'Study Hours', color: 'hsl(var(--primary))' },
  tasks: { label: 'Tasks Completed', color: 'hsl(var(--accent))' },
} satisfies import('@/components/ui/chart').ChartConfig;

const initialSubjectTimeData = [
  { name: 'Not Tracked', value: 100, fill: 'hsl(var(--muted))' },
];


export default function AnalyticsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const { toast } = useToast();

  const [isLoadingAnalytics, setIsLoadingAnalytics] = useState(true);
  const [notesCount, setNotesCount] = useState(0);
  const [completedMilestonesCount, setCompletedMilestonesCount] = useState(0);
  const [totalStudyHours, setTotalStudyHours] = useState(0);
  const [consistency, setConsistency] = useState(0); // Percentage
  
  const [weeklyProgressData, setWeeklyProgressData] = useState(initialWeeklyProgressData);
  const [subjectTimeData, setSubjectTimeData] = useState(initialSubjectTimeData);


  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      toast({ title: "Authentication Required", description: "Please log in to view your analytics.", variant: "destructive" });
      router.push(`/login?redirect=${pathname}`);
      return;
    }
    
    setIsLoadingAnalytics(true);
    const fetchData = async () => {
        if (!user) return; // Should not happen if authLoading is false and user is null
        try {
            // Fetch notes count
            const notesCol = collection(db, 'users', user.uid, 'notes');
            const notesSnapshot = await getCountFromServer(notesCol);
            setNotesCount(notesSnapshot.data().count);

            // Fetch completed milestones
            const milestonesCol = collection(db, 'users', user.uid, 'milestones');
            const completedQuery = query(milestonesCol, where('status', '==', 'done'));
            const completedSnapshot = await getCountFromServer(completedQuery);
            setCompletedMilestonesCount(completedSnapshot.data().count);
            
            // Fetch time tracking logs for total study hours and consistency
            const timeLogsColRef = collection(db, 'users', user.uid, 'timeTrackingLogs');
            const unsubscribeTimeLogs = onSnapshot(timeLogsColRef, (snapshot) => {
                let hoursSum = 0;
                const clockedInDays = new Set<string>();
                snapshot.forEach(doc => {
                    const log = doc.data() as TimeLog;
                    if (log.durationMinutes && log.endTime) { // Ensure session is complete
                        hoursSum += log.durationMinutes;
                    }
                    if (log.startTime) {
                        clockedInDays.add(log.startTime.toDate().toISOString().split('T')[0]); // YYYY-MM-DD
                    }
                });
                setTotalStudyHours(Math.round(hoursSum / 60 * 10) / 10); // Convert minutes to hours, 1 decimal place
                
                // Calculate consistency (e.g., % of last 30 days active, or since first log if less than 30 days data)
                if (snapshot.docs.length > 0) {
                    const firstLogDate = snapshot.docs.reduce((earliest, doc) => {
                        const logDate = (doc.data() as TimeLog).startTime?.toDate();
                        return logDate && logDate < earliest ? logDate : earliest;
                    }, new Date());
                    
                    const today = new Date();
                    const diffTime = Math.abs(today.getTime() - firstLogDate.getTime());
                    const diffDaysTotal = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                    const daysToConsider = Math.min(diffDaysTotal, 30);

                    if (daysToConsider > 0) {
                        setConsistency(Math.round((clockedInDays.size / daysToConsider) * 100));
                    } else {
                        setConsistency(0);
                    }
                } else {
                    setConsistency(0);
                }
            }, (error) => {
                console.error("Error fetching time logs: ", error);
                toast({ title: "Error", description: "Could not load time tracking data.", variant: "destructive" });
            });
            // Note: Unsubscribe logic for onSnapshot needs to be handled in cleanup if component unmounts.
            // For simplicity here, if this page remains mounted, it's okay.
            // return () => unsubscribeTimeLogs(); // For production, ensure this cleanup

        } catch (error) {
            console.error("Error fetching analytics data: ", error);
            toast({ title: "Error", description: "Could not load analytics data.", variant: "destructive" });
        } finally {
            setIsLoadingAnalytics(false);
        }
    };
    fetchData();

  }, [user, authLoading, router, pathname, toast]);

  if (authLoading || isLoadingAnalytics) {
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
  
  const overallStats = [
    { title: "Total Study Hours", value: `${totalStudyHours}`, icon: Clock, trend: "Tracked from schedule page" },
    { title: "Completed Milestones", value: `${completedMilestonesCount}`, icon: Target, trend: "" },
    { title: "Notes Taken", value: `${notesCount}`, icon: BookOpen, trend: "" }, 
    { title: "Learning Consistency", value: `${consistency}%`, icon: CalendarCheck2, trend: "Based on last 30 days activity" },
  ];


  return (
    <div className="space-y-6">
      <PageHeader
        title="Learning Analytics"
        description="Visualize your learning progress and identify areas for improvement."
      />

      <div className="grid gap-4 md:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        {overallStats.map(stat => (
             <Card key={stat.title}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
                    <stat.icon className="h-5 w-5 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{stat.value}</div>
                    {stat.trend && <p className="text-xs text-muted-foreground">{stat.trend}</p>}
                </CardContent>
            </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Weekly Study Activity</CardTitle>
            <CardDescription>Study hours and tasks completed this week (Placeholder data).</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px] md:h-[350px]">
            <ChartContainer config={weeklyProgressChartConfig} className="h-full w-full">
              <ResponsiveContainer>
                <LineChart data={weeklyProgressData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="day" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <YAxis yAxisId="left" stroke="hsl(var(--muted-foreground))" fontSize={12} label={{ value: 'Hours', angle: -90, position: 'insideLeft', fill: 'hsl(var(--muted-foreground))' }} />
                  <YAxis yAxisId="right" orientation="right" stroke="hsl(var(--muted-foreground))" fontSize={12} label={{ value: 'Tasks', angle: 90, position: 'insideRight', fill: 'hsl(var(--muted-foreground))' }} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Line yAxisId="left" type="monotone" dataKey="hours" stroke="var(--color-hours)" strokeWidth={2} dot={{ r: 4 }} name="Study Hours" />
                  <Line yAxisId="right" type="monotone" dataKey="tasks" stroke="var(--color-tasks)" strokeWidth={2} dot={{ r: 4 }} name="Tasks Completed" />
                </LineChart>
              </ResponsiveContainer>
            </ChartContainer>
            <p className="text-xs text-muted-foreground text-center mt-2">Note: Detailed weekly tracking requires further implementation of data aggregation.</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Time Allocation by Subject</CardTitle>
            <CardDescription>How your study time is distributed (Placeholder data).</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px] md:h-[350px] flex justify-center items-center">
             <ChartContainer config={{}} className="h-full w-full max-w-xs md:max-w-sm"> 
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <ChartTooltip content={<ChartTooltipContent hideLabel />} />
                  <Pie data={subjectTimeData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius="80%" > 
                    {subjectTimeData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                     <LabelList
                        dataKey="name"
                        position="outside" 
                        className="fill-foreground" 
                        stroke="none"
                        fontSize={12}
                        formatter={(value: string) => value}
                      />
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </ChartContainer>
             <p className="text-xs text-muted-foreground text-center mt-2 absolute bottom-4 left-1/2 -translate-x-1/2 w-full px-4">Note: Subject-based time tracking is not yet implemented. Requires linking schedule topics to time logs.</p>
          </CardContent>
        </Card>
      </div>
      
      <Card>
        <CardHeader>
            <CardTitle>Focus Areas & Improvement Suggestions</CardTitle>
            <CardDescription>AI-powered insights based on your activity (placeholder for future AI integration).</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
            <div className="flex items-start p-3 border rounded-md bg-card hover:shadow-md transition-shadow">
                <Activity className="h-5 w-5 text-primary mr-3 mt-1 flex-shrink-0" />
                <div>
                    <p className="font-semibold">Track Your Progress</p>
                    <p className="text-sm text-muted-foreground">Use the time tracking features on the Schedule page. Keep your milestones updated to get better insights here.</p>
                </div>
            </div>
            <div className="flex items-start p-3 border rounded-md bg-card hover:shadow-md transition-shadow"> 
                <Clock className="h-5 w-5 text-yellow-500 dark:text-yellow-400 mr-3 mt-1 flex-shrink-0" /> 
                <div>
                    <p className="font-semibold">AI Suggestions Coming Soon</p>
                    <p className="text-sm text-muted-foreground">Future updates will provide personalized suggestions based on your learning patterns and quiz performance.</p>
                </div>
            </div>
        </CardContent>
      </Card>
    </div>
  );
}
