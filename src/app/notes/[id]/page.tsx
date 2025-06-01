
'use client';

import PageHeader from '@/components/common/page-header';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BookOpen, Save, Loader2, Share2, AlertCircle } from 'lucide-react';
import { useState, useEffect, use } from 'react'; // Added 'use'
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebase';
import { doc, getDoc, setDoc, addDoc, collection, serverTimestamp, Timestamp } from 'firebase/firestore';
import { useRouter, usePathname } from 'next/navigation';

interface NoteData {
  title: string;
  content: string;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

// Updated params type to be a Promise
export default function NoteDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params); // Resolve the promise
  const noteId = resolvedParams.id; // Access id from the resolved object

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [isLoading, setIsLoading] = useState(true); // For note data loading
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (authLoading) return; // Wait for auth state
    if (!user) {
      toast({ title: "Authentication Required", description: "Please log in to view or edit notes.", variant: "destructive" });
      router.push(`/login?redirect=${pathname}`); // Use pathname for accurate redirect
      return;
    }

    // If user is authenticated, proceed to fetch or initialize note
    if (noteId && noteId !== 'new') {
      setIsLoading(true);
      const noteDocRef = doc(db, 'users', user.uid, 'notes', noteId);
      getDoc(noteDocRef).then(docSnap => {
        if (docSnap.exists()) {
          const noteData = docSnap.data() as NoteData;
          setTitle(noteData.title);
          setContent(noteData.content);
        } else {
          toast({ title: "Note not found", description: "The requested note does not exist or you don't have access.", variant: "destructive" });
          router.push('/notes'); // Redirect to notes list if specific note not found
        }
        setIsLoading(false);
      }).catch(error => {
        console.error("Error fetching note: ", error);
        toast({ title: "Error fetching note", description: error.message, variant: "destructive" });
        setIsLoading(false);
        router.push('/notes');
      });
    } else if (noteId === 'new') {
      setTitle('');
      setContent('');
      setIsLoading(false);
    } else {
      // Invalid noteId case, though unlikely if routing is correct
      router.push('/notes');
      setIsLoading(false);
    }
  }, [noteId, user, authLoading, toast, router, pathname]);

  const handleSaveNote = async () => {
    if (!user) {
      toast({ title: "Authentication Error", description: "You must be logged in to save notes.", variant: "destructive" });
      return;
    }
    if (!title.trim() && !content.trim()) {
      toast({ title: "Cannot Save Empty Note", description: "Please add a title or some content.", variant: "destructive" });
      return;
    }

    setIsSaving(true);
    const noteDataToSave = {
      title: title.trim() || "Untitled Note", 
      content: content,
      updatedAt: serverTimestamp(),
    };

    try {
      if (noteId === 'new') {
        const notesCollectionRef = collection(db, 'users', user.uid, 'notes');
        const newNoteRef = await addDoc(notesCollectionRef, {
          ...noteDataToSave,
          createdAt: serverTimestamp(),
        });
        toast({ title: "Note Created!", description: `"${noteDataToSave.title}" has been saved successfully.` });
        router.push(`/notes/${newNoteRef.id}`); 
      } else {
        const noteDocRef = doc(db, 'users', user.uid, 'notes', noteId);
        await setDoc(noteDocRef, noteDataToSave, { merge: true }); 
        toast({ title: "Note Updated!", description: `"${noteDataToSave.title}" has been updated successfully.` });
      }
    } catch (error) {
      console.error('Error saving note:', error);
      toast({ title: "Error Saving Note", description: (error as Error).message, variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  if (authLoading || isLoading) { // Show loader if auth is loading OR note data is loading
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }
  
  if (!user && !authLoading) { // This handles the case where auth is done, user is null
    return (
        <div className="flex flex-col items-center justify-center min-h-screen p-4 text-center">
            <AlertCircle className="w-16 h-16 text-destructive mb-4" />
            <h1 className="text-2xl font-bold mb-2">Access Denied</h1>
            <p className="text-muted-foreground mb-4">You need to be logged in to manage notes.</p>
            <Button onClick={() => router.push(`/login?redirect=${pathname}`)}>Go to Login</Button>
        </div>
    );
  }

  // User is authenticated, proceed to render note editor
  return (
    <div className="space-y-6">
      <PageHeader
        title={noteId === 'new' ? 'Create New Note' : title || 'Edit Note'}
        description={noteId === 'new' ? 'Craft your new note here.' : `Last updated: ${new Date().toLocaleDateString()}`} // Consider showing actual updatedAt
        actions={
          <div className="flex flex-col sm:flex-row gap-2">
            <Button onClick={handleSaveNote} disabled={isSaving}>
              {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              {isSaving ? 'Saving...' : (noteId === 'new' ? 'Save Note' : 'Update Note')}
            </Button>
            {noteId !== 'new' && (
             <Link href={`/notes/${noteId}/generate-flashcards`} passHref>
                <Button variant="outline">
                    <BookOpen className="mr-2 h-4 w-4" /> Flashcards/Quiz
                </Button>
            </Link>
            )}
          </div>
        }
      />

      <Card>
        <CardContent className="pt-6 space-y-4">
          <div>
            <Input
              placeholder="Note Title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="text-2xl font-headline font-semibold border-0 shadow-none focus-visible:ring-0 px-1 h-auto"
              disabled={isSaving}
            />
          </div>
          <div>
            <Textarea
              placeholder="Start writing your note here... Markdown is supported!"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="min-h-[400px] md:min-h-[500px] text-base leading-relaxed focus-visible:ring-primary/50"
              rows={15}
              disabled={isSaving}
            />
          </div>
        </CardContent>
         <CardContent className="border-t pt-4 pb-4">
            <p className="text-sm text-muted-foreground">
                Use Markdown for formatting (e.g., `# Heading`, `**bold**`, `*italic*`, `- list item`).
            </p>
        </CardContent>
      </Card>
      
      {noteId !== 'new' && (
        <Card>
            <CardHeader>
                <CardTitle>Note Actions</CardTitle>
            </CardHeader>
            <CardContent className="flex gap-2">
                <Button variant="outline" onClick={() => toast({ title: "Not implemented", description: "Sharing feature coming soon!"})}>
                    <Share2 className="mr-2 h-4 w-4" /> Share
                </Button>
            </CardContent>
        </Card>
      )}
    </div>
  );
}
