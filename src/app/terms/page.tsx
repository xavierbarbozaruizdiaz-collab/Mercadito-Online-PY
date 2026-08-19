// ============================================
// MERCADITO ONLINE PY - TERMS
// Página temporal de Términos y Condiciones
// ============================================

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-gray-50 dark:bg-[#1A1A1A] py-16 px-4">
      <div className="max-w-3xl mx-auto bg-white dark:bg-[#252525] border border-gray-200 dark:border-gray-700 rounded-xl shadow-sm p-8 space-y-6">
        <header>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
            Términos y Condiciones
          </h1>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            Última actualización: {new Date().toLocaleDateString('es-PY')}
          </p>
        </header>

        <section className="space-y-4 text-gray-700 dark:text-gray-300 leading-relaxed">
          <p>
            Esta es una versión preliminar de los términos y condiciones de Mercadito Online PY.
            Utilice este texto como referencia temporal mientras se publica el documento legal
            definitivo.
          </p>
          <p>
            Al usar la plataforma, aceptas que esta página es informativa y puede cambiar sin
            previo aviso. Recomendamos revisar periódicamente para conocer los términos vigentes.
          </p>
          <p>
            Para consultas legales o información detallada, comunícate con el equipo de soporte
            mediante <a href="mailto:contacto@mercadito-online-py.com" className="text-blue-600 hover:underline">contacto@mercadito-online-py.com</a>.
          </p>
        </section>
      </div>
    </main>
  );
}


























