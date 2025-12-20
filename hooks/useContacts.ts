import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { contactService } from '../services';
import { Contact, ContactStatus } from '../types';
import { customFieldService } from '../services/customFieldService';
import { getSupabaseBrowser } from '../lib/supabase';

const ITEMS_PER_PAGE = 10;

const normalizeEmailForUpdate = (email?: string | null) => {
  const trimmed = (email ?? '').trim();
  return trimmed.length > 0 ? trimmed : null;
};

const sanitizeCustomFieldsForUpdate = (fields?: Record<string, any>) => {
  if (!fields) return fields;
  const out: Record<string, any> = {};
  for (const [key, value] of Object.entries(fields)) {
    if (value === undefined) continue;
    if (value === null) continue;
    if (typeof value === 'string' && value.trim() === '') continue;
    out[key] = value;
  }
  return out;
};

export const useContactsController = () => {
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();
  // Em alguns ambientes de teste o mock pode retornar null/undefined.
  const editFromUrl = (searchParams as any)?.get?.('edit') as string | null;

  // UI State
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<ContactStatus | 'ALL'>('ALL');
  const [tagFilter, setTagFilter] = useState<string>('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ type: 'single' | 'bulk'; id?: string } | null>(null);

  // Import State
  const [importReport, setImportReport] = useState<string | null>(null);

  // --- Queries ---
  const contactsQueryKey = ['contacts', { page: currentPage, search: searchTerm, status: statusFilter, tag: tagFilter }];
  const contactsQuery = useQuery({
    queryKey: contactsQueryKey,
    queryFn: () => contactService.list({
      limit: ITEMS_PER_PAGE,
      offset: (currentPage - 1) * ITEMS_PER_PAGE,
      search: searchTerm.trim(),
      status: statusFilter,
      tag: tagFilter,
    }),
    staleTime: 30 * 1000,  // 30 segundos
    keepPreviousData: true,
  });

  const contactByIdQuery = useQuery({
    queryKey: ['contact', editFromUrl],
    enabled: !!editFromUrl,
    queryFn: () => contactService.getById(editFromUrl!),
  });

  // Deep-link: /contacts?edit=<id> abre o modal de edição do contato.
  useEffect(() => {
    if (!editFromUrl) return;
    const contactFromPage = contactsQuery.data?.data?.find(c => c.id === editFromUrl);
    const contact = contactFromPage || contactByIdQuery.data;
    if (!contact) return;

    setEditingContact(contact);
    setIsEditModalOpen(true);
  }, [editFromUrl, contactsQuery.data, contactByIdQuery.data]);

  const statsQuery = useQuery({
    queryKey: ['contactStats'],
    queryFn: contactService.getStats,
    staleTime: 60 * 1000
  });

  const tagsQuery = useQuery({
    queryKey: ['contactTags'],
    queryFn: contactService.getTags,
    staleTime: 60 * 1000,
  });

  const customFieldsQuery = useQuery({
    queryKey: ['customFields'],
    queryFn: () => customFieldService.getAll(),
    staleTime: 60 * 1000
  });

  const refreshCustomFields = () => {
    queryClient.invalidateQueries({ queryKey: ['customFields'] });
  };

  // --- Realtime Subscription ---
  useEffect(() => {
    const supabaseClient = getSupabaseBrowser();
    if (!supabaseClient) return;

    const channel = supabaseClient
      .channel('contacts-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'contacts' },
        (payload: any) => {
          const newRow = payload?.new ?? null;
          const oldRow = payload?.old ?? null;
          const contactId = newRow?.id || oldRow?.id;

          // Dados paginados: invalidar é mais seguro do que patch local
          queryClient.invalidateQueries({ queryKey: ['contacts'] });
          queryClient.invalidateQueries({ queryKey: ['contactStats'] });
          queryClient.invalidateQueries({ queryKey: ['contactTags'] });
          if (contactId) {
            queryClient.invalidateQueries({ queryKey: ['contact', contactId] });
          }
        }
      )
      .subscribe();

    return () => {
      supabaseClient.removeChannel(channel);
    };
  }, [queryClient]);

  // --- Mutations ---
  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ['contacts'] });
    queryClient.invalidateQueries({ queryKey: ['contactStats'] });
    queryClient.invalidateQueries({ queryKey: ['contactTags'] });
  };

  const addMutation = useMutation({
    mutationFn: contactService.add,
    onSuccess: () => {
      invalidateAll();
      setIsAddModalOpen(false);
      toast.success('Contato adicionado com sucesso!');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erro ao adicionar contato');
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Omit<Contact, 'id'>> }) =>
      contactService.update(id, data),
    onSuccess: (updated) => {
      invalidateAll();
      if (updated?.id) {
        queryClient.invalidateQueries({ queryKey: ['contact', updated.id] });
      }
      setIsEditModalOpen(false);
      setEditingContact(null);
      toast.success('Contato atualizado com sucesso!');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erro ao atualizar contato');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: contactService.delete,
    onSuccess: () => {
      invalidateAll();
      setIsDeleteModalOpen(false);
      setDeleteTarget(null);
      toast.success('Contato excluído com sucesso!');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erro ao excluir contato');
    }
  });

  const deleteManyMutation = useMutation({
    mutationFn: contactService.deleteMany,
    onSuccess: (count) => {
      invalidateAll();
      setSelectedIds(new Set());
      setIsDeleteModalOpen(false);
      setDeleteTarget(null);
      toast.success(`${count} contatos excluídos com sucesso!`);
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erro ao excluir contatos');
    }
  });

  const importMutation = useMutation({
    mutationFn: contactService.import,
    onSuccess: (count) => {
      invalidateAll();
      toast.success(`${count} contatos importados com sucesso!`);
    },
    onError: () => toast.error('Erro ao importar contatos')
  });

  // New: Import from file with validation report
  const importFromFileMutation = useMutation({
    mutationFn: (file: File) => contactService.importFromFile(file),
    onSuccess: (result) => {
      invalidateAll();
      setImportReport(result.report);
      if (result.imported > 0) {
        toast.success(`${result.imported} contatos importados!`);
      }
      if (result.failed > 0) {
        toast.warning(`${result.failed} contatos inválidos (ver relatório)`);
      }
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Erro ao importar contatos');
    }
  });

  // --- Filtering & Pagination Logic (server-side) ---
  const contacts = contactsQuery.data?.data || [];
  const totalFiltered = contactsQuery.data?.total || 0;
  const totalPages = Math.max(1, Math.ceil(totalFiltered / ITEMS_PER_PAGE));

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  // Reset page when filters change
  const handleSearchChange = (term: string) => {
    setSearchTerm(term);
    setCurrentPage(1);
  };

  const handleStatusFilterChange = (status: ContactStatus | 'ALL') => {
    setStatusFilter(status);
    setCurrentPage(1);
  };

  const handleTagFilterChange = (tag: string) => {
    setTagFilter(tag);
    setCurrentPage(1);
  };

  // --- Selection Logic ---
  const toggleSelect = (id: string) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedIds(newSet);
  };

  const toggleSelectAll = () => {
    const pageIds = contacts.map(c => c.id);
    if (pageIds.length === 0) return;

    const allOnPageSelected = pageIds.every(id => selectedIds.has(id));
    if (allOnPageSelected) {
      const next = new Set(selectedIds);
      pageIds.forEach(id => next.delete(id));
      setSelectedIds(next);
      return;
    }

    const next = new Set(selectedIds);
    pageIds.forEach(id => next.add(id));
    setSelectedIds(next);
  };

  const selectAllGlobal = () => {
    void contactService.getIds({
      search: searchTerm.trim(),
      status: statusFilter,
      tag: tagFilter,
    }).then((ids) => {
      setSelectedIds(new Set(ids));
    }).catch((error: any) => {
      toast.error(error.message || 'Erro ao selecionar todos os contatos');
    });
  };

  const clearSelection = () => {
    setSelectedIds(new Set());
  };

  const isAllSelected = contacts.length > 0 && contacts.every(c => selectedIds.has(c.id));
  const isSomeSelected = selectedIds.size > 0;

  // --- Handlers ---
  const handleAddContact = (contact: { name: string; phone: string; email?: string; tags: string; custom_fields?: Record<string, any> }) => {
    if (!contact.phone) {
      toast.error('Telefone é obrigatório');
      return;
    }

    // Validate phone before submitting
    const validation = contactService.validatePhone(contact.phone);
    if (!validation.isValid) {
      toast.error(validation.error || 'Número de telefone inválido');
      return;
    }

    addMutation.mutate({
      name: contact.name || 'Desconhecido',
      phone: contact.phone,
      email: contact.email || undefined,
      status: ContactStatus.OPT_IN,
      tags: contact.tags.split(',').map(t => t.trim()).filter(t => t),
      custom_fields: contact.custom_fields
    });
  };

  const handleEditContact = (contact: Contact) => {
    setEditingContact(contact);
    setIsEditModalOpen(true);
  };

  const handleUpdateContact = (data: { name: string; phone: string; email?: string; tags: string; status: ContactStatus; custom_fields?: Record<string, any> }) => {
    if (!editingContact) return;
    updateMutation.mutate({
      id: editingContact.id,
      data: {
        name: data.name,
        phone: data.phone,
        // Para “apagar” email, precisamos enviar null (undefined não altera no banco)
        email: normalizeEmailForUpdate(data.email),
        status: data.status,
        tags: data.tags.split(',').map(t => t.trim()).filter(t => t),
        custom_fields: sanitizeCustomFieldsForUpdate(data.custom_fields)
      }
    });
  };

  const handleDeleteClick = (id: string) => {
    setDeleteTarget({ type: 'single', id });
    setIsDeleteModalOpen(true);
  };

  const handleBulkDeleteClick = () => {
    if (selectedIds.size === 0) return;
    setDeleteTarget({ type: 'bulk' });
    setIsDeleteModalOpen(true);
  };

  const handleConfirmDelete = () => {
    if (!deleteTarget) return;

    if (deleteTarget.type === 'single' && deleteTarget.id) {
      deleteMutation.mutate(deleteTarget.id);
    } else if (deleteTarget.type === 'bulk') {
      deleteManyMutation.mutate(Array.from(selectedIds));
    }
  };

  const handleCancelDelete = () => {
    setIsDeleteModalOpen(false);
    setDeleteTarget(null);
  };

  return {
    // Data
    contacts,
    stats: statsQuery.data || { total: 0, optIn: 0, optOut: 0 },
    tags: tagsQuery.data || [],
    customFields: customFieldsQuery.data || [],
    isLoading: contactsQuery.isLoading && !contactsQuery.data,

    refreshCustomFields,

    // Filters
    searchTerm,
    setSearchTerm: handleSearchChange,
    statusFilter,
    setStatusFilter: handleStatusFilterChange,
    tagFilter,
    setTagFilter: handleTagFilterChange,

    // Pagination
    currentPage,
    setCurrentPage,
    totalPages,
    totalFiltered,
    itemsPerPage: ITEMS_PER_PAGE,

    // Selection
    selectedIds,
    toggleSelect,
    toggleSelectAll,
    selectAllGlobal,
    clearSelection,
    isAllSelected,
    isSomeSelected,

    // Modals
    isAddModalOpen,
    setIsAddModalOpen,
    isImportModalOpen,
    setIsImportModalOpen,
    isEditModalOpen,
    setIsEditModalOpen,
    isDeleteModalOpen,
    editingContact,
    deleteTarget,

    // Actions
    onAddContact: handleAddContact,
    onEditContact: handleEditContact,
    onUpdateContact: handleUpdateContact,
    onDeleteClick: handleDeleteClick,
    onBulkDeleteClick: handleBulkDeleteClick,
    onConfirmDelete: handleConfirmDelete,
    onCancelDelete: handleCancelDelete,
    onImport: importMutation.mutateAsync,
    onImportFile: importFromFileMutation.mutateAsync,
    isImporting: importMutation.isPending || importFromFileMutation.isPending,
    isDeleting: deleteMutation.isPending || deleteManyMutation.isPending,

    // Import report
    importReport,
    clearImportReport: () => setImportReport(null),
  };
};
