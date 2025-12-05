

'use client';

import { useState, useEffect, useRef } from 'react';
import {
  Query,
  onSnapshot,
  DocumentData,
  FirestoreError,
  QuerySnapshot,
  CollectionReference,
  Unsubscribe,
} from 'firebase/firestore';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

export type WithId<T> = T & { id: string };

export interface UseCollectionResult<T> {
  data: WithId<T>[] | null;
  isLoading: boolean;
  error: FirestoreError | Error | null;
}

interface InternalQuery extends Query<DocumentData> {
  _query: {
    path: {
      canonicalString(): string;
      toString(): string;
    }
  }
}

/**
 * React hook to subscribe to a Firestore collection or query in real-time.
 * Handles nullable references/queries.
 *
 * IMPORTANT! YOU MUST MEMOIZE the inputted memoizedTargetRefOrQuery, for example with `useMemoFirebase`.
 * If the reference is created inline, it will cause an infinite render loop.
 *
 * @template T Optional type for document data. Defaults to any.
 * @param {CollectionReference<DocumentData> | Query<DocumentData> | null | undefined} memoizedTargetRefOrQuery -
 * The Firestore CollectionReference or Query. Must be memoized.
 * @returns {UseCollectionResult<T>} Object with data, isLoading, error.
 */
export function useCollection<T = any>(
    memoizedTargetRefOrQuery: (CollectionReference<DocumentData> | Query<DocumentData>) | null | undefined,
): UseCollectionResult<T> {
  type ResultItemType = WithId<T>;
  type StateDataType = ResultItemType[] | null;

  const [data, setData] = useState<StateDataType>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<FirestoreError | Error | null>(null);

  // Use a ref to hold the unsubscribe function to ensure it's stable across renders
  const unsubscribeRef = useRef<Unsubscribe | null>(null);

  useEffect(() => {
    // If a previous subscription exists, unsubscribe from it before creating a new one.
    if (unsubscribeRef.current) {
      unsubscribeRef.current();
      unsubscribeRef.current = null;
    }

    // If no query is provided, reset the state and do nothing further.
    if (!memoizedTargetRefOrQuery) {
      setData(null);
      setIsLoading(false);
      setError(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    // Establish the new real-time listener and store its unsubscribe function in the ref.
    unsubscribeRef.current = onSnapshot(
      memoizedTargetRefOrQuery,
      (snapshot: QuerySnapshot<DocumentData>) => {
        const results = snapshot.docs.map(doc => ({ ...(doc.data() as T), id: doc.id }));
        setData(results);
        setError(null);
        setIsLoading(false);
      },
      (err: FirestoreError) => {
        console.error("Firestore onSnapshot error:", err);
        let path = 'unknown_path';
        try {
          if (memoizedTargetRefOrQuery.type === 'collection') {
            path = (memoizedTargetRefOrQuery as CollectionReference).path;
          } else {
             path = (memoizedTargetRefOrQuery as unknown as InternalQuery)._query.path.canonicalString();
          }
        } catch (e) {
          console.error("Could not determine path for Firestore error:", e);
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

    // The cleanup function for the effect.
    // This will be called when the component unmounts or BEFORE the effect runs again.
    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
    };
  }, [memoizedTargetRefOrQuery]); // The effect re-runs ONLY if the memoized reference itself changes.

  return { data, isLoading, error };
}
