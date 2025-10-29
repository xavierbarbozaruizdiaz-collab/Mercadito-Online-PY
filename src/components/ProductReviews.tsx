// src/components/ProductReviews.tsx
// Componente para mostrar y gestionar reseñas de productos

'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/hooks/useAuth';
import { ReviewService, Review, ReviewStats, CreateReviewInput } from '@/lib/services/reviewService';
import { Card, CardHeader, CardTitle, CardContent } from './ui/Card';
import Button from './ui/Button';
import { Input } from './ui';
import LoadingSpinner from './ui/LoadingSpinner';
import { Star, ThumbsUp, Image as ImageIcon, Edit, Trash2, MessageSquare, CheckCircle } from 'lucide-react';
import Image from 'next/image';
import { formatDate } from '@/lib/utils/index';

interface ProductReviewsProps {
  productId: string;
  storeId?: string;
  orderId?: string; // Para verificar compra
}

export default function ProductReviews({
  productId,
  storeId,
  orderId,
}: ProductReviewsProps) {
  const { user } = useAuth();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [stats, setStats] = useState<ReviewStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [canReview, setCanReview] = useState(false);
  const [sortBy, setSortBy] = useState<'newest' | 'highest' | 'lowest' | 'helpful'>('newest');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Form state
  const [rating, setRating] = useState(5);
  const [title, setTitle] = useState('');
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadReviews();
    loadStats();
    if (user) {
      checkCanReview();
    }
  }, [productId, user, sortBy, page]);

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
    try {
      const can = await ReviewService.canUserReviewProduct(user.id, productId);
      setCanReview(can);
    } catch (error) {
      console.error('Error checking can review:', error);
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

  const renderStars = (rating: number, size: 'sm' | 'md' | 'lg' = 'md') => {
    const stars = [];
    const sizeClass = size === 'sm' ? 'w-3 h-3' : size === 'lg' ? 'w-6 h-6' : 'w-4 h-4';
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <Star
          key={i}
          className={`${sizeClass} ${i <= rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`}
        />
      );
    }
    return <div className="flex gap-0.5">{stars}</div>;
  };

  if (loading && reviews.length === 0) {
    return (
      <Card>
        <CardContent className="flex justify-center p-8">
          <LoadingSpinner />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Estadísticas */}
      {stats && (
        <Card>
          <CardHeader>
            <CardTitle>Reseñas del Producto</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-6">
              <div className="text-center">
                <div className="text-4xl font-bold">{stats.average_rating.toFixed(1)}</div>
                <div className="flex justify-center mt-2">
                  {renderStars(Math.round(stats.average_rating), 'lg')}
                </div>
                <div className="text-sm text-gray-500 mt-1">
                  {stats.total_reviews} {stats.total_reviews === 1 ? 'reseña' : 'reseñas'}
                </div>
              </div>

              <div className="flex-1 space-y-2">
                {[5, 4, 3, 2, 1].map((star) => (
                  <div key={star} className="flex items-center gap-2">
                    <span className="text-sm w-8">{star}</span>
                    <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                    <div className="flex-1 bg-gray-200 rounded-full h-2">
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
                    <span className="text-sm text-gray-600 w-12 text-right">
                      {stats.rating_distribution[String(star) as '1' | '2' | '3' | '4' | '5'] || 0}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Formulario de nueva reseña */}
      {user && canReview && !showForm && (
        <Card>
          <CardContent className="p-4">
            <Button onClick={() => setShowForm(true)} className="w-full">
              Escribir una Reseña
            </Button>
          </CardContent>
        </Card>
      )}

      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>Escribir Reseña</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Calificación</label>
                <div className="flex items-center gap-2 mt-2">
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
                  rows={5}
                  maxLength={1000}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <div className="text-xs text-gray-500 mt-1">
                  {comment.length}/1000 caracteres
                </div>
              </div>

              <div className="flex gap-2">
                <Button type="submit" disabled={submitting}>
                  {submitting ? <LoadingSpinner size="sm" className="mr-2" /> : 'Publicar Reseña'}
                </Button>
                <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                  Cancelar
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Filtros y ordenamiento */}
      {reviews.length > 0 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-600">
            Mostrando {reviews.length} de {stats?.total_reviews || 0} reseñas
          </div>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="px-3 py-2 border rounded-md text-sm"
          >
            <option value="newest">Más recientes</option>
            <option value="oldest">Más antiguas</option>
            <option value="highest">Mejor calificadas</option>
            <option value="lowest">Peor calificadas</option>
            <option value="helpful">Más útiles</option>
          </select>
        </div>
      )}

      {/* Lista de reseñas */}
      <div className="space-y-4">
        {reviews.map((review) => (
          <Card key={review.id}>
            <CardContent className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
                    {review.buyer?.avatar_url ? (
                      <Image
                        src={review.buyer.avatar_url}
                        alt={review.buyer.full_name}
                        width={40}
                        height={40}
                        className="rounded-full"
                      />
                    ) : (
                      <span className="text-sm font-medium">
                        {review.buyer?.full_name?.charAt(0).toUpperCase()}
                      </span>
                    )}
                  </div>
                  <div>
                    <div className="font-medium">{review.buyer?.full_name || 'Usuario'}</div>
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      {review.is_verified_purchase && (
                        <span className="flex items-center gap-1 text-green-600">
                          <CheckCircle className="w-3 h-3" />
                          Compra verificada
                        </span>
                      )}
                      <span>•</span>
                      <span>{formatDate(review.created_at)}</span>
                      {review.is_edited && <span className="text-xs">(editada)</span>}
                    </div>
                  </div>
                </div>
                {renderStars(review.rating)}
              </div>

              {review.title && (
                <h4 className="font-semibold text-lg mb-2">{review.title}</h4>
              )}

              <p className="text-gray-700 mb-4 whitespace-pre-wrap">{review.comment}</p>

              {/* Imágenes */}
              {review.images && review.images.length > 0 && (
                <div className="grid grid-cols-4 gap-2 mb-4">
                  {review.images.map((img) => (
                    <div key={img.id} className="relative aspect-square rounded-lg overflow-hidden">
                      <Image
                        src={img.image_url}
                        alt="Review image"
                        fill
                        className="object-cover"
                      />
                    </div>
                  ))}
                </div>
              )}

              {/* Respuesta del vendedor */}
              {review.response && (
                <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded-r-lg mb-4">
                  <div className="font-medium text-blue-900 mb-1">Respuesta del vendedor</div>
                  <p className="text-blue-800">{review.response.response_text}</p>
                  <div className="text-xs text-blue-600 mt-2">
                    {formatDate(review.response.created_at)}
                  </div>
                </div>
              )}

              {/* Acciones */}
              <div className="flex items-center gap-4 pt-4 border-t">
                <button
                  onClick={() => handleHelpful(review.id)}
                  className={`flex items-center gap-1 text-sm ${
                    review.is_helpful ? 'text-blue-600' : 'text-gray-600'
                  }`}
                >
                  <ThumbsUp className={`w-4 h-4 ${review.is_helpful ? 'fill-current' : ''}`} />
                  Útil ({review.helpful_count})
                </button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Paginación */}
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
        <Card>
          <CardContent className="p-8 text-center text-gray-500">
            No hay reseñas aún. Sé el primero en reseñar este producto.
          </CardContent>
        </Card>
      )}
    </div>
  );
}

