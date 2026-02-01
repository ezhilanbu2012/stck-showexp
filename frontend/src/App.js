const { useState, useEffect, useRef } = React;

// --- Components ---

const Controls = ({ period, setPeriod, interval, setInterval }) => {
    const periods = ['1mo', '3mo', '6mo', '1y', '5y', 'max'];

    return (
        <div className="controls">
            {periods.map(p => (
                <button
                    key={p}
                    className={`control-btn ${period === p ? 'active' : ''}`}
                    onClick={() => setPeriod(p)}
                >
                    {p.toUpperCase()}
                </button>
            ))}
        </div>
    );
};

const StockChart = ({ data, period }) => {
    const chartRef = useRef(null);
    const canvasRef = useRef(null);

    useEffect(() => {
        if (!data || !data.history) return;

        const ctx = canvasRef.current.getContext('2d');

        // Destroy previous chart
        if (chartRef.current) {
            chartRef.current.destroy();
        }

        const labels = data.history.map(item => {
            const date = new Date(item.date);
            return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
        });

        const prices = data.history.map(item => item.close);

        // Create Gradient
        const gradient = ctx.createLinearGradient(0, 0, 0, 400);
        gradient.addColorStop(0, 'rgba(0, 210, 255, 0.5)');
        gradient.addColorStop(1, 'rgba(0, 210, 255, 0.0)');

        chartRef.current = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Close Price',
                    data: prices,
                    borderColor: '#00d2ff',
                    backgroundColor: gradient,
                    borderWidth: 2,
                    pointRadius: 0,
                    pointHoverRadius: 4,
                    fill: true,
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        mode: 'index',
                        intersect: false,
                        backgroundColor: 'rgba(15, 32, 39, 0.9)',
                        titleColor: '#fff',
                        bodyColor: '#a0a0a0',
                        borderColor: 'rgba(255,255,255,0.1)',
                        borderWidth: 1
                    }
                },
                scales: {
                    x: {
                        grid: {
                            display: false,
                            drawBorder: false
                        },
                        ticks: {
                            color: '#a0a0a0',
                            maxTicksLimit: 8
                        }
                    },
                    y: {
                        grid: {
                            color: 'rgba(255, 255, 255, 0.05)',
                            drawBorder: false
                        },
                        ticks: {
                            color: '#a0a0a0'
                        }
                    }
                },
                interaction: {
                    mode: 'nearest',
                    axis: 'x',
                    intersect: false
                }
            }
        });

        return () => {
            if (chartRef.current) {
                chartRef.current.destroy();
            }
        };
    }, [data, period]);

    return (
        <div style={{ height: '100%', width: '100%' }}>
            <canvas ref={canvasRef}></canvas>
        </div>
    );
};

const StatCard = ({ label, value, prefix = '' }) => (
    <div className="stat-card">
        <div className="stat-label">{label}</div>
        <div className="stat-value">
            {value ? `${prefix}${typeof value === 'number' ? value.toLocaleString() : value}` : '-'}
        </div>
    </div>
);

const App = () => {
    const [stocks, setStocks] = useState([]);
    const [selectedStock, setSelectedStock] = useState(null); // { label, value }
    const [stockData, setStockData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [period, setPeriod] = useState('1y');

    // Fetch list of stocks on mount
    useEffect(() => {
        axios.get('http://127.0.0.1:5000/api/stocks')
            .then(res => {
                setStocks(res.data);
                // Default to first stock (Reliance usually)
                if (res.data.length > 0) {
                    setSelectedStock(res.data[0]);
                }
            })
            .catch(err => console.error("Error fetching stocks:", err));
    }, []);

    // Fetch stock data when selectedStock or period changes
    useEffect(() => {
        if (!selectedStock) return;

        setLoading(true);
        axios.get(`http://127.0.0.1:5000/api/stock/${selectedStock.value}?period=${period}`)
            .then(res => {
                setStockData(res.data);
                setLoading(false);
            })
            .catch(err => {
                console.error("Error fetching stock data:", err);
                setLoading(false);
            });
    }, [selectedStock, period]);

    const filteredStocks = stocks.filter(s =>
        s.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.value.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Calculate Price Change
    const getPriceChange = () => {
        if (!stockData || !stockData.info.currentPrice || !stockData.info.dayHigh) return null; // Fallback logic needed if 'previousClose' is not available

        // Simple approx using history if previousClose not explicitly sent, 
        // but let's just use open vs close of last candle for now or just rely on visual

        // Better: Calculate change from first point of loaded history to last point for "Period Change"
        // Or Day change. Let's do Day Change if possible, else Period Change.

        // Let's us Period Change for the chart context
        if (stockData.history.length < 2) return 0;

        const first = stockData.history[0].close;
        const last = stockData.history[stockData.history.length - 1].close;
        const change = last - first;
        const percent = (change / first) * 100;

        return { change, percent };
    };

    const priceChange = getPriceChange();

    return (
        <React.Fragment>
            <header className="header">
                <div className="logo">FinTrack</div>
                <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                    NSE Market Tracker
                </div>
            </header>

            <div className="dashboard">
                {/* Sidebar */}
                <aside className="sidebar">
                    <h2>Select Company</h2>
                    <div className="search-container">
                        <input
                            type="text"
                            className="search-input"
                            placeholder="Search companies..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <div className="ticker-list">
                        {filteredStocks.map(stock => (
                            <div
                                key={stock.value}
                                className={`ticker-item ${selectedStock?.value === stock.value ? 'active' : ''}`}
                                onClick={() => setSelectedStock(stock)}
                            >
                                {stock.label}
                            </div>
                        ))}
                    </div>
                </aside>

                {/* Main Content */}
                <main className="main-content">
                    {loading && !stockData ? (
                        <div className="spinner"></div>
                    ) : stockData ? (
                        <React.Fragment>
                            <div className="stock-header">
                                <div className="stock-info">
                                    <h1>{stockData.info.shortName || selectedStock.label}</h1>
                                    <div className="stock-meta">
                                        {stockData.symbol} • {stockData.info.sector} • {stockData.info.currency}
                                    </div>
                                </div>
                                <div className="price-container">
                                    <span className="current-price">
                                        ₹{stockData.info.currentPrice?.toLocaleString()}
                                    </span>
                                    {priceChange && (
                                        <div className={`price-change ${priceChange.change >= 0 ? 'positive' : 'negative'}`}>
                                            {priceChange.change >= 0 ? '+' : ''}{priceChange.change.toFixed(2)} ({priceChange.percent.toFixed(2)}%)
                                            <span style={{ fontSize: '0.8em', marginLeft: '5px', opacity: 0.8 }}>({period})</span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="chart-card">
                                <Controls period={period} setPeriod={setPeriod} />
                                <StockChart data={stockData} period={period} />
                            </div>

                            <div className="stats-grid">
                                <StatCard label="High (Day)" value={stockData.info.dayHigh} prefix="₹" />
                                <StatCard label="Low (Day)" value={stockData.info.dayLow} prefix="₹" />
                                <StatCard label="52W High" value={stockData.info.fiftyTwoWeekHigh} prefix="₹" />
                                <StatCard label="52W Low" value={stockData.info.fiftyTwoWeekLow} prefix="₹" />
                                <StatCard label="Volume" value={stockData.history[stockData.history.length - 1]?.volume} />
                            </div>
                        </React.Fragment>
                    ) : (
                        <div style={{ textAlign: 'center', marginTop: '50px', color: 'var(--text-secondary)' }}>
                            Select a stock to view details
                        </div>
                    )}
                </main>
            </div>
        </React.Fragment>
    );
};

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);
