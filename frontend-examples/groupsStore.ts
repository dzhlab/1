// apps/web/src/stores/groupsStore.ts

import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';

export interface Group {
  id: string;
  name: string;
  discipline: string;
  ageCategory: string;
  yearFrom?: number;
  yearTo?: number;
  program: string;
  performanceType: string;
  apparatus: string[];
  apparatusOrder?: string[];
  performanceDuration: number;
  athletesPerStream: number;
  minAthletesPerStream: number;
  streamStartTime: string;
  subgroups: string[];
  createdAt: string;
  updatedAt: string;
}

export interface Athlete {
  id: string;
  groupId: string;
  fullName: string;
  birthDate: string;
  city: string;
  club: string;
  coach: string;
  rank: string;
  orderNumber: number;
  streamId?: string;
  streamTime?: string;
  apparatusNumber?: number;
  subgroup?: string;
}

export interface Stream {
  id: string;
  groupId: string;
  orderNumber: number;
  subgroup: string;
  startTime: string;
  athletesCount: number;
  athletes: Athlete[];
}

export interface GroupWithDetails extends Group {
  athletes: Athlete[];
  streams: Stream[];
}

interface GroupsState {
  // State
  groups: Group[];
  selectedGroup: GroupWithDetails | null;
  isLoading: boolean;
  error: string | null;

  // Filters
  filters: {
    discipline?: string;
    ageCategory?: string;
    program?: string;
    search?: string;
  };

  // Actions - Groups
  setGroups: (groups: Group[]) => void;
  setSelectedGroup: (group: GroupWithDetails | null) => void;
  addGroup: (group: Group) => void;
  updateGroup: (id: string, updates: Partial<Group>) => void;
  deleteGroup: (id: string) => void;

  // Actions - Athletes
  addAthlete: (athlete: Athlete) => void;
  updateAthlete: (id: string, updates: Partial<Athlete>) => void;
  deleteAthlete: (id: string) => void;
  reorderAthletes: (athletes: Athlete[]) => void;

  // Actions - Streams
  setStreams: (streams: Stream[]) => void;
  addStream: (stream: Stream) => void;
  updateStream: (id: string, updates: Partial<Stream>) => void;
  deleteStream: (id: string) => void;
  clearStreams: () => void;

  // Actions - Filters
  setFilters: (filters: GroupsState['filters']) => void;
  clearFilters: () => void;

  // Actions - Loading & Error
  setLoading: (isLoading: boolean) => void;
  setError: (error: string | null) => void;

  // Computed
  getFilteredGroups: () => Group[];
}

export const useGroupsStore = create<GroupsState>()(
  devtools(
    persist(
      (set, get) => ({
        // Initial state
        groups: [],
        selectedGroup: null,
        isLoading: false,
        error: null,
        filters: {},

        // Actions - Groups
        setGroups: (groups) => set({ groups }),

        setSelectedGroup: (group) => set({ selectedGroup: group }),

        addGroup: (group) =>
          set((state) => ({
            groups: [...state.groups, group],
          })),

        updateGroup: (id, updates) =>
          set((state) => ({
            groups: state.groups.map((group) =>
              group.id === id ? { ...group, ...updates } : group
            ),
            selectedGroup:
              state.selectedGroup?.id === id
                ? { ...state.selectedGroup, ...updates }
                : state.selectedGroup,
          })),

        deleteGroup: (id) =>
          set((state) => ({
            groups: state.groups.filter((group) => group.id !== id),
            selectedGroup:
              state.selectedGroup?.id === id ? null : state.selectedGroup,
          })),

        // Actions - Athletes
        addAthlete: (athlete) =>
          set((state) => {
            if (!state.selectedGroup) return state;

            return {
              selectedGroup: {
                ...state.selectedGroup,
                athletes: [...state.selectedGroup.athletes, athlete],
              },
            };
          }),

        updateAthlete: (id, updates) =>
          set((state) => {
            if (!state.selectedGroup) return state;

            return {
              selectedGroup: {
                ...state.selectedGroup,
                athletes: state.selectedGroup.athletes.map((athlete) =>
                  athlete.id === id ? { ...athlete, ...updates } : athlete
                ),
              },
            };
          }),

        deleteAthlete: (id) =>
          set((state) => {
            if (!state.selectedGroup) return state;

            return {
              selectedGroup: {
                ...state.selectedGroup,
                athletes: state.selectedGroup.athletes.filter(
                  (athlete) => athlete.id !== id
                ),
              },
            };
          }),

        reorderAthletes: (athletes) =>
          set((state) => {
            if (!state.selectedGroup) return state;

            return {
              selectedGroup: {
                ...state.selectedGroup,
                athletes,
              },
            };
          }),

        // Actions - Streams
        setStreams: (streams) =>
          set((state) => {
            if (!state.selectedGroup) return state;

            return {
              selectedGroup: {
                ...state.selectedGroup,
                streams,
              },
            };
          }),

        addStream: (stream) =>
          set((state) => {
            if (!state.selectedGroup) return state;

            return {
              selectedGroup: {
                ...state.selectedGroup,
                streams: [...state.selectedGroup.streams, stream],
              },
            };
          }),

        updateStream: (id, updates) =>
          set((state) => {
            if (!state.selectedGroup) return state;

            return {
              selectedGroup: {
                ...state.selectedGroup,
                streams: state.selectedGroup.streams.map((stream) =>
                  stream.id === id ? { ...stream, ...updates } : stream
                ),
              },
            };
          }),

        deleteStream: (id) =>
          set((state) => {
            if (!state.selectedGroup) return state;

            return {
              selectedGroup: {
                ...state.selectedGroup,
                streams: state.selectedGroup.streams.filter(
                  (stream) => stream.id !== id
                ),
              },
            };
          }),

        clearStreams: () =>
          set((state) => {
            if (!state.selectedGroup) return state;

            return {
              selectedGroup: {
                ...state.selectedGroup,
                streams: [],
              },
            };
          }),

        // Actions - Filters
        setFilters: (filters) =>
          set((state) => ({
            filters: { ...state.filters, ...filters },
          })),

        clearFilters: () => set({ filters: {} }),

        // Actions - Loading & Error
        setLoading: (isLoading) => set({ isLoading }),
        setError: (error) => set({ error }),

        // Computed
        getFilteredGroups: () => {
          const { groups, filters } = get();

          return groups.filter((group) => {
            if (filters.discipline && group.discipline !== filters.discipline) {
              return false;
            }

            if (filters.ageCategory && group.ageCategory !== filters.ageCategory) {
              return false;
            }

            if (filters.program && group.program !== filters.program) {
              return false;
            }

            if (filters.search) {
              const searchLower = filters.search.toLowerCase();
              return group.name.toLowerCase().includes(searchLower);
            }

            return true;
          });
        },
      }),
      {
        name: 'groups-storage',
        partialize: (state) => ({
          filters: state.filters,
        }),
      }
    ),
    { name: 'GroupsStore' }
  )
);

// Selectors
export const selectGroups = (state: GroupsState) => state.groups;
export const selectSelectedGroup = (state: GroupsState) => state.selectedGroup;
export const selectIsLoading = (state: GroupsState) => state.isLoading;
export const selectError = (state: GroupsState) => state.error;
export const selectFilters = (state: GroupsState) => state.filters;
export const selectFilteredGroups = (state: GroupsState) => state.getFilteredGroups();
