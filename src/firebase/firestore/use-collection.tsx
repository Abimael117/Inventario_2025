
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
import { isEqual } from 'lodash';

export type WithId<T> = T & { id: string };

export interface UseCollectionResult<T> {
  data: WithId<T>[] | null;
  isLoading: boolean;
  error: FirestoreError | Error | null;
}

export function useCollection<T = DocumentData>(
  memoizedQuery: Query<DocumentData> | null | undefined
): UseCollectionResult<T> {
  const [result, setResult] = useState<UseCollectionResult<T>>({
    data: null,
    isLoading: true,
    error: null,
  });

  // Use a ref to store the query to prevent re-subscribing on every render.
  const queryRef = useRef<Query<DocumentData> | null | undefined>();

  useEffect(() => {
    // Only resubscribe if the query has actually changed.
    // This is critical to prevent memory leaks and unnecessary listeners.
    if (isEqual(queryRef.current, memoizedQuery)) {
      return;
    }
    queryRef.current = memoizedQuery;

    if (!memoizedQuery) {
      setResult({ data: null, isLoading: false, error: null });
      return;
    }
    
    // Set loading state to true whenever a new query is provided.
    setResult({ data: null, isLoading: true, error: null });

    const unsubscribe = onSnapshot(
      memoizedQuery,
      (snapshot: QuerySnapshot<DocumentData>) => {
        const results = snapshot.docs.map(
          (doc) => ({ id: doc.id, ...doc.data() } as WithId<T>)
        );
        setResult({ data: results, isLoading: false, error: null });
      },
      (err: FirestoreError) => {
        let path = 'unknown_path';
        if ('path' in memoizedQuery) {
          path = (memoizedQuery as any).path;
        }
        
        const contextualError = new FirestorePermissionError({
          operation: 'list',
          path,
        });

        setResult({ data: null, isLoading: false, error: contextualError });
        errorEmitter.emit('permission-error', contextualError);
      }
    );

    // This is the cleanup function that will be called when the component unmounts
    // or when the memoizedQuery dependency changes, preventing memory leaks.
    return () => unsubscribe();
  }, [memoizedQuery]); // The effect depends only on the memoized query.

  return result;
}
