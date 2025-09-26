"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";

type Course = { id: string; name: string };

type CourseWork = {
  id: string;
  title?: string;
  dueDate?: { year: number; month: number; day: number };
  dueTime?: { hours: number; minutes: number; seconds?: number; nanos?: number };
};

type StudentSubmission = {
  id: string;
  state?: string; // e.g., NEW | CREATED | TURNED_IN | RETURNED
  late?: boolean;
  updateTime?: string;
};

export default function ProgressDashboard() {
  const { data: session } = useSession();
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [metrics, setMetrics] = useState<{
    totalTasks: number;
    submitted: number;
    returned: number;
    turnedIn: number;
    onTimeEstimate: number; // simple heuristic
  } | null>(null);

  useEffect(() => {
    if (!session) return;
    (async () => {
      try {
        const res = await fetch("/api/classroom/courses", { cache: "no-store" });
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error || "Error loading courses");
        setCourses(data.courses || []);
        if ((data.courses || []).length > 0) {
          setSelectedCourseId(data.courses[0].id);
        }
      } catch (e: unknown) {
        const err = e as { message?: string };
        setError(err?.message || "Unknown error");
      }
    })();
  }, [session]);

  // We only need the selectedCourseId for metrics; selectedCourse object is not required.

  async function computeMetrics(courseId: string) {
    setLoading(true);
    setError(null);
    setMetrics(null);
    try {
      const cwRes = await fetch(`/api/classroom/coursework?courseId=${encodeURIComponent(courseId)}`, { cache: "no-store" });
      const cwData = await cwRes.json();
      if (!cwRes.ok) throw new Error(cwData?.error || "Error loading courseWork");
      const courseWork: CourseWork[] = cwData.courseWork || [];

      // Fetch submissions for each coursework (for current user)
      const submissionLists = await Promise.all(
        courseWork.map(async (cw) => {
          const sRes = await fetch(
            `/api/classroom/submissions?courseId=${encodeURIComponent(courseId)}&courseWorkId=${encodeURIComponent(cw.id)}`,
            { cache: "no-store" }
          );
          const sData = await sRes.json();
          if (!sRes.ok) throw new Error(sData?.error || "Error loading submissions");
          const list: StudentSubmission[] = sData.studentSubmissions || [];
          // For the student perspective, usually there is one submission per coursework
          return list[0];
        })
      );

      const totalTasks = courseWork.length;
      let turnedIn = 0;
      let returned = 0;
      let onTimeEstimate = 0;

      submissionLists.forEach((s, idx) => {
        if (!s) return;
        if (s.state === "TURNED_IN") turnedIn += 1;
        if (s.state === "RETURNED") returned += 1;
        // On-time heuristic: if coursework has dueDate and the submission updateTime exists and is before due
        const cw = courseWork[idx];
        if (cw?.dueDate && s.updateTime && (s.state === "TURNED_IN" || s.state === "RETURNED")) {
          const due = new Date(
            cw.dueDate.year,
            (cw.dueDate.month || 1) - 1,
            cw.dueDate.day || 1,
            cw.dueTime?.hours || 23,
            cw.dueTime?.minutes || 59,
            cw.dueTime?.seconds || 59
          );
          const submittedAt = new Date(s.updateTime);
          if (submittedAt.getTime() <= due.getTime()) onTimeEstimate += 1;
        }
      });
      setMetrics({
        totalTasks,
        submitted: turnedIn + returned,
        returned,
        turnedIn,
        onTimeEstimate,
      });
    } catch (e: unknown) {
      const err = e as { message?: string };
      setError(err?.message || "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (selectedCourseId) {
      computeMetrics(selectedCourseId);
    }
  }, [selectedCourseId]);

  if (!session) return null;

  return (
    <section className="w-full max-w-full border rounded-lg p-5 bg-[var(--surface)] border-[var(--border)]">
      <div className="flex items-center justify-between gap-3 mb-4">
        <h2 className="text-xl font-semibold">Progreso del estudiante</h2>
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

      {loading && <p className="text-sm opacity-70">Calculando métricas...</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}

      {metrics && !loading && !error && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="rounded-md border p-4 bg-[var(--surface-2)] border-[var(--border)]">
            <div className="text-xs" style={{ color: 'var(--muted)' }}>Tareas</div>
            <div className="text-2xl font-semibold" style={{ color: 'var(--brand)' }}>{metrics.totalTasks}</div>
          </div>
          <div className="rounded-md border p-4 bg-[var(--surface-2)] border-[var(--border)]">
            <div className="text-xs" style={{ color: 'var(--muted)' }}>Entregadas</div>
            <div className="text-2xl font-semibold" style={{ color: 'var(--accent)' }}>{metrics.submitted}</div>
          </div>
          <div className="rounded-md border p-4 bg-[var(--surface-2)] border-[var(--border)]">
            <div className="text-xs" style={{ color: 'var(--muted)' }}>Devueltas</div>
            <div className="text-2xl font-semibold" style={{ color: 'var(--brand)' }}>{metrics.returned}</div>
          </div>
          <div className="rounded-md border p-4 bg-[var(--surface-2)] border-[var(--border)]">
            <div className="text-xs" style={{ color: 'var(--muted)' }}>A tiempo (estimado)</div>
            <div className="text-2xl font-semibold" style={{ color: 'var(--warn)' }}>
              {metrics.onTimeEstimate}/{metrics.submitted}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
