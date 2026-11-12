import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut as firebaseSignOut,
  Auth,
  User,
  onAuthStateChanged
} from 'firebase/auth';
import {
  getFirestore,
  Firestore,
  doc,
  getDocFromServer,
} from 'firebase/firestore';
import { FirebaseClientConfig } from '../types/index.ts';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

const STORAGE_KEY = 'cookie_business_firebase_config';

// Configuración centralizada y permanente del proyecto ildolce-ba7d0
export const DEFAULT_FIREBASE_CONFIG: FirebaseClientConfig = {
  apiKey: (import.meta.env.VITE_FIREBASE_API_KEY as string) || 'AIzaSyCmBl4vM9O0rQAB6d5Q3ZIy6xRhCQTblFs',
  authDomain: (import.meta.env.VITE_FIREBASE_AUTH_DOMAIN as string) || 'ildolce-ba7d0.firebaseapp.com',
  projectId: (import.meta.env.VITE_FIREBASE_PROJECT_ID as string) || 'ildolce-ba7d0',
  storageBucket: (import.meta.env.VITE_FIREBASE_STORAGE_BUCKET as string) || 'ildolce-ba7d0.firebasestorage.app',
  messagingSenderId: (import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID as string) || '143794028299',
  appId: (import.meta.env.VITE_FIREBASE_APP_ID as string) || '1:143794028299:web:2ca73159aba908ee19ac0e',
  firestoreDatabaseId: (import.meta.env.VITE_FIREBASE_DATABASE_ID as string) || '(default)',
};

export function getStoredFirebaseConfig(): FirebaseClientConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && parsed.apiKey && parsed.projectId) {
        return parsed;
      }
    }
  } catch (e) {
    console.error('Error reading stored Firebase config', e);
  }
  return DEFAULT_FIREBASE_CONFIG;
}

export function saveStoredFirebaseConfig(config: FirebaseClientConfig): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
}

export function clearStoredFirebaseConfig(): void {
  localStorage.removeItem(STORAGE_KEY);
}

let currentApp: FirebaseApp | null = null;
let currentAuth: Auth | null = null;
let currentDb: Firestore | null = null;

export function initFirebaseService(customConfig?: FirebaseClientConfig | null): {
  app: FirebaseApp | null;
  auth: Auth | null;
  db: Firestore | null;
} {
  const config = customConfig || getStoredFirebaseConfig();

  if (!config || !config.apiKey || !config.projectId) {
    return { app: null, auth: null, db: null };
  }

  try {
    if (getApps().length > 0) {
      currentApp = getApp();
    } else {
      currentApp = initializeApp(config);
    }

    currentAuth = getAuth(currentApp);
    currentDb = getFirestore(currentApp, config.firestoreDatabaseId || '(default)');

    return { app: currentApp, auth: currentAuth, db: currentDb };
  } catch (err) {
    console.error('Failed to initialize Firebase with provided config:', err);
    return { app: null, auth: null, db: null };
  }
}

export function getFirebaseInstances() {
  if (!currentApp || !currentAuth || !currentDb) {
    return initFirebaseService();
  }
  return { app: currentApp, auth: currentAuth, db: currentDb };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const authInstance = currentAuth;
  const currentUser = authInstance?.currentUser;

  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: currentUser?.uid,
      email: currentUser?.email,
      emailVerified: currentUser?.emailVerified,
      isAnonymous: currentUser?.isAnonymous,
      tenantId: currentUser?.tenantId,
      providerInfo: currentUser?.providerData?.map((p) => ({
        providerId: p.providerId,
        email: p.email,
      })) || [],
    },
    operationType,
    path,
  };

  console.error('Firestore Error:', JSON.stringify(errInfo, null, 2));
  throw new Error(JSON.stringify(errInfo));
}

export async function testFirestoreConnection(db: Firestore, userId: string): Promise<boolean> {
  try {
    // Attempt to read the user's root document or a test check
    await getDocFromServer(doc(db, 'users', userId));
    return true;
  } catch (error: any) {
    if (error?.message?.includes('the client is offline')) {
      console.warn('Firestore is offline or unreachable.');
    }
    // If it's a "Missing or insufficient permissions" or network error, let caller know
    return false;
  }
}

export async function loginWithGoogle(auth: Auth): Promise<User> {
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });
  const result = await signInWithPopup(auth, provider);
  return result.user;
}

export async function logoutUser(auth: Auth): Promise<void> {
  await firebaseSignOut(auth);
}

export { onAuthStateChanged };
