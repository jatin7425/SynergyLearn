
'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import PageHeader from '@/components/common/page-header';
import { Button, buttonVariants } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Zap, ChevronLeft, ChevronRight, RotateCcw, BookOpen, AlertCircle, CheckCircle, XCircle, Trash2, Edit3 } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { db } from '@/lib/firebase';
import { doc, getDoc, deleteDoc, Timestamp } from 'firebase/firestore';
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

interface Flashcard {
  question: string;
  answer: string;
}

interface StoredQuizItem {
  question: string;
  options: string[];
  correctAnswerIndex: number;
}

interface StudyCollection {
  id: string;
  title: string;
  flashcards: Flashcard[];
  quizzes: StoredQuizItem[];
  sourceNoteId?: string;
  sourceNoteTitle?: string;
  createdAt: Timestamp;
}

// Client-side representation of QuizItem for interaction
interface ClientQuizItem extends StoredQuizItem {
  clientSideId: string; // For UI key and state management
}


export default function ViewCollectionPage() {
  const params = useParams();
  const collectionId = params.collectionId as string;
  
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const { toast } = useToast();

  const [collectionData, setCollectionData] = useState<StudyCollection | null>(null);
  const [isLoadingCollection, setIsLoadingCollection] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  
  const [currentFlashcardIndex, setCurrentFlashcardIndex] = useState(0);
  const [showFlashcardAnswer, setShowFlashcardAnswer] = useState(false);

  // Client-side state for quizzes
  const [displayQuizzes, setDisplayQuizzes] = useState<ClientQuizItem[]>([]);
  const [selectedQuizOptions, setSelectedQuizOptions] = useState<Record<string, number>>({}); // clientSideId -> option_index
  const [revealedQuizAnswers, setRevealedQuizAnswers] = useState<Record<string, boolean>>({}); // clientSideId -> true/false

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      toast({ title: "Authentication Required", description: "Please log in to view this collection.", variant: "destructive" });
      router.push(`/login?redirect=${pathname}`);
      return;
    }

    if (collectionId && user) {
      setIsLoadingCollection(true);
      const collectionDocRef = doc(db, 'users', user.uid, 'studyCollections', collectionId);
      getDoc(collectionDocRef).then(docSnap => {
        if (docSnap.exists()) {
          const data = { id: docSnap.id, ...docSnap.data() } as StudyCollection;
          setCollectionData(data);
          // Prepare quizzes for UI
          setDisplayQuizzes(data.quizzes.map((q, index) => ({
            ...q,
            clientSideId: `quiz-${data.id}-${index}` 
          })));
          setCurrentFlashcardIndex(0);
          setShowFlashcardAnswer(false);
          setSelectedQuizOptions({});
          setRevealedQuizAnswers({});

        } else {
          toast({ title: "Collection Not Found", description:"The requested study collection does not exist or you don't have access.", variant: "destructive" });
          router.push('/flashcards-quizzes');
        }
      }).catch(error => {
        console.error("Error fetching collection: ", error);
        toast({ title: "Error", description: "Could not load the collection.", variant: "destructive" });
        router.push('/flashcards-quizzes');
      }).finally(() => {
        setIsLoadingCollection(false);
      });
    }
  }, [collectionId, user, authLoading, toast, router, pathname]);

  const nextFlashcard = () => {
    if (!collectionData || collectionData.flashcards.length === 0) return;
    setShowFlashcardAnswer(false);
    setCurrentFlashcardIndex((prev) => (prev + 1) % collectionData.flashcards.length);
  };

  const prevFlashcard = () => {
    if (!collectionData || collectionData.flashcards.length === 0) return;
    setShowFlashcardAnswer(false);
    setCurrentFlashcardIndex((prev) => (prev - 1 + collectionData.flashcards.length) % collectionData.flashcards.length);
  };

  const handleSelectQuizOption = (quizClientSideId: string, optionIndex: number) => {
    setSelectedQuizOptions(prev => ({ ...prev, [quizClientSideId]: optionIndex }));
  };

  const revealQuizAnswer = (quizClientSideId: string) => {
    setRevealedQuizAnswers(prev => ({ ...prev, [quizClientSideId]: true }));
  };

  const handleDeleteCollection = async () => {
    if (!user || !collectionId || !collectionData) {
        toast({ title: "Error", description: "Cannot delete collection.", variant: "destructive"});
        return;
    }
    setIsDeleting(true);
    try {
        await deleteDoc(doc(db, 'users', user.uid, 'studyCollections', collectionId));
        toast({ title: "Collection Deleted", description: `"${collectionData.title}" has been successfully removed.`});
        router.push('/flashcards-quizzes');
    } catch (error) {
        console.error("Error deleting collection: ", error);
        toast({ title: "Delete Failed", description: (error as Error).message, variant: "destructive"});
    } finally {
        setIsDeleting(false);
    }
  };

  if (authLoading || (isLoadingCollection && user)) {
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
        <p className="text-muted-foreground mb-4">You need to be logged in to view this collection.</p>
        <Button onClick={() => router.push(`/login?redirect=${pathname}`)}>Go to Login</Button>
      </div>
    );
  }

  if (!collectionData) {
    // This case is handled by redirect in useEffect if collection not found,
    // but as a fallback or if still loading and not yet redirected.
    return (
      <div className="flex justify-center items-center min-h-screen">
        <p>Collection not found or error loading.</p>
      </div>
    );
  }
  
  const currentFlashcard = collectionData.flashcards[currentFlashcardIndex];

  return (
    <div className="space-y-6">
      <PageHeader
        title={collectionData.title}
        description={
            `Created on: ${collectionData.createdAt?.toDate().toLocaleDateString() || 'N/A'}` +
            (collectionData.sourceNoteTitle ? `. From note: ${collectionData.sourceNoteTitle}` : '. Custom set.')
        }
        actions={
          <div className="flex gap-2">
            {collectionData.sourceNoteId && (
                 <Link href={`/notes/${collectionData.sourceNoteId}/generate-flashcards`} passHref>
                    <Button variant="outline">
                        <Edit3 className="mr-2 h-4 w-4" /> Regenerate/Edit Source
                    </Button>
                </Link>
            )}
            <AlertDialog>
                <AlertDialogTrigger asChild>
                    <Button variant="destructive" disabled={isDeleting}>
                        {isDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
                        Delete Collection
                    </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                    <AlertDialogHeader>
                    <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                        This action cannot be undone. This will permanently delete the collection titled "{collectionData.title}".
                    </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                    <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDeleteCollection} className={buttonVariants({variant: "destructive"})} disabled={isDeleting}>
                        {isDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                        Delete
                    </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
          </div>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {collectionData.flashcards.length > 0 && (
            <Card className="md:col-span-1">
                <CardHeader>
                    <CardTitle>Flashcards ({collectionData.flashcards.length})</CardTitle>
                </CardHeader>
                <CardContent className="text-center">
                    <div className="min-h-[150px] p-4 border rounded-lg bg-card flex flex-col justify-center items-center relative shadow-inner">
                        <p className="text-md font-semibold mb-2">{currentFlashcard?.question}</p>
                        {showFlashcardAnswer && <p className="text-sm text-primary">{currentFlashcard?.answer}</p>}
                    </div>
                    <Button onClick={() => setShowFlashcardAnswer(!showFlashcardAnswer)} variant="outline" className="my-3 text-sm py-1 h-auto">
                        <RotateCcw className="mr-1.5 h-3 w-3" /> {showFlashcardAnswer ? 'Hide' : 'Show'} Answer
                    </Button>
                    <div className="flex justify-center gap-3 mt-1">
                        <Button onClick={prevFlashcard} variant="outline" size="icon" disabled={collectionData.flashcards.length <= 1}>
                            <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <span className="self-center text-xs text-muted-foreground">{currentFlashcardIndex + 1} / {collectionData.flashcards.length}</span>
                        <Button onClick={nextFlashcard} variant="outline" size="icon" disabled={collectionData.flashcards.length <= 1}>
                            <ChevronRight className="h-4 w-4" />
                        </Button>
                    </div>
                </CardContent>
            </Card>
        )}

        {displayQuizzes.length > 0 && (
            <Card className={cn("md:col-span-1", collectionData.flashcards.length === 0 && "md:col-span-2")}>
                <CardHeader>
                    <CardTitle>Quiz Questions ({displayQuizzes.length})</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 md:space-y-6 max-h-[600px] overflow-y-auto">
                    {displayQuizzes.map((quiz, index) => (
                    <Card key={quiz.clientSideId} className="p-3 md:p-4 bg-card shadow-sm">
                        <p className="font-semibold text-sm md:text-base mb-3">Q{index + 1}: {quiz.question}</p>
                        <div className="space-y-2">
                        {quiz.options.map((option, optionIndex) => {
                            const isSelected = selectedQuizOptions[quiz.clientSideId] === optionIndex;
                            const isRevealed = revealedQuizAnswers[quiz.clientSideId];
                            const isCorrect = quiz.correctAnswerIndex === optionIndex;
                            
                            return (
                            <Button
                                key={`${quiz.clientSideId}-opt-${optionIndex}`}
                                variant="outline"
                                className={cn(
                                "w-full justify-start text-left text-xs md:text-sm h-auto py-2",
                                isSelected && !isRevealed && "ring-2 ring-primary",
                                isRevealed && isCorrect && "bg-green-100 dark:bg-green-800 border-green-500 text-green-700 dark:text-green-300 hover:bg-green-200 dark:hover:bg-green-700",
                                isRevealed && !isCorrect && isSelected && "bg-red-100 dark:bg-red-800 border-red-500 text-red-700 dark:text-red-300 hover:bg-red-200 dark:hover:bg-red-700"
                                )}
                                onClick={() => !isRevealed && handleSelectQuizOption(quiz.clientSideId, optionIndex)}
                                disabled={isRevealed}
                            >
                                {isRevealed && isCorrect && <CheckCircle className="mr-2 h-4 w-4 text-green-600 dark:text-green-400" />}
                                {isRevealed && !isCorrect && isSelected && <XCircle className="mr-2 h-4 w-4 text-red-600 dark:text-red-400" />}
                                {option}
                            </Button>
                            );
                        })}
                        </div>
                        <Button 
                            variant="link" 
                            size="sm" 
                            className="mt-3 text-xs md:text-sm" 
                            onClick={() => revealQuizAnswer(quiz.clientSideId)}
                            disabled={revealedQuizAnswers[quiz.clientSideId] || selectedQuizOptions[quiz.clientSideId] === undefined}
                        >
                            {revealedQuizAnswers[quiz.clientSideId] ? 'Answer Shown' : (selectedQuizOptions[quiz.clientSideId] === undefined ? 'Select an option' : 'Show Answer')}
                        </Button>
                        {revealedQuizAnswers[quiz.clientSideId] && (
                        <p className="text-xs md:text-sm text-primary mt-1">
                            Correct Answer: {quiz.options[quiz.correctAnswerIndex]}
                        </p>
                        )}
                    </Card>
                    ))}
                </CardContent>
            </Card>
        )}
         {(collectionData.flashcards.length === 0 && displayQuizzes.length === 0) && (
            <Card className="md:col-span-2 flex flex-col items-center justify-center text-center min-h-[200px]">
                <CardHeader>
                    <BookOpen className="mx-auto h-12 w-12 text-muted-foreground opacity-50 mb-4" />
                    <CardTitle>Empty Collection</CardTitle>
                    <CardDescription>This study collection doesn't have any flashcards or quizzes.</CardDescription>
                </CardHeader>
            </Card>
         )}
      </div>
    </div>
  );
}
