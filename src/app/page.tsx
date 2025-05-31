
'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import PageHeader from '@/components/common/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { CheckCircle, Lightbulb, Target, PlusCircle, Activity, GitFork, Loader2, AlertCircle, BookOpen, Users, BarChart3, Award, Sparkles, ArrowRight, Sun, Moon, Star } from 'lucide-react'; // Added Star here
import Link from 'next/link';
import Image from 'next/image';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, BarChart as ShadBarChart } from 'recharts';
import { LandingPageLogo } from '@/components/common/logo';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
// Removed Switch import as it's not directly used in this file for theme toggle (UserNav and landing navbar handle their own)

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

const howItWorksSteps = [
  {
    icon: Target,
    title: "1. Define Your Goal",
    description: "Start by setting clear, achievable learning objectives. Our platform helps you outline your path with ease."
  },
  {
    icon: Sparkles,
    title: "2. Leverage AI Assistance",
    description: "Get AI-powered milestone suggestions, flashcard generation, and content summarization to boost your study efficiency."
  },
  {
    icon: Users,
    title: "3. Collaborate & Conquer",
    description: "Join dynamic study rooms, share notes, and learn with peers. Track your progress with insightful analytics."
  }
];

const testimonials = [
  {
    avatar: "https://placehold.co/100x100.png",
    name: "Alex Smith",
    role: "Software Engineer",
    quote: "SynergyLearn's AI tools for generating flashcards and suggesting milestones have been a game-changer for my professional development courses!",
    dataAiHint: "person portrait"
  },
  {
    avatar: "https://placehold.co/100x100.png",
    name: "Maria Jones",
    role: "University Student",
    quote: "The collaborative study rooms are fantastic! I can connect with classmates easily, and the roadmap feature keeps me on track with my assignments.",
    dataAiHint: "person portrait"
  },
  {
    avatar: "https://placehold.co/100x100.png",
    name: "David Patel",
    role: "Lifelong Learner",
    quote: "I love how organized my learning has become. The analytics page gives me great insights into my study habits. Highly recommend!",
    dataAiHint: "person portrait"
  }
];

export default function DashboardPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const { toast } = useToast();

  const [landingTheme, setLandingTheme] = useState<'light' | 'dark'>('light');
  const [landingMounted, setLandingMounted] = useState(false);

  useEffect(() => {
    if (!user && !authLoading) { 
      setLandingMounted(true);
      const storedTheme = localStorage.getItem('synergylearn_landing_theme') as 'light' | 'dark' | null;
      const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      setLandingTheme(storedTheme || systemTheme);
    }
  }, [user, authLoading]);

  useEffect(() => {
    if (landingMounted && !user) { 
      if (landingTheme === 'dark') {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
      localStorage.setItem('synergylearn_landing_theme', landingTheme);
    } else if (user) {
      // If user logs in, remove the landing page specific theme class
      // The main app theme is handled by UserNav
      const storedMainTheme = localStorage.getItem('theme') as 'light' | 'dark' | null;
      if (storedMainTheme === 'dark') {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    }
  }, [landingTheme, landingMounted, user]);

  const toggleLandingTheme = () => {
    setLandingTheme(prev => prev === 'light' ? 'dark' : 'light');
  };


  if (authLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex flex-col min-h-screen bg-background text-foreground">
        <nav className="sticky top-0 z-50 bg-background/80 backdrop-blur-md shadow-sm">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-3 flex justify-between items-center">
            <LandingPageLogo />
            <div className="hidden md:flex items-center space-x-6">
              <a href="#features" className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors">Features</a>
              <a href="#how-it-works" className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors">How It Works</a>
              <a href="#testimonials" className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors">Testimonials</a>
            </div>
            <div className="flex items-center gap-2">
               {landingMounted && (
                <Button variant="ghost" size="icon" onClick={toggleLandingTheme} aria-label="Toggle theme">
                  {landingTheme === 'light' ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
                </Button>
              )}
              <Link href="/login" passHref><Button variant="outline" size="sm">Login</Button></Link>
              <Link href="/signup" passHref><Button size="sm">Sign Up</Button></Link>
            </div>
          </div>
        </nav>

        <section className="py-16 md:py-24 lg:py-32 bg-gradient-to-br from-primary/10 via-background to-background">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold font-headline text-foreground mb-6">
              Organize Your Learning Journey, <span className="text-primary">Effortlessly</span>.
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto mb-8">
              The ultimate tool to plan, track, and achieve your educational goals with AI-powered assistance and collaborative features.
            </p>
            <Link href="/signup" passHref>
              <Button size="lg" className="text-lg py-3 px-8 shadow-lg hover:shadow-primary/50 transition-shadow">
                Get Started for Free <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
            <div className="mt-12 md:mt-16">
              <Image
                src="https://placehold.co/1000x600.png"
                alt="Learning dashboard illustration on a futuristic laptop screen"
                width={1000}
                height={600}
                className="rounded-lg shadow-2xl mx-auto"
                data-ai-hint="learning future"
                priority
              />
            </div>
          </div>
        </section>

        <section id="features" className="py-16 md:py-20 bg-secondary/30">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-3xl md:text-4xl font-bold font-headline text-center text-foreground mb-4">
              Supercharge Your Studies
            </h2>
            <p className="text-lg text-muted-foreground text-center mb-12 md:mb-16 max-w-2xl mx-auto">
              Discover a suite of tools designed to make learning more effective, engaging, and collaborative.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {landingPageFeatures.map((feature) => (
                <Card key={feature.title} className="bg-card hover:shadow-xl transition-shadow duration-300 flex flex-col">
                  <CardHeader>
                    <div className="inline-flex items-center justify-center w-12 h-12 rounded-lg bg-primary/10 text-primary mb-4">
                      <feature.icon className="h-6 w-6" />
                    </div>
                    <CardTitle className="text-xl font-semibold">{feature.title}</CardTitle>
                  </CardHeader>
                  <CardContent className="flex-grow">
                    <p className="text-muted-foreground">{feature.description}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        <section id="how-it-works" className="py-16 md:py-20 bg-background">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-3xl md:text-4xl font-bold font-headline text-center text-foreground mb-4">
              How SynergyLearn Works
            </h2>
            <p className="text-lg text-muted-foreground text-center mb-12 md:mb-16 max-w-2xl mx-auto">
              Achieve your learning goals in a few simple steps.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-12">
              {howItWorksSteps.map((step) => (
                <div key={step.title} className="flex flex-col items-center text-center p-6 rounded-lg hover:shadow-lg transition-shadow duration-300">
                  <div className="p-4 bg-primary/10 rounded-full mb-6 ring-4 ring-primary/20">
                    <step.icon className="h-10 w-10 text-primary" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2 text-foreground">{step.title}</h3>
                  <p className="text-muted-foreground">{step.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="testimonials" className="py-16 md:py-20 bg-secondary/30">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-3xl md:text-4xl font-bold font-headline text-center text-foreground mb-4">
              Loved by Learners Worldwide
            </h2>
            <p className="text-lg text-muted-foreground text-center mb-12 md:mb-16 max-w-2xl mx-auto">
              See how SynergyLearn is helping students and professionals achieve their goals.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {testimonials.map((testimonial, index) => (
                <Card key={index} className="bg-card shadow-lg flex flex-col">
                  <CardContent className="pt-6 flex-grow flex flex-col">
                    <div className="flex items-center mb-4">
                      <Avatar className="h-12 w-12 mr-4">
                        <AvatarImage src={testimonial.avatar} alt={testimonial.name} data-ai-hint={testimonial.dataAiHint} />
                        <AvatarFallback>{testimonial.name.substring(0,2).toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-semibold text-foreground">{testimonial.name}</p>
                        <p className="text-sm text-muted-foreground">{testimonial.role}</p>
                      </div>
                    </div>
                    <blockquote className="text-muted-foreground italic flex-grow">
                      "{testimonial.quote}"
                    </blockquote>
                  </CardContent>
                   <CardFooter className="pt-4 border-t border-border mt-auto">
                        <div className="flex text-yellow-400">
                            {[...Array(5)].map((_, i) => <Star key={i} className="h-4 w-4 fill-current" />)}
                        </div>
                    </CardFooter>
                </Card>
              ))}
            </div>
          </div>
        </section>

        <section className="py-16 md:py-24 bg-primary text-primary-foreground">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-3xl md:text-4xl font-bold font-headline mb-6">
              Ready to Transform Your Learning?
            </h2>
            <p className="text-lg md:text-xl opacity-90 max-w-2xl mx-auto mb-8">
              Sign up today and take the first step towards a more organized, efficient, and enjoyable learning experience.
            </p>
            <Link href="/signup" passHref>
              <Button size="lg" variant="secondary" className="text-lg py-3 px-8 bg-primary-foreground text-primary hover:bg-primary-foreground/90 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105">
                Sign Up Now
              </Button>
            </Link>
          </div>
        </section>

        <footer className="py-8 bg-muted border-t border-border">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center text-muted-foreground">
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
             <Link href="/ai/flashcard-generator" passHref>
               <Button variant="outline" className="w-full justify-start">
                <Sparkles className="mr-2 h-4 w-4" /> AI Flashcard Generator
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
             <Image src="https://placehold.co/1200x300.png" alt="SynergyLearn feature banner" width={1200} height={300} className="w-full h-auto object-cover" data-ai-hint="learning banner" />
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
