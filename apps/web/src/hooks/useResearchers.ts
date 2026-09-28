import { useQuery } from '@tanstack/react-query';
import { apiGet } from '@/lib/api-client';

export interface ResearcherQuery {
  q?: string;
  role?: string;
  department?: string;
  departmentId?: string;
  facultyId?: string;
  campusId?: string;
  interest?: string;
  page?: number;
  limit?: number;
}

export function useResearchers(query: ResearcherQuery) {
  const queryParams = new URLSearchParams();
  if (query.q) queryParams.append('q', query.q);
  if (query.role) queryParams.append('role', query.role);
  if (query.departmentId) queryParams.append('departmentId', query.departmentId);
  else if (query.department) queryParams.append('department', query.department);
  if (query.facultyId) queryParams.append('facultyId', query.facultyId);
  if (query.campusId) queryParams.append('campusId', query.campusId);
  if (query.interest) queryParams.append('interest', query.interest);
  if (query.page) queryParams.append('page', query.page.toString());
  if (query.limit) queryParams.append('limit', query.limit.toString());

  return useQuery({
    queryKey: ['researchers', query],
    queryFn: async () => {
      return apiGet<any>(`/api/users/researchers?${queryParams.toString()}`);
    }
  });
}

export function useResearcherProfile(id: string) {
  return useQuery({
    queryKey: ['researcher', id],
    queryFn: async () => {
      return apiGet<any>(`/api/users/${id}/profile`);
    },
    enabled: !!id,
  });
}

