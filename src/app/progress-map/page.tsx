
'use client';

import PageHeader from '@/components/common/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebase';
import { collection, doc, getDoc, onSnapshot, orderBy, query, Timestamp } from 'firebase/firestore';
import { AlertCircle, CheckCircle, Circle, Loader2, MapPin, Milestone as MilestoneIcon, PlusCircle, Target } from 'lucide-react';
import Link from 'next/link';
import { useRouter, usePathname, useSearchParams } from 'next/navigation'; // Added useSearchParams
import React, { useEffect, useState, useMemo, use } from 'react'; // Added React import
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface Milestone {
  id: string;
  title: string;
  description: string;
  status: 'todo' | 'inprogress' | 'done';
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

const statusConfig = {
  todo: { icon: Circle, color: 'text-muted-foreground', bgColor: 'bg-muted/30', borderColor: 'border-muted/50' },
  inprogress: { icon: Loader2, color: 'text-blue-500', bgColor: 'bg-blue-500/10', borderColor: 'border-blue-500/50', animate: true },
  done: { icon: CheckCircle, color: 'text-green-500', bgColor: 'bg-green-500/10', borderColor: 'border-green-500/50' },
};

export default function ProgressMapPage(props: { params: { id: string } }) {
  // `use(props.params)` is not needed here as this is not a dynamic route like [id]/page.tsx
  // If it were, the pattern would be:
  // const resolvedParams = use(props.params); 
  // const { id } = resolvedParams || {}; 

  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const { toast } = useToast();

  const [learningGoal, setLearningGoal] = useState<string | null>(null);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
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
    let milestonesUnsubscribe: (() => void) | null = null;

    // Fetch learning goal
    const profileRef = doc(db, 'users', user.uid, 'profile', 'main');
    goalUnsubscribe = onSnapshot(profileRef, (docSnap) => {
      if (docSnap.exists() && docSnap.data()?.learningGoal) {
        setLearningGoal(docSnap.data()?.learningGoal);
      } else {
        setLearningGoal(null);
      }
    }, (error) => {
      console.error("Error fetching learning goal: ", error);
      toast({ title: "Error", description: "Could not fetch learning goal.", variant: "destructive" });
    });

    // Fetch milestones
    const milestonesColRef = collection(db, 'users', user.uid, 'milestones');
    const q = query(milestonesColRef, orderBy('createdAt', 'asc'));
    milestonesUnsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedMilestones: Milestone[] = [];
      snapshot.forEach(doc => fetchedMilestones.push({ id: doc.id, ...doc.data() } as Milestone));
      setMilestones(fetchedMilestones);
      setIsLoadingData(false); 
    }, (error) => {
      console.error("Error fetching milestones: ", error);
      toast({ title: "Error", description: "Could not fetch milestones.", variant: "destructive" });
      setIsLoadingData(false);
    });
    
    return () => {
      if (goalUnsubscribe) goalUnsubscribe();
      if (milestonesUnsubscribe) milestonesUnsubscribe();
    };

  }, [user, authLoading, router, pathname, toast]);

  const sortedMilestones = useMemo(() => {
    return [...milestones].sort((a, b) => {
      const aTime = a.createdAt?.toMillis() || 0;
      const bTime = b.createdAt?.toMillis() || 0;
      return aTime - bTime;
    });
  }, [milestones]);

  if (authLoading || isLoadingData) {
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
        <p className="text-muted-foreground mb-4">You need to be logged in to view the progress map.</p>
        <Button onClick={() => router.push(`/login?redirect=${pathname}`)}>Go to Login</Button>
      </div>
    );
  }
  
  if (!learningGoal) {
    return (
      <div className="space-y-6">
        <PageHeader title="Your Learning Journey" description="Visualize your path to success." />
        <Card className="text-center">
          <CardHeader>
            <Target className="mx-auto h-12 w-12 text-muted-foreground opacity-50 mb-4" />
            <CardTitle>Set Your Main Learning Goal</CardTitle>
            <CardDescription>Define your primary learning objective to start your journey map.</CardDescription>
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

  return (
    <div className="space-y-6">
      <PageHeader title="Your Learning Journey" description={`Goal: ${learningGoal}`} />

      {sortedMilestones.length === 0 ? (
        <Card>
          <CardHeader className="text-center">
            <MilestoneIcon className="mx-auto h-12 w-12 text-muted-foreground opacity-50 mb-4" />
            <CardTitle>No Milestones Yet</CardTitle>
            <CardDescription>Add some milestones to your roadmap to see them on the map.</CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Link href="/roadmap" passHref>
              <Button variant="outline">Go to Roadmap</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="overflow-x-auto pb-4">
          <div className="flex items-start py-8 px-4 min-w-max space-x-4">
            {/* Start Point (optional visual cue) */}
            <div className="flex flex-col items-center space-y-2 flex-shrink-0 pt-12">
                <div className="h-8 w-8 bg-primary rounded-full flex items-center justify-center text-primary-foreground shadow-md">
                    <Target size={18} />
                </div>
                <p className="text-xs font-semibold text-primary">Start</p>
            </div>


            {/* Milestones */}
            {sortedMilestones.map((milestone, index) => {
              const config = statusConfig[milestone.status];
              const Icon = config.icon;
              return (
                <React.Fragment key={milestone.id}>
                  {/* Connecting Line */}
                  <div className={cn(
                      "flex-grow h-1 mt-[58px]", // Align with middle of icon
                      milestone.status === 'done' ? 'bg-green-500' : 'bg-border',
                      "min-w-[50px] md:min-w-[80px]"
                  )} />

                  {/* Milestone Node */}
                  <div className="flex flex-col items-center space-y-2 flex-shrink-0">
                    <div className={cn("h-8 w-8 rounded-full flex items-center justify-center shadow-md", config.bgColor, config.borderColor, "border-2")}>
                      <Icon size={18} className={cn(config.color, config.animate && "animate-spin")} />
                    </div>
                    <Card className={cn("w-48 md:w-56 shadow-lg", config.borderColor, "border-2")}>
                      <CardHeader className={cn("p-3", config.bgColor)}>
                        <CardTitle className="text-sm truncate">{milestone.title}</CardTitle>
                      </CardHeader>
                      <CardContent className="p-3">
                        <p className="text-xs text-muted-foreground line-clamp-2">{milestone.description || "No description"}</p>
                        <p className={cn("text-xs font-semibold mt-1.5 capitalize", config.color)}>{milestone.status}</p>
                      </CardContent>
                    </Card>
                  </div>
                </React.Fragment>
              );
            })}

            {/* Connecting Line to Goal */}
            <div className={cn(
                "flex-grow h-1 mt-[58px]",
                sortedMilestones.every(m => m.status === 'done') ? 'bg-green-500' : 'bg-border',
                "min-w-[50px] md:min-w-[80px]"
            )} />
            
            {/* Goal / End Point */}
             <div className="flex flex-col items-center space-y-2 flex-shrink-0 pt-12">
                <div className={cn(
                    "h-10 w-10 rounded-full flex items-center justify-center text-primary-foreground shadow-xl",
                    sortedMilestones.every(m => m.status === 'done') ? 'bg-green-500' : 'bg-primary'
                )}>
                    <MapPin size={22} />
                </div>
                <p className={cn(
                    "text-sm font-bold w-40 text-center truncate",
                     sortedMilestones.every(m => m.status === 'done') ? 'text-green-600' : 'text-primary'
                )}>{learningGoal}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

