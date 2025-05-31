
'use client';

import PageHeader from '@/components/common/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Send, Users, LogOut, Edit2, MessageSquare, Palette, AlertCircle } from 'lucide-react';
import { useState, useEffect, use } from 'react'; 
import Image from 'next/image';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';


// Mock room data - in a real app, this would come from Firebase
const fetchRoomData = async (id: string) => {
  await new Promise(resolve => setTimeout(resolve, 300)); // Simulate network delay
  const rooms: Record<string, { name: string; topic: string; members: Member[] }> = {
    'room1': { name: 'Physics Study Group', topic: 'Quantum Mechanics', members: [{ id: 'user1', name: 'Alice', avatar: 'https://placehold.co/40x40/FFA500/FFFFFF.png?text=A' }, { id: 'user2', name: 'Bob', avatar: 'https://placehold.co/40x40/008000/FFFFFF.png?text=B' }] },
    'room2': { name: 'JavaScript Coders', topic: 'React & Next.js', members: [{ id: 'user3', name: 'Charlie', avatar: 'https://placehold.co/40x40/0000FF/FFFFFF.png?text=C' }] },
  };
  return rooms[id] || { name: 'Unknown Room', topic: 'N/A', members: [] };
};

interface Member { id: string; name: string; avatar?: string }
interface Message { id: string; userId: string; userName: string; userAvatar?: string; text: string; timestamp: string; }

export default function StudyRoomDetailPage(props: { params: Promise<{ id: string }> }) { 
  const resolvedParams = use(props.params); 
  const { id: roomId } = resolvedParams;
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const [roomName, setRoomName] = useState('Loading...');
  const [topic, setTopic] = useState('');
  const [members, setMembers] = useState<Member[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  
  const currentUser = user ? { id: user.uid, name: user.displayName || user.email?.split('@')[0] || 'You', avatar: user.photoURL || `https://placehold.co/40x40/FF0000/FFFFFF.png?text=${(user.email || 'Y').substring(0,1).toUpperCase()}` } : null;


  useEffect(() => {
    if (authLoading) return;
    if (!user) {
        router.push('/login?redirect=/study-rooms/' + roomId);
        return;
    }

    if (roomId && currentUser) { 
      fetchRoomData(roomId).then(data => {
        setRoomName(data.name);
        setTopic(data.topic);
        // Ensure currentUser is not duplicated if already in mock members
        const existingMemberIds = data.members.map(m => m.id);
        const currentMembers = existingMemberIds.includes(currentUser.id) ? data.members : [currentUser, ...data.members];
        setMembers(currentMembers);
        
        // Mock initial messages - in a real app, fetch from Firestore (e.g., rooms/{roomId}/messages)
        const initialMessages: Message[] = [];
        if (data.members[0]) {
            initialMessages.push({ id: 'msg1', userId:data.members[0].id, userName: data.members[0]?.name || 'Alice', userAvatar: data.members[0]?.avatar, text: 'Hey everyone! Ready to discuss Chapter 3?', timestamp: '10:30 AM' });
        }
        if (data.members[1]) {
             initialMessages.push({ id: 'msg2', userId:data.members[1].id, userName: data.members[1]?.name || 'Bob', userAvatar: data.members[1]?.avatar, text: 'Sure, I had a few questions on superposition.', timestamp: '10:31 AM' });
        }
        setMessages(initialMessages);

      });
    }
  }, [roomId, user, authLoading, router, currentUser]); 

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || newMessage.trim() === '') return;
    const msg: Message = {
      id: String(Date.now()),
      userId: currentUser.id,
      userName: currentUser.name,
      userAvatar: currentUser.avatar,
      text: newMessage,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    setMessages(prev => [...prev, msg]);
    setNewMessage('');
    // In a real app, send message to Firestore: addDoc(collection(db, 'rooms', roomId, 'messages'), msg)
  };

  if (authLoading) {
    return <div className="flex justify-center items-center h-screen"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>;
  }

  if (!user && !authLoading) {
    // This should be caught by the useEffect redirect, but as a fallback.
    return (
        <div className="flex flex-col items-center justify-center h-screen p-4 text-center">
            <AlertCircle className="w-16 h-16 text-destructive mb-4" />
            <h1 className="text-2xl font-bold mb-2">Access Denied</h1>
            <p className="text-muted-foreground mb-4">Please log in to join study rooms.</p>
            <Button onClick={() => router.push('/login')}>Go to Login</Button>
        </div>
    );
  }


  return (
    <div className="flex flex-col h-[calc(100vh-theme(space.16)-1rem)] sm:h-[calc(100vh-theme(space.16)-2rem)]"> {/* Adjusted height */}
      <PageHeader
        title={roomName}
        description={`Topic: ${topic}`}
        actions={
          <div className="flex flex-wrap gap-2 items-center">
            <div className="flex items-center -space-x-2 mr-2">
              {members.slice(0, 3).map(member => (
                <Avatar key={member.id} className="h-8 w-8 border-2 border-background">
                  <AvatarImage src={member.avatar} alt={member.name} data-ai-hint="user avatar" />
                  <AvatarFallback>{member.name.substring(0,1)}</AvatarFallback>
                </Avatar>
              ))}
              {members.length > 3 && (
                <Avatar className="h-8 w-8 border-2 border-background">
                   <AvatarFallback>+{members.length - 3}</AvatarFallback>
                </Avatar>
              )}
            </div>
            <Button variant="outline" size="sm"><Users className="mr-2 h-4 w-4" /> {members.length} Members</Button>
            <Button variant="destructive" size="sm" onClick={() => alert('Leave room (Not implemented)')}><LogOut className="mr-2 h-4 w-4" /> Leave</Button>
          </div>
        }
      />

      <div className="flex-grow grid grid-cols-1 lg:grid-cols-3 gap-4 overflow-hidden">
        {/* Whiteboard Area */}
        <Card className="lg:col-span-2 flex flex-col min-h-[300px] md:min-h-[400px] lg:min-h-0"> {/* Ensure min height for visibility */}
          <CardHeader className="flex flex-row items-center justify-between py-3 px-4">
            <CardTitle className="flex items-center text-lg"><Palette className="mr-2 h-5 w-5" /> Shared Whiteboard</CardTitle>
            <Button variant="ghost" size="sm"><Edit2 className="mr-2 h-4 w-4" /> Tools</Button>
          </CardHeader>
          <CardContent className="flex-grow flex items-center justify-center bg-muted/30 border-2 border-dashed border-muted-foreground/20 rounded-md m-2 md:m-4 p-2">
            <div className="text-center">
              <Image src="https://placehold.co/400x250.png" alt="Whiteboard placeholder" width={400} height={250} className="opacity-50 rounded max-w-full h-auto" data-ai-hint="whiteboard collaboration" />
              <p className="mt-2 md:mt-4 text-sm text-muted-foreground">Whiteboard area - Collaboration tools coming soon!</p>
            </div>
          </CardContent>
        </Card>

        {/* Chat Area */}
        <Card className="flex flex-col h-full max-h-[60vh] sm:max-h-[70vh] lg:max-h-full"> {/* Responsive max height */}
          <CardHeader className="py-3 px-4">
            <CardTitle className="flex items-center text-lg"><MessageSquare className="mr-2 h-5 w-5" /> Chat</CardTitle>
          </CardHeader>
          <ScrollArea className="flex-grow p-2 md:p-4 border-t border-b">
            <div className="space-y-4">
              {messages.map((msg) => (
                <div key={msg.id} className={`flex items-end gap-2 ${msg.userId === currentUser?.id ? 'justify-end' : 'justify-start'}`}>
                  {msg.userId !== currentUser?.id && (
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={msg.userAvatar} data-ai-hint="user avatar" />
                      <AvatarFallback>{msg.userName.substring(0,1)}</AvatarFallback>
                    </Avatar>
                  )}
                  <div className={`max-w-[75%] p-2 md:p-3 rounded-lg shadow-sm ${msg.userId === currentUser?.id ? 'bg-primary text-primary-foreground rounded-br-none' : 'bg-muted rounded-bl-none'}`}>
                    <p className="text-xs font-semibold mb-0.5">{msg.userName} <span className="text-xs text-muted-foreground/80 ml-1 font-normal">{msg.timestamp}</span></p>
                    <p className="text-sm break-words">{msg.text}</p>
                  </div>
                   {msg.userId === currentUser?.id && (
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={msg.userAvatar} data-ai-hint="user avatar" />
                      <AvatarFallback>{msg.userName.substring(0,1)}</AvatarFallback>
                    </Avatar>
                  )}
                </div>
              ))}
               {messages.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">No messages yet. Start the conversation!</p>}
            </div>
          </ScrollArea>
          <CardContent className="pt-2 md:pt-4 pb-2">
            <form onSubmit={handleSendMessage} className="flex gap-2">
              <Input
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Type a message..."
                className="flex-grow"
                disabled={!currentUser}
              />
              <Button type="submit" size="icon" aria-label="Send message" disabled={!currentUser}>
                <Send className="h-4 w-4" />
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
