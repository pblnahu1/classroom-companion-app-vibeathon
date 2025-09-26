import AuthButton from "@/components/AuthButton";
import CoursesList from "@/components/CoursesList";
import NotificationsPanel from "@/components/NotificationsPanel";
import ProgressDashboard from "@/components/ProgressDashboard";

export default function Home() {
  return (
    <div className="font-sans min-h-screen p-6 sm:p-10">
      <main className="mx-auto w-full max-w-6xl space-y-8">
        {/* Hero */}
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-6 sm:p-8">
            <div className="mb-4 inline-flex items-center gap-2 rounded-md border border-[var(--border)] bg-[var(--surface-2)] px-3 py-1 text-xs" style={{ color: 'var(--muted)' }}>
              Semillero Digital
              <span className="opacity-60">•</span>
              Classroom Companion
            </div>
            <h1 className="text-3xl sm:text-4xl font-semibold leading-tight mb-3">
              Seguimiento y notificaciones para Google Classroom
            </h1>
            <p className="text-base sm:text-lg" style={{ color: 'var(--muted)' }}>
              Visualizá tu avance, recibí recordatorios y obtené métricas útiles sobre tareas y participación. Simple, claro y rápido.
            </p>

            <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="rounded-md border border-[var(--border)] bg-[var(--surface-2)] p-3">
                <div className="text-sm font-medium">Progreso y puntualidad</div>
                <div className="text-xs mt-1" style={{ color: 'var(--muted)' }}>
                  KPIs de entregas, porcentaje a tiempo y promedio de retraso.
                </div>
              </div>
              <div className="rounded-md border border-[var(--border)] bg-[var(--surface-2)] p-3">
                <div className="text-sm font-medium">Recordatorios inteligentes</div>
                <div className="text-xs mt-1" style={{ color: 'var(--muted)' }}>
                  Pendientes, vencimientos y próximos entregables en un vistazo.
                </div>
              </div>
              <div className="rounded-md border border-[var(--border)] bg-[var(--surface-2)] p-3">
                <div className="text-sm font-medium">Resumen semanal/mensual</div>
                <div className="text-xs mt-1" style={{ color: 'var(--muted)' }}>
                  Tendencias y desempeño reciente para tomar acción.
                </div>
              </div>
              <div className="rounded-md border border-[var(--border)] bg-[var(--surface-2)] p-3">
                <div className="text-sm font-medium">Privacidad y seguridad</div>
                <div className="text-xs mt-1" style={{ color: 'var(--muted)' }}>
                  Login con Google y permisos de solo lectura para tus datos.
                </div>
              </div>
            </div>
          </div>

          {/* Panel de login */}
          <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-6 sm:p-8 flex flex-col justify-between">
            <div>
              <h2 className="text-2xl font-semibold">Ingresá con tu cuenta Google</h2>
              <p className="mt-2 text-sm" style={{ color: 'var(--muted)' }}>
                Usamos tu email de Google Classroom para identificarte. No publicamos nada en tu nombre.
              </p>
            </div>
            <div className="mt-6">
              <AuthButton />
              <p className="mt-3 text-xs" style={{ color: 'var(--muted)' }}>
                Al continuar, aceptás las políticas de uso de tu institución y de Google.
              </p>
            </div>
          </div>
        </section>

        {/* Contenido de la app (visible al iniciar sesión) */}
        <section className="space-y-6">
          <CoursesList />
          <ProgressDashboard />
          <NotificationsPanel />
        </section>
      </main>
    </div>
  );
}
