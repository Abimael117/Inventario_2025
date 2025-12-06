'use client';

import { useState, useEffect } from 'react';
import {
  Query,
  onSnapshot,
  DocumentData,
  FirestoreError,
  QuerySnapshot,
  CollectionReference,
} from 'firebase/firestore';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

export type WithId<T> = T & { id: string };

export interface UseCollectionResult<T> {
  data: WithId<T>[] | null;
  isLoading: boolean;
  error: FirestoreError | Error | null;
}

export function useCollection<T = any>(
  memoizedTargetRefOrQuery:
    | (CollectionReference<DocumentData> | Query<DocumentData>)
    | null
    | undefined
): UseCollectionResult<T> {
  const [data, setData] = useState<WithId<T>[] | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<FirestoreError | Error | null>(null);

  useEffect(() => {
    // Reset state and do nothing if the query is not ready
    if (!memoizedTargetRefOrQuery) {
      setIsLoading(false);
      setData(null);
      setError(null);
      return;
    }
    
    setIsLoading(true);

    // Set up the snapshot listener
    const unsubscribe = onSnapshot(
      memoizedTargetRefOrQuery,
      (snapshot: QuerySnapshot<DocumentData>) => {
        const results = snapshot.docs.map((doc) => ({
          ...(doc.data() as T),
          id: doc.id,
        }));
        setData(results);
        setError(null);
        setIsLoading(false);
      },
      (err: FirestoreError) => {
        let path = 'unknown_path';
        try {
          if ('path' in memoizedTargetRefOrQuery) {
            path = (memoizedTargetRefOrQuery as CollectionReference).path;
          }
        } catch (e) {
          // Could not determine path, but still emit the error
        }

        const contextualError = new FirestorePermissionError({
          operation: 'list',
          path,
        });

        setError(contextualError);
        setData(null);
        setIsLoading(false);
        errorEmitter.emit('permission-error', contextualError);
      }
    );

    // CRITICAL: Return the unsubscribe function to be called on cleanup.
    // This prevents memory leaks and duplicate listeners.
    return () => unsubscribe();
  }, [memoizedTargetRefOrQuery]); // Re-run effect only when the query itself changes

  return { data, isLoading, error };
}
