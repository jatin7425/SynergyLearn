
'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import PageHeader from '@/components/common/page-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { Bar, Line, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LabelList, BarChart, LineChart, PieChart } from 'recharts';
import { Activity, BookOpen, CheckCircle, Clock, Target, Loader2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';


const weeklyProgressData = [
  { day: 'Mon', hours: 2, tasks: 3 },
  { day: 'Tue', hours: 3, tasks: 5 },
  { day: 'Wed', hours: 1.5, tasks: 2 },
  { day: 'Thu', hours: 4, tasks: 6 },
  { day: 'Fri', hours: 2.5, tasks: 4 },
  { day: 'Sat', hours: 5, tasks: 7 },
  { day: 'Sun', hours: 1, tasks: 1 },
];

const weeklyProgressChartConfig = {
  hours: { label: 'Study Hours', color: 'hsl(var(--primary))' },
  tasks: { label: 'Tasks Completed', color: 'hsl(var(--accent))' },
} satisfies import('@/components/ui/chart').ChartConfig;

const subjectTimeData = [
  { name: 'Quantum Physics', value: 40, fill: 'hsl(var(--chart-1))' },
  { name: 'JavaScript', value: 30, fill: 'hsl(var(--chart-2))' },
  { name: 'History', value: 20, fill: 'hsl(var(--chart-3))' },
  { name: 'Mathematics', value: 10, fill: 'hsl(var(--chart-4))' },
];

const overallStats = [
    { title: "Total Study Hours", value: "125", icon: Clock, trend: "+15% this month" },
    { title: "Completed Milestones", value: "8", icon: Target, trend: "+2 last week" },
    { title: "Notes Taken", value: "47", icon: BookOpen, trend: "+5 this week" }, 
    { title: "Avg. Task Completion", value: "85%", icon: CheckCircle, trend: "Consistent" },
];


export default function AnalyticsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const { toast } = useToast();

  useEffect(() => {
    if (!authLoading && !user) {
      toast({ title: "Authentication Required", description: "Please log in to view your analytics.", variant: "destructive" });
      router.push(`/login?redirect=${pathname}`);
    }
  }, [user, authLoading, router, pathname, toast]);

  if (authLoading) {
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
        <p className="text-muted-foreground mb-4">You need to be logged in to view your analytics.</p>
        <Button onClick={() => router.push(`/login?redirect=${pathname}`)}>Go to Login</Button>
      </div>
    );
  }

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
                    <p className="text-xs text-muted-foreground">{stat.trend}</p>
                </CardContent>
            </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Weekly Study Activity</CardTitle>
            <CardDescription>Study hours and tasks completed this week.</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px] md:h-[350px]">
            <ChartContainer config={weeklyProgressChartConfig} className="h-full w-full">
              <ResponsiveContainer>
                <LineChart data={weeklyProgressData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="day" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <YAxis yAxisId="left" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <YAxis yAxisId="right" orientation="right" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Legend />
                  <Line yAxisId="left" type="monotone" dataKey="hours" stroke="var(--color-hours)" strokeWidth={2} dot={{ r: 4 }} />
                  <Line yAxisId="right" type="monotone" dataKey="tasks" stroke="var(--color-tasks)" strokeWidth={2} dot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Time Allocation by Subject</CardTitle>
            <CardDescription>How your study time is distributed.</CardDescription>
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
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>
      
      <Card>
        <CardHeader>
            <CardTitle>Focus Areas & Improvement Suggestions</CardTitle>
            <CardDescription>AI-powered insights based on your activity (placeholder).</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
            <div className="flex items-start p-3 border rounded-md bg-card hover:shadow-md transition-shadow">
                <Activity className="h-5 w-5 text-primary mr-3 mt-1 flex-shrink-0" />
                <div>
                    <p className="font-semibold">Consistent Effort in JavaScript</p>
                    <p className="text-sm text-muted-foreground">You've shown consistent study hours in JavaScript. Consider tackling a more complex project to solidify your skills.</p>
                </div>
            </div>
            <div className="flex items-start p-3 border rounded-md bg-card hover:shadow-md transition-shadow"> 
                <Clock className="h-5 w-5 text-yellow-500 dark:text-yellow-400 mr-3 mt-1 flex-shrink-0" /> 
                <div>
                    <p className="font-semibold">Low Activity in History</p>
                    <p className="text-sm text-muted-foreground">Your activity in History has been low this month. Try scheduling short, focused review sessions or use flashcards for key dates and events.</p>
                </div>
            </div>
        </CardContent>
      </Card>
    </div>
  );
}
