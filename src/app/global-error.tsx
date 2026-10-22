"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="es">
      <body
        style={{
          margin: 0,
          minHeight: "100dvh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "system-ui, sans-serif",
          background: "#f4f1ea",
          color: "#1c2430",
          textAlign: "center",
          padding: "1.5rem",
        }}
      >
        <div>
          <h1 style={{ fontWeight: 500, fontSize: "1.25rem" }}>
            Error inesperado
          </h1>
          <p style={{ marginTop: "0.75rem", fontSize: "0.875rem", opacity: 0.75 }}>
            Recarga la app. Si se repite, anota el código.
          </p>
          {error.digest ? (
            <p
              style={{
                marginTop: "1rem",
                fontFamily: "ui-monospace, monospace",
                fontSize: "0.75rem",
              }}
            >
              Digest: {error.digest}
            </p>
          ) : null}
          <button
            type="button"
            onClick={reset}
            style={{
              marginTop: "1.25rem",
              border: "none",
              borderRadius: "999px",
              padding: "0.65rem 1.25rem",
              background: "#1c2740",
              color: "#f4f1ea",
              fontSize: "0.875rem",
              cursor: "pointer",
            }}
          >
            Reintentar
          </button>
        </div>
      </body>
    </html>
  );
}
