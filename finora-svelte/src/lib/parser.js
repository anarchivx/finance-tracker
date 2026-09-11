// ==========================================================================
// FINORA AI - ENHANCED SMART NATURAL LANGUAGE PARSER
// ==========================================================================

export class SmartParser {
  static parse(inputText) {
    if (!inputText || typeof inputText !== 'string') return null;

    const text = inputText.trim();
    if (text.length < 2) return null;

    let amount = 0;
    let type = 'expense';
    let category = 'Pengeluaran Lainnya';
    let method = 'QRIS';
    const textLower = text.toLowerCase();

    // 1. Detect Payment Method
    if (textLower.includes('qris')) {
      method = 'QRIS';
    } else if (textLower.includes('cash') || textLower.includes('tunai')) {
      method = 'Tunai';
    } else if (
      textLower.includes('transfer') ||
      textLower.includes('bca') ||
      textLower.includes('mandiri') ||
      textLower.includes('bri') ||
      textLower.includes('bni') ||
      textLower.includes('jago') ||
      textLower.includes('seabank')
    ) {
      method = 'Bank Transfer';
    } else if (textLower.includes('gopay')) {
      method = 'GoPay';
    } else if (textLower.includes('ovo')) {
      method = 'OVO';
    } else if (textLower.includes('shopeepay') || textLower.includes('spay')) {
      method = 'ShopeePay';
    } else if (textLower.includes('kartu kredit') || textLower.includes('cc') || textLower.includes('credit')) {
      method = 'Kartu Kredit';
    }

    // 2. Detect Amount (e.g., 25rb, 50k, 5jt, 25000, 1.5jt, 2,5 jt, 100 ribu)
    const amountRegex = /(\d+([.,]\d+)?)\s*(rb|k|jt|juta|ribu)?/gi;
    let match;
    let foundAmountStr = '';

    while ((match = amountRegex.exec(text)) !== null) {
      let val = parseFloat(match[1].replace(',', '.'));
      const unit = (match[3] || '').toLowerCase();

      if (unit === 'rb' || unit === 'k' || unit === 'ribu') {
        val *= 1000;
      } else if (unit === 'jt' || unit === 'juta') {
        val *= 1000000;
      } else if (val < 1000 && !unit) {
        // Casual Indonesian shorthand: "kopi 25" -> 25.000
        if (val < 100) val *= 1000;
      }

      if (val > 0) {
        amount = val;
        foundAmountStr = match[0];
        break;
      }
    }

    // 3. Detect Income Keywords
    const incomeKeywords = [
      'gaji', 'terima', 'dapat', 'bonus', 'freelance', 'proyek', 
      'omset', 'jual', 'transfer masuk', 'saku', 'thr', 'dividen', 'restitusi'
    ];
    const isIncome = incomeKeywords.some((kw) => textLower.includes(kw));

    if (isIncome) {
      type = 'income';
      category = 'Gaji';
      if (textLower.includes('freelance') || textLower.includes('proyek')) category = 'Freelance & Bisnis';
      if (textLower.includes('jual') || textLower.includes('omset') || textLower.includes('toko')) category = 'Freelance & Bisnis';
      if (textLower.includes('bonus') || textLower.includes('thr') || textLower.includes('hadiah')) category = 'Bonus & Hadiah';
      if (textLower.includes('investasi') || textLower.includes('dividen') || textLower.includes('profit')) category = 'Investasi';
    } else {
      // Expense Category Rules
      if (
        textLower.includes('kopi') ||
        textLower.includes('makan') ||
        textLower.includes('minum') ||
        textLower.includes('nasi') ||
        textLower.includes('bakso') ||
        textLower.includes('sate') ||
        textLower.includes('ayam') ||
        textLower.includes('mie') ||
        textLower.includes('resto') ||
        textLower.includes('cafe') ||
        textLower.includes('snack') ||
        textLower.includes('boba') ||
        textLower.includes('warteg')
      ) {
        category = 'Makanan & Minuman';
      } else if (
        textLower.includes('bensin') ||
        textLower.includes('pertamax') ||
        textLower.includes('pertalite') ||
        textLower.includes('shell') ||
        textLower.includes('gojek') ||
        textLower.includes('grab') ||
        textLower.includes('parkir') ||
        textLower.includes('tol') ||
        textLower.includes('angkot') ||
        textLower.includes('kereta') ||
        textLower.includes('mrt') ||
        textLower.includes('service')
      ) {
        category = 'Transportasi';
      } else if (
        textLower.includes('belanja') ||
        textLower.includes('baju') ||
        textLower.includes('alfa') ||
        textLower.includes('indo') ||
        textLower.includes('supermarket') ||
        textLower.includes('market') ||
        textLower.includes('tokopedia') ||
        textLower.includes('shopee') ||
        textLower.includes('sepatu')
      ) {
        category = 'Belanja';
      } else if (
        textLower.includes('listrik') ||
        textLower.includes('pln') ||
        textLower.includes('wifi') ||
        textLower.includes('indihome') ||
        textLower.includes('air') ||
        textLower.includes('pdam') ||
        textLower.includes('pulsa') ||
        textLower.includes('kuota') ||
        textLower.includes('tagihan') ||
        textLower.includes('bpjs')
      ) {
        category = 'Tagihan & Utilitas';
      } else if (
        textLower.includes('nonton') ||
        textLower.includes('bioskop') ||
        textLower.includes('game') ||
        textLower.includes('steam') ||
        textLower.includes('spotify') ||
        textLower.includes('netflix') ||
        textLower.includes('liburan') ||
        textLower.includes('staycation')
      ) {
        category = 'Hiburan';
      } else if (
        textLower.includes('obat') ||
        textLower.includes('dokter') ||
        textLower.includes('apotek') ||
        textLower.includes('rs') ||
        textLower.includes('klinik') ||
        textLower.includes('vitamin')
      ) {
        category = 'Kesehatan';
      } else if (
        textLower.includes('kursus') ||
        textLower.includes('buku') ||
        textLower.includes('kuliah') ||
        textLower.includes('sekolah') ||
        textLower.includes('pelatihan')
      ) {
        category = 'Pendidikan';
      }
    }

    // 4. Clean Description by stripping out extracted amount and keywords
    let cleanTitle = text
      .replace(new RegExp(foundAmountStr, 'gi'), '')
      .replace(/via|menggunakan|pakai|by|pembayaran|dengan/gi, '')
      .replace(/qris|cash|tunai|transfer|bca|mandiri|bri|bni|jago|seabank|gopay|ovo|shopeepay|spay|kartu kredit|cc/gi, '')
      .replace(/\s+/g, ' ')
      .trim();

    if (!cleanTitle || cleanTitle.length < 2) {
      cleanTitle = category;
    }

    // Capitalize first letter
    cleanTitle = cleanTitle.charAt(0).toUpperCase() + cleanTitle.slice(1);

    return {
      description: cleanTitle,
      amount,
      type,
      category,
      payment_method: method,
      date: new Date().toISOString().split('T')[0],
      time: new Date().toTimeString().slice(0, 5),
      isAiParsed: true
    };
  }
}
