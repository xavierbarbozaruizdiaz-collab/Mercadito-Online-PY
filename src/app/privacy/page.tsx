// ============================================
// MERCADITO ONLINE PY - PRIVACY POLICY
// Página temporal de Política de Privacidad
// ============================================

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-gray-50 dark:bg-[#1A1A1A] py-16 px-4">
      <div className="max-w-3xl mx-auto bg-white dark:bg-[#252525] border border-gray-200 dark:border-gray-700 rounded-xl shadow-sm p-8 space-y-6">
        <header>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
            Política de Privacidad
          </h1>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            Última actualización: {new Date().toLocaleDateString('es-PY')}
          </p>
        </header>

        <section className="space-y-4 text-gray-700 dark:text-gray-300 leading-relaxed">
          <p>
            Esta página describe de forma preliminar cómo Mercadito Online PY maneja los datos
            personales. Es un contenido temporal que será reemplazado por la política oficial.
          </p>
          <p>
            Conservaremos los datos provistos para permitir la operación de la plataforma y
            mejorar tu experiencia. No compartiremos información sensible sin tu autorización
            previa, salvo requerimientos legales.
          </p>
          <p>
            Para ejercer tus derechos o solicitar más detalles, escribinos a{' '}
            <a href="mailto:contacto@mercadito-online-py.com" className="text-blue-600 hover:underline">
              contacto@mercadito-online-py.com
            </a>.
          </p>
        </section>
      </div>
    </main>
  );
}



















