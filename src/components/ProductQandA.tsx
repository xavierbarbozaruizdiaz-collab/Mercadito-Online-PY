// src/components/ProductQandA.tsx
// Componente para preguntas y respuestas de productos

'use client';

import { useState, useEffect } from 'react';
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
  currentUserId,
}: ProductQandAProps) {
  const { user } = useAuth();
  const [questions, setQuestions] = useState<ProductQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [showQuestionForm, setShowQuestionForm] = useState(false);
  const [questionText, setQuestionText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [answeringQuestionId, setAnsweringQuestionId] = useState<string | null>(null);
  const [answerText, setAnswerText] = useState('');

  const isSeller = user?.id === sellerId;

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
      setAnsweringQuestionId(null);
      await loadQuestions();
    } catch (error: any) {
      alert(error.message || 'Error al responder la pregunta');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex justify-center p-8">
          <LoadingSpinner />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Formulario para hacer pregunta */}
      {user && !isSeller && !showQuestionForm && (
        <Card>
          <CardContent className="p-4">
            <Button onClick={() => setShowQuestionForm(true)} className="w-full" variant="outline">
              <HelpCircle className="w-4 h-4 mr-2" />
              Hacer una Pregunta
            </Button>
          </CardContent>
        </Card>
      )}

      {showQuestionForm && (
        <Card>
          <CardHeader>
            <CardTitle>Hacer una Pregunta</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmitQuestion} className="space-y-4">
              <textarea
                value={questionText}
                onChange={(e) => setQuestionText(e.target.value)}
                placeholder="Escribe tu pregunta sobre este producto..."
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                maxLength={500}
                required
              />
              <div className="flex gap-2">
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
          </CardContent>
        </Card>
      )}

      {/* Lista de preguntas */}
      <div className="space-y-4">
        {questions.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center text-gray-500">
              <MessageSquare className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p>No hay preguntas aún. ¡Sé el primero en preguntar!</p>
            </CardContent>
          </Card>
        ) : (
          questions.map((question) => (
            <Card key={question.id}>
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <HelpCircle className="w-5 h-5 text-blue-600" />
                      <span className="font-medium text-gray-900">
                        {question.asker?.full_name || 'Usuario'}
                      </span>
                      <span className="text-sm text-gray-500">
                        • {formatDate(question.created_at)}
                      </span>
                    </div>
                    <p className="text-gray-700 mb-4">{question.question_text}</p>

                    {question.answer_text ? (
                      <div className="bg-green-50 border-l-4 border-green-500 p-4 rounded-r-lg">
                        <div className="flex items-center gap-2 mb-2">
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
                          <div className="flex gap-2">
                            <Button
                              onClick={() => handleSubmitAnswer(question.id)}
                              disabled={submitting || !answerText.trim()}
                              size="sm"
                            >
                              Enviar Respuesta
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setAnsweringQuestionId(null);
                                setAnswerText('');
                              }}
                            >
                              Cancelar
                            </Button>
                          </div>
                        </div>
                      )
                    )}
                  </div>
                  {question.answer_text && (
                    <button
                      onClick={() => MarketplaceFeaturesService.upvoteQuestion(question.id)}
                      className="flex flex-col items-center gap-1 p-2 text-gray-500 hover:text-blue-600"
                      title="Útil"
                    >
                      <ThumbsUp className="w-4 h-4" />
                      <span className="text-xs">{question.upvotes}</span>
                    </button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}

