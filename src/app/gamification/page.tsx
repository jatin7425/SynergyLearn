
'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import PageHeader from '@/components/common/page-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Award, ShieldCheck, Star, TrendingUp, Zap, Loader2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { db } from '@/lib/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore'; // Added setDoc for potential initialization

// Static definition of all possible badges
const allBadgesDefinition = [
  { id: 'earlyBird', name: 'Early Bird', description: 'Completed a task before 8 AM.', icon: Zap, color: 'text-yellow-500' },
  { id: 'milestoneMaster', name: 'Milestone Master', description: 'Achieved 5 learning milestones.', icon: ShieldCheck, color: 'text-green-500' },
  { id: 'noteTakerPro', name: 'Note Taker Pro', description: 'Created 10 detailed notes.', icon: Star, color: 'text-blue-500' },
  { id: 'consistentLearner', name: 'Consistent Learner', description: 'Studied for 7 consecutive days.', icon: TrendingUp, color: 'text-purple-500' },
  { id: 'collaboratorKing', name: 'Collaborator King', description: 'Actively participated in 3 study rooms.', icon: Award, color: 'text-red-500' },
  { id: 'quizWhiz', name: 'Quiz Whiz', description: 'Scored 90%+ on 5 quizzes.', icon: Zap, color: 'text-indigo-500' },
];

interface Badge extends ReturnType<() => typeof allBadgesDefinition[0]> {
  achieved: boolean;
}

interface UserGamificationProfile {
  points: number;
  level: number;
  nextLevelPoints: number; // This might be calculated or stored
  achievedBadgeIds: string[];
}

const LeaderboardPlaceholderSvg = () => (
  <svg width="300" height="180" viewBox="0 0 300 180" fill="none" xmlns="http://www.w3.org/2000/svg" className="mx-auto mb-4 rounded-md opacity-70" data-ai-hint="leaderboard chart">
    <rect x="45" y="100" width="40" height="50" rx="3" fill="hsl(var(--muted))"/>
    <rect x="45" y="60" width="40" height="35" rx="3" fill="hsl(var(--muted))"/>
    <rect x="95" y="80" width="40" height="70" rx="3" fill="hsl(var(--accent))"/>
    <rect x="95" y="40" width="40" height="35" rx="3" fill="hsl(var(--accent))"/>
    <rect x="145" y="30" width="40" height="120" rx="3" fill="hsl(var(--primary))"/>
    <rect x="195" y="70" width="40" height="80" rx="3" fill="hsl(var(--muted))"/>
    <rect x="195" y="50" width="40" height="15" rx="3" fill="hsl(var(--muted))"/>
    <line x1="30" y1="150" x2="270" y2="150" stroke="hsl(var(--border))" strokeWidth="2" strokeLinecap="round"/>
  </svg>
);

export default function GamificationPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const { toast } = useToast();

  const [userStats, setUserStats] = useState<UserGamificationProfile>({ points: 0, level: 1, nextLevelPoints: 100, achievedBadgeIds: [] });
  const [displayedBadges, setDisplayedBadges] = useState<Badge[]>([]);
  const [isLoadingGamification, setIsLoadingGamification] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      toast({ title: "Authentication Required", description: "Please log in to view your rewards.", variant: "destructive" });
      router.push(`/login?redirect=${pathname}`);
      return;
    }

    setIsLoadingGamification(true);
    const gamificationProfileRef = doc(db, 'users', user.uid, 'profile', 'gamification');
    
    getDoc(gamificationProfileRef).then(async (docSnap) => {
      if (docSnap.exists()) {
        setUserStats(docSnap.data() as UserGamificationProfile);
      } else {
        // Initialize profile if it doesn't exist
        const initialProfile: UserGamificationProfile = { points: 0, level: 1, nextLevelPoints: 100, achievedBadgeIds: [] };
        try {
          await setDoc(gamificationProfileRef, initialProfile);
          setUserStats(initialProfile);
        } catch (initError) {
          console.error("Error initializing gamification profile: ", initError);
          toast({ title: "Error", description: "Could not initialize your gamification profile.", variant: "destructive" });
        }
      }
    }).catch(error => {
      console.error("Error fetching gamification profile: ", error);
      toast({ title: "Error", description: "Could not load your gamification data.", variant: "destructive" });
    }).finally(() => {
      setIsLoadingGamification(false);
    });

  }, [user, authLoading, router, pathname, toast]);

  useEffect(() => {
    // Update displayed badges based on userStats.achievedBadgeIds
    const updatedBadges = allBadgesDefinition.map(badgeDef => ({
      ...badgeDef,
      achieved: userStats.achievedBadgeIds.includes(badgeDef.id),
    }));
    setDisplayedBadges(updatedBadges);
  }, [userStats.achievedBadgeIds]);


  if (authLoading || isLoadingGamification) {
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
        <p className="text-muted-foreground mb-4">You need to be logged in to view your rewards.</p>
        <Button onClick={() => router.push(`/login?redirect=${pathname}`)}>Go to Login</Button>
      </div>
    );
  }

  const progressToNextLevel = userStats.nextLevelPoints > 0 ? (userStats.points / userStats.nextLevelPoints) * 100 : 0;

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
          {displayedBadges.length === 0 ? (
            <div className="text-center py-8">
               <Image src="https://placehold.co/200x150.png" alt="No badges illustration" width={200} height={150} className="mx-auto mb-4 rounded-md" data-ai-hint="trophy empty" />
              <p className="text-muted-foreground">No badges earned yet. Keep learning to unlock them!</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
              {displayedBadges.map((badge) => (
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
            <LeaderboardPlaceholderSvg />
            <p className="text-muted-foreground">Challenge yourself and climb the ranks! Leaderboards are under construction.</p>
        </CardContent>
      </Card>
    </div>
  );
}

    