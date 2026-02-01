from flask import Flask, jsonify, request
from flask_cors import CORS
import yfinance as yf
from nse_tickers import NSE_TICKERS
import pandas as pd
import logging

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

logging.basicConfig(level=logging.INFO)

@app.route('/health', methods=['GET'])
def health_check():
    return jsonify({"status": "ok"}), 200

@app.route('/api/stocks', methods=['GET'])
def get_stocks():
    """Returns the list of supported NSE tickers."""
    return jsonify(NSE_TICKERS)

@app.route('/api/stock/<symbol>', methods=['GET'])
def get_stock_data(symbol):
    """
    Fetches stock data for the given symbol using yfinance.
    Query params:
    - period: 1d, 5d, 1mo, 3mo, 6mo, 1y, 2y, 5y, 10y, ytd, max (default: 1y)
    - interval: 1m, 2m, 5m, 15m, 30m, 60m, 90m, 1h, 1d, 5d, 1wk, 1mo, 3mo (default: 1d)
    """
    period = request.args.get('period', '1y')
    interval = request.args.get('interval', '1d')
    
    try:
        app.logger.info(f"Fetching data for {symbol}, period={period}, interval={interval}")
        stock = yf.Ticker(symbol)
        
        # Get historical data
        hist = stock.history(period=period, interval=interval)
        
        if hist.empty:
            return jsonify({"error": "No data found for symbol"}), 404
            
        # Get Current info (fast track, use history last row for price if info is slow)
        # Note: yfinance info can be slow. Let's try to get minimal info.
        info = stock.info
        current_price = info.get('currentPrice') or info.get('regularMarketPrice')
        
        if not current_price and not hist.empty:
             current_price = hist['Close'].iloc[-1]
             
        # Process history for chart
        hist.index = hist.index.strftime('%Y-%m-%d %H:%M:%S')
        history_data = []
        for index, row in hist.iterrows():
            history_data.append({
                "date": index,
                "open": row['Open'],
                "high": row['High'],
                "low": row['Low'],
                "close": row['Close'],
                "volume": row['Volume']
            })
            
        response_data = {
            "symbol": symbol,
            "info": {
                "shortName": info.get('shortName', symbol),
                "longName": info.get('longName', symbol),
                "currency": info.get('currency', 'INR'),
                "currentPrice": current_price,
                "sector": info.get('sector', 'Unknown'),
                "dayHigh": info.get('dayHigh'),
                "dayLow": info.get('dayLow'),
                "fiftyTwoWeekHigh": info.get('fiftyTwoWeekHigh'),
                "fiftyTwoWeekLow": info.get('fiftyTwoWeekLow'),
            },
            "history": history_data
        }
        return jsonify(response_data)
        
    except Exception as e:
        app.logger.error(f"Error serving request: {e}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/stock/<symbol>/financials', methods=['GET'])
def get_stock_financials(symbol):
    """
    Fetches financial statements for the given symbol.
    """
    try:
        app.logger.info(f"Fetching financials for {symbol}")
        stock = yf.Ticker(symbol)
        
        # Helper to convert DataFrame to dict
        def clean_df(df):
            if df is None or df.empty:
                return {}
            # Fill NaN with 0 or None for JSON serialization
            df = df.fillna(0)
            # Convert columns (Dates) to string
            df.columns = df.columns.astype(str)
            return df.to_dict()

        financials = {
            "balance_sheet": clean_df(stock.balance_sheet),
            "income_statement": clean_df(stock.income_stmt),
            "cash_flow": clean_df(stock.cashflow)
        }
        
        return jsonify(financials)

    except Exception as e:
        app.logger.error(f"Error serving financials: {e}")
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True, port=5000)
