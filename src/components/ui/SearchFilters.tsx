// ============================================
// MERCADITO ONLINE PY - SEARCH FILTERS
// Componente de filtros avanzados para búsqueda
// ============================================

'use client';

import { useState } from 'react';
import { 
  Button, 
  Input, 
  Select, 
  Badge,
  Card,
  CardContent,
  CardHeader,
  CardTitle
} from '@/components/ui';
import { 
  Search, 
  Filter,
  X,
  DollarSign,
  MapPin,
  Tag,
  Calendar,
  Star,
  TrendingUp
} from 'lucide-react';

// ============================================
// TIPOS
// ============================================

interface SearchFiltersProps {
  filters: {
    query?: string;
    category_id?: string;
    min_price?: number;
    max_price?: number;
    condition?: string;
    sale_type?: string;
    location?: string;
    tags?: string[];
    sort_by?: 'price' | 'created_at' | 'title' | 'popularity';
    sort_order?: 'asc' | 'desc';
  };
  categories: Array<{
    id: string;
    name: string;
  }>;
  onFiltersChange: (filters: any) => void;
  onSearch: () => void;
}

// ============================================
// COMPONENTE
// ============================================

export default function SearchFilters({ 
  filters, 
  categories, 
  onFiltersChange, 
  onSearch 
}: SearchFiltersProps) {
  const [localFilters, setLocalFilters] = useState(filters);

  // Manejar cambio de filtros locales
  const handleFilterChange = (key: string, value: any) => {
    setLocalFilters(prev => ({ ...prev, [key]: value }));
  };

  // Aplicar filtros
  const applyFilters = () => {
    onFiltersChange(localFilters);
    onSearch();
  };

  // Limpiar filtros
  const clearFilters = () => {
    const clearedFilters = {
      query: '',
      category_id: '',
      min_price: undefined,
      max_price: undefined,
      condition: '',
      sale_type: '',
      location: '',
      tags: [],
    };
    setLocalFilters(clearedFilters);
    onFiltersChange(clearedFilters);
  };

  // Obtener filtros activos
  const getActiveFiltersCount = () => {
    let count = 0;
    if (localFilters.query) count++;
    if (localFilters.category_id) count++;
    if (localFilters.min_price) count++;
    if (localFilters.max_price) count++;
    if (localFilters.condition) count++;
    if (localFilters.sale_type) count++;
    if (localFilters.location) count++;
    if (localFilters.tags && localFilters.tags.length > 0) count++;
    return count;
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center">
            <Filter className="w-5 h-5 mr-2" />
            Filtros Avanzados
          </CardTitle>
          <div className="flex items-center space-x-2">
            <Badge variant="info" size="sm">
              {getActiveFiltersCount()} activos
            </Badge>
            <Button variant="ghost" size="sm" onClick={clearFilters}>
              <X className="w-4 h-4 mr-1" />
              Limpiar
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Búsqueda por texto */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700">
            <Search className="w-4 h-4 inline mr-1" />
            Búsqueda por texto
          </label>
          <Input
            placeholder="Buscar en título, descripción, etiquetas..."
            value={localFilters.query || ''}
            onChange={(e) => handleFilterChange('query', e.target.value)}
            className="w-full"
          />
        </div>

        {/* Categoría */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700">
            <Tag className="w-4 h-4 inline mr-1" />
            Categoría
          </label>
          <Select
            value={localFilters.category_id || ''}
            onChange={(e) => handleFilterChange('category_id', e.target.value)}
            options={[
              { value: '', label: 'Todas las categorías' },
              ...categories.map(cat => ({
                value: cat.id,
                label: cat.name
              }))
            ]}
            className="w-full"
          />
        </div>

        {/* Rango de precios */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700">
            <DollarSign className="w-4 h-4 inline mr-1" />
            Rango de precios (Gs.)
          </label>
          <div className="grid grid-cols-2 gap-2">
            <Input
              type="number"
              placeholder="Precio mínimo"
              value={localFilters.min_price || ''}
              onChange={(e) => handleFilterChange('min_price', e.target.value ? Number(e.target.value) : undefined)}
              className="w-full"
            />
            <Input
              type="number"
              placeholder="Precio máximo"
              value={localFilters.max_price || ''}
              onChange={(e) => handleFilterChange('max_price', e.target.value ? Number(e.target.value) : undefined)}
              className="w-full"
            />
          </div>
        </div>

        {/* Condición del producto */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700">
            <Star className="w-4 h-4 inline mr-1" />
            Condición
          </label>
          <Select
            value={localFilters.condition || ''}
            onChange={(e) => handleFilterChange('condition', e.target.value)}
            options={[
              { value: '', label: 'Todas las condiciones' },
              { value: 'nuevo', label: 'Nuevo' },
              { value: 'usado_como_nuevo', label: 'Usado como nuevo' },
              { value: 'usado', label: 'Usado' },
            ]}
            className="w-full"
          />
        </div>

        {/* Tipo de venta */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700">
            <TrendingUp className="w-4 h-4 inline mr-1" />
            Tipo de venta
          </label>
          <Select
            value={localFilters.sale_type || ''}
            onChange={(e) => handleFilterChange('sale_type', e.target.value)}
            options={[
              { value: '', label: 'Todos los tipos' },
              { value: 'venta', label: 'Venta' },
              { value: 'subasta', label: 'Subasta' },
              { value: 'intercambio', label: 'Intercambio' },
            ]}
            className="w-full"
          />
        </div>

        {/* Ubicación */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700">
            <MapPin className="w-4 h-4 inline mr-1" />
            Ubicación
          </label>
          <Input
            placeholder="Ciudad, departamento..."
            value={localFilters.location || ''}
            onChange={(e) => handleFilterChange('location', e.target.value)}
            className="w-full"
          />
        </div>

        {/* Etiquetas populares */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700">
            <Tag className="w-4 h-4 inline mr-1" />
            Etiquetas populares
          </label>
          <div className="flex flex-wrap gap-2">
            {['iPhone', 'Samsung', 'MacBook', 'PlayStation', 'Nintendo', 'AirPods', 'iPad', 'Apple Watch'].map((tag) => (
              <label key={tag} className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={localFilters.tags?.includes(tag) || false}
                  onChange={(e) => {
                    const currentTags = localFilters.tags || [];
                    const newTags = e.target.checked 
                      ? [...currentTags, tag]
                      : currentTags.filter(t => t !== tag);
                    handleFilterChange('tags', newTags);
                  }}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">{tag}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Separador */}
        <div className="border-t border-gray-200" />

        {/* Botones de acción */}
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-600">
            {getActiveFiltersCount() > 0 && (
              <span>{getActiveFiltersCount()} filtros aplicados</span>
            )}
          </div>
          
          <div className="flex items-center space-x-2">
            <Button variant="outline" onClick={clearFilters}>
              Limpiar filtros
            </Button>
            <Button onClick={applyFilters}>
              Aplicar filtros
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}