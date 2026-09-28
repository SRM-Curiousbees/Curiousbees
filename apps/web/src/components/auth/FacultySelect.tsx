'use client';

import React, { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { ChevronDown, Loader2 } from 'lucide-react';
import { apiFetch } from '@/lib/api-client';

interface FacultySelectProps {
  value: string;
  onChange: (value: string) => void;
  error?: string;
}

export default function FacultySelect({ value, onChange, error }: FacultySelectProps) {
  const [faculties, setFaculties] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function loadFaculties() {
      setLoading(true);
      try {
        const res = await apiFetch('/api/faculties');
        if (res.ok) {
          const data = await res.json();
          setFaculties(Array.isArray(data) ? data : []);
        }
      } catch (e) {
        console.error('Failed to load faculties', e);
      } finally {
        setLoading(false);
      }
    }
    loadFaculties();
  }, []);

  return (
    <div className="relative pt-6 text-left">
      <label 
        className={cn(
          "absolute top-0 left-0 font-label-caps text-label-caps transition-all duration-200",
          value ? "text-primary" : "text-on-surface-variant"
        )}
        htmlFor="faculty"
      >
        Faculty
      </label>
      <div className="relative flex items-center">
        <select
          id="faculty"
          name="faculty"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={cn(
            "w-full input-underline text-on-surface font-body-md bg-transparent appearance-none cursor-pointer pr-8",
            error && "border-error focus:border-error"
          )}
        >
          <option value="" disabled className="bg-white text-outline">
            {loading ? 'Loading Faculties...' : 'Select Faculty'}
          </option>
          {faculties.map((fac) => (
            <option key={fac.id} value={fac.id} className="bg-white text-on-surface">
              {fac.name}
            </option>
          ))}
        </select>
        <div className="pointer-events-none absolute right-0 top-1/2 -translate-y-1/2 text-on-surface-variant flex items-center">
          {loading ? (
            <Loader2 className="w-4 h-4 text-outline animate-spin" />
          ) : (
            <ChevronDown className="w-4 h-4 text-outline" />
          )}
        </div>
      </div>
      {error && (
        <p className="text-[11px] text-error font-semibold mt-1">{error}</p>
      )}
    </div>
  );
}
