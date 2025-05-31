
'use client';

import PageHeader from '@/components/common/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Zap, ChevronLeft, ChevronRight, RotateCcw, Check, FileText, Save, Info } from 'lucide-react';
import { useState, useEffect, FormEvent } from 'react';
import { useToast } from '@/hooks/use-toast';
import { generateFlashcardsAndQuizzes, type GenerateFlashcardsAndQuizzesInput } from '@/ai/flows/generate-flashcards';
import Link from 'next/link';
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

// Mock note data fetching
const fetchNoteContent = async (id: string): Promise<string | null> => {
  await new Promise(resolve => setTimeout(resolve, 300));
  const mockNotesContent: Record<string, string> = {
    '1': 'Quantum mechanics is a fundamental theory in physics that provides a description of the physical properties of nature at the scale of atoms and subatomic particles. Key concepts include wave-particle duality, superposition, and entanglement. Planck, Einstein, Bohr, Heisenberg, and Schrödinger were key contributors.',
    '2': 'JavaScript Closures: A closure is the combination of a function bundled together with references to its surrounding state. Async/Await: Syntactic sugar for Promises.',
  };
  return mockNotesContent[id] || "Sample note content to generate flashcards and quizzes. This note discusses important historical events and key figures. The French Revolution began in 1789. Key figures included Robespierre and Napoleon Bonaparte. It ended in 1799.";
};

interface Flashcard {
  id: string;
  question: string;
  answer: string;
}

interface QuizItem {
  id: string;
  question: string;
  // These are placeholders as AI flow currently returns quiz questions as strings
  options: string[]; 
  correctAnswer: string; 
}

interface SavedCollection {
  id: string;
  title: string;
  flashcards: Flashcard[];
  quizzes: QuizItem[]; // Storing the processed QuizItems
  createdAt: Date;
}

export default function GenerateFlashcardsPage({ params }: { params: { id: string } }) {
  const [noteContent, setNoteContent] = useState('');
  const [isLoadingNote, setIsLoadingNote] = useState(true);
  const [isLoadingAI, setIsLoadingAI] = useState(false);
  const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
  const [quizzes, setQuizzes] = useState<QuizItem[]>([]);
  const [currentFlashcardIndex, setCurrentFlashcardIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [showQuizAnswers, setShowQuizAnswers] = useState<Record<string, boolean>>({});

  const [savedCollections, setSavedCollections] = useState<SavedCollection[]>([]);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [collectionTitle, setCollectionTitle] = useState('');

  const { toast } = useToast();

  useEffect(() => {
    if (params.id) {
      setIsLoadingNote(true);
      fetchNoteContent(params.id).then(content => {
        if (content) {
          setNoteContent(content);
        } else {
          toast({ title: "Note not found", variant: "destructive" });
        }
        setIsLoadingNote(false);
      });
    }
  }, [params.id, toast]);

  const handleGenerate = async (e: FormEvent) => {
    e.preventDefault();
    if (!noteContent) {
      toast({ title: "Note content is empty", description: "Cannot generate from an empty note.", variant: "destructive" });
      return;
    }
    setIsLoadingAI(true);
    setFlashcards([]);
    setQuizzes([]);
    setShowQuizAnswers({});
    try {
      const input: GenerateFlashcardsAndQuizzesInput = { notes: noteContent };
      const result = await generateFlashcardsAndQuizzes(input);
      
      const parsedFlashcards = result.flashcards.map((fcString, index) => {
        const parts = fcString.split(':::');
        return {
          id: `fc-${Date.now()}-${index}`,
          question: parts[0]?.trim() || "Question not parsed",
          answer: parts[1]?.trim() || "Answer not parsed",
        };
      });
      setFlashcards(parsedFlashcards);

      const parsedQuizzes = result.quizzes.map((qString, index) => ({
        id: `q-${Date.now()}-${index}`,
        question: qString,
        // The AI flow for `generateFlashcardsAndQuizzes` returns simple strings for quizzes.
        // For a full MCQ experience, the AI flow would need to return structured options and answers.
        // These are placeholders for demonstration.
        options: ["Option A (placeholder)", "Option B (placeholder)", "Option C (placeholder)", "Option D (placeholder)"],
        correctAnswer: "Placeholder Correct Answer" 
      }));
      setQuizzes(parsedQuizzes);

      setCurrentFlashcardIndex(0);
      setShowAnswer(false);
      toast({ title: "Generation Complete!", description: "Flashcards and quizzes are ready." });
    } catch (error) {
      console.error('Error generating content:', error);
      toast({ title: "Generation Failed", description: "Could not generate flashcards/quizzes.", variant: "destructive" });
    } finally {
      setIsLoadingAI(false);
    }
  };

  const nextFlashcard = () => {
    setShowAnswer(false);
    setCurrentFlashcardIndex((prev) => (prev + 1) % flashcards.length);
  };

  const prevFlashcard = () => {
    setShowAnswer(false);
    setCurrentFlashcardIndex((prev) => (prev - 1 + flashcards.length) % flashcards.length);
  };

  const toggleQuizAnswer = (quizId: string) => {
    setShowQuizAnswers(prev => ({ ...prev, [quizId]: !prev[quizId] }));
  };

  const handleSaveCollection = (e: FormEvent) => {
    e.preventDefault();
    if (!collectionTitle.trim()) {
        toast({ title: "Title required", description: "Please enter a title for your collection.", variant: "destructive"});
        return;
    }
    if (flashcards.length === 0 && quizzes.length === 0) {
        toast({ title: "Nothing to save", description: "Generate some flashcards or quizzes first.", variant: "destructive"});
        return;
    }
    const newCollection: SavedCollection = {
        id: `col-${Date.now()}`,
        title: collectionTitle,
        flashcards,
        quizzes,
        createdAt: new Date(),
    };
    setSavedCollections(prev => [newCollection, ...prev]);
    toast({ title: "Collection Saved!", description: `"${collectionTitle}" has been saved locally.`});
    setCollectionTitle('');
    setShowSaveDialog(false);
  };

  if (isLoadingNote) {
    return <div className="flex justify-center items-center h-64"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Generate Flashcards & Quizzes"
        description={`From note: ${params.id}`} // Potentially update to note title if fetched
        actions={
            <Link href={`/notes/${params.id}`} passHref>
                <Button variant="outline">
                    <FileText className="mr-2 h-4 w-4" /> View Original Note
                </Button>
            </Link>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle>Source Note Content</CardTitle>
          <CardDescription>This content will be used to generate flashcards and quizzes.</CardDescription>
        </CardHeader>
        <CardContent>
          <Textarea value={noteContent} onChange={(e) => setNoteContent(e.target.value)} rows={8} className="bg-muted/50" />
          <Button onClick={handleGenerate} disabled={isLoadingAI || !noteContent} className="mt-4 w-full">
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
            <div className="min-h-[200px] p-6 border rounded-lg bg-card flex flex-col justify-center items-center relative shadow-inner">
              <p className="text-lg font-semibold mb-4">{flashcards[currentFlashcardIndex]?.question}</p>
              {showAnswer && <p className="text-md text-primary">{flashcards[currentFlashcardIndex]?.answer}</p>}
            </div>
            <Button onClick={() => setShowAnswer(!showAnswer)} variant="outline" className="my-4">
              <RotateCcw className="mr-2 h-4 w-4" /> {showAnswer ? 'Hide' : 'Show'} Answer
            </Button>
            <div className="flex justify-center gap-4 mt-2">
              <Button onClick={prevFlashcard} variant="outline" size="icon" disabled={flashcards.length <= 1}>
                <ChevronLeft className="h-5 w-5" />
              </Button>
              <span className="self-center text-sm text-muted-foreground">{currentFlashcardIndex + 1} / {flashcards.length}</span>
              <Button onClick={nextFlashcard} variant="outline" size="icon" disabled={flashcards.length <= 1}>
                <ChevronRight className="h-5 w-5" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {quizzes.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Quizzes</CardTitle>
            <CardDescription>Test your knowledge with these questions. Full MCQ functionality depends on AI providing options/answers.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {quizzes.map((quiz, index) => (
              <Card key={quiz.id} className="p-4 bg-card shadow-sm">
                <p className="font-semibold">Q{index + 1}: {quiz.question}</p>
                <div className="mt-2 space-y-1">
                  {quiz.options?.map(opt => (
                     <Button key={opt} variant="outline" className="w-full justify-start text-left cursor-not-allowed opacity-70" onClick={() => alert(`Selecting options is not fully implemented without structured AI output.`)}>
                       {opt}
                     </Button>
                  ))}
                </div>
                <Button variant="link" size="sm" className="mt-2" onClick={() => toggleQuizAnswer(quiz.id)}>
                    {showQuizAnswers[quiz.id] ? 'Hide' : 'Show'} Answer (Placeholder)
                </Button>
                {showQuizAnswers[quiz.id] && <p className="text-sm text-primary mt-1">{quiz.correctAnswer}</p>}
              </Card>
            ))}
          </CardContent>
        </Card>
      )}

       {(flashcards.length > 0 || quizzes.length > 0) && (
        <Card>
          <CardHeader>
            <CardTitle>Save & Export</CardTitle>
          </CardHeader>
          <CardContent>
            <Dialog open={showSaveDialog} onOpenChange={setShowSaveDialog}>
              <DialogTrigger asChild>
                <Button className="w-full">
                  <Save className="mr-2 h-4 w-4" /> Save to My Collection
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Save Collection</DialogTitle>
                  <DialogDescription>Enter a title for this collection of flashcards and quizzes.</DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSaveCollection}>
                  <div className="py-4">
                    <Label htmlFor="collection-title">Collection Title</Label>
                    <Input 
                      id="collection-title" 
                      value={collectionTitle} 
                      onChange={(e) => setCollectionTitle(e.target.value)}
                      placeholder="e.g., Chapter 1 Review"
                      required
                    />
                  </div>
                  <DialogFooter>
                    <DialogClose asChild>
                      <Button type="button" variant="outline">Cancel</Button>
                    </DialogClose>
                    <Button type="submit">Save</Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </CardContent>
        </Card>
      )}

      {savedCollections.length > 0 && (
        <Card>
            <CardHeader>
                <CardTitle>Locally Saved Collections (This Page Only)</CardTitle>
                <CardDescription>These collections are saved in this browser session for this page.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
                {savedCollections.map(col => (
                    <div key={col.id} className="p-3 border rounded-md">
                        <h4 className="font-semibold">{col.title}</h4>
                        <p className="text-xs text-muted-foreground">
                            {col.flashcards.length} flashcards, {col.quizzes.length} quiz questions. Saved on: {col.createdAt.toLocaleDateString()}
                        </p>
                         <Button variant="outline" size="sm" className="mt-2" onClick={() => alert(`Viewing collection "${col.title}" is not yet implemented here. You can see items in "My Flashcards & Quizzes" page once globally saved.`)}>
                            View (Mock)
                        </Button>
                    </div>
                ))}
            </CardContent>
        </Card>
      )}
    </div>
  );
}
