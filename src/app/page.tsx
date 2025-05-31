
'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import PageHeader from '@/components/common/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { CheckCircle, Lightbulb, Target, PlusCircle, Activity, GitFork, Loader2, AlertCircle, BookOpen, Users, BarChart3, Award, Sparkles, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, BarChart as ShadBarChart } from 'recharts';

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

const landingPageFeatures = [
  {
    icon: Lightbulb,
    title: "AI-Powered Suggestions",
    description: "Let our smart AI suggest milestones, generate flashcards, and help you break down complex topics.",
    color: "text-yellow-500",
  },
  {
    icon: Users,
    title: "Collaborative Study Rooms",
    description: "Connect with peers, share notes, and learn together in real-time interactive study rooms.",
    color: "text-blue-500",
  },
  {
    icon: GitFork,
    title: "Personalized Roadmaps",
    description: "Create custom learning paths, track your progress, and stay motivated on your journey to mastery.",
    color: "text-green-500",
  },
  {
    icon: BookOpen,
    title: "Notes & Flashcards",
    description: "Take detailed notes with Markdown support and instantly generate flashcards for effective revision.",
    color: "text-indigo-500",
  },
  {
    icon: BarChart3,
    title: "Progress Analytics",
    description: "Visualize your learning activity, identify strengths and weaknesses, and make data-driven decisions.",
    color: "text-pink-500",
  },
  {
    icon: Award,
    title: "Gamified Experience",
    description: "Earn points, unlock badges, and compete on leaderboards to make learning fun and engaging.",
    color: "text-red-500",
  },
];

export default function DashboardPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const { toast } = useToast();

  // This useEffect handles redirection for authenticated users if they land on a page that should show landing content.
  // However, for the main page ('/'), we want to show dashboard for logged-in users and landing for non-logged-in.
  // So, no explicit redirect from here if !user on '/'.

  if (authLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    // Render Landing Page UI
    return (
      <div className="flex flex-col min-h-screen bg-background">
        {/* Hero Section */}
        <section className="py-16 md:py-24 lg:py-32 bg-gradient-to-br from-primary/10 via-background to-background">
          <div className="container mx-auto px-4 text-center">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold font-headline text-foreground mb-6">
              Organize Your Learning Journey, <span className="text-primary">Effortlessly</span>.
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto mb-8">
              The ultimate tool to plan, track, and achieve your educational goals with AI-powered assistance.
            </p>
            <Link href="/signup" passHref>
              <Button size="lg" className="text-lg py-3 px-8">
                Get Started for Free <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
            <div className="mt-12 md:mt-16">
              <Image
                src="https://placehold.co/1000x600.png"
                alt="Learning dashboard illustration"
                width={1000}
                height={600}
                className="rounded-lg shadow-2xl mx-auto"
                data-ai-hint="learning journey laptop"
                priority
              />
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="py-16 md:py-20 bg-secondary/30">
          <div className="container mx-auto px-4">
            <h2 className="text-3xl md:text-4xl font-bold font-headline text-center text-foreground mb-4">
              Supercharge Your Studies
            </h2>
            <p className="text-lg text-muted-foreground text-center mb-12 md:mb-16 max-w-2xl mx-auto">
              Discover a suite of tools designed to make learning more effective and engaging.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {landingPageFeatures.map((feature) => (
                <Card key={feature.title} className="bg-card hover:shadow-xl transition-shadow duration-300">
                  <CardHeader>
                    <div className={`inline-flex items-center justify-center w-12 h-12 rounded-lg bg-primary/10 ${feature.color} mb-4`}>
                      <feature.icon className="h-6 w-6" />
                    </div>
                    <CardTitle className="text-xl font-semibold">{feature.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground">{feature.description}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Call to Action Section */}
        <section className="py-16 md:py-24 bg-primary text-primary-foreground">
          <div className="container mx-auto px-4 text-center">
            <h2 className="text-3xl md:text-4xl font-bold font-headline mb-6">
              Ready to Transform Your Learning?
            </h2>
            <p className="text-lg md:text-xl opacity-90 max-w-2xl mx-auto mb-8">
              Sign up today and take the first step towards a more organized, efficient, and enjoyable learning experience.
            </p>
            <Link href="/signup" passHref>
              <Button size="lg" variant="secondary" className="text-lg py-3 px-8 bg-primary-foreground text-primary hover:bg-primary-foreground/90">
                Sign Up Now
              </Button>
            </Link>
          </div>
        </section>

        {/* Footer */}
        <footer className="py-8 bg-muted">
          <div className="container mx-auto px-4 text-center text-muted-foreground">
            <p className="text-sm">&copy; {new Date().getFullYear()} SynergyLearn. All rights reserved.</p>
            <div className="mt-2 space-x-4">
              <Link href="#" className="text-sm hover:text-primary">Privacy Policy</Link>
              <Link href="#" className="text-sm hover:text-primary">Terms of Service</Link>
            </div>
          </div>
        </footer>
      </div>
    );
  }

  // Render Dashboard UI for logged-in users
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

      <div className="grid gap-4 md:gap-6 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
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
          <CardContent className="h-[250px] md:h-[300px]">
            <ChartContainer config={chartConfig} className="h-full w-full">
              <ResponsiveContainer width="100%" height="100%">
                <ShadBarChart data={chartData}>
                  <CartesianGrid vertical={false} />
                  <XAxis
                    dataKey="month"
                    tickLine={false}
                    tickMargin={10}
                    axisLine={false}
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={10}
                  />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={10} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="tasks" fill="var(--color-tasks)" radius={4} />
                  <Bar dataKey="goals" fill="var(--color-goals)" radius={4} />
                </ShadBarChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Jump right back into your learning.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3">
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
        <CardFooter className="p-4 md:p-6 bg-muted/50">
            <p className="text-sm text-muted-foreground">
                Explore AI-powered flashcards, collaborative study rooms, and personalized learning paths to supercharge your studies.
            </p>
        </CardFooter>
      </Card>
    </div>
  );
}

