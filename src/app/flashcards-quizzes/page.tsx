
import PageHeader from '@/components/common/page-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BookOpen, FileQuestion, Eye } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import Image from 'next/image';

// Mock data for collections
const collections = [
  { id: 'col1', title: 'Quantum Physics Basics', type: 'Flashcards', itemCount: 25, sourceNoteId: '1', sourceNoteTitle: 'Introduction to Quantum Physics' },
  { id: 'col2', title: 'JavaScript Advanced Quiz', type: 'Quiz', itemCount: 15, sourceNoteId: '2', sourceNoteTitle: 'Advanced JavaScript Techniques' },
  { id: 'col3', title: 'Roman History Review', type: 'Flashcards', itemCount: 50, sourceNoteId: '3', sourceNoteTitle: 'The History of Ancient Rome' },
];

export default function FlashcardsQuizzesPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="My Flashcards & Quizzes"
        description="Review your generated study materials."
      />

      {collections.length === 0 ? (
        <Card className="text-center">
           <CardHeader>
            <Image src="https://placehold.co/300x200.png" alt="Empty flashcards illustration" width={300} height={200} className="mx-auto mb-4 rounded-md" data-ai-hint="study empty" />
            <CardTitle>No Collections Yet!</CardTitle>
            <CardDescription>Generate flashcards or quizzes from your notes to start studying.</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/notes" passHref>
              <Button>Go to Notes</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {collections.map((collection) => (
            <Card key={collection.id} className="flex flex-col">
              <CardHeader>
                <div className="flex items-center gap-2 mb-2">
                  {collection.type === 'Flashcards' ? <BookOpen className="h-5 w-5 text-primary" /> : <FileQuestion className="h-5 w-5 text-accent" />}
                  <CardTitle>{collection.title}</CardTitle>
                </div>
                <CardDescription>
                  {collection.itemCount} {collection.type === 'Flashcards' ? 'cards' : 'questions'}.
                  Generated from: <Link href={`/notes/${collection.sourceNoteId}`} className="text-primary hover:underline">{collection.sourceNoteTitle}</Link>
                </CardDescription>
              </CardHeader>
              <CardContent className="flex-grow">
                {/* Placeholder for a preview or more details */}
                <p className="text-sm text-muted-foreground">
                  Ready to review? Click below to start.
                </p>
              </CardContent>
              <CardContent className="border-t pt-4">
                {/* This link should ideally go to a specific review page for this collection */}
                <Link href={`/notes/${collection.sourceNoteId}/generate-flashcards`} passHref>
                  <Button className="w-full">
                    <Eye className="mr-2 h-4 w-4" /> View Collection
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
