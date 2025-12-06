
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
    // Prevent re-subscribing if the docRef is structurally identical.
    if (docRef && isEqual(docRefRef.current, docRef)) {
      return;
    }
    docRefRef.current = docRef;

    if (!docRef) {
      setResult({ data: null, isLoading: false, error: null });
      return;
    }

    setResult(prevState => ({ ...prevState, isLoading: true, error: null }));

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
          // If the document does not exist, treat it as "not loading" and no data.
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

    // Cleanup subscription on unmount or before the effect re-runs.
    return () => unsubscribe();
  }, [docRef]); // Re-run effect only when the docRef object instance changes

  return result;
}
