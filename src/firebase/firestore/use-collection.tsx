'use client';

import { useState, useEffect, useRef } from 'react';
import {
  Query,
  onSnapshot,
  DocumentData,
  FirestoreError,
  QuerySnapshot,
} from 'firebase/firestore';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

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
  const queryRef = useRef(memoizedQuery);

  useEffect(() => {
    // Only update the ref if the memoizedQuery has actually changed.
    // This comparison is key to preventing unnecessary re-subscriptions.
    if (queryRef.current !== memoizedQuery) {
        queryRef.current = memoizedQuery;
    }

    // If the query is not ready, reset the state and do nothing.
    if (!queryRef.current) {
      setIsLoading(false);
      setData(null);
      setError(null);
      return;
    }

    setIsLoading(true);

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

    // The cleanup function is called on unmount or before the effect re-runs.
    return () => {
      unsubscribe();
    };
  }, [memoizedQuery]); // The effect re-runs ONLY if the memoized query object itself changes.

  return { data, isLoading, error };
}
