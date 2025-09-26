"use client";

import { signIn, signOut, useSession } from "next-auth/react";

export default function AuthButton() {
  const { data: session, status } = useSession();

  if (status === "loading") {
    return (
      <button className="rounded-md border px-4 py-2 text-sm opacity-60" disabled>
        Cargando...
      </button>
    );
  }

  if (!session) {
    return (
      <button
        className="rounded-md px-4 py-2 text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 shadow-sm"
        onClick={() => signIn("google")}
      >
        Ingresar con Google
      </button>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <span className="text-sm font-medium">{session.user?.email}</span>
      <button
        className="rounded-md px-4 py-2 text-sm font-medium bg-red-600 text-white hover:bg-red-700 shadow-sm"
        onClick={() => signOut()}
      >
        Cerrar sesión
      </button>
    </div>
  );
}
