'use client';

import React, { useState, useEffect } from 'react';
import { Trash2, UploadCloud, FileText, Plus } from 'lucide-react';
import { Contact, ContactStatus, CustomFieldDefinition } from '../../../types';
import { CustomFieldsSheet } from './CustomFieldsSheet';
import { Page, PageActions, PageDescription, PageHeader, PageTitle } from '@/components/ui/page';

// Import extracted components
import {
  ContactStats as ContactStatsComponent,
  ContactFilters,
  ContactResultsInfo,
  ContactSelectionBanner,
  ContactTable,
  ContactPagination,
  ContactAddModal,
  ContactEditModal,
  ContactDeleteModal,
  ContactImportModal,
} from './list';

// Import types
import type {
  ContactStatsData,
  ImportContact,
  NewContactForm,
  EditContactForm,
  DeleteTarget
} from './list';

export interface ContactListViewProps {
  // Data
  contacts: Contact[];
  stats: ContactStatsData;
  tags: string[];
  customFields?: CustomFieldDefinition[];
  onRefreshCustomFields?: () => void;
  isLoading: boolean;

  // Search & Filters
  searchTerm: string;
  onSearchChange: (term: string) => void;
  statusFilter: ContactStatus | 'ALL' | 'SUPPRESSED';
  onStatusFilterChange: (status: ContactStatus | 'ALL' | 'SUPPRESSED') => void;
  tagFilter: string;
  onTagFilterChange: (tag: string) => void;

  // Pagination
  currentPage: number;
  totalPages: number;
  totalFiltered: number;
  onPageChange: (page: number) => void;

  // Selection
  selectedIds: Set<string>;
  onToggleSelect: (id: string) => void;
  onToggleSelectAll: () => void;
  selectAllGlobal: () => void;
  clearSelection: () => void;
  isAllSelected: boolean;
  isSomeSelected: boolean;

  // Modals
  isAddModalOpen: boolean;
  setIsAddModalOpen: (open: boolean) => void;
  isImportModalOpen: boolean;
  setIsImportModalOpen: (open: boolean) => void;
  isEditModalOpen: boolean;
  setIsEditModalOpen: (open: boolean) => void;
  isDeleteModalOpen: boolean;
  editingContact: Contact | null;
  deleteTarget: DeleteTarget | null;

  // Actions
  onAddContact: (contact: NewContactForm) => void;
  onEditContact: (contact: Contact) => void;
  onUpdateContact: (data: EditContactForm) => void;
  onDeleteClick: (id: string) => void;
  onBulkDeleteClick: () => void;
  onConfirmDelete: () => void;
  onCancelDelete: () => void;
  onImport: (contacts: ImportContact[]) => Promise<number>;
  isImporting: boolean;
  isDeleting: boolean;
}

export const ContactListView: React.FC<ContactListViewProps> = ({
  contacts,
  stats,
  tags,
  isLoading,
  searchTerm,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  tagFilter,
  onTagFilterChange,
  currentPage,
  totalPages,
  totalFiltered,
  onPageChange,
  selectedIds,
  onToggleSelect,
  onToggleSelectAll,
  selectAllGlobal,
  clearSelection,
  isAllSelected,
  isSomeSelected,
  isAddModalOpen,
  setIsAddModalOpen,
  isImportModalOpen,
  setIsImportModalOpen,
  isEditModalOpen,
  setIsEditModalOpen,
  isDeleteModalOpen,
  editingContact,
  deleteTarget,
  onAddContact,
  onEditContact,
  onUpdateContact,
  onDeleteClick,
  onBulkDeleteClick,
  onConfirmDelete,
  onCancelDelete,
  onImport,
  isImporting,
  isDeleting,
  customFields,
  onRefreshCustomFields
}) => {
  // Local state
  const [showFilters, setShowFilters] = useState(false);
  const [localCustomFields, setLocalCustomFields] = useState<CustomFieldDefinition[]>([]);

  // Initialize local custom fields from props
  useEffect(() => {
    if (customFields) {
      setLocalCustomFields(customFields);
    }
  }, [customFields]);

  // Custom field handlers
  const handleCustomFieldCreated = (field: CustomFieldDefinition) => {
    setLocalCustomFields((prev) => {
      if (prev.some((f) => f.id === field.id || f.key === field.key)) return prev;
      return [...prev, field];
    });
    onRefreshCustomFields?.();
  };

  const handleCustomFieldDeleted = (id: string) => {
    setLocalCustomFields((prev) => prev.filter((f) => f.id !== id));
    onRefreshCustomFields?.();
  };

  // Computed values
  const showSuppressionDetails = statusFilter === 'SUPPRESSED';
  const hasActiveFilters = statusFilter !== 'ALL' || tagFilter !== 'ALL' || !!searchTerm;

  const handleClearFilters = () => {
    onSearchChange('');
    onStatusFilterChange('ALL');
    onTagFilterChange('ALL');
  };

  return (
    <Page className="flex flex-col h-full min-h-0">
      {/* Page Header with Actions */}
      <PageHeader>
        <div>
          <PageTitle>Contatos</PageTitle>
          <PageDescription>Gerencie sua audiência e listas</PageDescription>
        </div>

        <PageActions className="flex-wrap justify-start sm:justify-end">
          {isSomeSelected && (
            <button
              onClick={onBulkDeleteClick}
              className="flex items-center gap-2 px-4 py-2.5 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 font-medium hover:bg-red-500/20 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-red-500 focus-visible:outline-offset-2"
              aria-label={`Excluir ${selectedIds.size} contato(s) selecionado(s)`}
            >
              <Trash2 size={18} aria-hidden="true" />
              Excluir ({selectedIds.size})
            </button>
          )}
          <button
            onClick={() => setIsImportModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-zinc-900 border border-white/10 rounded-xl text-gray-300 font-medium hover:bg-white/5 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary-500 focus-visible:outline-offset-2"
            aria-label="Importar contatos via arquivo CSV"
          >
            <UploadCloud size={18} aria-hidden="true" />
            Importar CSV
          </button>

          <CustomFieldsSheet
            entityType="contact"
            onFieldCreated={handleCustomFieldCreated}
            onFieldDeleted={handleCustomFieldDeleted}
          >
            <button
              className="flex items-center gap-2 px-4 py-2.5 bg-zinc-900 border border-white/10 rounded-xl text-gray-300 font-medium hover:bg-white/5 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary-500 focus-visible:outline-offset-2"
              type="button"
              aria-label="Gerenciar campos personalizados"
            >
              <FileText size={18} aria-hidden="true" />
              Campos personalizados
            </button>
          </CustomFieldsSheet>

          <button
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-white text-black rounded-xl font-bold hover:bg-gray-200 transition-colors shadow-lg shadow-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white focus-visible:outline-offset-2"
            aria-label="Adicionar novo contato"
          >
            <Plus size={18} aria-hidden="true" />
            Novo Contato
          </button>
        </PageActions>
      </PageHeader>

      {/* Stats Row */}
      <ContactStatsComponent stats={stats} />

      {/* Main Content Panel */}
      <div className="glass-panel rounded-2xl flex-1 min-h-0 flex flex-col">
        {/* Filters */}
        <ContactFilters
          searchTerm={searchTerm}
          onSearchChange={onSearchChange}
          statusFilter={statusFilter}
          onStatusFilterChange={onStatusFilterChange}
          tagFilter={tagFilter}
          onTagFilterChange={onTagFilterChange}
          tags={tags}
          showFilters={showFilters}
          onToggleFilters={() => setShowFilters(!showFilters)}
        />

        {/* Results Info */}
        <ContactResultsInfo
          displayedCount={contacts.length}
          totalFiltered={totalFiltered}
          hasActiveFilters={hasActiveFilters}
          onClearFilters={handleClearFilters}
        />

        {/* Selection Banner */}
        {contacts.length > 0 && (
          <ContactSelectionBanner
            selectedCount={selectedIds.size}
            pageCount={contacts.length}
            totalFiltered={totalFiltered}
            onSelectAllGlobal={selectAllGlobal}
            onClearSelection={clearSelection}
          />
        )}

        {/* Table */}
        <ContactTable
          contacts={contacts}
          isLoading={isLoading}
          showSuppressionDetails={showSuppressionDetails}
          selectedIds={selectedIds}
          isAllSelected={isAllSelected}
          onToggleSelect={onToggleSelect}
          onToggleSelectAll={onToggleSelectAll}
          onEditContact={onEditContact}
          onDeleteClick={onDeleteClick}
        />

        {/* Pagination */}
        <ContactPagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={onPageChange}
        />
      </div>

      {/* Modals */}
      <ContactAddModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSubmit={onAddContact}
        customFields={localCustomFields}
      />

      <ContactEditModal
        isOpen={isEditModalOpen}
        contact={editingContact}
        onClose={() => setIsEditModalOpen(false)}
        onSubmit={onUpdateContact}
        customFields={localCustomFields}
      />

      <ContactDeleteModal
        isOpen={isDeleteModalOpen}
        deleteTarget={deleteTarget}
        selectedCount={selectedIds.size}
        isDeleting={isDeleting}
        onConfirm={onConfirmDelete}
        onCancel={onCancelDelete}
      />

      <ContactImportModal
        isOpen={isImportModalOpen}
        isImporting={isImporting}
        customFields={localCustomFields}
        onClose={() => setIsImportModalOpen(false)}
        onImport={onImport}
        onCustomFieldCreated={handleCustomFieldCreated}
        onCustomFieldDeleted={handleCustomFieldDeleted}
      />
    </Page>
  );
};
