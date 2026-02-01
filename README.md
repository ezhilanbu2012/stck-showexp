# 🚀 Portfolio Tracker Pro

A high-performance trading engine and financial dashboard for the Indian Stock Market (NSE). Built with Python, Rich, and soon featuring a powerful Web GUI.

## ✨ Features

- **Automated Data Fetching**: Seamless integration with NSE and Yahoo Finance.
- **Advanced Analytics**:
  - Annualized Volatility.
  - SMA (20/50/200) Crossovers.
  - Automated BUY/SELL/NEUTRAL signals.
- **Terminal Charts**: Visual price history directly in the console.
- **Smart Data Handling**: Handles MultiIndex data frames and adjusts for corporate actions.

## 🛠 Usage

### Prerequisites
- Python 3.10+
- Virtual Environment

### Installation
```bash
# Clone the repository
git clone <repo-url>
cd fin

# Install dependencies
./.venv/bin/pip install -r requirements.txt
```

./.venv/bin/python3 main.py
```

### Running the Web App
```bash
./.venv/bin/streamlit run app.py --server.headless true --server.port 8501
- `plot [symbol]` - Render a price chart in the terminal.

## 🚀 Roadmap
- [ ] **Web Dashboard**: Interactive React-based UI.
- [ ] **Indicator Suite**: RSI, MACD, Bollinger Bands.
- [ ] **Portfolio Management**: Save and track multiple user portfolios.
- [ ] **Backtesting Engine**: Test trading strategies on historical data.

---
*Disclaimer: This software is for educational purposes only. Always consult a professional before making financial decisions.*
