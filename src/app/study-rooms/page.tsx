
'use client';

import PageHeader from '@/components/common/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { PlusCircle, Users, LogIn, Edit, Plus } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { useState, type FormEvent } from 'react';
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
import { useToast } from '@/hooks/use-toast';

interface StudyRoom {
  id: string;
  name: string;
  members: number;
  topic: string;
  active: boolean;
}

const initialStudyRooms: StudyRoom[] = [
  { id: 'room1', name: 'Physics Study Group', members: 5, topic: 'Quantum Mechanics', active: true },
  { id: 'room2', name: 'JavaScript Coders', members: 12, topic: 'React & Next.js', active: true },
  { id: 'room3', name: 'History Buffs', members: 8, topic: 'World War II', active: false },
];

export default function StudyRoomsPage() {
  const [studyRooms, setStudyRooms] = useState<StudyRoom[]>(initialStudyRooms);
  const [showCreateRoomDialog, setShowCreateRoomDialog] = useState(false);
  const [newRoomName, setNewRoomName] = useState('');
  const [newRoomTopic, setNewRoomTopic] = useState('');
  const { toast } = useToast();

  const handleCreateRoom = (e: FormEvent) => {
    e.preventDefault();
    if (!newRoomName.trim() || !newRoomTopic.trim()) {
      toast({ title: "Missing Information", description: "Please provide a name and topic for the room.", variant: "destructive"});
      return;
    }
    const newRoom: StudyRoom = {
      id: `room${Date.now()}`,
      name: newRoomName,
      topic: newRoomTopic,
      members: 1, // Creator
      active: true,
    };
    setStudyRooms(prev => [newRoom, ...prev]);
    toast({ title: "Room Created!", description: `"${newRoomName}" is now active.` });
    setNewRoomName('');
    setNewRoomTopic('');
    setShowCreateRoomDialog(false);
  };

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
                <DialogDescription>
                  Set up a new space for collaborative learning.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleCreateRoom}>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="room-name" className="text-right">
                      Name
                    </Label>
                    <Input
                      id="room-name"
                      value={newRoomName}
                      onChange={(e) => setNewRoomName(e.target.value)}
                      className="col-span-3"
                      placeholder="e.g., Quantum Physics Enthusiasts"
                      required
                    />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="room-topic" className="text-right">
                      Topic
                    </Label>
                    <Input
                      id="room-topic"
                      value={newRoomTopic}
                      onChange={(e) => setNewRoomTopic(e.target.value)}
                      className="col-span-3"
                      placeholder="e.g., String Theory"
                      required
                    />
                  </div>
                </div>
                <DialogFooter>
                  <DialogClose asChild>
                     <Button type="button" variant="outline">Cancel</Button>
                  </DialogClose>
                  <Button type="submit">Create Room</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        }
      />
      
      {studyRooms.length === 0 ? (
         <Card className="text-center">
          <CardHeader>
            <Image src="https://placehold.co/300x200.png" alt="Empty study rooms" width={300} height={200} className="mx-auto mb-4 rounded-md" data-ai-hint="collaboration group" />
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
                  {room.members} members
                </div>
                <div className={`mt-2 text-xs font-semibold ${room.active ? 'text-green-600' : 'text-red-600'}`}>
                  {room.active ? 'Active Now' : 'Inactive'}
                </div>
              </CardContent>
              <CardContent className="border-t pt-4 flex justify-between">
                <Link href={`/study-rooms/${room.id}`} passHref>
                  <Button variant={room.active ? 'default' : 'outline'}>
                    <LogIn className="mr-2 h-4 w-4" /> Join Room
                  </Button>
                </Link>
                <Button variant="ghost" size="icon" aria-label="Edit room settings" onClick={() => alert(`Edit settings for ${room.name} (Not implemented)`)}>
                  <Edit className="h-4 w-4" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
