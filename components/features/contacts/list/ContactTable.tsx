'use client';

import React from 'react';
import { Edit2, Trash2, Tag, ChevronLeft, ChevronRight } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Contact, ContactStatus } from './types';
import { calculateRelativeTime, getContactInitials } from './utils';

export interface ContactTableProps {
  contacts: Contact[];
  isLoading: boolean;
  showSuppressionDetails: boolean;
  selectedIds: Set<string>;
  isAllSelected: boolean;
  onToggleSelect: (id: string) => void;
  onToggleSelectAll: () => void;
  onEditContact: (contact: Contact) => void;
  onDeleteClick: (id: string) => void;
}

export const ContactTable: React.FC<ContactTableProps> = ({
  contacts,
  isLoading,
  showSuppressionDetails,
  selectedIds,
  isAllSelected,
  onToggleSelect,
  onToggleSelectAll,
  onEditContact,
  onDeleteClick
}) => {
  const tableColSpan = showSuppressionDetails ? 8 : 7;

  return (
    <div className="flex-1 min-h-0 overflow-auto">
      <table className="w-full text-left text-sm" aria-label="Lista de contatos">
        <thead className="bg-white/5 text-gray-400 uppercase text-xs tracking-wider">
          <tr>
            <th scope="col" className="w-8 px-6 py-4">
              <label className="sr-only" htmlFor="select-all">Selecionar todos os contatos</label>
              <input
                id="select-all"
                type="checkbox"
                className="rounded border-white/10 bg-zinc-800 checked:bg-primary-500"
                checked={isAllSelected}
                onChange={onToggleSelectAll}
                aria-label="Selecionar todos os contatos"
              />
            </th>
            <th scope="col" className="px-6 py-4 font-medium">Contato</th>
            <th scope="col" className="px-6 py-4 font-medium">Tags</th>
            <th scope="col" className="px-6 py-4 font-medium">Status</th>
            {showSuppressionDetails && (
              <th scope="col" className="px-6 py-4 font-medium">Motivo</th>
            )}
            <th scope="col" className="px-6 py-4 font-medium">Data Criação</th>
            <th scope="col" className="px-6 py-4 font-medium">Última Atividade</th>
            <th scope="col" className="px-6 py-4 font-medium text-right">Ações</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-white/5">
          {isLoading ? (
            <tr>
              <td colSpan={tableColSpan} className="px-6 py-8 text-center text-gray-500">
                Carregando contatos...
              </td>
            </tr>
          ) : contacts.length === 0 ? (
            <tr>
              <td colSpan={tableColSpan} className="px-6 py-8 text-center text-gray-500">
                Nenhum contato encontrado.
              </td>
            </tr>
          ) : (
            contacts.map((contact) => (
              <ContactTableRow
                key={contact.id}
                contact={contact}
                isSelected={selectedIds.has(contact.id)}
                showSuppressionDetails={showSuppressionDetails}
                onToggleSelect={onToggleSelect}
                onEdit={onEditContact}
                onDelete={onDeleteClick}
              />
            ))
          )}
        </tbody>
      </table>
    </div>
  );
};

interface ContactTableRowProps {
  contact: Contact;
  isSelected: boolean;
  showSuppressionDetails: boolean;
  onToggleSelect: (id: string) => void;
  onEdit: (contact: Contact) => void;
  onDelete: (id: string) => void;
}

const ContactTableRow: React.FC<ContactTableRowProps> = ({
  contact,
  isSelected,
  showSuppressionDetails,
  onToggleSelect,
  onEdit,
  onDelete
}) => {
  const displayName = contact.name || contact.phone;

  return (
    <tr className="hover:bg-white/5 transition-all duration-200 group hover:shadow-[inset_0_0_20px_rgba(16,185,129,0.05)]">
      <td className="px-6 py-5">
        <input
          type="checkbox"
          className="rounded border-white/10 bg-zinc-800 checked:bg-primary-500"
          checked={isSelected}
          onChange={() => onToggleSelect(contact.id)}
          aria-label={`Selecionar ${displayName}`}
        />
      </td>
      <td className="px-6 py-5">
        <div className="flex items-center gap-3">
          <div
            className="w-9 h-9 rounded-full bg-linear-to-br from-zinc-700 to-zinc-900 border border-white/10 text-white flex items-center justify-center font-bold text-xs shadow-inner"
            aria-hidden="true"
          >
            {getContactInitials(displayName)}
          </div>
          <div>
            <p className="font-medium text-white group-hover:text-primary-400 transition-colors">
              {displayName}
            </p>
            <p className="text-xs text-gray-500 font-mono">{contact.phone}</p>
          </div>
        </div>
      </td>
      <td className="px-6 py-5">
        <div className="flex gap-1.5 flex-wrap">
          {contact.tags.map((tag, i) => (
            <span
              key={i}
              className="inline-flex items-center px-2 py-1 rounded-md text-[10px] font-medium bg-zinc-800 text-gray-300 border border-white/5"
            >
              <Tag size={10} className="mr-1.5 opacity-50" aria-hidden="true" /> {tag}
            </span>
          ))}
        </div>
      </td>
      <td className="px-6 py-5">
        <ContactStatusBadge status={contact.status} />
      </td>
      {showSuppressionDetails && (
        <td className="px-6 py-5 text-xs text-gray-400">
          <div className="text-sm text-white">{contact.suppressionReason || '—'}</div>
          <div className="text-[10px] text-gray-500">
            {contact.suppressionSource ? `Fonte: ${contact.suppressionSource}` : 'Fonte: —'}
          </div>
        </td>
      )}
      <td className="px-6 py-5 text-gray-500 text-xs">
        {contact.createdAt ? new Date(contact.createdAt).toLocaleDateString('pt-BR') : '-'}
      </td>
      <td className="px-6 py-5 text-gray-500 text-xs">
        {contact.updatedAt
          ? calculateRelativeTime(contact.updatedAt)
          : (contact.createdAt ? calculateRelativeTime(contact.createdAt) : '-')}
      </td>
      <td className="px-6 py-5 text-right">
        <div className="flex items-center justify-end gap-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={() => onEdit(contact)}
                className="text-gray-500 hover:text-primary-400 p-1.5 rounded-lg hover:bg-primary-500/10 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary-500 focus-visible:outline-offset-2"
                aria-label={`Editar contato ${displayName}`}
              >
                <Edit2 size={16} aria-hidden="true" />
              </button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Editar contato</p>
            </TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={() => onDelete(contact.id)}
                className="text-gray-500 hover:text-red-400 p-1.5 rounded-lg hover:bg-red-500/10 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-red-500 focus-visible:outline-offset-2"
                aria-label={`Excluir contato ${displayName}`}
              >
                <Trash2 size={16} aria-hidden="true" />
              </button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Excluir contato</p>
            </TooltipContent>
          </Tooltip>
        </div>
      </td>
    </tr>
  );
};

interface ContactStatusBadgeProps {
  status: ContactStatus;
}

const ContactStatusBadge: React.FC<ContactStatusBadgeProps> = ({ status }) => {
  const getStatusStyles = () => {
    switch (status) {
      case ContactStatus.OPT_IN:
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      case ContactStatus.OPT_OUT:
        return 'bg-red-500/10 text-red-400 border-red-500/20';
      default:
        return 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20';
    }
  };

  const getStatusLabel = () => {
    return status === ContactStatus.UNKNOWN ? 'DESCONHECIDO' : status;
  };

  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-semibold uppercase tracking-wider border ${getStatusStyles()}`}>
      {getStatusLabel()}
    </span>
  );
};

export interface ContactPaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export const ContactPagination: React.FC<ContactPaginationProps> = ({
  currentPage,
  totalPages,
  onPageChange
}) => {
  if (totalPages <= 1) return null;

  const getPageNumbers = () => {
    return Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
      if (totalPages <= 5) {
        return i + 1;
      } else if (currentPage <= 3) {
        return i + 1;
      } else if (currentPage >= totalPages - 2) {
        return totalPages - 4 + i;
      } else {
        return currentPage - 2 + i;
      }
    });
  };

  return (
    <div className="px-6 py-4 border-t border-white/5 flex items-center justify-between">
      <span className="text-sm text-gray-500">
        Página {currentPage} de {totalPages}
      </span>
      <div className="flex items-center gap-2">
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={() => onPageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className="p-2 rounded-lg border border-white/10 text-gray-400 hover:text-white hover:bg-white/5 disabled:opacity-30 disabled:cursor-not-allowed transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary-500 focus-visible:outline-offset-2"
              aria-label="Página anterior"
            >
              <ChevronLeft size={18} aria-hidden="true" />
            </button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Página anterior</p>
          </TooltipContent>
        </Tooltip>

        {/* Page Numbers */}
        <div className="flex items-center gap-1">
          {getPageNumbers().map((pageNum) => (
            <button
              key={pageNum}
              onClick={() => onPageChange(pageNum)}
              className={`w-8 h-8 rounded-lg text-sm font-medium transition-colors ${currentPage === pageNum
                ? 'bg-primary-500 text-white'
                : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`}
            >
              {pageNum}
            </button>
          ))}
        </div>

        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={() => onPageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="p-2 rounded-lg border border-white/10 text-gray-400 hover:text-white hover:bg-white/5 disabled:opacity-30 disabled:cursor-not-allowed transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary-500 focus-visible:outline-offset-2"
              aria-label="Próxima página"
            >
              <ChevronRight size={18} aria-hidden="true" />
            </button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Próxima página</p>
          </TooltipContent>
        </Tooltip>
      </div>
    </div>
  );
};
