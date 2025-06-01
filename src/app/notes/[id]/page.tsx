
'use client';

import PageHeader from '@/components/common/page-header';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BookOpen, Save, Loader2, Share2, AlertCircle, UserPlus, Trash2, Eye } from 'lucide-react';
import { useState, useEffect, use, type FormEvent } from 'react';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebase';
import { doc, getDoc, setDoc, addDoc, collection, serverTimestamp, Timestamp, updateDoc,FieldValue } from 'firebase/firestore';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
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
import { Label } from '@/components/ui/label';

interface NoteData {
  title: string;
  content: string;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
  sharedWith?: { [key: string]: 'read' }; // Map of recipientUID: permissionLevel
  ownerUid?: string; // Explicit owner UID, useful for shared notes
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

  const [showShareDialog, setShowShareDialog] = useState(false);
  const [shareRecipientUid, setShareRecipientUid] = useState('');
  const [isProcessingShare, setIsProcessingShare] = useState(false);

  const effectiveOwnerUid = ownerUidFromQuery || user?.uid;
  const isOwner = user?.uid === effectiveOwnerUid;
  const isSharedView = !isOwner && !!ownerUidFromQuery;


  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      toast({ title: "Authentication Required", description: "Please log in.", variant: "destructive" });
      router.push(`/login?redirect=${pathname}${ownerUidFromQuery ? `?owner=${ownerUidFromQuery}` : ''}`);
      return;
    }

    if (!noteIdFromPath || !effectiveOwnerUid) {
      if (noteIdFromPath !== 'new') {
        toast({ title: "Invalid Note", description: "Note ID or owner information is missing.", variant: "destructive" });
        router.push('/notes');
      } else if (noteIdFromPath === 'new' && !ownerUidFromQuery) { // Creating a new note, current user is owner
        setTitle('');
        setContent('');
        setNoteData({ title: '', content: '', ownerUid: user.uid, sharedWith: {} });
        setIsLoading(false);
      } else { // 'new' with ownerUidFromQuery - not a valid scenario for creating
         router.push('/notes');
      }
      return;
    }
    
    if (noteIdFromPath === 'new' && ownerUidFromQuery) {
        // Cannot create a new note for another owner via this page
        toast({ title: "Invalid Action", description: "Cannot create a new note for another user this way.", variant: "destructive" });
        router.push('/notes');
        return;
    }


    if (noteIdFromPath && noteIdFromPath !== 'new' && effectiveOwnerUid) {
      setIsLoading(true);
      const noteDocRef = doc(db, 'users', effectiveOwnerUid, 'notes', noteIdFromPath);
      getDoc(noteDocRef).then(docSnap => {
        if (docSnap.exists()) {
          const fetchedData = docSnap.data() as NoteData;
          // Ensure ownerUid is part of the fetched data if not already
          const completeNoteData = { ...fetchedData, ownerUid: effectiveOwnerUid, id: docSnap.id };
          setNoteData(completeNoteData);
          setTitle(completeNoteData.title);
          setContent(completeNoteData.content);

          // Security check: if it's supposed to be a shared view, verify user has permission
          if (isSharedView && user && !(completeNoteData.sharedWith && completeNoteData.sharedWith[user.uid] === 'read')) {
             toast({ title: "Access Denied", description: "You do not have permission to view this shared note.", variant: "destructive" });
             router.push('/notes');
             return;
          }

        } else {
          toast({ title: "Note not found", description: "The requested note does not exist or you don't have access.", variant: "destructive" });
          router.push('/notes');
        }
        setIsLoading(false);
      }).catch(error => {
        console.error("Error fetching note: ", error);
        toast({ title: "Error fetching note", description: error.message, variant: "destructive" });
        setIsLoading(false);
        router.push('/notes');
      });
    } else if (noteIdFromPath === 'new' && !ownerUidFromQuery && user) {
      // Case for creating a new note, current user is owner
      setTitle('');
      setContent('');
      setNoteData({ title: '', content: '', ownerUid: user.uid, sharedWith: {} });
      setIsLoading(false);
    }
  }, [noteIdFromPath, user, authLoading, toast, router, pathname, effectiveOwnerUid, ownerUidFromQuery, isSharedView]);

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
      ownerUid: user.uid, // Always set current user as owner on save/create
    };

    try {
      if (noteIdFromPath === 'new') {
        noteDataToSave.createdAt = serverTimestamp();
        noteDataToSave.sharedWith = {}; // Initialize sharedWith for new notes
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

  const handleShareNote = async (e: FormEvent) => {
    e.preventDefault();
    if (!user || !noteIdFromPath || noteIdFromPath === 'new' || !isOwner || !noteData) {
      toast({ title: "Cannot Share", description: "Note must be saved and you must be the owner.", variant: "destructive" });
      return;
    }
    if (!shareRecipientUid.trim()) {
      toast({ title: "Recipient UID Required", variant: "destructive" });
      return;
    }
    if (shareRecipientUid.trim() === user.uid) {
        toast({ title: "Cannot share with yourself", variant: "destructive" });
        return;
    }

    setIsProcessingShare(true);
    const noteDocRef = doc(db, 'users', user.uid, 'notes', noteIdFromPath);
    const currentSharedWith = noteData.sharedWith || {};
    const updatedSharedWith = {
      ...currentSharedWith,
      [shareRecipientUid.trim()]: 'read' as 'read'
    };

    try {
      await updateDoc(noteDocRef, { sharedWith: updatedSharedWith, updatedAt: serverTimestamp() });
      setNoteData(prev => prev ? { ...prev, sharedWith: updatedSharedWith } : null);
      toast({ title: "Note Shared!", description: `Successfully shared with UID: ${shareRecipientUid.trim()}` });
      setShareRecipientUid('');
      // setShowShareDialog(false); // Keep dialog open to see updated list or share with more
    } catch (error) {
      console.error("Error sharing note: ", error);
      toast({ title: "Sharing Failed", description: (error as Error).message, variant: "destructive" });
    } finally {
      setIsProcessingShare(false);
    }
  };

  const handleUnshareNote = async (recipientUidToUnshare: string) => {
     if (!user || !noteIdFromPath || noteIdFromPath === 'new' || !isOwner || !noteData?.sharedWith) {
      toast({ title: "Cannot Unshare", variant: "destructive" });
      return;
    }
    setIsProcessingShare(true);
    const noteDocRef = doc(db, 'users', user.uid, 'notes', noteIdFromPath);
    
    const {[recipientUidToUnshare]: _, ...remainingSharedWith} = noteData.sharedWith;

    try {
      await updateDoc(noteDocRef, { sharedWith: remainingSharedWith, updatedAt: serverTimestamp() });
      setNoteData(prev => prev ? { ...prev, sharedWith: remainingSharedWith } : null);
      toast({ title: "Unshared Successfully", description: `UID: ${recipientUidToUnshare} removed from shared list.` });
    } catch (error) {
      console.error("Error unsharing note: ", error);
      toast({ title: "Unsharing Failed", description: (error as Error).message, variant: "destructive" });
    } finally {
      setIsProcessingShare(false);
    }
  }


  if (authLoading || isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  if (!user && !authLoading) {
     const redirectPath = ownerUidFromQuery 
        ? `/login?redirect=${pathname}%3Fowner%3D${ownerUidFromQuery}` 
        : `/login?redirect=${pathname}`;
    return (
        <div className="flex flex-col items-center justify-center min-h-screen p-4 text-center">
            <AlertCircle className="w-16 h-16 text-destructive mb-4" />
            <h1 className="text-2xl font-bold mb-2">Access Denied</h1>
            <Button onClick={() => router.push(redirectPath)}>Go to Login</Button>
        </div>
    );
  }
  
  if (!noteData && noteIdFromPath !== 'new') { // Note data failed to load for an existing note
    return (
        <div className="flex flex-col items-center justify-center min-h-screen p-4 text-center">
            <AlertCircle className="w-16 h-16 text-destructive mb-4" />
            <h1 className="text-2xl font-bold mb-2">Note Not Found</h1>
            <p className="text-muted-foreground mb-4">The note you are trying to access could not be loaded.</p>
            <Button onClick={() => router.push('/notes')}>Back to Notes</Button>
        </div>
    );
  }


  const displayTitle = title || (isSharedView && noteData?.title) || (noteIdFromPath === 'new' ? 'Create New Note' : 'Edit Note');
  const displayContent = content || (isSharedView && noteData?.content) || '';


  return (
    <div className="space-y-6">
      <PageHeader
        title={displayTitle}
        description={
          isSharedView ? `Shared by: ${ownerUidFromQuery}. Read-only.` :
          (noteIdFromPath === 'new' ? 'Craft your new note here.' : `Last updated: ${noteData?.updatedAt?.toDate().toLocaleDateString() || 'N/A'}`)
        }
        actions={
          <div className="flex flex-col sm:flex-row gap-2">
            {isOwner && noteIdFromPath !== 'new' && (
              <Dialog open={showShareDialog} onOpenChange={setShowShareDialog}>
                <DialogTrigger asChild>
                  <Button variant="outline"><Share2 className="mr-2 h-4 w-4" /> Share</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Share Note: {noteData?.title}</DialogTitle>
                    <DialogDescription>Enter the User ID (UID) of the person you want to share this note with (read-only access).</DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleShareNote} className="space-y-3">
                    <div>
                      <Label htmlFor="share-uid">Recipient User ID</Label>
                      <Input 
                        id="share-uid" 
                        value={shareRecipientUid} 
                        onChange={(e) => setShareRecipientUid(e.target.value)}
                        placeholder="Enter Firebase User ID"
                        disabled={isProcessingShare}
                      />
                    </div>
                    <Button type="submit" className="w-full" disabled={isProcessingShare || !shareRecipientUid.trim()}>
                      {isProcessingShare ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <UserPlus className="mr-2 h-4 w-4"/>}
                       Add Recipient
                    </Button>
                  </form>
                  {noteData?.sharedWith && Object.keys(noteData.sharedWith).length > 0 && (
                    <div className="mt-4 space-y-2">
                      <h4 className="font-medium">Currently shared with:</h4>
                      <ul className="max-h-32 overflow-y-auto text-sm space-y-1">
                        {Object.entries(noteData.sharedWith).map(([uid, permission]) => (
                          <li key={uid} className="flex justify-between items-center p-1.5 bg-muted/50 rounded">
                            <span className="truncate" title={uid}>{uid} ({permission})</span>
                            <Button 
                               variant="ghost" 
                               size="sm" 
                               className="text-destructive hover:text-destructive p-1 h-auto"
                               onClick={() => handleUnshareNote(uid)}
                               disabled={isProcessingShare}
                               title="Unshare"
                            >
                               <Trash2 className="h-3.5 w-3.5"/>
                            </Button>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                   <DialogFooter className="mt-3">
                        <DialogClose asChild><Button type="button" variant="outline">Close</Button></DialogClose>
                   </DialogFooter>
                </DialogContent>
              </Dialog>
            )}
            {isOwner && (
              <Button onClick={handleSaveNote} disabled={isSaving}>
                {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                {isSaving ? 'Saving...' : (noteIdFromPath === 'new' ? 'Save Note' : 'Update Note')}
              </Button>
            )}
            {noteIdFromPath !== 'new' && (
             <Link 
                href={`/notes/${noteIdFromPath}/generate-flashcards${effectiveOwnerUid ? `?owner=${effectiveOwnerUid}` : ''}`} 
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
              value={displayTitle}
              onChange={(e) => setTitle(e.target.value)}
              className="text-2xl font-headline font-semibold border-0 shadow-none focus-visible:ring-0 px-1 h-auto disabled:bg-transparent disabled:opacity-100 disabled:cursor-default"
              disabled={isSaving || !isOwner}
              readOnly={!isOwner}
            />
          </div>
          <div>
            <Textarea
              placeholder="Start writing your note here... Markdown is supported!"
              value={displayContent}
              onChange={(e) => setContent(e.target.value)}
              className="min-h-[400px] md:min-h-[500px] text-base leading-relaxed focus-visible:ring-primary/50 disabled:bg-muted/30 disabled:opacity-100 disabled:cursor-default"
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
    </div>
  );
}
