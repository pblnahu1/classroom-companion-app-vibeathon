"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";

type Course = { id: string; name: string };

type Announcement = {
  id: string;
  text?: string;
  updateTime?: string;
  alternateLink?: string;
};

type CourseWork = {
  id: string;
  title?: string;
  dueDate?: { year: number; month: number; day: number };
  dueTime?: { hours?: number; minutes?: number; seconds?: number };
  alternateLink?: string;
};

type StudentSubmission = {
  id: string;
  state?: string; // NEW | CREATED | TURNED_IN | RETURNED
  updateTime?: string;
};

function toDate(d?: CourseWork["dueDate"], t?: CourseWork["dueTime"]) {
  if (!d) return null;
  return new Date(
    d.year,
    (d.month || 1) - 1,
    d.day || 1,
    t?.hours ?? 23,
    t?.minutes ?? 59,
    t?.seconds ?? 59
  );
}

export default function NotificationsPanel() {
  const { data: session } = useSession();
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState<string>("");

  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [upcoming, setUpcoming] = useState<CourseWork[]>([]);
  const [missing, setMissing] = useState<CourseWork[]>([]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!session) return;
    (async () => {
      try {
        const res = await fetch("/api/classroom/courses", { cache: "no-store" });
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error || "Error loading courses");
        setCourses(data.courses || []);
        if ((data.courses || []).length > 0) setSelectedCourseId(data.courses[0].id);
      } catch (e: unknown) {
        const err = e as { message?: string };
        setError(err?.message || "Unknown error");
      }
    })();
  }, [session]);

  // selectedCourse object not needed; we rely on selectedCourseId

  useEffect(() => {
    if (!selectedCourseId) return;
    (async () => {
      setLoading(true);
      setError(null);
      setAnnouncements([]);
      setUpcoming([]);
      setMissing([]);
      try {
        // Announcements
        const aRes = await fetch(`/api/classroom/announcements?courseId=${encodeURIComponent(selectedCourseId)}`, { cache: "no-store" });
        const aData = await aRes.json();
        if (aRes.ok) setAnnouncements(aData.announcements || []);

        // Coursework
        const cwRes = await fetch(`/api/classroom/coursework?courseId=${encodeURIComponent(selectedCourseId)}`, { cache: "no-store" });
        const cwData = await cwRes.json();
        if (!cwRes.ok) throw new Error(cwData?.error || "Error loading courseWork");
        const courseWork: CourseWork[] = cwData.courseWork || [];

        // Determine upcoming (next 7 days) and missing (no TURNED_IN/RETURNED)
        const now = new Date();
        const in7d = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

        const upcomingCW: CourseWork[] = [];
        const missingCW: CourseWork[] = [];

        for (const cw of courseWork) {
          const due = toDate(cw.dueDate, cw.dueTime);
          if (due && due > now && due <= in7d) {
            upcomingCW.push(cw);
          }
          // Submission for current user
          try {
            const sRes = await fetch(`/api/classroom/submissions?courseId=${encodeURIComponent(selectedCourseId)}&courseWorkId=${encodeURIComponent(cw.id)}`, { cache: "no-store" });
            const sData = await sRes.json();
            if (sRes.ok) {
              const submission: StudentSubmission | undefined = (sData.studentSubmissions || [])[0];
              const delivered = submission && (submission.state === "TURNED_IN" || submission.state === "RETURNED");
              if (!delivered && due && due < in7d) {
                missingCW.push(cw);
              }
            }
          } catch {
            // ignore per-item errors
          }
        }

        setUpcoming(upcomingCW);
        setMissing(missingCW);
      } catch (e: unknown) {
        const err = e as { message?: string };
        setError(err?.message || "Unknown error");
      } finally {
        setLoading(false);
      }
    })();
  }, [selectedCourseId]);

  if (!session) return null;

  return (
    <section className="w-full max-w-full border border-zinc-700 rounded-lg p-4 bg-white/80 dark:bg-white/5">
      <div className="flex items-center justify-between gap-3 mb-4">
        <h2 className="text-lg font-semibold">Notificaciones</h2>
        <select
          value={selectedCourseId}
          onChange={(e) => setSelectedCourseId(e.target.value)}
          className="border rounded-md px-3 py-2 text-sm bg-[var(--surface-2)] border-[var(--border)]"
        >
          {courses.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      {loading && <p className="text-sm opacity-70">Cargando...</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}

      {!loading && !error && (
        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-md p-3 bg-indigo-900 text-indigo-100">
            <div className="text-sm font-medium mb-2">Anuncios recientes</div>
            <ul className="space-y-2">
              {announcements.length === 0 && (
                <li className="text-sm opacity-70">Sin anuncios recientes</li>
              )}
              {announcements.slice(0, 5).map((a) => (
                <li key={a.id} className="text-sm">
                  <div className="line-clamp-3">{a.text || "(sin contenido)"}</div>
                  {a.updateTime && (
                    <div className="text-xs opacity-60">{new Date(a.updateTime).toLocaleString()}</div>
                  )}
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-md p-3 bg-amber-900 text-amber-100">
            <div className="text-sm font-medium mb-2">Entregas próximas / pendientes</div>
            <ul className="space-y-2">
              {upcoming.length === 0 && missing.length === 0 && (
                <li className="text-sm opacity-70">Sin recordatorios por ahora</li>
              )}
              {upcoming.map((cw) => (
                <li key={`u-${cw.id}`} className="text-sm">
                  <div className="font-medium">{cw.title || "(sin título)"}</div>
                  <div className="text-xs opacity-60">Próximo vencimiento</div>
                </li>
              ))}
              {missing.map((cw) => (
                <li key={`m-${cw.id}`} className="text-sm">
                  <div className="font-medium">{cw.title || "(sin título)"}</div>
                  <div className="text-xs text-red-700">Pendiente de entrega</div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </section>
  );
}
