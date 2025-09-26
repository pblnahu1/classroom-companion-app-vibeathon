import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || !session.accessToken) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const accessToken = session.accessToken as string;

  try {
    const res = await fetch(
      "https://classroom.googleapis.com/v1/courses?courseStates=ACTIVE&pageSize=20",
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        cache: "no-store",
      }
    );

    if (!res.ok) {
      const text = await res.text();
      return NextResponse.json(
        { error: "Google API error", details: text },
        { status: res.status }
      );
    }

    const data = await res.json();
    return NextResponse.json({ courses: data.courses ?? [] });
  } catch (err: unknown) {
    const e = err as { message?: string };
    return NextResponse.json({ error: e?.message ?? "Unknown error" }, { status: 500 });
  }
}
