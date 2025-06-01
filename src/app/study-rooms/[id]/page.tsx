
'use client';

import PageHeader from '@/components/common/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Send, Users, LogOut, Edit2, MessageSquare, Palette, AlertCircle, Loader2 } from 'lucide-react';
import { useState, useEffect, use, FormEvent, useRef, useMemo } from 'react'; // Added useMemo
import Image from 'next/image';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter, usePathname } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { db } from '@/lib/firebase';
import { doc, getDoc, updateDoc, arrayUnion, arrayRemove, collection, addDoc, query, orderBy, onSnapshot, serverTimestamp, Timestamp } from 'firebase/firestore';
import type { FirebaseError } from 'firebase/app';

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
  const scrollAreaRef = useRef<HTMLDivElement>(null);


  const currentUserProfile = useMemo(() => {
    if (!user) return null;
    return {
      uid: user.uid,
      name: user.displayName || user.email?.split('@')[0] || 'Anonymous',
      avatar: user.photoURL || `https://placehold.co/40x40.png`
    };
  }, [user?.uid, user?.displayName, user?.email, user?.photoURL]); // Granular dependencies

  useEffect(() => {
    // Guard for initial loading states or no room ID
    if (authLoading || !roomId) {
      // If auth is done loading and there's no user, redirect.
      if (!authLoading && !user) { // user check is essential here
        toast({ title: "Authentication Required", description: "Please log in to join study rooms.", variant: "destructive" });
        router.push(`/login?redirect=${pathname}`);
      }
      return; // Exit early if auth is loading or no roomId
    }

    // At this point, authLoading is false.
    // If currentUserProfile is null, it means 'user' was null, which should have been caught by the redirect above.
    // This check is an additional safeguard or for clarity.
    if (!currentUserProfile) {
        // This typically means the user is not authenticated or user object is not yet available.
        // The redirect above should handle the unauthenticated case.
        // If it reaches here, it's an edge case, ensure setIsLoadingRoom is handled.
        console.warn("StudyRoomDetailPage: currentUserProfile is null. Auth state might still be resolving or user is not logged in.");
        setIsLoadingRoom(false); // Ensure loading state is cleared
        return;
    }
    
    setIsLoadingRoom(true);
    const roomDocRef = doc(db, 'studyRooms', roomId);

    // Fetch main room data once
    getDoc(roomDocRef).then(async (docSnap) => {
      if (docSnap.exists()) {
        let fetchedRoomData = { id: docSnap.id, ...docSnap.data() } as RoomData;
        const isMember = fetchedRoomData.members?.some(m => m.uid === currentUserProfile.uid);

        if (!isMember) {
          const memberData = { ...currentUserProfile, joinedAt: Timestamp.now() };
          const roomUpdateData = {
              members: arrayUnion(memberData),
              memberCount: (fetchedRoomData.members?.length || 0) + 1,
              updatedAt: serverTimestamp()
          };
          try {
            await updateDoc(roomDocRef, roomUpdateData);
            fetchedRoomData = {
                ...fetchedRoomData,
                members: [...(fetchedRoomData.members || []), memberData],
                memberCount: (fetchedRoomData.memberCount || 0) + 1,
            };
            setRoomData(fetchedRoomData);
          } catch (err) {
            const firebaseError = err as FirebaseError;
            console.error("Error joining room: ", firebaseError);
            if (firebaseError.code && (firebaseError.code === 'permission-denied' || firebaseError.code === 'PERMISSION_DENIED')) {
                console.error(
                  `Firestore 'update' for /studyRooms/${roomId} DENIED (joining room). Client User UID: ${currentUserProfile?.uid || 'N/A'}.` +
                  `\n>>> THIS IS A PERMISSION ERROR FROM FIRESTORE. <<<` +
                  `\n>>> USE THE DATA PAYLOADS BELOW WITH THE FIRESTORE RULES PLAYGROUND TO DEBUG YOUR SECURITY RULES. <<<` +
                  `\nAttempted member data (for arrayUnion):`,
                  JSON.stringify(memberData, (key, value) => {
                    if (value && typeof value === 'object') {
                      if (typeof (value as any).seconds === 'number' && typeof (value as any).nanoseconds === 'number' && value.constructor && value.constructor.name === 'Timestamp') {
                        return { seconds: (value as Timestamp).seconds, nanoseconds: (value as Timestamp).nanoseconds, _type: "FirestoreTimestamp" };
                      }
                      if (typeof (value as any)._methodName === 'string' && (value as any)._methodName.includes('timestamp')) {
                        return { _methodName: (value as any)._methodName };
                      }
                    }
                    return value;
                  }, 2)
                );
                console.error(
                  `Attempted room update data (memberCount, updatedAt):`,
                  JSON.stringify({ memberCount: roomUpdateData.memberCount, updatedAt: {_methodName: "serverTimestamp"} }, null, 2)
                );
                toast({
                  title: "Error Joining Room: Permissions",
                  description: "Could not join room due to security rule denial. Check browser console for data details.",
                  variant: "destructive",
                  duration: 15000
                });
            } else {
                toast({ title: "Error Joining Room", description: firebaseError.message, variant: "destructive"});
            }
            // Still set room data even if join fails, to show existing state
            setRoomData(fetchedRoomData); 
          }
        } else {
          setRoomData(fetchedRoomData);
        }
      } else {
        toast({ title: "Room Not Found", variant: "destructive" });
        router.push('/study-rooms');
      }
      setIsLoadingRoom(false);
    }).catch(error => {
      console.error("Error fetching room data: ", error);
      toast({ title: "Error", description: "Could not load room data.", variant: "destructive" });
      router.push('/study-rooms');
      setIsLoadingRoom(false);
    });

    // Setup snapshot listener for messages (chat)
    const messagesColRef = collection(db, 'studyRooms', roomId, 'messages');
    const q = query(messagesColRef, orderBy('timestamp', 'asc'));
    const unsubscribeMessages = onSnapshot(q, (snapshot) => {
        const fetchedMessages: Message[] = [];
        snapshot.forEach(doc => fetchedMessages.push({ id: doc.id, ...doc.data() } as Message));
        setMessages(fetchedMessages);
    }, (error) => {
        console.error("Error fetching messages: ", error);
        toast({ title: "Error", description: "Could not load messages.", variant: "destructive" });
    });

    return () => {
      unsubscribeMessages();
    };
  }, [roomId, authLoading, currentUserProfile, router, pathname, toast]); // Removed 'user' as direct dependency

  useEffect(() => {
    if (scrollAreaRef.current) {
      const scrollElement = scrollAreaRef.current.querySelector('div[data-radix-scroll-area-viewport]');
      if (scrollElement) {
        scrollElement.scrollTop = scrollElement.scrollHeight;
      }
    }
  }, [messages]);


  const handleSendMessage = async (e: FormEvent) => {
    e.preventDefault();
    if (!currentUserProfile || newMessage.trim() === '' || !roomId || isSendingMessage) return;

    setIsSendingMessage(true);
    const messageData = {
      userId: currentUserProfile.uid,
      userName: currentUserProfile.name,
      userAvatar: currentUserProfile.avatar,
      text: newMessage.trim(),
      timestamp: serverTimestamp()
    };
    try {
      const messagesColRef = collection(db, 'studyRooms', roomId, 'messages');
      await addDoc(messagesColRef, messageData);
      setNewMessage('');

      const roomDocRef = doc(db, 'studyRooms', roomId);
      await updateDoc(roomDocRef, { updatedAt: serverTimestamp() });

    } catch (error) {
      const firebaseError = error as FirebaseError;
      console.error("Error sending message: ", firebaseError);
      if (firebaseError.code && (firebaseError.code === 'permission-denied' || firebaseError.code === 'PERMISSION_DENIED')) {
        console.error(
          `Firestore 'create' for /studyRooms/${roomId}/messages OR 'update' for /studyRooms/${roomId} (for updatedAt) DENIED. Client User UID: ${currentUserProfile?.uid || 'N/A'}.` +
          `\n>>> THIS IS A PERMISSION ERROR FROM FIRESTORE. <<<` +
          `\n>>> USE THE DATA PAYLOADS BELOW WITH THE FIRESTORE RULES PLAYGROUND TO DEBUG YOUR SECURITY RULES. <<<` +
          `\nAttempted message data:`,
          JSON.stringify(messageData, (key, value) => {
            if (value && typeof value === 'object') {
              if (typeof (value as any).seconds === 'number' && typeof (value as any).nanoseconds === 'number' && value.constructor && value.constructor.name === 'Timestamp') {
                return { seconds: (value as Timestamp).seconds, nanoseconds: (value as Timestamp).nanoseconds, _type: "FirestoreTimestamp" };
              }
              if (typeof (value as any)._methodName === 'string' && (value as any)._methodName.includes('timestamp')) {
                return { _methodName: (value as any)._methodName };
              }
            }
            return value;
          }, 2)
        );
        console.error(
          `Attempted room update data (for updatedAt):`,
          JSON.stringify({ updatedAt: {_methodName: "serverTimestamp"} }, null, 2)
        );
         toast({
          title: "Error Sending Message: Permissions",
          description: "Could not send message due to security rule denial. Check browser console for data details.",
          variant: "destructive",
          duration: 15000
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

    const memberToRemove = roomData.members.find(m => m.uid === currentUserProfile.uid);
    if (!memberToRemove) {
        toast({title: "Error", description: "Cannot leave room, current user data not found in room members.", variant: "destructive"});
        return;
    }
    
    const roomUpdateData = {
        members: arrayRemove(memberToRemove),
        memberCount: Math.max(0, (roomData.memberCount || 1) - 1),
        updatedAt: serverTimestamp()
    };

    try {
        const roomDocRef = doc(db, 'studyRooms', roomId);
        await updateDoc(roomDocRef, roomUpdateData);
        toast({ title: "Left Room", description: `You have left ${roomData.name}.`});
        router.push('/study-rooms');
    } catch (error) {
        const firebaseError = error as FirebaseError;
        console.error("Error leaving room: ", firebaseError);
        if (firebaseError.code && (firebaseError.code === 'permission-denied' || firebaseError.code === 'PERMISSION_DENIED')) {
            console.error(
              `Firestore 'update' for /studyRooms/${roomId} DENIED (leaving room). Client User UID: ${currentUserProfile?.uid || 'N/A'}.` +
              `\n>>> THIS IS A PERMISSION ERROR FROM FIRESTORE. <<<` +
              `\n>>> USE THE DATA PAYLOADS BELOW WITH THE FIRESTORE RULES PLAYGROUND TO DEBUG YOUR SECURITY RULES. <<<` +
              `\nAttempted member data (for arrayRemove):`,
              JSON.stringify(memberToRemove, (key, value) => {
                if (value && typeof value === 'object') {
                  if (typeof (value as any).seconds === 'number' && typeof (value as any).nanoseconds === 'number' && value.constructor && value.constructor.name === 'Timestamp') {
                    return { seconds: (value as Timestamp).seconds, nanoseconds: (value as Timestamp).nanoseconds, _type: "FirestoreTimestamp" };
                  }
                  if (typeof (value as any)._methodName === 'string' && (value as any)._methodName.includes('timestamp')) {
                    return { _methodName: (value as any)._methodName };
                  }
                }
                return value;
              }, 2)
            );
            console.error(
              `Attempted room update data (memberCount, updatedAt):`,
              JSON.stringify({ memberCount: roomUpdateData.memberCount, updatedAt: {_methodName: "serverTimestamp"} }, null, 2)
            );
             toast({
              title: "Error Leaving Room: Permissions",
              description: "Could not leave room due to security rule denial. Check browser console for data details.",
              variant: "destructive",
              duration: 15000
            });
        } else {
            toast({ title: "Error Leaving Room", description: firebaseError.message, variant: "destructive"});
        }
    }
  };


  if (authLoading || (isLoadingRoom && currentUserProfile)) { // Check currentUserProfile to ensure effect runs after it's potentially set
    return (
        <div className="flex justify-center items-center min-h-screen">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
        </div>
    );
  }

  // This handles the case where auth is done, user is null (and thus currentUserProfile is null)
  if (!currentUserProfile && !authLoading) { 
    // The redirect should have happened in useEffect, but this is a fallback display.
    return (
        <div className="flex flex-col items-center justify-center min-h-screen p-4 text-center">
            <AlertCircle className="w-16 h-16 text-destructive mb-4" />
            <h1 className="text-2xl font-bold mb-2">Access Denied</h1>
            <p className="text-muted-foreground mb-4">Please log in to join study rooms.</p>
            <Button onClick={() => router.push(`/login?redirect=${pathname}`)}>Go to Login</Button>
        </div>
    );
  }
  
  if (!roomData && !isLoadingRoom) { // Room data failed to load or room doesn't exist
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
    <div className="flex flex-col h-[calc(100vh-theme(space.16)-1rem)] sm:h-[calc(100vh-theme(space.16)-2rem)]">
      <PageHeader
        title={roomData?.name || 'Loading Room...'}
        description={roomData ? `Topic: ${roomData.topic}` : 'Fetching details...'}
        actions={
          <div className="flex flex-wrap gap-2 items-center">
            <div className="flex items-center -space-x-2 mr-2">
              {roomData?.members?.slice(0, 3).map(member => (
                <Avatar key={member.uid} className="h-8 w-8 border-2 border-background">
                  <AvatarImage src={member.avatar || 'https://placehold.co/40x40.png'} alt={member.name} data-ai-hint="user avatar" />
                  <AvatarFallback>{member.name.substring(0,1).toUpperCase()}</AvatarFallback>
                </Avatar>
              ))}
              {(roomData?.members?.length || 0) > 3 && (
                <Avatar className="h-8 w-8 border-2 border-background">
                   <AvatarFallback>+{(roomData?.members?.length || 0) - 3}</AvatarFallback>
                </Avatar>
              )}
            </div>
            <Button variant="outline" size="sm"><Users className="mr-2 h-4 w-4" /> {roomData?.memberCount || 0} Members</Button>
            <Button variant="destructive" size="sm" onClick={handleLeaveRoom}><LogOut className="mr-2 h-4 w-4" /> Leave</Button>
          </div>
        }
      />

      <div className="flex-grow grid grid-cols-1 lg:grid-cols-3 gap-4 overflow-hidden">
        <Card className="lg:col-span-2 flex flex-col min-h-[300px] md:min-h-[400px] lg:min-h-0">
          <CardHeader className="flex flex-row items-center justify-between py-3 px-4">
            <CardTitle className="flex items-center text-lg"><Palette className="mr-2 h-5 w-5" /> Shared Whiteboard</CardTitle>
            <Button variant="ghost" size="sm" onClick={() => toast({title: "Coming Soon!"})}><Edit2 className="mr-2 h-4 w-4" /> Tools</Button>
          </CardHeader>
          <CardContent className="flex-grow flex items-center justify-center bg-muted/30 border-2 border-dashed border-muted-foreground/20 rounded-md m-2 md:m-4 p-2">
            <div className="text-center">
              <Image src="https://placehold.co/400x250.png" alt="Whiteboard placeholder" width={400} height={250} className="opacity-50 rounded max-w-full h-auto" data-ai-hint="whiteboard sketch" />
              <p className="mt-2 md:mt-4 text-sm text-muted-foreground">Whiteboard area - Collaboration tools coming soon!</p>
            </div>
          </CardContent>
        </Card>

        <Card className="flex flex-col h-full max-h-[60vh] sm:max-h-[70vh] lg:max-h-full">
          <CardHeader className="py-3 px-4">
            <CardTitle className="flex items-center text-lg"><MessageSquare className="mr-2 h-5 w-5" /> Chat</CardTitle>
          </CardHeader>
          <ScrollArea className="flex-grow p-2 md:p-4 border-t border-b" ref={scrollAreaRef}>
            <div className="space-y-4">
              {messages.map((msg) => (
                <div key={msg.id} className={`flex items-end gap-2 ${msg.userId === currentUserProfile?.uid ? 'justify-end' : 'justify-start'}`}>
                  {msg.userId !== currentUserProfile?.uid && (
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={msg.userAvatar || 'https://placehold.co/40x40.png'} data-ai-hint="user avatar" />
                      <AvatarFallback>{msg.userName?.substring(0,1).toUpperCase() || 'A'}</AvatarFallback>
                    </Avatar>
                  )}
                  <div className={`max-w-[75%] p-2 md:p-3 rounded-lg shadow-sm ${msg.userId === currentUserProfile?.uid ? 'bg-primary text-primary-foreground rounded-br-none' : 'bg-muted rounded-bl-none'}`}>
                    <p className="text-xs font-semibold mb-0.5">{msg.userName}
                        <span className="text-xs text-muted-foreground/80 ml-1 font-normal">
                            {msg.timestamp?.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) || 'sending...'}
                        </span>
                    </p>
                    <p className="text-sm break-words">{msg.text}</p>
                  </div>
                   {msg.userId === currentUserProfile?.uid && (
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={msg.userAvatar || 'https://placehold.co/40x40.png'} data-ai-hint="user avatar" />
                      <AvatarFallback>{msg.userName?.substring(0,1).toUpperCase() || 'U'}</AvatarFallback>
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
                disabled={!currentUserProfile || isSendingMessage}
              />
              <Button type="submit" size="icon" aria-label="Send message" disabled={!currentUserProfile || isSendingMessage || newMessage.trim() === ''}>
                {isSendingMessage ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

    