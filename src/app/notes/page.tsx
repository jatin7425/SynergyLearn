
'use client';

import PageHeader from '@/components/common/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { PlusCircle, Edit3, Trash2, BookOpen } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { useState } from 'react';
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
import { useToast } from '@/hooks/use-toast';

interface Note {
  id: string;
  title: string;
  date: string;
  summary: string;
  excerpt: string;
}

const initialNotes: Note[] = [
  { id: '1', title: 'Introduction to Quantum Physics', date: '2024-07-15', summary: 'Basic concepts of quantum mechanics, wave-particle duality...', excerpt: 'Quantum physics explores the very small...' },
  { id: '2', title: 'Advanced JavaScript Techniques', date: '2024-07-12', summary: 'Closures, prototypes, async/await, and performance optimization.', excerpt: 'JavaScript is a versatile language...' },
  { id: '3', title: 'The History of Ancient Rome', date: '2024-07-10', summary: 'From the founding of Rome to the fall of the Western Roman Empire.', excerpt: 'Ancient Rome a civilization that shaped...' },
];

export default function NotesPage() {
  const [notes, setNotes] = useState<Note[]>(initialNotes);
  const { toast } = useToast();

  const handleDeleteNote = (noteId: string, noteTitle: string) => {
    setNotes(currentNotes => currentNotes.filter(note => note.id !== noteId));
    toast({
      title: "Note Deleted",
      description: `"${noteTitle}" has been removed.`,
    });
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="My Notes"
        description="Organize your thoughts, ideas, and study materials."
        actions={
          <Link href="/notes/new" passHref>
            <Button>
              <PlusCircle className="mr-2 h-4 w-4" /> New Note
            </Button>
          </Link>
        }
      />

      {notes.length === 0 ? (
        <Card className="text-center">
          <CardHeader>
            <Image src="https://placehold.co/300x200.png" alt="Empty notes illustration" width={300} height={200} className="mx-auto mb-4 rounded-md" data-ai-hint="notebook empty" />
            <CardTitle>No Notes Yet!</CardTitle>
            <CardDescription>Start creating notes to organize your learning.</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/notes/new" passHref>
              <Button>
                <PlusCircle className="mr-2 h-4 w-4" /> Create Your First Note
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
          {notes.map((note) => (
            <Card key={note.id} className="flex flex-col">
              <CardHeader>
                <CardTitle className="hover:text-primary transition-colors">
                  <Link href={`/notes/${note.id}`}>{note.title}</Link>
                </CardTitle>
                <CardDescription>{note.date}</CardDescription>
              </CardHeader>
              <CardContent className="flex-grow">
                <p className="text-sm text-muted-foreground line-clamp-3">{note.excerpt}</p>
              </CardContent>
              <CardContent className="border-t pt-4 flex justify-between items-center">
                <Link href={`/notes/${note.id}/generate-flashcards`} passHref>
                  <Button variant="outline" size="sm">
                    <BookOpen className="mr-2 h-4 w-4" /> Flashcards/Quiz
                  </Button>
                </Link>
                <div className="flex gap-2">
                  <Link href={`/notes/${note.id}`} passHref>
                    <Button variant="ghost" size="icon" aria-label="Edit note">
                      <Edit3 className="h-4 w-4" />
                    </Button>
                  </Link>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" aria-label="Delete note">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This action cannot be undone. This will permanently delete the note titled "{note.title}".
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleDeleteNote(note.id, note.title)} className={Button({variant: "destructive"}).className}>
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
