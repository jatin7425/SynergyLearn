
'use client';

import PageHeader from '@/components/common/page-header';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BookOpen, Save, Loader2, Share2, AlertCircle, LinkIcon, Trash2, ClipboardCopy, ClipboardCheck } from 'lucide-react'; // Updated icons
import { useState, useEffect, use, type FormEvent, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebase';
import { doc, getDoc, updateDoc, addDoc, collection, serverTimestamp, Timestamp, query, where, onSnapshot, deleteDoc } from 'firebase/firestore'; // Added onSnapshot, deleteDoc
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";


interface NoteData {
  title: string;
  content: string;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
  ownerUid?: string;
  id?: string;
}

interface SharedLinkData {
    id: string; // Document ID of the link itself
    noteId: string;
    ownerUid: string;
    createdAt: Timestamp;
}


export default function NoteDetailPage(props: { params: { id: string } }) {
  const resolvedParams = use(props.params);
  const noteIdFromPath = resolvedParams?.id;

  const searchParams = useSearchParams();
  const ownerUidFromQuery = searchParams.get('owner');

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [noteData, setNoteData] = useState<NoteData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const [isGeneratingLink, setIsGeneratingLink] = useState(false);
  const [activeShareLinks, setActiveShareLinks] = useState<SharedLinkData[]>([]);
  const [isLoadingLinks, setIsLoadingLinks] = useState(false);
  const [copiedLinkId, setCopiedLinkId] = useState<string | null>(null);


  const effectiveOwnerUid = ownerUidFromQuery || user?.uid;
  const isOwner = user?.uid === effectiveOwnerUid;
  const isSharedView = !isOwner && !!ownerUidFromQuery;

  const fetchNoteDetails = useCallback(async () => {
    if (!noteIdFromPath || noteIdFromPath === 'new' || !effectiveOwnerUid) {
      if (noteIdFromPath === 'new' && !ownerUidFromQuery && user) {
        setTitle('');
        setContent('');
        setNoteData({ title: '', content: '', ownerUid: user.uid });
        setIsLoading(false);
      } else if (noteIdFromPath !== 'new') {
        toast({ title: "Invalid Note", description: "Note ID or owner information is missing.", variant: "destructive" });
        router.push('/notes');
      }
      return;
    }

    setIsLoading(true);
    try {
      const noteDocRef = doc(db, 'users', effectiveOwnerUid, 'notes', noteIdFromPath);
      const docSnap = await getDoc(noteDocRef);
      if (docSnap.exists()) {
        const fetchedData = docSnap.data() as NoteData;
        const completeNoteData = { ...fetchedData, ownerUid: effectiveOwnerUid, id: docSnap.id };
        setNoteData(completeNoteData);
        setTitle(completeNoteData.title);
        setContent(completeNoteData.content);
      } else {
        toast({ title: "Note not found", description: "The requested note does not exist or you don't have access.", variant: "destructive" });
        router.push('/notes');
      }
    } catch (error) {
      console.error("Error fetching note: ", error);
      toast({ title: "Error fetching note", description: (error as Error).message, variant: "destructive" });
      router.push('/notes');
    } finally {
      setIsLoading(false);
    }
  }, [noteIdFromPath, effectiveOwnerUid, user, ownerUidFromQuery, toast, router]);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      toast({ title: "Authentication Required", description: "Please log in.", variant: "destructive" });
      const redirectPath = ownerUidFromQuery ? `${pathname}?owner=${ownerUidFromQuery}` : pathname;
      router.push(`/login?redirect=${encodeURIComponent(redirectPath)}`);
      return;
    }
    fetchNoteDetails();
  }, [noteIdFromPath, user, authLoading, ownerUidFromQuery, pathname, router, toast, fetchNoteDetails]);


  // Fetch active share links for this note if the current user is the owner
  useEffect(() => {
    if (isOwner && noteIdFromPath && noteIdFromPath !== 'new' && user) {
      setIsLoadingLinks(true);
      const linksQuery = query(
        collection(db, 'sharedNoteLinks'),
        where('noteId', '==', noteIdFromPath),
        where('ownerUid', '==', user.uid)
      );
      const unsubscribe = onSnapshot(linksQuery, (snapshot) => {
        const links: SharedLinkData[] = [];
        snapshot.forEach((doc) => {
          links.push({ id: doc.id, ...doc.data() } as SharedLinkData);
        });
        setActiveShareLinks(links);
        setIsLoadingLinks(false);
      }, (error) => {
        console.error("Error fetching share links:", error);
        toast({ title: "Error", description: "Could not fetch share links.", variant: "destructive" });
        setIsLoadingLinks(false);
      });
      return () => unsubscribe();
    } else {
      setActiveShareLinks([]); // Clear links if not owner or new note
    }
  }, [isOwner, noteIdFromPath, user, toast]);


  const handleSaveNote = async () => {
    if (!user || !noteIdFromPath) {
      toast({ title: "Authentication Error", variant: "destructive" });
      return;
    }
    if (!isOwner && noteIdFromPath !== 'new') {
        toast({ title: "Permission Denied", description: "You cannot save changes to a note you don't own.", variant: "destructive" });
        return;
    }
    if (!title.trim() && !content.trim()) {
      toast({ title: "Cannot Save Empty Note", variant: "destructive" });
      return;
    }

    setIsSaving(true);
    const noteDataToSave: Partial<NoteData> = {
      title: title.trim() || "Untitled Note",
      content: content,
      updatedAt: serverTimestamp(),
      ownerUid: user.uid, 
    };

    try {
      if (noteIdFromPath === 'new') {
        noteDataToSave.createdAt = serverTimestamp();
        const notesCollectionRef = collection(db, 'users', user.uid, 'notes');
        const newNoteRef = await addDoc(notesCollectionRef, noteDataToSave);
        toast({ title: "Note Created!", description: `"${noteDataToSave.title}" has been saved.` });
        router.push(`/notes/${newNoteRef.id}`);
      } else {
        const noteDocRef = doc(db, 'users', user.uid, 'notes', noteIdFromPath);
        await updateDoc(noteDocRef, noteDataToSave);
        toast({ title: "Note Updated!", description: `"${noteDataToSave.title}" has been updated.` });
      }
    } catch (error) {
      console.error('Error saving note:', error);
      toast({ title: "Error Saving Note", description: (error as Error).message, variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const handleGenerateShareLink = async () => {
    if (!user || !noteIdFromPath || noteIdFromPath === 'new' || !isOwner) {
      toast({ title: "Cannot Generate Link", description: "Note must be saved and you must be the owner.", variant: "destructive" });
      return;
    }
    setIsGeneratingLink(true);
    try {
      const linkData = {
        noteId: noteIdFromPath,
        ownerUid: user.uid,
        createdAt: serverTimestamp(),
      };
      const newLinkRef = await addDoc(collection(db, 'sharedNoteLinks'), linkData);
      toast({ title: "Share Link Generated!", description: `Link ID: ${newLinkRef.id}. Share this ID.` });
      // The onSnapshot listener for activeShareLinks will update the UI automatically.
    } catch (error) {
      console.error("Error generating share link:", error);
      toast({ title: "Link Generation Failed", description: (error as Error).message, variant: "destructive" });
    } finally {
      setIsGeneratingLink(false);
    }
  };

  const handleRevokeShareLink = async (linkId: string) => {
    if (!user || !isOwner) return;
    try {
      await deleteDoc(doc(db, 'sharedNoteLinks', linkId));
      toast({ title: "Link Revoked", description: `Share link ${linkId} has been removed.` });
    } catch (error) {
      console.error("Error revoking share link:", error);
      toast({ title: "Link Revocation Failed", description: (error as Error).message, variant: "destructive" });
    }
  };

  const copyToClipboard = (text: string, linkId: string) => {
    navigator.clipboard.writeText(text).then(() => {
        setCopiedLinkId(linkId);
        toast({ title: "Link ID Copied!", description: `ID ${linkId} copied to clipboard.` });
        setTimeout(() => setCopiedLinkId(null), 2000);
    }).catch(err => {
        console.error('Failed to copy text: ', err);
        toast({ title: "Copy Failed", description: "Could not copy to clipboard.", variant: "destructive" });
    });
  };


  if (authLoading || isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  if (!user && !authLoading) {
     const redirectPath = ownerUidFromQuery ? `${pathname}?owner=${ownerUidFromQuery}` : pathname;
    return (
        <div className="flex flex-col items-center justify-center min-h-screen p-4 text-center">
            <AlertCircle className="w-16 h-16 text-destructive mb-4" />
            <h1 className="text-2xl font-bold mb-2">Access Denied</h1>
            <Button onClick={() => router.push(`/login?redirect=${encodeURIComponent(redirectPath)}`)}>Go to Login</Button>
        </div>
    );
  }
  
  if (!noteData && noteIdFromPath !== 'new') { 
    return (
        <div className="flex flex-col items-center justify-center min-h-screen p-4 text-center">
            <AlertCircle className="w-16 h-16 text-destructive mb-4" />
            <h1 className="text-2xl font-bold mb-2">Note Not Found</h1>
            <p className="text-muted-foreground mb-4">The note you are trying to access could not be loaded.</p>
            <Button onClick={() => router.push('/notes')}>Back to Notes</Button>
        </div>
    );
  }

  const displayTitleForPage = title || (isSharedView && noteData?.title) || (noteIdFromPath === 'new' ? 'Create New Note' : 'Edit Note');
  const displayContentForPage = content || (isSharedView && noteData?.content) || '';

  return (
    <div className="space-y-6">
      <PageHeader
        title={displayTitleForPage}
        description={
          isSharedView && noteData ? `Shared by: ${noteData.ownerUid || 'Unknown'}. Read-only.` :
          (noteIdFromPath === 'new' ? 'Craft your new note here.' : `Last updated: ${noteData?.updatedAt?.toDate().toLocaleDateString() || 'N/A'}`)
        }
        actions={
          <div className="flex flex-col sm:flex-row gap-2">
            {isOwner && (
              <Button onClick={handleSaveNote} disabled={isSaving}>
                {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                {isSaving ? 'Saving...' : (noteIdFromPath === 'new' ? 'Save Note' : 'Update Note')}
              </Button>
            )}
            {noteIdFromPath !== 'new' && (
             <Link 
                href={`/notes/${noteIdFromPath}/generate-flashcards${effectiveOwnerUid && effectiveOwnerUid !== user?.uid ? `?owner=${effectiveOwnerUid}` : ''}`} 
                passHref
             >
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
              className={cn(
                "text-2xl font-headline font-semibold border-0 shadow-none focus-visible:ring-0 px-1 h-auto",
                (isSaving || !isOwner) && "disabled:bg-transparent disabled:opacity-100 disabled:cursor-default"
              )}
              disabled={isSaving || !isOwner}
              readOnly={!isOwner}
            />
          </div>
          <div>
            <Textarea
              placeholder="Start writing your note here... Markdown is supported!"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className={cn(
                "min-h-[400px] md:min-h-[500px] text-base leading-relaxed focus-visible:ring-primary/50",
                (isSaving || !isOwner) && "disabled:bg-muted/30 disabled:opacity-100 disabled:cursor-default"
              )}
              rows={15}
              disabled={isSaving || !isOwner}
              readOnly={!isOwner}
            />
          </div>
        </CardContent>
         <CardContent className="border-t pt-4 pb-4">
            <p className="text-sm text-muted-foreground">
                {isOwner ? "Use Markdown for formatting (e.g., `# Heading`, `**bold**`, `*italic*`, `- list item`)." : "This note is shared with you in read-only mode."}
            </p>
        </CardContent>
      </Card>

      {isOwner && noteIdFromPath !== 'new' && (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center"><LinkIcon className="mr-2 h-5 w-5 text-primary" /> Shareable Links</CardTitle>
                <CardDescription>Generate and manage unique link IDs to share this note (read-only).</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <Button onClick={handleGenerateShareLink} disabled={isGeneratingLink}>
                    {isGeneratingLink ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <LinkIcon className="mr-2 h-4 w-4" />}
                    Generate New Share Link ID
                </Button>
                {isLoadingLinks && <div className="flex justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>}
                {!isLoadingLinks && activeShareLinks.length === 0 && <p className="text-sm text-muted-foreground">No active share links for this note.</p>}
                {!isLoadingLinks && activeShareLinks.length > 0 && (
                    <div className="space-y-2">
                        <h4 className="text-sm font-medium">Active Link IDs:</h4>
                        <ul className="list-disc list-inside space-y-1 pl-2 max-h-40 overflow-y-auto">
                            {activeShareLinks.map(link => (
                                <li key={link.id} className="text-sm flex items-center justify-between group">
                                    <span className="font-mono bg-muted px-1.5 py-0.5 rounded text-xs">{link.id}</span>
                                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => copyToClipboard(link.id, link.id)} title="Copy Link ID">
                                            {copiedLinkId === link.id ? <ClipboardCheck className="h-4 w-4 text-green-500"/> : <ClipboardCopy className="h-4 w-4"/>}
                                        </Button>
                                        <AlertDialog>
                                            <AlertDialogTrigger asChild>
                                                <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" title="Revoke Link">
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </AlertDialogTrigger>
                                            <AlertDialogContent>
                                                <AlertDialogHeader>
                                                    <AlertDialogTitle>Revoke Share Link?</AlertDialogTitle>
                                                    <AlertDialogDescription>
                                                        Are you sure you want to revoke this share link ID: <code className="bg-muted px-1 rounded">{link.id}</code>? Users with this ID will no longer be able to access the note. This action cannot be undone.
                                                    </AlertDialogDescription>
                                                </AlertDialogHeader>
                                                <AlertDialogFooter>
                                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                    <AlertDialogAction
                                                        className={cn(Button({variant: "destructive"}))}
                                                        onClick={() => handleRevokeShareLink(link.id)}
                                                    >
                                                        Revoke Link
                                                    </AlertDialogAction>
                                                </AlertDialogFooter>
                                            </AlertDialogContent>
                                        </AlertDialog>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
            </CardContent>
        </Card>
      )}
    </div>
  );
}
