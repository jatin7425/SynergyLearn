
'use client';

import PageHeader from '@/components/common/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Zap, ChevronLeft, ChevronRight, RotateCcw, FileText, Save, AlertCircle, CheckCircle, XCircle } from 'lucide-react';
import { useState, useEffect, FormEvent } from 'react'; 
import { useToast } from '@/hooks/use-toast';
import { generateFlashcardsAndQuizzes, type GenerateFlashcardsAndQuizzesInput, type GenerateFlashcardsAndQuizzesOutput } from '@/ai/flows/generate-flashcards';
import Link from 'next/link';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebase';
import { doc, getDoc, addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { useRouter, usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

interface Flashcard {
  id: string;
  question: string;
  answer: string;
}

interface QuizItem {
  id: string; // client-side id
  question: string;
  options: string[];
  correctAnswerIndex: number;
}

const fetchNoteContentFromFirebase = async (userId: string, noteId: string): Promise<{content: string | null, title: string | null}> => {
  if (!userId || !noteId) return { content: null, title: null };
  try {
    const noteDocRef = doc(db, 'users', userId, 'notes', noteId);
    const docSnap = await getDoc(noteDocRef);
    if (docSnap.exists()) {
      return { content: docSnap.data()?.content || null, title: docSnap.data()?.title || null };
    }
    return { content: null, title: null };
  } catch (error) {
    console.error("Error fetching note content from Firebase: ", error);
    return { content: null, title: null };
  }
};


export default function GenerateFlashcardsPage({ params }: { params: { id: string } }) {
  const { id: noteId } = params; 
  
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const { toast } = useToast();

  const [noteContent, setNoteContent] = useState('');
  const [originalNoteTitle, setOriginalNoteTitle] = useState('');
  const [isLoadingNote, setIsLoadingNote] = useState(true);
  const [isLoadingAI, setIsLoadingAI] = useState(false);
  const [isSavingCollection, setIsSavingCollection] = useState(false);
  
  const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
  const [quizzes, setQuizzes] = useState<QuizItem[]>([]);
  const [currentFlashcardIndex, setCurrentFlashcardIndex] = useState(0);
  const [showFlashcardAnswer, setShowFlashcardAnswer] = useState(false);

  const [selectedQuizOptions, setSelectedQuizOptions] = useState<Record<string, number>>({}); // quiz.id -> option_index
  const [revealedQuizAnswers, setRevealedQuizAnswers] = useState<Record<string, boolean>>({}); // quiz.id -> true/false


  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [collectionTitle, setCollectionTitle] = useState('');

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      toast({ title: "Authentication Required", description: "Please log in to generate study materials.", variant: "destructive" });
      router.push(`/login?redirect=${pathname}`);
      return;
    }

    if (noteId && user) {
      setIsLoadingNote(true);
      fetchNoteContentFromFirebase(user.uid, noteId).then(({ content, title }) => {
        if (content) {
          setNoteContent(content);
        } else {
          toast({ title: "Note content not found", description:"Could not load content for this note.", variant: "destructive" });
        }
        setOriginalNoteTitle(title || 'Note ' + noteId);
        setCollectionTitle(title ? `${title} - Study Set` : 'New Study Set');
        setIsLoadingNote(false);
      });
    } else if (!noteId) { 
        setOriginalNoteTitle('Custom Text Input'); 
        setCollectionTitle('New Study Set');
        setIsLoadingNote(false);
    }
  }, [noteId, user, authLoading, toast, router, pathname]);

  const handleGenerate = async (e: FormEvent) => {
    e.preventDefault();
    if (!noteContent.trim()) {
      toast({ title: "Note content is empty", description: "Cannot generate from an empty note or text.", variant: "destructive" });
      return;
    }
    setIsLoadingAI(true);
    setFlashcards([]);
    setQuizzes([]);
    setSelectedQuizOptions({});
    setRevealedQuizAnswers({});

    try {
      const input: GenerateFlashcardsAndQuizzesInput = { notes: noteContent };
      const result: GenerateFlashcardsAndQuizzesOutput = await generateFlashcardsAndQuizzes(input);
      
      const parsedFlashcards = result.flashcards.map((fcString, index) => {
        const parts = fcString.split(':::');
        return {
          id: `fc-${Date.now()}-${index}`,
          question: parts[0]?.trim() || "Question not parsed",
          answer: parts[1]?.trim() || "Answer not parsed",
        };
      });
      setFlashcards(parsedFlashcards);

      const parsedQuizzes = result.quizzes.map((qData, index) => ({
        ...qData,
        id: `q-${Date.now()}-${index}`,
      }));
      setQuizzes(parsedQuizzes as QuizItem[]); // Cast as AI output should match this structure

      setCurrentFlashcardIndex(0);
      setShowFlashcardAnswer(false);
      if (!collectionTitle && originalNoteTitle) {
        setCollectionTitle(`${originalNoteTitle} - Study Set`);
      } else if (!collectionTitle) {
        setCollectionTitle('New Study Set ' + new Date().toLocaleTimeString());
      }
      toast({ title: "Generation Complete!", description: "Flashcards and quizzes are ready." });
    } catch (error) {
      console.error('Error generating content:', error);
      toast({ title: "Generation Failed", description: "Could not generate flashcards/quizzes. AI might be busy or input too complex.", variant: "destructive" });
    } finally {
      setIsLoadingAI(false);
    }
  };

  const nextFlashcard = () => {
    setShowFlashcardAnswer(false);
    setCurrentFlashcardIndex((prev) => (prev + 1) % flashcards.length);
  };

  const prevFlashcard = () => {
    setShowFlashcardAnswer(false);
    setCurrentFlashcardIndex((prev) => (prev - 1 + flashcards.length) % flashcards.length);
  };

  const handleSelectQuizOption = (quizId: string, optionIndex: number) => {
    setSelectedQuizOptions(prev => ({ ...prev, [quizId]: optionIndex }));
  };

  const revealQuizAnswer = (quizId: string) => {
    setRevealedQuizAnswers(prev => ({ ...prev, [quizId]: true }));
  };

  const handleSaveCollection = async (e: FormEvent) => {
    e.preventDefault();
    if (!user) {
      toast({ title: "Authentication Error", description: "You must be logged in.", variant: "destructive"});
      return;
    }
    if (!collectionTitle.trim()) {
        toast({ title: "Title required", description: "Please enter a title for your collection.", variant: "destructive"});
        return;
    }
    if (flashcards.length === 0 && quizzes.length === 0) {
        toast({ title: "Nothing to save", description: "Generate some flashcards or quizzes first.", variant: "destructive"});
        return;
    }
    setIsSavingCollection(true);
    // Map quizzes to only store AI-generated data, not client-side state
    const quizzesToSave = quizzes.map(({id, ...q}) => q);

    const collectionData = {
        title: collectionTitle.trim(),
        flashcards: flashcards.map(({id, ...f}) => f), // Remove client-side ID before saving
        quizzes: quizzesToSave,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        ...(noteId && { sourceNoteId: noteId }),
        ...(noteId && originalNoteTitle && { sourceNoteTitle: originalNoteTitle }),
    };
    try {
        const collectionsRef = collection(db, 'users', user.uid, 'studyCollections');
        await addDoc(collectionsRef, collectionData);
        toast({ title: "Collection Saved!", description: `"${collectionTitle}" has been saved to your collections.`});
        setShowSaveDialog(false);
    } catch (error) {
        console.error("Error saving collection: ", error);
        toast({ title: "Save Failed", description: (error as Error).message, variant: "destructive"});
    } finally {
        setIsSavingCollection(false);
    }
  };
  
  if (authLoading || (user && isLoadingNote && noteId)) {
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
            <p className="text-muted-foreground mb-4">You need to be logged in to generate study materials.</p>
            <Button onClick={() => router.push(`/login?redirect=${pathname}`)}>Go to Login</Button>
        </div>
    );
  }
  
  return (
    <div className="space-y-6">
      <PageHeader
        title="Generate Flashcards & Quizzes"
        description={originalNoteTitle ? `From note: ${originalNoteTitle}` : (noteId ? `From note ID: ${noteId}`: 'Generate from any text')}
        actions={
          <>
            {noteId && <Link href={`/notes/${noteId}`} passHref>
                <Button variant="outline" className="mr-2">
                    <FileText className="mr-2 h-4 w-4" /> View Original Note
                </Button>
            </Link>}
             <Link href="/flashcards-quizzes" passHref>
                <Button variant="outline">
                     My Collections
                </Button>
            </Link>
          </>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle>Source Text</CardTitle>
          <CardDescription>This content will be used to generate flashcards and quizzes. You can edit it here for generation purposes, or paste any text if not starting from a note.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingNote && noteId ? ( 
             <div className="flex justify-center items-center h-32"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
          ) : (
            <Textarea value={noteContent} onChange={(e) => setNoteContent(e.target.value)} rows={8} className="bg-muted/50 min-h-[200px]" placeholder="Paste your notes or any text here..."/>
          )}
          <Button onClick={handleGenerate} disabled={isLoadingAI || (isLoadingNote && !!noteId) || !noteContent.trim()} className="mt-4 w-full">
            {isLoadingAI ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Zap className="mr-2 h-4 w-4" />}
            {isLoadingAI ? 'Generating...' : 'Generate Flashcards & Quizzes'}
          </Button>
        </CardContent>
      </Card>

      {flashcards.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Flashcards</CardTitle>
            <CardDescription>Review your generated flashcards.</CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <div className="min-h-[150px] md:min-h-[200px] p-4 md:p-6 border rounded-lg bg-card flex flex-col justify-center items-center relative shadow-inner">
              <p className="text-md md:text-lg font-semibold mb-2 md:mb-4">{flashcards[currentFlashcardIndex]?.question}</p>
              {showFlashcardAnswer && <p className="text-sm md:text-md text-primary">{flashcards[currentFlashcardIndex]?.answer}</p>}
            </div>
            <Button onClick={() => setShowFlashcardAnswer(!showFlashcardAnswer)} variant="outline" className="my-3 md:my-4">
              <RotateCcw className="mr-2 h-4 w-4" /> {showFlashcardAnswer ? 'Hide' : 'Show'} Answer
            </Button>
            <div className="flex justify-center gap-3 md:gap-4 mt-1 md:mt-2">
              <Button onClick={prevFlashcard} variant="outline" size="icon" disabled={flashcards.length <= 1}>
                <ChevronLeft className="h-4 w-4 md:h-5 md:w-5" />
              </Button>
              <span className="self-center text-xs md:text-sm text-muted-foreground">{currentFlashcardIndex + 1} / {flashcards.length}</span>
              <Button onClick={nextFlashcard} variant="outline" size="icon" disabled={flashcards.length <= 1}>
                <ChevronRight className="h-4 w-4 md:h-5 md:w-5" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {quizzes.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Quizzes</CardTitle>
            <CardDescription>Test your knowledge with these questions.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 md:space-y-6">
            {quizzes.map((quiz, index) => (
              <Card key={quiz.id} className="p-3 md:p-4 bg-card shadow-sm">
                <p className="font-semibold text-sm md:text-base mb-3">Q{index + 1}: {quiz.question}</p>
                <div className="space-y-2">
                  {quiz.options.map((option, optionIndex) => {
                    const isSelected = selectedQuizOptions[quiz.id] === optionIndex;
                    const isRevealed = revealedQuizAnswers[quiz.id];
                    const isCorrect = quiz.correctAnswerIndex === optionIndex;
                    
                    return (
                      <Button
                        key={optionIndex}
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left text-xs md:text-sm h-auto py-2",
                          isSelected && !isRevealed && "ring-2 ring-primary",
                          isRevealed && isCorrect && "bg-green-100 dark:bg-green-800 border-green-500 text-green-700 dark:text-green-300 hover:bg-green-200 dark:hover:bg-green-700",
                          isRevealed && !isCorrect && isSelected && "bg-red-100 dark:bg-red-800 border-red-500 text-red-700 dark:text-red-300 hover:bg-red-200 dark:hover:bg-red-700"
                        )}
                        onClick={() => !isRevealed && handleSelectQuizOption(quiz.id, optionIndex)}
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
                  onClick={() => revealQuizAnswer(quiz.id)}
                  disabled={revealedQuizAnswers[quiz.id]}
                >
                  {revealedQuizAnswers[quiz.id] ? 'Answer Shown' : 'Show Answer'}
                </Button>
                {revealedQuizAnswers[quiz.id] && (
                  <p className="text-xs md:text-sm text-primary mt-1">
                    Correct Answer: {quiz.options[quiz.correctAnswerIndex]}
                  </p>
                )}
              </Card>
            ))}
          </CardContent>
        </Card>
      )}

       {(flashcards.length > 0 || quizzes.length > 0) && (
        <Card>
          <CardHeader>
            <CardTitle>Save Collection</CardTitle>
          </CardHeader>
          <CardContent>
            <Dialog open={showSaveDialog} onOpenChange={setShowSaveDialog}>
              <DialogTrigger asChild>
                <Button className="w-full" disabled={isSavingCollection}>
                  {isSavingCollection ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                  Save to My Collection
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Save Collection</DialogTitle>
                  <DialogDescription>Enter a title for this collection of flashcards and quizzes. This will be saved to your account.</DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSaveCollection}>
                  <div className="py-4">
                    <Label htmlFor="collection-title">Collection Title</Label>
                    <Input 
                      id="collection-title" 
                      value={collectionTitle} 
                      onChange={(e) => setCollectionTitle(e.target.value)}
                      placeholder={originalNoteTitle ? `${originalNoteTitle} - Study Set` : "e.g., Chapter 1 Review"}
                      required
                      disabled={isSavingCollection}
                    />
                  </div>
                  <DialogFooter>
                    <DialogClose asChild>
                      <Button type="button" variant="outline" disabled={isSavingCollection}>Cancel</Button>
                    </DialogClose>
                    <Button type="submit" disabled={isSavingCollection || !collectionTitle.trim()}>
                       {isSavingCollection ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                       Save
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
