import React, { useState, useEffect, useRef } from "react";
import { Search, MapPin, Globe2, Network } from "lucide-react";
import { GeoNode } from "./data";
import { Input } from "../ui/input";

interface GeoSearchProps {
  nodes: GeoNode[];
  onSelect: (node: GeoNode) => void;
}

export function GeoSearch({ nodes, onSelect }: GeoSearchProps) {
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const results = query.trim()
    ? nodes
        .filter((n) => {
          const q = query.toLowerCase();
          return (
            n.ip.toLowerCase().includes(q) ||
            n.country.toLowerCase().includes(q) ||
            n.label.toLowerCase().includes(q) ||
            n.asnOrg.toLowerCase().includes(q)
          );
        })
        .slice(0, 6)
    : [];

  return (
    <div className="relative z-50 w-full max-w-sm" ref={containerRef}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          placeholder="Search IP, city, country, ASN..."
          className="pl-9 h-9 bg-background/50 backdrop-blur-sm border-border/60 text-xs font-mono rounded-full focus-visible:ring-1 focus-visible:ring-primary shadow-sm"
        />
      </div>

      {isOpen && query.trim() && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-background/95 backdrop-blur-md border border-border/60 rounded-lg shadow-xl overflow-hidden font-mono text-xs">
          {results.length > 0 ? (
            <ul className="py-1">
              {results.map((n) => (
                <li key={n.id}>
                  <button
                    onClick={() => {
                      onSelect(n);
                      setIsOpen(false);
                      setQuery("");
                    }}
                    className="w-full text-left px-3 py-2 hover:bg-secondary/50 transition-colors flex flex-col gap-1"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-primary flex items-center gap-1.5">
                        <MapPin className="w-3 h-3" /> {n.label}
                      </span>
                      <span className="text-[10px] text-muted-foreground bg-secondary/80 px-1.5 rounded">
                        {n.country}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Network className="w-3 h-3" /> {n.ip}
                      </span>
                      <span className="flex items-center gap-1">
                        <Globe2 className="w-3 h-3" /> {n.asnOrg}
                      </span>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <div className="p-3 text-center text-muted-foreground">
              No matches found for "{query}"
            </div>
          )}
        </div>
      )}
    </div>
  );
}
