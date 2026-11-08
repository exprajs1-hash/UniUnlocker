import { connection } from "next/server";
import { Suspense } from "react";

async function Connection() {
  await connection();
  return null;
}

/**
 * For otherwise static pages under a layout whose metadata reads the database.
 * It tells Next that streaming the metadata at request time is intentional, while
 * the page content itself stays in the prerendered shell.
 */
export function DynamicMarker() {
  return (
    <Suspense>
      <Connection />
    </Suspense>
  );
}
