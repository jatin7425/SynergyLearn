
'use client';

import PageHeader from '@/components/common/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Send, Users, LogOut, Edit2, MessageSquare, Palette } from 'lucide-react';
import { useState, useEffect } from 'react';
import Image from 'next/image';

// Mock room data
const fetchRoomData = async (id: string) => {
  await new Promise(resolve => setTimeout(resolve, 300));
  const rooms = {
    'room1': { name: 'Physics Study Group', topic: 'Quantum Mechanics', members: [{ id: 'user1', name: 'Alice', avatar: 'https://placehold.co/40x40/FFA500/FFFFFF.png?text=A' }, { id: 'user2', name: 'Bob', avatar: 'https://placehold.co/40x40/008000/FFFFFF.png?text=B' }] },
    'room2': { name: 'JavaScript Coders', topic: 'React & Next.js', members: [{ id: 'user3', name: 'Charlie', avatar: 'https://placehold.co/40x40/0000FF/FFFFFF.png?text=C' }] },
  };
  // @ts-ignore
  return rooms[id] || { name: 'Unknown Room', topic: 'N/A', members: [] };
};

interface Member { id: string; name: string; avatar?: string }
interface Message { id: string; userId: string; userName: string; userAvatar?: string; text: string; timestamp: string; }

export default function StudyRoomDetailPage({ params }: { params: { id: string } }) {
  const [roomName, setRoomName] = useState('Loading...');
  const [topic, setTopic] = useState('');
  const [members, setMembers] = useState<Member[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  // Mock current user
  const currentUser = { id: 'currentUser', name: 'You', avatar: 'https://placehold.co/40x40/FF0000/FFFFFF.png?text=Me' };


  useEffect(() => {
    fetchRoomData(params.id).then(data => {
      setRoomName(data.name);
      setTopic(data.topic);
      setMembers([currentUser, ...data.members]); // Add current user to members list for UI
      // Mock initial messages from fetched members
      setMessages([
        { id: 'msg1', userId:'user1', userName: data.members[0]?.name || 'Alice', userAvatar: data.members[0]?.avatar, text: 'Hey everyone! Ready to discuss Chapter 3?', timestamp: '10:30 AM' },
        { id: 'msg2', userId:'user2', userName: data.members[1]?.name || 'Bob', userAvatar: data.members[1]?.avatar, text: 'Sure, I had a few questions on superposition.', timestamp: '10:31 AM' },
      ]);
    });
  }, [params.id]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (newMessage.trim() === '') return;
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
    // In a real app, send message to server/other clients
  };

  return (
    <div className="flex flex-col h-[calc(100vh-theme(space.16)-2rem)] md:h-[calc(100vh-theme(space.16)-3rem)]"> {/* Adjusted height based on header and main padding */}
      <PageHeader
        title={roomName}
        description={`Topic: ${topic}`}
        actions={
          <div className="flex gap-2">
            {/* Member Avatars Display */}
            <div className="flex items-center -space-x-2 mr-2">
              {members.slice(0, 3).map(member => (
                <Avatar key={member.id} className="h-8 w-8 border-2 border-background">
                  <AvatarImage src={member.avatar} alt={member.name} />
                  <AvatarFallback>{member.name.substring(0,1)}</AvatarFallback>
                </Avatar>
              ))}
              {members.length > 3 && (
                <Avatar className="h-8 w-8 border-2 border-background">
                   <AvatarFallback>+{members.length - 3}</AvatarFallback>
                </Avatar>
              )}
            </div>
            <Button variant="outline"><Users className="mr-2 h-4 w-4" /> {members.length} Members</Button>
            <Button variant="destructive" onClick={() => alert('Leave room (Not implemented)')}><LogOut className="mr-2 h-4 w-4" /> Leave Room</Button>
          </div>
        }
      />

      <div className="flex-grow grid grid-cols-1 md:grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6 overflow-hidden">
        {/* Whiteboard Area */}
        <Card className="lg:col-span-2 flex flex-col min-h-[300px] md:min-h-0">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center"><Palette className="mr-2 h-5 w-5" /> Shared Whiteboard</CardTitle>
            <Button variant="ghost" size="sm"><Edit2 className="mr-2 h-4 w-4" /> Tools</Button>
          </CardHeader>
          <CardContent className="flex-grow flex items-center justify-center bg-muted/30 border-2 border-dashed border-muted-foreground/20 rounded-md m-2 md:m-4">
            <div className="text-center">
              <Image src="https://placehold.co/400x300.png" alt="Whiteboard placeholder" width={400} height={300} className="opacity-50 rounded max-w-full h-auto" data-ai-hint="whiteboard collaboration" />
              <p className="mt-4 text-muted-foreground">Whiteboard area - Collaboration tools coming soon!</p>
            </div>
          </CardContent>
        </Card>

        {/* Chat Area */}
        <Card className="flex flex-col h-full max-h-[50vh] md:max-h-full"> {/* Constrain height on mobile */}
          <CardHeader>
            <CardTitle className="flex items-center"><MessageSquare className="mr-2 h-5 w-5" /> Real-time Chat</CardTitle>
          </CardHeader>
          <ScrollArea className="flex-grow p-2 md:p-4 border-t border-b">
            <div className="space-y-4">
              {messages.map((msg) => (
                <div key={msg.id} className={`flex items-end gap-2 ${msg.userId === currentUser.id ? 'justify-end' : 'justify-start'}`}>
                  {msg.userId !== currentUser.id && (
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={msg.userAvatar} />
                      <AvatarFallback>{msg.userName.substring(0,1)}</AvatarFallback>
                    </Avatar>
                  )}
                  <div className={`max-w-[70%] p-3 rounded-lg ${msg.userId === currentUser.id ? 'bg-primary text-primary-foreground rounded-br-none' : 'bg-muted rounded-bl-none'}`}>
                    <p className="text-xs font-semibold mb-0.5">{msg.userName} <span className="text-xs text-muted-foreground/80 ml-1 font-normal">{msg.timestamp}</span></p>
                    <p className="text-sm">{msg.text}</p>
                  </div>
                   {msg.userId === currentUser.id && (
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={msg.userAvatar} />
                      <AvatarFallback>{msg.userName.substring(0,1)}</AvatarFallback>
                    </Avatar>
                  )}
                </div>
              ))}
               {messages.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">No messages yet. Start the conversation!</p>}
            </div>
          </ScrollArea>
          <CardContent className="pt-2 md:pt-4 pb-2 md:pb-4">
            <form onSubmit={handleSendMessage} className="flex gap-2">
              <Input
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Type a message..."
                className="flex-grow"
              />
              <Button type="submit" size="icon" aria-label="Send message">
                <Send className="h-4 w-4" />
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
