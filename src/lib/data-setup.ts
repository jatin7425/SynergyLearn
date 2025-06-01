
'use server'; // Can be called from server components/actions if needed, but here used from client.

import { db } from '@/lib/firebase';
import { doc, setDoc, serverTimestamp, Timestamp } from 'firebase/firestore';

export const AI_PROFILE_ID = 'AI_ASSISTANT_MAIN';
export const AI_PROFILE_COLLECTION = 'systemAgents';

export interface AIHelperProfile {
  id: string; // typically AI_PROFILE_ID
  name: string;
  avatarUrl: string;
  mentionTrigger: string; // e.g., "help_me"
  description: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export async function ensureAIHelperProfileExists(): Promise<{ success: boolean, message: string, profileId?: string }> {
  const profileData = {
    name: 'AI Helper',
    avatarUrl: 'https://placehold.co/40x40/7A2BF5/ffffff.png&text=AI', // Default AI avatar
    mentionTrigger: 'help_me', // The keyword to trigger AI via @mention
    description: 'The friendly and helpful AI assistant for SynergyLearn study rooms, invoked via @help_me.',
  };

  try {
    const profileRef = doc(db, AI_PROFILE_COLLECTION, AI_PROFILE_ID);
    // Using set with merge:true will create or update.
    // For creation, explicitly add createdAt.
    await setDoc(profileRef, { 
        ...profileData, 
        updatedAt: serverTimestamp(),
        // Add createdAt only if it's a new document (Firestore handles this with serverTimestamp on creation)
        // For simplicity with set and merge, we can just always set/update `updatedAt`.
        // If you need a strict "created only once" timestamp, you'd check if doc exists first.
        // For this "ensure" function, this is fine.
    }, { merge: true });

    // To ensure createdAt is set on first creation:
    // const docSnap = await getDoc(profileRef);
    // if (!docSnap.exists() || !docSnap.data()?.createdAt) {
    //    await updateDoc(profileRef, { createdAt: serverTimestamp() });
    // }
    // For now, just setting `updatedAt` is simpler for an "ensure" script.

    return { success: true, message: `AI Helper profile '${AI_PROFILE_ID}' ensured in '${AI_PROFILE_COLLECTION}'.`, profileId: AI_PROFILE_ID };
  } catch (error) {
    console.error("Error ensuring AI Helper profile:", error);
    return { success: false, message: `Failed to ensure AI Helper profile: ${(error as Error).message}` };
  }
}
