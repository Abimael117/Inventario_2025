
'use client';

import { useState, useEffect, useRef } from 'react';
import {
  DocumentReference,
  onSnapshot,
  DocumentData,
  FirestoreError,
  DocumentSnapshot,
} from 'firebase/firestore';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { isEqual } from 'lodash';

export type WithId<T> = T & { id: string };

export interface UseDocResult<T> {
  data: WithId<T> | null;
  isLoading: boolean;
  error: FirestoreError | Error | null;
}

export function useDoc<T = any>(
  memoizedDocRef: DocumentReference<DocumentData> | null | undefined
): UseDocResult<T> {
  const [result, setResult] = useState<UseDocResult<T>>({
    data: null,
    isLoading: true,
    error: null,
  });

  const docRefRef = useRef(memoizedDocRef);
  
  useEffect(() => {
    // Only resubscribe if the document reference has actually changed.
    if (isEqual(docRefRef.current, memoizedDocRef)) {
      return;
    }
    docRefRef.current = memoizedDocRef;
    
    if (!memoizedDocRef) {
      setResult({ data: null, isLoading: false, error: null });
      return;
    }

    setResult(prev => ({ ...prev, isLoading: true }));

    const unsubscribe = onSnapshot(
      memoizedDocRef,
      (snapshot: DocumentSnapshot<DocumentData>) => {
        if (snapshot.exists()) {
          setResult({
             data: { ...(snapshot.data() as T), id: snapshot.id },
             isLoading: false,
             error: null
          });
        } else {
          setResult({ data: null, isLoading: false, error: null });
        }
      },
      (err: FirestoreError) => {
        const contextualError = new FirestorePermissionError({
          operation: 'get',
          path: memoizedDocRef.path,
        });

        setResult({ data: null, isLoading: false, error: contextualError });
        errorEmitter.emit('permission-error', contextualError);
      }
    );

    return () => unsubscribe();
  }, [memoizedDocRef]);

  return result;
}

    