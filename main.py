import yfinance as yf
import pandas as pd
import numpy as np
from nselib import capital_market
from rich.console import Console
from rich.table import Table
from rich.progress import Progress, SpinnerColumn, TextColumn, BarColumn, TaskProgressColumn
from rich.panel import Panel
from rich import print as rprint
import datetime
import os
import plotext as plt

# --- CONFIGURATION ---
DATA_DIR = "./data"
if not os.path.exists(DATA_DIR):
    os.makedirs(DATA_DIR)

console = Console()

class FinanceTracker:
    def __init__(self):
        self.stocks_data = pd.DataFrame()
        self.symbols = []
        self.ticker_map = {} # Maps symbol to ticker (e.g., RELIANCE -> RELIANCE.NS)

    def load_symbols(self, count=50):
        """Fetches the list of equity symbols from NSE."""
        with console.status("[bold blue]Fetching stock list from NSE...") as status:
            try:
                equity_df = capital_market.equity_list()
                self.symbols = equity_df['SYMBOL'].tolist()[:count]
                self.ticker_map = {sym: f"{sym}.NS" for sym in self.symbols}
                console.log(f"Successfully loaded {len(self.symbols)} symbols.")
            except Exception as e:
                console.log(f"[bold red]Error fetching NSE list: {e}")
                # Fallback list
                self.symbols = ["RELIANCE", "TCS", "HDFCBANK", "INFY", "ICICIBANK"]
                self.ticker_map = {sym: f"{sym}.NS" for sym in self.symbols}

    def download_data(self, start_date, end_date):
        """Downloads historical data for the loaded symbols."""
        tickers = list(self.ticker_map.values())
        
        with Progress(
            SpinnerColumn(),
            TextColumn("[progress.description]{task.description}"),
            BarColumn(),
            TaskProgressColumn(),
            console=console
        ) as progress:
            task = progress.add_task(f"Downloading {len(tickers)} stocks...", total=1)
            try:
                # yfinance can handle multiple tickers at once
                data = yf.download(tickers, start=start_date, end=end_date, group_by='ticker', progress=False)
                
                # Consolidate Close/Adj Close into a single DataFrame
                price_data = {}
                for symbol, ticker in self.ticker_map.items():
                    if ticker in data.columns.levels[0]:
                        ticker_df = data[ticker]
                        # Prefer Adj Close, fallback to Close
                        if 'Adj Close' in ticker_df.columns:
                            price_data[symbol] = ticker_df['Adj Close']
                        elif 'Close' in ticker_df.columns:
                            price_data[symbol] = ticker_df['Close']
                
                self.stocks_data = pd.DataFrame(price_data)
                progress.update(task, advance=1)
                
                if self.stocks_data.empty:
                    console.print("[bold red]No data found for the selected period.[/]")
                else:
                    console.print(f"[bold green]Successfully downloaded data for {len(self.stocks_data.columns)} stocks.[/]")
            except Exception as e:
                console.print(f"[bold red]Error downloading data: {e}[/]")

    def get_analytics(self, symbol):
        """Calculates advanced metrics for a single symbol."""
        series = self.stocks_data[symbol].dropna()
        if series.empty: return None
        
        sma20 = series.rolling(window=20).mean().iloc[-1]
        sma50 = series.rolling(window=50).mean().iloc[-1]
        current = series.iloc[-1]
        
        return {
            "SMA20": sma20,
            "SMA50": sma50,
            "Signal": "BUY" if current > sma20 > sma50 else "SELL" if current < sma20 < sma50 else "NEUTRAL"
        }

    def analyze(self):
        """Performs performance analysis on the downloaded data."""
        if self.stocks_data.empty:
            console.print("[bold yellow]No data available to analyze. Please 'load' data first.[/]")
            return

        # 1. Performance Calculation
        first_valid = self.stocks_data.apply(lambda x: x.dropna().iloc[0] if not x.dropna().empty else np.nan)
        last_valid = self.stocks_data.apply(lambda x: x.dropna().iloc[-1] if not x.dropna().empty else np.nan)
        
        returns = ((last_valid - first_valid) / first_valid) * 100
        returns = returns.dropna().sort_values(ascending=False)

        # 2. Volatility (Annualized Std Dev)
        daily_returns = self.stocks_data.pct_change()
        volatility = daily_returns.std() * np.sqrt(252) * 100
        volatility = volatility.reindex(returns.index)

        # 3. Create Table
        table = Table(title="MARKET PERFORMANCE SUMMARY", header_style="bold magenta")
        table.add_column("Rank", justify="right", style="cyan")
        table.add_column("Symbol", style="bold green")
        table.add_column("Return (%)", justify="right")
        table.add_column("Volatility (%)", justify="right", style="yellow")
        table.add_column("Signal", justify="center")

        for i, (symbol, ret) in enumerate(returns.items()):
            if i >= 10 and i < len(returns) - 10: continue
            
            vol = volatility[symbol]
            analytics = self.get_analytics(symbol)
            signal = analytics["Signal"] if analytics else "N/A"
            sig_color = "bright_green" if signal == "BUY" else "bright_red" if signal == "SELL" else "white"
            
            color = "green" if ret > 0 else "red"
            
            if i < 7 or i >= len(returns) - 7:
                table.add_row(
                    str(i+1),
                    symbol,
                    f"[{color}]{ret:.2f}%[/]",
                    f"{vol:.2f}%",
                    f"[{sig_color}]{signal}[/]"
                )
            elif i == 7:
                table.add_row("...", "...", "...", "...", "...")

        # Stats Panel
        stats_text = f"Top Gainer: [bold green]{returns.index[0]} ({returns.iloc[0]:.2f}%)[/]\n"
        stats_text += f"Biggest Loser: [bold red]{returns.index[-1]} ({returns.iloc[-1]:.2f}%)[/]\n"
        stats_text += f"Market Avg: [bold cyan]{returns.mean():.2f}%[/]\n"
        stats_text += f"Avg Volatility: [bold yellow]{volatility.mean():.2f}%[/]"
        
        console.print(Panel(stats_text, title="Market Stats", border_style="blue"))
        console.print(table)

    def plot_symbol(self, symbol):
        """Plots the price history of a specific symbol in the terminal."""
        if symbol not in self.stocks_data.columns:
            console.print(f"[bold red]Symbol {symbol} not found in loaded data.[/]")
            return
        
        prices = self.stocks_data[symbol].dropna()
        if prices.empty:
            console.print(f"[bold yellow]No price data for {symbol}[/]")
            return

        plt.clf()
        plt.plot(prices.values, label=symbol)
        plt.title(f"Price History: {symbol}")
        plt.xlabel("Days")
        plt.ylabel("Price (Adj Close)")
        plt.grid(True)
        plt.show()

def show_help():
    help_panel = """
[bold cyan]Available Commands:[/bold cyan]
- [bold green]load [count][/bold green]      : Fetch symbol list from NSE (default 50)
- [bold green]download [YYYY-MM-DD] [YYYY-MM-DD][/bold green] : Get historical data
- [bold green]analyze[/bold green]          : Detailed performance analytics
- [bold green]plot [SYMBOL][/bold green]    : Show terminal chart for a stock
- [bold green]help[/bold green]            : Show this menu
- [bold red]exit[/bold red]            : Quit the tracker
    """
    console.print(Panel(help_panel, title="HELP MENU", border_style="cyan"))

def main():
    tracker = FinanceTracker()
    
    console.print(Panel.fit("🚀 [bold green]NSE PORTFOLIO TRACKER PRO[/bold green]\n[italic blue]Smart Analytics for the Indian Market[/italic blue]", border_style="bright_magenta"))
    
    show_help()

    while True:
        try:
            cmd_input = console.input("[bold blue]>>> [/bold blue]").strip().lower()
            if not cmd_input: continue
            
            parts = cmd_input.split()
            cmd = parts[0]

            if cmd == "exit":
                rprint("[bold red]Exiting tracker. Happy Trading![/]")
                break
            
            elif cmd == "help":
                show_help()

            elif cmd == "load":
                count = int(parts[1]) if len(parts) > 1 else 50
                tracker.load_symbols(count)

            elif cmd == "download":
                if len(parts) < 3:
                    # Default: Last year
                    end = datetime.date.today()
                    start = end - datetime.timedelta(days=365)
                    console.print(f"[italic]No dates provided. defaulting to {start} to {end}[/]")
                else:
                    start, end = parts[1], parts[2]
                tracker.download_data(start, end)

            elif cmd == "analyze":
                tracker.analyze()

            elif cmd == "plot":
                if len(parts) < 2:
                    console.print("[bold red]Usage: plot SYMBOL[/]")
                    continue
                tracker.plot_symbol(parts[1].upper())

            else:
                console.print(f"[bold red]Unknown command: {cmd}. Type 'help' for options.[/]")
        
        except KeyboardInterrupt:
            rprint("\n[bold red]Interrupted. Type 'exit' to quit properly.[/]")
        except Exception as e:
            console.print(f"[bold red]Error:[/] {e}")

if __name__ == "__main__":
    main()