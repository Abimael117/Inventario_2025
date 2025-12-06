
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
    if (isEqual(queryRef.current, query)) {
      return;
    }
    queryRef.current = query;
    
    if (!query) {
      setResult({ data: null, isLoading: false, error: null });
      return;
    }

    setResult(prev => ({ ...prev, isLoading: true, error: null }));

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

    return () => unsubscribe();
  }, [query]);

  return result;
}
