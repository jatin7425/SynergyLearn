'use client';

import PageHeader from '@/components/common/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Zap, ChevronLeft, ChevronRight, RotateCcw, BookOpen, ListChecks } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { generateFlashcardsAndQuizzes, type GenerateFlashcardsAndQuizzesInput } from '@/ai/flows/generate-flashcards';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';

interface Flashcard {
  id: string;
  question: string;
  answer: string;
}

export default function AiFlashcardGeneratorPage() {
  const [notesInput, setNotesInput] = useState('');
  const [isLoadingAI, setIsLoadingAI] = useState(false);
  const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
  const [quizzes, setQuizzes] = useState<string[]>([]); // AI flow returns string array for quizzes
  const [currentFlashcardIndex, setCurrentFlashcardIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const { toast } = useToast();

  const handleGenerate = async (e: FormEvent) => {
    e.preventDefault();
    if (!notesInput.trim()) {
      toast({ title: "Input is empty", description: "Please provide some notes to generate from.", variant: "destructive" });
      return;
    }
    setIsLoadingAI(true);
    setFlashcards([]);
    setQuizzes([]);
    try {
      const input: GenerateFlashcardsAndQuizzesInput = { notes: notesInput };
      const result = await generateFlashcardsAndQuizzes(input);
      
      const parsedFlashcards = result.flashcards.map((fcString, index) => {
        const parts = fcString.split(':::');
        return {
          id: `fc-gen-${index}`,
          question: parts[0]?.trim() || "Question not parsed",
          answer: parts[1]?.trim() || "Answer not parsed",
        };
      });
      setFlashcards(parsedFlashcards);
      setQuizzes(result.quizzes); // Quizzes are strings from AI flow

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
              <Button type="submit" className="w-full" disabled={isLoadingAI}>
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
                        {showAnswer && <p className="text-sm text-primary">{flashcards[currentFlashcardIndex]?.answer}</p>}
                    </div>
                    <Button onClick={() => setShowAnswer(!showAnswer)} variant="outline" className="my-3 text-sm py-1 h-auto">
                        <RotateCcw className="mr-1.5 h-3 w-3" /> {showAnswer ? 'Hide' : 'Show'} Answer
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
                <CardContent className="space-y-2 max-h-80 overflow-y-auto">
                    {quizzes.map((quizQuestion, index) => (
                    <div key={`quiz-${index}`} className="p-3 border rounded-md bg-card text-sm">
                        <strong>Q{index + 1}:</strong> {quizQuestion}
                    </div>
                    ))}
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
