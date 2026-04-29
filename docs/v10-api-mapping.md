# KLineChart v9 → v10 API Mapping

Verified against `klinecharts@10.0.0-beta1` (`node_modules/klinecharts/dist/index.d.ts`).

## Configuration

| v9 | v10 | Status |
|---|---|---|
| `init(dom, { customApi: ... })` | `init(dom, { formatter: ... })` | ✅ Confirmed — `Options.formatter?: Partial<Formatter>` |
| `formatDate(dateTimeFormat, timestamp, format, type)` | `formatDate({ dateTimeFormat, timestamp, template, type })` | ✅ Confirmed — `FormatDateParams` object |
| `FormatDateType` enum | `"tooltip" \| "crosshair" \| "xAxis"` | ✅ Confirmed — string union type |

## Events

| v9 | v10 | Status |
|---|---|---|
| `ActionType.OnTooltipIconClick` | `"onCandleTooltipFeatureClick"` | ✅ Confirmed — `ActionType` is string union |
| `TooltipIconPosition` | `TooltipFeaturePosition` | ✅ Confirmed — `"left" \| "middle" \| "right"` |

## Data Loading

| v9 | v10 | Status |
|---|---|---|
| `widget.applyNewData(data, more)` | removed | ✅ Confirmed — use `setDataLoader` |
| `widget.applyMoreData(data, more)` | removed | ✅ Confirmed — use `setDataLoader` |
| `widget.updateData(data)` | removed | ✅ Confirmed — use `setDataLoader` |
| `widget.loadMore(callback)` | removed | ✅ Confirmed — use `setDataLoader` |
| — | `widget.setDataLoader(dataLoader: DataLoader)` | ✅ Confirmed |
| — | `DataLoader = { getBars, subscribeBar?, unsubscribeBar? }` | ✅ Confirmed |

## Methods

| v9 | v10 | Status |
|---|---|---|
| `widget.setPriceVolumePrecision(p, v)` | `widget.setSymbol({ pricePrecision, volumePrecision })` | ✅ Confirmed — `PickPartial<SymbolInfo, "pricePrecision" \| "volumePrecision">` |
| `widget.getIndicatorByPaneId(paneId, name)` | `widget.getIndicators({ paneId, name })` | ✅ Confirmed — returns `Indicator[]` |
| `widget.removeIndicator(paneId, name)` | `widget.removeIndicator({ paneId, name })` | ✅ Confirmed — `IndicatorFilter` object |
| `widget.removeOverlay({ groupId })` | `widget.removeOverlay({ groupId })` | ✅ Confirmed — `OverlayFilter` object |

## Tooltip / Indicator Styles

| v9 | v10 | Status |
|---|---|---|
| `indicator.tooltip.icons` | `indicator.tooltip.features` | ✅ Confirmed |
| `createTooltipDataSource` returns `{ icons }` | returns `{ features, legends }` | ✅ Confirmed — `IndicatorTooltipData` |

## Types

| v9 | v10 | Status |
|---|---|---|
| `Period` (our local) | v10 `Period = { type: PeriodType, span: number }` | ⚠️ Name collision — renamed our type to `PeriodOptions` |
| `SymbolInfo` (our local) | v10 `SymbolInfo = { ticker, pricePrecision, volumePrecision, [key: string]: unknown }` | ⚠️ Name collision — renamed our type to `SymbolOptions` |
| `PeriodType` | `"second" \| "minute" \| "hour" \| "day" \| "week" \| "month" \| "year"` | ✅ Confirmed |

## Extensions

| v9 | v10 | Status |
|---|---|---|
| `utils.drawArc`, `drawCircle`, etc. | removed | ✅ No usage in `src/extension/` |
| `utils.getLinearSlopeIntercept` | still exists | ✅ Used in `fibonacciSpiral.ts`, `arrow.ts` |
| `utils.getLinearYFromCoordinates` | still exists | ✅ Used in `extension/utils.ts` |
