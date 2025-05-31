
'use client';

import PageHeader from '@/components/common/page-header';
import { Button, buttonVariants } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { PlusCircle, Edit3, Trash2, BookOpen, Loader2 } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { useState, useEffect } from 'react';
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
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebase';
import { collection, query, where, onSnapshot, doc, deleteDoc, orderBy, Timestamp } from 'firebase/firestore';

interface Note {
  id: string;
  title: string;
  content: string; // Full content for excerpt generation
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

function generateExcerpt(content: string, maxLength = 100) {
    if (!content) return '';
    // Remove markdown for cleaner excerpt
    const plainText = content.replace(/#+\s*|[*_`~()>+-]|\[(.*?)\]\(.*?\)/g, '');
    if (plainText.length <= maxLength) return plainText;
    return plainText.substring(0, maxLength) + '...';
}


export default function NotesPage() {
  const [notes, setNotes] = useState<Note[]>([]);
  const { toast } = useToast();
  const { user, loading: authLoading } = useAuth();
  const [isLoadingNotes, setIsLoadingNotes] = useState(true);

  useEffect(() => {
    if (authLoading) return; // Wait for auth state to be determined
    if (!user) {
      setNotes([]);
      setIsLoadingNotes(false);
      // Optionally, redirect to login or show a message
      // toast({ title: "Please log in", description: "You need to be logged in to see your notes.", variant: "destructive"});
      return;
    }

    setIsLoadingNotes(true);
    const notesCollectionRef = collection(db, 'users', user.uid, 'notes');
    const q = query(notesCollectionRef, orderBy('updatedAt', 'desc'));

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const fetchedNotes: Note[] = [];
      querySnapshot.forEach((doc) => {
        fetchedNotes.push({ id: doc.id, ...doc.data() } as Note);
      });
      setNotes(fetchedNotes);
      setIsLoadingNotes(false);
    }, (error) => {
      console.error("Error fetching notes: ", error);
      toast({ title: "Error fetching notes", description: error.message, variant: "destructive" });
      setIsLoadingNotes(false);
    });

    return () => unsubscribe(); // Cleanup listener on component unmount
  }, [user, authLoading, toast]);

  const handleDeleteNote = async (noteId: string, noteTitle: string) => {
    if (!user) {
        toast({ title: "Authentication Error", description: "You must be logged in to delete notes.", variant: "destructive"});
        return;
    }
    try {
      await deleteDoc(doc(db, 'users', user.uid, 'notes', noteId));
      toast({
        title: "Note Deleted",
        description: `"${noteTitle}" has been removed.`,
      });
      // Notes state will update via onSnapshot
    } catch (error) {
      console.error("Error deleting note: ", error);
      toast({ title: "Error Deleting Note", description: (error as Error).message, variant: "destructive"});
    }
  };

  if (authLoading || isLoadingNotes) {
    return (
      <div className="space-y-6">
        <PageHeader title="My Notes" description="Organize your thoughts, ideas, and study materials." />
        <div className="flex justify-center items-center py-10">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  if (!user && !authLoading) {
     return (
      <div className="space-y-6">
        <PageHeader
          title="My Notes"
          description="Organize your thoughts, ideas, and study materials."
        />
         <Card className="text-center">
          <CardHeader>
             <Image src="https://placehold.co/300x200.png" alt="Login required illustration" width={300} height={200} className="mx-auto mb-4 rounded-md" data-ai-hint="lock login secure" />
            <CardTitle>Login Required</CardTitle>
            <CardDescription>Please log in to create and manage your notes.</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/login" passHref>
              <Button>Login</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }


  return (
    <div className="space-y-6">
      <PageHeader
        title="My Notes"
        description="Organize your thoughts, ideas, and study materials."
        actions={
          <Link href="/notes/new" passHref>
            <Button>
              <PlusCircle className="mr-2 h-4 w-4" /> New Note
            </Button>
          </Link>
        }
      />

      {notes.length === 0 ? (
        <Card className="text-center">
          <CardHeader>
            <Image src="https://placehold.co/300x200.png" alt="Empty notes illustration" width={300} height={200} className="mx-auto mb-4 rounded-md" data-ai-hint="notebook empty" />
            <CardTitle>No Notes Yet!</CardTitle>
            <CardDescription>Start creating notes to organize your learning.</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/notes/new" passHref>
              <Button>
                <PlusCircle className="mr-2 h-4 w-4" /> Create Your First Note
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
          {notes.map((note) => (
            <Card key={note.id} className="flex flex-col">
              <CardHeader>
                <CardTitle className="hover:text-primary transition-colors">
                  <Link href={`/notes/${note.id}`}>{note.title || "Untitled Note"}</Link>
                </CardTitle>
                <CardDescription>{note.updatedAt?.toDate().toLocaleDateString() || 'N/A'}</CardDescription>
              </CardHeader>
              <CardContent className="flex-grow">
                <p className="text-sm text-muted-foreground line-clamp-3">{generateExcerpt(note.content)}</p>
              </CardContent>
              <CardContent className="border-t pt-4 flex flex-wrap gap-2 justify-between items-center">
                <Link href={`/notes/${note.id}/generate-flashcards`} passHref>
                  <Button variant="outline" size="sm">
                    <BookOpen className="mr-2 h-4 w-4" /> Flashcards/Quiz
                  </Button>
                </Link>
                <div className="flex gap-2">
                  <Link href={`/notes/${note.id}`} passHref>
                    <Button variant="ghost" size="icon" aria-label="Edit note">
                      <Edit3 className="h-4 w-4" />
                    </Button>
                  </Link>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" aria-label="Delete note">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This action cannot be undone. This will permanently delete the note titled "{note.title || "Untitled Note"}".
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleDeleteNote(note.id, note.title || "Untitled Note")} className={buttonVariants({ variant: "destructive" })}>
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
