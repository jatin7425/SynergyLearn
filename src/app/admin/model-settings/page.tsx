
'use client';

import { useState, useEffect, type FormEvent } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter, usePathname } from 'next/navigation';
import PageHeader from '@/components/common/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { db } from '@/lib/firebase';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { Loader2, Save, AlertCircle, Brain } from 'lucide-react';

const MODEL_CONFIG_PATH = 'adminConfig/modelSelection';

export default function ModelSettingsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const { toast } = useToast();

  const [currentModelId, setCurrentModelId] = useState('');
  const [newModelId, setNewModelId] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      toast({ title: "Authentication Required", description: "Please log in to access admin settings.", variant: "destructive" });
      router.push(`/login?redirect=${pathname}`);
      return;
    }
    // Add admin role check here in a real app

    if (user) {
      const fetchModelConfig = async () => {
        setIsLoading(true);
        try {
          const configDocRef = doc(db, MODEL_CONFIG_PATH);
          const docSnap = await getDoc(configDocRef);
          if (docSnap.exists() && docSnap.data()?.activeModelId) {
            const fetchedModelId = docSnap.data()?.activeModelId;
            setCurrentModelId(fetchedModelId);
            setNewModelId(fetchedModelId); // Initialize input with current value
          } else {
            setCurrentModelId(''); // No model configured yet
            setNewModelId('');
          }
        } catch (error) {
          console.error("Error fetching model config:", error);
          toast({ title: "Error loading config", description: (error as Error).message, variant: "destructive" });
        } finally {
          setIsLoading(false);
        }
      };
      fetchModelConfig();
    }
  }, [user, authLoading, router, pathname, toast]);

  const handleSaveModelId = async (e: FormEvent) => {
    e.preventDefault();
    if (!user) {
      toast({ title: "Authentication Error", variant: "destructive" });
      return;
    }
    if (!newModelId.trim()) {
      toast({ title: "Model ID cannot be empty", variant: "destructive" });
      return;
    }

    setIsSaving(true);
    try {
      const configDocRef = doc(db, MODEL_CONFIG_PATH);
      await setDoc(configDocRef, {
        activeModelId: newModelId.trim(),
        updatedAt: serverTimestamp(),
        updatedBy: user.uid,
      }, { merge: true });
      setCurrentModelId(newModelId.trim());
      toast({ title: "Model Configuration Saved", description: `Active model set to: ${newModelId.trim()}` });
    } catch (error) {
      console.error("Error saving model config:", error);
      toast({ title: "Error saving config", description: (error as Error).message, variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  if (authLoading || isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    // This case should be handled by the useEffect redirect, but as a fallback
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
        title="Admin: AI Model Configuration"
        description="Set the globally active AI model for compatible flows."
      />
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Brain className="mr-2 h-5 w-5 text-primary" />
            Global AI Model Setting
          </CardTitle>
          <CardDescription>
            Currently active model: <strong>{currentModelId || 'Not Set (Using Flow Defaults)'}</strong>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSaveModelId} className="space-y-4">
            <div>
              <Label htmlFor="model-id">Active Model ID</Label>
              <Input
                id="model-id"
                value={newModelId}
                onChange={(e) => setNewModelId(e.target.value)}
                placeholder="e.g., googleai/gemini-2.0-flash, ollama/llama3, your-org/your-hf-model"
                disabled={isSaving}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Enter the full model identifier. For Google: `googleai/model-name`. For Ollama: `ollama/model-name`. For Hugging Face: `org/model-name`.
              </p>
            </div>
            <Button type="submit" className="w-full md:w-auto" disabled={isSaving}>
              {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              Save Configuration
            </Button>
          </form>
        </CardContent>
      </Card>
       <Card>
        <CardHeader>
            <CardTitle>Available Model Types & Examples</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
            <p><strong>Google AI (Genkit Built-in):</strong></p>
            <ul className="list-disc list-inside pl-4 text-muted-foreground">
                <li><code>googleai/gemini-2.0-flash</code> (Fast, good for general tasks)</li>
                <li><code>googleai/gemini-pro</code> (More capable)</li>
                <li><code>googleai/gemini-1.5-flash-latest</code></li>
                <li><code>googleai/gemini-1.5-pro-latest</code></li>
            </ul>
            <p className="mt-3"><strong>Ollama (Requires Ollama server & Genkit plugin):</strong></p>
            <ul className="list-disc list-inside pl-4 text-muted-foreground">
                <li><code>ollama/llama3</code> (Or other models you've pulled, e.g., `ollama/mistral`)</li>
            </ul>
             <p className="mt-3"><strong>Hugging Face (Requires custom integration or specific Genkit plugin):</strong></p>
            <ul className="list-disc list-inside pl-4 text-muted-foreground">
                <li><code>deepseek-ai/deepseek-llm-7b-chat</code></li>
                <li><code>deepseek-ai/deepseek-llm-67b-chat</code></li>
                <li>Other models from Hugging Face Hub (e.g., <code>mistralai/Mistral-7B-Instruct-v0.1</code>)</li>
                <li><em className="text-xs">Note: Using Hugging Face models typically requires direct API calls with an API key. Genkit's default `ai.generate` might not work directly with these IDs unless a specific HF plugin is configured.</em></li>
            </ul>
        </CardContent>
      </Card>
    </div>
  );
}
