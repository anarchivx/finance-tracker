<script>
  import { onDestroy } from 'svelte';
  import { emitAddTransaction } from '../socket.js';
  import { wallets, currency, formatCurrency } from '../stores.js';
  import confetti from 'canvas-confetti';

  let isScanning = false;
  let scannedReceipt = null;
  let scanProgress = 0;
  let ocrStatusStage = 'Mempersiapkan pemindaian...';
  let previewImage = null;
  let saveSuccessMessage = '';
  let ocrError = '';
  let rawOcrText = '';
  let showRawOcr = false;
  let isRealOcrResult = false;

  // In-App Live Camera Viewfinder State
  let isCameraModalOpen = false;
  let videoElement;
  let mediaStream = null;
  let cameraError = '';
  let facingMode = 'environment';
  let isTakingPhoto = false;

  // Form Fields for the parsed transaction
  let storeName = '';
  let receiptDate = new Date().toISOString().split('T')[0];
  let receiptTime = new Date().toTimeString().slice(0, 5);
  let totalAmount = '';
  let category = 'Makanan & Minuman';
  let paymentMethod = 'QRIS';
  let targetWalletId = '';
  let notes = '';
  let itemizedLines = [];

  // Manual item addition
  let newItemName = '';
  let newItemPrice = '';
  let showAddItemInput = false;

  $: if ($wallets.length > 0 && !targetWalletId) {
    targetWalletId = $wallets[0].id;
  }

  const sampleReceipts = [
    {
      label: 'Indomaret Point',
      icon: 'fa-store',
      store: 'Indomaret Point Sudirman',
      total: 148500,
      category: 'Belanja',
      method: 'QRIS',
      notes: 'Bahan masakan & cemilan mingguan',
      items: [
        { name: 'Ultra Milk 1L Plain', price: 21500, qty: 2 },
        { name: 'Roti Gandum Sari Roti', price: 22000, qty: 1 },
        { name: 'Telur Ayam Omega 10s', price: 34500, qty: 1 },
        { name: 'Minyak Goreng Sania 2L', price: 38000, qty: 1 },
        { name: 'Air Mineral 600ml', price: 5500, qty: 2 }
      ]
    },
    {
      label: 'Fore Coffee Resto',
      icon: 'fa-mug-hot',
      store: 'Fore Coffee Grand Indonesia',
      total: 84000,
      category: 'Makanan & Minuman',
      method: 'QRIS',
      notes: 'Meeting & ngopi sore',
      items: [
        { name: 'Iced Aren Latte (Reg)', price: 35000, qty: 1 },
        { name: 'Butter Croissant', price: 24000, qty: 1 },
        { name: 'Matcha Green Tea', price: 25000, qty: 1 }
      ]
    },
    {
      label: 'SPBU Pertamina',
      icon: 'fa-gas-pump',
      store: 'SPBU Pertamina 31.129 Kuningan',
      total: 250000,
      category: 'Transportasi',
      method: 'Bank Transfer',
      notes: 'Isi Pertamax penuh',
      items: [
        { name: 'Pertamax 92 (19.37 L)', price: 250000, qty: 1 }
      ]
    },
    {
      label: 'Apotek K-24',
      icon: 'fa-pills',
      store: 'Apotek K-24 Tebet Raya',
      total: 96500,
      category: 'Kesehatan',
      method: 'Tunai',
      notes: 'Vitamin C & suplemen',
      items: [
        { name: 'Enervon-C Multivitamin 30s', price: 52000, qty: 1 },
        { name: 'Panadol Extra Merah', price: 17500, qty: 1 },
        { name: 'Tolak Angin Herbal 5s', price: 27000, qty: 1 }
      ]
    }
  ];

  let tesseractPromise = null;

  async function loadTesseract() {
    if (typeof window === 'undefined') return null;
    if (window.Tesseract) return window.Tesseract;
    if (tesseractPromise) return tesseractPromise;

    tesseractPromise = new Promise((resolve, reject) => {
      const existing = document.getElementById('finora-tesseract-script');
      if (existing) {
        if (window.Tesseract) return resolve(window.Tesseract);
        existing.addEventListener('load', () => resolve(window.Tesseract));
        existing.addEventListener('error', () => reject(new Error('Gagal memuat pustaka OCR')));
        return;
      }

      const script = document.createElement('script');
      script.id = 'finora-tesseract-script';
      script.src = 'https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js';
      script.async = true;
      script.onload = () => {
        if (window.Tesseract) {
          resolve(window.Tesseract);
        } else {
          reject(new Error('Tesseract global object not found'));
        }
      };
      script.onerror = () => reject(new Error('Koneksi internet bermasalah saat memuat AI OCR'));
      document.head.appendChild(script);
    });

    return tesseractPromise;
  }

  function preprocessImage(imageSrc) {
    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = 'Anonymous';
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          const maxDim = 1500;
          let width = img.width || 800;
          let height = img.height || 600;

          if (width > maxDim || height > maxDim) {
            if (width > height) {
              height = Math.round((height * maxDim) / width);
              width = maxDim;
            } else {
              width = Math.round((width * maxDim) / height);
              height = maxDim;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d', { willReadFrequently: true });
          ctx.drawImage(img, 0, 0, width, height);

          // Get image data to boost contrast & binarize faint thermal text
          const imgData = ctx.getImageData(0, 0, width, height);
          const d = imgData.data;
          const contrast = 1.45; // 45% boost
          const factor = (259 * (contrast * 100 + 255)) / (255 * (259 - contrast * 100));

          for (let i = 0; i < d.length; i += 4) {
            const gray = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
            const enhanced = Math.min(255, Math.max(0, factor * (gray - 128) + 128));
            d[i] = enhanced;
            d[i + 1] = enhanced;
            d[i + 2] = enhanced;
          }
          ctx.putImageData(imgData, 0, 0);
          resolve(canvas);
        } catch (e) {
          console.warn('Preprocessing canvas error:', e);
          resolve(img);
        }
      };
      img.onerror = () => resolve(imageSrc);
      img.src = imageSrc;
    });
  }

  function normalizeOcrArtifacts(text) {
    if (!text) return '';
    return text
      .replace(/\bT[0O]TA[Ll1]\b/gi, 'TOTAL')
      .replace(/\bT[0O]T4[Ll1]\b/gi, 'TOTAL')
      .replace(/\bGR[A4]ND\b/gi, 'GRAND')
      .replace(/\bJUML[A4]H\b/gi, 'JUMLAH')
      .replace(/\bT[A4]GIH[A4]N\b/gi, 'TAGIHAN')
      .replace(/\bB[A4]Y[A4]R\b/gi, 'BAYAR')
      .replace(/\bSUBT[0O]T[A4]L\b/gi, 'SUBTOTAL')
      .replace(/\b[Rr][Pp][.:\s]*/g, 'Rp ')
      .replace(/(Rp\s*|\b(?:TOTAL|JUMLAH|BAYAR)\s*[:=]?\s*)([0-9OIlBS.,]+)/gi, (match, prefix, numPart) => {
        const fixedNum = numPart
          .replace(/O/g, '0')
          .replace(/[Il]/g, '1')
          .replace(/B/g, '8')
          .replace(/S/g, '5');
        return prefix + fixedNum;
      });
  }

  function parseAmount(numStr) {
    if (!numStr) return 0;
    let clean = numStr.replace(/rp\.?/gi, '').replace(/,-$/, '').trim().replace(/\s+/g, '');
    if (clean.includes('.') && clean.includes(',')) {
      clean = clean.replace(/\./g, '').replace(',', '.');
    } else if (clean.includes('.')) {
      const parts = clean.split('.');
      if (parts[parts.length - 1].length === 3) {
        clean = clean.replace(/\./g, '');
      } else if (parts[parts.length - 1].length <= 2) {
        clean = parts.slice(0, -1).join('') + '.' + parts[parts.length - 1];
      } else {
        clean = clean.replace(/\./g, '');
      }
    } else if (clean.includes(',')) {
      const parts = clean.split(',');
      if (parts[parts.length - 1].length === 3) {
        clean = clean.replace(/,/g, '');
      } else if (parts[parts.length - 1].length <= 2) {
        clean = parts.slice(0, -1).join('') + '.' + parts[parts.length - 1];
      } else {
        clean = clean.replace(/,/g, '');
      }
    }
    const val = Math.round(parseFloat(clean));
    return isNaN(val) ? 0 : val;
  }

  function parseIndonesianReceipt(rawText) {
    if (!rawText) return null;
    const cleanText = normalizeOcrArtifacts(rawText);
    const lines = cleanText.split('\n').map((l) => l.trim()).filter(Boolean);
    if (lines.length === 0) return null;

    // 1. Detect Store / Merchant Name
    const knownChains = [
      { pattern: /indomaret\s*(point)?/i, name: 'Indomaret', cat: 'Belanja' },
      { pattern: /alfamart/i, name: 'Alfamart', cat: 'Belanja' },
      { pattern: /alfamidi/i, name: 'Alfamidi', cat: 'Belanja' },
      { pattern: /super\s*indo/i, name: 'Super Indo', cat: 'Belanja' },
      { pattern: /hypermart/i, name: 'Hypermart', cat: 'Belanja' },
      { pattern: /transmart|carrefour/i, name: 'Transmart', cat: 'Belanja' },
      { pattern: /spbu|pertamina/i, name: 'SPBU Pertamina', cat: 'Transportasi' },
      { pattern: /shell/i, name: 'SPBU Shell', cat: 'Transportasi' },
      { pattern: /bp[- ]akr/i, name: 'SPBU BP', cat: 'Transportasi' },
      { pattern: /starbucks/i, name: 'Starbucks Coffee', cat: 'Makanan & Minuman' },
      { pattern: /fore\s*coffee/i, name: 'Fore Coffee', cat: 'Makanan & Minuman' },
      { pattern: /kopi\s*kenangan/i, name: 'Kopi Kenangan', cat: 'Makanan & Minuman' },
      { pattern: /janji\s*jiwa/i, name: 'Kopi Janji Jiwa', cat: 'Makanan & Minuman' },
      { pattern: /point\s*coffee/i, name: 'Point Coffee', cat: 'Makanan & Minuman' },
      { pattern: /lawson/i, name: 'Lawson Station', cat: 'Makanan & Minuman' },
      { pattern: /familymart/i, name: 'FamilyMart', cat: 'Makanan & Minuman' },
      { pattern: /mcdonald|mcd\b/i, name: "McDonald's", cat: 'Makanan & Minuman' },
      { pattern: /kfc\b/i, name: 'KFC Resto', cat: 'Makanan & Minuman' },
      { pattern: /burger\s*king/i, name: 'Burger King', cat: 'Makanan & Minuman' },
      { pattern: /solaria/i, name: 'Solaria Resto', cat: 'Makanan & Minuman' },
      { pattern: /bakmi\s*gm/i, name: 'Bakmi GM', cat: 'Makanan & Minuman' },
      { pattern: /gacoan/i, name: 'Mie Gacoan', cat: 'Makanan & Minuman' },
      { pattern: /j\.?co/i, name: 'J.CO Donuts & Coffee', cat: 'Makanan & Minuman' },
      { pattern: /chatime/i, name: 'Chatime', cat: 'Makanan & Minuman' },
      { pattern: /pizza\s*hut/i, name: 'Pizza Hut', cat: 'Makanan & Minuman' },
      { pattern: /apotek\s*k-?24/i, name: 'Apotek K-24', cat: 'Kesehatan' },
      { pattern: /kimia\s*farma/i, name: 'Kimia Farma', cat: 'Kesehatan' },
      { pattern: /guardian/i, name: 'Guardian', cat: 'Kesehatan' },
      { pattern: /watsons/i, name: 'Watsons', cat: 'Kesehatan' },
      { pattern: /century/i, name: 'Century Healthcare', cat: 'Kesehatan' }
    ];

    let detectedStore = '';
    let detectedCategory = '';

    for (const chain of knownChains) {
      if (chain.pattern.test(cleanText)) {
        detectedStore = chain.name;
        detectedCategory = chain.cat;
        break;
      }
    }

    if (!detectedStore) {
      const ignoreHeaderRegex = /selamat datang|terima kasih|struk|nota|receipt|tax invoice|npwp|jl\.|jalan|telp|kasir|cashier|member|pos/i;
      for (let i = 0; i < Math.min(5, lines.length); i++) {
        const clean = lines[i].replace(/[^a-zA-Z0-9\s&.-]/g, '').trim();
        if (clean.length >= 3 && !ignoreHeaderRegex.test(clean) && !/\d{5,}/.test(clean)) {
          detectedStore = clean;
          break;
        }
      }
    }
    if (!detectedStore) detectedStore = 'Struk Pembelian';

    // 2. Detect Category if not determined
    if (!detectedCategory) {
      const lower = cleanText.toLowerCase();
      if (/spbu|bensin|pertamax|pertalite|solar|diesel|parkir|toll|bbm/i.test(lower)) {
        detectedCategory = 'Transportasi';
      } else if (/kopi|coffee|cafe|resto|restoran|makan|minum|food|beverage|nasi|mie|ayam|bakso|burger|tea|ice cream|roti|bakery/i.test(lower)) {
        detectedCategory = 'Makanan & Minuman';
      } else if (/apotek|obat|farmasi|klinik|hospital|medis|vitamin|capsule|tablet|syrup/i.test(lower)) {
        detectedCategory = 'Kesehatan';
      } else if (/pln|listrik|pulsa|pdam|telkom|indihome|token/i.test(lower)) {
        detectedCategory = 'Tagihan & Utilitas';
      } else {
        detectedCategory = 'Belanja';
      }
    }

    // 3. Extract Total Amount
    let detectedTotal = 0;
    const totalKeywordsRegex = /(?:grand\s*total|total\s*(?:akhir|belanja|bayar|tagihan|transaksi)?|jumlah|tagihan|sub\s*total|harga\s*total|total)\s*[:=]?\s*(?:rp\.?)?\s*([0-9.,]+)/i;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const match = line.match(totalKeywordsRegex);
      if (match && match[1]) {
        const amt = parseAmount(match[1]);
        if (amt >= 500 && amt <= 100000000) {
          detectedTotal = amt;
          break;
        }
      }
      if (/^(?:grand\s*total|total\s*akhir|total\s*belanja|total|jumlah)\s*[:=]?$/i.test(line.trim())) {
        if (i + 1 < lines.length) {
          const nextMatch = lines[i + 1].match(/(?:rp\.?)?\s*([0-9.,]+)/i);
          if (nextMatch) {
            const amt = parseAmount(nextMatch[1]);
            if (amt >= 500 && amt <= 100000000) {
              detectedTotal = amt;
              break;
            }
          }
        }
      }
    }

    // Fallback: search highest plausible number in the bottom 60%
    if (!detectedTotal) {
      const bottomLines = lines.slice(Math.floor(lines.length * 0.4));
      const candidates = [];
      for (const l of bottomLines) {
        if (/\b(?:202[0-9]|08[0-9]{8,11})\b/.test(l)) continue;
        const numMatches = l.match(/(?:rp\.?)?\s*([0-9]{1,3}(?:[.,][0-9]{3})+(?:[.,][0-9]{2})?|[0-9]{4,8})/gi);
        if (numMatches) {
          for (const nm of numMatches) {
            const val = parseAmount(nm);
            if (val >= 1000 && val <= 50000000) {
              candidates.push(val);
            }
          }
        }
      }
      if (candidates.length > 0) {
        detectedTotal = Math.max(...candidates);
      }
    }

    // 4. Extract Date and Time
    let detectedDate = new Date().toISOString().split('T')[0];
    let detectedTime = new Date().toTimeString().slice(0, 5);

    const dateMatch = cleanText.match(/\b(\d{1,2})[-/\.](\d{1,2})[-/\.](\d{2,4})\b/);
    if (dateMatch) {
      let day = parseInt(dateMatch[1], 10);
      let month = parseInt(dateMatch[2], 10);
      let year = parseInt(dateMatch[3], 10);
      if (year < 100) year += 2000;
      if (day > 12 && month <= 12) {
        // correct
      } else if (month > 12 && day <= 12) {
        const tmp = day; day = month; month = tmp;
      }
      if (month >= 1 && month <= 12 && day >= 1 && day <= 31 && year >= 2020 && year <= 2030) {
        detectedDate = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      }
    }

    const timeMatch = cleanText.match(/\b([01]?[0-9]|2[0-3])[:.]([0-5][0-9])(?:[:.][0-5][0-9])?\b/);
    if (timeMatch) {
      detectedTime = `${String(timeMatch[1]).padStart(2, '0')}:${String(timeMatch[2]).padStart(2, '0')}`;
    }

    // 5. Payment Method
    let detectedMethod = 'QRIS';
    if (/qris|gopay|ovo|dana|shopeepay|linkaja/i.test(cleanText)) {
      if (/gopay/i.test(cleanText)) detectedMethod = 'GoPay';
      else if (/shopee/i.test(cleanText)) detectedMethod = 'ShopeePay';
      else detectedMethod = 'QRIS';
    } else if (/tunai|cash|kembalian|uang\s*muka/i.test(cleanText)) {
      detectedMethod = 'Tunai';
    } else if (/kartu\s*kredit|credit\s*card|visa|mastercard/i.test(cleanText)) {
      detectedMethod = 'Kartu Kredit';
    } else if (/transfer|debit|bca|mandiri|bri|bni/i.test(cleanText)) {
      detectedMethod = 'Bank Transfer';
    }

    // 6. Extract Line Items
    const items = [];
    const lineIgnoreRegex = /total|subtotal|kembali|tunai|cash|debit|pajak|tax|ppn|diskon|discount|terima\s*kasih|kasir|struk|member|poin/i;

    for (const line of lines) {
      if (lineIgnoreRegex.test(line)) continue;
      const itemMatch = line.match(/^([a-zA-Z0-9\s&.+/'-]{3,35})\s+(?:(\d+)\s*[xX]\s*)?(?:rp\.?)?\s*([0-9]{1,3}(?:[.,][0-9]{3})+|[0-9]{4,7})$/i);
      if (itemMatch) {
        const name = itemMatch[1].trim();
        const qty = itemMatch[2] ? parseInt(itemMatch[2], 10) : 1;
        const price = parseAmount(itemMatch[3]);
        if (price > 0 && name.length >= 3 && !/^\d+$/.test(name)) {
          items.push({ name, qty: qty || 1, price: Math.round(price / (qty || 1)) });
        }
      }
    }

    return {
      store: detectedStore,
      total: detectedTotal,
      category: detectedCategory,
      date: detectedDate,
      time: detectedTime,
      method: detectedMethod,
      items: items.slice(0, 10),
      rawText: cleanText
    };
  }

  async function runRealOcrScan(imageSrc) {
    saveSuccessMessage = '';
    ocrError = '';
    isScanning = true;
    scanProgress = 10;
    ocrStatusStage = 'Mengoptimalkan kontras & ketajaman foto struk...';
    previewImage = imageSrc;
    isRealOcrResult = true;

    try {
      const processedCanvas = await preprocessImage(imageSrc);
      scanProgress = 25;
      ocrStatusStage = 'Memuat mesin Finora Vision AI...';

      const Tesseract = await loadTesseract();
      if (!Tesseract) {
        throw new Error('Pustaka OCR tidak dapat diinisialisasi.');
      }

      scanProgress = 35;
      ocrStatusStage = 'Mempersiapkan model pengenalan karakter...';

      const targetSource = processedCanvas || imageSrc;
      const ocrResult = await Tesseract.recognize(targetSource, 'ind+eng', {
        logger: (m) => {
          if (m && m.status === 'recognizing text') {
            const pct = Math.round((m.progress || 0) * 100);
            scanProgress = Math.min(88, 35 + Math.round(pct * 0.53));
            ocrStatusStage = `Membaca teks & angka struk (${pct}%)...`;
          } else if (m && m.status === 'loading tesseract core') {
            ocrStatusStage = 'Memuat WebAssembly AI core...';
          } else if (m && m.status === 'loading language traineddata') {
            ocrStatusStage = 'Mengunduh kamus bahasa Indonesia...';
          }
        }
      });

      scanProgress = 92;
      ocrStatusStage = 'Mengekstrak total, nama toko & rincian nota...';

      const rawText = ocrResult?.data?.text || '';
      rawOcrText = rawText;

      const parsed = parseIndonesianReceipt(rawText);

      storeName = parsed?.store || 'Struk Belanja';
      receiptDate = parsed?.date || new Date().toISOString().split('T')[0];
      receiptTime = parsed?.time || new Date().toTimeString().slice(0, 5);
      totalAmount = parsed?.total > 0 ? String(parsed.total) : '';
      category = parsed?.category || 'Belanja';
      paymentMethod = parsed?.method || 'QRIS';
      notes = `Scan Kamera Finora: ${storeName}`;
      itemizedLines = parsed?.items || [];

      scannedReceipt = {
        store: storeName,
        total: Number(totalAmount) || 0,
        category,
        method: paymentMethod,
        notes,
        items: itemizedLines,
        isRealOcr: true
      };

      scanProgress = 100;
      setTimeout(() => {
        isScanning = false;
      }, 350);
    } catch (err) {
      console.error('OCR Error:', err);
      ocrError = 'Gagal memproses struk otomatis. Anda dapat memasukkan data secara manual di bawah.';
      isScanning = false;

      storeName = 'Struk Kamera ' + new Date().toLocaleDateString('id-ID');
      receiptDate = new Date().toISOString().split('T')[0];
      receiptTime = new Date().toTimeString().slice(0, 5);
      totalAmount = '';
      category = 'Makanan & Minuman';
      paymentMethod = 'QRIS';
      itemizedLines = [];
      scannedReceipt = {
        store: storeName,
        total: 0,
        category,
        method: paymentMethod,
        notes: 'Hasil scan kamera (perlu diisi manual)',
        items: [],
        isRealOcr: true
      };
    }
  }

  function runSimulationScan(data) {
    saveSuccessMessage = '';
    ocrError = '';
    isScanning = true;
    scanProgress = 10;
    ocrStatusStage = 'Memuat contoh data struk preset...';
    previewImage = null;
    isRealOcrResult = false;
    rawOcrText = `[Contoh Struk Preset]\n${data.store}\nTotal: Rp ${data.total}\nKategori: ${data.category}\nMetode: ${data.method}`;

    const interval = setInterval(() => {
      scanProgress += 20;
      if (scanProgress >= 100) {
        clearInterval(interval);
        isScanning = false;
        scannedReceipt = data;
        storeName = data.store;
        receiptDate = new Date().toISOString().split('T')[0];
        receiptTime = new Date().toTimeString().slice(0, 5);
        totalAmount = String(data.total);
        category = data.category;
        paymentMethod = data.method;
        notes = data.notes;
        itemizedLines = data.items || [];
      }
    }, 150);
  }

  let isDragging = false;

  function handleDragOver(e) {
    e.preventDefault();
    isDragging = true;
  }

  function handleDragLeave(e) {
    e.preventDefault();
    isDragging = false;
  }

  function handleDrop(e) {
    e.preventDefault();
    isDragging = false;
    const file = e.dataTransfer?.files?.[0];
    if (file) {
      processFile(file);
    }
  }

  function handleFileUpload(e) {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
  }

  function processFile(file) {
    const reader = new FileReader();
    reader.onload = async (event) => {
      const imgUrl = event.target.result;
      await runRealOcrScan(imgUrl);
    };
    reader.readAsDataURL(file);
  }

  async function openLiveCamera() {
    cameraError = '';
    isCameraModalOpen = true;
    try {
      if (mediaStream) {
        mediaStream.getTracks().forEach((t) => t.stop());
      }
      mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: facingMode },
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        }
      });
      if (videoElement) {
        videoElement.srcObject = mediaStream;
        await videoElement.play();
      }
    } catch (err) {
      console.warn('Camera access error:', err);
      cameraError = 'Izin kamera belum aktif atau tidak didukung di peramban ini. Anda bisa menggunakan tombol kamera bawaan HP di bawah ini.';
    }
  }

  function toggleCamera() {
    facingMode = facingMode === 'environment' ? 'user' : 'environment';
    openLiveCamera();
  }

  function closeLiveCamera() {
    if (mediaStream) {
      mediaStream.getTracks().forEach((t) => t.stop());
      mediaStream = null;
    }
    isCameraModalOpen = false;
    cameraError = '';
  }

  async function snapPhoto() {
    if (!videoElement) return;
    isTakingPhoto = true;
    setTimeout(async () => {
      const canvas = document.createElement('canvas');
      canvas.width = videoElement.videoWidth || 1280;
      canvas.height = videoElement.videoHeight || 720;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
      closeLiveCamera();
      isTakingPhoto = false;

      await runRealOcrScan(dataUrl);
    }, 200);
  }

  onDestroy(() => {
    if (mediaStream) {
      mediaStream.getTracks().forEach((t) => t.stop());
    }
  });

  function removeItem(index) {
    itemizedLines = itemizedLines.filter((_, i) => i !== index);
    const newTotal = itemizedLines.reduce((acc, it) => acc + (it.price * it.qty), 0);
    if (newTotal > 0) {
      totalAmount = String(newTotal);
    }
  }

  function handleAddItem() {
    if (!newItemName.trim() || !newItemPrice || Number(newItemPrice) <= 0) return;
    itemizedLines = [
      ...itemizedLines,
      { name: newItemName.trim(), qty: 1, price: Number(newItemPrice) }
    ];
    newItemName = '';
    newItemPrice = '';
    showAddItemInput = false;

    const newTotal = itemizedLines.reduce((acc, it) => acc + (it.price * it.qty), 0);
    if (newTotal > 0) {
      totalAmount = String(newTotal);
    }
  }

  async function handleSaveTransaction() {
    if (!totalAmount || Number(totalAmount) <= 0) return;

    const tx = {
      description: storeName || 'Struk Belanja',
      amount: Number(totalAmount),
      category: category || 'Makanan & Minuman',
      type: 'expense',
      date: receiptDate,
      time: receiptTime,
      payment_method: paymentMethod,
      walletId: targetWalletId,
      notes: notes ? `${notes} (Discan dari Struk)` : 'Hasil scan struk otomatis Finora AI'
    };

    await emitAddTransaction(tx);

    confetti({
      particleCount: 60,
      spread: 70,
      origin: { y: 0.6 }
    });

    saveSuccessMessage = `Transaksi sebesar ${formatCurrency(tx.amount, $currency)} berhasil disimpan dan dipotong dari dompet!`;
    setTimeout(() => {
      saveSuccessMessage = '';
      scannedReceipt = null;
    }, 4500);
  }

  function resetScanner() {
    scannedReceipt = null;
    previewImage = null;
    saveSuccessMessage = '';
  }
</script>

<div class="receipt-scanner-section">
  <!-- Header -->
  <div class="section-header">
    <div class="header-info">
      <div class="title-with-pill">
        <h2>
          <i class="fa-solid fa-receipt gradient-icon"></i>
          Smart Receipt & Nota Scanner
        </h2>
        <span class="ai-badge">
          <i class="fa-solid fa-wand-magic-sparkles"></i> Finora OCR Vision
        </span>
      </div>
      <p class="subtitle">
        Pindai foto struk belanjaan, nota makan, atau tiket SPBU. Data total, toko, dan kategori diekstrak otomatis.
      </p>
    </div>
  </div>

  <!-- Success Toast -->
  {#if saveSuccessMessage}
    <div class="success-banner">
      <i class="fa-solid fa-circle-check"></i>
      <span>{saveSuccessMessage}</span>
    </div>
  {/if}

  <div class="scanner-main-layout">
    <!-- Left: Upload & Scanner Box -->
    <div class="scanner-dropzone-panel">
      <!-- Demo Presets Bar -->
      <div class="preset-header">
        <span>Uji Coba Cepat dengan Contoh Struk:</span>
      </div>
      <div class="demo-receipt-chips">
        {#each sampleReceipts as rec}
          <button
            type="button"
            class="demo-chip"
            disabled={isScanning}
            on:click={() => runSimulationScan(rec)}
          >
            <i class="fa-solid {rec.icon}"></i>
            <span>{rec.label}</span>
          </button>
        {/each}
      </div>

      <!-- File Drop Area -->
      <div
        class="drop-card"
        class:scanning={isScanning}
        class:dragover={isDragging}
        on:dragover={handleDragOver}
        on:dragleave={handleDragLeave}
        on:drop={handleDrop}
        role="region"
        aria-label="Area Unggah Struk"
      >
        {#if isScanning}
          <!-- Laser Scan Effect with Live Dynamic AI Stages -->
          <div class="laser-scanner-overlay">
            <div class="laser-beam" style="top: {scanProgress}%;"></div>
            <div class="scan-status-text">
              <i class="fa-solid fa-spinner fa-spin"></i>
              <div class="scan-status-sub">
                <span class="stage-title">{ocrStatusStage}</span>
                <span class="stage-pct">{scanProgress}%</span>
              </div>
            </div>
          </div>
        {/if}

        {#if previewImage}
          <img src={previewImage} alt="Preview Struk" class="receipt-preview-img" />
        {:else if !isScanning && !scannedReceipt}
          <div class="upload-placeholder">
            <div class="icon-circle upload-circle">
              <i class="fa-solid fa-camera-retro"></i>
            </div>
            <h4>Ambil Foto Struk atau Unggah Gambar</h4>
            <p>Pindai struk kasir, nota belanja, atau tiket SPBU untuk pencatatan otomatis</p>
            
            <div class="scan-button-group">
              <!-- Option 1: Live Interactive Camera Viewfinder -->
              <button type="button" class="btn-scan-action primary-camera" on:click={openLiveCamera}>
                <div class="btn-action-icon"><i class="fa-solid fa-camera"></i></div>
                <div class="btn-action-text">
                  <span class="btn-main-title">Buka Kamera Langsung</span>
                  <span class="btn-sub-desc">Jepret struk dengan viewfinder</span>
                </div>
              </button>

              <div class="action-secondary-row">
                <!-- Option 2: Direct Native Mobile Camera -->
                <label class="btn-scan-action secondary-native">
                  <i class="fa-solid fa-camera-rotate"></i>
                  <span>Kamera Bawaan HP</span>
                  <input type="file" accept="image/*" capture="environment" on:change={handleFileUpload} />
                </label>

                <!-- Option 3: Choose from Gallery/Files -->
                <label class="btn-scan-action secondary-gallery">
                  <i class="fa-solid fa-images"></i>
                  <span>Pilih dari Galeri</span>
                  <input type="file" accept="image/*" on:change={handleFileUpload} />
                </label>
              </div>
            </div>
          </div>
        {:else if scannedReceipt}
          <div class="receipt-visual-paper">
            <div class="paper-top-zigzag"></div>
            <div class="paper-content">
              <div class="paper-header">
                <i class="fa-solid fa-store"></i>
                <h5>{storeName}</h5>
                <span class="paper-date">{receiptDate} • {receiptTime}</span>
              </div>
              <div class="paper-divider"></div>
              <div class="paper-items-list">
                {#each itemizedLines as item, idx}
                  <div class="paper-item-row">
                    <span>{item.qty}x {item.name}</span>
                    <div class="item-right-wrap">
                      <span>{formatCurrency(item.price * item.qty, $currency)}</span>
                      <button
                        type="button"
                        class="btn-remove-line"
                        title="Hapus baris ini"
                        on:click={() => removeItem(idx)}
                      >
                        <i class="fa-solid fa-xmark"></i>
                      </button>
                    </div>
                  </div>
                {/each}

                <!-- Add item inline trigger -->
                <div class="paper-add-item-box">
                  {#if !showAddItemInput}
                    <button type="button" class="btn-add-item-trigger" on:click={() => (showAddItemInput = true)}>
                      <i class="fa-solid fa-plus"></i> Tambah Barang Manual
                    </button>
                  {:else}
                    <div class="add-item-inline-form">
                      <input type="text" placeholder="Nama barang..." bind:value={newItemName} class="input-item-sm" />
                      <input type="number" placeholder="Rp..." bind:value={newItemPrice} class="input-item-sm price" />
                      <button type="button" class="btn-item-action save" on:click={handleAddItem}>Simpan</button>
                      <button type="button" class="btn-item-action cancel" on:click={() => (showAddItemInput = false)}>Batal</button>
                    </div>
                  {/if}
                </div>
              </div>
              <div class="paper-divider"></div>
              <div class="paper-total-row">
                <span>TOTAL AKHIR</span>
                <span class="paper-total-amt">{formatCurrency(totalAmount || 0, $currency)}</span>
              </div>
            </div>
            <div class="paper-bottom-zigzag"></div>
          </div>
        {/if}
      </div>
    </div>

    <!-- Right: Extracted Result Form -->
    <div class="scanner-result-panel">
      {#if scannedReceipt}
        <div class="result-card">
          <div class="result-header">
            <div class="result-title">
              <i class="fa-solid fa-check-to-slot text-emerald"></i>
              <div>
                <div class="title-badge-flex">
                  <h3>Hasil Ekstraksi OCR</h3>
                  {#if isRealOcrResult}
                    <span class="ocr-tag real"><i class="fa-solid fa-microchip"></i> Vision AI Real</span>
                  {:else}
                    <span class="ocr-tag preset"><i class="fa-solid fa-flask"></i> Contoh Preset</span>
                  {/if}
                </div>
                <p>Verifikasi data di bawah sebelum disimpan ke pembukuan</p>
              </div>
            </div>
            <button class="btn-text-reset" on:click={resetScanner} title="Scan Struk Lain">
              <i class="fa-solid fa-rotate-left"></i>
              <span>Scan Ulang</span>
            </button>
          </div>

          {#if ocrError}
            <div class="ocr-error-banner">
              <i class="fa-solid fa-triangle-exclamation"></i>
              <span>{ocrError}</span>
            </div>
          {/if}

          {#if !totalAmount || Number(totalAmount) <= 0}
            <div class="ocr-hint-banner">
              <i class="fa-solid fa-circle-info"></i>
              <span>Nominal total belum terbaca sempurna dari foto struk. Silakan masukkan nominal total pada kolom Total Belanja di bawah.</span>
            </div>
          {/if}

          {#if rawOcrText}
            <div class="raw-ocr-section">
              <button type="button" class="btn-toggle-raw-ocr" on:click={() => (showRawOcr = !showRawOcr)}>
                <div class="btn-raw-left">
                  <i class="fa-solid fa-file-lines"></i>
                  <span>{showRawOcr ? 'Sembunyikan Teks Struk Asli' : 'Lihat Teks Struk Asli (OCR Raw)'}</span>
                </div>
                <i class="fa-solid {showRawOcr ? 'fa-chevron-up' : 'fa-chevron-down'}"></i>
              </button>
              {#if showRawOcr}
                <div class="raw-ocr-content">
                  <div class="raw-ocr-tip">
                    <i class="fa-solid fa-lightbulb"></i>
                    Teks di bawah dibaca langsung dari kamera / foto Anda. Anda dapat memeriksa angka atau nama asli struk.
                  </div>
                  <pre class="raw-text-view">{rawOcrText}</pre>
                </div>
              {/if}
            </div>
          {/if}

          {#if saveSuccessMessage}
            <div class="success-banner">
              <i class="fa-solid fa-circle-check"></i>
              <span>{saveSuccessMessage}</span>
            </div>
          {/if}

          <div class="form-body">
            <!-- Merchant -->
            <div class="form-group">
              <label for="sc-store">Nama Merchant / Toko</label>
              <input id="sc-store" type="text" class="input-field" bind:value={storeName} />
            </div>

            <!-- Total Amount -->
            <div class="form-group mt-2">
              <label for="sc-total">Total Belanjaan</label>
              <div class="amount-field-wrapper">
                <span class="prefix">Rp</span>
                <input
                  id="sc-total"
                  type="number"
                  class="input-field total-input"
                  bind:value={totalAmount}
                />
              </div>
            </div>

            <!-- Date & Category -->
            <div class="grid-2-col mt-2">
              <div class="form-group">
                <label for="sc-date">Tanggal Transaksi</label>
                <input id="sc-date" type="date" class="input-field" bind:value={receiptDate} />
              </div>
              <div class="form-group">
                <label for="sc-cat">Kategori Pengeluaran</label>
                <select id="sc-cat" class="input-field select-field" bind:value={category}>
                  <option value="Makanan & Minuman">Makanan & Minuman</option>
                  <option value="Belanja">Belanja & Supermarket</option>
                  <option value="Transportasi">Transportasi & Bensin</option>
                  <option value="Kesehatan">Kesehatan & Medis</option>
                  <option value="Hiburan">Hiburan & Rekreasi</option>
                  <option value="Lainnya">Lainnya</option>
                </select>
              </div>
            </div>

            <!-- Wallet Deduct & Payment Method -->
            <div class="grid-2-col mt-2">
              <div class="form-group">
                <label for="sc-wallet">Potong dari Rekening</label>
                <select id="sc-wallet" class="input-field select-field" bind:value={targetWalletId}>
                  {#each $wallets as w}
                    <option value={w.id}>{w.name} ({formatCurrency(w.balance, $currency)})</option>
                  {/each}
                </select>
              </div>
              <div class="form-group">
                <label for="sc-method">Metode Pembayaran</label>
                <select id="sc-method" class="input-field select-field" bind:value={paymentMethod}>
                  <option value="QRIS">QRIS</option>
                  <option value="Tunai">Tunai / Cash</option>
                  <option value="Bank Transfer">Bank Transfer</option>
                  <option value="GoPay">GoPay</option>
                  <option value="ShopeePay">ShopeePay</option>
                  <option value="Kartu Kredit">Kartu Kredit</option>
                </select>
              </div>
            </div>

            <!-- Notes -->
            <div class="form-group mt-2">
              <label for="sc-notes">Catatan Transaksi</label>
              <input id="sc-notes" type="text" class="input-field" bind:value={notes} />
            </div>

            <!-- Submit Button -->
            <button class="btn-save-transaction" on:click={handleSaveTransaction}>
              <i class="fa-solid fa-floppy-disk"></i>
              <span>Simpan ke Transaksi & Potong Saldo</span>
            </button>
          </div>
        </div>
      {:else}
        <!-- Empty Prompt -->
        <div class="empty-prompt-box">
          <div class="icon-circle purple-box">
            <i class="fa-solid fa-camera-retro"></i>
          </div>
          <h4>Belum Ada Struk yang Dipindai</h4>
          <p>
            Pilih salah satu contoh struk di sebelah kiri atau unggah foto bukti belanja Anda. Finora AI akan memproses struk secara instan.
          </p>
        </div>
      {/if}
    </div>
  </div>

  <!-- In-App Camera Viewfinder Modal -->
  {#if isCameraModalOpen}
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <div class="camera-modal-backdrop" on:click={closeLiveCamera} role="dialog" aria-modal="true" tabindex="-1">
      <!-- svelte-ignore a11y_click_events_have_key_events -->
      <div class="camera-modal-card" on:click|stopPropagation role="document">
        <!-- Top bar -->
        <div class="cam-top-bar">
          <div class="cam-title">
            <i class="fa-solid fa-camera"></i>
            <span>Pindai Struk Kamera</span>
          </div>
          <div class="cam-actions">
            <button type="button" class="cam-icon-btn" on:click={toggleCamera} title="Putar Kamera Depan / Belakang">
              <i class="fa-solid fa-camera-rotate"></i>
            </button>
            <button type="button" class="cam-icon-btn close" on:click={closeLiveCamera} title="Tutup">
              <i class="fa-solid fa-xmark"></i>
            </button>
          </div>
        </div>

        <!-- Video Viewfinder Container -->
        <div class="cam-viewfinder-container">
          {#if cameraError}
            <div class="cam-error-state">
              <i class="fa-solid fa-triangle-exclamation"></i>
              <p>{cameraError}</p>
              <label class="btn-native-fallback">
                <i class="fa-solid fa-camera"></i>
                <span>Gunakan Kamera Bawaan HP</span>
                <input type="file" accept="image/*" capture="environment" on:change={(e) => { closeLiveCamera(); handleFileUpload(e); }} />
              </label>
            </div>
          {:else}
            <!-- svelte-ignore a11y_media_has_caption -->
            <video
              bind:this={videoElement}
              playsinline
              autoplay
              muted
              class="cam-video-stream"
              class:flash-shutter={isTakingPhoto}
            ></video>

            <!-- Scanning Guide Overlay Grid -->
            <div class="cam-guide-overlay">
              <div class="guide-corner top-left"></div>
              <div class="guide-corner top-right"></div>
              <div class="guide-corner bottom-left"></div>
              <div class="guide-corner bottom-right"></div>
              <div class="cam-laser-guide"></div>
              <span class="guide-text">Arahkan struk dalam bingkai</span>
            </div>
          {/if}
        </div>

        <!-- Camera Bottom Controls -->
        {#if !cameraError}
          <div class="cam-bottom-bar">
            <!-- Native Camera Alternative -->
            <label class="cam-alt-pill" title="Buka Kamera Bawaan HP">
              <i class="fa-solid fa-mobile-screen"></i>
              <span>Kamera HP</span>
              <input type="file" accept="image/*" capture="environment" on:change={(e) => { closeLiveCamera(); handleFileUpload(e); }} />
            </label>

            <!-- Main Shutter Button -->
            <button type="button" class="cam-shutter-btn" on:click={snapPhoto} title="Jepret Foto">
              <div class="shutter-inner-ring">
                <div class="shutter-core"></div>
              </div>
            </button>

            <!-- Pick from Gallery Alternative -->
            <label class="cam-alt-pill" title="Pilih dari Galeri">
              <i class="fa-solid fa-image"></i>
              <span>Galeri</span>
              <input type="file" accept="image/*" on:change={(e) => { closeLiveCamera(); handleFileUpload(e); }} />
            </label>
          </div>
        {/if}
      </div>
    </div>
  {/if}
</div>

<style>
  .receipt-scanner-section {
    margin-bottom: 2.2rem;
  }

  .section-header {
    margin-bottom: 1.25rem;
  }

  .title-with-pill {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    flex-wrap: wrap;
  }

  .title-with-pill h2 {
    font-size: 1.35rem;
    font-weight: 700;
    color: var(--text-primary);
    display: flex;
    align-items: center;
    gap: 0.6rem;
    margin: 0;
  }

  .gradient-icon {
    background: linear-gradient(135deg, #a855f7, #ec4899);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
  }

  .ai-badge {
    font-size: 0.75rem;
    padding: 0.25rem 0.65rem;
    border-radius: 999px;
    background: rgba(168, 85, 247, 0.15);
    color: #c084fc;
    font-weight: 600;
    border: 1px solid rgba(168, 85, 247, 0.3);
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
  }

  .subtitle {
    font-size: 0.88rem;
    color: var(--text-secondary);
    margin: 0.35rem 0 0 0;
  }

  .success-banner {
    background: rgba(16, 185, 129, 0.15);
    border: 1px solid rgba(16, 185, 129, 0.35);
    color: #10b981;
    padding: 0.85rem 1.2rem;
    border-radius: 12px;
    margin-bottom: 1.25rem;
    display: flex;
    align-items: center;
    gap: 0.65rem;
    font-weight: 600;
    animation: fadeIn 0.2s ease;
  }

  .scanner-main-layout {
    display: grid;
    grid-template-columns: 1fr 1.15fr;
    gap: 1.5rem;
  }

  /* Left Panel */
  .scanner-dropzone-panel {
    display: flex;
    flex-direction: column;
    gap: 0.85rem;
  }

  .preset-header span {
    font-size: 0.8rem;
    font-weight: 600;
    color: var(--text-secondary);
  }

  .demo-receipt-chips {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
  }

  .demo-chip {
    background: var(--bg-card);
    border: 1px solid var(--border-color);
    color: var(--text-primary);
    font-size: 0.78rem;
    font-weight: 600;
    padding: 0.4rem 0.75rem;
    border-radius: 999px;
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    gap: 0.45rem;
    transition: all 0.15s ease;
  }

  .demo-chip:hover {
    background: rgba(168, 85, 247, 0.12);
    border-color: rgba(168, 85, 247, 0.35);
    color: #c084fc;
    transform: translateY(-1px);
  }

  .drop-card {
    background: var(--bg-card);
    border: 2px dashed var(--border-color);
    border-radius: 20px;
    min-height: 380px;
    display: flex;
    align-items: center;
    justify-content: center;
    position: relative;
    overflow: hidden;
    padding: 1.5rem;
  }

  .drop-card.scanning {
    border-color: #a855f7;
  }

  .drop-card.dragover {
    border-color: #a855f7 !important;
    background: rgba(168, 85, 247, 0.15) !important;
    box-shadow: 0 0 25px rgba(168, 85, 247, 0.3) !important;
  }

  .success-banner {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 12px 16px;
    background: rgba(16, 185, 129, 0.15);
    border: 1px solid rgba(16, 185, 129, 0.35);
    border-radius: 12px;
    color: #34d399;
    font-size: 0.9rem;
    font-weight: 600;
    margin-bottom: 16px;
  }

  .item-right-wrap {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .btn-remove-line {
    background: transparent;
    border: none;
    color: #ef4444;
    cursor: pointer;
    opacity: 0.6;
    padding: 2px 4px;
    border-radius: 4px;
    transition: all 0.15s ease;
  }

  .btn-remove-line:hover {
    opacity: 1;
    background: rgba(239, 68, 68, 0.15);
  }

  .upload-placeholder {
    text-align: center;
    display: flex;
    flex-direction: column;
    align-items: center;
    max-width: 320px;
  }

  .upload-circle {
    width: 60px;
    height: 60px;
    border-radius: 18px;
    background: rgba(168, 85, 247, 0.12);
    color: #c084fc;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.6rem;
    margin-bottom: 1rem;
  }

  .upload-placeholder h4 {
    font-size: 1.05rem;
    font-weight: 700;
    color: var(--text-primary);
    margin: 0 0 0.35rem 0;
  }

  .upload-placeholder p {
    font-size: 0.8rem;
    color: var(--text-secondary);
    margin: 0 0 1.25rem 0;
  }

  .scan-button-group {
    display: flex;
    flex-direction: column;
    gap: 10px;
    width: 100%;
  }

  .btn-scan-action {
    display: flex;
    align-items: center;
    border-radius: 14px;
    cursor: pointer;
    transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
    border: none;
    font-family: inherit;
    position: relative;
    user-select: none;
  }

  .btn-scan-action input[type="file"] {
    display: none;
  }

  .btn-scan-action.primary-camera {
    background: linear-gradient(135deg, #6366f1 0%, #a855f7 100%);
    color: #ffffff;
    padding: 12px 18px;
    gap: 14px;
    box-shadow: 0 6px 20px rgba(99, 102, 241, 0.35);
  }

  .btn-scan-action.primary-camera:hover {
    transform: translateY(-2px);
    box-shadow: 0 10px 25px rgba(99, 102, 241, 0.5);
  }

  .btn-action-icon {
    width: 40px;
    height: 40px;
    border-radius: 10px;
    background: rgba(255, 255, 255, 0.2);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.2rem;
    flex-shrink: 0;
  }

  .btn-action-text {
    display: flex;
    flex-direction: column;
    text-align: left;
  }

  .btn-main-title {
    font-weight: 700;
    font-size: 0.95rem;
    line-height: 1.2;
  }

  .btn-sub-desc {
    font-size: 0.72rem;
    opacity: 0.85;
  }

  .action-secondary-row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px;
    width: 100%;
  }

  .btn-scan-action.secondary-native,
  .btn-scan-action.secondary-gallery {
    background: rgba(255, 255, 255, 0.06);
    border: 1px solid var(--border-glass, rgba(255, 255, 255, 0.12));
    color: var(--text-main, #ffffff);
    padding: 10px 10px;
    font-size: 0.8rem;
    font-weight: 600;
    justify-content: center;
    gap: 8px;
  }

  .btn-scan-action.secondary-native:hover,
  .btn-scan-action.secondary-gallery:hover {
    background: rgba(255, 255, 255, 0.12);
    border-color: rgba(99, 102, 241, 0.4);
    transform: translateY(-1px);
  }

  /* Camera Viewfinder Modal */
  .camera-modal-backdrop {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.88);
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    z-index: 99999;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 16px;
  }

  .camera-modal-card {
    background: #090d16;
    border: 1px solid rgba(255, 255, 255, 0.16);
    border-radius: 24px;
    width: 100%;
    max-width: 520px;
    overflow: hidden;
    box-shadow: 0 25px 60px rgba(0, 0, 0, 0.8);
    display: flex;
    flex-direction: column;
  }

  .cam-top-bar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 14px 18px;
    background: rgba(255, 255, 255, 0.04);
    border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  }

  .cam-title {
    display: flex;
    align-items: center;
    gap: 8px;
    font-weight: 700;
    font-size: 0.95rem;
    color: #ffffff;
  }

  .cam-actions {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .cam-icon-btn {
    width: 36px;
    height: 36px;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.08);
    border: 1px solid rgba(255, 255, 255, 0.12);
    color: #cbd5e1;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    font-size: 0.9rem;
    transition: all 0.2s ease;
  }

  .cam-icon-btn:hover {
    background: rgba(255, 255, 255, 0.18);
    color: #ffffff;
  }

  .cam-icon-btn.close:hover {
    background: rgba(239, 68, 68, 0.3);
    color: #f87171;
  }

  .cam-viewfinder-container {
    position: relative;
    width: 100%;
    aspect-ratio: 3 / 4;
    max-height: 60vh;
    background: #000000;
    overflow: hidden;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .cam-video-stream {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .cam-video-stream.flash-shutter {
    animation: cameraFlash 0.25s ease-out;
  }

  @keyframes cameraFlash {
    0% { filter: brightness(3); }
    100% { filter: brightness(1); }
  }

  .cam-guide-overlay {
    position: absolute;
    inset: 18px;
    border: 1px dashed rgba(255, 255, 255, 0.25);
    border-radius: 16px;
    pointer-events: none;
    display: flex;
    align-items: flex-end;
    justify-content: center;
    padding-bottom: 12px;
  }

  .guide-corner {
    position: absolute;
    width: 24px;
    height: 24px;
    border-color: #6366f1;
    border-style: solid;
  }

  .guide-corner.top-left { top: 0; left: 0; border-width: 3px 0 0 3px; border-top-left-radius: 12px; }
  .guide-corner.top-right { top: 0; right: 0; border-width: 3px 3px 0 0; border-top-right-radius: 12px; }
  .guide-corner.bottom-left { bottom: 0; left: 0; border-width: 0 0 3px 3px; border-bottom-left-radius: 12px; }
  .guide-corner.bottom-right { bottom: 0; right: 0; border-width: 0 3px 3px 0; border-bottom-right-radius: 12px; }

  .cam-laser-guide {
    position: absolute;
    left: 0;
    right: 0;
    height: 2px;
    background: linear-gradient(90deg, transparent, #ec4899, #6366f1, transparent);
    box-shadow: 0 0 10px #ec4899;
    animation: laserScan 2.5s ease-in-out infinite;
  }

  @keyframes laserScan {
    0%, 100% { top: 10%; }
    50% { top: 90%; }
  }

  .guide-text {
    background: rgba(0, 0, 0, 0.65);
    backdrop-filter: blur(8px);
    color: #ffffff;
    font-size: 0.75rem;
    font-weight: 600;
    padding: 4px 12px;
    border-radius: 99px;
    border: 1px solid rgba(255, 255, 255, 0.15);
  }

  .cam-bottom-bar {
    display: flex;
    align-items: center;
    justify-content: space-around;
    padding: 16px 20px;
    background: #090d16;
  }

  .cam-alt-pill {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
    font-size: 0.72rem;
    color: #94a3b8;
    cursor: pointer;
  }

  .cam-alt-pill input[type="file"] {
    display: none;
  }

  .cam-alt-pill:hover {
    color: #ffffff;
  }

  .cam-shutter-btn {
    width: 68px;
    height: 68px;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.1);
    border: 3px solid #ffffff;
    padding: 4px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: transform 0.15s ease;
  }

  .cam-shutter-btn:active {
    transform: scale(0.92);
  }

  .shutter-inner-ring {
    width: 100%;
    height: 100%;
    border-radius: 50%;
    background: #ffffff;
    box-shadow: 0 0 16px rgba(255, 255, 255, 0.5);
  }

  .cam-error-state {
    padding: 24px;
    text-align: center;
    color: #f87171;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 12px;
  }

  .cam-error-state i {
    font-size: 2.2rem;
  }

  .cam-error-state p {
    font-size: 0.85rem;
    color: #cbd5e1;
    max-width: 320px;
    margin: 0;
  }

  .btn-native-fallback {
    background: #6366f1;
    color: #ffffff;
    padding: 10px 18px;
    border-radius: 12px;
    font-size: 0.85rem;
    font-weight: 700;
    display: inline-flex;
    align-items: center;
    gap: 8px;
    cursor: pointer;
  }

  .btn-native-fallback input[type="file"] {
    display: none;
  }

  /* Laser Scan Animation */
  .laser-scanner-overlay {
    position: absolute;
    inset: 0;
    background: rgba(15, 23, 42, 0.88);
    backdrop-filter: blur(6px);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    z-index: 10;
  }

  .laser-beam {
    position: absolute;
    left: 0;
    right: 0;
    height: 3px;
    background: linear-gradient(90deg, transparent, #ec4899, #a855f7, transparent);
    box-shadow: 0 0 16px 4px rgba(236, 72, 153, 0.8);
    transition: top 0.15s linear;
  }

  .scan-status-text {
    display: flex;
    align-items: center;
    gap: 0.6rem;
    color: #ffffff;
    font-weight: 600;
    font-size: 0.95rem;
  }

  /* Paper Struk Representation */
  .receipt-visual-paper {
    width: 100%;
    max-width: 320px;
    background: #f8fafc;
    color: #1e293b;
    border-radius: 8px;
    box-shadow: 0 12px 30px rgba(0, 0, 0, 0.35);
    font-family: 'Courier New', Courier, monospace;
    padding: 1.2rem;
    animation: fadeIn 0.3s ease;
  }

  .paper-header {
    text-align: center;
  }

  .paper-header i {
    font-size: 1.4rem;
    color: #64748b;
    margin-bottom: 0.25rem;
  }

  .paper-header h5 {
    font-size: 0.95rem;
    font-weight: 800;
    margin: 0;
    text-transform: uppercase;
  }

  .paper-date {
    font-size: 0.72rem;
    color: #64748b;
  }

  .paper-divider {
    border-bottom: 1px dashed #cbd5e1;
    margin: 0.8rem 0;
  }

  .paper-items-list {
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
    font-size: 0.76rem;
  }

  .paper-item-row {
    display: flex;
    justify-content: space-between;
  }

  .paper-total-row {
    display: flex;
    justify-content: space-between;
    font-weight: 800;
    font-size: 0.95rem;
  }

  .paper-total-amt {
    color: #0f172a;
  }

  .receipt-preview-img {
    max-width: 100%;
    max-height: 350px;
    object-fit: contain;
    border-radius: 12px;
  }

  /* Right Panel: Result Form */
  .result-card {
    background: var(--bg-card);
    border: 1px solid var(--border-color);
    border-radius: 20px;
    padding: 1.5rem;
  }

  .result-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 1.25rem;
  }

  .result-title {
    display: flex;
    align-items: center;
    gap: 0.8rem;
  }

  .result-title i {
    font-size: 1.5rem;
  }

  .result-title h3 {
    font-size: 1.1rem;
    font-weight: 700;
    color: var(--text-primary);
    margin: 0;
  }

  .result-title p {
    font-size: 0.78rem;
    color: var(--text-secondary);
    margin: 0.15rem 0 0 0;
  }

  .btn-text-reset {
    background: var(--bg-hover);
    border: 1px solid var(--border-color);
    color: var(--text-secondary);
    font-size: 0.78rem;
    font-weight: 600;
    padding: 0.35rem 0.7rem;
    border-radius: 8px;
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
  }

  .btn-text-reset:hover {
    color: var(--text-primary);
  }

  .form-group label {
    display: block;
    font-size: 0.8rem;
    font-weight: 600;
    color: var(--text-secondary);
    margin-bottom: 0.35rem;
  }

  .input-field {
    width: 100%;
    padding: 0.65rem 0.9rem;
    font-size: 0.88rem;
    background: var(--bg-main);
    border: 1px solid var(--border-color);
    border-radius: 10px;
    color: var(--text-primary);
    outline: none;
    box-sizing: border-box;
  }

  .input-field:focus {
    border-color: #a855f7;
  }

  .amount-field-wrapper {
    position: relative;
    display: flex;
    align-items: center;
  }

  .prefix {
    position: absolute;
    left: 1rem;
    font-weight: 700;
    color: var(--text-muted);
    font-size: 1rem;
  }

  .total-input {
    padding-left: 2.8rem;
    font-size: 1.25rem;
    font-weight: 800;
    color: #10b981;
  }

  .grid-2-col {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0.75rem;
  }

  .mt-2 {
    margin-top: 0.85rem;
  }

  .btn-save-transaction {
    width: 100%;
    background: linear-gradient(135deg, #10b981 0%, #059669 100%);
    color: #ffffff;
    font-size: 0.92rem;
    font-weight: 700;
    padding: 0.8rem;
    border-radius: 12px;
    border: none;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.6rem;
    margin-top: 1.25rem;
    box-shadow: 0 4px 14px rgba(16, 185, 129, 0.3);
    transition: transform 0.15s ease;
  }

  .btn-save-transaction:hover {
    transform: translateY(-1px);
    box-shadow: 0 6px 18px rgba(16, 185, 129, 0.4);
  }

  /* Empty Prompt */
  .empty-prompt-box {
    background: var(--bg-card);
    border: 1px dashed var(--border-color);
    border-radius: 20px;
    padding: 3.5rem 1.5rem;
    text-align: center;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 100%;
    box-sizing: border-box;
  }

  .purple-box {
    width: 54px;
    height: 54px;
    border-radius: 16px;
    background: rgba(168, 85, 247, 0.12);
    color: #c084fc;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.4rem;
    margin-bottom: 0.9rem;
  }

  .empty-prompt-box h4 {
    font-size: 1.1rem;
    color: var(--text-primary);
    margin: 0 0 0.35rem 0;
  }

  .empty-prompt-box p {
    font-size: 0.85rem;
    color: var(--text-secondary);
    max-width: 380px;
    margin: 0;
    line-height: 1.45;
  }

  /* Scan Status Dynamic Subtext */
  .scan-status-sub {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
  }

  .stage-title {
    font-size: 0.95rem;
    font-weight: 700;
    color: #ffffff;
  }

  .stage-pct {
    font-size: 0.8rem;
    color: #c084fc;
    font-weight: 800;
  }

  /* Paper Add Item Manual */
  .paper-add-item-box {
    margin: 8px 0;
  }

  .btn-add-item-trigger {
    background: transparent;
    border: 1px dashed #cbd5e1;
    color: #64748b;
    font-size: 0.75rem;
    font-weight: 600;
    padding: 4px 8px;
    border-radius: 6px;
    width: 100%;
    cursor: pointer;
    transition: all 0.15s ease;
  }

  .btn-add-item-trigger:hover {
    border-color: #6366f1;
    color: #6366f1;
    background: rgba(99, 102, 241, 0.05);
  }

  .add-item-inline-form {
    display: flex;
    gap: 4px;
    align-items: center;
    flex-wrap: wrap;
    background: #f1f5f9;
    padding: 6px;
    border-radius: 8px;
  }

  .input-item-sm {
    flex: 1;
    min-width: 90px;
    padding: 4px 6px;
    font-size: 0.75rem;
    border: 1px solid #cbd5e1;
    border-radius: 4px;
    background: #ffffff;
    color: #0f172a;
  }

  .input-item-sm.price {
    max-width: 70px;
  }

  .btn-item-action {
    padding: 4px 8px;
    font-size: 0.72rem;
    font-weight: 700;
    border-radius: 4px;
    border: none;
    cursor: pointer;
  }

  .btn-item-action.save {
    background: #10b981;
    color: #ffffff;
  }

  .btn-item-action.cancel {
    background: #e2e8f0;
    color: #475569;
  }

  /* Title Badge */
  .title-badge-flex {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
  }

  .ocr-tag {
    font-size: 0.72rem;
    font-weight: 700;
    padding: 2px 8px;
    border-radius: 999px;
    display: inline-flex;
    align-items: center;
    gap: 4px;
  }

  .ocr-tag.real {
    background: rgba(16, 185, 129, 0.15);
    color: #10b981;
    border: 1px solid rgba(16, 185, 129, 0.35);
  }

  .ocr-tag.preset {
    background: rgba(168, 85, 247, 0.15);
    color: #c084fc;
    border: 1px solid rgba(168, 85, 247, 0.35);
  }

  /* Banners */
  .ocr-error-banner {
    background: rgba(239, 68, 68, 0.12);
    border: 1px solid rgba(239, 68, 68, 0.3);
    color: #f87171;
    padding: 10px 14px;
    border-radius: 10px;
    font-size: 0.85rem;
    font-weight: 600;
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 12px;
  }

  .ocr-hint-banner {
    background: rgba(245, 158, 11, 0.12);
    border: 1px solid rgba(245, 158, 11, 0.35);
    color: #fbbf24;
    padding: 10px 14px;
    border-radius: 10px;
    font-size: 0.82rem;
    font-weight: 600;
    display: flex;
    align-items: flex-start;
    gap: 8px;
    margin-bottom: 12px;
    line-height: 1.4;
  }

  /* Raw OCR Accordion */
  .raw-ocr-section {
    margin-bottom: 14px;
    border: 1px solid var(--border-color);
    border-radius: 12px;
    overflow: hidden;
    background: rgba(255, 255, 255, 0.02);
  }

  .btn-toggle-raw-ocr {
    width: 100%;
    padding: 10px 14px;
    background: transparent;
    border: none;
    display: flex;
    align-items: center;
    justify-content: space-between;
    color: var(--text-secondary);
    font-size: 0.8rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.15s ease;
  }

  .btn-toggle-raw-ocr:hover {
    color: var(--text-primary);
    background: rgba(255, 255, 255, 0.04);
  }

  .btn-raw-left {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .raw-ocr-content {
    padding: 12px 14px;
    border-top: 1px solid var(--border-color);
    background: var(--bg-main);
  }

  .raw-ocr-tip {
    font-size: 0.75rem;
    color: var(--text-muted, #94a3b8);
    margin-bottom: 8px;
    display: flex;
    align-items: flex-start;
    gap: 6px;
    line-height: 1.35;
  }

  .raw-text-view {
    font-family: 'JetBrains Mono', 'Fira Code', monospace;
    font-size: 0.75rem;
    color: var(--text-secondary);
    background: rgba(0, 0, 0, 0.35);
    padding: 10px;
    border-radius: 8px;
    max-height: 160px;
    overflow-y: auto;
    white-space: pre-wrap;
    word-break: break-word;
    margin: 0;
    border: 1px solid var(--border-color);
  }

  .text-emerald {
    color: #10b981;
  }

  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(4px); }
    to { opacity: 1; transform: translateY(0); }
  }

  @media (max-width: 820px) {
    .scanner-main-layout {
      grid-template-columns: 1fr;
    }
  }

  :global([data-theme="light"]) .drop-card {
    background: #ffffff !important;
    border-color: rgba(148, 163, 184, 0.35) !important;
  }

  :global([data-theme="light"]) .result-card {
    background: #ffffff !important;
    border-color: rgba(148, 163, 184, 0.3) !important;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.05) !important;
  }

  :global([data-theme="light"]) .receipt-visual-paper {
    background: #ffffff !important;
    color: #0f172a !important;
    border: 1px solid rgba(148, 163, 184, 0.35) !important;
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.08) !important;
  }

  :global([data-theme="light"]) .preset-chip {
    background: #ffffff !important;
    border-color: rgba(148, 163, 184, 0.35) !important;
    color: #334155 !important;
  }

  :global([data-theme="light"]) .preset-chip:hover {
    background: #f1f5f9 !important;
    color: #0f172a !important;
  }

  :global([data-theme="light"]) .result-card .input-field {
    background: #ffffff !important;
    color: #0f172a !important;
    border-color: rgba(148, 163, 184, 0.35) !important;
  }

  :global([data-theme="light"]) .form-group label {
    color: #334155 !important;
  }

  :global([data-theme="light"]) .result-title h3 {
    color: #0f172a !important;
  }

  :global([data-theme="light"]) .result-title p {
    color: #64748b !important;
  }

  :global([data-theme="light"]) .btn-text-reset {
    background: #f1f5f9 !important;
    color: #475569 !important;
    border-color: rgba(148, 163, 184, 0.35) !important;
  }
</style>
