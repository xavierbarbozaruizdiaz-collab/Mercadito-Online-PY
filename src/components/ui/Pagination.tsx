// ============================================
// MERCADITO ONLINE PY - PAGINATION
// Componente de paginación para listas
// ============================================

'use client';

import { Button } from '@/components/ui';
import { ChevronLeft, ChevronRight, MoreHorizontal } from 'lucide-react';

// ============================================
// TIPOS
// ============================================

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  showFirstLast?: boolean;
  showPrevNext?: boolean;
  maxVisiblePages?: number;
  className?: string;
}

// ============================================
// COMPONENTE
// ============================================

export default function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  showFirstLast = true,
  showPrevNext = true,
  maxVisiblePages = 5,
  className = '',
}: PaginationProps) {
  // Si solo hay una página, no mostrar paginación
  if (totalPages <= 1) return null;

  // Calcular páginas visibles
  const getVisiblePages = () => {
    const pages: (number | string)[] = [];
    
    if (totalPages <= maxVisiblePages) {
      // Si el total de páginas es menor o igual al máximo visible, mostrar todas
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // Calcular el rango de páginas a mostrar
      const half = Math.floor(maxVisiblePages / 2);
      let start = Math.max(1, currentPage - half);
      let end = Math.min(totalPages, start + maxVisiblePages - 1);
      
      // Ajustar el inicio si estamos cerca del final
      if (end - start + 1 < maxVisiblePages) {
        start = Math.max(1, end - maxVisiblePages + 1);
      }
      
      // Agregar primera página si no está visible
      if (start > 1) {
        pages.push(1);
        if (start > 2) {
          pages.push('...');
        }
      }
      
      // Agregar páginas del rango
      for (let i = start; i <= end; i++) {
        pages.push(i);
      }
      
      // Agregar última página si no está visible
      if (end < totalPages) {
        if (end < totalPages - 1) {
          pages.push('...');
        }
        pages.push(totalPages);
      }
    }
    
    return pages;
  };

  const visiblePages = getVisiblePages();

  return (
    <div className={`flex items-center justify-center space-x-1 ${className}`}>
      {/* Botón Primera página */}
      {showFirstLast && currentPage > 1 && (
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(1)}
          className="px-2"
        >
          Primera
        </Button>
      )}

      {/* Botón Página anterior */}
      {showPrevNext && currentPage > 1 && (
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(currentPage - 1)}
          className="px-2"
        >
          <ChevronLeft className="w-4 h-4" />
        </Button>
      )}

      {/* Páginas numeradas */}
      {visiblePages.map((page, index) => {
        if (page === '...') {
          return (
            <span
              key={`ellipsis-${index}`}
              className="px-3 py-2 text-gray-500"
            >
              <MoreHorizontal className="w-4 h-4" />
            </span>
          );
        }

        const pageNumber = page as number;
        const isCurrentPage = pageNumber === currentPage;

        return (
          <Button
            key={pageNumber}
            variant={isCurrentPage ? 'primary' : 'outline'}
            size="sm"
            onClick={() => onPageChange(pageNumber)}
            className={`px-3 ${
              isCurrentPage 
                ? 'bg-blue-600 text-white hover:bg-blue-700' 
                : 'hover:bg-gray-50'
            }`}
          >
            {pageNumber}
          </Button>
        );
      })}

      {/* Botón Página siguiente */}
      {showPrevNext && currentPage < totalPages && (
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(currentPage + 1)}
          className="px-2"
        >
          <ChevronRight className="w-4 h-4" />
        </Button>
      )}

      {/* Botón Última página */}
      {showFirstLast && currentPage < totalPages && (
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(totalPages)}
          className="px-2"
        >
          Última
        </Button>
      )}
    </div>
  );
}
