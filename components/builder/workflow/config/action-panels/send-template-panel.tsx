"use client";

import { useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Input } from "@/components/builder/ui/input";
import { Label } from "@/components/builder/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/builder/ui/select";
import type { CustomFieldDefinition, Template } from "@/types";
import { templateService } from "@/services/templateService";
import { customFieldService } from "@/services/customFieldService";
import { settingsService } from "@/services/settingsService";
import { getTestContactLabel } from "@/lib/test-contact-display";
import {
  paramsToMap,
  buttonParamToInput,
  buildParamsFromMap,
  buildButtonParamsFromInput,
  extractTemplateKeys,
  getTemplateComponent,
  findFirstDynamicButtonIndex,
  getButtonLabelByIndex,
} from "./utils";
import { TemplatePreviewEditor } from "./template-preview-editor";

export interface SendTemplatePanelProps {
  config: Record<string, unknown>;
  onUpdateConfig: (key: string, value: string) => void;
  disabled: boolean;
}

export function SendTemplatePanel({
  config,
  onUpdateConfig,
  disabled,
}: SendTemplatePanelProps) {
  const templateNameValue = String(config?.templateName || "");
  const parameterFormat = String(config?.parameterFormat || "positional");

  const { data: templates = [], isLoading: templatesLoading } = useQuery({
    queryKey: ["templates"],
    queryFn: templateService.getAll,
  });

  const { data: customFields = [] } = useQuery<CustomFieldDefinition[]>({
    queryKey: ["customFields", "contact"],
    queryFn: () => customFieldService.getAll("contact"),
  });

  const { data: testContact } = useQuery<{
    name?: string;
    phone?: string;
    email?: string | null;
    custom_fields?: Record<string, unknown>;
  } | null>({
    queryKey: ["testContact"],
    queryFn: () => settingsService.getTestContact(),
  });

  const templateOptions = useMemo(() => {
    const names = templates
      .map((template) => String(template?.name || "").trim())
      .filter(Boolean);
    const unique = Array.from(new Set(names));
    unique.sort((a, b) => a.localeCompare(b));
    return unique.map((name) => ({ label: name, value: name }));
  }, [templates]);

  const templateOptionsWithCurrent = useMemo(() => {
    if (!templateNameValue) return templateOptions;
    const exists = templateOptions.some(
      (option) => option.value === templateNameValue
    );
    if (exists) return templateOptions;
    return [
      { label: `${templateNameValue} (atual)`, value: templateNameValue },
      ...templateOptions,
    ];
  }, [templateNameValue, templateOptions]);

  const selectedTemplate = useMemo(
    () => templates.find((template) => template.name === templateNameValue),
    [templates, templateNameValue]
  );

  const templateFormat =
    (selectedTemplate?.parameterFormat as string | undefined) ||
    parameterFormat ||
    "positional";
  const templateLanguage = selectedTemplate?.language || "";

  const bodyTemplateText = useMemo(() => {
    const bodyComponent = getTemplateComponent(selectedTemplate, "BODY");
    return bodyComponent?.text || selectedTemplate?.content || "";
  }, [selectedTemplate]);

  const headerTemplateText = useMemo(() => {
    const headerComponent = getTemplateComponent(selectedTemplate, "HEADER");
    if (!headerComponent || headerComponent.format !== "TEXT") {
      return "";
    }
    return headerComponent.text || "";
  }, [selectedTemplate]);

  const footerTemplateText = useMemo(() => {
    const footerComponent = getTemplateComponent(selectedTemplate, "FOOTER");
    return footerComponent?.text || "";
  }, [selectedTemplate]);

  const bodyParamKeys = useMemo(
    () =>
      extractTemplateKeys(
        `${bodyTemplateText}\n${footerTemplateText}`,
        templateFormat
      ),
    [bodyTemplateText, footerTemplateText, templateFormat]
  );

  const headerParamKeys = useMemo(
    () => extractTemplateKeys(headerTemplateText, templateFormat),
    [headerTemplateText, templateFormat]
  );

  const headerParamKeysForUi = useMemo(
    () => headerParamKeys.slice(0, 1),
    [headerParamKeys]
  );

  const buttonParamIndex = useMemo(
    () => findFirstDynamicButtonIndex(selectedTemplate),
    [selectedTemplate]
  );

  const hasTemplateParams =
    bodyParamKeys.length > 0 ||
    headerParamKeys.length > 0 ||
    buttonParamIndex !== null;

  const bodyParamsMap = useMemo(
    () => paramsToMap(config?.bodyParams),
    [config?.bodyParams]
  );

  const headerParamsMap = useMemo(
    () => paramsToMap(config?.headerParams),
    [config?.headerParams]
  );

  const buttonParamInput = useMemo(
    () => buttonParamToInput(config?.buttonParams),
    [config?.buttonParams]
  );

  const dynamicButtonLabel = useMemo(
    () => getButtonLabelByIndex(selectedTemplate, buttonParamIndex),
    [selectedTemplate, buttonParamIndex]
  );

  const systemFieldOptions = useMemo(
    () => [
      { label: "Nome do contato", token: "{{contact.name}}" },
      { label: "Telefone do contato", token: "{{contact.phone}}" },
      { label: "Email do contato", token: "{{contact.email}}" },
    ],
    []
  );

  const customFieldOptions = useMemo(
    () =>
      customFields
        .map((field) => ({
          key: String(field.key || "").trim(),
          label: String(field.label || field.key || "").trim(),
        }))
        .filter((field) => field.key && field.label),
    [customFields]
  );

  const testContactLabel = useMemo(() => {
    if (!testContact?.phone) return "";
    return getTestContactLabel(testContact as any);
  }, [testContact]);

  const autoFillHint = testContactLabel
    ? `Usando: ${testContactLabel}`
    : "Configure um contato teste em Configuracoes.";

  const pickTokenForKey = (
    key: string,
    fallbackTokens: string[],
    fallbackIndex: { value: number }
  ) => {
    const lower = key.toLowerCase();
    if (lower.includes("nome") || lower.includes("name")) {
      return "{{contact.name}}";
    }
    if (lower.includes("telefone") || lower.includes("phone")) {
      return "{{contact.phone}}";
    }
    if (lower.includes("email")) {
      return "{{contact.email}}";
    }
    if (customFieldOptions.some((option) => option.key === key)) {
      return `{{${key}}}`;
    }
    if (fallbackIndex.value < fallbackTokens.length) {
      const token = fallbackTokens[fallbackIndex.value];
      fallbackIndex.value += 1;
      return token;
    }
    return "";
  };

  const handleAutoFill = () => {
    const fallbackTokens = systemFieldOptions.map((option) => option.token);
    const fallbackIndex = { value: 0 };
    const nextBodyMap = { ...bodyParamsMap };
    const nextHeaderMap = { ...headerParamsMap };

    if (headerParamKeysForUi.length > 0) {
      const headerKey = headerParamKeysForUi[0];
      if (!nextHeaderMap[headerKey]) {
        const token = pickTokenForKey(
          headerKey,
          fallbackTokens,
          fallbackIndex
        );
        if (token) nextHeaderMap[headerKey] = token;
      }
    }

    bodyParamKeys.forEach((key) => {
      if (nextBodyMap[key]) return;
      const token = pickTokenForKey(key, fallbackTokens, fallbackIndex);
      if (token) nextBodyMap[key] = token;
    });

    const nextBodyParams = buildParamsFromMap(
      nextBodyMap,
      bodyParamKeys,
      templateFormat
    );
    onUpdateConfig("bodyParams", JSON.stringify(nextBodyParams));

    if (headerParamKeysForUi.length > 0) {
      const headerParams = buildParamsFromMap(
        nextHeaderMap,
        headerParamKeysForUi,
        templateFormat
      );
      const first = headerParams.length > 0 ? [headerParams[0]] : [];
      onUpdateConfig("headerParams", JSON.stringify(first));
    }
  };

  const updateBodyParamValue = (key: string, value: string) => {
    const nextMap = { ...bodyParamsMap };
    if (String(value || "").trim()) {
      nextMap[key] = value;
    } else {
      delete nextMap[key];
    }
    const keys = Array.from(new Set([...bodyParamKeys, key]));
    const params = buildParamsFromMap(nextMap, keys, templateFormat);
    onUpdateConfig("bodyParams", JSON.stringify(params));
  };

  const updateHeaderParamValue = (key: string, value: string) => {
    const nextMap = { ...headerParamsMap };
    if (String(value || "").trim()) {
      nextMap[key] = value;
    } else {
      delete nextMap[key];
    }
    const keys = Array.from(new Set([...headerParamKeysForUi, key]));
    const params = buildParamsFromMap(nextMap, keys, templateFormat);
    const first = params.length > 0 ? [params[0]] : [];
    onUpdateConfig("headerParams", JSON.stringify(first));
  };

  // Sync template language and format
  useEffect(() => {
    if (templateLanguage && config?.language !== templateLanguage) {
      onUpdateConfig("language", templateLanguage);
    }
    if (templateFormat && config?.parameterFormat !== templateFormat) {
      onUpdateConfig("parameterFormat", templateFormat);
    }
  }, [
    config?.language,
    config?.parameterFormat,
    onUpdateConfig,
    templateFormat,
    templateLanguage,
  ]);

  return (
    <>
      <div className="space-y-2">
        <Label className="ml-1" htmlFor="templateName">
          Nome do template
        </Label>
        {templateOptionsWithCurrent.length > 0 ? (
          <Select
            disabled={disabled}
            onValueChange={(value) => onUpdateConfig("templateName", value)}
            value={templateNameValue}
          >
            <SelectTrigger className="w-full" id="templateName">
              <SelectValue placeholder="Selecione o template" />
            </SelectTrigger>
            <SelectContent>
              {templateOptionsWithCurrent.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <Input
            disabled={disabled}
            id="templateName"
            onChange={(e) => onUpdateConfig("templateName", e.target.value)}
            placeholder="welcome_message"
            value={templateNameValue}
          />
        )}
        {templateOptionsWithCurrent.length === 0 && !templatesLoading && (
          <p className="text-muted-foreground text-xs">
            Nenhum template encontrado. Sincronize em Templates para
            popular a lista.
          </p>
        )}
      </div>

      {hasTemplateParams && (
        <TemplatePreviewEditor
          bodyParamsMap={bodyParamsMap}
          bodyText={bodyTemplateText}
          buttonLabel={dynamicButtonLabel}
          buttonParamIndex={buttonParamIndex}
          buttonParamValue={buttonParamInput}
          bodyKeys={bodyParamKeys}
          customFieldOptions={customFieldOptions}
          disabled={disabled}
          footerText={footerTemplateText}
          headerParamsMap={headerParamsMap}
          headerText={headerTemplateText}
          headerKeys={headerParamKeysForUi}
          autoFillDisabled={!testContact?.phone}
          autoFillLabel={autoFillHint}
          onAutoFill={handleAutoFill}
          onUpdateBodyParam={updateBodyParamValue}
          onUpdateButtonParam={(value) => {
            const params = buildButtonParamsFromInput(
              String(value || ""),
              buttonParamIndex
            );
            onUpdateConfig("buttonParams", JSON.stringify(params));
          }}
          onUpdateHeaderParam={updateHeaderParamValue}
          systemFieldOptions={systemFieldOptions}
          testContact={testContact ?? null}
          templateFormat={templateFormat}
        />
      )}

      {!hasTemplateParams && templateNameValue && (
        <p className="text-muted-foreground text-xs">
          Este template nao exige variaveis.
        </p>
      )}
    </>
  );
}
