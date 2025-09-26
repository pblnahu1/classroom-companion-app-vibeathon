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
  const [filter, setFilter] = useState<"all" | "pending" | "overdue" | "delivered">("all");

  const [metrics, setMetrics] = useState<{
    totalTasks: number;
    submitted: number;
    returned: number;
    turnedIn: number;
    onTimeEstimate: number; // simple heuristic
    pending: number;
    percentOnTime: number; // 0-100
    avgDelayHours: number; // promedio de retraso en horas (solo tareas entregadas tarde)
  } | null>(null);

  const [details, setDetails] = useState<{
    pending: { id: string; title: string; due?: Date }[];
    overdue: { id: string; title: string; due?: Date }[];
    delivered: { id: string; title: string; state?: string; submittedAt?: Date; onTime?: boolean; delayHours?: number }[];
  }>({ pending: [], overdue: [], delivered: [] });

  const [summary, setSummary] = useState<{
    week: { delivered: number; onTimePercent: number; pending: number; overdue: number };
    month: { delivered: number; onTimePercent: number; pending: number; overdue: number };
  }>({ week: { delivered: 0, onTimePercent: 0, pending: 0, overdue: 0 }, month: { delivered: 0, onTimePercent: 0, pending: 0, overdue: 0 } });

  function startOfWeek(d: Date): Date {
    const date = new Date(d);
    const day = (date.getDay() + 6) % 7; // monday=0
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() - day);
    return date;
  }

  function startOfMonth(d: Date): Date {
    const date = new Date(d);
    date.setHours(0, 0, 0, 0);
    date.setDate(1);
    return date;
  }

  function formatRemaining(to?: Date): string {
    if (!to) return "";
    const now = new Date();
    const diffMs = to.getTime() - now.getTime();
    const abs = Math.abs(diffMs);
    const days = Math.floor(abs / (1000 * 60 * 60 * 24));
    const hours = Math.floor((abs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const mins = Math.floor((abs % (1000 * 60 * 60)) / (1000 * 60));
    const base = days > 0 ? `${days}d ${hours}h` : hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
    return diffMs >= 0 ? `En ${base}` : `Hace ${base}`;
  }

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
    setDetails({ pending: [], overdue: [], delivered: [] });
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
      let pending = 0;
      let lateCount = 0;
      let lateHoursSum = 0;

      const pendingList: { id: string; title: string; due?: Date }[] = [];
      const overdueList: { id: string; title: string; due?: Date }[] = [];
      const deliveredList: { id: string; title: string; state?: string; submittedAt?: Date; onTime?: boolean; delayHours?: number }[] = [];

      const now = new Date();
      submissionLists.forEach((s, idx) => {
        if (!s) return;
        if (s.state === "TURNED_IN") turnedIn += 1;
        if (s.state === "RETURNED") returned += 1;
        // On-time heuristic: if coursework has dueDate and the submission updateTime exists and is before due
        const cw = courseWork[idx];
        const hasDelivered = s.state === "TURNED_IN" || s.state === "RETURNED";
        let due: Date | undefined;
        if (cw?.dueDate) {
          due = new Date(
            cw.dueDate.year,
            (cw.dueDate.month || 1) - 1,
            cw.dueDate.day || 1,
            cw.dueTime?.hours ?? 23,
            cw.dueTime?.minutes ?? 59,
            cw.dueTime?.seconds ?? 59
          );
        }
        if (hasDelivered) {
          const submittedAt = s.updateTime ? new Date(s.updateTime) : undefined;
          let onTime: boolean | undefined;
          let delayHours: number | undefined;
          if (due && submittedAt) {
            if (submittedAt.getTime() <= due.getTime()) {
              onTime = true;
              onTimeEstimate += 1;
            } else {
              onTime = false;
              const diffMs = submittedAt.getTime() - due.getTime();
              delayHours = Math.round(diffMs / (1000 * 60 * 60));
              lateCount += 1;
              lateHoursSum += delayHours;
            }
          }
          deliveredList.push({ id: cw.id, title: cw.title || "(Sin título)", state: s.state, submittedAt, onTime, delayHours });
        } else {
          pending += 1;
          if (due) {
            if (now.getTime() > due.getTime()) {
              overdueList.push({ id: cw.id, title: cw.title || "(Sin título)", due });
            } else {
              pendingList.push({ id: cw.id, title: cw.title || "(Sin título)", due });
            }
          } else {
            pendingList.push({ id: cw.id, title: cw.title || "(Sin título)" });
          }
        }
      });
      const deliveredCount = turnedIn + returned;
      const percentOnTime = deliveredCount > 0 ? Math.round((onTimeEstimate / deliveredCount) * 100) : 0;
      const avgDelayHours = lateCount > 0 ? Math.round(lateHoursSum / lateCount) : 0;
      setMetrics({
        totalTasks,
        submitted: deliveredCount,
        returned,
        turnedIn,
        onTimeEstimate,
        pending,
        percentOnTime,
        avgDelayHours,
      });
      setDetails({ pending: pendingList, overdue: overdueList, delivered: deliveredList });

      // Build weekly/monthly summaries
      const weekStart = startOfWeek(now);
      const monthStart = startOfMonth(now);
      // Delivered in week/month by submittedAt
      const deliveredWeek = deliveredList.filter((d) => d.submittedAt && d.submittedAt >= weekStart);
      const deliveredMonth = deliveredList.filter((d) => d.submittedAt && d.submittedAt >= monthStart);
      const onTimeWeek = deliveredWeek.filter((d) => d.onTime === true).length;
      const onTimeMonth = deliveredMonth.filter((d) => d.onTime === true).length;
      const onTimePercentWeek = deliveredWeek.length > 0 ? Math.round((onTimeWeek / deliveredWeek.length) * 100) : 0;
      const onTimePercentMonth = deliveredMonth.length > 0 ? Math.round((onTimeMonth / deliveredMonth.length) * 100) : 0;
      // Pending/overdue in week/month by due date
      const pendingWeek = pendingList.filter((p) => p.due && p.due >= weekStart).length;
      const overdueWeek = overdueList.filter((p) => p.due && p.due >= weekStart).length;
      const pendingMonth = pendingList.filter((p) => p.due && p.due >= monthStart).length;
      const overdueMonth = overdueList.filter((p) => p.due && p.due >= monthStart).length;
      setSummary({
        week: { delivered: deliveredWeek.length, onTimePercent: onTimePercentWeek, pending: pendingWeek, overdue: overdueWeek },
        month: { delivered: deliveredMonth.length, onTimePercent: onTimePercentMonth, pending: pendingMonth, overdue: overdueMonth },
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

      {/* Filters */}
      {/*<div className="mb-4 flex flex-wrap items-center gap-2">
        {([
          { key: "all", label: "Todos" },
          { key: "pending", label: "Pendientes" },
          { key: "overdue", label: "Vencidas" },
          { key: "delivered", label: "Entregadas" },
        ] as const).map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={
              `text-sm px-3 py-1.5 rounded-md border ${
                filter === f.key
                  ? 'bg-[var(--brand)] border-[var(--brand)] text-white'
                  : 'bg-[var(--surface-2)] border-[var(--border)]'
              }`
            }
          >
            {f.label}
          </button>
        ))}
      </div>*/}

      {loading && <p className="text-sm opacity-70">Calculando métricas...</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}

      {metrics && !loading && !error && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-6 gap-4">
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
            <div className="rounded-md border p-4 bg-[var(--surface-2)] border-[var(--border)]">
              <div className="text-xs" style={{ color: 'var(--muted)' }}>Pendientes</div>
              <div className="text-2xl font-semibold" style={{ color: '#eab308' }}>{metrics.pending}</div>
            </div>
            <div className="rounded-md border p-4 bg-[var(--surface-2)] border-[var(--border)]">
              <div className="text-xs" style={{ color: 'var(--muted)' }}>% a tiempo</div>
              <div className="text-2xl font-semibold" style={{ color: 'var(--accent)' }}>{metrics.percentOnTime}%</div>
            </div>
          </div>

          {/* Donut chart + summaries */}
          <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-5">
            <div className="rounded-md border bg-[var(--surface-2)] border-[var(--border)] p-4 flex items-center justify-center">
              {/* Inline SVG Donut: on-time vs late among delivered */}
              {(() => {
                const delivered = Math.max(metrics.submitted, 0);
                const onTime = Math.max(metrics.onTimeEstimate, 0);
                const late = Math.max(delivered - onTime, 0);
                const percent = delivered > 0 ? (onTime / delivered) : 0;
                const size = 140;
                const stroke = 14;
                const radius = (size - stroke) / 2;
                const circumference = 2 * Math.PI * radius;
                const offset = circumference * (1 - percent);
                return (
                  <div className="flex items-center gap-4">
                    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
                      <circle
                        cx={size / 2}
                        cy={size / 2}
                        r={radius}
                        stroke="#334155" /* slate-700 */
                        strokeWidth={stroke}
                        fill="none"
                      />
                      <circle
                        cx={size / 2}
                        cy={size / 2}
                        r={radius}
                        stroke="var(--accent)"
                        strokeWidth={stroke}
                        fill="none"
                        strokeDasharray={`${circumference} ${circumference}`}
                        strokeDashoffset={offset}
                        strokeLinecap="round"
                        transform={`rotate(-90 ${size/2} ${size/2})`}
                      />
                      <text x="50%" y="50%" dominantBaseline="middle" textAnchor="middle" fontSize="18" fill="var(--foreground)">
                        {Math.round(percent * 100)}%
                      </text>
                    </svg>
                    <div className="text-sm">
                      <div><span className="inline-block w-3 h-3 mr-2 rounded" style={{ background: 'var(--accent)' }}></span>A tiempo: <strong>{onTime}</strong></div>
                      <div className="mt-1"><span className="inline-block w-3 h-3 mr-2 rounded" style={{ background: 'var(--danger)' }}></span>Tarde: <strong>{late}</strong></div>
                      {metrics.avgDelayHours > 0 && (
                        <div className="mt-2" style={{ color: 'var(--muted)' }}>Prom. retraso tarde: <strong style={{ color: 'var(--warn)' }}>{metrics.avgDelayHours}h</strong></div>
                      )}
                    </div>
                  </div>
                );
              })()}
            </div>

            <div className="rounded-md border bg-[var(--surface-2)] border-[var(--border)] p-4">
              <div className="text-sm" style={{ color: 'var(--muted)' }}>Resumen semanal</div>
              <div className="mt-2 grid grid-cols-2 gap-3">
                <div>
                  <div className="text-xs" style={{ color: 'var(--muted)' }}>Entregadas</div>
                  <div className="text-xl font-semibold">{summary.week.delivered}</div>
                </div>
                <div>
                  <div className="text-xs" style={{ color: 'var(--muted)' }}>% a tiempo</div>
                  <div className="text-xl font-semibold" style={{ color: 'var(--accent)' }}>{summary.week.onTimePercent}%</div>
                </div>
                <div>
                  <div className="text-xs" style={{ color: 'var(--muted)' }}>Pendientes</div>
                  <div className="text-xl font-semibold" style={{ color: '#eab308' }}>{summary.week.pending}</div>
                </div>
                <div>
                  <div className="text-xs" style={{ color: 'var(--muted)' }}>Vencidas</div>
                  <div className="text-xl font-semibold" style={{ color: 'var(--danger)' }}>{summary.week.overdue}</div>
                </div>
              </div>
            </div>

            <div className="rounded-md border bg-[var(--surface-2)] border-[var(--border)] p-4">
              <div className="text-sm" style={{ color: 'var(--muted)' }}>Resumen mensual</div>
              <div className="mt-2 grid grid-cols-2 gap-3">
                <div>
                  <div className="text-xs" style={{ color: 'var(--muted)' }}>Entregadas</div>
                  <div className="text-xl font-semibold">{summary.month.delivered}</div>
                </div>
                <div>
                  <div className="text-xs" style={{ color: 'var(--muted)' }}>% a tiempo</div>
                  <div className="text-xl font-semibold" style={{ color: 'var(--accent)' }}>{summary.month.onTimePercent}%</div>
                </div>
                <div>
                  <div className="text-xs" style={{ color: 'var(--muted)' }}>Pendientes</div>
                  <div className="text-xl font-semibold" style={{ color: '#eab308' }}>{summary.month.pending}</div>
                </div>
                <div>
                  <div className="text-xs" style={{ color: 'var(--muted)' }}>Vencidas</div>
                  <div className="text-xl font-semibold" style={{ color: 'var(--danger)' }}>{summary.month.overdue}</div>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-5">
            <div className="rounded-md border bg-[var(--surface-2)] border-[var(--border)]">
              <div className="px-4 py-3 border-b border-[var(--border)] flex items-center justify-between">
                <h3 className="text-lg font-semibold">Pendientes</h3>
                <span className="text-xs" style={{ color: 'var(--muted)' }}>{details.pending.length}</span>
              </div>
              <ul className="divide-y divide-[var(--border)]">
                {details.pending.length === 0 && (
                  <li className="px-4 py-3 text-sm" style={{ color: 'var(--muted)' }}>Sin pendientes 🎉</li>
                )}
                {details.pending.map((t) => (
                  <li key={t.id} className="px-4 py-3">
                    <div className="text-sm font-medium">{t.title}</div>
                    {t.due && (
                      <div className="text-xs" style={{ color: 'var(--muted)' }}>
                        Vence: {t.due.toLocaleDateString()} {t.due.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} · {formatRemaining(t.due)}
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-md border bg-[var(--surface-2)] border-[var(--border)]">
              <div className="px-4 py-3 border-b border-[var(--border)] flex items-center justify-between">
                <h3 className="text-lg font-semibold">Vencidas</h3>
                <span className="text-xs" style={{ color: 'var(--muted)' }}>{details.overdue.length}</span>
              </div>
              <ul className="divide-y divide-[var(--border)]">
                {details.overdue.length === 0 && (
                  <li className="px-4 py-3 text-sm" style={{ color: 'var(--muted)' }}>Sin tareas vencidas</li>
                )}
                {details.overdue.map((t) => (
                  <li key={t.id} className="px-4 py-3">
                    <div className="text-sm font-medium">{t.title}</div>
                    {t.due && (
                      <div className="text-xs" style={{ color: 'var(--muted)' }}>
                        Venció: {t.due.toLocaleDateString()} {t.due.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-md border bg-[var(--surface-2)] border-[var(--border)]">
              <div className="px-4 py-3 border-b border-[var(--border)] flex items-center justify-between">
                <h3 className="text-lg font-semibold">Entregadas / Devueltas</h3>
                <span className="text-xs" style={{ color: 'var(--muted)' }}>{details.delivered.length}</span>
              </div>
              <ul className="divide-y divide-[var(--border)]">
                {details.delivered.length === 0 && (
                  <li className="px-4 py-3 text-sm" style={{ color: 'var(--muted)' }}>Sin entregas aún</li>
                )}
                {details.delivered.map((t) => (
                  <li key={t.id} className="px-4 py-3">
                    <div className="text-sm font-medium flex items-center justify-between">
                      <span>{t.title}</span>
                      <span className="text-xs px-2 py-0.5 rounded-full border border-[var(--border)]" style={{ color: t.onTime === false ? 'var(--danger)' : 'var(--accent)' }}>
                        {t.onTime === false ? 'Tarde' : t.onTime === true ? 'A tiempo' : (t.state || 'Entregado')}
                      </span>
                    </div>
                    <div className="mt-1 text-xs" style={{ color: 'var(--muted)' }}>
                      {t.submittedAt ? `Entregado: ${t.submittedAt.toLocaleDateString()} ${t.submittedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : ''}
                      {t.delayHours !== undefined ? ` · Retraso: ${t.delayHours}h` : ''}
                    </div>
                  </li>
                ))}
              </ul>
              {metrics.avgDelayHours > 0 && (
                <div className="px-4 py-3 border-t border-[var(--border)] text-sm">
                  Promedio retraso (solo tarde): <span className="font-semibold" style={{ color: 'var(--warn)' }}>{metrics.avgDelayHours}h</span>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </section>
  );
}
