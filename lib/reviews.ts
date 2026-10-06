import {
  collection,
  doc,
  documentId,
  getDocs,
  limit,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  Timestamp,
  where,
} from 'firebase/firestore';
import { db } from './firebase';

export type Review = {
  id: string;
  salonId: string;
  rating: number;
  comment: string;
  authorName: string;
  serviceName: string;
  createdAt: Date;
};

export async function fetchSalonReviews(salonId: string, max = 20): Promise<Review[]> {
  const snapshot = await getDocs(
    query(collection(db, 'reviews'), where('salonId', '==', salonId), orderBy('createdAt', 'desc'), limit(max))
  );
  return snapshot.docs.map((review) => {
    const data = review.data();
    return {
      id: review.id,
      salonId: data.salonId,
      rating: data.rating,
      comment: data.comment ?? '',
      authorName: data.authorName ?? 'Kunde',
      serviceName: data.serviceName ?? '',
      createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : new Date(),
    };
  });
}

/** Hvilke av disse bookingene brukeren allerede har anmeldt (anmeldelsen har samme ID som bookingen). */
export async function fetchReviewedBookingIds(bookingIds: string[]): Promise<Set<string>> {
  const reviewed = new Set<string>();
  for (let index = 0; index < bookingIds.length; index += 30) {
    const chunk = bookingIds.slice(index, index + 30);
    const snapshot = await getDocs(query(collection(db, 'reviews'), where(documentId(), 'in', chunk)));
    snapshot.docs.forEach((review) => reviewed.add(review.id));
  }
  return reviewed;
}

/** Lagrer anmeldelsen og oppdaterer salongens snitt i samme transaksjon (se firestore.rules). */
export async function submitReview({
  bookingId,
  salonId,
  serviceName,
  rating,
  comment,
  authorName,
}: {
  bookingId: string;
  salonId: string;
  serviceName: string;
  rating: number;
  comment: string;
  authorName: string;
}) {
  const salonRef = doc(db, 'salons', salonId);
  await runTransaction(db, async (transaction) => {
    const salon = await transaction.get(salonRef);
    const data = salon.data() ?? {};
    transaction.set(doc(db, 'reviews', bookingId), {
      salonId,
      rating,
      comment: comment.trim(),
      authorName,
      serviceName,
      createdAt: serverTimestamp(),
    });
    transaction.update(salonRef, {
      ratingSum: (data.ratingSum ?? 0) + rating,
      reviewCount: (data.reviewCount ?? 0) + 1,
      lastReviewId: bookingId,
    });
  });
}
