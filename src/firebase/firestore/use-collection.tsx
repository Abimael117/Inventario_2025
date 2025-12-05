

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

  useEffect(() => {
    // If the query/ref is not ready, set a non-loading, empty state.
    if (!memoizedTargetRefOrQuery) {
      setData(null);
      setIsLoading(false);
      setError(null);
      return;
    }

    // Set loading state and reset previous data/errors.
    setIsLoading(true);
    setError(null);

    // Establish the real-time listener.
    const unsubscribe = onSnapshot(
      memoizedTargetRefOrQuery,
      (snapshot: QuerySnapshot<DocumentData>) => {
        // Map snapshot documents to a strongly-typed array with IDs.
        const results = snapshot.docs.map(doc => ({ ...(doc.data() as T), id: doc.id }));
        setData(results);
        setError(null); // Clear any previous errors on successful data receipt.
        setIsLoading(false);
      },
      (err: FirestoreError) => {
        // Handle Firestore-specific errors (like permission denied).
        console.error("Firestore onSnapshot error:", err);

        let path = 'unknown_path';
        try {
           // Attempt to extract the path for better error context.
          if (memoizedTargetRefOrQuery.type === 'collection') {
            path = (memoizedTargetRefOrQuery as CollectionReference).path;
          } else {
             path = (memoizedTargetRefOrQuery as unknown as InternalQuery)._query.path.canonicalString();
          }
        } catch (e) {
          console.error("Could not determine path for Firestore error:", e);
        }
        
        // Create a detailed, LLM-friendly permission error.
        const contextualError = new FirestorePermissionError({
          operation: 'list',
          path,
        });

        setError(contextualError);
        setData(null);
        setIsLoading(false);
        
        // Globally emit the error so it can be caught by an error boundary.
        errorEmitter.emit('permission-error', contextualError);
      }
    );

    // CRITICAL: Cleanup function.
    // This function is returned by useEffect and runs when the component unmounts
    // or when the `memoizedTargetRefOrQuery` dependency changes. This prevents memory leaks
    // and stops multiple listeners from being active.
    return () => {
      unsubscribe();
    };
  }, [memoizedTargetRefOrQuery]); // The effect re-runs ONLY if the memoized reference changes.

  return { data, isLoading, error };
}

