
'use client';

import PageHeader from '@/components/common/page-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BookOpen, FileQuestion, Eye, Loader2, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import Image from 'next/image';
import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebase';
import { collection, query, onSnapshot, orderBy, Timestamp } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { useRouter, usePathname } from 'next/navigation';

interface Flashcard {
  id: string;
  question: string;
  answer: string;
}

interface QuizItem {
  id: string;
  question: string;
  options: string[]; 
  correctAnswer: string; 
}
interface StudyCollection {
  id: string; // Firestore document ID
  title: string;
  flashcards: Flashcard[];
  quizzes: QuizItem[];
  sourceNoteId?: string;
  sourceNoteTitle?: string;
  createdAt: Timestamp;
}

export default function FlashcardsQuizzesPage() {
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const pathname = usePathname();

  const [collections, setCollections] = useState<StudyCollection[]>([]);
  const [isLoadingCollections, setIsLoadingCollections] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      toast({ title: "Authentication Required", description: "Please log in to view your collections.", variant: "destructive" });
      router.push(`/login?redirect=${pathname}`);
      return;
    }

    setIsLoadingCollections(true);
    const collectionsRef = collection(db, 'users', user.uid, 'studyCollections');
    const q = query(collectionsRef, orderBy('createdAt', 'desc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedCollections: StudyCollection[] = [];
      snapshot.forEach(doc => {
        fetchedCollections.push({ id: doc.id, ...doc.data() } as StudyCollection);
      });
      setCollections(fetchedCollections);
      setIsLoadingCollections(false);
    }, (error) => {
      console.error("Error fetching collections: ", error);
      toast({ title: "Error", description: "Could not fetch your collections.", variant: "destructive" });
      setIsLoadingCollections(false);
    });

    return () => unsubscribe();

  }, [user, authLoading, toast, router, pathname]);

  if (authLoading || isLoadingCollections) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  if (!user && !authLoading) { // Fallback if redirect didn't happen
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4 text-center">
        <AlertCircle className="w-16 h-16 text-destructive mb-4" />
        <h1 className="text-2xl font-bold mb-2">Access Denied</h1>
        <p className="text-muted-foreground mb-4">You need to be logged in.</p>
        <Button onClick={() => router.push(`/login?redirect=${pathname}`)}>Go to Login</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="My Flashcards & Quizzes"
        description="Review your generated and saved study materials."
        actions={
          <Link href="/ai/flashcard-generator" passHref>
            <Button>Create New Collection</Button>
          </Link>
        }
      />

      {collections.length === 0 ? (
        <Card className="text-center">
           <CardHeader>
            <Image src="https://placehold.co/300x200.png" alt="Empty flashcards illustration" width={300} height={200} className="mx-auto mb-4 rounded-md" data-ai-hint="study empty" />
            <CardTitle>No Collections Yet!</CardTitle>
            <CardDescription>Generate flashcards or quizzes from your notes, or create a custom set to start studying.</CardDescription>
          </CardHeader>
          <CardContent className="space-x-2">
            <Link href="/notes" passHref>
              <Button variant="outline">Go to Notes</Button>
            </Link>
             <Link href="/ai/flashcard-generator" passHref>
              <Button>Create Custom Set</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {collections.map((collection) => (
            <Card key={collection.id} className="flex flex-col">
              <CardHeader>
                <div className="flex items-center gap-2 mb-2">
                  {collection.flashcards.length > 0 && collection.quizzes.length > 0 
                    ? <><BookOpen className="h-5 w-5 text-primary" /><FileQuestion className="h-5 w-5 text-accent" /></>
                    : collection.flashcards.length > 0 ? <BookOpen className="h-5 w-5 text-primary" /> 
                    : <FileQuestion className="h-5 w-5 text-accent" />
                  }
                  <CardTitle>{collection.title}</CardTitle>
                </div>
                <CardDescription>
                  {collection.flashcards.length > 0 && `${collection.flashcards.length} flashcards. `}
                  {collection.quizzes.length > 0 && `${collection.quizzes.length} quiz questions. `}
                  {collection.sourceNoteId && collection.sourceNoteTitle && (
                    <>Generated from: <Link href={`/notes/${collection.sourceNoteId}`} className="text-primary hover:underline">{collection.sourceNoteTitle}</Link></>
                  )}
                  {!collection.sourceNoteId && 'Custom set.'}
                </CardDescription>
              </CardHeader>
              <CardContent className="flex-grow">
                <p className="text-sm text-muted-foreground">
                  Created on: {collection.createdAt?.toDate().toLocaleDateString() || 'N/A'}
                </p>
              </CardContent>
              <CardContent className="border-t pt-4">
                {/* This link should ideally go to a specific review page for this collection */}
                {/* For now, linking to the generator page with noteId if available, or generic generator if not */}
                <Link 
                  href={collection.sourceNoteId ? `/notes/${collection.sourceNoteId}/generate-flashcards` : `/ai/flashcard-generator?collectionId=${collection.id}`} 
                  passHref
                >
                  <Button className="w-full">
                    <Eye className="mr-2 h-4 w-4" /> View Collection (Details not implemented)
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

    