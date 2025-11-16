// apps/web/src/hooks/useGroups.ts

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useGroupsStore } from '@/stores/groupsStore';
import type { Group, GroupWithDetails, Athlete, Stream } from '@/stores/groupsStore';

// ========================
// Groups Hooks
// ========================

export const useGroups = (filters?: any) => {
  const setGroups = useGroupsStore((state) => state.setGroups);
  const setLoading = useGroupsStore((state) => state.setLoading);
  const setError = useGroupsStore((state) => state.setError);

  return useQuery({
    queryKey: ['groups', filters],
    queryFn: async () => {
      const response = await api.get<Group[]>('/api/groups', { params: filters });
      setGroups(response.data);
      return response.data;
    },
    onError: (error: any) => {
      setError(error.message);
    },
    onSettled: () => {
      setLoading(false);
    },
  });
};

export const useGroup = (groupId: string) => {
  const setSelectedGroup = useGroupsStore((state) => state.setSelectedGroup);
  const setLoading = useGroupsStore((state) => state.setLoading);
  const setError = useGroupsStore((state) => state.setError);

  return useQuery({
    queryKey: ['group', groupId],
    queryFn: async () => {
      const response = await api.get<GroupWithDetails>(`/api/groups/${groupId}`);
      setSelectedGroup(response.data);
      return response.data;
    },
    enabled: !!groupId,
    onError: (error: any) => {
      setError(error.message);
    },
    onSettled: () => {
      setLoading(false);
    },
  });
};

export const useCreateGroup = () => {
  const queryClient = useQueryClient();
  const addGroup = useGroupsStore((state) => state.addGroup);

  return useMutation({
    mutationFn: async (data: Partial<Group>) => {
      const response = await api.post<Group>('/api/groups', data);
      return response.data;
    },
    onSuccess: (data) => {
      addGroup(data);
      queryClient.invalidateQueries({ queryKey: ['groups'] });
    },
  });
};

export const useUpdateGroup = () => {
  const queryClient = useQueryClient();
  const updateGroup = useGroupsStore((state) => state.updateGroup);

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Group> }) => {
      const response = await api.put<Group>(`/api/groups/${id}`, data);
      return response.data;
    },
    onSuccess: (data) => {
      updateGroup(data.id, data);
      queryClient.invalidateQueries({ queryKey: ['groups'] });
      queryClient.invalidateQueries({ queryKey: ['group', data.id] });
    },
  });
};

export const useDeleteGroup = () => {
  const queryClient = useQueryClient();
  const deleteGroup = useGroupsStore((state) => state.deleteGroup);

  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/api/groups/${id}`);
      return id;
    },
    onSuccess: (id) => {
      deleteGroup(id);
      queryClient.invalidateQueries({ queryKey: ['groups'] });
    },
  });
};

export const useDuplicateGroup = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await api.post<Group>(`/api/groups/${id}/duplicate`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['groups'] });
    },
  });
};

// ========================
// Athletes Hooks
// ========================

export const useCreateAthlete = (groupId: string) => {
  const queryClient = useQueryClient();
  const addAthlete = useGroupsStore((state) => state.addAthlete);

  return useMutation({
    mutationFn: async (data: Partial<Athlete>) => {
      const response = await api.post<Athlete>(`/api/groups/${groupId}/athletes`, data);
      return response.data;
    },
    onSuccess: (data) => {
      addAthlete(data);
      queryClient.invalidateQueries({ queryKey: ['group', groupId] });
    },
  });
};

export const useUpdateAthlete = (groupId: string) => {
  const queryClient = useQueryClient();
  const updateAthlete = useGroupsStore((state) => state.updateAthlete);

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Athlete> }) => {
      const response = await api.put<Athlete>(`/api/groups/${groupId}/athletes/${id}`, data);
      return response.data;
    },
    onSuccess: (data) => {
      updateAthlete(data.id, data);
      queryClient.invalidateQueries({ queryKey: ['group', groupId] });
    },
  });
};

export const useDeleteAthlete = (groupId: string) => {
  const queryClient = useQueryClient();
  const deleteAthlete = useGroupsStore((state) => state.deleteAthlete);

  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/api/groups/${groupId}/athletes/${id}`);
      return id;
    },
    onSuccess: (id) => {
      deleteAthlete(id);
      queryClient.invalidateQueries({ queryKey: ['group', groupId] });
    },
  });
};

export const useMoveAthlete = (groupId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ athleteId, direction }: { athleteId: string; direction: 'up' | 'down' }) => {
      const response = await api.post(`/api/groups/${groupId}/athletes/${athleteId}/move`, {
        direction,
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['group', groupId] });
    },
  });
};

export const useBulkReorderAthletes = (groupId: string) => {
  const queryClient = useQueryClient();
  const reorderAthletes = useGroupsStore((state) => state.reorderAthletes);

  return useMutation({
    mutationFn: async (order: string[]) => {
      const response = await api.post(`/api/groups/${groupId}/athletes/reorder/bulk`, { order });
      return response.data;
    },
    onSuccess: (data) => {
      if (data.athletes) {
        reorderAthletes(data.athletes);
      }
      queryClient.invalidateQueries({ queryKey: ['group', groupId] });
    },
  });
};

export const useClearAthletes = (groupId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      await api.delete(`/api/groups/${groupId}/athletes`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['group', groupId] });
    },
  });
};

// ========================
// Draw Hooks
// ========================

export const usePerformDraw = (groupId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (strategy: string) => {
      const response = await api.post(`/api/groups/${groupId}/draw`, { strategy });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['group', groupId] });
    },
  });
};

export const useDrawHistory = (groupId: string) => {
  return useQuery({
    queryKey: ['drawHistory', groupId],
    queryFn: async () => {
      const response = await api.get(`/api/groups/${groupId}/draw/history`);
      return response.data;
    },
    enabled: !!groupId,
  });
};

// ========================
// Streams Hooks
// ========================

export const useGenerateStreams = (groupId: string) => {
  const queryClient = useQueryClient();
  const setStreams = useGroupsStore((state) => state.setStreams);

  return useMutation({
    mutationFn: async (settings?: any) => {
      const response = await api.post<{ streams: Stream[] }>(
        `/api/groups/${groupId}/streams/generate`,
        settings
      );
      return response.data;
    },
    onSuccess: (data) => {
      if (data.streams) {
        setStreams(data.streams);
      }
      queryClient.invalidateQueries({ queryKey: ['group', groupId] });
    },
  });
};

export const useUpdateStream = (groupId: string) => {
  const queryClient = useQueryClient();
  const updateStream = useGroupsStore((state) => state.updateStream);

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Stream> }) => {
      const response = await api.put<Stream>(`/api/groups/${groupId}/streams/${id}`, data);
      return response.data;
    },
    onSuccess: (data) => {
      updateStream(data.id, data);
      queryClient.invalidateQueries({ queryKey: ['group', groupId] });
    },
  });
};

export const useDeleteStream = (groupId: string) => {
  const queryClient = useQueryClient();
  const deleteStream = useGroupsStore((state) => state.deleteStream);

  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/api/groups/${groupId}/streams/${id}`);
      return id;
    },
    onSuccess: (id) => {
      deleteStream(id);
      queryClient.invalidateQueries({ queryKey: ['group', groupId] });
    },
  });
};

export const useClearStreams = (groupId: string) => {
  const queryClient = useQueryClient();
  const clearStreams = useGroupsStore((state) => state.clearStreams);

  return useMutation({
    mutationFn: async () => {
      await api.delete(`/api/groups/${groupId}/streams`);
    },
    onSuccess: () => {
      clearStreams();
      queryClient.invalidateQueries({ queryKey: ['group', groupId] });
    },
  });
};

export const useAssignAthleteToStream = (groupId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ streamId, athleteId }: { streamId: string; athleteId: string }) => {
      const response = await api.post(
        `/api/groups/${groupId}/streams/${streamId}/athletes`,
        { athleteId }
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['group', groupId] });
    },
  });
};

// ========================
// Excel Import/Export Hooks
// ========================

export const useImportAthletes = (groupId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('file', file);

      const response = await api.post(`/api/groups/${groupId}/import`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['group', groupId] });
    },
  });
};

export const useExportAthletes = (groupId: string) => {
  return useMutation({
    mutationFn: async (options?: any) => {
      const response = await api.get(`/api/groups/${groupId}/export`, {
        params: options,
        responseType: 'blob',
      });
      return response.data;
    },
    onSuccess: (blob) => {
      // Download file
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `athletes_${groupId}_${Date.now()}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    },
  });
};

export const useDownloadTemplate = () => {
  return useMutation({
    mutationFn: async () => {
      const response = await api.get('/api/groups/import/template', {
        responseType: 'blob',
      });
      return response.data;
    },
    onSuccess: (blob) => {
      // Download file
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `import_template.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    },
  });
};

// ========================
// Statistics Hooks
// ========================

export const useGroupStatistics = (groupId: string) => {
  return useQuery({
    queryKey: ['groupStatistics', groupId],
    queryFn: async () => {
      const response = await api.get(`/api/groups/${groupId}/statistics`);
      return response.data;
    },
    enabled: !!groupId,
  });
};

export const useStreamStatistics = (groupId: string) => {
  return useQuery({
    queryKey: ['streamStatistics', groupId],
    queryFn: async () => {
      const response = await api.get(`/api/groups/${groupId}/streams/statistics`);
      return response.data;
    },
    enabled: !!groupId,
  });
};
