// src/components/ProductQandA.tsx
// Componente para preguntas y respuestas de productos

'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/hooks/useAuth';
import {
  MarketplaceFeaturesService,
  ProductQuestion,
} from '@/lib/services/marketplaceFeaturesService';
import { Card, CardHeader, CardTitle, CardContent } from './ui/Card';
import Button from './ui/Button';
import LoadingSpinner from './ui/LoadingSpinner';
import { MessageSquare, HelpCircle, ThumbsUp, Send } from 'lucide-react';
import { formatDate } from '@/lib/utils/index';

interface ProductQandAProps {
  productId: string;
  sellerId: string;
  currentUserId?: string;
}

export default function ProductQandA({
  productId,
  sellerId,
}: ProductQandAProps) {
  const { user, loading: authLoading } = useAuth();
  const pathname = usePathname();
  const [questions, setQuestions] = useState<ProductQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [showQuestionForm, setShowQuestionForm] = useState(false);
  const [questionText, setQuestionText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [answerText, setAnswerText] = useState('');

  const isSeller = Boolean(user?.id && user.id === sellerId);
  const signInHref = `/auth/sign-in?redirect=${encodeURIComponent(pathname || '/')}`;

  useEffect(() => {
    loadQuestions();
  }, [productId]);

  const loadQuestions = async () => {
    setLoading(true);
    try {
      const data = await MarketplaceFeaturesService.getProductQuestions(productId, {
        limit: 10,
      });
      setQuestions(data);
    } catch (error) {
      console.error('Error loading questions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !questionText.trim()) return;

    setSubmitting(true);
    try {
      await MarketplaceFeaturesService.createProductQuestion(
        productId,
        user.id,
        questionText.trim()
      );
      setQuestionText('');
      setShowQuestionForm(false);
      await loadQuestions();
    } catch (error: any) {
      alert(error.message || 'Error al crear la pregunta');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmitAnswer = async (questionId: string) => {
    if (!user || !answerText.trim() || !isSeller) return;

    setSubmitting(true);
    try {
      await MarketplaceFeaturesService.answerQuestion(questionId, user.id, answerText.trim());
      setAnswerText('');
      await loadQuestions();
    } catch (error: any) {
      alert(error.message || 'Error al responder la pregunta');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading || authLoading) {
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
        <CardTitle>Preguntas y respuestas</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {!user && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
            <p className="mb-2">Iniciá sesión para hacer una pregunta sobre este producto.</p>
            <Link
              href={signInHref}
              className="inline-flex font-medium text-blue-700 underline hover:text-blue-900"
            >
              Iniciar sesión
            </Link>
          </div>
        )}

        {user && isSeller && (
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm text-gray-700">
            Sos el vendedor de este producto. Acá podés responder las preguntas de los compradores.
          </div>
        )}

        {user && !isSeller && !showQuestionForm && (
          <Button onClick={() => setShowQuestionForm(true)} className="w-full" variant="outline">
            <HelpCircle className="w-4 h-4 mr-2" />
            Hacer una Pregunta
          </Button>
        )}

        {showQuestionForm && (
          <form onSubmit={handleSubmitQuestion} className="space-y-3">
            <textarea
              value={questionText}
              onChange={(e) => setQuestionText(e.target.value)}
              placeholder="Escribe tu pregunta sobre este producto..."
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
              maxLength={500}
              required
            />
            <div className="flex flex-wrap gap-2">
              <Button type="submit" disabled={submitting || !questionText.trim()}>
                {submitting ? <LoadingSpinner size="sm" className="mr-2" /> : <Send className="w-4 h-4 mr-2" />}
                Enviar Pregunta
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowQuestionForm(false);
                  setQuestionText('');
                }}
              >
                Cancelar
              </Button>
            </div>
          </form>
        )}

        {questions.length === 0 ? (
          <div className="py-6 text-center text-gray-500">
            <MessageSquare className="w-10 h-10 mx-auto mb-3 text-gray-300" />
            <p>No hay preguntas aún. ¡Sé el primero en preguntar!</p>
          </div>
        ) : (
          <div className="space-y-4">
            {questions.map((question) => (
              <div key={question.id} className="border rounded-lg p-4">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <HelpCircle className="w-4 h-4 text-blue-600 shrink-0" />
                      <span className="font-medium text-gray-900">
                        {question.asker?.full_name || 'Usuario'}
                      </span>
                      <span className="text-sm text-gray-500">
                        • {formatDate(question.created_at)}
                      </span>
                    </div>
                    <p className="text-gray-700 mb-3">{question.question_text}</p>

                    {question.answer_text ? (
                      <div className="bg-green-50 border-l-4 border-green-500 p-3 rounded-r-lg">
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <span className="font-medium text-green-900">Respuesta del vendedor</span>
                          {question.answered_at && (
                            <span className="text-xs text-green-700">
                              {formatDate(question.answered_at)}
                            </span>
                          )}
                        </div>
                        <p className="text-green-800">{question.answer_text}</p>
                      </div>
                    ) : (
                      isSeller && (
                        <div className="space-y-2">
                          <textarea
                            value={answerText}
                            onChange={(e) => setAnswerText(e.target.value)}
                            placeholder="Responde esta pregunta..."
                            rows={3}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                          />
                          <Button
                            onClick={() => handleSubmitAnswer(question.id)}
                            disabled={submitting || !answerText.trim()}
                            size="sm"
                          >
                            Enviar Respuesta
                          </Button>
                        </div>
                      )
                    )}
                  </div>
                  {question.answer_text && (
                    <button
                      onClick={() => MarketplaceFeaturesService.upvoteQuestion(question.id)}
                      className="flex flex-col items-center gap-1 p-2 text-gray-500 hover:text-blue-600"
                      title="Útil"
                      type="button"
                    >
                      <ThumbsUp className="w-4 h-4" />
                      <span className="text-xs">{question.upvotes}</span>
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
