'use client';

import PageHeader from '@/components/common/page-header';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BookOpen, Save, Loader2, Share2 } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';

// Mock note data fetching
const fetchNoteData = async (id: string) => {
  // Simulate API call
  await new Promise(resolve => setTimeout(resolve, 500));
  if (id === 'new') {
    return { title: '', content: '', date: new Date().toISOString().split('T')[0] };
  }
  // In a real app, fetch from a database
  const mockNotes: Record<string, { title: string, content: string, date: string }> = {
    '1': { title: 'Introduction to Quantum Physics', content: 'Quantum mechanics is a fundamental theory in physics that provides a description of the physical properties of nature at the scale of atoms and subatomic particles. It is the foundation of all quantum physics including quantum chemistry, quantum field theory, quantum technology, and quantum information science.', date: '2024-07-15' },
    '2': { title: 'Advanced JavaScript Techniques', content: '## Closures\nA closure is the combination of a function bundled together (enclosed) with references to its surrounding state (the lexical environment). In other words, a closure gives you access to an outer function’s scope from an inner function.\n\n## Async/Await\nAsync/await is syntactic sugar for Promises, making asynchronous code look and behave a bit more like synchronous code.', date: '2024-07-12' },
  };
  return mockNotes[id] || null;
};


export default function NoteDetailPage({ params }: { params: { id: string } }) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [date, setDate] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (params.id) {
      setIsLoading(true);
      fetchNoteData(params.id).then(data => {
        if (data) {
          setTitle(data.title);
          setContent(data.content);
          setDate(data.date);
        } else {
          toast({ title: "Note not found", variant: "destructive" });
          // redirect or show error
        }
        setIsLoading(false);
      });
    }
  }, [params.id, toast]);

  const handleSaveNote = async () => {
    setIsSaving(true);
    // Simulate saving
    await new Promise(resolve => setTimeout(resolve, 1000));
    console.log('Saving note:', { title, content, date });
    toast({ title: "Note Saved!", description: `"${title}" has been saved successfully.` });
    setIsSaving(false);
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={params.id === 'new' ? 'Create New Note' : title || 'Edit Note'}
        description={params.id === 'new' ? 'Craft your new note here.' : `Last updated: ${date}`}
        actions={
          <div className="flex gap-2">
            <Button onClick={handleSaveNote} disabled={isSaving}>
              {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              {isSaving ? 'Saving...' : 'Save Note'}
            </Button>
             <Link href={`/notes/${params.id}/generate-flashcards`} passHref>
                <Button variant="outline">
                    <BookOpen className="mr-2 h-4 w-4" /> Flashcards/Quiz
                </Button>
            </Link>
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
              className="text-2xl font-headline font-semibold border-0 shadow-none focus-visible:ring-0 px-1 h-auto"
            />
          </div>
          <div>
            <Textarea
              placeholder="Start writing your note here... Markdown is supported!"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="min-h-[400px] text-base leading-relaxed focus-visible:ring-primary/50"
              rows={15}
            />
          </div>
        </CardContent>
         <CardContent className="border-t pt-4 pb-4">
            <p className="text-sm text-muted-foreground">
                Use Markdown for formatting (e.g., `# Heading`, `**bold**`, `*italic*`, `- list item`). Live preview coming soon.
            </p>
        </CardContent>
      </Card>
      
      {params.id !== 'new' && (
        <Card>
            <CardHeader>
                <CardTitle>Note Actions</CardTitle>
            </CardHeader>
            <CardContent className="flex gap-2">
                <Button variant="outline">
                    <Share2 className="mr-2 h-4 w-4" /> Share (Not implemented)
                </Button>
            </CardContent>
        </Card>
      )}
    </div>
  );
}
