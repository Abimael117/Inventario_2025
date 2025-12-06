'use client';

import { useState, useEffect } from 'react';
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

// Serialize a query to a stable string for useEffect dependency
function getQueryPath(query: Query<DocumentData>): string {
  // Use a combination of path and internal query constraints to create a unique key
  const path = (query as any)._query.path.segments.join('/');
  const constraints = (query as any)._query.explicitOrderBy.map((o: any) => `${o.field}${o.dir}`).join('');
  return `${path}|${constraints}`;
}

export function useCollection<T = DocumentData>(
  query: Query<DocumentData> | null | undefined
): UseCollectionResult<T> {
  const [result, setResult] = useState<UseCollectionResult<T>>({
    data: null,
    isLoading: true,
    error: null,
  });

  const queryPath = query ? getQueryPath(query) : null;

  useEffect(() => {
    if (!query || !queryPath) {
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
        const contextualError = new FirestorePermissionError({
          operation: 'list',
          path: queryPath.split('|')[0], // Get path part from serialized key
        });

        setResult({ data: null, isLoading: false, error: contextualError });
        errorEmitter.emit('permission-error', contextualError);
      }
    );

    // This is the crucial part: return the unsubscribe function.
    // React will call this function when the component unmounts or when
    // the dependency array changes, which prevents memory leaks.
    return () => unsubscribe();
  }, [queryPath]); // Depend on the stable, serialized query path

  return result;
}