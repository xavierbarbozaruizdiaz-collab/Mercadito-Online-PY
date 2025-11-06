// src/components/ReferralProgram.tsx
// Componente para el programa de referidos

'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/hooks/useAuth';
import { ReferralService, UserReferralCode, Referral } from '@/lib/services/referralService';
import { Card, CardHeader, CardTitle, CardContent, Input, Badge } from './ui';
import Button from './ui/Button';
import { Gift, Users, DollarSign, Copy, Check } from 'lucide-react';
import LoadingSpinner from './ui/LoadingSpinner';
import ShareButton from './ShareButton';

export default function ReferralProgram() {
  const { user } = useAuth();
  const [stats, setStats] = useState<UserReferralCode | null>(null);
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (user) {
      loadReferralData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const loadReferralData = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const [userStats, userReferrals] = await Promise.all([
        ReferralService.getUserReferralStats(user.id),
        ReferralService.getUserReferrals(user.id),
      ]);

      setStats(userStats);
      setReferrals(userReferrals);
    } catch (error) {
      console.error('Error loading referral data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCopyCode = () => {
    if (!stats?.referral_code) return;

    if (navigator.clipboard) {
      navigator.clipboard.writeText(stats.referral_code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Función para copiar link de referido (no usado actualmente, pero puede ser útil en el futuro)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const handleCopyLink = () => {
    if (!stats?.referral_code) return;

    const referralUrl = ReferralService.getReferralUrl(stats.referral_code);
    if (navigator.clipboard) {
      navigator.clipboard.writeText(referralUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
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

  if (!stats) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <p className="text-gray-600">No se pudo cargar la información de referidos.</p>
        </CardContent>
      </Card>
    );
  }

  const referralUrl = ReferralService.getReferralUrl(stats.referral_code);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Gift className="w-5 h-5 mr-2" />
            Programa de Referidos
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <p className="text-sm text-gray-600 mb-4">
              Invita a tus amigos y obtén recompensas cuando se registren usando tu código.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="bg-blue-50 p-4 rounded-lg">
                <div className="flex items-center text-blue-600 mb-2">
                  <Users className="w-5 h-5 mr-2" />
                  <span className="font-semibold">Referidos</span>
                </div>
                <p className="text-3xl font-bold text-gray-900">{stats.total_referrals}</p>
              </div>

              <div className="bg-green-50 p-4 rounded-lg">
                <div className="flex items-center text-green-600 mb-2">
                  <DollarSign className="w-5 h-5 mr-2" />
                  <span className="font-semibold">Recompensas</span>
                </div>
                <p className="text-3xl font-bold text-gray-900">
                  {stats.total_rewards.toLocaleString('es-PY')} Gs.
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label htmlFor="referral-code" className="block text-sm font-medium text-gray-700 mb-2">Tu código de referido</label>
                <div className="flex gap-2 mt-2">
                  <Input
                    id="referral-code"
                    value={stats.referral_code}
                    readOnly
                    className="font-mono text-lg"
                  />
                  <Button onClick={handleCopyCode} variant="outline">
                    {copied ? (
                      <>
                        <Check className="w-4 h-4 mr-2" />
                        Copiado
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4 mr-2" />
                        Copiar
                      </>
                    )}
                  </Button>
                </div>
              </div>

              <div>
                <label htmlFor="referral-link" className="block text-sm font-medium text-gray-700 mb-2">Enlace de referido</label>
                <div className="flex gap-2 mt-2">
                  <Input
                    id="referral-link"
                    value={referralUrl}
                    readOnly
                    className="text-sm"
                  />
                  <ShareButton
                    url={referralUrl}
                    title="¡Únete a Mercadito Online PY!"
                    description="Usa mi código de referido y obtén beneficios especiales"
                    variant="primary"
                  />
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {referrals.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Tus Referidos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {referrals.map((referral) => (
                <div
                  key={referral.id}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div>
                    <p className="font-medium">Código: {referral.referral_code}</p>
                    <p className="text-sm text-gray-600">
                      Registrado: {new Date(referral.created_at).toLocaleDateString('es-PY')}
                    </p>
                  </div>
                  <Badge
                    variant={
                      referral.status === 'completed'
                        ? 'success'
                        : referral.status === 'rewarded'
                        ? 'default'
                        : 'warning'
                    }
                  >
                    {referral.status === 'completed'
                      ? 'Completado'
                      : referral.status === 'rewarded'
                      ? 'Recompensado'
                      : 'Pendiente'}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

