# k-chart-pro

> Financial chart built out of the box based on [KLineChart v10](https://github.com/klinecharts/KLineChart).

A production-ready financial charting component with built-in UI widgets, indicator management, drawing tools, and real-time data support. Powered by SolidJS and KLineChart v10.

## Features

- **Out-of-the-box UI**: Period bar, drawing toolbar, indicator modal, symbol search, settings, screenshot, and more
- **KLineChart v10**: Latest major version with improved data loader architecture
- **Real-time data**: Built-in WebSocket datafeed support via customizable Datafeed interface
- **Indicators**: MA, EMA, SMA, VOL, MACD, BOLL, KDJ, RSI, etc.
- **Drawing tools**: Line, ray, segment, fibonacci, rect, circle, and more
- **Themes**: Light and dark themes with full CSS customizability
- **Internationalization**: Built-in zh-CN and en-US locales
- **TypeScript**: Full type definitions included

## Install

```bash
npm install k-chart-pro klinecharts
```

## Quick Start

### Basic Usage

```typescript
import { KLineChartPro, DefaultDatafeed } from 'k-chart-pro'
import 'k-chart-pro/dist/klinecharts-pro.css'

const chart = new KLineChartPro({
  container: document.getElementById('chart'),
  symbol: {
    ticker: 'AAPL',
    pricePrecision: 2,
    volumePrecision: 0
  },
  period: { multiplier: 1, timespan: 'day', text: 'D' },
  datafeed: new DefaultDatafeed('YOUR_POLYGON_API_KEY')
})
```

### HTML/Script Tag

```html
<link rel="stylesheet" href="https://unpkg.com/k-chart-pro/dist/klinecharts-pro.css">
<script src="https://unpkg.com/k-chart-pro/dist/klinecharts-pro.umd.js"></script>
<script>
  const chart = new klinechartspro.KLineChartPro({
    container: document.getElementById('chart'),
    symbol: { ticker: 'AAPL', pricePrecision: 2, volumePrecision: 0 },
    period: { multiplier: 1, timespan: 'day', text: 'D' },
    datafeed: new klinechartspro.DefaultDatafeed('YOUR_API_KEY')
  })
</script>
```

## API Reference

### ChartProOptions

```typescript
interface ChartProOptions {
  container: string | HTMLElement
  symbol: SymbolOptions
  period: PeriodOptions
  datafeed: Datafeed
  styles?: DeepPartial<Styles>
  theme?: string
  locale?: string
  timezone?: string
  drawingBarVisible?: boolean
  watermark?: string | Node
  periods?: PeriodOptions[]
  mainIndicators?: string[]
  subIndicators?: string[]
}
```

| Property | Type | Required | Default | Description |
|----------|------|----------|---------|-------------|
| container | `string \| HTMLElement` | Yes | - | Chart container element or element ID |
| symbol | `SymbolOptions` | Yes | - | Initial trading symbol |
| period | `PeriodOptions` | Yes | - | Initial time period |
| datafeed | `Datafeed` | Yes | - | Data provider implementation |
| styles | `DeepPartial<Styles>` | No | `{}` | Chart visual styles |
| theme | `string` | No | `'light'` | UI theme name |
| locale | `string` | No | `'zh-CN'` | UI language |
| timezone | `string` | No | `'Asia/Shanghai'` | Display timezone |
| drawingBarVisible | `boolean` | No | `true` | Show drawing toolbar |
| watermark | `string \| Node` | No | Logo SVG | Chart watermark |
| periods | `PeriodOptions[]` | No | See below | Available time periods |
| mainIndicators | `string[]` | No | `['MA']` | Default main pane indicators |
| subIndicators | `string[]` | No | `['VOL']` | Default sub pane indicators |

### SymbolOptions

```typescript
interface SymbolOptions {
  ticker: string
  name?: string
  shortName?: string
  exchange?: string
  market?: string
  pricePrecision?: number
  volumePrecision?: number
  priceCurrency?: string
  type?: string
  logo?: string
}
```

### PeriodOptions

```typescript
interface PeriodOptions {
  multiplier: number
  timespan: string
  text: string
}
```

Built-in periods:
```typescript
[
  { multiplier: 1, timespan: 'minute', text: '1m' },
  { multiplier: 5, timespan: 'minute', text: '5m' },
  { multiplier: 15, timespan: 'minute', text: '15m' },
  { multiplier: 1, timespan: 'hour', text: '1H' },
  { multiplier: 2, timespan: 'hour', text: '2H' },
  { multiplier: 4, timespan: 'hour', text: '4H' },
  { multiplier: 1, timespan: 'day', text: 'D' },
  { multiplier: 1, timespan: 'week', text: 'W' },
  { multiplier: 1, timespan: 'month', text: 'M' },
  { multiplier: 1, timespan: 'year', text: 'Y' }
]
```

### Datafeed Interface

```typescript
interface Datafeed {
  searchSymbols(search?: string): Promise<SymbolOptions[]>
  getHistoryKLineData(
    symbol: SymbolOptions,
    period: PeriodOptions,
    from: number,
    to: number
  ): Promise<KLineData[]>
  subscribe(
    symbol: SymbolOptions,
    period: PeriodOptions,
    callback: (data: KLineData) => void
  ): void
  unsubscribe(symbol: SymbolOptions, period: PeriodOptions): void
}
```

| Method | Description |
|--------|-------------|
| `searchSymbols` | Search available trading symbols |
| `getHistoryKLineData` | Fetch historical OHLCV data (timestamps in milliseconds) |
| `subscribe` | Subscribe to real-time price updates |
| `unsubscribe` | Unsubscribe from real-time updates |

### ChartPro Methods

```typescript
interface ChartPro {
  setTheme(theme: string): void
  getTheme(): string
  setStyles(styles: DeepPartial<Styles>): void
  getStyles(): Styles
  setLocale(locale: string): void
  getLocale(): string
  setTimezone(timezone: string): void
  getTimezone(): string
  setSymbol(symbol: SymbolOptions): void
  getSymbol(): SymbolOptions
  setPeriod(period: PeriodOptions): void
  getPeriod(): PeriodOptions
}
```

## Custom Datafeed Example

```typescript
import { Datafeed, SymbolOptions, PeriodOptions, DatafeedSubscribeCallback } from 'k-chart-pro'
import { KLineData } from 'klinecharts'

class MyDatafeed implements Datafeed {
  async searchSymbols(search?: string): Promise<SymbolOptions[]> {
    const response = await fetch(`/api/search?q=${search ?? ''}`)
    return response.json()
  }

  async getHistoryKLineData(
    symbol: SymbolOptions,
    period: PeriodOptions,
    from: number,
    to: number
  ): Promise<KLineData[]> {
    const response = await fetch(
      `/api/kline?symbol=${symbol.ticker}&period=${period.text}&from=${from}&to=${to}`
    )
    return response.json()
  }

  subscribe(
    symbol: SymbolOptions,
    period: PeriodOptions,
    callback: DatafeedSubscribeCallback
  ): void {
    this._ws = new WebSocket(`wss://stream.example.com/${symbol.ticker}`)
    this._ws.onmessage = (event) => {
      const data = JSON.parse(event.data)
      callback({
        timestamp: data.t,
        open: data.o,
        high: data.h,
        low: data.l,
        close: data.c,
        volume: data.v
      })
    }
  }

  unsubscribe(symbol: SymbolOptions, period: PeriodOptions): void {
    this._ws?.close()
  }

  private _ws?: WebSocket
}
```

## Theme Customization

```typescript
chart.setTheme('dark')

chart.setStyles({
  candle: {
    bar: {
      upColor: '#26a69a',
      downColor: '#ef5350'
    }
  },
  indicator: {
    tooltip: {
      features: [
        { id: 'visible', position: 'middle' /* ... */ }
      ]
    }
  }
})
```

## Internationalization

```typescript
import { loadLocales } from 'k-chart-pro'

// Load locale data
loadLocales({ 'custom': { /* translations */ } })

// Switch locale
chart.setLocale('en-US')
```

## Architecture

```
k-chart-pro/
├── src/
│   ├── types.ts              # Core TypeScript interfaces
│   ├── KLineChartPro.tsx     # Main wrapper class
│   ├── ChartProComponent.tsx # Core chart component (SolidJS)
│   ├── DefaultDatafeed.ts    # Polygon.io datafeed implementation
│   ├── extension/            # Drawing overlay extensions
│   ├── widget/               # UI widgets (period bar, modals, etc.)
│   ├── component/            # Reusable UI components
│   └── i18n/                 # Localization files
```

### Key Dependencies

- **KLineChart v10**: Core charting engine
- **SolidJS**: Reactive UI framework
- **Vite**: Build tool
- **TypeScript**: Type safety

## KLineChart v10 Migration Notes

This package has been upgraded from KLineChart v9 to v10. Key API changes:

| v9 API | v10 API |
|--------|---------|
| `customApi: { formatDate }` | `formatter: { formatDate }` |
| `applyNewData()` / `applyMoreData()` / `updateData()` / `loadMore()` | `setDataLoader({ getBars, subscribeBar, unsubscribeBar })` |
| `ActionType.OnTooltipIconClick` | `'onCandleTooltipFeatureClick'` |
| `indicator.tooltip.icons` | `indicator.tooltip.features` |
| `setPriceVolumePrecision(p, v)` | `setSymbol({ pricePrecision, volumePrecision })` |
| `getIndicatorByPaneId(paneId, name)` | `getIndicators({ paneId, name })` (returns array) |
| `removeIndicator(paneId, name)` | `removeIndicator({ paneId, name })` |

## License

Apache License 2.0

## Links

- [KLineChart](https://github.com/klinecharts/KLineChart)
- [KLineChart Pro Original](https://github.com/klinecharts/pro)
