# ==========================================================================
# FINCATAT AUTO - TELEGRAM / WHATSAPP BOT PARSER SERVER
# ==========================================================================
# File ini digunakan jika Anda ingin mengirim pesan transaksi via HP (Telegram / WA)
# dan otomatis memasukkannya ke dalam perincian keuangan Anda.
#
# Prasyarat: 
# 1. Install python library: pip install python-telegram-bot
# 2. Masukkan Bot Token dari @BotFather di Telegram

import sys
import json
import re
from datetime import datetime

# Regex Smart Parser versi Python
def parse_text_transaction(text):
    text_lower = text.lower()
    
    # 1. Payment Method
    method = "QRIS"
    if "cash" in text_lower or "tunai" in text_lower:
        method = "Tunai"
    elif any(k in text_lower for k in ["transfer", "bca", "mandiri", "bri", "bni"]):
        method = "Bank Transfer"
    elif "gopay" in text_lower:
        method = "GoPay"
    elif "ovo" in text_lower:
        method = "OVO"
    elif "shopeepay" in text_lower or "spay" in text_lower:
        method = "ShopeePay"

    # 2. Extract Amount
    amount = 0
    found_str = ""
    match = re.search(r'(\d+([.,]\d+)?)\s*(rb|k|jt|juta|ribu)?', text, re.IGNORECASE)
    if match:
        found_str = match.group(0)
        num = float(match.group(1).replace(',', '.'))
        unit = (match.group(3) or '').lower()
        
        if unit in ['rb', 'k', 'ribu']:
            num *= 1000
        elif unit in ['jt', 'juta']:
            num *= 1000000
        elif num < 100 and not unit:
            num *= 1000
            
        amount = int(num)

    # 3. Income vs Expense
    tx_type = "expense"
    category = "Pengeluaran Lainnya"
    if any(k in text_lower for k in ["gaji", "terima", "dapat", "bonus", "freelance", "proyek", "omset"]):
        tx_type = "income"
        category = "Gaji & Uang Masuk"
    else:
        if any(k in text_lower for k in ["kopi", "makan", "minum", "nasi", "bakso", "resto", "cafe"]):
            category = "Makanan & Minuman"
        elif any(k in text_lower for k in ["bensin", "shell", "pertamax", "gojek", "grab", "parkir", "tol"]):
            category = "Transportasi & Bensin"
        elif any(k in text_lower for k in ["belanja", "baju", "alfa", "indo", "market"]):
            category = "Belanja & Groceries"
        elif any(k in text_lower for k in ["listrik", "pln", "wifi", "indihome", "pulsa"]):
            category = "Tagihan, Listrik & Wi-Fi"

    # Clean Title
    title = re.sub(r'qris|cash|tunai|transfer|bca|mandiri|bri|gopay|ovo|shopeepay', '', text, flags=re.IGNORECASE)
    title = re.sub(re.escape(found_str), '', title, flags=re.IGNORECASE).strip()
    if not title:
        title = category

    return {
        "id": f"tx_bot_{int(datetime.now().timestamp())}",
        "title": title.capitalize(),
        "amount": amount,
        "type": tx_type,
        "category": category,
        "method": method,
        "date": datetime.now().isoformat()
    }

# Contoh simulasi test run
if __name__ == "__main__":
    test_input = "Beli makan siang 35rb QRIS"
    parsed = parse_text_transaction(test_input)
    print("=== FinCatat Telegram Bot Parser Test ===")
    print(f"Input HP : '{test_input}'")
    print(f"Hasil    : {json.dumps(parsed, indent=2)}")
