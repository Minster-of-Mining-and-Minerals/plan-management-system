import React from "react";

export default function GlobalNotFound() {
  return (
    <html lang="en">
      <body className="antialiased bg-background text-foreground">
        <div className="flex min-h-screen flex-col items-center justify-center px-4 text-center">
          <h1 className="text-6xl font-bold text-primary">404</h1>
          <p className="mt-4 text-lg text-muted-foreground">Page not found</p>
          <a
            href="/"
            className="mt-8 rounded-md bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            Go home
          </a>
        </div>
      </body>
    </html>
  );
}
