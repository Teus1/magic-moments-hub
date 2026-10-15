/**
 * Gera o "BR Code" estático do Pix (padrão EMV QRCPS-MPM do BACEN).
 * O código é montado localmente, sem provedor de pagamento: ele facilita o
 * envio do valor (QR e "copia e cola"), mas não confirma sozinho que o Pix caiu.
 */

const MERCHANT_CITY = "BRASIL";
const MAX_TEXT = 25;

/** CRC16-CCITT (polinômio 0x1021, init 0xFFFF) exigido no campo 63 do BR Code. */
export function pixCrc16(payload: string): string {
  let crc = 0xffff;
  for (let i = 0; i < payload.length; i++) {
    crc ^= payload.charCodeAt(i) << 8;
    for (let bit = 0; bit < 8; bit++) {
      crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, "0");
}

function tlv(id: string, value: string): string {
  if (!value) throw new Error("A informação do Pix é obrigatória.");
  if (value.length > 99) throw new Error("A informação do Pix é longa demais.");
  return `${id}${String(value.length).padStart(2, "0")}${value}`;
}

/**
 * Ajusta a chave para o formato que o Pix espera:
 * CPF/CNPJ digitados com máscara viram somente números, telefone vira +55...,
 * e-mail e chave aleatória (EVP) permanecem como cadastrados.
 */
export function normalizePixKey(key: string): string {
  const trimmed = key.trim();
  if (!trimmed) throw new Error("Cadastre a chave Pix do colaborador.");
  if (/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(trimmed)) return trimmed;
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(trimmed))
    return trimmed.toLowerCase();
  const digits = trimmed.replace(/\D/g, "");
  if (!digits) throw new Error("A chave Pix informada não é válida.");
  if (trimmed.startsWith("+") || (digits.startsWith("55") && digits.length >= 12)) return `+${digits}`;
  if (digits.length === 10 || digits.length === 11) return `+55${digits}`;
  return digits;
}

/** Nome de quem recebe: maiúsculas, sem acentos e dentro das 25 posições do padrão. */
export function pixMerchantName(name: string): string {
  const clean = name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9 .-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!clean) throw new Error("Informe o nome de quem recebe o pagamento.");
  return clean.slice(0, MAX_TEXT);
}

/** Identificador curto do lançamento, usado na descrição do Pix. */
export function pixTransactionId(linkId: string): string {
  const clean = linkId.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
  if (clean.length < 6) throw new Error("Não foi possível gerar o identificador do pagamento.");
  return `MM${clean.slice(0, 8)}`;
}

export function buildPixPayload(input: {
  key: string;
  amount: number;
  receiverName: string;
  linkId: string;
}): string {
  const amount = Math.round(Number(input.amount) * 100) / 100;
  if (!Number.isFinite(amount) || amount <= 0) throw new Error("Informe um valor maior que zero.");
  if (amount > 999999.99) throw new Error("Valor acima do permitido para um pagamento Pix.");

  const merchantAccount = tlv("26", tlv("00", "br.gov.bcb.pix") + tlv("01", normalizePixKey(input.key)));
  const additionalData = tlv("62", tlv("05", pixTransactionId(input.linkId)));
  const body =
    tlv("00", "01") +
    tlv("01", "12") +
    merchantAccount +
    tlv("52", "0000") +
    tlv("53", "986") +
    tlv("54", amount.toFixed(2)) +
    tlv("58", "BR") +
    tlv("59", pixMerchantName(input.receiverName)) +
    tlv("60", MERCHANT_CITY) +
    additionalData +
    "6304";

  return `${body}${pixCrc16(body)}`;
}
