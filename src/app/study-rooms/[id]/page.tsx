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
    'room1': { name: 'Physics Study Group', topic: 'Quantum Mechanics', members: [{ id: 'user1', name: 'Alice' }, { id: 'user2', name: 'Bob' }] },
    'room2': { name: 'JavaScript Coders', topic: 'React & Next.js', members: [{ id: 'user3', name: 'Charlie' }] },
  };
  // @ts-ignore
  return rooms[id] || { name: 'Unknown Room', topic: 'N/A', members: [] };
};

interface Member { id: string; name: string; }
interface Message { id: string; userName: string; text: string; timestamp: string; }

export default function StudyRoomDetailPage({ params }: { params: { id: string } }) {
  const [roomName, setRoomName] = useState('Loading...');
  const [topic, setTopic] = useState('');
  const [members, setMembers] = useState<Member[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');

  useEffect(() => {
    fetchRoomData(params.id).then(data => {
      setRoomName(data.name);
      setTopic(data.topic);
      setMembers(data.members);
      // Mock initial messages
      setMessages([
        { id: 'msg1', userName: 'Alice', text: 'Hey everyone! Ready to discuss Chapter 3?', timestamp: '10:30 AM' },
        { id: 'msg2', userName: 'Bob', text: 'Sure, I had a few questions on superposition.', timestamp: '10:31 AM' },
      ]);
    });
  }, [params.id]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (newMessage.trim() === '') return;
    const msg: Message = {
      id: String(Date.now()),
      userName: 'You', // Replace with actual user name
      text: newMessage,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    setMessages(prev => [...prev, msg]);
    setNewMessage('');
    // In a real app, send message to server/other clients
  };

  return (
    <div className="flex flex-col h-[calc(100vh-theme(space.16))]"> {/* Adjust height based on header */}
      <PageHeader
        title={roomName}
        description={`Topic: ${topic}`}
        actions={
          <div className="flex gap-2">
            <Button variant="outline"><Users className="mr-2 h-4 w-4" /> {members.length} Members</Button>
            <Button variant="destructive" onClick={() => alert('Leave room (Not implemented)')}><LogOut className="mr-2 h-4 w-4" /> Leave Room</Button>
          </div>
        }
      />

      <div className="flex-grow grid grid-cols-1 lg:grid-cols-3 gap-6 overflow-hidden">
        {/* Whiteboard Area */}
        <Card className="lg:col-span-2 flex flex-col">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center"><Palette className="mr-2 h-5 w-5" /> Shared Whiteboard</CardTitle>
            <Button variant="ghost" size="sm"><Edit2 className="mr-2 h-4 w-4" /> Tools</Button>
          </CardHeader>
          <CardContent className="flex-grow flex items-center justify-center bg-muted/30 border-2 border-dashed border-muted-foreground/20 rounded-md m-4">
            <div className="text-center">
              <Image src="https://placehold.co/400x300.png" alt="Whiteboard placeholder" width={400} height={300} className="opacity-50 rounded" data-ai-hint="whiteboard collaboration" />
              <p className="mt-4 text-muted-foreground">Whiteboard area - Collaboration tools coming soon!</p>
            </div>
          </CardContent>
        </Card>

        {/* Chat Area */}
        <Card className="flex flex-col h-full">
          <CardHeader>
            <CardTitle className="flex items-center"><MessageSquare className="mr-2 h-5 w-5" /> Real-time Chat</CardTitle>
          </CardHeader>
          <ScrollArea className="flex-grow p-4 border-t border-b">
            <div className="space-y-4">
              {messages.map((msg) => (
                <div key={msg.id} className={`flex ${msg.userName === 'You' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[75%] p-3 rounded-lg ${msg.userName === 'You' ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                    <p className="text-xs font-semibold mb-1">{msg.userName} <span className="text-xs text-muted-foreground/70 ml-1">{msg.timestamp}</span></p>
                    <p className="text-sm">{msg.text}</p>
                  </div>
                </div>
              ))}
               {messages.length === 0 && <p className="text-sm text-muted-foreground text-center">No messages yet. Start the conversation!</p>}
            </div>
          </ScrollArea>
          <CardContent className="pt-4">
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
