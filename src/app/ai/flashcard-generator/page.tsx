
'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import PageHeader from '@/components/common/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Zap, ChevronLeft, ChevronRight, RotateCcw, BookOpen, AlertCircle, CheckCircle, XCircle, Save } from 'lucide-react';
import { generateFlashcardsAndQuizzes, type GenerateFlashcardsAndQuizzesInput, type GenerateFlashcardsAndQuizzesOutput } from '@/ai/flows/generate-flashcards';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { db } from '@/lib/firebase';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';


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

export default function AiFlashcardGeneratorPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const { toast } = useToast();

  const [notesInput, setNotesInput] = useState('');
  const [isLoadingAI, setIsLoadingAI] = useState(false);
  const [isSavingCollection, setIsSavingCollection] = useState(false);
  
  const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
  const [quizzes, setQuizzes] = useState<QuizItem[]>([]); 
  
  const [currentFlashcardIndex, setCurrentFlashcardIndex] = useState(0);
  const [showFlashcardAnswer, setShowFlashcardAnswer] = useState(false);

  const [selectedQuizOptions, setSelectedQuizOptions] = useState<Record<string, number>>({}); // quiz.id -> option_index
  const [revealedQuizAnswers, setRevealedQuizAnswers] = useState<Record<string, boolean>>({}); // quiz.id -> true/false

  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [collectionTitle, setCollectionTitle] = useState('Custom Study Set ' + new Date().toLocaleDateString());


  useEffect(() => {
    if (!authLoading && !user) {
      toast({ title: "Authentication Required", description: "Please log in to use the AI Flashcard Generator.", variant: "destructive" });
      router.push(`/login?redirect=${pathname}`);
    }
  }, [user, authLoading, router, pathname, toast]);

  const handleGenerate = async (e: FormEvent) => {
    e.preventDefault();
    if (!notesInput.trim()) {
      toast({ title: "Input is empty", description: "Please provide some notes to generate from.", variant: "destructive" });
      return;
    }
    setIsLoadingAI(true);
    setFlashcards([]);
    setQuizzes([]);
    setSelectedQuizOptions({});
    setRevealedQuizAnswers({});

    try {
      const input: GenerateFlashcardsAndQuizzesInput = { notes: notesInput };
      const result: GenerateFlashcardsAndQuizzesOutput = await generateFlashcardsAndQuizzes(input);
      
      const parsedFlashcards = result.flashcards.map((fcString, index) => {
        const parts = fcString.split(':::');
        return {
          id: `fc-gen-${Date.now()}-${index}`,
          question: parts[0]?.trim() || "Question not parsed",
          answer: parts[1]?.trim() || "Answer not parsed",
        };
      });
      setFlashcards(parsedFlashcards);
      
      const parsedQuizzes = result.quizzes.map((qData, index) => ({
        ...qData,
        id: `q-gen-${Date.now()}-${index}`,
      }));
      setQuizzes(parsedQuizzes as QuizItem[]);

      setCurrentFlashcardIndex(0);
      setShowFlashcardAnswer(false);
      setCollectionTitle('Custom Study Set ' + new Date().toLocaleDateString() + " " + new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}));
      toast({ title: "Generation Complete!", description: "Flashcards and quizzes are ready." });
    } catch (error) {
      console.error('Error generating content:', error);
      toast({ title: "Generation Failed", description: "Could not generate flashcards/quizzes.", variant: "destructive" });
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
    const quizzesToSave = quizzes.map(({id, ...q}) => q);
    const collectionData = {
        title: collectionTitle.trim(),
        flashcards: flashcards.map(({id, ...f}) => f),
        quizzes: quizzesToSave,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        sourceNoteTitle: "Custom Input", // Indicate it's not from a specific note
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
        <p className="text-muted-foreground mb-4">You need to be logged in to use the AI Flashcard Generator.</p>
        <Button onClick={() => router.push(`/login?redirect=${pathname}`)}>Go to Login</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="AI Flashcard & Quiz Generator"
        description="Paste your notes or text here to automatically create study materials."
        actions={
            <Link href="/flashcards-quizzes" passHref>
                <Button variant="outline">
                    <BookOpen className="mr-2 h-4 w-4" /> My Collections
                </Button>
            </Link>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Input Your Text</CardTitle>
            <CardDescription>Provide the content you want to transform into flashcards and quizzes.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleGenerate} className="space-y-4">
              <Textarea
                value={notesInput}
                onChange={(e) => setNotesInput(e.target.value)}
                placeholder="Paste your notes, article snippets, or any text here..."
                rows={15}
                className="min-h-[300px]"
              />
              <Button type="submit" className="w-full" disabled={isLoadingAI || !notesInput.trim()}>
                {isLoadingAI ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Zap className="mr-2 h-4 w-4" />}
                Generate
              </Button>
            </form>
          </CardContent>
        </Card>

        <div className="space-y-6">
            {flashcards.length > 0 && (
            <Card>
                <CardHeader>
                    <CardTitle>Generated Flashcards</CardTitle>
                </CardHeader>
                <CardContent className="text-center">
                    <div className="min-h-[150px] p-4 border rounded-lg bg-card flex flex-col justify-center items-center relative shadow-inner">
                        <p className="text-md font-semibold mb-2">{flashcards[currentFlashcardIndex]?.question}</p>
                        {showFlashcardAnswer && <p className="text-sm text-primary">{flashcards[currentFlashcardIndex]?.answer}</p>}
                    </div>
                    <Button onClick={() => setShowFlashcardAnswer(!showFlashcardAnswer)} variant="outline" className="my-3 text-sm py-1 h-auto">
                        <RotateCcw className="mr-1.5 h-3 w-3" /> {showFlashcardAnswer ? 'Hide' : 'Show'} Answer
                    </Button>
                    <div className="flex justify-center gap-3 mt-1">
                        <Button onClick={prevFlashcard} variant="outline" size="icon" disabled={flashcards.length <= 1}>
                            <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <span className="self-center text-xs text-muted-foreground">{currentFlashcardIndex + 1} / {flashcards.length}</span>
                        <Button onClick={nextFlashcard} variant="outline" size="icon" disabled={flashcards.length <= 1}>
                            <ChevronRight className="h-4 w-4" />
                        </Button>
                    </div>
                </CardContent>
            </Card>
            )}

            {quizzes.length > 0 && (
            <Card>
                <CardHeader>
                    <CardTitle>Generated Quiz Questions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 md:space-y-6 max-h-[500px] overflow-y-auto">
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
                        <DialogDescription>Enter a title for this custom collection of flashcards and quizzes.</DialogDescription>
                        </DialogHeader>
                        <form onSubmit={handleSaveCollection}>
                        <div className="py-4">
                            <Label htmlFor="collection-title">Collection Title</Label>
                            <Input 
                            id="collection-title" 
                            value={collectionTitle} 
                            onChange={(e) => setCollectionTitle(e.target.value)}
                            placeholder="e.g., Custom Study Set"
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

            {(flashcards.length === 0 && quizzes.length === 0 && !isLoadingAI) && (
                 <Card className="flex flex-col items-center justify-center text-center min-h-[200px]">
                    <CardHeader>
                         <BookOpen className="mx-auto h-12 w-12 text-muted-foreground opacity-50 mb-4" />
                        <CardTitle>Ready to Study?</CardTitle>
                        <CardDescription>Your generated materials will appear here.</CardDescription>
                    </CardHeader>
                 </Card>
            )}
        </div>
      </div>
    </div>
  );
}
