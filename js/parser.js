/* ==========================================================================
   FINCATAT AUTO - SMART NATURAL LANGUAGE PARSER
   ========================================================================== */

class SmartParser {
    static parse(inputText) {
        if (!inputText || typeof inputText !== 'string') return null;

        const text = inputText.trim();
        let amount = 0;
        let type = 'expense'; // Default to expense
        let category = 'Pengeluaran Lainnya';
        let method = 'QRIS'; // Default method
        let title = text;

        // 1. Detect Payment Method
        const textLower = text.toLowerCase();
        if (textLower.includes('qris')) {
            method = 'QRIS';
        } else if (textLower.includes('cash') || textLower.includes('tunai')) {
            method = 'Tunai';
        } else if (textLower.includes('transfer') || textLower.includes('bca') || textLower.includes('mandiri') || textLower.includes('bri') || textLower.includes('bni')) {
            method = 'Bank Transfer';
        } else if (textLower.includes('gopay')) {
            method = 'GoPay';
        } else if (textLower.includes('ovo')) {
            method = 'OVO';
        } else if (textLower.includes('shopeepay') || textLower.includes('spay')) {
            method = 'ShopeePay';
        }

        // 2. Detect Amount (e.g., 25rb, 50k, 5jt, 25000, 1.5jt)
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
                // If input was e.g. "25" assuming 25rb in casual Indonesian input
                if (val < 100) val *= 1000;
            }

            if (val > 0) {
                amount = val;
                foundAmountStr = match[0];
                break;
            }
        }

        // 3. Detect Income Keywords
        const incomeKeywords = ['gaji', 'terima', 'dapat', 'bonus', 'freelance', 'proyek', 'omset', 'jual', 'transfer masuk', 'saku', 'thr'];
        const isIncome = incomeKeywords.some(kw => textLower.includes(kw));

        if (isIncome) {
            type = 'income';
            category = 'Gaji & Uang Masuk';
            if (textLower.includes('freelance') || textLower.includes('proyek')) category = 'Freelance & Proyek';
            if (textLower.includes('jual') || textLower.includes('omset')) category = 'Bisnis & Penjualan';
            if (textLower.includes('bonus') || textLower.includes('thr') || textLower.includes('hadiah')) category = 'Hadiah & Bonus';
        } else {
            // Expense Category Rules
            if (textLower.includes('kopi') || textLower.includes('makan') || textLower.includes('minum') || textLower.includes('nasi') || textLower.includes('bakso') || textLower.includes('resto') || textLower.includes('cafe')) {
                category = 'Makanan & Minuman';
            } else if (textLower.includes('bensin') || textLower.includes('pertamax') || textLower.includes('shell') || textLower.includes('gojek') || textLower.includes('grab') || textLower.includes('parkir') || textLower.includes('tol') || textLower.includes('angkot')) {
                category = 'Transportasi & Bensin';
            } else if (textLower.includes('belanja') || textLower.includes('baju') || textLower.includes('alfa') || textLower.includes('indo') || textLower.includes('market') || textLower.includes('tokopedia') || textLower.includes('shopee')) {
                category = 'Belanja & Groceries';
            } else if (textLower.includes('listrik') || textLower.includes('pln') || textLower.includes('wifi') || textLower.includes('indihome') || textLower.includes('air') || textLower.includes('pdam') || textLower.includes('pulsa') || textLower.includes('kuota')) {
                category = 'Tagihan, Listrik & Wi-Fi';
            } else if (textLower.includes('nonton') || textLower.includes('bioskop') || textLower.includes('game') || textLower.includes('steam') || textLower.includes('spotify') || textLower.includes('netflix')) {
                category = 'Hiburan & Hobi';
            } else if (textLower.includes('obat') || textLower.includes('dokter') || textLower.includes('apotek') || textLower.includes('rs') || textLower.includes('vitamin')) {
                category = 'Kesehatan & Medis';
            }
        }

        // 4. Clean Title by removing method and amount keywords
        let cleanTitle = text
            .replace(new RegExp(foundAmountStr, 'gi'), '')
            .replace(/via|menggunakan|pakai|by|pembayaran/gi, '')
            .replace(/qris|cash|tunai|transfer|bca|mandiri|bri|bni|gopay|ovo|shopeepay|spay/gi, '')
            .trim();

        if (!cleanTitle || cleanTitle.length < 2) {
            cleanTitle = category;
        }

        // Capitalize first letter of cleanTitle
        cleanTitle = cleanTitle.charAt(0).toUpperCase() + cleanTitle.slice(1);

        return {
            title: cleanTitle,
            amount: amount,
            type: type,
            category: category,
            method: method,
            date: new Date().toISOString()
        };
    }
}

window.SmartParser = SmartParser;
