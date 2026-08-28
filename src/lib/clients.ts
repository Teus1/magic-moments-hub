export interface ClientForm {
  full_name: string;
  phone: string;
  whatsapp: string;
  email: string;
  zip_code: string;
  address: string;
  address_number: string;
  address_complement: string;
  neighborhood: string;
  city: string;
  state: string;
  notes: string;
}

export const emptyClientForm: ClientForm = {
  full_name: "",
  phone: "",
  whatsapp: "",
  email: "",
  zip_code: "",
  address: "",
  address_number: "",
  address_complement: "",
  neighborhood: "",
  city: "",
  state: "",
  notes: "",
};

export function onlyDigits(value: string) {
  return value.replace(/\D/g, "");
}

/** Formata telefone brasileiro: (11) 91234-5678 */
export function formatPhone(value: string) {
  const digits = onlyDigits(value).slice(0, 11);
  if (digits.length <= 2) return digits;
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

/** Formata CEP: 00000-000 */
export function formatZip(value: string) {
  const digits = onlyDigits(value).slice(0, 8);
  if (digits.length <= 5) return digits;
  return `${digits.slice(0, 5)}-${digits.slice(5)}`;
}

export interface ZipLookupResult {
  address: string;
  neighborhood: string;
  city: string;
  state: string;
}

/** Consulta o CEP no ViaCEP (público). Retorna null quando não encontrado. */
export async function lookupZipCode(zip: string): Promise<ZipLookupResult | null> {
  const digits = onlyDigits(zip);
  if (digits.length !== 8) return null;
  try {
    const response = await fetch(`https://viacep.com.br/ws/${digits}/json/`);
    if (!response.ok) return null;
    const data = (await response.json()) as {
      erro?: boolean | string;
      logradouro?: string;
      bairro?: string;
      localidade?: string;
      uf?: string;
    };
    if (data.erro) return null;
    return {
      address: data.logradouro ?? "",
      neighborhood: data.bairro ?? "",
      city: data.localidade ?? "",
      state: data.uf ?? "",
    };
  } catch {
    return null;
  }
}
