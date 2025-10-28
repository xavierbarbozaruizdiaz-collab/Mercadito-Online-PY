import AnalyticsDashboard from '@/components/AnalyticsDashboard';

export default function AdminPage() {
  return (
    <main className="min-h-screen bg-gray-50 p-4 sm:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Panel de Administración</h1>
          <p className="text-gray-600 mt-2">Métricas y estadísticas del marketplace</p>
        </div>

        <AnalyticsDashboard />
      </div>
    </main>
  );
}