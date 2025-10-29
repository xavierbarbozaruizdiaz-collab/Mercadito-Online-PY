// src/components/ShareButton.tsx
// Componente para compartir en redes sociales

'use client';

import { useState } from 'react';
import Button from './ui/Button';
import {
  Share2,
  Facebook,
  Twitter,
  Instagram,
  Copy,
  Link as LinkIcon,
  Check,
} from 'lucide-react';
// Toast simplificado
const toast = {
  success: (message: string) => {
    if (typeof window !== 'undefined') {
      alert(message);
    }
  },
};

interface ShareButtonProps {
  url?: string;
  title?: string;
  description?: string;
  className?: string;
  variant?: 'primary' | 'outline' | 'ghost';
}

export default function ShareButton({
  url,
  title = 'Mira esto en Mercadito Online PY',
  description = '',
  className = '',
  variant = 'primary',
}: ShareButtonProps) {
  const [copied, setCopied] = useState(false);

  const shareUrl = url || (typeof window !== 'undefined' ? window.location.href : '');
  const shareText = `${title}${description ? ` - ${description}` : ''}`;

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title,
          text: description,
          url: shareUrl,
        });
      } catch (error) {
        if ((error as Error).name !== 'AbortError') {
          console.error('Error sharing:', error);
        }
      }
    }
  };

  const handleCopyLink = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      toast.success('¡Enlace copiado al portapapeles!');
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const shareOnFacebook = () => {
    const facebookUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`;
    window.open(facebookUrl, '_blank', 'width=600,height=400');
  };

  const shareOnTwitter = () => {
    const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`;
    window.open(twitterUrl, '_blank', 'width=600,height=400');
  };

  const shareOnWhatsApp = () => {
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(`${shareText} ${shareUrl}`)}`;
    window.open(whatsappUrl, '_blank');
  };

  // Si el navegador soporta Web Share API, mostrar botón nativo
  if (typeof navigator !== 'undefined' && 'share' in navigator) {
    return (
      <Button
        onClick={handleNativeShare}
        variant={variant}
        className={className}
      >
        <Share2 className="w-4 h-4 mr-2" />
        Compartir
      </Button>
    );
  }

  // Menú de opciones de compartir
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <Button
        onClick={handleCopyLink}
        variant={variant}
        size="sm"
      >
        {copied ? (
          <>
            <Check className="w-4 h-4 mr-2" />
            Copiado
          </>
        ) : (
          <>
            <Copy className="w-4 h-4 mr-2" />
            Copiar enlace
          </>
        )}
      </Button>

      <div className="flex gap-1">
        <Button
          onClick={shareOnFacebook}
          variant="ghost"
          size="sm"
          className="text-blue-600 hover:text-blue-700"
          title="Compartir en Facebook"
        >
          <Facebook className="w-4 h-4" />
        </Button>

        <Button
          onClick={shareOnTwitter}
          variant="ghost"
          size="sm"
          className="text-blue-400 hover:text-blue-500"
          title="Compartir en Twitter"
        >
          <Twitter className="w-4 h-4" />
        </Button>

        <Button
          onClick={shareOnWhatsApp}
          variant="ghost"
          size="sm"
          className="text-green-600 hover:text-green-700"
          title="Compartir en WhatsApp"
        >
          <LinkIcon className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}

