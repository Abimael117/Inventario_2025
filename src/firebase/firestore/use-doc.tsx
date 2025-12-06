
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

  // docRef can be unstable across renders. We use its path as a stable dependency.
  const docPath = docRef ? docRef.path : null;

  useEffect(() => {
    if (!docRef) {
      setResult({ data: null, isLoading: false, error: null });
      return;
    }

    setResult(prev => ({ ...prev, isLoading: true }));

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

    // This cleanup function is called when the component unmounts
    // or when the dependencies of the effect change.
    return () => unsubscribe();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [docPath]); // Depend only on the stable path of the document reference

  return result;
}
