/* ==========================================================================
   FINCATAT AUTO - CLOUD & GOOGLE SHEETS SYNC ENGINE
   ========================================================================== */

class CloudSyncEngine {
    constructor() {
        this.webhookUrl = localStorage.getItem('fincatat_gsheet_url') || '';
    }

    setWebhookUrl(url) {
        this.webhookUrl = url;
        localStorage.setItem('fincatat_gsheet_url', url);
    }

    getWebhookUrl() {
        return this.webhookUrl;
    }

    async syncTransactionToGoogleSheet(tx) {
        if (!this.webhookUrl) return { success: false, message: 'URL Google Sheet Webhook belum diatur' };

        try {
            const payload = {
                action: 'add_transaction',
                id: tx.id,
                date: new Date(tx.date).toLocaleString('id-ID'),
                type: tx.type === 'expense' ? 'Pengeluaran' : 'Pemasukan',
                title: tx.title,
                category: tx.category,
                method: tx.method,
                amount: tx.amount
            };

            const response = await fetch(this.webhookUrl, {
                method: 'POST',
                mode: 'no-cors',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            return { success: true, message: 'Tersinkron ke Google Sheets!' };
        } catch (error) {
            console.error('Cloud Sync Error:', error);
            return { success: false, message: 'Gagal sinkron ke cloud: ' + error.message };
        }
    }
}

window.cloudSyncEngine = new CloudSyncEngine();

/* Apps Script Template Snippet for Google Sheets:
function doPost(e) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  var data = JSON.parse(e.postData.contents);
  if (data.action === "add_transaction") {
    sheet.appendRow([data.id, data.date, data.type, data.title, data.category, data.method, data.amount]);
    return ContentService.createTextOutput(JSON.stringify({result: "success"})).setMimeType(ContentService.MimeType.JSON);
  }
}
*/
