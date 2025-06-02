
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
import { Loader2, Save, AlertCircle, Brain, ShieldAlert } from 'lucide-react';

const MODEL_CONFIG_PATH = 'adminConfig/modelSelection';

// !!! IMPORTANT: For a real application, replace this with your actual admin UID !!!
// This is a placeholder for client-side prototype demonstration.
// Secure admin access should be managed via backend logic or Firebase Custom Claims and Firestore Rules.
const ADMIN_UID = 'REPLACE_WITH_YOUR_ADMIN_USER_ID';

export default function ModelSettingsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const { toast } = useToast();

  const [currentModelId, setCurrentModelId] = useState('');
  const [newModelId, setNewModelId] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isAuthorizedAdmin, setIsAuthorizedAdmin] = useState(false);

  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      toast({ title: "Authentication Required", description: "Please log in to access admin settings.", variant: "destructive" });
      router.push(`/login?redirect=${pathname}`);
      return;
    }

    if (user.uid === ADMIN_UID) {
      setIsAuthorizedAdmin(true);
      const fetchModelConfig = async () => {
        setIsLoading(true);
        try {
          const configDocRef = doc(db, MODEL_CONFIG_PATH);
          const docSnap = await getDoc(configDocRef);
          if (docSnap.exists() && docSnap.data()?.activeModelId) {
            const fetchedModelId = docSnap.data()?.activeModelId;
            setCurrentModelId(fetchedModelId);
            setNewModelId(fetchedModelId);
          } else {
            setCurrentModelId('');
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
    } else {
      setIsAuthorizedAdmin(false);
      setIsLoading(false); // No data to load if not admin
      toast({ title: "Access Denied", description: "You are not authorized to view this page.", variant: "destructive" });
      // Optionally redirect or show an access denied message. For now, the page content will reflect this.
    }
  }, [user, authLoading, router, pathname, toast]);

  const handleSaveModelId = async (e: FormEvent) => {
    e.preventDefault();
    if (!user || !isAuthorizedAdmin) {
      toast({ title: "Authorization Error", description: "You are not authorized to perform this action.", variant: "destructive" });
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
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4 text-center">
        <AlertCircle className="w-16 h-16 text-destructive mb-4" />
        <h1 className="text-2xl font-bold mb-2">Authentication Required</h1>
        <p className="text-muted-foreground mb-4">You need to be logged in to access this area.</p>
        <Button onClick={() => router.push(`/login?redirect=${pathname}`)}>Go to Login</Button>
      </div>
    );
  }

  if (!isAuthorizedAdmin) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Admin: AI Model Configuration"
          description="Set the globally active AI model for compatible flows."
        />
        <Card className="border-destructive">
          <CardHeader>
            <CardTitle className="flex items-center text-destructive">
              <ShieldAlert className="mr-2 h-5 w-5" />
              Access Denied
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-destructive-foreground">You do not have permission to access this page. Please contact the site administrator if you believe this is an error.</p>
            <p className="text-sm text-muted-foreground mt-2">
              To enable admin access for this prototype, update the `ADMIN_UID` constant in `src/app/admin/model-settings/page.tsx` with your Firebase User ID.
            </p>
            <Button variant="outline" onClick={() => router.push('/')} className="mt-4">
              Go to Dashboard
            </Button>
          </CardContent>
        </Card>
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
              <p className="text-xs text-destructive mt-1">
                Ensure the chosen model provider (e.g., Ollama plugin) is active in `src/ai/genkit.ts` if not a default Google AI model.
                For Hugging Face, ensure `LOCAL_HUGGING_FACE_API_URL` or `HUGGING_FACE_API_KEY` is set in `.env` and the flow supports it.
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
             <p className="mt-3"><strong>Hugging Face (Requires API Key/Local Setup):</strong></p>
            <ul className="list-disc list-inside pl-4 text-muted-foreground">
                <li><code>deepseek-ai/deepseek-llm-7b-chat</code></li>
                <li><code>deepseek-ai/deepseek-llm-67b-chat</code></li>
                <li>Other models from Hugging Face Hub (e.g., <code>mistralai/Mistral-7B-Instruct-v0.1</code>)</li>
                <li><em className="text-xs">Ensure flows are set up to call HF models via local proxy or public Inference API.</em></li>
            </ul>
        </CardContent>
      </Card>
    </div>
  );
}
