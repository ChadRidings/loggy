import { create } from "zustand";

type EventFilters = {
  srcIp: string;
  domain: string;
  action: string;
  statusCode: string;
  startTime: string;
  endTime: string;
};

type UploadUiState = {
  filters: EventFilters;
  selectedAnomalyId: string | null;
  setFilter: (key: keyof EventFilters, value: string) => void;
  resetFilters: () => void;
  setSelectedAnomalyId: (id: string | null) => void;
};

const defaultFilters: EventFilters = {
  srcIp: "",
  domain: "",
  action: "",
  statusCode: "",
  startTime: "",
  endTime: ""
};

export const useUploadUiStore = create<UploadUiState>((set) => ({
  filters: defaultFilters,
  selectedAnomalyId: null,
  setFilter: (key, value) =>
    set((state) => ({
      filters: {
        ...state.filters,
        [key]: value
      }
    })),
  resetFilters: () => set({ filters: defaultFilters }),
  setSelectedAnomalyId: (id) => set({ selectedAnomalyId: id })
}));
