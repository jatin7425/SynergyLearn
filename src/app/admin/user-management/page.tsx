
'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter, usePathname } from 'next/navigation';
import PageHeader from '@/components/common/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { db } from '@/lib/firebase';
import { collection, getDocs, query, orderBy, Timestamp } from 'firebase/firestore';
import { Loader2, AlertCircle, ShieldAlert, Users } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

// This should be the same as in model-settings page or centralized
const ADMIN_UID = 'Mcjp0wyJVcal3ocfav9aMOHzNzV2';

interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  createdAt: Timestamp;
  updatedAt?: Timestamp;
}

export default function UserManagementPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const { toast } = useToast();

  const [userProfiles, setUserProfiles] = useState<UserProfile[]>([]);
  const [isLoadingProfiles, setIsLoadingProfiles] = useState(true);
  const [isAuthorizedAdmin, setIsAuthorizedAdmin] = useState(false);

  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      toast({ title: "Authentication Required", description: "Please log in to access admin settings.", variant: "destructive" });
      router.push(`/login?redirect=${pathname}`);
      return;
    }

    if (user.uid === ADMIN_UID) {
      setIsAuthorizedAdmin(true);
      const fetchUserProfiles = async () => {
        setIsLoadingProfiles(true);
        try {
          const profilesCollectionRef = collection(db, 'userProfiles');
          // Consider adding orderBy if you want a specific order, e.g., by createdAt
          const q = query(profilesCollectionRef, orderBy('createdAt', 'desc'));
          const querySnapshot = await getDocs(q);
          const profiles: UserProfile[] = [];
          querySnapshot.forEach((doc) => {
            profiles.push({ uid: doc.id, ...doc.data() } as UserProfile);
          });
          setUserProfiles(profiles);
        } catch (error) {
          console.error("Error fetching user profiles:", error);
          toast({ title: "Error loading profiles", description: (error as Error).message, variant: "destructive" });
        } finally {
          setIsLoadingProfiles(false);
        }
      };
      fetchUserProfiles();
    } else {
      setIsAuthorizedAdmin(false);
      setIsLoadingProfiles(false);
      toast({ title: "Access Denied", description: "You are not authorized to view this page.", variant: "destructive" });
    }
  }, [user, authLoading, router, pathname, toast]);

  if (authLoading || (isLoadingProfiles && isAuthorizedAdmin)) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) { // Should be covered by useEffect redirect, but as a fallback
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4 text-center">
        <AlertCircle className="w-16 h-16 text-destructive mb-4" />
        <h1 className="text-2xl font-bold mb-2">Authentication Required</h1>
        <Button onClick={() => router.push(`/login?redirect=${pathname}`)}>Go to Login</Button>
      </div>
    );
  }

  if (!isAuthorizedAdmin) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Admin: User Management"
          description="View registered user profiles."
        />
        <Card className="border-destructive">
          <CardHeader>
            <CardTitle className="flex items-center text-destructive">
              <ShieldAlert className="mr-2 h-5 w-5" />
              Access Denied
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-destructive-foreground">You do not have permission to access this page.</p>
            <Button variant="outline" onClick={() => router.push('/')} className="mt-4">
              Go to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Admin: User Management"
        description={`Viewing ${userProfiles.length} registered user profiles.`}
      />
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Users className="mr-2 h-5 w-5 text-primary" />
            User List
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoadingProfiles ? (
             <div className="flex justify-center items-center py-10"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
          ) : userProfiles.length === 0 ? (
            <p className="text-muted-foreground text-center">No user profiles found.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Display Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>User ID (UID)</TableHead>
                    <TableHead>Created At</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {userProfiles.map((profile) => (
                    <TableRow key={profile.uid}>
                      <TableCell className="font-medium">{profile.displayName || 'N/A'}</TableCell>
                      <TableCell>{profile.email}</TableCell>
                      <TableCell className="font-mono text-xs">{profile.uid}</TableCell>
                      <TableCell>{profile.createdAt?.toDate().toLocaleDateString() || 'N/A'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
