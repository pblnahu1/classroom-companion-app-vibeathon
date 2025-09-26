"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";

interface Course {
  id: string;
  name: string;
  section?: string;
  courseState?: string;
}

export default function CoursesList() {
  const { data: session } = useSession();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [courses, setCourses] = useState<Course[]>([]);

  useEffect(() => {
    if (!session) return;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/classroom/courses", { cache: "no-store" });
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data?.details || data?.error || "Error fetching courses");
        }
        setCourses(data.courses || []);
      } catch (e: unknown) {
        const err = e as { message?: string };
        setError(err?.message || "Unknown error");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [session]);

  if (!session) {
    return null;
  }

  return (
    <div className="w-full max-w-full">
      <h2 className="text-xl font-semibold mb-3">Cursos activos</h2>
      {loading && <p className="text-sm opacity-70">Cargando cursos...</p>}
      {error && (
        <p className="text-sm text-red-600">Error al cargar cursos: {error}</p>
      )}
      {!loading && !error && (
        <ul className="space-y-3">
          {courses.length === 0 && (
            <li className="text-sm opacity-70">No se encontraron cursos.</li>
          )}
          {courses.map((c) => (
            <li
              key={c.id}
              className="rounded-md border px-5 py-4 bg-[var(--surface)] border-[var(--border)] hover:shadow-sm transition-shadow"
            >
              <div className="font-medium text-base flex items-center gap-2">
                <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: "var(--brand)" }} />
                {c.name}
              </div>
              <div className="mt-1 flex flex-wrap gap-4 text-[13px]" style={{ color: "var(--muted)" }}>
                {c.section && <span>Sección: {c.section}</span>}
                {c.courseState && <span>Estado: {c.courseState}</span>}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
