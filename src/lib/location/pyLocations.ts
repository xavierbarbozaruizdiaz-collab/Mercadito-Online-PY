// Ubicaciones de Paraguay (versión mínima, extensible)

export const PY_DEPARTMENTS: string[] = [
  'Asunción',
  'Alto Paraguay',
  'Alto Paraná',
  'Amambay',
  'Boquerón',
  'Caaguazú',
  'Caazapá',
  'Canindeyú',
  'Central',
  'Concepción',
  'Cordillera',
  'Guairá',
  'Itapúa',
  'Misiones',
  'Ñeembucú',
  'Paraguarí',
  'Presidente Hayes',
  'San Pedro',
];

// Mapa base de ciudades por departamento (solo ejemplos, ampliable)
export const PY_CITIES_BY_DEPARTMENT: Record<string, string[]> = {
  'Asunción': ['Asunción'],
  'Central': [
    'San Lorenzo',
    'Luque',
    'Fernando de la Mora',
    'Lambaré',
    'Mariano Roque Alonso',
    'Capiatá',
  ],
  'Alto Paraná': ['Ciudad del Este', 'Presidente Franco', 'Hernandarias', 'Minga Guazú'],
};

export function getCities(department?: string | null): string[] {
  if (!department) return [];
  return PY_CITIES_BY_DEPARTMENT[department] || [];
}


