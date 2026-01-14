'use client';

import React, { useState, useRef } from 'react';
import {
  X,
  UploadCloud,
  AlertCircle,
  FileText,
  CheckCircle2,
  Loader2,
  Settings2,
  ChevronRight
} from 'lucide-react';
import {
  ContactStatus,
  CustomFieldDefinition,
  ImportContact,
  CsvPreviewData,
  ColumnMapping,
  ImportResult
} from './types';
import { parseCSV, formatPhoneNumber } from './utils';
import { ContactFieldMappingSheet } from './ContactFieldMappingSheet';

export interface ContactImportModalProps {
  isOpen: boolean;
  isImporting: boolean;
  customFields: CustomFieldDefinition[];
  onClose: () => void;
  onImport: (contacts: ImportContact[]) => Promise<number>;
  onCustomFieldCreated: (field: CustomFieldDefinition) => void;
  onCustomFieldDeleted: (id: string) => void;
}

type ImportStep = 1 | 2 | 3;

const initialColumnMapping: ColumnMapping = {
  name: '',
  phone: '',
  email: '',
  tags: '',
  defaultTag: '',
  custom_fields: {}
};

export const ContactImportModal: React.FC<ContactImportModalProps> = ({
  isOpen,
  isImporting,
  customFields,
  onClose,
  onImport,
  onCustomFieldCreated,
  onCustomFieldDeleted
}) => {
  const [step, setStep] = useState<ImportStep>(1);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [csvPreview, setCsvPreview] = useState<CsvPreviewData>({ headers: [], rows: [] });
  const [columnMapping, setColumnMapping] = useState<ColumnMapping>(initialColumnMapping);
  const [importResult, setImportResult] = useState<ImportResult>({ total: 0, success: 0, errors: 0 });
  const [isMappingSheetOpen, setIsMappingSheetOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  const processFile = (file: File) => {
    if (file.type !== 'text/csv' && !file.name.endsWith('.csv')) {
      return;
    }

    setCsvFile(file);
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const { headers, rows } = parseCSV(text);

      if (headers.length === 0 || rows.length === 0) {
        return;
      }

      setCsvPreview({ headers, rows: rows.slice(0, 3) });

      // Auto-map columns based on header names
      const lowerHeaders = headers.map(h => h.toLowerCase());
      const autoMapping: ColumnMapping = {
        name: headers[lowerHeaders.findIndex(h => h.includes('nome') || h.includes('name'))] || '',
        phone: headers[lowerHeaders.findIndex(h => h.includes('tele') || h.includes('phone') || h.includes('cel') || h.includes('what'))] || '',
        email: headers[lowerHeaders.findIndex(h => h.includes('email') || h.includes('mail'))] || '',
        tags: headers[lowerHeaders.findIndex(h => h.includes('tag') || h.includes('grupo'))] || '',
        defaultTag: '',
        custom_fields: {}
      };

      // Auto-map custom fields
      if (customFields) {
        customFields.forEach(field => {
          const match = headers.find(h =>
            h.toLowerCase() === field.key.toLowerCase() ||
            h.toLowerCase() === field.label.toLowerCase()
          );
          if (match) {
            autoMapping.custom_fields[field.key] = match;
          }
        });
      }

      setColumnMapping(autoMapping);
      setStep(2);
    };
    reader.readAsText(file);
  };

  const executeImport = async () => {
    if (!columnMapping.phone || !csvFile) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const text = event.target?.result as string;
      const { headers, rows } = parseCSV(text);

      const nameIdx = headers.indexOf(columnMapping.name);
      const phoneIdx = headers.indexOf(columnMapping.phone);
      const emailIdx = headers.indexOf(columnMapping.email);
      const tagsIdx = headers.indexOf(columnMapping.tags);

      // Create index map for custom fields
      const customFieldIndices: Record<string, number> = {};
      Object.entries(columnMapping.custom_fields || {}).forEach(([key, header]) => {
        if (header) {
          const idx = headers.indexOf(header);
          if (idx !== -1) {
            customFieldIndices[key] = idx;
          }
        }
      });

      const contactsToImport: ImportContact[] = rows.map(row => {
        const phone = formatPhoneNumber(row[phoneIdx] || '');

        // Extract custom fields
        const rowCustomFields: Record<string, any> = {};
        Object.entries(customFieldIndices).forEach(([key, idx]) => {
          if (row[idx]) {
            rowCustomFields[key] = row[idx].trim();
          }
        });

        // Parse tags
        const rowTags = tagsIdx >= 0
          ? row[tagsIdx].split(/[,;]/).map(t => t.trim()).filter(t => t)
          : [];

        const defaultTags = columnMapping.defaultTag
          ? columnMapping.defaultTag.split(',').map(t => t.trim()).filter(t => t)
          : [];

        const allTags = [...new Set([...rowTags, ...defaultTags])];
        if (allTags.length === 0) allTags.push('Importado');

        return {
          name: nameIdx !== -1 ? row[nameIdx] : undefined,
          phone,
          email: emailIdx !== -1 ? row[emailIdx]?.trim() : undefined,
          tags: allTags,
          status: ContactStatus.UNKNOWN,
          custom_fields: rowCustomFields
        };
      }).filter(c => c.phone.length > 8);

      const importedCount = await onImport(contactsToImport);

      setImportResult({
        total: rows.length,
        success: importedCount,
        errors: rows.length - importedCount
      });
      setStep(3);
    };
    reader.readAsText(csvFile);
  };

  const resetAndClose = () => {
    onClose();
    setTimeout(() => {
      setStep(1);
      setCsvFile(null);
      setCsvPreview({ headers: [], rows: [] });
      setColumnMapping(initialColumnMapping);
    }, 300);
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-zinc-950 border border-white/10 rounded-2xl w-full max-w-2xl p-8 shadow-2xl animate-in zoom-in duration-200 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex justify-between items-center mb-8 border-b border-white/5 pb-6">
          <div>
            <h2 className="text-2xl font-bold text-white mb-1">Importar Contatos</h2>
            <p className="text-sm text-gray-400">Adicione múltiplos contatos de uma vez via CSV</p>
          </div>
          <button
            type="button"
            aria-label="Fechar importação de contatos"
            onClick={resetAndClose}
          >
            <X className="text-gray-500 hover:text-white" />
          </button>
        </div>

        {/* Steps Content */}
        <div className="flex-1 overflow-y-auto px-1">
          {step === 1 && (
            <ImportStepUpload
              fileInputRef={fileInputRef}
              onFileSelect={handleFileSelect}
            />
          )}

          {step === 2 && (
            <ImportStepMapping
              csvFile={csvFile}
              csvPreview={csvPreview}
              columnMapping={columnMapping}
              customFields={customFields}
              onColumnMappingChange={setColumnMapping}
              onOpenMappingSheet={() => setIsMappingSheetOpen(true)}
              onReset={resetAndClose}
            />
          )}

          {step === 3 && (
            <ImportStepSuccess result={importResult} />
          )}
        </div>

        {/* Footer Actions */}
        <div className="pt-6 mt-6 border-t border-white/5 flex justify-end gap-3">
          {step === 1 && (
            <button onClick={resetAndClose} className="text-gray-400 hover:text-white px-4 py-2 text-sm font-medium">
              Cancelar
            </button>
          )}

          {step === 2 && (
            <>
              <button onClick={resetAndClose} className="text-gray-400 hover:text-white px-4 py-2 text-sm font-medium" disabled={isImporting}>
                Cancelar
              </button>
              <button
                onClick={executeImport}
                disabled={isImporting}
                className="bg-primary-600 text-white px-6 py-2.5 rounded-lg font-bold hover:bg-primary-500 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isImporting ? (
                  <><Loader2 size={18} className="animate-spin" /> Processando...</>
                ) : (
                  <><CheckCircle2 size={18} /> Confirmar Importação</>
                )}
              </button>
            </>
          )}

          {step === 3 && (
            <button
              onClick={resetAndClose}
              className="bg-white text-black px-8 py-2.5 rounded-lg font-bold hover:bg-gray-200 transition-colors"
            >
              Fechar
            </button>
          )}
        </div>

        {/* Custom Fields Mapping Sheet */}
        <ContactFieldMappingSheet
          isOpen={isMappingSheetOpen}
          onOpenChange={setIsMappingSheetOpen}
          customFields={customFields}
          csvPreview={csvPreview}
          columnMapping={columnMapping}
          onColumnMappingChange={setColumnMapping}
          onCustomFieldCreated={onCustomFieldCreated}
          onCustomFieldDeleted={onCustomFieldDeleted}
        />
      </div>
    </div>
  );
};

// Step 1: Upload Component
interface ImportStepUploadProps {
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  onFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

const ImportStepUpload: React.FC<ImportStepUploadProps> = ({ fileInputRef, onFileSelect }) => (
  <div className="space-y-6">
    <div
      className="border-2 border-dashed border-zinc-800 hover:border-primary-500/50 hover:bg-white/5 rounded-2xl p-12 transition-all cursor-pointer text-center group"
      onClick={() => fileInputRef.current?.click()}
    >
      <div className="w-16 h-16 bg-zinc-900 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
        <UploadCloud size={32} className="text-gray-400 group-hover:text-primary-400" />
      </div>
      <h3 className="text-lg font-semibold text-white mb-2">Clique para selecionar ou arraste aqui</h3>
      <p className="text-gray-500 text-sm">Suporta arquivos .csv (Máx 5MB)</p>
      <input
        type="file"
        ref={fileInputRef}
        className="hidden"
        accept=".csv"
        onChange={onFileSelect}
      />
    </div>

    <div className="bg-zinc-900/50 rounded-xl p-4 flex gap-3 border border-white/5">
      <AlertCircle className="text-primary-500 shrink-0" size={20} />
      <div className="text-sm text-gray-400">
        <p className="text-white font-medium mb-1">Dica de Formatação</p>
        <p>Seu arquivo deve ter cabeçalhos na primeira linha (Ex: Nome, Telefone). O sistema tentará identificar as colunas automaticamente.</p>
      </div>
    </div>
  </div>
);

// Step 2: Mapping Component
interface ImportStepMappingProps {
  csvFile: File | null;
  csvPreview: CsvPreviewData;
  columnMapping: ColumnMapping;
  customFields: CustomFieldDefinition[];
  onColumnMappingChange: (mapping: ColumnMapping) => void;
  onOpenMappingSheet: () => void;
  onReset: () => void;
}

const ImportStepMapping: React.FC<ImportStepMappingProps> = ({
  csvFile,
  csvPreview,
  columnMapping,
  customFields,
  onColumnMappingChange,
  onOpenMappingSheet,
  onReset
}) => (
  <div className="space-y-6">
    <div className="flex items-center gap-3 bg-zinc-900 border border-white/10 p-3 rounded-lg mb-6">
      <FileText size={20} className="text-primary-400" />
      <span className="text-white text-sm font-medium flex-1 truncate">{csvFile?.name}</span>
      <button onClick={onReset} className="text-xs text-red-400 hover:underline">Trocar</button>
    </div>

    <div className="grid grid-cols-1 gap-6">
      <div className="space-y-4">
        <h3 className="text-white font-medium text-sm uppercase tracking-wider">Mapear Colunas</h3>

        {/* Name Map */}
        <ColumnMappingSelect
          label="Nome do Contato"
          value={columnMapping.name}
          headers={csvPreview.headers}
          onChange={(value) => onColumnMappingChange({ ...columnMapping, name: value })}
        />

        {/* Phone Map */}
        <ColumnMappingSelect
          label="Telefone / WhatsApp"
          value={columnMapping.phone}
          headers={csvPreview.headers}
          onChange={(value) => onColumnMappingChange({ ...columnMapping, phone: value })}
          required
        />

        {/* Email Map */}
        <ColumnMappingSelect
          label="E-mail"
          value={columnMapping.email}
          headers={csvPreview.headers}
          onChange={(value) => onColumnMappingChange({ ...columnMapping, email: value })}
        />

        {/* Tags Map */}
        <ColumnMappingSelect
          label="Tags"
          value={columnMapping.tags}
          headers={csvPreview.headers}
          onChange={(value) => onColumnMappingChange({ ...columnMapping, tags: value })}
          placeholder="Nenhuma coluna de tags"
        />

        {/* Default Tag Input */}
        {!columnMapping.tags && (
          <div className="grid grid-cols-2 gap-4 items-center bg-primary-500/5 p-3 rounded-lg border border-primary-500/20">
            <label className="text-gray-400 text-sm">
              <span className="text-primary-400">*</span> Tag padrão para todos
            </label>
            <input
              type="text"
              className="bg-zinc-900 border border-primary-500/30 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-primary-500"
              placeholder="Ex: Importado, Lead"
              value={columnMapping.defaultTag || ''}
              onChange={(e) => onColumnMappingChange({ ...columnMapping, defaultTag: e.target.value })}
            />
          </div>
        )}

        {/* Custom Fields Section */}
        <div className="border-t border-white/10 pt-4 mt-2">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-white font-medium text-sm uppercase tracking-wider">Campos Personalizados</h3>
            {customFields && customFields.length > 0 && (
              <div className="text-xs text-gray-400">
                {Object.keys(columnMapping.custom_fields || {}).length} de {customFields.length} mapeados
              </div>
            )}
          </div>

          {customFields && customFields.length > 0 ? (
            <div className="bg-zinc-900/50 rounded-xl border border-white/10 p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary-500/10 rounded-lg text-primary-400">
                    <Settings2 size={18} />
                  </div>
                  <div>
                    <p className="text-white text-sm font-medium">Configurar Mapeamento</p>
                    <p className="text-xs text-gray-400">
                      {Object.keys(columnMapping.custom_fields || {}).length === 0
                        ? "Nenhum campo vinculado"
                        : "Clique para ajustar vínculos"}
                    </p>
                  </div>
                </div>
                <button
                  onClick={onOpenMappingSheet}
                  className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-medium rounded-lg border border-white/10 transition-colors flex items-center gap-2"
                >
                  Configurar
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>
          ) : (
            <div className="text-sm text-gray-500 italic bg-zinc-900/50 p-3 rounded-lg border border-white/5">
              Nenhum campo personalizado encontrado. Crie campos personalizados nas configurações para mapeá-los aqui.
            </div>
          )}
        </div>
      </div>

      {/* Preview Table */}
      <div className="mt-4">
        <h3 className="text-gray-500 text-xs font-medium uppercase tracking-wider mb-3">
          Pré-visualização dos dados (3 linhas)
        </h3>
        <div className="overflow-x-auto rounded-lg border border-white/10">
          <table className="w-full text-xs text-left">
            <thead className="bg-white/5 text-gray-300">
              <tr>
                {csvPreview.headers.map(h => (
                  <th
                    key={h}
                    className={`px-3 py-2 font-medium ${Object.values(columnMapping).includes(h) ? 'text-primary-400 bg-primary-500/10' : ''}`}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 bg-zinc-900/30">
              {csvPreview.rows.map((row, i) => (
                <tr key={i}>
                  {row.map((cell, j) => (
                    <td key={j} className="px-3 py-2 text-gray-400 border-r border-white/5 last:border-0">
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>
);

// Column Mapping Select Component
interface ColumnMappingSelectProps {
  label: string;
  value: string;
  headers: string[];
  onChange: (value: string) => void;
  required?: boolean;
  placeholder?: string;
}

const ColumnMappingSelect: React.FC<ColumnMappingSelectProps> = ({
  label,
  value,
  headers,
  onChange,
  required,
  placeholder = "Ignorar coluna"
}) => (
  <div className="grid grid-cols-2 gap-4 items-center">
    <label className="text-gray-400 text-sm">
      {label} {required && <span className="text-primary-500">*</span>}
    </label>
    <select
      className={`bg-zinc-900 border rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-primary-500 ${required ? 'border-primary-500/30' : 'border-white/10'}`}
      value={value}
      onChange={(e) => onChange(e.target.value)}
    >
      <option value="">{required ? "Selecione..." : placeholder}</option>
      {headers.map(h => <option key={h} value={h}>{h}</option>)}
    </select>
  </div>
);

// Step 3: Success Component
interface ImportStepSuccessProps {
  result: ImportResult;
}

const ImportStepSuccess: React.FC<ImportStepSuccessProps> = ({ result }) => (
  <div className="text-center py-8">
    <div className="w-20 h-20 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-6 text-emerald-500">
      <CheckCircle2 size={40} />
    </div>
    <h3 className="text-2xl font-bold text-white mb-2">Importação Concluída!</h3>
    <p className="text-gray-400 mb-8">Seus contatos foram processados com sucesso.</p>

    <div className="grid grid-cols-3 gap-4 max-w-md mx-auto mb-8">
      <div className="bg-zinc-900 rounded-xl p-4">
        <p className="text-2xl font-bold text-white">{result.total}</p>
        <p className="text-xs text-gray-500">Linhas</p>
      </div>
      <div className="bg-emerald-500/10 rounded-xl p-4 border border-emerald-500/20">
        <p className="text-2xl font-bold text-emerald-400">{result.success}</p>
        <p className="text-xs text-emerald-500/70">Sucessos</p>
      </div>
      <div className="bg-zinc-900 rounded-xl p-4">
        <p className="text-2xl font-bold text-gray-400">{result.errors}</p>
        <p className="text-xs text-gray-500">Ignorados</p>
      </div>
    </div>
  </div>
);
