
'use client';

import PageHeader from '@/components/common/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { PlusCircle, Users, LogIn, Edit, Loader2, AlertCircle } from 'lucide-react';
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

interface StudyRoom {
  id: string; // Firestore document ID
  name: string;
  topic: string;
  memberCount: number; 
  members: { uid: string; name: string; avatar?: string; joinedAt: Timestamp }[];
  createdBy: string; // User UID
  createdAt: Timestamp;
  updatedAt?: Timestamp; 
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

    if (!trimmedName || !trimmedTopic) {
      toast({ title: "Missing Information", description: "Please provide a name and topic for the room.", variant: "destructive"});
      return;
    }

    if (trimmedName.length > MAX_ROOM_NAME_LENGTH) {
      toast({ title: "Room Name Too Long", description: `Room name must be less than ${MAX_ROOM_NAME_LENGTH + 1} characters.`, variant: "destructive"});
      return;
    }
    if (trimmedTopic.length > MAX_ROOM_TOPIC_LENGTH) {
      toast({ title: "Room Topic Too Long", description: `Room topic must be less than ${MAX_ROOM_TOPIC_LENGTH + 1} characters.`, variant: "destructive"});
      return;
    }

    setIsCreatingRoom(true);
    const newRoomData = {
      name: trimmedName,
      topic: trimmedTopic,
      memberCount: 0, 
      members: [], 
      createdBy: user.uid,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(), 
    };
    try {
      const roomsColRef = collection(db, 'studyRooms');
      const docRef = await addDoc(roomsColRef, newRoomData);
      toast({ title: "Room Created!", description: `"${newRoomData.name}" is now active.` });
      setNewRoomName('');
      setNewRoomTopic('');
      setShowCreateRoomDialog(false);
      router.push(`/study-rooms/${docRef.id}`); 
    } catch (error) {
      console.error("Error creating room: ", error);
      toast({ title: "Creation Failed", description: (error as Error).message, variant: "destructive" });
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
                </div>
                <DialogFooter>
                  <DialogClose asChild><Button type="button" variant="outline" disabled={isCreatingRoom}>Cancel</Button></DialogClose>
                  <Button type="submit" disabled={isCreatingRoom}>
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
          {studyRooms.map((room) => (
            <Card key={room.id} className="flex flex-col">
              <CardHeader>
                <CardTitle>{room.name}</CardTitle>
                <CardDescription>Topic: {room.topic}</CardDescription>
              </CardHeader>
              <CardContent className="flex-grow">
                <div className="flex items-center text-sm text-muted-foreground">
                  <Users className="mr-2 h-4 w-4" />
                  {room.memberCount} members
                </div>
                <div className="mt-2 text-xs text-muted-foreground">
                  Created: {room.createdAt?.toDate().toLocaleDateString() || 'N/A'}
                </div>
                 <div className="mt-1 text-xs text-muted-foreground">
                  Last Active: {room.updatedAt?.toDate().toLocaleString() || room.createdAt?.toDate().toLocaleString() || 'N/A'}
                </div>
              </CardContent>
              <CardContent className="border-t pt-4 flex justify-between">
                <Link href={`/study-rooms/${room.id}`} passHref>
                  <Button>
                    <LogIn className="mr-2 h-4 w-4" /> Join Room
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
