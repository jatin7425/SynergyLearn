
'use client';

import PageHeader from '@/components/common/page-header';
import { Button, buttonVariants } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { PlusCircle, Edit3, Trash2, BookOpen, Loader2, AlertCircle, Link as LinkIcon } from 'lucide-react'; // Added LinkIcon
import Link from 'next/link';
import Image from 'next/image';
import { useState, useEffect, FormEvent } from 'react'; // Added FormEvent
import { useRouter, usePathname } from 'next/navigation';
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
import { collection, query, onSnapshot, doc, deleteDoc, orderBy, Timestamp, getDoc } from 'firebase/firestore'; // Added getDoc
import { Input } from '@/components/ui/input'; // Added Input

interface Note {
  id: string;
  title: string;
  content: string; 
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

function generateExcerpt(content: string, maxLength = 100) {
    if (!content) return '';
    const plainText = content.replace(/#+\s*|[*_`~()>+-]|\[(.*?)\]\(.*?\)/g, '');
    if (plainText.length <= maxLength) return plainText;
    return plainText.substring(0, maxLength) + '...';
}


export default function NotesPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const { toast } = useToast();

  const [notes, setNotes] = useState<Note[]>([]);
  const [isLoadingNotes, setIsLoadingNotes] = useState(true);
  const [sharedLinkIdInput, setSharedLinkIdInput] = useState('');
  const [isAccessingSharedNote, setIsAccessingSharedNote] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      toast({ title: "Authentication Required", description: "Please log in to view your notes.", variant: "destructive" });
      router.push(`/login?redirect=${pathname}`);
      return;
    }

    if (user) {
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

      return () => unsubscribe(); 
    } else if (!authLoading && !user) {
        setNotes([]);
        setIsLoadingNotes(false);
    }
  }, [user, authLoading, router, pathname, toast]);

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
    } catch (error) {
      console.error("Error deleting note: ", error);
      toast({ title: "Error Deleting Note", description: (error as Error).message, variant: "destructive"});
    }
  };

  const handleAccessSharedNote = async (e: FormEvent) => {
    e.preventDefault();
    if (!sharedLinkIdInput.trim()) {
        toast({ title: "Link ID Required", description: "Please enter a share link ID.", variant: "default" });
        return;
    }
    if (!user) {
        toast({ title: "Authentication Required", variant: "destructive" });
        return;
    }
    setIsAccessingSharedNote(true);
    try {
        const linkDocRef = doc(db, 'sharedNoteLinks', sharedLinkIdInput.trim());
        const linkDocSnap = await getDoc(linkDocRef);

        if (linkDocSnap.exists()) {
            const linkData = linkDocSnap.data();
            if (linkData.noteId && linkData.ownerUid) {
                router.push(`/notes/${linkData.noteId}?owner=${linkData.ownerUid}`);
                setSharedLinkIdInput(''); // Clear input on success
            } else {
                toast({ title: "Invalid Link Data", description: "The share link is missing necessary information.", variant: "destructive" });
            }
        } else {
            toast({ title: "Invalid Link ID", description: "The share link ID was not found or is invalid.", variant: "destructive" });
        }
    } catch (error) {
        console.error("Error accessing shared note:", error);
        toast({ title: "Access Error", description: "Could not access the shared note.", variant: "destructive" });
    } finally {
        setIsAccessingSharedNote(false);
    }
  };

  if (authLoading || (user && isLoadingNotes)) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }
  
  if (!user && !authLoading) { 
     return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4 text-center">
        <AlertCircle className="w-16 h-16 text-destructive mb-4" />
        <h1 className="text-2xl font-bold mb-2">Access Denied</h1>
        <p className="text-muted-foreground mb-4">You need to be logged in to view your notes.</p>
        <Button onClick={() => router.push(`/login?redirect=${pathname}`)}>Go to Login</Button>
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

      <Card>
        <CardHeader>
            <CardTitle className="flex items-center"><LinkIcon className="mr-2 h-5 w-5 text-primary" /> Access a Shared Note</CardTitle>
            <CardDescription>Enter a share link ID provided by another user to view their note.</CardDescription>
        </CardHeader>
        <CardContent>
            <form onSubmit={handleAccessSharedNote} className="flex flex-col sm:flex-row gap-2">
                <Input
                    type="text"
                    placeholder="Enter Share Link ID..."
                    value={sharedLinkIdInput}
                    onChange={(e) => setSharedLinkIdInput(e.target.value)}
                    className="flex-grow"
                    disabled={isAccessingSharedNote}
                />
                <Button type="submit" disabled={isAccessingSharedNote || !sharedLinkIdInput.trim()}>
                    {isAccessingSharedNote ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    Access Note
                </Button>
            </form>
        </CardContent>
      </Card>

      {notes.length === 0 && !isLoadingNotes ? ( // Check isLoadingNotes here
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
        <>
          {isLoadingNotes && notes.length === 0 && ( // Show loader only if notes are still loading and list is empty
            <div className="flex justify-center items-center py-10">
              <Loader2 className="h-10 w-10 animate-spin text-primary" />
            </div>
          )}
          {!isLoadingNotes && notes.length > 0 && (
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
        </>
      )}
    </div>
  );
}
