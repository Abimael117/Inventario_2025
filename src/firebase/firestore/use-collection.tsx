
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
import {isEqual} from 'lodash';

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
    // Prevent re-subscribing if the query is structurally identical but a different instance.
    if (isEqual(query, queryRef.current)) {
      return;
    }
    queryRef.current = query;
    
    if (!query) {
      setResult({ data: null, isLoading: false, error: null });
      return;
    }

    setResult({ data: null, isLoading: true, error: null });

    const unsubscribe = onSnapshot(
      query,
      (snapshot: QuerySnapshot<DocumentData>) => {
        const results = snapshot.docs.map(
          (doc) => ({ id: doc.id, ...doc.data() } as WithId<T>)
        );
        setResult({ data: results, isLoading: false, error: null });
      },
      (err: FirestoreError) => {
        let path = 'unknown_path';
        if ('path' in query) {
          path = (query as any).path;
        }
        
        const contextualError = new FirestorePermissionError({
          operation: 'list',
          path,
        });

        setResult({ data: null, isLoading: false, error: contextualError });
        errorEmitter.emit('permission-error', contextualError);
      }
    );

    // This cleanup function is guaranteed to run on unmount or before the effect re-runs.
    return () => unsubscribe();
  }, [query]); // The effect re-runs only when the query prop instance changes.

  return result;
}
