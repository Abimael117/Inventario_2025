
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
  query: Query<DocumentData> | null | undefined
): UseCollectionResult<T> {
  const [result, setResult] = useState<UseCollectionResult<T>>({
    data: null,
    isLoading: true,
    error: null,
  });

  const queryRef = useRef<Query<DocumentData> | null | undefined>(null);

  useEffect(() => {
    // Only proceed if the query has changed. `isEqual` performs a deep comparison.
    if (isEqual(queryRef.current, query)) {
      return;
    }
    queryRef.current = query;
    
    // If the query is null or undefined, reset the state and do nothing.
    if (!query) {
      setResult({ data: null, isLoading: false, error: null });
      return;
    }

    // Set loading state and clear previous errors.
    setResult(prev => ({ ...prev, isLoading: true, error: null }));

    // Set up the real-time listener.
    const unsubscribe = onSnapshot(
      query,
      (snapshot: QuerySnapshot<DocumentData>) => {
        // Map the documents to include their IDs.
        const results = snapshot.docs.map(
          (doc) => ({ id: doc.id, ...doc.data() } as WithId<T>)
        );
        setResult({ data: results, isLoading: false, error: null });
      },
      (err: FirestoreError) => {
        // On error, create a contextual error and emit it globally.
        let path = 'unknown_path';
        if ('path' in query) {
          path = (query as any).path;
        }
        
        const contextualError = new FirestorePermissionError({
          operation: 'list',
          path,
        });

        // Update local state with the error and stop loading.
        setResult({ data: null, isLoading: false, error: contextualError });
        errorEmitter.emit('permission-error', contextualError);
      }
    );

    // Return the unsubscribe function to be called on component unmount or query change.
    return () => unsubscribe();
  }, [query]);

  return result;
}
