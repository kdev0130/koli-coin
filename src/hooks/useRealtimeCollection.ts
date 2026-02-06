import { useEffect, useState } from "react";
import { collection, query, onSnapshot, QueryConstraint, DocumentData } from "firebase/firestore";
import { db } from "@/lib/firebase";

interface UseRealtimeCollectionResult<T> {
  data: T[];
  loading: boolean;
  error: Error | null;
}

/**
 * Custom hook for real-time Firestore collection updates
 * @param collectionName - Name of the Firestore collection
 * @param constraints - Optional query constraints (where, orderBy, limit, etc.)
 * @returns Object containing data, loading state, and error
 */
export function useRealtimeCollection<T = DocumentData>(
  collectionName: string,
  ...constraints: QueryConstraint[]
): UseRealtimeCollectionResult<T> {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    setLoading(true);
    
    const collectionRef = collection(db, collectionName);
    const q = query(collectionRef, ...constraints);

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const documents = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as T[];
        
        console.log(`[Real-time Update] ${collectionName}:`, documents);
        setData(documents);
        setLoading(false);
        setError(null);
      },
      (err) => {
        console.error(`Error listening to ${collectionName}:`, err);
        setError(err as Error);
        setLoading(false);
      }
    );

    return () => {
      console.log(`[Unsubscribe] ${collectionName}`);
      unsubscribe();
    };
  }, [collectionName, JSON.stringify(constraints.map(c => c.type))]);

  return { data, loading, error };
}
