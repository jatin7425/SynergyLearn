
'use client';

import PageHeader from '@/components/common/page-header';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BookOpen, Save, Loader2, Share2, AlertCircle, UserPlus, Trash2, Eye, Search } from 'lucide-react';
import { useState, useEffect, use, type FormEvent } from 'react';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebase';
import { doc, getDoc, setDoc, addDoc, collection, serverTimestamp, Timestamp, updateDoc, query, where, getDocs, limit, orderBy } from 'firebase/firestore';
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
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';

interface NoteData {
  title: string;
  content: string;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
  sharedWith?: { [key: string]: 'read' }; 
  ownerUid?: string;
  id?: string; // Added id for consistency
}

interface UserProfile {
  id: string; // This is the user's UID (document ID in userProfiles)
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string | null;
  createdAt?: Timestamp; // Added for ordering
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
  const [emailSearchQuery, setEmailSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<UserProfile[]>([]);
  const [isSearchingUsers, setIsSearchingUsers] = useState(false);
  const [selectedUserForSharing, setSelectedUserForSharing] = useState<UserProfile | null>(null);
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
      } else if (noteIdFromPath === 'new' && !ownerUidFromQuery) { 
        setTitle('');
        setContent('');
        setNoteData({ title: '', content: '', ownerUid: user.uid, sharedWith: {} });
        setIsLoading(false);
      } else { 
         router.push('/notes');
      }
      return;
    }
    
    if (noteIdFromPath === 'new' && ownerUidFromQuery) {
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
          const completeNoteData = { ...fetchedData, ownerUid: effectiveOwnerUid, id: docSnap.id };
          setNoteData(completeNoteData);
          setTitle(completeNoteData.title);
          setContent(completeNoteData.content);

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
      ownerUid: user.uid, 
    };

    try {
      if (noteIdFromPath === 'new') {
        noteDataToSave.createdAt = serverTimestamp();
        noteDataToSave.sharedWith = {}; 
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

  const searchUsersByEmail = async (searchTerm: string) => {
    if (!searchTerm.trim() || !user) {
      setSearchResults([]);
      return;
    }
    setIsSearchingUsers(true);
    const normalizedSearchTerm = searchTerm.toLowerCase();
  
    try {
      const usersRef = collection(db, 'userProfiles');
      // Fetch a pool of users (e.g., latest 100).
      // For a production app, this might need pagination or a more sophisticated search index.
      // Ordering by 'createdAt' helps find newer users; adjust if other ordering is better.
      const q = query(usersRef, orderBy('createdAt', 'desc'), limit(100)); 
      
      const querySnapshot = await getDocs(q);
      const candidates: UserProfile[] = [];
      querySnapshot.forEach((doc) => {
        // Exclude current user from search results
        if (doc.id !== user.uid) { 
          candidates.push({ id: doc.id, ...doc.data() } as UserProfile);
        }
      });
  
      // Client-side "contains" filtering for email and displayName
      const filteredUsers = candidates.filter(profile =>
        (profile.email && profile.email.toLowerCase().includes(normalizedSearchTerm)) ||
        (profile.displayName && profile.displayName.toLowerCase().includes(normalizedSearchTerm))
      ).slice(0, 7); // Show top 7 matches from filtered results
  
      setSearchResults(filteredUsers);
  
      if (filteredUsers.length === 0 && candidates.length > 0 && searchTerm.length > 2) {
          toast({
              title: "No exact matches in recent users",
              description: "Try a different search term. Search is performed on recently registered users.",
              variant: "default"
          })
      }
  
    } catch (err) {
      console.error("Error searching users:", err);
      setSearchResults([]);
      toast({ title: "Search Error", description: "Could not perform user search.", variant: "destructive"});
    } finally {
      setIsSearchingUsers(false);
    }
  };

  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      if (emailSearchQuery.length > 2) { // Start searching after 2 characters
        searchUsersByEmail(emailSearchQuery);
      } else {
        setSearchResults([]);
      }
    }, 500); // Debounce search
    return () => clearTimeout(debounceTimer);
  }, [emailSearchQuery, user]); // Added user to dependency array for searchUsersByEmail

  const handleSelectUserForSharing = (profile: UserProfile) => {
    setSelectedUserForSharing(profile);
    setEmailSearchQuery(profile.email); // Fill input with selected user's email
    setSearchResults([]); // Clear other suggestions
  };

  const handleShareNote = async (e: FormEvent) => {
    e.preventDefault();
    if (!user || !noteIdFromPath || noteIdFromPath === 'new' || !isOwner || !noteData) {
      toast({ title: "Cannot Share", description: "Note must be saved and you must be the owner.", variant: "destructive" });
      return;
    }
    if (!selectedUserForSharing) {
      toast({ title: "No Recipient Selected", description: "Please search and select a user to share with.", variant: "destructive" });
      return;
    }
    const recipientUidToShare = selectedUserForSharing.uid;
    if (recipientUidToShare === user.uid) {
        toast({ title: "Cannot share with yourself", variant: "destructive" });
        return;
    }

    setIsProcessingShare(true);
    const noteDocRef = doc(db, 'users', user.uid, 'notes', noteIdFromPath);
    const currentSharedWith = noteData.sharedWith || {};
    const updatedSharedWith = {
      ...currentSharedWith,
      [recipientUidToShare]: 'read' as 'read'
    };

    try {
      await updateDoc(noteDocRef, { sharedWith: updatedSharedWith, updatedAt: serverTimestamp() });
      setNoteData(prev => prev ? { ...prev, sharedWith: updatedSharedWith } : null);
      toast({ title: "Note Shared!", description: `Successfully shared with ${selectedUserForSharing.displayName} (${selectedUserForSharing.email})` });
      setSelectedUserForSharing(null);
      setEmailSearchQuery('');
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
    
    // Create a new object for sharedWith excluding the recipient
    const updatedSharedWith = { ...noteData.sharedWith };
    delete updatedSharedWith[recipientUidToUnshare];

    try {
      await updateDoc(noteDocRef, { sharedWith: updatedSharedWith, updatedAt: serverTimestamp() });
      setNoteData(prev => prev ? { ...prev, sharedWith: updatedSharedWith } : null);
      // Find user displayName for toast
      const unsharedUserProfileRef = doc(db, 'userProfiles', recipientUidToUnshare);
      const unsharedUserSnap = await getDoc(unsharedUserProfileRef);
      const unsharedUserName = unsharedUserSnap.exists() ? unsharedUserSnap.data().displayName : `UID: ${recipientUidToUnshare}`;
      toast({ title: "Unshared Successfully", description: `${unsharedUserName} removed from shared list.` });
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
          isSharedView ? `Shared by: ${ownerUidFromQuery || 'Unknown'}. Read-only.` :
          (noteIdFromPath === 'new' ? 'Craft your new note here.' : `Last updated: ${noteData?.updatedAt?.toDate().toLocaleDateString() || 'N/A'}`)
        }
        actions={
          <div className="flex flex-col sm:flex-row gap-2">
            {isOwner && noteIdFromPath !== 'new' && (
              <Dialog open={showShareDialog} onOpenChange={(open) => {
                  setShowShareDialog(open);
                  if (!open) { // Reset share dialog state on close
                    setEmailSearchQuery('');
                    setSearchResults([]);
                    setSelectedUserForSharing(null);
                  }
                }}
              >
                <DialogTrigger asChild>
                  <Button variant="outline"><Share2 className="mr-2 h-4 w-4" /> Share</Button>
                </DialogTrigger>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle>Share Note: {noteData?.title}</DialogTitle>
                    <DialogDescription>Search user by email or name to share this note with (read-only access).</DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleShareNote} className="space-y-3">
                    <div>
                      <Label htmlFor="share-email">Recipient Search</Label>
                      <div className="relative">
                        <Input 
                          id="share-email" 
                          value={emailSearchQuery} 
                          onChange={(e) => setEmailSearchQuery(e.target.value)}
                          placeholder="Search by email or name..."
                          disabled={isProcessingShare || !!selectedUserForSharing}
                          autoComplete="off"
                        />
                         {selectedUserForSharing && (
                            <Button 
                                type="button" 
                                variant="ghost" 
                                size="sm" 
                                className="absolute right-1 top-1/2 -translate-y-1/2 h-7 px-2"
                                onClick={() => { setSelectedUserForSharing(null); setEmailSearchQuery(''); }}
                            >
                                Clear
                            </Button>
                        )}
                      </div>
                      {isSearchingUsers && <Loader2 className="h-4 w-4 animate-spin mt-2" />}
                      {!isSearchingUsers && searchResults.length > 0 && !selectedUserForSharing && (
                        <ScrollArea className="mt-2 h-[120px] w-full rounded-md border p-2">
                          {searchResults.map(profile => (
                            <div 
                              key={profile.id} 
                              className="flex items-center p-2 hover:bg-accent rounded-md cursor-pointer"
                              onClick={() => handleSelectUserForSharing(profile)}
                            >
                              <Avatar className="h-7 w-7 mr-2">
                                <AvatarImage src={profile.photoURL || undefined} alt={profile.displayName} data-ai-hint="user avatar"/>
                                <AvatarFallback>{profile.displayName?.substring(0,1).toUpperCase() || profile.email.substring(0,1).toUpperCase()}</AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="text-sm font-medium">{profile.displayName}</p>
                                <p className="text-xs text-muted-foreground">{profile.email}</p>
                              </div>
                            </div>
                          ))}
                        </ScrollArea>
                      )}
                      {!isSearchingUsers && searchResults.length === 0 && emailSearchQuery.length > 2 && !selectedUserForSharing && (
                        <p className="text-xs text-muted-foreground mt-1">No users found matching "{emailSearchQuery}".</p>
                      )}
                    </div>
                    <Button type="submit" className="w-full" disabled={isProcessingShare || !selectedUserForSharing}>
                      {isProcessingShare ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <UserPlus className="mr-2 h-4 w-4"/>}
                       Add Recipient
                    </Button>
                  </form>
                  {noteData?.sharedWith && Object.keys(noteData.sharedWith).length > 0 && (
                    <div className="mt-4 space-y-2">
                      <h4 className="font-medium text-sm">Currently shared with:</h4>
                      <ScrollArea className="max-h-32">
                        <ul className="text-sm space-y-1">
                          {Object.entries(noteData.sharedWith).map(([uid, permission]) => (
                            <li key={uid} className="flex justify-between items-center p-1.5 bg-muted/50 rounded hover:bg-muted">
                              {/* Placeholder for fetching user details by UID for display */}
                              <span className="truncate text-xs" title={uid}>User UID: {uid} ({permission})</span>
                              <Button 
                                 variant="ghost" 
                                 size="icon" 
                                 className="text-destructive hover:text-destructive h-6 w-6"
                                 onClick={() => handleUnshareNote(uid)}
                                 disabled={isProcessingShare}
                                 title="Unshare"
                              >
                                 <Trash2 className="h-3.5 w-3.5"/>
                              </Button>
                            </li>
                          ))}
                        </ul>
                      </ScrollArea>
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
    </div>
  );
}
