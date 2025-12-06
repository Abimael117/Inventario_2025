'use client';

import { useState, useEffect } from 'react';
import {
  DocumentReference,
  onSnapshot,
  DocumentData,
  FirestoreError,
  DocumentSnapshot,
} from 'firebase/firestore';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

export type WithId<T> = T & { id: string };

export interface UseDocResult<T> {
  data: WithId<T> | null;
  isLoading: boolean;
  error: FirestoreError | Error | null;
}

export function useDoc<T = any>(
  docRef: DocumentReference<DocumentData> | null | undefined
): UseDocResult<T> {
  const [result, setResult] = useState<UseDocResult<T>>({
    data: null,
    isLoading: true,
    error: null,
  });
  
  const docPath = docRef?.path;

  useEffect(() => {
    if (!docRef || !docPath) {
      setResult({ data: null, isLoading: false, error: null });
      return;
    }

    setResult(prev => ({ ...prev, isLoading: true, error: null }));

    const unsubscribe = onSnapshot(
      docRef,
      (snapshot: DocumentSnapshot<DocumentData>) => {
        if (snapshot.exists()) {
          setResult({
             data: { ...(snapshot.data() as T), id: snapshot.id },
             isLoading: false,
             error: null
          });
        } else {
          setResult({ data: null, isLoading: false, error: null });
        }
      },
      (err: FirestoreError) => {
        const contextualError = new FirestorePermissionError({
          operation: 'get',
          path: docRef.path,
        });
        setResult({ data: null, isLoading: false, error: contextualError });
        errorEmitter.emit('permission-error', contextualError);
      }
    );

    // This is the crucial part: return the unsubscribe function.
    // React will call this function when the component unmounts or when
    // the dependency array changes, which prevents memory leaks.
    return () => unsubscribe();
  }, [docPath]); // Depend only on the stable path string

  return result;
}