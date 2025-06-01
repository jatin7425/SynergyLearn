
'use client';

import PageHeader from '@/components/common/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Send, Users, LogOut, Edit2, MessageSquare, Palette, AlertCircle, Loader2, Presentation, Bot } from 'lucide-react';
import { useState, useEffect, use, FormEvent, useRef, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter, usePathname } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { db } from '@/lib/firebase';
import { doc, getDoc, updateDoc, arrayUnion, arrayRemove, collection, addDoc, query, orderBy, onSnapshot, serverTimestamp, Timestamp } from 'firebase/firestore';
import type { FirebaseError } from 'firebase/app';
import { getAIChatResponse, type ChatAssistantInput } from '@/ai/flows/chat-assistant-flow';
import { cn } from '@/lib/utils';


interface Member {
  uid: string;
  name: string;
  avatar?: string;
  joinedAt?: Timestamp;
}
interface RoomData {
  id: string;
  name: string;
  topic: string;
  members: Member[];
  memberCount: number;
  createdBy: string;
  createdAt: Timestamp;
  updatedAt?: Timestamp;
}
interface Message {
  id: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  text: string;
  timestamp: Timestamp | null;
}

const AI_USER_ID = 'AI_ASSISTANT';
const AI_USER_NAME = 'AI Helper';
const AI_AVATAR_URL = 'https://placehold.co/40x40/7A2BF5/ffffff.png&text=AI'; // Using accent color

export default function StudyRoomDetailPage(props: { params: Promise<{ id:string }> }) {
  const resolvedParams = use(props.params);
  const { id: roomId } = resolvedParams || {};

  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const { toast } = useToast();

  const [roomData, setRoomData] = useState<RoomData | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoadingRoom, setIsLoadingRoom] = useState(true);
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);


  const currentUserProfile = useMemo(() => {
    if (!user) return null;
    return {
      uid: user.uid,
      name: user.displayName || user.email?.split('@')[0] || 'Anonymous',
      avatar: user.photoURL || `https://placehold.co/40x40.png`
    };
  }, [user]);

  useEffect(() => {
    if (authLoading || !roomId) {
      if (!authLoading && !user) {
        toast({ title: "Authentication Required", description: "Please log in to join study rooms.", variant: "destructive" });
        router.push(`/login?redirect=${pathname}`);
      }
      return;
    }

    if (!currentUserProfile && !authLoading) {
        console.warn("StudyRoomDetailPage: currentUserProfile is null even after authLoading is false.");
        setIsLoadingRoom(false);
        if (!user) {
           router.push(`/login?redirect=${pathname}`);
        }
        return;
    }
    
    setIsLoadingRoom(true);
    const roomDocRef = doc(db, 'studyRooms', roomId);

    getDoc(roomDocRef).then((docSnap) => {
      if (docSnap.exists()) {
        setRoomData({ id: docSnap.id, ...docSnap.data() } as RoomData);
      } else {
        toast({ title: "Room Not Found", variant: "destructive" });
        router.push('/study-rooms');
      }
      setIsLoadingRoom(false);
    }).catch(error => {
      console.error(`Error fetching room data for ${roomId}: `, error);
      toast({ title: "Error", description: "Could not load room data.", variant: "destructive" });
      router.push('/study-rooms');
      setIsLoadingRoom(false);
    });

    const messagesColRef = collection(db, 'studyRooms', roomId, 'messages');
    const q = query(messagesColRef, orderBy('timestamp', 'asc'));
    const unsubscribeMessages = onSnapshot(q, (snapshot) => {
        const fetchedMessages: Message[] = [];
        snapshot.forEach(doc => fetchedMessages.push({ id: doc.id, ...doc.data() } as Message));
        setMessages(fetchedMessages);
    }, (error) => {
        console.error(`Firestore onSnapshot error for messages in room ${roomId}: `, error);
        toast({ title: "Error", description: "Could not load messages.", variant: "destructive" });
    });

    return () => {
      unsubscribeMessages();
    };
  }, [roomId, authLoading, currentUserProfile, router, pathname, toast, user]); 

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);


  const handleSendMessage = async (e: FormEvent) => {
    e.preventDefault();
    if (!currentUserProfile || newMessage.trim() === '' || !roomId || isSendingMessage || !roomData) return;

    const trimmedMessage = newMessage.trim();
    setIsSendingMessage(true);
    setNewMessage(''); 

    const messagesColRef = collection(db, 'studyRooms', roomId, 'messages');

    const userMessageData = {
      userId: currentUserProfile.uid,
      userName: currentUserProfile.name,
      userAvatar: currentUserProfile.avatar,
      text: trimmedMessage,
      timestamp: serverTimestamp()
    };

    try {
      await addDoc(messagesColRef, userMessageData);

      if (trimmedMessage.toLowerCase().startsWith('@help_me')) {
        const aiQuery = trimmedMessage.substring('@help_me'.length).trim();

        if (aiQuery) {
          try {
            const aiResult = await getAIChatResponse({ userQuery: aiQuery });
            const aiResponseMessageData = {
              userId: AI_USER_ID,
              userName: AI_USER_NAME,
              userAvatar: AI_AVATAR_URL,
              text: aiResult.aiResponse,
              timestamp: serverTimestamp()
            };
            await addDoc(messagesColRef, aiResponseMessageData);
          } catch (aiError) {
            console.error("Error getting AI response:", aiError);
            const aiErrorMessageData = {
              userId: AI_USER_ID,
              userName: AI_USER_NAME,
              userAvatar: AI_AVATAR_URL,
              text: "Sorry, I had trouble processing that. Please try again or rephrase your question.",
              timestamp: serverTimestamp()
            };
            await addDoc(messagesColRef, aiErrorMessageData);
          }
        } else {
          const helpMessageData = {
              userId: AI_USER_ID,
              userName: AI_USER_NAME,
              userAvatar: AI_AVATAR_URL,
              text: "How can I help you? Please type your question after '@help_me'.",
              timestamp: serverTimestamp()
          };
          await addDoc(messagesColRef, helpMessageData);
        }
      }
    } catch (error) {
      const firebaseError = error as FirebaseError;
      console.error("Error sending message: ", firebaseError);
      if (firebaseError.code && (firebaseError.code === 'permission-denied' || firebaseError.code === 'PERMISSION_DENIED')) {
         console.error(
          `Firestore 'create' for /studyRooms/${roomId}/messages DENIED. Client User UID: ${currentUserProfile?.uid || 'N/A'}.` +
          `\n>>> THIS IS A PERMISSION ERROR FROM FIRESTORE. <<<` +
          `\n>>> USE THE DATA PAYLOAD BELOW WITH THE FIRESTORE RULES PLAYGROUND TO DEBUG YOUR SECURITY RULES. <<<` +
          `\nAttempted message data:`,
          JSON.stringify(userMessageData, (key, value) => { 
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
          title: "Error Sending Message: Permissions",
          description: "Could not send message. Check Firestore security rules.",
          variant: "destructive",
          duration: 10000
        });
      } else {
        toast({ title: "Error Sending Message", description: firebaseError.message, variant: "destructive"});
      }
    } finally {
      setIsSendingMessage(false);
    }
  };

  const handleLeaveRoom = async () => {
    if (!currentUserProfile || !roomId || !roomData) return;
    
    const isCreator = roomData.createdBy === currentUserProfile.uid;
    
    if (!isCreator) {
        toast({ title: "Navigating Away", description: `You have left ${roomData.name}.`});
        router.push('/study-rooms');
        return;
    }
    
    const memberToRemove = roomData.members.find(m => m.uid === currentUserProfile.uid);
    
    const roomUpdateData: Partial<RoomData> = {
        updatedAt: serverTimestamp()
    };

    if (memberToRemove) {
        roomUpdateData.members = arrayRemove(memberToRemove);
        roomUpdateData.memberCount = Math.max(0, (roomData.memberCount || 1) - 1);
    }

    try {
        const roomDocRef = doc(db, 'studyRooms', roomId);
        await updateDoc(roomDocRef, roomUpdateData);
        toast({ title: "Left Room", description: `You have left ${roomData.name}.`});
        router.push('/study-rooms');
    } catch (error) {
        const firebaseError = error as FirebaseError;
        console.error("Error leaving room (as creator): ", firebaseError);
        toast({ title: "Error Leaving Room", description: firebaseError.message, variant: "destructive"});
    }
  };

  const isRoomCreator = roomData?.createdBy === currentUserProfile?.uid;

  if (authLoading || (isLoadingRoom && currentUserProfile)) { 
    return (
        <div className="flex justify-center items-center min-h-screen">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
        </div>
    );
  }

  if (!currentUserProfile && !authLoading) { 
    return (
        <div className="flex flex-col items-center justify-center min-h-screen p-4 text-center">
            <AlertCircle className="w-16 h-16 text-destructive mb-4" />
            <h1 className="text-2xl font-bold mb-2">Access Denied</h1>
            <p className="text-muted-foreground mb-4">Please log in to join study rooms.</p>
            <Button onClick={() => router.push(`/login?redirect=${pathname}`)}>Go to Login</Button>
        </div>
    );
  }
  
  if (!roomData && !isLoadingRoom) { 
     return (
        <div className="flex flex-col items-center justify-center min-h-screen p-4 text-center">
            <AlertCircle className="w-16 h-16 text-destructive mb-4" />
            <h1 className="text-2xl font-bold mb-2">Room Not Found</h1>
            <p className="text-muted-foreground mb-4">This study room may no longer exist.</p>
            <Button onClick={() => router.push('/study-rooms')}>Back to Rooms</Button>
        </div>
    );
  }


  return (
    <div className="flex flex-col h-full">
      <PageHeader
        title={roomData?.name || 'Loading Room...'}
        description={roomData ? `Topic: ${roomData.topic}` : 'Fetching details...'}
        actions={
          <div className="flex flex-wrap gap-2 items-center">
            <div className="flex items-center -space-x-2 mr-2">
              {roomData?.members?.slice(0, 3).map(member => (
                <Avatar key={member.uid} className="h-8 w-8 border-2 border-background">
                  <AvatarImage src={member.avatar || 'https://placehold.co/40x40.png'} alt={member.name} data-ai-hint="user avatar" />
                  <AvatarFallback>{member.name?.substring(0,1).toUpperCase() || 'M'}</AvatarFallback>
                </Avatar>
              ))}
              {(roomData?.members?.length || 0) > 3 && (
                <Avatar className="h-8 w-8 border-2 border-background">
                   <AvatarFallback>+{(roomData?.members?.length || 0) - 3}</AvatarFallback>
                </Avatar>
              )}
            </div>
            <Button variant="outline" size="sm"><Users className="mr-2 h-4 w-4" /> {roomData?.memberCount || 0} Members</Button>
            <Button variant="destructive" size="sm" onClick={handleLeaveRoom} disabled={!isRoomCreator}>
              <LogOut className="mr-2 h-4 w-4" /> Leave
            </Button>
          </div>
        }
      />

      <Tabs defaultValue="chat" className="flex-grow flex flex-col mt-4 overflow-hidden">
        <TabsList className="grid w-full grid-cols-2 mb-4 flex-shrink-0">
          <TabsTrigger value="whiteboard">Whiteboard</TabsTrigger>
          <TabsTrigger value="chat">Chat</TabsTrigger>
        </TabsList>

        <TabsContent value="whiteboard" className="flex-grow m-0 flex flex-col overflow-hidden">
          <Card className="flex-grow flex flex-col overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between py-3 px-4 flex-shrink-0">
                <CardTitle className="flex items-center text-lg"><Presentation className="mr-2 h-5 w-5 text-primary" /> Shared Whiteboard</CardTitle>
                <Button variant="ghost" size="sm" onClick={() => toast({title: "Coming Soon!"})}><Edit2 className="mr-2 h-4 w-4" /> Tools</Button>
            </CardHeader>
            <CardContent className="flex-grow flex items-center justify-center bg-muted/20 border-2 border-dashed border-muted-foreground/10 rounded-md m-2 md:m-4 p-2">
                <div className="text-center text-muted-foreground">
                <Presentation size={48} className="mx-auto opacity-40 mb-3" />
                <h3 className="text-lg font-semibold">Shared Whiteboard</h3>
                <p className="mt-1 text-sm ">Interactive collaboration tools are coming soon!</p>
                </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="chat" className="flex-grow flex flex-col m-0 overflow-hidden">
          <Card className="flex flex-col flex-grow overflow-hidden max-h-[75vh]">
            <CardHeader className="py-3 px-4 flex-shrink-0">
              <CardTitle className="flex items-center text-lg"><MessageSquare className="mr-2 h-5 w-5" /> Chat</CardTitle>
            </CardHeader>
            <div className="flex-grow min-h-0 relative">
                 <ScrollArea className="absolute inset-0 p-2 md:p-4 border-t border-b">
                    <div className="space-y-4">
                        {messages.map((msg) => {
                        const isCurrentUserMessage = msg.userId === currentUserProfile?.uid;
                        const isAIMessage = msg.userId === AI_USER_ID;
                        return (
                            <div key={msg.id} className={`flex items-end gap-2 ${isCurrentUserMessage ? 'justify-end' : 'justify-start'}`}>
                            {!isCurrentUserMessage && (
                                <Avatar className="h-8 w-8">
                                <AvatarImage src={isAIMessage ? AI_AVATAR_URL : (msg.userAvatar || 'https://placehold.co/40x40.png')} data-ai-hint={isAIMessage ? "robot bot" : "user avatar"} />
                                <AvatarFallback>{isAIMessage ? 'AI' : (msg.userName?.substring(0,1).toUpperCase() || 'A')}</AvatarFallback>
                                </Avatar>
                            )}
                            <div className={cn(
                                "max-w-[75%] p-2 md:p-3 rounded-lg shadow-sm",
                                isCurrentUserMessage ? 'bg-primary text-primary-foreground rounded-br-none' 
                                : isAIMessage ? 'bg-accent/30 border border-accent/50 rounded-bl-none' 
                                : 'bg-card border rounded-bl-none'
                            )}>
                                <p className="text-xs font-semibold mb-0.5">{msg.userName}
                                    <span className={cn("text-xs ml-1 font-normal", 
                                        isCurrentUserMessage ? 'text-primary-foreground/80' 
                                        : isAIMessage ? 'text-accent-foreground/80 dark:text-accent-foreground/70'
                                        : 'text-muted-foreground/80'
                                    )}>
                                        {msg.timestamp?.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) || 'sending...'}
                                    </span>
                                </p>
                                <p className="text-sm break-words">{msg.text}</p>
                            </div>
                            {isCurrentUserMessage && (
                                <Avatar className="h-8 w-8">
                                <AvatarImage src={msg.userAvatar || 'https://placehold.co/40x40.png'} data-ai-hint="user avatar" />
                                <AvatarFallback>{msg.userName?.substring(0,1).toUpperCase() || 'U'}</AvatarFallback>
                                </Avatar>
                            )}
                            </div>
                        );
                        })}
                        {messages.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">No messages yet. Start the conversation or ask <code className="bg-muted px-1 py-0.5 rounded">@help_me</code> for assistance!</p>}
                        <div ref={messagesEndRef} />
                    </div>
                 </ScrollArea>
            </div>
            <CardContent className="pt-2 md:pt-4 pb-2 flex-shrink-0">
              <form onSubmit={handleSendMessage} className="flex gap-2">
                <Input
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Type a message, or @help_me for AI..."
                  className="flex-grow"
                  disabled={!currentUserProfile || isSendingMessage}
                />
                <Button type="submit" size="icon" aria-label="Send message" disabled={!currentUserProfile || isSendingMessage || newMessage.trim() === ''}>
                  {isSendingMessage ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
