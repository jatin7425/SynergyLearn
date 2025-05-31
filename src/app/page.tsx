
'use client';

import PageHeader from '@/components/common/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { CheckCircle, Lightbulb, Target, PlusCircle, Activity, GitFork } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, BarChart } from 'recharts'; // Corrected import for BarChart

const chartData = [
  { month: "January", tasks: 12, goals: 2 },
  { month: "February", tasks: 19, goals: 3 },
  { month: "March", tasks: 23, goals: 4 },
  { month: "April", tasks: 17, goals: 3 },
  { month: "May", tasks: 25, goals: 5 },
  { month: "June", tasks: 18, goals: 3 },
];

const chartConfig = {
  tasks: {
    label: "Tasks Completed",
    color: "hsl(var(--primary))",
  },
  goals: {
    label: "Goals Achieved",
    color: "hsl(var(--accent))",
  },
} satisfies import('@/components/ui/chart').ChartConfig;


export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        description="Welcome back! Here's an overview of your learning journey."
        actions={
          <Link href="/roadmap/new" passHref>
            <Button>
              <PlusCircle className="mr-2 h-4 w-4" /> New Goal
            </Button>
          </Link>
        }
      />

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Goals</CardTitle>
            <Target className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">3</div>
            <p className="text-xs text-muted-foreground">
              +1 from last month
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tasks Completed</CardTitle>
            <CheckCircle className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">27</div>
            <p className="text-xs text-muted-foreground">
              7 pending for this week
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Overall Progress</CardTitle>
            <Activity className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">65%</div>
            <Progress value={65} className="mt-2 h-2" />
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Learning Progress</CardTitle>
            <CardDescription>Monthly tasks completed and goals achieved.</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px] md:h-[350px]">
            <ChartContainer config={chartConfig} className="h-full w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}> {/* Corrected usage */}
                  <CartesianGrid vertical={false} />
                  <XAxis
                    dataKey="month"
                    tickLine={false}
                    tickMargin={10}
                    axisLine={false}
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={12}
                  />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="tasks" fill="var(--color-tasks)" radius={4} />
                  <Bar dataKey="goals" fill="var(--color-goals)" radius={4} />
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Jump right back into your learning.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            <Link href="/notes/new" passHref>
              <Button variant="outline" className="w-full justify-start">
                <PlusCircle className="mr-2 h-4 w-4" /> Create New Note
              </Button>
            </Link>
            <Link href="/roadmap" passHref>
              <Button variant="outline" className="w-full justify-start">
                <GitFork className="mr-2 h-4 w-4" /> View Roadmap
              </Button>
            </Link>
            <Link href="/ai/milestone-suggestions" passHref>
               <Button variant="outline" className="w-full justify-start">
                <Lightbulb className="mr-2 h-4 w-4" /> Get Milestone Suggestions
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
      
      <Card className="overflow-hidden">
        <CardHeader>
            <CardTitle>Discover SynergyLearn Features</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
             <Image src="https://placehold.co/1200x300.png" alt="SynergyLearn feature banner" width={1200} height={300} className="w-full h-auto object-cover" data-ai-hint="learning technology" />
        </CardContent>
        <CardFooter className="p-6 bg-muted/50">
            <p className="text-sm text-muted-foreground">
                Explore AI-powered flashcards, collaborative study rooms, and personalized learning paths to supercharge your studies.
            </p>
        </CardFooter>
      </Card>
    </div>
  );
}
