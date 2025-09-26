import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || !session.accessToken) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const courseId = searchParams.get("courseId");
  const courseWorkId = searchParams.get("courseWorkId");
  if (!courseId || !courseWorkId) {
    return NextResponse.json({ error: "Missing courseId or courseWorkId" }, { status: 400 });
  }

  const accessToken = session.accessToken as string;

  try {
    const url = `https://classroom.googleapis.com/v1/courses/${encodeURIComponent(
      courseId
    )}/courseWork/${encodeURIComponent(courseWorkId)}/studentSubmissions`;

    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: "no-store",
    });

    if (!res.ok) {
      const text = await res.text();
      return NextResponse.json(
        { error: "Google API error", details: text },
        { status: res.status }
      );
    }

    const data = await res.json();
    return NextResponse.json({ studentSubmissions: data.studentSubmissions ?? [] });
  } catch (err: unknown) {
    const e = err as { message?: string };
    return NextResponse.json({ error: e?.message ?? "Unknown error" }, { status: 500 });
  }
}
