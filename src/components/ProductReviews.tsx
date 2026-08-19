// src/components/ProductReviews.tsx
// Componente para mostrar y gestionar reseñas de productos

'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/hooks/useAuth';
import { ReviewService, Review, ReviewStats, CreateReviewInput } from '@/lib/services/reviewService';
import { Card, CardHeader, CardTitle, CardContent } from './ui/Card';
import Button from './ui/Button';
import { Input } from './ui';
import LoadingSpinner from './ui/LoadingSpinner';
import { Star, ThumbsUp, CheckCircle } from 'lucide-react';
import Image from 'next/image';
import { formatDate } from '@/lib/utils/index';

interface ProductReviewsProps {
  productId: string;
  storeId?: string;
  orderId?: string;
}

export default function ProductReviews({
  productId,
  storeId,
  orderId,
}: ProductReviewsProps) {
  const { user, loading: authLoading } = useAuth();
  const pathname = usePathname();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [stats, setStats] = useState<ReviewStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [canReview, setCanReview] = useState(false);
  const [checkingCanReview, setCheckingCanReview] = useState(false);
  const [sortBy, setSortBy] = useState<'newest' | 'highest' | 'lowest' | 'helpful'>('newest');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const [rating, setRating] = useState(5);
  const [title, setTitle] = useState('');
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const signInHref = `/auth/sign-in?redirect=${encodeURIComponent(pathname || '/')}`;

  useEffect(() => {
    loadReviews();
    loadStats();
  }, [productId, sortBy, page, user?.id]);

  useEffect(() => {
    if (!user) {
      setCanReview(false);
      setCheckingCanReview(false);
      return;
    }
    checkCanReview();
  }, [productId, user?.id]);

  const loadReviews = async () => {
    setLoading(true);
    try {
      const result = await ReviewService.getProductReviews(productId, {
        page,
        limit: 10,
        sortBy,
        currentUserId: user?.id,
      });
      setReviews(result.reviews);
      setTotalPages(result.total_pages);
    } catch (error) {
      console.error('Error loading reviews:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const statsData = await ReviewService.getProductRatingStats(productId);
      setStats(statsData);
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const checkCanReview = async () => {
    if (!user) return;
    setCheckingCanReview(true);
    try {
      const can = await ReviewService.canUserReviewProduct(user.id, productId);
      setCanReview(can);
    } catch (error) {
      console.error('Error checking can review:', error);
      setCanReview(false);
    } finally {
      setCheckingCanReview(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setSubmitting(true);
    try {
      const input: CreateReviewInput = {
        product_id: productId,
        store_id: storeId,
        order_id: orderId,
        rating,
        title: title || undefined,
        comment: comment || undefined,
      };

      await ReviewService.createReview(user.id, input);
      setShowForm(false);
      setTitle('');
      setComment('');
      setRating(5);
      await loadReviews();
      await loadStats();
      await checkCanReview();
    } catch (error: any) {
      alert(error.message || 'Error al crear la reseña');
    } finally {
      setSubmitting(false);
    }
  };

  const handleHelpful = async (reviewId: string) => {
    if (!user) return;
    await ReviewService.markAsHelpful(reviewId, user.id);
    await loadReviews();
  };

  const renderStars = (value: number, size: 'sm' | 'md' | 'lg' = 'md') => {
    const sizeClass = size === 'sm' ? 'w-3 h-3' : size === 'lg' ? 'w-6 h-6' : 'w-4 h-4';
    const starElements: React.ReactElement[] = [];
    for (let i = 1; i <= 5; i++) {
      starElements.push(
        <Star
          key={i}
          className={`${sizeClass} ${i <= value ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`}
        />
      );
    }
    return <div className="flex gap-0.5">{starElements}</div>;
  };

  if ((loading || authLoading) && reviews.length === 0 && !stats) {
    return (
      <Card>
        <CardContent className="flex justify-center p-8">
          <LoadingSpinner />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Reseñas del Producto</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        {stats && (
          <div className="flex flex-col gap-4">
            <div className="text-center">
              <div className="text-4xl font-bold">{stats.average_rating.toFixed(1)}</div>
              <div className="flex justify-center mt-2">
                {renderStars(Math.round(stats.average_rating), 'lg')}
              </div>
              <div className="text-sm text-gray-500 mt-1">
                {stats.total_reviews} {stats.total_reviews === 1 ? 'reseña' : 'reseñas'}
              </div>
            </div>

            <div className="space-y-2">
              {[5, 4, 3, 2, 1].map((star) => (
                <div key={star} className="flex items-center gap-2">
                  <span className="text-sm w-4">{star}</span>
                  <Star className="w-4 h-4 fill-yellow-400 text-yellow-400 shrink-0" />
                  <div className="flex-1 bg-gray-200 rounded-full h-2 min-w-0">
                    <div
                      className="bg-yellow-400 h-2 rounded-full"
                      style={{
                        width: `${
                          stats.total_reviews > 0
                            ? ((stats.rating_distribution[String(star) as '1' | '2' | '3' | '4' | '5'] || 0) /
                                stats.total_reviews) *
                              100
                            : 0
                        }%`,
                      }}
                    />
                  </div>
                  <span className="text-sm text-gray-600 w-6 text-right shrink-0">
                    {stats.rating_distribution[String(star) as '1' | '2' | '3' | '4' | '5'] || 0}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {!user && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
            <p className="mb-2">Iniciá sesión para dejar una reseña de este producto.</p>
            <Link
              href={signInHref}
              className="inline-flex font-medium text-blue-700 underline hover:text-blue-900"
            >
              Iniciar sesión
            </Link>
          </div>
        )}

        {user && checkingCanReview && (
          <p className="text-sm text-gray-500">Verificando si podés reseñar...</p>
        )}

        {user && !checkingCanReview && canReview && !showForm && (
          <Button onClick={() => setShowForm(true)} className="w-full">
            Escribir una Reseña
          </Button>
        )}

        {user && !checkingCanReview && !canReview && (
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm text-gray-700">
            Para dejar una reseña necesitás haber comprado este producto.
          </div>
        )}

        {showForm && (
          <form onSubmit={handleSubmit} className="space-y-4 border-t pt-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Calificación</label>
              <div className="flex items-center gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    className="focus:outline-none"
                  >
                    <Star
                      className={`w-8 h-8 ${
                        star <= rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'
                      }`}
                    />
                  </button>
                ))}
                <span className="ml-2 text-sm text-gray-600">{rating} estrellas</span>
              </div>
            </div>

            <div>
              <label htmlFor="review-title" className="block text-sm font-medium text-gray-700 mb-1">
                Título (opcional)
              </label>
              <Input
                id="review-title"
                value={title}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTitle(e.target.value)}
                placeholder="Resumen de tu experiencia"
                maxLength={100}
              />
            </div>

            <div>
              <label htmlFor="review-comment" className="block text-sm font-medium text-gray-700 mb-1">
                Comentario
              </label>
              <textarea
                id="review-comment"
                value={comment}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setComment(e.target.value)}
                placeholder="Describe tu experiencia con este producto..."
                rows={4}
                maxLength={1000}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              <div className="text-xs text-gray-500 mt-1">{comment.length}/1000 caracteres</div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button type="submit" disabled={submitting}>
                {submitting ? <LoadingSpinner size="sm" className="mr-2" /> : 'Publicar Reseña'}
              </Button>
              <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                Cancelar
              </Button>
            </div>
          </form>
        )}

        {reviews.length > 0 && (
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-t pt-4">
            <div className="text-sm text-gray-600">
              Mostrando {reviews.length} de {stats?.total_reviews || 0} reseñas
            </div>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="px-3 py-2 border rounded-md text-sm"
            >
              <option value="newest">Más recientes</option>
              <option value="highest">Mejor calificadas</option>
              <option value="lowest">Peor calificadas</option>
              <option value="helpful">Más útiles</option>
            </select>
          </div>
        )}

        <div className="space-y-4">
          {reviews.map((review) => (
            <div key={review.id} className="border rounded-lg p-4">
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center shrink-0">
                    {review.buyer?.avatar_url ? (
                      <Image
                        src={review.buyer.avatar_url}
                        alt={review.buyer.full_name || 'Usuario'}
                        width={40}
                        height={40}
                        className="rounded-full"
                      />
                    ) : (
                      <span className="text-sm font-medium">
                        {(review.buyer?.full_name?.charAt(0) || 'U').toUpperCase()}
                      </span>
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="font-medium truncate">{review.buyer?.full_name || 'Usuario'}</div>
                    <div className="flex flex-wrap items-center gap-2 text-sm text-gray-500">
                      {review.is_verified_purchase && (
                        <span className="flex items-center gap-1 text-green-600">
                          <CheckCircle className="w-3 h-3" />
                          Compra verificada
                        </span>
                      )}
                      <span>{formatDate(review.created_at)}</span>
                    </div>
                  </div>
                </div>
                {renderStars(review.rating)}
              </div>

              {review.title && <h4 className="font-semibold mb-2">{review.title}</h4>}
              <p className="text-gray-700 mb-3 whitespace-pre-wrap">{review.comment}</p>

              {review.images && review.images.length > 0 && (
                <div className="grid grid-cols-3 gap-2 mb-3">
                  {review.images.map((img) => (
                    <div key={img.id} className="relative aspect-square rounded-lg overflow-hidden">
                      <Image src={img.image_url} alt="Review image" fill className="object-cover" />
                    </div>
                  ))}
                </div>
              )}

              {review.response && (
                <div className="bg-blue-50 border-l-4 border-blue-500 p-3 rounded-r-lg mb-3">
                  <div className="font-medium text-blue-900 mb-1">Respuesta del vendedor</div>
                  <p className="text-blue-800">{review.response.response_text}</p>
                </div>
              )}

              <button
                type="button"
                onClick={() => handleHelpful(review.id)}
                className={`flex items-center gap-1 text-sm ${
                  review.is_helpful ? 'text-blue-600' : 'text-gray-600'
                }`}
              >
                <ThumbsUp className={`w-4 h-4 ${review.is_helpful ? 'fill-current' : ''}`} />
                Útil ({review.helpful_count})
              </button>
            </div>
          ))}
        </div>

        {totalPages > 1 && (
          <div className="flex justify-center gap-2">
            <Button
              variant="outline"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
            >
              Anterior
            </Button>
            <span className="px-4 py-2 text-sm">
              Página {page} de {totalPages}
            </span>
            <Button
              variant="outline"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
            >
              Siguiente
            </Button>
          </div>
        )}

        {reviews.length === 0 && !loading && (
          <p className="text-center text-gray-500 text-sm py-2">
            No hay reseñas aún. Sé el primero en reseñar este producto.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
