'use client';

import { useState, useEffect, useRef } from 'react';
import {
  Query,
  onSnapshot,
  DocumentData,
  FirestoreError,
  QuerySnapshot,
  collection,
  query,
} from 'firebase/firestore';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { useFirestore } from '@/firebase/provider';

export type WithId<T> = T & { id: string };

export interface UseCollectionResult<T> {
  data: WithId<T>[] | null;
  isLoading: boolean;
  error: FirestoreError | Error | null;
}

export function useCollection<T = DocumentData>(
  memoizedQuery: Query<DocumentData> | null | undefined
): UseCollectionResult<T> {
  const [data, setData] = useState<WithId<T>[] | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<FirestoreError | Error | null>(null);
  
  // Use a ref to store the query to prevent re-subscribing on every render.
  // This is a key part of the fix to avoid stale closures and unnecessary re-runs.
  const queryRef = useRef(memoizedQuery);
  queryRef.current = memoizedQuery;

  useEffect(() => {
    // If the query is not ready, reset the state and do nothing.
    if (!queryRef.current) {
      setIsLoading(false);
      setData(null);
      setError(null);
      return;
    }

    setIsLoading(true);

    // CRITICAL: onSnapshot returns an unsubscribe function.
    // This function MUST be called when the component unmounts
    // or when the query changes, to prevent memory leaks and duplicate listeners.
    const unsubscribe = onSnapshot(
      queryRef.current,
      (snapshot: QuerySnapshot<DocumentData>) => {
        const results = snapshot.docs.map(
          (doc) => ({ id: doc.id, ...doc.data() } as WithId<T>)
        );
        setData(results);
        setError(null);
        setIsLoading(false);
      },
      (err: FirestoreError) => {
        let path = 'unknown_path';
        if (queryRef.current && 'path' in queryRef.current) {
          path = (queryRef.current as any).path;
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

    // The cleanup function that gets called on unmount or before re-running the effect.
    // This is the most important part of the fix.
    return () => {
      unsubscribe();
    };
  }, [memoizedQuery]); // The effect re-runs ONLY if the memoized query object itself changes.

  return { data, isLoading, error };
}
