// ===== CÜZDAN FİYAT TABLOSU =====
// Her içerik tipinin tamamlanma karşılığı (TL)

export const TASK_PRICES: Record<string, number> = {
  reels: 500,    // Reels: 500 TL
  posts: 300,    // Post: 300 TL
  stories: 200,  // Story: 200 TL
};

// İçerik tipi label'ları (Türkçe)
export const CONTENT_TYPE_WALLET_LABELS: Record<string, string> = {
  reels: 'Reels',
  posts: 'Post',
  stories: 'Story',
};

// Fiyat formatı
export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency: 'TRY',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

// ===== MAAŞ DÖNEMİ HESAPLAMA =====
// Şirket maaşları ayın 5'inden 5'ine ödüyor
// Örnek: 5 Şubat 00:00 - 4 Mart 23:59:59

const MONTH_NAMES = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
const SALARY_DAY = 5; // Maaş dönem başlangıç günü

export interface SalaryPeriod {
  start: Date;   // Dönem başı (5'i dahil)
  end: Date;     // Dönem sonu (bir sonraki ayın 4'ü dahil)
  label: string; // "5 Şubat - 4 Mart 2026"
  key: string;   // "2026-02" gibi unique key
}

/**
 * Verilen tarih için maaş dönemini hesaplar
 * Ayın 5'i ve sonrası → bu ayın 5'i ile sonraki ayın 4'ü arası
 * Ayın 1-4'ü → geçen ayın 5'i ile bu ayın 4'ü arası
 */
export function getSalaryPeriod(date: Date = new Date()): SalaryPeriod {
  const day = date.getDate();
  const month = date.getMonth();
  const year = date.getFullYear();

  let startMonth: number, startYear: number;

  if (day >= SALARY_DAY) {
    // 5 ve sonrası: bu ayın 5'i başlangıç
    startMonth = month;
    startYear = year;
  } else {
    // 1-4 arası: geçen ayın 5'i başlangıç
    if (month === 0) {
      startMonth = 11;
      startYear = year - 1;
    } else {
      startMonth = month - 1;
      startYear = year;
    }
  }

  // Bitiş: başlangıçtan bir sonraki ayın 4'ü
  let endMonth = startMonth + 1;
  let endYear = startYear;
  if (endMonth > 11) {
    endMonth = 0;
    endYear = startYear + 1;
  }

  const start = new Date(startYear, startMonth, SALARY_DAY, 0, 0, 0, 0);
  const end = new Date(endYear, endMonth, SALARY_DAY - 1, 23, 59, 59, 999);

  let label = '';
  if (startYear === endYear) {
    label = `${SALARY_DAY} ${MONTH_NAMES[startMonth]} - ${SALARY_DAY - 1} ${MONTH_NAMES[endMonth]} ${endYear}`;
  } else {
    label = `${SALARY_DAY} ${MONTH_NAMES[startMonth]} ${startYear} - ${SALARY_DAY - 1} ${MONTH_NAMES[endMonth]} ${endYear}`;
  }

  const key = `${startYear}-${String(startMonth + 1).padStart(2, '0')}`;

  return { start, end, label, key };
}

/**
 * Önceki maaş dönemini hesaplar (geçmiş ödemeler için)
 */
export function getPreviousSalaryPeriod(date: Date = new Date()): SalaryPeriod {
  const current = getSalaryPeriod(date);
  // Mevcut dönemin başlangıcından bir gün öncesinin dönemi = önceki dönem
  const prevDate = new Date(current.start);
  prevDate.setDate(prevDate.getDate() - 1);
  return getSalaryPeriod(prevDate);
}

/**
 * Belirli bir tarihin verilen maaş dönemine ait olup olmadığını kontrol eder
 */
export function isDateInSalaryPeriod(taskDate: Date, period: SalaryPeriod): boolean {
  const d = new Date(taskDate);
  d.setHours(0, 0, 0, 0);
  const start = new Date(period.start);
  start.setHours(0, 0, 0, 0);
  const end = new Date(period.end);
  end.setHours(23, 59, 59, 999);
  return d >= start && d <= end;
}
