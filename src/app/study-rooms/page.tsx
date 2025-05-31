import PageHeader from '@/components/common/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { PlusCircle, Users, LogIn, Edit } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';

const studyRooms = [
  { id: 'room1', name: 'Physics Study Group', members: 5, topic: 'Quantum Mechanics', active: true },
  { id: 'room2', name: 'JavaScript Coders', members: 12, topic: 'React & Next.js', active: true },
  { id: 'room3', name: 'History Buffs', members: 8, topic: 'World War II', active: false },
];

export default function StudyRoomsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Collaborative Study Rooms"
        description="Join or create study rooms to learn with others."
        actions={
          <Link href="/study-rooms/new" passHref>
            <Button>
              <PlusCircle className="mr-2 h-4 w-4" /> Create New Room
            </Button>
          </Link>
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
            <Link href="/study-rooms/new" passHref>
              <Button>
                <PlusCircle className="mr-2 h-4 w-4" /> Create Your First Room
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
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
                <Button variant="ghost" size="icon" aria-label="Edit room settings">
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
