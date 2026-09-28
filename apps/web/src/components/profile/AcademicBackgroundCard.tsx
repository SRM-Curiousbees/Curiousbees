'use client';

import React from 'react';
import { Building2, Shield, Hash, GraduationCap } from 'lucide-react';

interface AcademicBackgroundCardProps {
  user: any;
}

export function AcademicBackgroundCard({ user }: AcademicBackgroundCardProps) {
  const isSupervisor = user?.role === 'RESEARCH_SUPERVISOR';

  const institution = 'SRM Institute of Science and Technology';
  const faculty = user?.departmentRef?.faculty?.name || user?.faculty;
  const department = user?.departmentRef?.name || user?.department || 'Department Not Specified';
  const designation = isSupervisor
    ? (user?.supervisorProfile?.designation || 'Faculty / Supervisor')
    : 'Ph.D. Scholar';
  const registrationId = user?.employeeId || user?.scholarProfile?.registrationNo || user?.id?.substring(0, 8);
  const qualification = isSupervisor
    ? (user?.supervisorProfile?.qualification || 'Doctoral Supervisor')
    : (user?.scholarProfile?.highestQualification || 'Research Scholar');

  return (
    <div className="bg-white border border-[#E4E9F2] rounded-2xl p-6 shadow-xs space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-[#0C4DA2]">
          <Building2 className="w-4 h-4 text-[#0C4DA2]" />
          <span>Academic Background</span>
        </div>
        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
          VERIFIED RECORD
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
        <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-0.5">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Faculty / College</span>
          <p className="text-xs font-extrabold text-[#17233D]">{faculty || institution}</p>
        </div>

        <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-0.5">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Department</span>
          <p className="text-xs font-extrabold text-[#17233D]">{department}</p>
        </div>

        <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-0.5">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
            {isSupervisor ? 'Academic Role / Designation' : 'Academic Standing'}
          </span>
          <p className="text-xs font-extrabold text-[#0C4DA2]">{designation} {qualification ? `(${qualification})` : ''}</p>
        </div>

        <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-0.5">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
            {isSupervisor ? 'Employee ID' : 'Research Registration ID'}
          </span>
          <p className="text-xs font-mono font-extrabold text-[#17233D]">{registrationId}</p>
        </div>
      </div>
    </div>
  );
}
