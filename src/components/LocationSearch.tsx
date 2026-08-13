"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useState, useTransition } from "react";

export default function LocationSearch({ initialValue = "" }: { initialValue?: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [value, setValue] = useState(initialValue);
  const [isPending, startTransition] = useTransition();

  function handleSearch(term: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (term.trim()) {
      params.set("loc", term.trim());
    } else {
      params.delete("loc");
    }

    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`);
    });
  }

  return (
    <div className="relative flex items-center">
      <input
        type="text"
        placeholder="Type location (e.g., Princeton, Remote, NYC)..."
        value={value}
        onChange={(e) => {
          setValue(e.target.value);
          handleSearch(e.target.value);
        }}
        className="px-3 py-1.5 rounded-lg border border-slate-200 text-sm font-medium bg-white text-slate-700 placeholder:text-slate-400 focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand w-64 transition-all"
      />
      {value && (
        <button
          onClick={() => {
            setValue("");
            handleSearch("");
          }}
          className="absolute right-2 text-xs text-slate-400 hover:text-slate-600 px-1 py-0.5"
        >
          ✕
        </button>
      )}
    </div>
  );
}