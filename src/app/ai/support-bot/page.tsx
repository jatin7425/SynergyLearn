'use client';

import React, { useState, type FormEvent, useRef, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import PageHeader from '@/components/common/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Loader2, AlertCircle, Send, UserCircle, Bot, LifeBuoy } from 'lucide-react';
import { getSupportBotResponse, type SupportBotInput, type SupportBotOutput } from '@/ai/flows/support-bot-flow';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';

interface ConversationMessage {
  id: string;
  type: 'user' | 'bot';
  text: string;
  avatar?: string;
  name: string;
}

export default function SupportBotPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const { toast } = useToast();

  const [currentQuery, setCurrentQuery] = useState('');
  const [conversation, setConversation] = useState<ConversationMessage[]>([]);
  const [isLoadingResponse, setIsLoadingResponse] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      toast({ title: "Authentication Required", description: "Please log in to use the Support Bot.", variant: "destructive" });
      router.push(`/login?redirect=${pathname}`);
    }
  }, [user, authLoading, router, pathname, toast]);
  
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [conversation]);


  const handleSubmitQuery = async (e: FormEvent) => {
    e.preventDefault();
    if (!currentQuery.trim()) {
      toast({ title: "Query is empty", description: "Please type your question.", variant: "default" });
      return;
    }
    if (!user) {
        toast({ title: "Not authenticated", variant: "destructive"});
        return;
    }

    const userMessage: ConversationMessage = {
      id: `user-${Date.now()}`,
      type: 'user',
      text: currentQuery,
      name: user.displayName || user.email?.split('@')[0] || 'You',
      avatar: user.photoURL || undefined,
    };
    setConversation(prev => [...prev, userMessage]);
    const queryToSubmit = currentQuery;
    setCurrentQuery('');
    setIsLoadingResponse(true);

    try {
      const input: SupportBotInput = { userQuery: queryToSubmit };
      const result: SupportBotOutput = await getSupportBotResponse(input);
      
      const botMessage: ConversationMessage = {
        id: `bot-${Date.now()}`,
        type: 'bot',
        text: result.botResponse,
        name: 'Support Bot',
        avatar: 'https://placehold.co/40x40/0284C7/FFFFFF.png&text=SB' // Sky-blue with white text
      };
      setConversation(prev => [...prev, botMessage]);

    } catch (error) {
      console.error('Error getting support response:', error);
      const errorMessage: ConversationMessage = {
        id: `error-${Date.now()}`,
        type: 'bot',
        text: "Sorry, I encountered an error trying to process your request. Please try again.",
        name: 'Support Bot',
        avatar: 'https://placehold.co/40x40/0284C7/FFFFFF.png&text=SB'
      };
      setConversation(prev => [...prev, errorMessage]);
      toast({ title: "Bot Error", description: "Could not get a response from the support bot.", variant: "destructive" });
    } finally {
      setIsLoadingResponse(false);
    }
  };

  if (authLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4 text-center">
        <AlertCircle className="w-16 h-16 text-destructive mb-4" />
        <h1 className="text-2xl font-bold mb-2">Access Denied</h1>
        <p className="text-muted-foreground mb-4">You need to be logged in to use the Support Bot.</p>
        <Button onClick={() => router.push(`/login?redirect=${pathname}`)}>Go to Login</Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] md:h-[calc(100vh-9rem)]"> {/* Adjust height to prevent overflow */}
      <PageHeader
        title="SynergyLearn Support Bot"
        description="Ask questions about how to use SynergyLearn. I'll answer based on the README documentation."
      />

      <Card className="flex-grow flex flex-col overflow-hidden shadow-lg">
        <CardContent className="flex-grow p-4 space-y-4 overflow-y-auto">
          {conversation.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground">
              <LifeBuoy className="w-16 h-16 mb-4 opacity-50" />
              <p className="text-lg font-medium">Welcome to the Support Bot!</p>
              <p className="text-sm">How can I help you understand SynergyLearn today?</p>
            </div>
          )}
          {conversation.map((msg) => (
            <div
              key={msg.id}
              className={cn(
                "flex items-end gap-2",
                msg.type === 'user' ? 'justify-end' : 'justify-start'
              )}
            >
              {msg.type === 'bot' && (
                <Avatar className="h-8 w-8 self-start shrink-0">
                  <AvatarImage src={msg.avatar} alt={msg.name} data-ai-hint="bot avatar" />
                  <AvatarFallback>{msg.name.substring(0,1)}</AvatarFallback>
                </Avatar>
              )}
              <div
                className={cn(
                  "max-w-[75%] p-3 rounded-lg shadow-sm",
                  msg.type === 'user'
                    ? 'bg-primary text-primary-foreground rounded-br-none'
                    : 'bg-card border rounded-bl-none'
                )}
              >
                <p className="text-xs font-semibold mb-1">{msg.name}</p>
                <p className="text-sm whitespace-pre-wrap">{msg.text}</p>
              </div>
              {msg.type === 'user' && user && (
                 <Avatar className="h-8 w-8 self-start shrink-0">
                  <AvatarImage src={user.photoURL || undefined} alt={user.displayName || 'User'} data-ai-hint="user avatar" />
                  <AvatarFallback>{(user.displayName || user.email || 'U').substring(0,1).toUpperCase()}</AvatarFallback>
                </Avatar>
              )}
            </div>
          ))}
           {isLoadingResponse && (
            <div className="flex items-end gap-2 justify-start">
              <Avatar className="h-8 w-8 self-start shrink-0">
                <AvatarImage src={'https://placehold.co/40x40/0284C7/FFFFFF.png&text=SB'} alt={'Support Bot'} data-ai-hint="bot avatar" />
                <AvatarFallback>SB</AvatarFallback>
              </Avatar>
              <div className="max-w-[75%] p-3 rounded-lg shadow-sm bg-card border">
                <p className="text-xs font-semibold mb-1">Support Bot</p>
                <div className="flex items-center space-x-2">
                  <Loader2 className="h-4 w-4 animate-spin text-primary" /> 
                  <span className="text-sm text-muted-foreground">Thinking...</span>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </CardContent>
        <CardContent className="border-t pt-4 pb-2">
          <form onSubmit={handleSubmitQuery} className="flex gap-2">
            <Input
              value={currentQuery}
              onChange={(e) => setCurrentQuery(e.target.value)}
              placeholder="Ask something like 'How do I create a new note?'"
              className="flex-grow"
              disabled={isLoadingResponse}
            />
            <Button type="submit" size="icon" aria-label="Send question" disabled={isLoadingResponse || !currentQuery.trim()}>
              {isLoadingResponse ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
