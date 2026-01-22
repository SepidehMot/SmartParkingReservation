"use client";

export default function Error({ error, reset }) {
  return (
    <div className="p-4 text-error">
      <h2>Something went wrong in the Map page!</h2>
      <pre className="whitespace-pre-wrap">{String(error?.message)}</pre>
      <button onClick={() => reset()} className="mt-2 border px-3 py-1 rounded">
        Try again
      </button>
    </div>
  );
}
