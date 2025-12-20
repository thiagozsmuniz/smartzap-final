'use client'

import { useState } from 'react'

const steps = [
  { id: 1, label: 'Configuracao' },
  { id: 2, label: 'Publico' },
  { id: 3, label: 'Revisao' },
]

const templates = [
  {
    id: 't-1',
    name: 'Pedido Confirmado',
    category: 'Utilidade',
    status: 'Aprovado',
    preview: 'Seu pedido #{pedido} foi confirmado.',
  },
  {
    id: 't-2',
    name: 'Oferta Flash',
    category: 'Marketing',
    status: 'Revisao',
    preview: 'Oferta valida ate hoje. Aproveite.',
  },
  {
    id: 't-3',
    name: 'Boas-vindas',
    category: 'Marketing',
    status: 'Rascunho',
    preview: 'Bem-vindo! Aqui esta seu guia inicial.',
  },
]

const templateOptions = templates.concat([
  { id: 't-4', name: 'Recuperacao Carrinho', category: 'Marketing', status: 'Aprovado', preview: 'Finaliza seu pedido com 10% off.' },
  { id: 't-5', name: 'Aviso de Entrega', category: 'Utilidade', status: 'Aprovado', preview: 'Seu pedido saiu para entrega.' },
  { id: 't-6', name: 'Atendimento Inicial', category: 'Utilidade', status: 'Aprovado', preview: 'Como podemos ajudar hoje?' },
  { id: 't-7', name: 'auth_v1_171025', category: 'Autenticacao', status: 'Aprovado', preview: '*{{1}}* is your verification code.' },
  { id: 't-8', name: 'boas_vindas', category: 'Utilidade', status: 'Aprovado', preview: 'Se voce recebeu essa mensagem, significa que esta tudo certo!' },
])

export default function CampaignsNewMockPage() {
  const [step, setStep] = useState(1)
  const [audienceMode, setAudienceMode] = useState('todos')
  const [combineMode, setCombineMode] = useState('or')
  const [showAdvancedSegments, setShowAdvancedSegments] = useState(false)
  const [collapseAudienceChoice, setCollapseAudienceChoice] = useState(false)
  const [collapseQuickSegments, setCollapseQuickSegments] = useState(false)
  const [testContact, setTestContact] = useState('Suporte - +55 11 98888-0002')
  const [sendToConfigured, setSendToConfigured] = useState(true)
  const [sendToSelected, setSendToSelected] = useState(false)
  const [templateSelected, setTemplateSelected] = useState(false)
  const [selectedTemplate, setSelectedTemplate] = useState(templateOptions[0])
  const [previewTemplate, setPreviewTemplate] = useState(null)
  const [showAllTemplates, setShowAllTemplates] = useState(false)
  const [scheduleMode, setScheduleMode] = useState('imediato')
  const [customFields, setCustomFields] = useState(['teste'])
  const [newCustomField, setNewCustomField] = useState('')
  const [activeVariablePicker, setActiveVariablePicker] = useState(null)
  const [templateVars, setTemplateVars] = useState({
    header: [{ id: '{{1}}', key: 'nome', required: true }],
    body: [
      { id: '{{1}}', key: 'telefone', required: true },
      { id: '{{2}}', key: 'teste', required: true },
    ],
  })

  const selectedTestCount = Number(sendToConfigured) + Number(sendToSelected)
  const audienceCount =
    audienceMode === 'todos' ? 221 : audienceMode === 'segmentos' ? 152 : selectedTestCount
  const audienceCost = audienceMode === 'teste' ? 0 : Number((audienceCount * 0.0375).toFixed(2))
  const footerSummary =
    audienceMode === 'teste'
      ? `${selectedTestCount || 0} contato${selectedTestCount === 1 ? '' : 's'} de teste`
      : `${audienceCount} contatos • R$ ${audienceCost.toFixed(2).replace('.', ',')}`
  const canContinue = audienceMode === 'teste' ? selectedTestCount > 0 : audienceCount > 0
  const scheduleLabel = scheduleMode === 'agendar' ? 'Agendado' : 'Imediato'
  const activeTemplate = previewTemplate ?? selectedTemplate ?? templateOptions[0]
  const recentTemplates = templateOptions.slice(0, 3)
  const recommendedTemplates = templateOptions.slice(3, 6)
  const renderTemplatePreview = (text) =>
    text
      .replaceAll('{{1}}', previewTelefone)
      .replaceAll('{{2}}', previewHoras)
      .replaceAll('{{3}}', previewName)
      .replaceAll('{{nome}}', previewName)
      .replaceAll('{{telefone}}', previewTelefone)
      .replaceAll('{{teste}}', previewHoras)
      .replaceAll('#{pedido}', '#12345')
  const contactFields = [
    { key: 'nome', label: 'Nome' },
    { key: 'telefone', label: 'Telefone' },
    { key: 'email', label: 'Email' },
  ]
  const sampleValues = {
    nome: 'Ricardo',
    telefone: '+55 11 98888-0002',
    email: 'ricardo@smartzap.com',
    teste: '24',
  }
  const resolveValue = (key) => sampleValues[key] ?? key
  const previewName = resolveValue(templateVars.header[0]?.key)
  const previewTelefone = resolveValue(templateVars.body[0]?.key)
  const previewHoras = resolveValue(templateVars.body[1]?.key)
  const setTemplateVar = (section, index, key) => {
    setTemplateVars((prev) => {
      const next = { ...prev, [section]: [...prev[section]] }
      next[section][index] = { ...next[section][index], key }
      return next
    })
  }
  const addCustomField = () => {
    const trimmed = newCustomField.trim().toLowerCase()
    if (!trimmed || customFields.includes(trimmed)) {
      return
    }
    setCustomFields((prev) => [...prev, trimmed])
    setNewCustomField('')
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-2">
          <div className="text-xs text-gray-500">App / Campanhas / Novo</div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-semibold text-white">Criar Campanha</h1>
            <span className="rounded-full border border-white/10 px-3 py-1 text-[10px] uppercase tracking-widest text-gray-400">
              mock redesign
            </span>
          </div>
          <p className="text-sm text-gray-500">
            Fluxo simplificado: uma decisao por vez, com contexto sempre visivel.
          </p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-zinc-900/60 px-4 py-3 text-right text-sm text-gray-500 shadow-[0_12px_30px_rgba(0,0,0,0.35)]">
          Custo estimado: <span className="font-semibold text-emerald-400">R$ 8,29</span>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        {steps.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setStep(item.id)}
            className={`flex items-center gap-3 rounded-2xl border px-4 py-3 text-left text-sm transition ${
              step === item.id
                ? 'border-emerald-400/40 bg-emerald-500/10 text-white'
                : 'border-white/10 bg-zinc-900/40 text-gray-400 hover:text-white'
            }`}
          >
            <span
              className={`grid h-8 w-8 place-items-center rounded-full border text-xs font-semibold ${
                step === item.id
                  ? 'border-emerald-400 bg-emerald-500/20 text-emerald-200'
                  : 'border-white/10 text-gray-400'
              }`}
            >
              {item.id}
            </span>
            <span className="text-xs uppercase tracking-widest">{item.label}</span>
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 items-stretch gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <div className="space-y-6">
          {step === 1 && (
            <div className="space-y-6">
              <div className="rounded-2xl border border-white/10 bg-zinc-900/40 px-6 py-4 shadow-[0_10px_26px_rgba(0,0,0,0.3)]">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                  <div className="text-xs uppercase tracking-widest text-gray-500">Configuracao basica</div>
                  <div className="flex flex-1 flex-col gap-3 lg:flex-row lg:items-center lg:justify-end">
                    <input
                      className="w-full rounded-xl border border-white/10 bg-zinc-950/40 px-4 py-2 text-sm text-white placeholder:text-gray-600 lg:max-w-[320px]"
                      placeholder="Nome da campanha"
                    />
                    <div className="relative w-full lg:w-auto">
                      <select className="w-full min-w-[140px] appearance-none rounded-xl border border-white/10 bg-zinc-950/40 px-3 py-2 pr-9 text-sm text-white lg:w-auto">
                        <option>Utilidade</option>
                        <option>Marketing</option>
                        <option>Suporte</option>
                      </select>
                      <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-lg text-emerald-200">
                        ▾
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div
                className={`rounded-2xl border border-white/10 bg-zinc-900/40 shadow-[0_10px_26px_rgba(0,0,0,0.3)] ${
                  templateSelected ? 'px-6 py-4' : 'p-6'
                }`}
              >
                {templateSelected ? (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-xs uppercase tracking-widest text-gray-500">
                      <span>Selecione o template</span>
                      <button className="text-emerald-300 hover:text-emerald-200">Gerenciar Templates</button>
                    </div>
                    <div className="flex items-center justify-between rounded-xl border border-white/10 bg-zinc-950/40 px-4 py-2 text-sm text-emerald-100">
                      <span className="flex items-center gap-2">
                        <span className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-emerald-400/40 text-emerald-300">
                          ✓
                        </span>
                        Template selecionado
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setTemplateSelected(false)
                          setPreviewTemplate(null)
                        }}
                        className="text-xs text-gray-400 hover:text-white"
                      >
                        Trocar template
                      </button>
                    </div>
                    <div className="rounded-xl border border-emerald-400/30 bg-emerald-500/10 px-4 py-3 text-sm text-gray-200">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-white">{selectedTemplate?.name}</span>
                        <span className="text-xs uppercase text-gray-500">{selectedTemplate?.category}</span>
                      </div>
                      <p className="mt-2 text-gray-300">
                        {renderTemplatePreview(selectedTemplate?.preview ?? '')}
                      </p>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="space-y-1">
                      <h2 className="text-lg font-semibold text-white">Template</h2>
                      <p className="text-sm text-gray-500">Busque e escolha o template da campanha.</p>
                    </div>

                    <div className="mt-5">
                      <label className="text-xs uppercase tracking-widest text-gray-500">Buscar template</label>
                      <input
                        className="mt-2 w-full rounded-xl border border-white/10 bg-zinc-950/40 px-4 py-3 text-sm text-white placeholder:text-gray-600"
                        placeholder="Digite o nome do template..."
                      />
                    </div>

                    {showAllTemplates ? (
                      <div className="mt-5 rounded-2xl border border-white/10 bg-zinc-950/40 p-4">
                        <div className="flex items-center justify-between">
                          <div className="text-xs uppercase tracking-widest text-gray-500">Todos os templates</div>
                          <button
                            type="button"
                            onClick={() => setShowAllTemplates(false)}
                            className="text-xs text-gray-400 hover:text-white"
                          >
                            Voltar para recentes
                          </button>
                        </div>
                        <div className="mt-3 max-h-56 space-y-2 overflow-y-auto pr-2 text-sm">
                          {templateOptions.map((template) => (
                            <button
                              key={template.id}
                              type="button"
                              onMouseEnter={() => setPreviewTemplate(template)}
                              onMouseLeave={() => setPreviewTemplate(null)}
                              onClick={() => {
                                setSelectedTemplate(template)
                                setTemplateSelected(true)
                                setPreviewTemplate(null)
                              }}
                              className="w-full rounded-lg border border-white/10 bg-zinc-950/40 px-3 py-2 text-left text-gray-300 hover:border-emerald-400/40"
                            >
                              <div className="flex items-center justify-between">
                                <span className="font-semibold text-white">{template.name}</span>
                                <span className="text-[10px] uppercase text-gray-500">{template.category}</span>
                              </div>
                            </button>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-2">
                          <div className="rounded-xl border border-white/10 bg-zinc-950/40 p-4">
                            <div className="text-xs uppercase tracking-widest text-gray-500">Recentes</div>
                            <div className="mt-3 space-y-2 text-sm">
                              {recentTemplates.map((template) => (
                                <button
                                  key={template.id}
                                  type="button"
                                  onMouseEnter={() => setPreviewTemplate(template)}
                                  onMouseLeave={() => setPreviewTemplate(null)}
                                  onClick={() => {
                                    setSelectedTemplate(template)
                                    setTemplateSelected(true)
                                    setPreviewTemplate(null)
                                  }}
                                  className="w-full rounded-lg border border-white/10 bg-zinc-950/40 px-3 py-2 text-left text-gray-300 hover:border-emerald-400/40"
                                >
                                  <div className="font-semibold text-white">{template.name}</div>
                                  <div className="mt-1 text-xs text-gray-500">{template.category}</div>
                                </button>
                              ))}
                            </div>
                          </div>
                          <div className="rounded-xl border border-white/10 bg-zinc-950/40 p-4">
                            <div className="text-xs uppercase tracking-widest text-gray-500">Recomendados</div>
                            <div className="mt-3 space-y-2 text-sm">
                              {recommendedTemplates.map((template) => (
                                <button
                                  key={template.id}
                                  type="button"
                                  onMouseEnter={() => setPreviewTemplate(template)}
                                  onMouseLeave={() => setPreviewTemplate(null)}
                                  onClick={() => {
                                    setSelectedTemplate(template)
                                    setTemplateSelected(true)
                                    setPreviewTemplate(null)
                                  }}
                                  className="w-full rounded-lg border border-white/10 bg-zinc-950/40 px-3 py-2 text-left text-gray-300 hover:border-emerald-400/40"
                                >
                                  <div className="font-semibold text-white">{template.name}</div>
                                  <div className="mt-1 text-xs text-gray-500">{template.category}</div>
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setShowAllTemplates(true)}
                          className="mt-4 text-xs text-emerald-300"
                        >
                          Ver todos os templates
                        </button>
                      </>
                    )}
                  </>
                )}
              </div>

              {templateSelected && (
                <div className="rounded-2xl border border-emerald-400/30 bg-emerald-500/10 p-6 shadow-[0_12px_30px_rgba(0,0,0,0.35)]">
                  <div className="space-y-1">
                    <h2 className="text-lg font-semibold text-white">Variaveis do Template</h2>
                    <p className="text-sm text-gray-500">Defina valores fixos e campos dinamicos do contato.</p>
                  </div>

                  <div className="mt-5 space-y-4">
                    <div>
                      <div className="text-xs uppercase tracking-widest text-gray-500">Variaveis do cabecalho</div>
                      <div className="mt-3 space-y-3">
                        {templateVars.header.map((item, index) => {
                          const pickerId = `header-${index}`
                          return (
                            <div key={item.id} className="relative flex items-start gap-3">
                              <span className="rounded-lg bg-amber-500/20 px-2 py-1 text-xs text-amber-200">
                                {item.id}
                              </span>
                              <div className="flex-1">
                                <div className="flex items-center justify-between text-xs text-gray-500">
                                  <span>Variavel do cabecalho</span>
                                  {item.required && <span className="text-amber-300">obrigatorio</span>}
                                </div>
                                <div className="mt-2 flex items-center gap-2">
                                  <input
                                    readOnly
                                    value={`{{${item.key}}}`}
                                    className="w-full rounded-xl border border-white/10 bg-zinc-950/40 px-4 py-2 text-sm text-white"
                                  />
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setActiveVariablePicker((prev) => (prev === pickerId ? null : pickerId))
                                    }
                                    className="rounded-xl border border-white/10 bg-zinc-950/40 px-3 py-2 text-sm text-gray-400"
                                  >
                                    {'{}'}
                                  </button>
                                </div>
                              </div>
                              {activeVariablePicker === pickerId && (
                                <div className="absolute right-0 top-full z-10 mt-2 w-64 rounded-2xl border border-white/10 bg-zinc-900/95 p-3 shadow-[0_12px_30px_rgba(0,0,0,0.45)]">
                                  <div className="text-xs uppercase tracking-widest text-gray-500">Dados do contato</div>
                                  <div className="mt-2 space-y-1">
                                    {contactFields.map((field) => (
                                      <button
                                        key={field.key}
                                        type="button"
                                        onClick={() => {
                                          setTemplateVar('header', index, field.key)
                                          setActiveVariablePicker(null)
                                        }}
                                        className="flex w-full items-center gap-2 rounded-lg px-2 py-1 text-left text-sm text-gray-200 hover:bg-white/5"
                                      >
                                        {field.label}
                                      </button>
                                    ))}
                                  </div>
                                  <div className="mt-3 border-t border-white/10 pt-3">
                                    <div className="text-xs uppercase tracking-widest text-gray-500">Campos personalizados</div>
                                    <div className="mt-2 space-y-1">
                                      {customFields.map((field) => (
                                        <button
                                          key={field}
                                          type="button"
                                          onClick={() => {
                                            setTemplateVar('header', index, field)
                                            setActiveVariablePicker(null)
                                          }}
                                          className="flex w-full items-center gap-2 rounded-lg px-2 py-1 text-left text-sm text-gray-200 hover:bg-white/5"
                                        >
                                          {field}
                                        </button>
                                      ))}
                                    </div>
                                    <button className="mt-2 text-xs text-amber-300">Gerenciar campos</button>
                                  </div>
                                </div>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    </div>

                    <div>
                      <div className="text-xs uppercase tracking-widest text-gray-500">Variaveis do corpo</div>
                      <div className="mt-3 space-y-3">
                        {templateVars.body.map((item, index) => {
                          const pickerId = `body-${index}`
                          return (
                            <div key={`${item.id}-${index}`} className="relative flex items-start gap-3">
                              <span className="rounded-lg bg-amber-500/20 px-2 py-1 text-xs text-amber-200">
                                {item.id}
                              </span>
                              <div className="flex-1">
                                <div className="flex items-center justify-between text-xs text-gray-500">
                                  <span>Variavel do corpo</span>
                                  {item.required && <span className="text-amber-300">obrigatorio</span>}
                                </div>
                                <div className="mt-2 flex items-center gap-2">
                                  <input
                                    readOnly
                                    value={`{{${item.key}}}`}
                                    className="w-full rounded-xl border border-white/10 bg-zinc-950/40 px-4 py-2 text-sm text-white"
                                  />
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setActiveVariablePicker((prev) => (prev === pickerId ? null : pickerId))
                                    }
                                    className="rounded-xl border border-white/10 bg-zinc-950/40 px-3 py-2 text-sm text-gray-400"
                                  >
                                    {'{}'}
                                  </button>
                                </div>
                              </div>
                              {activeVariablePicker === pickerId && (
                                <div className="absolute right-0 top-full z-10 mt-2 w-64 rounded-2xl border border-white/10 bg-zinc-900/95 p-3 shadow-[0_12px_30px_rgba(0,0,0,0.45)]">
                                  <div className="text-xs uppercase tracking-widest text-gray-500">Dados do contato</div>
                                  <div className="mt-2 space-y-1">
                                    {contactFields.map((field) => (
                                      <button
                                        key={field.key}
                                        type="button"
                                        onClick={() => {
                                          setTemplateVar('body', index, field.key)
                                          setActiveVariablePicker(null)
                                        }}
                                        className="flex w-full items-center gap-2 rounded-lg px-2 py-1 text-left text-sm text-gray-200 hover:bg-white/5"
                                      >
                                        {field.label}
                                      </button>
                                    ))}
                                  </div>
                                  <div className="mt-3 border-t border-white/10 pt-3">
                                    <div className="text-xs uppercase tracking-widest text-gray-500">Campos personalizados</div>
                                    <div className="mt-2 space-y-1">
                                      {customFields.map((field) => (
                                        <button
                                          key={field}
                                          type="button"
                                          onClick={() => {
                                            setTemplateVar('body', index, field)
                                            setActiveVariablePicker(null)
                                          }}
                                          className="flex w-full items-center gap-2 rounded-lg px-2 py-1 text-left text-sm text-gray-200 hover:bg-white/5"
                                        >
                                          {field}
                                        </button>
                                      ))}
                                    </div>
                                    <button className="mt-2 text-xs text-amber-300">Gerenciar campos</button>
                                  </div>
                                </div>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    </div>

                  </div>
                </div>
              )}
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6">
              <div className="rounded-2xl border border-white/10 bg-zinc-900/60 p-6 shadow-[0_12px_30px_rgba(0,0,0,0.35)]">
                {collapseAudienceChoice ? (
                  <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div>
                      <div className="text-xs uppercase tracking-widest text-gray-500">Publico</div>
                      <div className="mt-1 text-sm font-semibold text-white">
                        {audienceMode === 'todos' && 'Todos'}
                        {audienceMode === 'segmentos' && 'Segmentos'}
                        {audienceMode === 'teste' && 'Teste'}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setCollapseAudienceChoice(false)}
                      className="text-xs text-emerald-300"
                    >
                      Editar publico
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="space-y-1">
                      <h2 className="text-lg font-semibold text-white">Escolha o publico</h2>
                      <p className="text-sm text-gray-500">Uma decisao rapida antes dos filtros.</p>
                    </div>
                    <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-3">
                      {[
                        { label: 'Todos', value: 'todos', helper: '221 contatos elegiveis' },
                        { label: 'Segmentos', value: 'segmentos', helper: 'Filtrar por tags, DDI ou UF' },
                        { label: 'Teste', value: 'teste', helper: 'Enviar para contato de teste' },
                      ].map((item) => (
                        <button
                          key={item.value}
                          type="button"
                          onClick={() => setAudienceMode(item.value)}
                          className={`rounded-2xl border px-4 py-4 text-left text-sm ${
                            audienceMode === item.value
                              ? 'border-emerald-400/40 bg-emerald-500/10 text-white'
                              : 'border-white/10 bg-zinc-950/40 text-gray-400'
                          }`}
                        >
                          <div className="text-sm font-semibold">{item.label}</div>
                          <div className="mt-2 text-xs text-gray-500">{item.helper}</div>
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>

              {audienceMode === 'todos' && (
                <div className="rounded-2xl border border-white/10 bg-zinc-900/60 p-6 shadow-[0_12px_30px_rgba(0,0,0,0.35)]">
                  <div className="space-y-1">
                    <h2 className="text-lg font-semibold text-white">Todos os contatos</h2>
                    <p className="text-sm text-gray-500">Nenhum filtro aplicado.</p>
                  </div>
                  <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-3">
                    <div className="rounded-xl border border-white/10 bg-zinc-950/40 p-4 text-center">
                      <p className="text-2xl font-semibold text-white">221</p>
                      <p className="text-xs text-gray-500">Elegiveis</p>
                    </div>
                    <div className="rounded-xl border border-white/10 bg-zinc-950/40 p-4 text-center">
                      <p className="text-2xl font-semibold text-amber-200">6</p>
                      <p className="text-xs text-gray-500">Suprimidos</p>
                    </div>
                    <div className="rounded-xl border border-white/10 bg-zinc-950/40 p-4 text-center">
                      <p className="text-2xl font-semibold text-gray-200">0</p>
                      <p className="text-xs text-gray-500">Duplicados</p>
                    </div>
                  </div>
                  <p className="mt-4 text-xs text-gray-500">
                    Envio para todos os contatos validos, excluindo opt-out e suprimidos.
                  </p>
                </div>
              )}

              {audienceMode === 'segmentos' && (
                <div className="rounded-2xl border border-white/10 bg-zinc-900/60 p-6 shadow-[0_12px_30px_rgba(0,0,0,0.35)]">
                  {collapseQuickSegments ? (
                    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                      <div>
                        <div className="text-xs uppercase tracking-widest text-gray-500">Segmentos rapidos</div>
                        <div className="mt-1 text-sm font-semibold text-white">Resumo aplicado</div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setCollapseQuickSegments(false)}
                        className="text-xs text-emerald-300"
                      >
                        Editar segmentos
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center justify-between">
                        <div>
                          <h2 className="text-lg font-semibold text-white">Segmentos rapidos</h2>
                          <p className="text-sm text-gray-500">Refine sem abrir um construtor completo.</p>
                        </div>
                        <button className="text-xs text-gray-400 hover:text-white">Limpar</button>
                      </div>
                      <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-gray-400">
                        <span className="uppercase tracking-widest text-gray-500">Combinacao</span>
                        <button
                          type="button"
                          onClick={() => setCombineMode('or')}
                          className={`rounded-full border px-3 py-1 ${
                            combineMode === 'or'
                              ? 'border-emerald-400/40 bg-emerald-500/10 text-emerald-200'
                              : 'border-white/10 bg-zinc-950/40 text-gray-300'
                          }`}
                        >
                          Qualquer um (OR)
                        </button>
                        <button
                          type="button"
                          onClick={() => setCombineMode('and')}
                          className={`rounded-full border px-3 py-1 ${
                            combineMode === 'and'
                              ? 'border-emerald-400/40 bg-emerald-500/10 text-emerald-200'
                              : 'border-white/10 bg-zinc-950/40 text-gray-300'
                          }`}
                        >
                          Todos (AND)
                        </button>
                        <span className="text-xs text-gray-500">OR = maior alcance • AND = mais precisao</span>
                      </div>
                      <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-3">
                        <div>
                          <p className="text-xs uppercase tracking-widest text-gray-500">Tags</p>
                          <div className="mt-3 flex flex-wrap gap-2">
                            {[
                              { label: 'lead', count: 91 },
                              { label: 'vip', count: 64 },
                              { label: 'sp', count: 22 },
                              { label: 'cobaias', count: 18 },
                              { label: 'rj', count: 14 },
                              { label: 'mg', count: 12 },
                            ].map((chip) => (
                              <button
                                key={chip.label}
                                className="rounded-full border border-white/10 bg-zinc-950/40 px-3 py-1 text-xs text-gray-300"
                              >
                                <span>{chip.label}</span>
                                <sup className="ml-1 text-[9px] text-amber-300">{chip.count}</sup>
                              </button>
                            ))}
                          </div>
                        </div>
                        <div>
                          <p className="text-xs uppercase tracking-widest text-gray-500">Pais (DDI)</p>
                          <div className="mt-3 flex flex-wrap gap-2">
                            {[
                              { label: 'BR', count: 209 },
                              { label: 'PT', count: 11 },
                              { label: 'US', count: 4 },
                              { label: 'AR', count: 2 },
                              { label: 'MX', count: 1 },
                            ].map((chip) => (
                              <button
                                key={chip.label}
                                className="rounded-full border border-white/10 bg-zinc-950/40 px-3 py-1 text-xs text-gray-300"
                              >
                                <span>{chip.label}</span>
                                <sup className="ml-1 text-[9px] text-amber-300">{chip.count}</sup>
                              </button>
                            ))}
                          </div>
                        </div>
                        <div>
                          <p className="text-xs uppercase tracking-widest text-gray-500">UF (BR)</p>
                          <div className="mt-3 flex flex-wrap gap-2">
                            {[
                              { label: 'SP', count: 70 },
                              { label: 'RJ', count: 27 },
                              { label: 'MG', count: 20 },
                              { label: 'RS', count: 12 },
                              { label: 'BA', count: 9 },
                            ].map((chip) => (
                              <button
                                key={chip.label}
                                className="rounded-full border border-white/10 bg-zinc-950/40 px-3 py-1 text-xs text-gray-300"
                              >
                                <span>{chip.label}</span>
                                <sup className="ml-1 text-[9px] text-amber-300">{chip.count}</sup>
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                      <div className="mt-5 rounded-xl border border-white/5 bg-zinc-950/30 p-4">
                        <p className="text-xs text-gray-400">
                          Quer filtros avancados?{' '}
                          <button
                            type="button"
                            onClick={() => {
                              setShowAdvancedSegments((prev) => {
                                const next = !prev
                                if (next) {
                                  setCollapseAudienceChoice(true)
                                  setCollapseQuickSegments(true)
                                } else {
                                  setCollapseAudienceChoice(false)
                                  setCollapseQuickSegments(false)
                                }
                                return next
                              })
                            }}
                            className="text-emerald-300"
                          >
                            {showAdvancedSegments ? 'Fechar ajustes finos' : 'Abrir ajustes finos'}
                          </button>
                        </p>
                      </div>
                    </>
                  )}
                  {showAdvancedSegments && (
                    <div className="mt-4 rounded-2xl border border-white/10 bg-zinc-950/40 p-5">
                      <div className="text-xs uppercase tracking-widest text-gray-500">Ajustes finos</div>
                      <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                          <label className="text-xs uppercase tracking-widest text-gray-500">Ultima interacao</label>
                          <div className="flex flex-wrap gap-2">
                            {['Abriu', 'Respondeu', 'Clicou'].map((label) => (
                              <button
                                key={label}
                                className="rounded-full border border-white/10 bg-zinc-950/40 px-3 py-1 text-xs text-gray-300"
                              >
                                {label}
                              </button>
                            ))}
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {['7 dias', '30 dias', '90 dias'].map((label) => (
                              <button
                                key={label}
                                className="rounded-full border border-white/10 bg-zinc-950/40 px-3 py-1 text-xs text-gray-300"
                              >
                                {label}
                              </button>
                            ))}
                          </div>
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs uppercase tracking-widest text-gray-500">Janela de inatividade</label>
                          <div className="flex flex-wrap gap-2">
                            {['7 dias', '30 dias', '90 dias'].map((label) => (
                              <button
                                key={label}
                                className="rounded-full border border-white/10 bg-zinc-950/40 px-3 py-1 text-xs text-gray-300"
                              >
                                {label}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                      <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                          <label className="text-xs uppercase tracking-widest text-gray-500">Origem do contato</label>
                          <div className="flex flex-wrap gap-2">
                            {[
                              { label: 'Formulario', count: 88 },
                              { label: 'Importacao', count: 109 },
                              { label: 'API', count: 24 },
                            ].map((chip) => (
                              <button
                                key={chip.label}
                                className="rounded-full border border-white/10 bg-zinc-950/40 px-3 py-1 text-xs text-gray-300"
                              >
                                <span>{chip.label}</span>
                                <sup className="ml-1 text-[9px] text-amber-300">{chip.count}</sup>
                              </button>
                            ))}
                          </div>
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs uppercase tracking-widest text-gray-500">Campos personalizados</label>
                          <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
                            <select className="rounded-xl border border-white/10 bg-zinc-950/40 px-3 py-2 text-xs text-white">
                              <option>Selecionar campo</option>
                              <option>Plano</option>
                              <option>Cidade</option>
                              <option>Ultima compra</option>
                            </select>
                            <select className="rounded-xl border border-white/10 bg-zinc-950/40 px-3 py-2 text-xs text-white">
                              <option>Tem valor</option>
                              <option>Igual a</option>
                              <option>Contem</option>
                            </select>
                            <input
                              className="rounded-xl border border-white/10 bg-zinc-950/40 px-3 py-2 text-xs text-white placeholder:text-gray-600"
                              placeholder="Valor"
                            />
                          </div>
                        </div>
                      </div>
                      <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-gray-400">
                        <span className="uppercase tracking-widest text-gray-500">Excluir</span>
                        {['Opt-out', 'Suprimidos', 'Duplicados'].map((label) => (
                          <button
                            key={label}
                            className="rounded-full border border-white/10 bg-zinc-950/40 px-3 py-1 text-xs text-gray-300"
                          >
                            {label}
                          </button>
                        ))}
                      </div>
                      <div className="mt-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                        <p className="text-xs text-gray-500">Ajustes aplicados ao modo de combinacao atual.</p>
                        <div className="flex items-center gap-2">
                          <button className="rounded-full border border-white/10 px-3 py-2 text-xs text-gray-300">
                            Limpar tudo
                          </button>
                          <button className="rounded-full border border-emerald-400/40 bg-emerald-500/10 px-3 py-2 text-xs font-semibold text-emerald-200">
                            Aplicar
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {audienceMode === 'teste' && (
                <div className="rounded-2xl border border-white/10 bg-zinc-900/60 p-6 shadow-[0_12px_30px_rgba(0,0,0,0.35)]">
                  <div className="space-y-1">
                    <h2 className="text-lg font-semibold text-white">Contato de teste</h2>
                    <p className="text-sm text-gray-500">Escolha o contato configurado, outro contato, ou ambos.</p>
                  </div>
                  <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div className="rounded-2xl border border-white/10 bg-zinc-950/40 p-4">
                      <div className="flex items-center justify-between">
                        <label className="text-xs uppercase tracking-widest text-gray-500">Telefone de teste (settings)</label>
                        <button className="text-xs text-emerald-300">Editar em configuracoes</button>
                      </div>
                      <button
                        type="button"
                        onClick={() => setSendToConfigured((prev) => !prev)}
                        className={`mt-3 w-full rounded-xl border bg-zinc-950/40 px-4 py-3 text-left text-sm text-white ${
                          sendToConfigured ? 'border-emerald-400/40' : 'border-white/10'
                        }`}
                      >
                        +55 11 99999-0001
                      </button>
                      <p className="mt-2 text-xs text-gray-500">Clique para incluir/remover no envio.</p>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-zinc-950/40 p-4">
                      <label className="text-xs uppercase tracking-widest text-gray-500">Usar outro contato</label>
                      <input
                        className="mt-2 w-full rounded-xl border border-white/10 bg-zinc-950/40 px-4 py-3 text-sm text-white placeholder:text-gray-600"
                        placeholder="Nome, telefone ou email..."
                      />
                      <div className="mt-3 space-y-2 text-sm text-gray-400">
                        {['Suporte - +55 11 98888-0002', 'Comercial - +55 11 97777-0003'].map((name) => (
                          <button
                            key={name}
                            type="button"
                            onClick={() => {
                              const isSame = testContact === name
                              setTestContact(name)
                              setSendToSelected(isSame ? !sendToSelected : true)
                            }}
                            className={`w-full rounded-xl border px-3 py-2 text-left ${
                              testContact === name
                                ? 'border-emerald-400/40 bg-zinc-950/40 text-gray-200'
                                : 'border-white/10 bg-zinc-950/40 text-gray-300 hover:border-emerald-400/40'
                            }`}
                          >
                            {name}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="mt-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <p className="text-xs text-gray-500">
                      Envio de teste nao consome limite diario. Selecione 1 ou 2 contatos.
                    </p>
                    <button className="rounded-full border border-emerald-400/40 bg-emerald-500/10 px-4 py-2 text-xs font-semibold text-emerald-200">
                      Enviar teste
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {step === 3 && (
            <div className="space-y-6">
              <div className="rounded-2xl border border-white/10 bg-zinc-900/60 p-6 shadow-[0_12px_30px_rgba(0,0,0,0.35)]">
                <div className="space-y-1">
                  <h2 className="text-lg font-semibold text-white">Pre-check de destinatarios</h2>
                  <p className="text-sm text-gray-500">Validacao automatica antes do disparo.</p>
                </div>
                <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
                  <div className="rounded-xl border border-white/10 bg-zinc-950/40 p-4 text-center">
                    <p className="text-2xl font-semibold text-white">217</p>
                    <p className="text-xs text-gray-500">Validos</p>
                  </div>
                  <div className="rounded-xl border border-white/10 bg-zinc-950/40 p-4 text-center">
                    <p className="text-2xl font-semibold text-amber-300">4</p>
                    <p className="text-xs text-gray-500">Ignorados</p>
                  </div>
                  <div className="rounded-xl border border-white/10 bg-zinc-950/40 p-4 text-center">
                    <p className="text-2xl font-semibold text-emerald-300">OK</p>
                    <p className="text-xs text-gray-500">Status</p>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-zinc-900/60 p-6 shadow-[0_12px_30px_rgba(0,0,0,0.35)]">
                <div className="space-y-1">
                  <h2 className="text-lg font-semibold text-white">Agendamento</h2>
                  <p className="text-sm text-gray-500">Defina se o envio sera agora ou programado.</p>
                </div>
                <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                  <button
                    type="button"
                    onClick={() => setScheduleMode('imediato')}
                    className={`rounded-xl border px-4 py-3 text-left text-sm ${
                      scheduleMode === 'imediato'
                        ? 'border-emerald-400/40 bg-emerald-500/10 text-emerald-200'
                        : 'border-white/10 bg-zinc-950/40 text-gray-400'
                    }`}
                  >
                    Imediato
                  </button>
                  <button
                    type="button"
                    onClick={() => setScheduleMode('agendar')}
                    className={`rounded-xl border px-4 py-3 text-left text-sm ${
                      scheduleMode === 'agendar'
                        ? 'border-emerald-400/40 bg-emerald-500/10 text-emerald-200'
                        : 'border-white/10 bg-zinc-950/40 text-gray-400'
                    }`}
                  >
                    Agendar
                  </button>
                </div>
                <div
                  className={`mt-4 transition ${
                    scheduleMode === 'agendar' ? 'opacity-100' : 'opacity-40'
                  }`}
                >
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <label className="text-xs uppercase tracking-widest text-gray-500">Data</label>
                      <input
                        className="w-full rounded-xl border border-white/10 bg-zinc-950/40 px-4 py-3 text-sm text-white"
                        type="date"
                        disabled={scheduleMode !== 'agendar'}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs uppercase tracking-widest text-gray-500">Horario</label>
                      <input
                        className="w-full rounded-xl border border-white/10 bg-zinc-950/40 px-4 py-3 text-sm text-white"
                        type="time"
                        disabled={scheduleMode !== 'agendar'}
                      />
                    </div>
                  </div>
                  <p className="mt-3 text-xs text-gray-500">Fuso fixo: America/Sao_Paulo.</p>
                </div>
              </div>
            </div>
          )}

          <div className="rounded-2xl border border-white/10 bg-zinc-900/60 p-4 shadow-[0_12px_30px_rgba(0,0,0,0.35)]">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <button className="text-sm text-gray-400 hover:text-white">Voltar</button>
              <div className="text-sm text-gray-400">{footerSummary}</div>
              <button
                className={`rounded-full px-5 py-2 text-sm font-semibold ${
                  canContinue
                    ? 'bg-white text-black'
                    : 'cursor-not-allowed border border-white/10 bg-white/10 text-gray-500'
                }`}
                disabled={!canContinue}
              >
                {step < 3 ? 'Continuar' : 'Lancar campanha'}
              </button>
            </div>
          </div>
        </div>

        <div className={`flex h-full flex-col gap-4 ${step === 2 ? 'lg:sticky lg:top-6' : ''}`}>
          <div className="rounded-2xl border border-white/10 bg-zinc-900/60 p-6 shadow-[0_12px_30px_rgba(0,0,0,0.35)]">
            <div className="flex items-center justify-between">
              <div className="text-xs uppercase tracking-widest text-gray-500">Resumo</div>
              <button className="rounded-full border border-emerald-400/40 bg-emerald-500/10 px-3 py-1 text-[11px] font-semibold text-emerald-200">
                Campanha Rapida
              </button>
            </div>
            <div className="mt-4 space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-gray-500">Contatos</span>
                <span className="text-white">221</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-500">Custo</span>
                <span className="text-emerald-300">R$ 8,29</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-500">Agendamento</span>
                <span className="text-white">{scheduleLabel}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-500">Nome</span>
                <span className="text-white">Reativacao Q3</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-500">Template</span>
                <span className="text-white">Pedido Confirmado</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-500">Publico</span>
                <span className="text-white">221 contatos (VIP)</span>
              </div>
            </div>
          </div>

          <div className="flex-1 rounded-2xl border border-white/10 bg-zinc-900/60 p-8 shadow-[0_12px_30px_rgba(0,0,0,0.35)]">
            <div className="flex items-center justify-between">
              <div className="text-xs uppercase tracking-widest text-gray-500">Preview</div>
              <button className="text-xs text-gray-400 hover:text-white">Expandir</button>
            </div>
            <div className="mt-6 rounded-2xl bg-zinc-950/40 p-6 text-sm text-gray-300">
              <p className="text-xs uppercase tracking-widest text-gray-500">Template</p>
              <p className="mt-2 text-base font-semibold text-white">{activeTemplate?.name}</p>
              <p className="mt-3">{renderTemplatePreview(activeTemplate?.preview ?? '')}</p>
            </div>
          </div>
        </div>
      </div>

    </div>
  )
}
