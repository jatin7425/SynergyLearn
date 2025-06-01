
'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import PageHeader from '@/components/common/page-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer, LabelList, LineChart, PieChart, Pie, Cell } from 'recharts'; // BarChart removed for now, PieChart added
import { Activity, BookOpen, CheckCircle, Clock, Target, Loader2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs,getCountFromServer } from 'firebase/firestore';
import type { Timestamp } from 'firebase/firestore';

interface Milestone {
  id: string;
  title: string;
  description: string;
  status: 'todo' | 'inprogress' | 'done';
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
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
  // Other stats would need more complex data models and logging.
  const [totalStudyHours, setTotalStudyHours] = useState(0); // Placeholder
  const [avgTaskCompletion, setAvgTaskCompletion] = useState(0); // Placeholder
  
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
            
            // TODO: Implement fetching for weekly progress and subject time if data model supports it
            // For now, they use initial/placeholder data.
            // setTotalStudyHours(...);
            // setAvgTaskCompletion(...);

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

  if (!user) { // Fallback
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4 text-center">
        <AlertCircle className="w-16 h-16 text-destructive mb-4" />
        <h1 className="text-2xl font-bold mb-2">Access Denied</h1>
        <p className="text-muted-foreground mb-4">You need to be logged in to view your analytics.</p>
        <Button onClick={() => router.push(`/login?redirect=${pathname}`)}>Go to Login</Button>
      </div>
    );
  }
  
  const overallStats = [
    { title: "Total Study Hours", value: totalStudyHours > 0 ? `${totalStudyHours}` : "N/A", icon: Clock, trend: "Tracking not fully implemented" },
    { title: "Completed Milestones", value: `${completedMilestonesCount}`, icon: Target, trend: "" },
    { title: "Notes Taken", value: `${notesCount}`, icon: BookOpen, trend: "" }, 
    { title: "Avg. Task Completion", value: avgTaskCompletion > 0 ? `${avgTaskCompletion}%` : "N/A", icon: CheckCircle, trend: "Tracking not fully implemented" },
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
            <p className="text-xs text-muted-foreground text-center mt-2">Note: Detailed weekly tracking requires further implementation.</p>
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
             <p className="text-xs text-muted-foreground text-center mt-2 absolute bottom-4 left-1/2 -translate-x-1/2 w-full px-4">Note: Subject-based time tracking is not yet implemented.</p>
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
                    <p className="text-sm text-muted-foreground">Keep your milestones updated to get better insights here.</p>
                </div>
            </div>
            <div className="flex items-start p-3 border rounded-md bg-card hover:shadow-md transition-shadow"> 
                <Clock className="h-5 w-5 text-yellow-500 dark:text-yellow-400 mr-3 mt-1 flex-shrink-0" /> 
                <div>
                    <p className="font-semibold">AI Suggestions Coming Soon</p>
                    <p className="text-sm text-muted-foreground">Future updates will provide personalized suggestions based on your learning patterns.</p>
                </div>
            </div>
        </CardContent>
      </Card>
    </div>
  );
}

    