import { create } from 'zustand';

export type AdminTab = 'overview' | 'users' | 'conversations' | 'firs' | 'audit';

interface AdminStoreState {
  activeTab: AdminTab;
  searchQuery: string;
  autoRefresh: boolean;
  refreshKey: number;

  // Selected Inspect Items
  selectedUserId: string | null;
  selectedConversationId: string | null;
  selectedFIRId: string | null;
  selectedAuditId: string | null;

  // Actions
  setActiveTab: (tab: AdminTab) => void;
  setSearchQuery: (query: string) => void;
  toggleAutoRefresh: () => void;
  triggerRefresh: () => void;

  setSelectedUserId: (id: string | null) => void;
  setSelectedConversationId: (id: string | null) => void;
  setSelectedFIRId: (id: string | null) => void;
  setSelectedAuditId: (id: string | null) => void;
}

export const useAdminStore = create<AdminStoreState>((set) => ({
  activeTab: 'overview',
  searchQuery: '',
  autoRefresh: false,
  refreshKey: 0,

  selectedUserId: null,
  selectedConversationId: null,
  selectedFIRId: null,
  selectedAuditId: null,

  setActiveTab: (tab) => set({ activeTab: tab }),
  setSearchQuery: (query) => set({ searchQuery: query }),
  toggleAutoRefresh: () => set((state) => ({ autoRefresh: !state.autoRefresh })),
  triggerRefresh: () => set((state) => ({ refreshKey: state.refreshKey + 1 })),

  setSelectedUserId: (id) => set({ selectedUserId: id }),
  setSelectedConversationId: (id) => set({ selectedConversationId: id }),
  setSelectedFIRId: (id) => set({ selectedFIRId: id }),
  setSelectedAuditId: (id) => set({ selectedAuditId: id }),
}));
