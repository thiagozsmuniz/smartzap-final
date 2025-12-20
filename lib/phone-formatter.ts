/**
 * Phone Number Validation and Formatting
 *
 * Uses libphonenumber-js for robust international phone validation
 * Ported from NossoFlow
 */

import { parsePhoneNumber, isValidPhoneNumber, type CountryCode } from 'libphonenumber-js';

export interface PhoneValidationResult {
  isValid: boolean;
  error?: string;
  metadata?: {
    country?: string;
    countryCallingCode?: string;
    nationalNumber?: string;
    type?: string;
  };
}

export interface ProcessedPhone {
  normalized: string;
  validation: PhoneValidationResult;
}

/**
 * Valida um número de telefone usando `libphonenumber-js`.
 *
 * Além de validar formato e plausibilidade, tenta identificar país e tipo.
 * Para uso com WhatsApp, também verifica se o tipo do número é compatível
 * com celular (o WhatsApp não aceita fixo).
 *
 * @param phone Número a validar (pode conter espaços, hífens e parênteses).
 * @param defaultCountry País padrão (ISO 3166-1 alpha-2) quando o número não tiver prefixo.
 * @returns Resultado de validação, com `error` detalhado quando inválido.
 */
export function validatePhoneNumber(
  phone: string,
  defaultCountry: CountryCode = 'BR'
): PhoneValidationResult {
  const trimmed = phone.trim();

  if (!trimmed) {
    return {
      isValid: false,
      error: 'Número de telefone não pode ser vazio',
    };
  }

  try {
    // Check if valid using libphonenumber-js
    const isValid = isValidPhoneNumber(trimmed, defaultCountry);

    if (!isValid) {
      // Try to parse to get more specific error
      try {
        const parsed = parsePhoneNumber(trimmed, defaultCountry);

        if (!parsed) {
          return {
            isValid: false,
            error: 'Formato de número inválido',
          };
        }

        // Check if it's a possible number
        if (!parsed.isPossible()) {
          const countryLabel = parsed.country || 'este país';
          return {
            isValid: false,
            error: `Número inválido para ${countryLabel}. Verifique a quantidade de dígitos.`,
          };
        }

        return {
          isValid: false,
          error: 'Número não é válido para WhatsApp',
        };
      } catch {
        return {
          isValid: false,
          error: 'Formato de número inválido. Use formato internacional (+5521999999999)',
        };
      }
    }

    // Parse to verify it's a mobile number (WhatsApp requires mobile)
    const parsed = parsePhoneNumber(trimmed, defaultCountry);

    if (parsed && parsed.getType() && !['MOBILE', 'FIXED_LINE_OR_MOBILE'].includes(parsed.getType()!)) {
      return {
        isValid: false,
        error: 'WhatsApp requer números de celular (não aceita fixos)',
      };
    }

    return {
      isValid: true,
      metadata: {
        country: parsed?.country,
        countryCallingCode: parsed?.countryCallingCode,
        nationalNumber: parsed?.nationalNumber,
        type: parsed?.getType(),
      }
    };
  } catch {
    return {
      isValid: false,
      error: 'Formato inválido. Use formato internacional: +5521999999999',
    };
  }
}

/**
 * Valida um número de telefone para uso geral (contato/perfil), sem regra específica do WhatsApp.
 *
 * Diferente de {@link validatePhoneNumber}, este método **não exige** que o número seja celular.
 *
 * @param phone Número a validar (pode conter espaços, hífens e parênteses).
 * @param defaultCountry País padrão (ISO 3166-1 alpha-2) quando o número não tiver prefixo.
 * @returns Resultado de validação, com `error` detalhado quando inválido.
 */
export function validateAnyPhoneNumber(
  phone: string,
  defaultCountry: CountryCode = 'BR'
): PhoneValidationResult {
  const trimmed = phone.trim();

  if (!trimmed) {
    return {
      isValid: false,
      error: 'Número de telefone não pode ser vazio',
    };
  }

  try {
    const isValid = isValidPhoneNumber(trimmed, defaultCountry);
    if (!isValid) {
      try {
        const parsed = parsePhoneNumber(trimmed, defaultCountry);
        if (!parsed) {
          return { isValid: false, error: 'Formato de número inválido' };
        }
        if (!parsed.isPossible()) {
          const countryLabel = parsed.country || 'este país';
          return {
            isValid: false,
            error: `Número inválido para ${countryLabel}. Verifique a quantidade de dígitos.`,
          };
        }
        return { isValid: false, error: 'Número de telefone inválido' };
      } catch {
        return {
          isValid: false,
          error: 'Formato de número inválido. Use formato internacional (+5521999999999)',
        };
      }
    }

    const parsed = parsePhoneNumber(trimmed, defaultCountry);
    return {
      isValid: true,
      metadata: {
        country: parsed?.country,
        countryCallingCode: parsed?.countryCallingCode,
        nationalNumber: parsed?.nationalNumber,
        type: parsed?.getType(),
      },
    };
  } catch {
    return {
      isValid: false,
      error: 'Formato inválido. Use formato internacional: +5521999999999',
    };
  }
}

/**
 * Normaliza um número de telefone para o formato internacional E.164.
 *
 * O formato exigido pela API do WhatsApp Cloud é `+XXXXXXXXXXX` (sem espaços).
 *
 * @param phone Número a normalizar.
 * @param defaultCountry País padrão quando não estiver explícito no número.
 * @returns Número normalizado em E.164 (ex.: `+5521999999999`).
 */
export function normalizePhoneNumber(
  phone: string,
  defaultCountry: CountryCode = 'BR'
): string {
  try {
    const parsed = parsePhoneNumber(phone, defaultCountry);

    if (parsed) {
      // Return E.164 format (international format without spaces)
      return parsed.number;
    }

    // Fallback: try to clean and add + if missing
    let cleaned = phone.replace(/[^\d+]/g, '');
    if (!cleaned.startsWith('+')) {
      cleaned = '+' + cleaned;
    }
    return cleaned;
  } catch {
    // Fallback for invalid numbers
    let cleaned = phone.replace(/[^\d+]/g, '');
    if (!cleaned.startsWith('+')) {
      // Assume Brazilian if no country code
      if (cleaned.length === 11) {
        cleaned = '+55' + cleaned;
      } else {
        cleaned = '+' + cleaned;
      }
    }
    return cleaned;
  }
}

/**
 * Extrai o DDI (country calling code) de um telefone.
 *
 * Ex.: "+5521999999999" -> "55"
 *
 * @param phone Telefone em formato livre (com/sem +).
 * @param defaultCountry País padrão quando não houver prefixo.
 * @returns DDI como string numérica (sem "+") ou null quando não for possível.
 */
export function getCountryCallingCodeFromPhone(
  phone: string,
  defaultCountry: CountryCode = 'BR'
): string | null {
  const trimmed = String(phone || '').trim();
  if (!trimmed) return null;
  try {
    const parsed = parsePhoneNumber(trimmed, defaultCountry);
    const code = parsed?.countryCallingCode;
    return code ? String(code) : null;
  } catch {
    return null;
  }
}

/**
 * Formata um número para exibição (com espaçamento/pontuação amigáveis).
 *
 * @param phone Número em qualquer formato.
 * @param style Estilo de formatação (`international` ou `national`).
 * @returns Número formatado para display.
 */
export function formatPhoneNumberDisplay(
  phone: string,
  style: 'international' | 'national' = 'international'
): string {
  try {
    const parsed = parsePhoneNumber(phone);

    if (parsed) {
      return style === 'international'
        ? parsed.formatInternational() // +55 21 99999-9999
        : parsed.formatNational();      // (21) 99999-9999
    }

    return phone;
  } catch {
    return phone;
  }
}

/**
 * Valida e normaliza um número de telefone em um único passo.
 *
 * @param phone Número a processar.
 * @param defaultCountry País padrão quando não estiver explícito no número.
 * @returns Objeto contendo `normalized` (E.164) e `validation`.
 */
export function processPhoneNumber(
  phone: string,
  defaultCountry: CountryCode = 'BR'
): ProcessedPhone {
  const validation = validatePhoneNumber(phone, defaultCountry);
  const normalized = normalizePhoneNumber(phone, defaultCountry);

  return {
    normalized,
    validation,
  };
}

/**
 * Extrai informações de país a partir de um número.
 *
 * @param phone Número a analisar.
 * @returns Dados do país (inclui DDI e bandeira) ou `null` se não for possível interpretar.
 */
export function getPhoneCountryInfo(phone: string): {
  country: CountryCode | undefined;
  callingCode: string | undefined;
  flag: string | undefined;
} | null {
  try {
    const parsed = parsePhoneNumber(phone);

    if (parsed) {
      let flag: string | undefined;
      if (parsed.country) {
        flag = getCountryFlag(parsed.country);
      }

      return {
        country: parsed.country,
        callingCode: parsed.countryCallingCode,
        flag,
      };
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * Gets emoji flag for country code
 */
function getCountryFlag(countryCode: string): string {
  return countryCode
    .toUpperCase()
    .replace(/./g, (char) => String.fromCodePoint(127397 + char.charCodeAt(0)));
}

/**
 * Valida (em lote) vários números de telefone.
 *
 * Útil para validação de importação via CSV.
 *
 * @param phones Lista de números a validar.
 * @returns Lista de resultados contendo o original, o normalizado e a validação.
 */
export function validatePhoneNumbers(phones: string[]): Array<{
  phone: string;
  normalized: string;
  validation: PhoneValidationResult;
}> {
  return phones.map(phone => {
    const result = processPhoneNumber(phone);
    return {
      phone,
      ...result,
    };
  });
}
