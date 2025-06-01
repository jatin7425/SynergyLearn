
'use client';

import PageHeader from '@/components/common/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Send, Users, LogOut, Edit2, MessageSquare, Palette, AlertCircle, Loader2, Presentation, Bot, PenTool, Eraser, Trash2, Minus, Plus, GripVertical, Command } from 'lucide-react';
import React, { useState, useEffect, FormEvent, useRef, useMemo, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter, useParams } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { db } from '@/lib/firebase';
import { doc, getDoc, updateDoc, arrayUnion, arrayRemove, collection, addDoc, query, orderBy, onSnapshot, serverTimestamp, Timestamp, deleteDoc } from 'firebase/firestore';
import type { FirebaseError } from 'firebase/app';
import { getAIChatResponse, type ChatAssistantInput } from '@/ai/flows/chat-assistant-flow';
import { getChatSummary, type ChatSummaryInput } from '@/ai/flows/summarize-chat-flow';
import { cn } from '@/lib/utils';
import WhiteboardCanvas, { type WhiteboardPath } from '@/components/study-rooms/WhiteboardCanvas';
import { Separator } from '@/components/ui/separator';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Textarea } from '@/components/ui/textarea';


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
  whiteboardDrawing?: WhiteboardPath[];
}
interface Message {
  id:string;
  userId: string;
  userName: string;
  userAvatar?: string;
  text: string;
  timestamp: Timestamp;
  updatedAt?: Timestamp; // For edited messages
}

const AI_USER_ID = 'AI_ASSISTANT';
const AI_USER_NAME = 'AI Helper'; 
const AI_AVATAR_URL = 'https://placehold.co/40x40/7A2BF5/ffffff.png&text=AI';
const AI_MENTION_NAME = 'help_me';

const slashCommands = [
  { name: 'summarize', displayName: '/summarize', description: 'Get a summary of recent chat messages.', icon: MessageSquare },
  { name: 'suggestion', displayName: '/suggestion <your query>', description: 'Ask the AI for a suggestion or idea.', icon: Bot },
  { name: 'ask', displayName: '/ask <your question>', description: 'Ask the AI a general question.', icon: Bot },
];


type AISuggestionType = { uid: string; name: string; displayName: string; type: 'ai'; avatar?: string, icon?: React.ElementType };
type UserSuggestionType = Member & { type: 'member' };
type CommandSuggestionType = typeof slashCommands[0] & { type: 'command', uid: string };

type MentionSuggestion = AISuggestionType | UserSuggestionType | CommandSuggestionType;

const aiHelpSuggestionItem: AISuggestionType = { 
  uid: `ai_special_${AI_MENTION_NAME}`, 
  name: AI_MENTION_NAME, 
  displayName: `AI Helper (@${AI_MENTION_NAME})`, 
  type: 'ai',
  avatar: AI_AVATAR_URL,
  icon: Bot
};


function renderMessageWithTags(
  text: string,
  members: Member[] | undefined,
  aiTrigger: string, 
  currentUserId?: string
): React.ReactNode {
  if (!text) return '';
  const words = text.split(/(\s+)/); 

  return words.map((word, index) => {
    if (word.startsWith('@')) {
      const mentionWithPunctuation = word.substring(1);
      
      let actualMentionName = mentionWithPunctuation;
      let punctuation = '';
      
      const punctuationRegex = /([!"#$%&'()*+,-./:;<=>?@[\]^_`{|}~]+)$/;
      const punctuationMatch = mentionWithPunctuation.match(punctuationRegex);
      
      if (punctuationMatch && punctuationMatch[0]) {
        actualMentionName = mentionWithPunctuation.substring(0, mentionWithPunctuation.length - punctuationMatch[0].length);
        punctuation = punctuationMatch[0];
      }

      if (actualMentionName.toLowerCase() === aiTrigger.toLowerCase()) {
        return (
          <React.Fragment key={index}>
            <strong className="text-accent font-semibold cursor-pointer hover:underline">
              @{actualMentionName}
            </strong>
            {punctuation}
          </React.Fragment>
        );
      }

      const mentionedMember = members?.find(m => m.name.toLowerCase() === actualMentionName.toLowerCase());
      if (mentionedMember) {
        const isSelfMention = currentUserId && mentionedMember.uid === currentUserId;
        return (
          <React.Fragment key={index}>
            <strong
              className={cn(
                "font-semibold cursor-pointer hover:underline",
                isSelfMention ? "text-secondary-foreground bg-primary/20 px-1 rounded" : "text-primary"
              )}
            >
              @{actualMentionName}
            </strong>
            {punctuation}
          </React.Fragment>
        );
      }
    }
    return word; 
  });
}


export default function StudyRoomDetailPage({ params }: { params: { id: string } }) {
  const { id: roomId } = params;

  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const pathname = router.pathname; // usePathname is a hook, router.pathname for string
  const { toast } = useToast();

  const [roomData, setRoomData] = useState<RoomData | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoadingRoom, setIsLoadingRoom] = useState(true);
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  const [isSummarizing, setIsSummarizing] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionPopupRef = useRef<HTMLDivElement>(null);

  const [showMentionSuggestions, setShowMentionSuggestions] = useState(false);
  const [mentionSuggestions, setMentionSuggestions] = useState<MentionSuggestion[]>([]);
  const [activeSuggestionIndex, setActiveSuggestionIndex] = useState(0);

  const [whiteboardPaths, setWhiteboardPaths] = useState<WhiteboardPath[]>([]);
  const [activeTool, setActiveTool] = useState<'pen' | 'eraser'>('pen');
  const [activeColor, setActiveColor] = useState('#000000');
  const [activeStrokeWidth, setActiveStrokeWidth] = useState(3);
  const [canvasBgColor, setCanvasBgColor] = useState('hsl(var(--card))');

  const predefinedColors = ['#000000', '#FF0000', '#0000FF', '#008000', '#FFFF00', '#FFA500'];
  const strokeWidths = [1, 3, 5, 8, 12];

  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');


  const currentUserProfile = useMemo(() => {
    if (!user) return null;
    return {
      uid: user.uid,
      name: user.displayName || user.email?.split('@')[0] || 'Anonymous',
      avatar: user.photoURL || `https://placehold.co/40x40.png&text=${(user.displayName || user.email?.split('@')[0] || 'A').substring(0,1).toUpperCase()}`
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

    const unsubscribeRoom = onSnapshot(roomDocRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = { id: docSnap.id, ...docSnap.data() } as RoomData;
        setRoomData(data);
        setWhiteboardPaths(data.whiteboardDrawing || []);
        
        if (typeof window !== 'undefined') {
          const cardBg = getComputedStyle(document.documentElement).getPropertyValue('--card').trim();
          const hslMatch = cardBg.match(/(\d+)\s+(\d+)%\s+(\d+)%/);
          if (hslMatch) {
            setCanvasBgColor(`hsl(${hslMatch[1]}, ${hslMatch[2]}%, ${hslMatch[3]}%)`);
          } else {
            setCanvasBgColor('white'); 
          }
        }


      } else {
        toast({ title: "Room Not Found", variant: "destructive" });
        router.push('/study-rooms');
      }
      setIsLoadingRoom(false);
    }, (error) => {
      console.error(`Error fetching room data for ${roomId}: `, error);
      toast({ title: "Error", description: "Could not load room data.", variant: "destructive" });
      router.push('/study-rooms');
      setIsLoadingRoom(false);
    });

    const messagesColRef = collection(db, 'studyRooms', roomId, 'messages');
    const q = query(messagesColRef, orderBy('timestamp', 'asc'));
    const unsubscribeMessages = onSnapshot(q, (snapshot) => {
        const fetchedMessages: Message[] = [];
        snapshot.forEach(doc => {
            const data = doc.data();
            fetchedMessages.push({ id: doc.id, ...data } as Message)
        });
        setMessages(fetchedMessages);
    }, (error) => {
        console.error(`Firestore onSnapshot error for messages in room ${roomId}: `, error);
        toast({ title: "Error", description: "Could not load messages.", variant: "destructive" });
    });

    return () => {
      unsubscribeRoom();
      unsubscribeMessages();
    };
  }, [roomId, authLoading, currentUserProfile, router, pathname, toast, user]); 

  useEffect(() => {
    if (messagesEndRef.current && !editingMessageId) { // Don't auto-scroll if editing
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" }), 100);
    }
  }, [messages, editingMessageId]);

  const handleNewMessageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const MENTION_TRIGGER = '@';
    const COMMAND_TRIGGER = '/';
    const value = e.target.value;
    setNewMessage(value);

    const currentCursorPosition = e.target.selectionStart;
    if (currentCursorPosition === null) {
        setShowMentionSuggestions(false);
        return;
    }
    
    let wordStartIndex = value.lastIndexOf(' ', currentCursorPosition - 1) + 1;
    if (currentCursorPosition > 0 && value[currentCursorPosition -1] !== ' ') { 
    } else if (currentCursorPosition > 0 && value[currentCursorPosition -1] === ' ') { 
        wordStartIndex = currentCursorPosition;
    }
    
    const currentWord = value.substring(wordStartIndex, currentCursorPosition);

    if (value.startsWith(COMMAND_TRIGGER)) {
        const query = value.substring(1);
        const commandSugs: CommandSuggestionType[] = slashCommands
            .filter(cmd => cmd.name.toLowerCase().startsWith(query.toLowerCase()))
            .map(cmd => ({ ...cmd, type: 'command' as const, uid: `cmd_${cmd.name}` }));
        
        if (commandSugs.length > 0) {
            setMentionSuggestions(commandSugs.slice(0, 7));
            setShowMentionSuggestions(true);
            setActiveSuggestionIndex(0);
        } else {
            setShowMentionSuggestions(false);
        }
    } else if (currentWord.startsWith(MENTION_TRIGGER)) {
        const query = currentWord.substring(1);
        const memberSugs: UserSuggestionType[] = roomData?.members
            .filter(member => member.name.toLowerCase().startsWith(query.toLowerCase()))
            .map(member => ({ ...member, type: 'member' as const })) || [];
        
        let allSugs: (UserSuggestionType | AISuggestionType)[] = [];
        if (aiHelpSuggestionItem.name.toLowerCase().startsWith(query.toLowerCase())) {
            allSugs.push(aiHelpSuggestionItem);
        }
        allSugs = [...allSugs, ...memberSugs];
        
        const uniqueSuggestions = Array.from(new Map(allSugs.map(item => [item.name, item])).values());

        if (uniqueSuggestions.length > 0) {
            setMentionSuggestions(uniqueSuggestions.slice(0, 7) as MentionSuggestion[]);
            setShowMentionSuggestions(true);
            setActiveSuggestionIndex(0);
        } else {
            setShowMentionSuggestions(false);
        }
    } else {
        setShowMentionSuggestions(false);
    }
};
  
  const handleSelectSuggestion = (suggestion: MentionSuggestion) => {
    let textToInsert = '';
    if (suggestion.type === 'command') {
        textToInsert = `/${suggestion.name} `;
    } else if (suggestion.type === 'ai' || suggestion.type === 'member') {
        const words = newMessage.split(' ');
        words.pop();
        textToInsert = words.join(' ') + (words.length > 0 ? ' ' : '') + `@${suggestion.name} `;
    }
    setNewMessage(textToInsert);
    setShowMentionSuggestions(false);
    setTimeout(() => inputRef.current?.focus(), 0); 
  };
  
  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (showMentionSuggestions && mentionSuggestions.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActiveSuggestionIndex(prev => (prev + 1) % mentionSuggestions.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActiveSuggestionIndex(prev => (prev - 1 + mentionSuggestions.length) % mentionSuggestions.length);
      } else if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        if (mentionSuggestions[activeSuggestionIndex]) {
          handleSelectSuggestion(mentionSuggestions[activeSuggestionIndex]);
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        setShowMentionSuggestions(false);
      }
    }
  };

  useEffect(() => {
    if (showMentionSuggestions && suggestionPopupRef.current && mentionSuggestions.length > 0 && activeSuggestionIndex < mentionSuggestions.length) {
      const activeElement = suggestionPopupRef.current.children[activeSuggestionIndex] as HTMLElement;
      if (activeElement) {
        activeElement.scrollIntoView({ block: 'nearest', inline: 'nearest' });
      }
    }
  }, [activeSuggestionIndex, showMentionSuggestions, mentionSuggestions]);
  
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (suggestionPopupRef.current && !suggestionPopupRef.current.contains(event.target as Node) &&
          inputRef.current && !inputRef.current.contains(event.target as Node) ) {
        setShowMentionSuggestions(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [suggestionPopupRef, inputRef]);


  const handleSendMessage = async (e: FormEvent) => {
    e.preventDefault();
    if (!currentUserProfile || newMessage.trim() === '' || !roomId || isSendingMessage || !roomData) return;

    const trimmedMessage = newMessage.trim();
    setIsSendingMessage(true);
    setNewMessage(''); 
    setShowMentionSuggestions(false); 

    const messagesColRef = collection(db, 'studyRooms', roomId, 'messages');
    
    let isCommandProcessed = false;

    if (trimmedMessage.toLowerCase() === '/summarize') {
      isCommandProcessed = true;
      setIsSummarizing(true);
      const summarizingMessageData = {
        userId: AI_USER_ID, userName: AI_USER_NAME, userAvatar: AI_AVATAR_URL,
        text: "Summarizing the recent chat discussion...",
        timestamp: serverTimestamp() as Timestamp
      };
      try {
        await addDoc(messagesColRef, summarizingMessageData);
        const recentMessages = messages.slice(-30).map(msg => ({ userName: msg.userName, text: msg.text }));
        const summaryResult = await getChatSummary({ messages: recentMessages });
        const aiSummaryMessageData = {
          userId: AI_USER_ID, userName: AI_USER_NAME, userAvatar: AI_AVATAR_URL,
          text: `Summary:\n${summaryResult.summary}`,
          timestamp: serverTimestamp() as Timestamp
        };
        await addDoc(messagesColRef, aiSummaryMessageData);
      } catch (summaryError) {
        console.error("Error getting chat summary:", summaryError);
        const aiErrorMessageData = {
          userId: AI_USER_ID, userName: AI_USER_NAME, userAvatar: AI_AVATAR_URL,
          text: "Sorry, I had trouble summarizing the chat. Please try again.",
          timestamp: serverTimestamp() as Timestamp
        };
        await addDoc(messagesColRef, aiErrorMessageData).catch(e => console.error("Error posting summary error msg:", e));
      } finally {
        setIsSummarizing(false);
        setIsSendingMessage(false);
      }
    }
    else if (trimmedMessage.toLowerCase().startsWith('/suggestion ') || trimmedMessage.toLowerCase().startsWith('/ask ')) {
      isCommandProcessed = true;
      const command = trimmedMessage.toLowerCase().startsWith('/suggestion') ? '/suggestion' : '/ask';
      const aiQuery = trimmedMessage.substring(command.length).trim();

      if (aiQuery) {
        const thinkingMessageData = {
          userId: AI_USER_ID, userName: AI_USER_NAME, userAvatar: AI_AVATAR_URL,
          text: "AI Helper is thinking...",
          timestamp: serverTimestamp() as Timestamp
        };
        const thinkingDocRef = await addDoc(messagesColRef, thinkingMessageData);
        try {
          const aiResult = await getAIChatResponse({ userQuery: aiQuery });
          await updateDoc(thinkingDocRef, {
            text: aiResult.aiResponse,
            timestamp: serverTimestamp()
          });
        } catch (aiError) {
          console.error("Error getting AI response for command:", aiError);
          await updateDoc(thinkingDocRef, {
            text: "Sorry, I had trouble processing that. Please try again or rephrase.",
            timestamp: serverTimestamp()
          });
        }
      } else {
        const emptyQueryMessage = {
            userId: AI_USER_ID, userName: AI_USER_NAME, userAvatar: AI_AVATAR_URL,
            text: `You used ${command} but didn't provide a question. How can I help?`,
            timestamp: serverTimestamp() as Timestamp
        };
        await addDoc(messagesColRef, emptyQueryMessage);
      }
       setIsSendingMessage(false);
    }

    if (isCommandProcessed) return; 

    const userMessageData = {
      userId: currentUserProfile.uid,
      userName: currentUserProfile.name,
      userAvatar: currentUserProfile.avatar,
      text: trimmedMessage,
      timestamp: serverTimestamp() as Timestamp 
    };

    try {
      await addDoc(messagesColRef, userMessageData);

      if (trimmedMessage.toLowerCase().includes(`@${AI_MENTION_NAME}`)) {
        const aiQueryMatch = trimmedMessage.match(new RegExp(`@${AI_MENTION_NAME}\\s*(.*)`, 'i'));
        const aiQuery = aiQueryMatch && aiQueryMatch[1] ? aiQueryMatch[1].trim() : "User mentioned me.";

        if (aiQuery) {
          const thinkingMessageData = {
            userId: AI_USER_ID, userName: AI_USER_NAME, userAvatar: AI_AVATAR_URL,
            text: "AI Helper is thinking...",
            timestamp: serverTimestamp() as Timestamp
          };
          const thinkingDocRef = await addDoc(messagesColRef, thinkingMessageData);
          try {
            const aiResult = await getAIChatResponse({ userQuery: aiQuery });
            await updateDoc(thinkingDocRef, {
              text: aiResult.aiResponse,
              timestamp: serverTimestamp()
            });
          } catch (aiError) {
            console.error("Error getting AI response for @mention:", aiError);
             await updateDoc(thinkingDocRef, {
              text: "Sorry, I had trouble processing that. Please try again or rephrase your question.",
              timestamp: serverTimestamp()
            });
          }
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
    
    const memberToRemove = roomData.members.find(m => m.uid === currentUserProfile.uid);
    
    if (memberToRemove) {
        const roomDocRef = doc(db, 'studyRooms', roomId);
        const roomUpdateData: any = { 
            members: arrayRemove(memberToRemove),
            memberCount: Math.max(0, (roomData.memberCount || 1) - 1),
            updatedAt: serverTimestamp()
        };
        try {
            await updateDoc(roomDocRef, roomUpdateData);
        } catch (error) {
            console.error("Error updating members list on leave: ", error);
        }
    }

    toast({ title: "Navigating Away", description: `You have left ${roomData.name}.`});
    router.push('/study-rooms');
  };


  const handleDrawOnWhiteboard = useCallback(async (newPath: WhiteboardPath) => {
    if (!user || !roomId) return;
    const roomDocRef = doc(db, 'studyRooms', roomId);
    try {
      await updateDoc(roomDocRef, {
        whiteboardDrawing: arrayUnion(newPath),
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      console.error("Error saving whiteboard path: ", error);
      toast({ title: "Whiteboard Error", description: "Could not save drawing.", variant: "destructive" });
    }
  }, [user, roomId, toast]);

  const handleClearWhiteboard = async () => {
    if (!user || !roomId) return;
    const roomDocRef = doc(db, 'studyRooms', roomId);
    try {
      await updateDoc(roomDocRef, {
        whiteboardDrawing: [],
        updatedAt: serverTimestamp()
      });
      toast({ title: "Whiteboard Cleared" });
    } catch (error) {
      console.error("Error clearing whiteboard: ", error);
      toast({ title: "Whiteboard Error", description: "Could not clear whiteboard.", variant: "destructive" });
    }
  };

  const handleStartEdit = (message: Message) => {
    if (message.userId !== AI_USER_ID) {
      setEditingMessageId(message.id);
      setEditText(message.text);
    }
  };

  const handleCancelEdit = () => {
    setEditingMessageId(null);
    setEditText('');
  };

  const handleSaveEdit = async () => {
    if (!editingMessageId || !currentUserProfile || !roomId) return;
    if (editText.trim() === '') {
      toast({ title: "Cannot save empty message", variant: "destructive" });
      // Or, treat as delete? For now, just prevent empty save.
      return;
    }

    setIsSendingMessage(true); // Reuse for loading state
    const messageRef = doc(db, 'studyRooms', roomId, 'messages', editingMessageId);
    try {
      await updateDoc(messageRef, {
        text: editText,
        updatedAt: serverTimestamp()
      });
      toast({ title: "Message Updated" });
      handleCancelEdit();
    } catch (error) {
      console.error("Error updating message:", error);
      toast({ title: "Error Updating Message", description: (error as FirebaseError).message, variant: "destructive" });
    } finally {
      setIsSendingMessage(false);
    }
  };

  const handleDeleteMessage = async (messageId: string) => {
    if (!currentUserProfile || !roomId) return;

    setIsSendingMessage(true); // Reuse for loading state
    const messageRef = doc(db, 'studyRooms', roomId, 'messages', messageId);
    try {
      await deleteDoc(messageRef);
      toast({ title: "Message Deleted" });
    } catch (error) {
      console.error("Error deleting message:", error);
      toast({ title: "Error Deleting Message", description: (error as FirebaseError).message, variant: "destructive" });
    } finally {
      setIsSendingMessage(false);
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
            <Button variant="destructive" size="sm" onClick={handleLeaveRoom}>
              <LogOut className="mr-2 h-4 w-4" /> Leave
            </Button>
          </div>
        }
      />

      <Tabs defaultValue="chat" className="flex-grow flex flex-col mt-1 overflow-hidden">
        <TabsList className="grid w-full grid-cols-2 mb-4 flex-shrink-0">
          <TabsTrigger value="whiteboard">Whiteboard</TabsTrigger>
          <TabsTrigger value="chat">Chat</TabsTrigger>
        </TabsList>

        <TabsContent value="whiteboard" className="flex-grow m-0 flex flex-col overflow-hidden">
          <Card className="flex-grow flex flex-col overflow-hidden">
             <CardHeader className="sticky top-0 bg-background z-10 flex flex-col sm:flex-row items-center justify-between py-2 px-3 flex-shrink-0 border-b gap-2">
                <CardTitle className="flex items-center text-lg"><Presentation className="mr-2 h-5 w-5 text-primary" /> Shared Whiteboard</CardTitle>
                <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                    <Button variant={activeTool === 'pen' ? 'secondary' : 'ghost'} size="sm" onClick={() => setActiveTool('pen')} title="Pen">
                        <PenTool className="h-4 w-4" /> <span className="ml-1 sm:hidden">Pen</span>
                    </Button>
                    <Button variant={activeTool === 'eraser' ? 'secondary' : 'ghost'} size="sm" onClick={() => setActiveTool('eraser')} title="Eraser">
                        <Eraser className="h-4 w-4" /> <span className="ml-1 sm:hidden">Eraser</span>
                    </Button>
                    <Separator orientation="vertical" className="h-6 mx-1" />
                    {predefinedColors.map(color => (
                        <Button 
                            key={color} 
                            variant="outline" 
                            size="icon" 
                            className={cn("h-7 w-7 p-0 border-2", activeColor === color && activeTool === 'pen' ? 'border-primary ring-2 ring-primary' : 'border-transparent')}
                            style={{ backgroundColor: color }}
                            onClick={() => setActiveColor(color)}
                            title={`Color: ${color}`}
                            aria-label={`Select color ${color}`}
                        />
                    ))}
                    <Separator orientation="vertical" className="h-6 mx-1" />
                    {strokeWidths.map(width => (
                         <Button 
                            key={`stroke-${width}`}
                            variant={activeStrokeWidth === width ? 'secondary' : 'ghost'}
                            size="sm"
                            className="p-1.5"
                            onClick={() => setActiveStrokeWidth(width)}
                            title={`Stroke width: ${width}px`}
                         >
                            <GripVertical className="h-4 w-4 opacity-50" style={{transform: `scaleY(${width/5 * 0.8 + 0.4})`}}/>
                            <span className="text-xs ml-0.5 tabular-nums">{width}</span>
                         </Button>
                    ))}
                     <Separator orientation="vertical" className="h-6 mx-1" />
                    <Button variant="destructive" size="sm" onClick={handleClearWhiteboard} title="Clear Whiteboard">
                        <Trash2 className="h-4 w-4" /> <span className="ml-1 sm:hidden">Clear</span>
                    </Button>
                </div>
            </CardHeader>
            <CardContent className="flex-grow p-0 m-0 relative overflow-hidden">
               <div className="w-full h-full bg-card"> 
                <WhiteboardCanvas
                    paths={whiteboardPaths}
                    onDrawPath={handleDrawOnWhiteboard}
                    activeColor={activeColor}
                    activeStrokeWidth={activeStrokeWidth}
                    activeTool={activeTool}
                    canvasBackgroundColorCssVar="--card" 
                />
               </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="chat" className="flex-grow flex flex-col m-0 overflow-hidden">
           <Card className="flex flex-col flex-grow overflow-hidden min-h-[85vh]">
            <CardHeader className="sticky top-0 bg-background z-10 py-3 px-4 flex-shrink-0 border-b">
              <CardTitle className="flex items-center text-lg"><MessageSquare className="mr-2 h-5 w-5" /> Chat</CardTitle>
            </CardHeader>
            
            <div className="flex-grow min-h-0 relative border-t border-b overflow-y-auto max-h-[calc(85vh-120px)]"> {/* Adjust max-height */}
                <div ref={messagesContainerRef} className="absolute inset-0 overflow-y-auto">
                    <div className="p-2 md:p-4 space-y-1"> {/* Reduced space-y for compactness */}
                        {messages.map((msg) => {
                          const isCurrentUserMessage = msg.userId === currentUserProfile?.uid;
                          const isAIMessage = msg.userId === AI_USER_ID;
                          const isEditingThisMessage = editingMessageId === msg.id;

                          return (
                            <div key={msg.id} className={`group relative flex items-end gap-2 py-1 ${isCurrentUserMessage ? 'justify-end' : 'justify-start'}`}>
                              {!isCurrentUserMessage && (
                                <Avatar className="h-8 w-8 self-start">
                                  <AvatarImage src={isAIMessage ? AI_AVATAR_URL : (msg.userAvatar || 'https://placehold.co/40x40.png')} data-ai-hint={isAIMessage ? "robot bot" : "user avatar"} />
                                  <AvatarFallback>{isAIMessage ? 'AI' : (msg.userName?.substring(0,1).toUpperCase() || 'A')}</AvatarFallback>
                                </Avatar>
                              )}
                              <div className={cn(
                                  "max-w-[75%] p-2 md:p-3 rounded-lg shadow-sm flex flex-col",
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
                                        {msg.updatedAt && <span className="text-xs italic ml-1">(edited)</span>}
                                    </span>
                                </p>
                                {isEditingThisMessage ? (
                                  <div className="mt-1 space-y-2">
                                    <Textarea 
                                      value={editText} 
                                      onChange={(e) => setEditText(e.target.value)} 
                                      className="text-sm bg-background text-foreground min-h-[60px]"
                                      rows={2}
                                    />
                                    <div className="flex gap-2 justify-end">
                                      <Button size="sm" onClick={handleSaveEdit} disabled={isSendingMessage}>
                                        {isSendingMessage ? <Loader2 className="h-4 w-4 animate-spin"/> : "Save"}
                                      </Button>
                                      <Button size="sm" variant="ghost" onClick={handleCancelEdit} disabled={isSendingMessage}>Cancel</Button>
                                    </div>
                                  </div>
                                ) : (
                                  <p className="text-sm break-words">
                                    {renderMessageWithTags(msg.text, roomData?.members, AI_MENTION_NAME, currentUserProfile?.uid)}
                                  </p>
                                )}
                              </div>
                              {isCurrentUserMessage && !isEditingThisMessage && msg.userId !== AI_USER_ID && (
                                <div className={cn(
                                  "absolute flex gap-0.5 transition-opacity opacity-0 group-hover:opacity-100",
                                  isCurrentUserMessage ? "left-0 -translate-x-full mr-1" : "right-0 translate-x-full ml-1",
                                  "top-1/2 -translate-y-1/2" 
                                )}>
                                  <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-foreground" onClick={() => handleStartEdit(msg)} title="Edit message">
                                    <Edit2 className="h-3.5 w-3.5" />
                                  </Button>
                                  <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                      <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-destructive" title="Delete message">
                                        <Trash2 className="h-3.5 w-3.5" />
                                      </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                      <AlertDialogHeader>
                                        <AlertDialogTitle>Delete Message?</AlertDialogTitle>
                                        <AlertDialogDescription>
                                          This action cannot be undone. Are you sure you want to permanently delete this message?
                                        </AlertDialogDescription>
                                      </AlertDialogHeader>
                                      <AlertDialogFooter>
                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                        <AlertDialogAction
                                          className={cn("bg-destructive text-destructive-foreground hover:bg-destructive/90")}
                                          onClick={() => handleDeleteMessage(msg.id)}>
                                          Delete
                                        </AlertDialogAction>
                                      </AlertDialogFooter>
                                    </AlertDialogContent>
                                  </AlertDialog>
                                </div>
                              )}
                              {isCurrentUserMessage && (
                                <Avatar className="h-8 w-8 self-start">
                                  <AvatarImage src={msg.userAvatar || 'https://placehold.co/40x40.png'} data-ai-hint="user avatar" />
                                  <AvatarFallback>{msg.userName?.substring(0,1).toUpperCase() || 'U'}</AvatarFallback>
                                </Avatar>
                              )}
                            </div>
                          );
                        })}
                        {messages.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">No messages yet. Start the conversation or ask <code className="bg-muted px-1 py-0.5 rounded">@{AI_MENTION_NAME}</code> for assistance!</p>}
                        <div ref={messagesEndRef} />
                    </div>
                </div>
            </div>


            <CardContent className="sticky bottom-0 bg-background z-10 pt-2 md:pt-4 pb-2 flex-shrink-0 border-t">
              <form onSubmit={handleSendMessage} className="flex gap-2 relative">
                {showMentionSuggestions && mentionSuggestions.length > 0 && (
                  <div
                    ref={suggestionPopupRef}
                    className="absolute bottom-full left-0 right-0 mb-1 max-h-48 overflow-y-auto rounded-md border bg-popover p-1 shadow-lg z-50"
                  >
                    {mentionSuggestions.map((sug, index) => (
                      <Button
                        key={sug.uid} 
                        variant="ghost"
                        size="sm"
                        className={cn(
                          "w-full justify-start text-left h-auto py-1.5 px-2 text-sm",
                          index === activeSuggestionIndex && "bg-accent text-accent-foreground"
                        )}
                        onClick={() => handleSelectSuggestion(sug)}
                        onMouseEnter={() => setActiveSuggestionIndex(index)}
                        type="button" 
                      >
                        {sug.type === 'command' ? (
                            <>
                                <Command className="mr-2 h-4 w-4 text-muted-foreground" /> {sug.displayName} <span className="ml-2 text-xs text-muted-foreground/70">{sug.description}</span>
                            </>
                        ) : sug.type === 'ai' ? (
                          <>
                            {sug.icon ? <sug.icon className="mr-2 h-4 w-4 text-accent" /> : <Bot className="mr-2 h-4 w-4 text-accent" />}
                            {sug.displayName}
                          </>
                        ) : (
                          <>
                            <Avatar className="h-5 w-5 mr-2">
                              <AvatarImage src={(sug as UserSuggestionType).avatar || 'https://placehold.co/40x40.png'} alt={(sug as UserSuggestionType).name} />
                              <AvatarFallback>{(sug as UserSuggestionType).name.substring(0,1).toUpperCase()}</AvatarFallback>
                            </Avatar>
                            {sug.name}
                          </>
                        )}
                      </Button>
                    ))}
                  </div>
                )}
                <Input
                  ref={inputRef}
                  value={newMessage}
                  onChange={handleNewMessageChange} 
                  onKeyDown={handleInputKeyDown} 
                  placeholder={`Type message, /command, or @mention...`}
                  className="flex-grow"
                  disabled={!currentUserProfile || isSendingMessage || isSummarizing || !!editingMessageId}
                  autoComplete="off"
                />
                <Button type="submit" size="icon" aria-label="Send message" disabled={!currentUserProfile || isSendingMessage || isSummarizing || newMessage.trim() === '' || !!editingMessageId}>
                  {(isSendingMessage || isSummarizing) ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}


    