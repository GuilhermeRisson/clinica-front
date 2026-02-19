"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type Option = { label: string; value: string | number };

type SearchSelectProps = {
  value: string;
  onChange: (value: string) => void;
  options: Option[];
  placeholder?: string;
  searchPlaceholder?: string;
  searchable?: boolean;
  disabled?: boolean;
};

export function SearchSelect({
  value,
  onChange,
  options,
  placeholder = "Selecione",
  searchPlaceholder = "Buscar...",
  searchable = true,
  disabled,
}: SearchSelectProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const containerRef = useRef<HTMLDivElement | null>(null);

  const selectedLabel = useMemo(() => {
    const match = options.find((option) => String(option.value) === String(value));
    return match?.label ?? "";
  }, [options, value]);

  const filtered = useMemo(() => {
    if (!searchable || !query.trim()) {
      return options;
    }
    const needle = query.toLowerCase();
    return options.filter((option) => option.label.toLowerCase().includes(needle));
  }, [options, query, searchable]);

  useEffect(() => {
    if (!open) return;
    function handleClick(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  useEffect(() => {
    if (!open) {
      setQuery("");
    }
  }, [open]);

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        className="flex h-10 w-full items-center justify-between rounded-md border border-zinc-200 bg-white px-3 text-sm"
        onClick={() => !disabled && setOpen((prev) => !prev)}
        disabled={disabled}
      >
        <span className={selectedLabel ? "text-zinc-900" : "text-zinc-400"}>
          {selectedLabel || placeholder}
        </span>
        <span className="text-zinc-400">▾</span>
      </button>

      {open ? (
        <div className="absolute z-40 mt-2 w-full rounded-md border border-zinc-200 bg-white shadow-lg">
          {searchable ? (
            <div className="p-2">
              <input
                className="h-9 w-full rounded-md border border-zinc-200 px-3 text-sm"
                placeholder={searchPlaceholder}
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                autoFocus
              />
            </div>
          ) : null}
          <div className="max-h-56 overflow-auto py-1">
            {filtered.length === 0 ? (
              <div className="px-3 py-2 text-sm text-zinc-500">Nenhum resultado</div>
            ) : (
              filtered.map((option) => (
                <button
                  key={String(option.value)}
                  type="button"
                  className={`flex w-full items-center px-3 py-2 text-left text-sm hover:bg-zinc-100 ${
                    String(option.value) === String(value) ? "bg-zinc-50 font-medium" : ""
                  }`}
                  onClick={() => {
                    onChange(String(option.value));
                    setOpen(false);
                  }}
                >
                  {option.label}
                </button>
              ))
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
