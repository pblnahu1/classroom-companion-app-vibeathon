import AuthButton from "@/components/AuthButton";
import CoursesList from "@/components/CoursesList";
import NotificationsPanel from "@/components/NotificationsPanel";
import ProgressDashboard from "@/components/ProgressDashboard";

export default function Home() {
  return (
    <div className="font-sans grid grid-rows-[20px_1fr_20px] items-center justify-items-center min-h-screen p-8 pb-20 gap-16 sm:p-20">
      <main className="flex flex-col gap-6 row-start-2 items-center sm:items-start w-full max-w-4xl">
        <div className="w-full rounded-lg border border-stone-800 bg-stone-950 backdrop-blur px-4 py-8 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Semillero Digital - Integración Classroom</h1>
            <p className="text-xl opacity-70">Demo local: cursos, progreso y notificaciones</p>
          </div>
          <AuthButton />
        </div>

        <CoursesList />

        <ProgressDashboard />

        <NotificationsPanel />
      </main>
    </div>
  );
}
