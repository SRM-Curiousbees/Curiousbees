'use client';

import React, { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { ChevronDown, Loader2 } from 'lucide-react';
import { apiFetch } from '@/lib/api-client';

interface DepartmentSelectProps {
  facultyValue: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
}

export default function DepartmentSelect({ 
  facultyValue, 
  value, 
  onChange, 
  error 
}: DepartmentSelectProps) {
  const [departments, setDepartments] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!facultyValue) {
      setDepartments([]);
      return;
    }
    async function loadDepts() {
      setLoading(true);
      try {
        const res = await apiFetch(`/api/departments?facultyId=${encodeURIComponent(facultyValue)}`);
        if (res.ok) {
          const data = await res.json();
          setDepartments(Array.isArray(data) ? data : []);
        }
      } catch (e) {
        console.error('Failed to load departments', e);
      } finally {
        setLoading(false);
      }
    }
    loadDepts();
  }, [facultyValue]);

  return (
    <div className="relative pt-6 text-left">
      <label 
        className={cn(
          "absolute top-0 left-0 font-label-caps text-label-caps transition-all duration-200",
          value ? "text-primary" : "text-on-surface-variant"
        )}
        htmlFor="department"
      >
        Department
      </label>
      <div className="relative flex items-center">
        <select
          id="department"
          name="department"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={!facultyValue || (!loading && departments.length === 0)}
          className={cn(
            "w-full input-underline text-on-surface font-body-md bg-transparent appearance-none cursor-pointer pr-8",
            error && "border-error focus:border-error"
          )}
        >
          <option value="" disabled className="bg-white text-outline">
            {loading 
              ? 'Loading Departments...' 
              : !facultyValue 
                ? 'Select Faculty First' 
                : departments.length === 0 
                  ? 'No Departments Registered' 
                  : 'Select Department'}
          </option>
          {departments.map((dept) => (
            <option key={dept.id} value={dept.id} className="bg-white text-on-surface">
              {dept.name}
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
