
'use client';

import PageHeader from '@/components/common/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { PlusCircle, Users, LogIn, Loader2, AlertCircle, Eye, Lock } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { useState, type FormEvent, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { db } from '@/lib/firebase';
import { collection, addDoc, serverTimestamp, query, onSnapshot, orderBy, Timestamp } from 'firebase/firestore';
import type { FirebaseError } from 'firebase/app';
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { cn } from '@/lib/utils';

interface Member {
  uid: string;
  name: string;
  avatar?: string;
  joinedAt: Timestamp;
}

interface StudyRoom {
  id: string; // Firestore document ID
  name: string;
  topic: string;
  visibility: 'public' | 'private'; // Added visibility
  memberCount: number;
  members: Member[];
  createdBy: string; // User UID
  createdAt: Timestamp;
  updatedAt?: Timestamp;
  whiteboardDrawing?: WhiteboardPath[];
}

// Define WhiteboardPath if not already globally available, or import
interface WhiteboardPath {
  id: string;
  points: Array<{ x: number; y: number }>;
  color: string;
  strokeWidth: number;
  tool: 'pen' | 'eraser';
}


const MAX_ROOM_NAME_LENGTH = 99;
const MAX_ROOM_TOPIC_LENGTH = 199;

export default function StudyRoomsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const { toast } = useToast();

  const [studyRooms, setStudyRooms] = useState<StudyRoom[]>([]);
  const [isLoadingRooms, setIsLoadingRooms] = useState(true);
  const [showCreateRoomDialog, setShowCreateRoomDialog] = useState(false);
  const [isCreatingRoom, setIsCreatingRoom] = useState(false);
  const [newRoomName, setNewRoomName] = useState('');
  const [newRoomTopic, setNewRoomTopic] = useState('');
  const [newRoomVisibility, setNewRoomVisibility] = useState<'public' | 'private'>('public');

  useEffect(() => {
    if (!authLoading && !user) {
      toast({ title: "Authentication Required", description: "Please log in to access study rooms.", variant: "destructive" });
      router.push(`/login?redirect=${pathname}`);
      return;
    }

    if (user) {
      setIsLoadingRooms(true);
      const roomsColRef = collection(db, 'studyRooms');
      const q = query(roomsColRef, orderBy('createdAt', 'desc'));

      const unsubscribe = onSnapshot(q, (snapshot) => {
        const fetchedRooms: StudyRoom[] = [];
        snapshot.forEach(doc => {
          fetchedRooms.push({ id: doc.id, ...doc.data() } as StudyRoom);
        });
        setStudyRooms(fetchedRooms);
        setIsLoadingRooms(false);
      }, (error) => {
        console.error("Error fetching study rooms: ", error);
        toast({ title: "Error", description: "Could not fetch study rooms.", variant: "destructive" });
        setIsLoadingRooms(false);
      });
      return () => unsubscribe();
    }
  }, [user, authLoading, router, pathname, toast]);

  const handleCreateRoom = async (e: FormEvent) => {
    e.preventDefault();
    if (!user) {
      toast({ title: "Not Authenticated", variant: "destructive" });
      return;
    }

    const trimmedName = newRoomName.trim();
    const trimmedTopic = newRoomTopic.trim();

    if (!trimmedName) {
      toast({ title: "Room Name Required", description: "Please enter a name for the room.", variant: "destructive"});
      return;
    }
    if (trimmedName.length > MAX_ROOM_NAME_LENGTH) {
      toast({ title: "Room Name Too Long", description: `Name must be ${MAX_ROOM_NAME_LENGTH} characters or less. Current: ${trimmedName.length}`, variant: "destructive"});
      return;
    }
    if (!trimmedTopic) {
      toast({ title: "Room Topic Required", description: "Please enter a topic for the room.", variant: "destructive"});
      return;
    }
    if (trimmedTopic.length > MAX_ROOM_TOPIC_LENGTH) {
      toast({ title: "Room Topic Too Long", description: `Topic must be ${MAX_ROOM_TOPIC_LENGTH} characters or less. Current: ${trimmedTopic.length}`, variant: "destructive"});
      return;
    }
    
    setIsCreatingRoom(true);

    const newRoomData = {
      name: trimmedName,
      topic: trimmedTopic,
      visibility: newRoomVisibility, // Add visibility
      memberCount: 1, 
      members: [{ 
          uid: user.uid,
          name: user.displayName || user.email?.split('@')[0] || 'Anonymous User',
          avatar: user.photoURL || `https://placehold.co/40x40.png&text=${(user.displayName || user.email?.split('@')[0] || 'A').substring(0,1).toUpperCase()}`,
          joinedAt: serverTimestamp() as Timestamp 
      }],
      createdBy: user.uid, 
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      whiteboardDrawing: [], 
    };

    try {
      const roomsColRef = collection(db, 'studyRooms');
      const docRef = await addDoc(roomsColRef, newRoomData);
      toast({ title: "Room Created!", description: `"${newRoomData.name}" is now active.` });
      setNewRoomName('');
      setNewRoomTopic('');
      setNewRoomVisibility('public'); // Reset visibility for next creation
      setShowCreateRoomDialog(false);
      router.push(`/study-rooms/${docRef.id}`);
    } catch (error) {
      const firebaseError = error as FirebaseError;
      console.error("Error creating room: ", firebaseError);
      if (firebaseError.code && (firebaseError.code === 'permission-denied' || firebaseError.code === 'PERMISSION_DENIED')) {
        console.error(
          `Firestore 'create' for /studyRooms DENIED. Client User UID: ${user?.uid || 'N/A'}.` +
          `\n>>> THIS IS A PERMISSION ERROR FROM FIRESTORE. <<<` +
          `\n>>> USE THE DATA PAYLOAD BELOW WITH THE FIRESTORE RULES PLAYGROUND TO DEBUG YOUR SECURITY RULES. <<<` +
          `\nAttempted data payload:`, JSON.stringify(newRoomData, (key, value) => {
            if (value && typeof value === 'object') {
              if (typeof (value as any).seconds === 'number' && typeof (value as any).nanoseconds === 'number' && value.constructor && value.constructor.name === 'Timestamp') {
                return { seconds: (value as Timestamp).seconds, nanoseconds: (value as Timestamp).nanoseconds, _type: "FirestoreTimestamp" };
              }
              if (value && typeof value === 'object' && (value as any)._methodName && (value as any)._methodName.includes('timestamp')) {
                return { _methodName: (value as any)._methodName };
              }
            }
            return value;
          }, 2)
        );
        toast({
          title: "Room Creation Failed: Permissions",
          description: "Could not create room. Check browser console for data to use with Firestore Rules Playground & ensure deployed rules match expected config.",
          variant: "destructive",
          duration: 15000 
        });
      } else {
        toast({ title: "Creation Failed", description: firebaseError.message, variant: "destructive" });
      }
    } finally {
      setIsCreatingRoom(false);
    }
  };

  if (authLoading || (isLoadingRooms && user)) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  if (!user && !authLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4 text-center">
        <AlertCircle className="w-16 h-16 text-destructive mb-4" />
        <h1 className="text-2xl font-bold mb-2">Access Denied</h1>
        <p className="text-muted-foreground mb-4">You need to be logged in to view study rooms.</p>
        <Button onClick={() => router.push(`/login?redirect=${pathname}`)}>Go to Login</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Collaborative Study Rooms"
        description="Join or create study rooms to learn with others."
        actions={
          <Dialog open={showCreateRoomDialog} onOpenChange={setShowCreateRoomDialog}>
            <DialogTrigger asChild>
              <Button>
                <PlusCircle className="mr-2 h-4 w-4" /> Create New Room
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Create New Study Room</DialogTitle>
                <DialogDescription>Set up a new space for collaborative learning.</DialogDescription>
              </DialogHeader>
              <form onSubmit={handleCreateRoom}>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="room-name" className="text-right">Name</Label>
                    <Input
                      id="room-name"
                      value={newRoomName}
                      onChange={(e) => setNewRoomName(e.target.value)}
                      className="col-span-3"
                      placeholder="e.g., Quantum Physics Enthusiasts"
                      required
                      disabled={isCreatingRoom}
                      maxLength={MAX_ROOM_NAME_LENGTH}
                    />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="room-topic" className="text-right">Topic</Label>
                    <Input
                      id="room-topic"
                      value={newRoomTopic}
                      onChange={(e) => setNewRoomTopic(e.target.value)}
                      className="col-span-3"
                      placeholder="e.g., String Theory"
                      required
                      disabled={isCreatingRoom}
                      maxLength={MAX_ROOM_TOPIC_LENGTH}
                    />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label className="text-right">Visibility</Label>
                    <RadioGroup
                      defaultValue="public"
                      onValueChange={(value: 'public' | 'private') => setNewRoomVisibility(value)}
                      className="col-span-3 flex gap-4"
                      disabled={isCreatingRoom}
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="public" id="visibility-public" />
                        <Label htmlFor="visibility-public" className="font-normal">Public</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="private" id="visibility-private" />
                        <Label htmlFor="visibility-private" className="font-normal">Private</Label>
                      </div>
                    </RadioGroup>
                  </div>
                </div>
                <DialogFooter>
                  <DialogClose asChild><Button type="button" variant="outline" disabled={isCreatingRoom}>Cancel</Button></DialogClose>
                  <Button type="submit" disabled={isCreatingRoom || !newRoomName.trim() || !newRoomTopic.trim()}>
                    {isCreatingRoom ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    Create Room
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        }
      />

      {studyRooms.length === 0 && !isLoadingRooms ? (
         <Card className="text-center">
          <CardHeader>
            <Image src="https://placehold.co/300x200.png" alt="Empty study rooms" width={300} height={200} className="mx-auto mb-4 rounded-md" data-ai-hint="group study" />
            <CardTitle>No Study Rooms Available</CardTitle>
            <CardDescription>Create a new room to start collaborating with others.</CardDescription>
          </CardHeader>
          <CardContent>
             <Button onClick={() => setShowCreateRoomDialog(true)}>
                <PlusCircle className="mr-2 h-4 w-4" /> Create Your First Room
              </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
          {studyRooms.map((room) => {
            const createdAtValid = room.createdAt && room.createdAt instanceof Timestamp;
            const updatedAtValid = room.updatedAt && room.updatedAt instanceof Timestamp;

            const createdAtDisplay = createdAtValid ? room.createdAt.toDate().toLocaleDateString() : 'N/A';
            let lastActiveDisplay = 'N/A';
            if (updatedAtValid) {
              lastActiveDisplay = room.updatedAt!.toDate().toLocaleString();
            } else if (createdAtValid) {
              lastActiveDisplay = room.createdAt.toDate().toLocaleString();
            }

            const VisibilityIcon = room.visibility === 'private' ? Lock : Eye;
            const visibilityText = room.visibility === 'private' ? 'Private' : 'Public';

            return (
              <Card key={room.id} className="flex flex-col">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>{room.name || "Unnamed Room"}</CardTitle>
                    <div className="flex items-center text-xs text-muted-foreground" title={visibilityText}>
                      <VisibilityIcon className="mr-1 h-3.5 w-3.5" />
                      <span className="hidden sm:inline">{visibilityText}</span>
                    </div>
                  </div>
                  <CardDescription>Topic: {room.topic || "No Topic"}</CardDescription>
                </CardHeader>
                <CardContent className="flex-grow">
                  <div className="flex items-center text-sm text-muted-foreground">
                    <Users className="mr-2 h-4 w-4" />
                    {typeof room.memberCount === 'number' ? room.memberCount : 0} members
                  </div>
                  <div className="mt-2 text-xs text-muted-foreground">
                    Created: {createdAtDisplay}
                  </div>
                   <div className="mt-1 text-xs text-muted-foreground">
                    Last Active: {lastActiveDisplay}
                  </div>
                </CardContent>
                <CardContent className="border-t pt-4 flex justify-between">
                  <Link href={`/study-rooms/${room.id}`} passHref>
                    <Button className={cn(room.visibility === 'private' ? "bg-accent hover:bg-accent/90" : "")}>
                      <LogIn className="mr-2 h-4 w-4" /> Join Room
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
