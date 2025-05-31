
'use client';

import PageHeader from '@/components/common/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Zap, ChevronLeft, ChevronRight, RotateCcw, Check, FileText, Save, Info, AlertCircle } from 'lucide-react';
import { use, useState, useEffect, FormEvent } from 'react'; 
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
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { useRouter } from 'next/navigation';

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

interface SavedCollection {
  id: string;
  title: string;
  flashcards: Flashcard[];
  quizzes: QuizItem[]; 
  createdAt: Date;
}

// Function to fetch actual note content from Firebase
const fetchNoteContentFromFirebase = async (userId: string, noteId: string): Promise<string | null> => {
  if (!userId || !noteId) return null;
  try {
    const noteDocRef = doc(db, 'users', userId, 'notes', noteId);
    const docSnap = await getDoc(noteDocRef);
    if (docSnap.exists()) {
      return docSnap.data()?.content || null;
    }
    return null;
  } catch (error) {
    console.error("Error fetching note content from Firebase: ", error);
    return null;
  }
};


export default function GenerateFlashcardsPage(props: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(props.params);
  const { id: noteId } = resolvedParams;
  const router = useRouter();

  const { user, loading: authLoading } = useAuth();
  const [noteContent, setNoteContent] = useState('');
  const [originalNoteTitle, setOriginalNoteTitle] = useState('');
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
    if (authLoading) return;
    if (!user) {
      toast({ title: "Authentication Required", description: "Please log in to generate study materials.", variant: "destructive" });
      router.push('/login');
      return;
    }

    if (noteId && user) {
      setIsLoadingNote(true);
      fetchNoteContentFromFirebase(user.uid, noteId).then(content => {
        if (content) {
          setNoteContent(content);
          // Attempt to get note title as well for context (optional)
          const noteDocRef = doc(db, 'users', user.uid, 'notes', noteId);
          getDoc(noteDocRef).then(docSnap => {
            if (docSnap.exists()) setOriginalNoteTitle(docSnap.data()?.title || 'Note ' + noteId);
            else setOriginalNoteTitle('Note ' + noteId);
          });
        } else {
          toast({ title: "Note content not found", description:"Could not load content for this note.", variant: "destructive" });
          setOriginalNoteTitle('Note ' + noteId); // fallback title
        }
        setIsLoadingNote(false);
      });
    } else if (!noteId) {
        toast({ title: "Note ID missing", variant: "destructive" });
        setIsLoadingNote(false);
    }
  }, [noteId, user, authLoading, toast, router]);

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
        options: ["Option A (placeholder)", "Option B (placeholder)", "Option C (placeholder)", "Option D (placeholder)"], // AI flow needs to be updated for MCQs
        correctAnswer: "Placeholder Correct Answer" // AI flow needs to be updated
      }));
      setQuizzes(parsedQuizzes);

      setCurrentFlashcardIndex(0);
      setShowAnswer(false);
      toast({ title: "Generation Complete!", description: "Flashcards and quizzes are ready." });
    } catch (error) {
      console.error('Error generating content:', error);
      toast({ title: "Generation Failed", description: "Could not generate flashcards/quizzes. AI might be busy or input too complex.", variant: "destructive" });
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
    setSavedCollections(prev => [newCollection, ...prev]); // Saved locally for this session
    toast({ title: "Collection Saved!", description: `"${collectionTitle}" has been saved locally for this session.`});
    setCollectionTitle('');
    setShowSaveDialog(false);
    // TODO: Implement saving to Firebase user's collections
  };
  
  if (authLoading) {
    return <div className="flex justify-center items-center h-screen"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>;
  }

  if (!user && !authLoading) {
    return (
        <div className="flex flex-col items-center justify-center h-screen p-4 text-center">
            <AlertCircle className="w-16 h-16 text-destructive mb-4" />
            <h1 className="text-2xl font-bold mb-2">Access Denied</h1>
            <p className="text-muted-foreground mb-4">You need to be logged in to generate study materials.</p>
            <Button onClick={() => router.push('/login')}>Go to Login</Button>
        </div>
    );
  }
  
  if (isLoadingNote && noteId) { 
    return <div className="flex justify-center items-center h-screen"><Loader2 className="h-8 w-8 animate-spin text-primary" /> Loading Note...</div>;
  }


  return (
    <div className="space-y-6">
      <PageHeader
        title="Generate Flashcards & Quizzes"
        description={originalNoteTitle ? `From note: ${originalNoteTitle}` : `From note ID: ${noteId}`}
        actions={
            <Link href={`/notes/${noteId}`} passHref>
                <Button variant="outline">
                    <FileText className="mr-2 h-4 w-4" /> View Original Note
                </Button>
            </Link>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle>Source Note Content</CardTitle>
          <CardDescription>This content will be used to generate flashcards and quizzes. You can edit it here for generation purposes.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingNote ? (
             <div className="flex justify-center items-center h-32"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
          ) : (
            <Textarea value={noteContent} onChange={(e) => setNoteContent(e.target.value)} rows={8} className="bg-muted/50 min-h-[200px]" />
          )}
          <Button onClick={handleGenerate} disabled={isLoadingAI || isLoadingNote || !noteContent} className="mt-4 w-full">
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
              {showAnswer && <p className="text-sm md:text-md text-primary">{flashcards[currentFlashcardIndex]?.answer}</p>}
            </div>
            <Button onClick={() => setShowAnswer(!showAnswer)} variant="outline" className="my-3 md:my-4">
              <RotateCcw className="mr-2 h-4 w-4" /> {showAnswer ? 'Hide' : 'Show'} Answer
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
            <CardDescription>Test your knowledge with these questions. Full MCQ functionality depends on AI providing options/answers.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 md:space-y-4">
            {quizzes.map((quiz, index) => (
              <Card key={quiz.id} className="p-3 md:p-4 bg-card shadow-sm">
                <p className="font-semibold text-sm md:text-base">Q{index + 1}: {quiz.question}</p>
                <div className="mt-2 space-y-1">
                  {quiz.options?.map(opt => (
                     <Button key={opt} variant="outline" className="w-full justify-start text-left text-xs md:text-sm cursor-not-allowed opacity-70" onClick={() => alert(`Selecting options is not fully implemented without structured AI output.`)}>
                       {opt}
                     </Button>
                  ))}
                </div>
                <Button variant="link" size="sm" className="mt-2 text-xs md:text-sm" onClick={() => toggleQuizAnswer(quiz.id)}>
                    {showQuizAnswers[quiz.id] ? 'Hide' : 'Show'} Answer (Placeholder)
                </Button>
                {showQuizAnswers[quiz.id] && <p className="text-xs md:text-sm text-primary mt-1">{quiz.correctAnswer}</p>}
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
                  <DialogDescription>Enter a title for this collection of flashcards and quizzes. This will be saved locally for this session.</DialogDescription>
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
                <CardTitle>Locally Saved Collections (This Session Only)</CardTitle>
                <CardDescription>These collections are saved in this browser session for this page only. Full saving to "My Flashcards & Quizzes" not yet implemented.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
                {savedCollections.map(col => (
                    <div key={col.id} className="p-3 border rounded-md">
                        <h4 className="font-semibold">{col.title}</h4>
                        <p className="text-xs text-muted-foreground">
                            {col.flashcards.length} flashcards, {col.quizzes.length} quiz questions. Saved on: {col.createdAt.toLocaleDateString()}
                        </p>
                         <Button variant="outline" size="sm" className="mt-2" onClick={() => alert(`Viewing collection "${col.title}" is not yet implemented here. Items are displayed above.`)}>
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
