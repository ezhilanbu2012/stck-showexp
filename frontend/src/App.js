const { useState, useEffect, useRef } = React;

// --- Components ---

const Controls = ({ period, setPeriod }) => {
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

const FinancialTable = ({ data, title }) => {
    if (!data || Object.keys(data).length === 0) return <div style={{ padding: 20, textAlign: 'center', color: '#888' }}>No Data Available</div>;

    // Data keys are dates usually
    const dates = Object.keys(data).sort().reverse();
    // Rows are the keys in the first date object (assuming structure consistency)
    // Actually yfinance returns dict of dicts: { "Date": { "Row": Val } } or { "Row": { "Date": Val } }
    // Let's inspect structure. Based on server conversion: { "row_name": { "date": val, "date2": val } }

    const rows = Object.keys(data);
    const firstRow = data[rows[0]];
    const availableDates = Object.keys(firstRow).sort().reverse();

    return (
        <div className="table-container">
            <table>
                <thead>
                    <tr>
                        <th>{title} Breakdown</th>
                        {availableDates.map(date => (
                            <th key={date}>{new Date(date).toLocaleDateString()}</th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {rows.map(row => (
                        <tr key={row}>
                            <td>{row}</td>
                            {availableDates.map(date => (
                                <td key={`${row}-${date}`}>
                                    {data[row][date] ? data[row][date].toLocaleString() : '-'}
                                </td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

const Financials = ({ symbol }) => {
    const [financials, setFinancials] = useState(null);
    const [loading, setLoading] = useState(false);
    const [activeTab, setActiveTab] = useState('income_statement'); // balance_sheet, cash_flow, income_statement

    useEffect(() => {
        if (!symbol) return;
        setLoading(true);
        axios.get(`http://127.0.0.1:5000/api/stock/${symbol}/financials`)
            .then(res => {
                setFinancials(res.data);
                setLoading(false);
            })
            .catch(err => {
                console.error(err);
                setLoading(false);
            });
    }, [symbol]);

    if (loading) return <div className="spinner"></div>;
    if (!financials) return null;

    return (
        <div className="financials-section">
            <div className="financials-tabs">
                <button
                    className={`tab-btn ${activeTab === 'income_statement' ? 'active' : ''}`}
                    onClick={() => setActiveTab('income_statement')}
                >
                    Income Statement
                </button>
                <button
                    className={`tab-btn ${activeTab === 'balance_sheet' ? 'active' : ''}`}
                    onClick={() => setActiveTab('balance_sheet')}
                >
                    Balance Sheet
                </button>
                <button
                    className={`tab-btn ${activeTab === 'cash_flow' ? 'active' : ''}`}
                    onClick={() => setActiveTab('cash_flow')}
                >
                    Cash Flow
                </button>
            </div>

            {activeTab === 'income_statement' && <FinancialTable data={financials.income_statement} title="Income Statement" />}
            {activeTab === 'balance_sheet' && <FinancialTable data={financials.balance_sheet} title="Balance Sheet" />}
            {activeTab === 'cash_flow' && <FinancialTable data={financials.cash_flow} title="Cash Flow" />}
        </div>
    );
};

const App = () => {
    const [stocks, setStocks] = useState([]);
    const [selectedStock, setSelectedStock] = useState(null); // { label, value }
    const [customStock, setCustomStock] = useState('');
    const [stockData, setStockData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [period, setPeriod] = useState('1y');
    const [showFinancials, setShowFinancials] = useState(false);

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
        setShowFinancials(false); // Reset financials view on change
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

    const handleCustomSubmit = (e) => {
        e.preventDefault();
        if (customStock) {
            const symbol = customStock.toUpperCase();
            setSelectedStock({ label: symbol, value: symbol });
            setSearchTerm('');
        }
    };

    const filteredStocks = stocks.filter(s =>
        s.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.value.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Calculate Price Change
    const getPriceChange = () => {
        if (!stockData || !stockData.info || stockData.history.length < 2) return null;

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

                    <form onSubmit={handleCustomSubmit} className="custom-symbol-container">
                        <input
                            type="text"
                            className="custom-input"
                            placeholder="Enter Symbol (e.g., TATASTEEL.NS)"
                            value={customStock}
                            onChange={(e) => setCustomStock(e.target.value)}
                        />
                        <button type="submit" className="go-btn">Go</button>
                    </form>

                    <div className="search-container">
                        <input
                            type="text"
                            className="search-input"
                            placeholder="Filter list..."
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
                                        ₹{stockData.info.currentPrice?.toLocaleString() || stockData.history[stockData.history.length - 1].close.toFixed(2)}
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

                            <div className="financials-btn-container">
                                <button className="view-financials-btn" onClick={() => setShowFinancials(!showFinancials)}>
                                    {showFinancials ? 'Hide Financials' : 'View Financial Statements'}
                                </button>
                            </div>

                            {showFinancials && <Financials symbol={selectedStock.value} />}

                        </React.Fragment>
                    ) : (
                        <div style={{ textAlign: 'center', marginTop: '50px', color: 'var(--text-secondary)' }}>
                            Select a stock or search for a symbol to view details
                        </div>
                    )}
                </main>
            </div>
        </React.Fragment>
    );
};

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);
