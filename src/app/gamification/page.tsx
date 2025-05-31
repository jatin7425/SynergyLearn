
'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import PageHeader from '@/components/common/page-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Award, ShieldCheck, Star, TrendingUp, Zap, Loader2, AlertCircle } from 'lucide-react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';

const badges = [
  { id: 'b1', name: 'Early Bird', description: 'Completed a task before 8 AM.', icon: Zap, achieved: true, color: 'text-yellow-500' },
  { id: 'b2', name: 'Milestone Master', description: 'Achieved 5 learning milestones.', icon: ShieldCheck, achieved: true, color: 'text-green-500' },
  { id: 'b3', name: 'Note Taker Pro', description: 'Created 10 detailed notes.', icon: Star, achieved: true, color: 'text-blue-500' },
  { id: 'b4', name: 'Consistent Learner', description: 'Studied for 7 consecutive days.', icon: TrendingUp, achieved: false, color: 'text-purple-500' },
  { id: 'b5', name: 'Collaborator King', description: 'Actively participated in 3 study rooms.', icon: Award, achieved: false, color: 'text-red-500' },
  { id: 'b6', name: 'Quiz Whiz', description: 'Scored 90%+ on 5 quizzes.', icon: Zap, achieved: true, color: 'text-indigo-500' },
];

const userStats = {
  points: 1250,
  level: 7,
  nextLevelPoints: 1500,
};

export default function GamificationPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const { toast } = useToast();

  useEffect(() => {
    if (!authLoading && !user) {
      toast({ title: "Authentication Required", description: "Please log in to view your rewards.", variant: "destructive" });
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
        <p className="text-muted-foreground mb-4">You need to be logged in to view your rewards.</p>
        <Button onClick={() => router.push(`/login?redirect=${pathname}`)}>Go to Login</Button>
      </div>
    );
  }

  const progressToNextLevel = (userStats.points / userStats.nextLevelPoints) * 100;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Your Rewards & Progress"
        description="Track your achievements and stay motivated!"
      />

      <Card>
        <CardHeader>
          <CardTitle>Overall Progress</CardTitle>
        </CardHeader>
        <CardContent className="grid md:grid-cols-3 gap-6 items-center">
          <div className="flex flex-col items-center">
            <Award className="h-16 w-16 text-primary mb-2" />
            <p className="text-2xl font-bold">{userStats.points} Points</p>
            <p className="text-sm text-muted-foreground">Keep it up!</p>
          </div>
          <div className="flex flex-col items-center">
            <ShieldCheck className="h-16 w-16 text-accent mb-2" />
            <p className="text-2xl font-bold">Level {userStats.level}</p>
            <p className="text-sm text-muted-foreground">Learning Master</p>
          </div>
          <div className="w-full">
            <p className="text-sm font-medium mb-1 text-center md:text-left">Progress to Next Level</p>
            <div className="w-full bg-muted rounded-full h-4">
              <div
                className="bg-primary h-4 rounded-full transition-all duration-500 ease-out"
                style={{ width: `${Math.min(progressToNextLevel, 100)}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground mt-1 text-center md:text-right">
              {userStats.points} / {userStats.nextLevelPoints} points
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Badges Earned</CardTitle>
          <CardDescription>Collect badges for your accomplishments.</CardDescription>
        </CardHeader>
        <CardContent>
          {badges.length === 0 ? (
            <div className="text-center py-8">
               <Image src="https://placehold.co/200x150.png" alt="No badges illustration" width={200} height={150} className="mx-auto mb-4 rounded-md" data-ai-hint="trophy award empty" />
              <p className="text-muted-foreground">No badges earned yet. Keep learning to unlock them!</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
              {badges.map((badge) => (
                <div
                  key={badge.id}
                  className={`flex flex-col items-center p-4 border rounded-lg transition-all ${
                    badge.achieved ? 'bg-card shadow-md' : 'bg-muted opacity-60 hover:opacity-100'
                  }`}
                >
                  <badge.icon className={`h-12 w-12 mb-2 ${badge.achieved ? badge.color : 'text-muted-foreground'}`} />
                  <h3 className="font-semibold text-sm text-center">{badge.name}</h3>
                  {badge.achieved && (
                    <p className="text-xs text-muted-foreground text-center mt-1">{badge.description}</p>
                  )}
                  {!badge.achieved && (
                     <p className="text-xs text-muted-foreground text-center mt-1">Locked</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
            <CardTitle>Leaderboard (Coming Soon)</CardTitle>
            <CardDescription>See how you rank among fellow learners.</CardDescription>
        </CardHeader>
        <CardContent className="text-center py-10">
            <Image src="https://placehold.co/300x180.png" alt="Leaderboard placeholder" width={300} height={180} className="mx-auto mb-4 rounded-md opacity-70" data-ai-hint="leaderboard ranking" />
            <p className="text-muted-foreground">Challenge yourself and climb the ranks! Leaderboards are under construction.</p>
        </CardContent>
      </Card>
    </div>
  );
}
