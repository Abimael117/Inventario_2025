
'use client';

import { useState, useEffect, useRef } from 'react';
import {
  DocumentReference,
  onSnapshot,
  DocumentData,
  FirestoreError,
  DocumentSnapshot,
} from 'firebase/firestore';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { isEqual } from 'lodash';

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

  const docRefRef = useRef<DocumentReference<DocumentData> | null | undefined>(null);

  useEffect(() => {
    // Only proceed if the docRef has changed. `isEqual` performs a deep comparison.
    if (isEqual(docRefRef.current, docRef)) {
      return;
    }
    docRefRef.current = docRef;

    // If the docRef is null or undefined, reset the state and do nothing.
    if (!docRef) {
      setResult({ data: null, isLoading: false, error: null });
      return;
    }

    // Set loading state and clear previous errors.
    setResult(prevState => ({ ...prevState, isLoading: true, error: null }));

    // Set up the real-time listener.
    const unsubscribe = onSnapshot(
      docRef,
      (snapshot: DocumentSnapshot<DocumentData>) => {
        if (snapshot.exists()) {
          // If the document exists, update state with its data.
          setResult({
             data: { ...(snapshot.data() as T), id: snapshot.id },
             isLoading: false,
             error: null
          });
        } else {
          // If the document doesn't exist, reset data and stop loading.
          setResult({ data: null, isLoading: false, error: null });
        }
      },
      (err: FirestoreError) => {
        // On error, create a contextual error and emit it globally.
        const contextualError = new FirestorePermissionError({
          operation: 'get',
          path: docRef.path,
        });

        // Update local state with the error and stop loading.
        setResult({ data: null, isLoading: false, error: contextualError });
        errorEmitter.emit('permission-error', contextualError);
      }
    );
    // Return the unsubscribe function to be called on component unmount or docRef change.
    return () => unsubscribe();
  }, [docRef]);

  return result;
}
