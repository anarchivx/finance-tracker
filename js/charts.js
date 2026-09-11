/* ==========================================================================
   FINCATAT AUTO - CHART.JS ENGINE
   ========================================================================== */

class ChartEngine {
    constructor() {
        this.categoryChart = null;
        this.trendChart = null;
    }

    init() {
        // Will initialize charts when data is rendered
    }

    updateCategoryChart(transactions, isDark = true) {
        const ctx = document.getElementById('categoryChart')?.getContext('2d');
        const emptyNotice = document.getElementById('emptyCatChartNotice');
        const chartCanvas = document.getElementById('categoryChart');

        if (!ctx) return;

        // Filter only expense transactions
        const expenses = transactions.filter(t => t.type === 'expense');

        if (expenses.length === 0) {
            if (this.categoryChart) this.categoryChart.destroy();
            chartCanvas.style.display = 'none';
            if (emptyNotice) emptyNotice.style.display = 'flex';
            return;
        }

        chartCanvas.style.display = 'block';
        if (emptyNotice) emptyNotice.style.display = 'none';

        // Group by category
        const categoryMap = {};
        expenses.forEach(t => {
            categoryMap[t.category] = (categoryMap[t.category] || 0) + t.amount;
        });

        const labels = Object.keys(categoryMap);
        const data = Object.values(categoryMap);

        // Vibrant Color Palette
        const palette = [
            '#f59e0b', '#3b82f6', '#ec4899', '#ef4444', 
            '#8b5cf6', '#06b6d4', '#10b981', '#64748b'
        ];

        const textColor = isDark ? '#f8fafc' : '#0f172a';

        if (this.categoryChart) {
            this.categoryChart.data.labels = labels;
            this.categoryChart.data.datasets[0].data = data;
            this.categoryChart.options.plugins.legend.labels.color = textColor;
            this.categoryChart.update();
        } else {
            this.categoryChart = new Chart(ctx, {
                type: 'doughnut',
                data: {
                    labels: labels,
                    datasets: [{
                        data: data,
                        backgroundColor: palette.slice(0, labels.length),
                        borderWidth: 2,
                        borderColor: isDark ? '#171f31' : '#ffffff',
                        hoverOffset: 6
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            position: 'right',
                            labels: {
                                color: textColor,
                                font: { family: 'Plus Jakarta Sans', size: 12, weight: '600' },
                                padding: 14
                            }
                        },
                        tooltip: {
                            callbacks: {
                                label: function(context) {
                                    const val = context.raw || 0;
                                    const formatted = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(val);
                                    return ` ${context.label}: ${formatted}`;
                                }
                            }
                        }
                    },
                    cutout: '70%'
                }
            });
        }
    }

    updateTrendChart(transactions, isDark = true) {
        const ctx = document.getElementById('trendChart')?.getContext('2d');
        const emptyNotice = document.getElementById('emptyTrendChartNotice');
        const chartCanvas = document.getElementById('trendChart');

        if (!ctx) return;

        if (transactions.length === 0) {
            if (this.trendChart) this.trendChart.destroy();
            chartCanvas.style.display = 'none';
            if (emptyNotice) emptyNotice.style.display = 'flex';
            return;
        }

        chartCanvas.style.display = 'block';
        if (emptyNotice) emptyNotice.style.display = 'none';

        // Generate last 7 days array
        const days = [];
        const incomePerDay = {};
        const expensePerDay = {};

        for (let i = 6; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            const dateStr = d.toISOString().split('T')[0];
            const displayLabel = d.toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric', month: 'short' });
            days.push({ key: dateStr, label: displayLabel });
            incomePerDay[dateStr] = 0;
            expensePerDay[dateStr] = 0;
        }

        transactions.forEach(t => {
            const txDateKey = new Date(t.date).toISOString().split('T')[0];
            if (incomePerDay.hasOwnProperty(txDateKey)) {
                if (t.type === 'income') {
                    incomePerDay[txDateKey] += t.amount;
                } else {
                    expensePerDay[txDateKey] += t.amount;
                }
            }
        });

        const labels = days.map(d => d.label);
        const incomeData = days.map(d => incomePerDay[d.key]);
        const expenseData = days.map(d => expensePerDay[d.key]);

        const textColor = isDark ? '#94a3b8' : '#475569';
        const gridColor = isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)';

        if (this.trendChart) {
            this.trendChart.data.labels = labels;
            this.trendChart.data.datasets[0].data = incomeData;
            this.trendChart.data.datasets[1].data = expenseData;
            this.trendChart.options.scales.x.ticks.color = textColor;
            this.trendChart.options.scales.y.ticks.color = textColor;
            this.trendChart.options.scales.x.grid.color = gridColor;
            this.trendChart.options.scales.y.grid.color = gridColor;
            this.trendChart.update();
        } else {
            this.trendChart = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: labels,
                    datasets: [
                        {
                            label: 'Pemasukan',
                            data: incomeData,
                            backgroundColor: '#10b981',
                            borderRadius: 6
                        },
                        {
                            label: 'Pengeluaran',
                            data: expenseData,
                            backgroundColor: '#ef4444',
                            borderRadius: 6
                        }
                    ]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            position: 'top',
                            labels: {
                                color: textColor,
                                font: { family: 'Plus Jakarta Sans', size: 12, weight: '600' }
                            }
                        },
                        tooltip: {
                            callbacks: {
                                label: function(context) {
                                    const val = context.raw || 0;
                                    const formatted = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(val);
                                    return ` ${context.dataset.label}: ${formatted}`;
                                }
                            }
                        }
                    },
                    scales: {
                        x: {
                            ticks: { color: textColor, font: { family: 'Plus Jakarta Sans', size: 11 } },
                            grid: { color: gridColor }
                        },
                        y: {
                            ticks: { 
                                color: textColor, 
                                font: { family: 'Plus Jakarta Sans', size: 11 },
                                callback: function(val) {
                                    if (val >= 1000000) return (val/1000000) + 'jt';
                                    if (val >= 1000) return (val/1000) + 'rb';
                                    return val;
                                }
                            },
                            grid: { color: gridColor }
                        }
                    }
                }
            });
        }
    }
}

window.chartEngine = new ChartEngine();
