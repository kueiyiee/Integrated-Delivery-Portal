const ETHIOPIA_LOCALE = 'en-ET';
const ETHIOPIA_TIMEZONE = 'Africa/Addis_Ababa';

export function formatEthiopianDateTime(value: string | Date | number, options: Intl.DateTimeFormatOptions = {}) {
  const date = typeof value === 'number' ? new Date(value) : value instanceof Date ? value : new Date(value);
  const formatOptions: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'long',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
    timeZone: ETHIOPIA_TIMEZONE,
    ...options,
  };

  return new Intl.DateTimeFormat(ETHIOPIA_LOCALE, formatOptions).format(date);
}

export function formatEthiopianTimestampForFilename(value: string | Date | number = new Date()) {
  const date = typeof value === 'number' ? new Date(value) : value instanceof Date ? value : new Date(value);
  const parts = new Intl.DateTimeFormat(ETHIOPIA_LOCALE, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
    timeZone: ETHIOPIA_TIMEZONE,
  }).formatToParts(date);

  const partMap = Object.fromEntries(parts.filter((part) => part.type !== 'literal').map((part) => [part.type, part.value]));
  return `${partMap.year}-${partMap.month}-${partMap.day}_${partMap.hour}${partMap.minute}${partMap.second}_ET`;
}

export function sanitizeFileName(value: string) {
  return value
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^a-zA-Z0-9-_\.]/g, '')
    .replace(/[-_]{2,}/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function makeReportFileName(reportTitle: string, companyName: string | null | undefined, format: string) {
  const cleanTitle = sanitizeFileName(reportTitle || 'report');
  const cleanCompany = companyName ? sanitizeFileName(companyName) : 'company';
  const cleanFormat = format.toLowerCase().replace(/^xlsx?$|^csv$|^pdf$|^docx$/i, (match) => match.toLowerCase());
  const timestamp = formatEthiopianTimestampForFilename();
  return `${cleanTitle}_${cleanCompany}_${timestamp}.${cleanFormat}`;
}
