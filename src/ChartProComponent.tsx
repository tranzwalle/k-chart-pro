/**
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at

 * http://www.apache.org/licenses/LICENSE-2.0

 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { createSignal, createEffect, onMount, Show, onCleanup, startTransition, Component } from 'solid-js'

import {
  init, dispose, utils, Nullable, Chart, OverlayMode, Styles,
  TooltipFeaturePosition, ActionType, PaneOptions, Indicator, FormatDateType
} from 'klinecharts'

import lodashSet from 'lodash/set'
import lodashClone from 'lodash/cloneDeep'

import { SelectDataSourceItem, Loading } from './component'

import {
  PeriodBar, DrawingBar, IndicatorModal, TimezoneModal, SettingModal,
  ScreenshotModal, IndicatorSettingModal, SymbolSearchModal
} from './widget'

import { translateTimezone } from './widget/timezone-modal/data'

import { SymbolOptions, PeriodOptions, ChartProOptions, ChartPro } from './types'

export interface ChartProComponentProps extends Required<Omit<ChartProOptions, 'container' | 'watermark'>> {
  ref: (chart: ChartPro) => void
  watermark?: string | Node
}

interface PrevSymbolPeriod {
  symbol: SymbolOptions
  period: PeriodOptions
}

function createIndicator (widget: Nullable<Chart>, indicatorName: string, isStack?: boolean, paneOptions?: PaneOptions, calcParams?: Array<any>, styles?: Record<string, any>): Nullable<string> {
  if (indicatorName === 'VOL') {
    paneOptions = { ...paneOptions }
  }
  const maDefaultColors = ['#FF6D00', '#2196F3', '#4CAF50', '#9C27B0']
  return widget?.createIndicator({
    name: indicatorName,
    calcParams,
    styles,
    createTooltipDataSource: ({ indicator, chart, crosshair }) => {
      const icons = []
      const styles = chart.getStyles()
      const tooltipFeatures = styles.indicator.tooltip.features
      if (indicator.visible) {
        icons.push(tooltipFeatures[1])
        icons.push(tooltipFeatures[2])
        icons.push(tooltipFeatures[3])
      } else {
        icons.push(tooltipFeatures[0])
        icons.push(tooltipFeatures[2])
        icons.push(tooltipFeatures[3])
      }
      let legends: any[] = []
      if (indicator.name === 'MA') {
        const dataIndex = crosshair?.dataIndex ?? -1
        const result = indicator.result ?? []
        const data = result[dataIndex] as Record<string, number> | undefined
        const indicatorStyles = (styles.indicator as Record<string, any>) ?? {}
        const maLines = indicatorStyles.MA?.lines
        const lineColors = indicatorStyles.line?.colors ?? []
        legends = indicator.calcParams?.map((param, i) => {
          const color = maLines?.[i]?.color ?? lineColors[i] ?? maDefaultColors[i % maDefaultColors.length]
          const key = `ma${i + 1}`
          const value = data?.[key]
          const text = typeof value === 'number' ? value.toFixed(indicator.precision) : ''
          return {
              title: { text: `MA${param}: `, color },
            value: { text, color }
          }
        }) ?? []
      }
      return {
        name: indicator.shortName ?? indicator.name,
        calcParamsText: Array.isArray(indicator.calcParams) && indicator.calcParams.length > 0
          ? `(${indicator.calcParams.join(', ')})`
          : '',
        features: icons,
        legends
      }
    }
  }, isStack, paneOptions) ?? null
}

const ChartProComponent: Component<ChartProComponentProps> = props => {
  let widgetRef: HTMLDivElement | undefined = undefined
  let widget: Nullable<Chart> = null

  let priceUnitDom: HTMLElement

  let loading = false

  const [theme, setTheme] = createSignal(props.theme)
  const [styles, setStyles] = createSignal(props.styles)
  const [locale, setLocale] = createSignal(props.locale)

  const [symbol, setSymbol] = createSignal(props.symbol)
  const [period, setPeriod] = createSignal(props.period)
  const [indicatorModalVisible, setIndicatorModalVisible] = createSignal(false)
  const [mainIndicators, setMainIndicators] = createSignal([...(props.mainIndicators!)])
  const [subIndicators, setSubIndicators] = createSignal({})

  const [timezoneModalVisible, setTimezoneModalVisible] = createSignal(false)
  const [timezone, setTimezone] = createSignal<SelectDataSourceItem>({ key: props.timezone, text: translateTimezone(props.timezone, props.locale) })

  const [settingModalVisible, setSettingModalVisible] = createSignal(false)
  const [widgetDefaultStyles, setWidgetDefaultStyles] = createSignal<Styles>()

  const [screenshotUrl, setScreenshotUrl] = createSignal('')

  const [drawingBarVisible, setDrawingBarVisible] = createSignal(props.drawingBarVisible)

  const [symbolSearchModalVisible, setSymbolSearchModalVisible] = createSignal(false)

  const [loadingVisible, setLoadingVisible] = createSignal(false)

  const [indicatorSettingModalParams, setIndicatorSettingModalParams] = createSignal({
    visible: false, indicatorName: '', paneId: '', calcParams: [] as Array<any>
  })

  props.ref({
    setTheme,
    getTheme: () => theme(),
    setStyles,
    getStyles: () => widget!.getStyles(),
    setLocale,
    getLocale: () => locale(),
    setTimezone: (timezone: string) => { setTimezone({ key: timezone, text: translateTimezone(props.timezone, locale()) }) },
    getTimezone: () => timezone().key,
    setSymbol,
    getSymbol: () => symbol(),
    setPeriod,
    getPeriod: () => period()
  })

  const documentResize = () => {
    widget?.resize()
  }

  const adjustFromTo = (period: PeriodOptions, toTimestamp: number, count: number) => {
    let to = toTimestamp
    let from = to
    switch (period.timespan) {
      case 'minute': {
        to = to - (to % (60 * 1000))
        from = to - count * period.multiplier * 60 * 1000
        break
      }
      case 'hour': {
        to = to - (to % (60 * 60 * 1000))
        from = to - count * period.multiplier * 60 * 60 * 1000
        break
      }
      case 'day': {
        to = to - (to % (60 * 60 * 1000))
        from = to - count * period.multiplier * 24 * 60 * 60 * 1000
        break
      }
      case 'week': {
        const date = new Date(to)
        const week = date.getDay()
        const dif = week === 0 ? 6 : week - 1
        to = to - dif * 60 * 60 * 24
        const newDate = new Date(to)
        to = new Date(`${newDate.getFullYear()}-${newDate.getMonth() + 1}-${newDate.getDate()}`).getTime()
        from = count * period.multiplier * 7 * 24 * 60 * 60 * 1000
        break
      }
      case 'month': {
        const date = new Date(to)
        const year = date.getFullYear()
        const month = date.getMonth() + 1
        to = new Date(`${year}-${month}-01`).getTime()
        from = count * period.multiplier * 30 * 24 * 60 * 60 * 1000
        const fromDate = new Date(from)
        from = new Date(`${fromDate.getFullYear()}-${fromDate.getMonth() + 1}-01`).getTime()
        break
      }
      case 'year': {
        const date = new Date(to)
        const year = date.getFullYear()
        to = new Date(`${year}-01-01`).getTime()
        from = count * period.multiplier * 365 * 24 * 60 * 60 * 1000
        const fromDate = new Date(from)
        from = new Date(`${fromDate.getFullYear()}-01-01`).getTime()
        break
      }
    }
    return [from, to]
  }

  onMount(() => {
    window.addEventListener('resize', documentResize)
    widget = init(widgetRef!, {
      formatter: {
        formatDate: ({ dateTimeFormat, timestamp, template, type }: { dateTimeFormat: Intl.DateTimeFormat; timestamp: number; template: string; type: 'tooltip' | 'crosshair' | 'xAxis' }) => {
          const p = period()
          switch (p.timespan) {
            case 'minute': {
              if (type === 'xAxis') {
                return utils.formatDate(dateTimeFormat, timestamp, 'HH:mm')
              }
              return utils.formatDate(dateTimeFormat, timestamp, 'YYYY-MM-DD HH:mm')
            }
            case 'hour': {
              if (type === 'xAxis') {
                return utils.formatDate(dateTimeFormat, timestamp, 'MM-DD HH:mm')
              }
              return utils.formatDate(dateTimeFormat, timestamp, 'YYYY-MM-DD HH:mm')
            }
            case 'day':
            case 'week': return utils.formatDate(dateTimeFormat, timestamp, 'YYYY-MM-DD')
            case 'month': {
              if (type === 'xAxis') {
                return utils.formatDate(dateTimeFormat, timestamp, 'YYYY-MM')
              }
              return utils.formatDate(dateTimeFormat, timestamp, 'YYYY-MM-DD')
            }
            case 'year': {
              if (type === 'xAxis') {
                return utils.formatDate(dateTimeFormat, timestamp, 'YYYY')
              }
              return utils.formatDate(dateTimeFormat, timestamp, 'YYYY-MM-DD')
            }
          }
          return utils.formatDate(dateTimeFormat, timestamp, 'YYYY-MM-DD HH:mm')
        }
      }
    })

    widget?.setStyles({
      candle: {
        bar: {
          upColor: '#F92855',
          upBorderColor: '#F92855',
          upWickColor: '#F92855',
          downColor: '#2DC08E',
          downBorderColor: '#2DC08E',
          downWickColor: '#2DC08E',
        },
        priceMark: {
          last: {
            upColor: '#F92855',
            downColor: '#2DC08E',
          }
        },
        tooltip: {
          legend: {
            template: [
              { title: { text: 'time', color: '#929AA5' }, value: { text: '{time}', color: '#929AA5' } },
              { title: { text: 'open', color: '#929AA5' }, value: { text: '{open}', color: '#929AA5' } },
              { title: { text: 'high', color: '#929AA5' }, value: { text: '{high}', color: '#F92855' } },
              { title: { text: 'low', color: '#929AA5' }, value: { text: '{low}', color: '#2DC08E' } },
              { title: { text: 'close', color: '#929AA5' }, value: { text: '{close}', color: '#D4A017' } },
              { title: { text: 'volume', color: '#929AA5' }, value: { text: '{volume}', color: '#929AA5' } },
            ]
          }
        }
      },
      indicator: {
        ohlc: {
          upColor: '#F92855',
          downColor: '#2DC08E',
        },
        bars: [
          { upColor: '#F92855', downColor: '#2DC08E' }
        ],
        circles: [
          { upColor: '#F92855', downColor: '#2DC08E' }
        ]
      }
    })

    widget?.setDataLoader({
      getBars: async (params) => {
        if (loading) return
        loading = true
        setLoadingVisible(true)
        const { type, timestamp, callback } = params
        const s = symbol()
        const p = period()
        try {
          if (type === 'init' || type === 'forward') {
            const [from, to] = adjustFromTo(p, new Date().getTime(), 500)
            const kLineDataList = await props.datafeed.getHistoryKLineData(s, p, from, to)
            callback(kLineDataList, kLineDataList.length > 0)
          } else if (type === 'backward') {
            const [to] = adjustFromTo(p, timestamp!, 1)
            const [from] = adjustFromTo(p, to, 500)
            const kLineDataList = await props.datafeed.getHistoryKLineData(s, p, from, to)
            callback(kLineDataList, kLineDataList.length > 0)
          }
        } finally {
          loading = false
          setLoadingVisible(false)
        }
      },
      subscribeBar: (params) => {
        props.datafeed.subscribe(symbol(), period(), params.callback)
      },
      unsubscribeBar: (params) => {
        props.datafeed.unsubscribe(symbol(), period())
      }
    })

    if (widget) {
      if (props.watermark != null) {
        const watermarkContainer = widget.getDom('candle_pane', 'main')
        if (watermarkContainer) {
          let watermark = document.createElement('div')
          watermark.className = 'klinecharts-pro-watermark'
          if (utils.isString(props.watermark)) {
            const str = (props.watermark as string).replace(/(^\s*)|(\s*$)/g, '')
            watermark.innerHTML = str
          } else {
            watermark.appendChild(props.watermark as Node)
          }
          watermarkContainer.appendChild(watermark)
        }
      }

      const priceUnitContainer = widget.getDom('candle_pane', 'yAxis')
      priceUnitDom = document.createElement('span')
      priceUnitDom.className = 'klinecharts-pro-price-unit'
      priceUnitContainer?.appendChild(priceUnitDom)
    }

    mainIndicators().forEach(indicator => {
      const params = indicator === 'MA' ? [5, 10, 20, 60] : undefined
      const styles = indicator === 'MA'
        ? {
            lines: [
              { color: '#FF6D00' },
              { color: '#2196F3' },
              { color: '#4CAF50' },
              { color: '#9C27B0' }
            ]
          }
        : undefined
      createIndicator(widget, indicator, true, { id: 'candle_pane' }, params, styles)
    })
    const subIndicatorMap = {}
    props.subIndicators!.forEach(indicator => {
      const paneId = createIndicator(widget, indicator, true)
      if (paneId) {
        // @ts-expect-error
        subIndicatorMap[indicator] = paneId
      }
    })
    setSubIndicators(subIndicatorMap)

    widget?.subscribeAction('onIndicatorTooltipFeatureClick', (data: any) => {
      const { paneId, feature, indicator } = data as any
      if (!indicator || !feature) return
      const indicatorName = indicator.name
      const featureId = feature.id
      switch (featureId) {
        case 'visible': {
          widget?.overrideIndicator({ name: indicatorName, visible: true, paneId })
          break
        }
        case 'invisible': {
          widget?.overrideIndicator({ name: indicatorName, visible: false, paneId })
          break
        }
        case 'setting': {
          setIndicatorSettingModalParams({
            visible: true, indicatorName, paneId, calcParams: indicator.calcParams ?? []
          })
          break
        }
        case 'close': {
          if (paneId === 'candle_pane') {
            const newMainIndicators = [...mainIndicators()]
            widget?.removeIndicator({ paneId: 'candle_pane', name: indicatorName })
            newMainIndicators.splice(newMainIndicators.indexOf(indicatorName), 1)
            setMainIndicators(newMainIndicators)
          } else {
            const newIndicators = { ...subIndicators() }
            widget?.removeIndicator({ paneId, name: indicatorName })
            // @ts-expect-error
            delete newIndicators[indicatorName]
            setSubIndicators(newIndicators)
          }
          break
        }
      }
    })
  })

  onCleanup(() => {
    window.removeEventListener('resize', documentResize)
    dispose(widgetRef!)
  })

  createEffect(() => {
    const s = symbol()
    if (s?.priceCurrency) {
      priceUnitDom.innerHTML = s?.priceCurrency.toLocaleUpperCase()
      priceUnitDom.style.display = 'flex'
    } else {
      priceUnitDom.style.display = 'none'
    }
    widget?.setSymbol({
      ticker: s?.ticker ?? '',
      pricePrecision: s?.pricePrecision ?? 2,
      volumePrecision: s?.volumePrecision ?? 0
    })
  })

  createEffect((prev?: PrevSymbolPeriod) => {
    const s = symbol()
    const p = period()
    if (prev) {
      props.datafeed.unsubscribe(prev.symbol, prev.period)
    }
    widget?.setSymbol({
      ticker: s.ticker,
      pricePrecision: s.pricePrecision,
      volumePrecision: s.volumePrecision
    })
    widget?.setPeriod({
      type: p.timespan as any,
      span: p.multiplier
    })
    return { symbol: s, period: p }
  })

  createEffect(() => {
    const t = theme()
    widget?.setStyles(t)
    const color = t === 'dark' ? '#929AA5' : '#76808F'
    widget?.setStyles({
      indicator: {
        tooltip: {
          features: [
            {
              id: 'visible',
              position: 'middle',
              marginLeft: 8,
              marginTop: 7,
              marginRight: 0,
              marginBottom: 0,
              paddingLeft: 0,
              paddingTop: 0,
              paddingRight: 0,
              paddingBottom: 0,
              type: 'icon_font',
              content: { family: 'icomoon', code: '\ue903' },
              size: 14,
              color: color,
              activeColor: color,
              backgroundColor: 'transparent',
              activeBackgroundColor: 'rgba(22, 119, 255, 0.15)'
            },
            {
              id: 'invisible',
              position: 'middle',
              marginLeft: 8,
              marginTop: 7,
              marginRight: 0,
              marginBottom: 0,
              paddingLeft: 0,
              paddingTop: 0,
              paddingRight: 0,
              paddingBottom: 0,
              type: 'icon_font',
              content: { family: 'icomoon', code: '\ue901' },
              size: 14,
              color: color,
              activeColor: color,
              backgroundColor: 'transparent',
              activeBackgroundColor: 'rgba(22, 119, 255, 0.15)'
            },
            {
              id: 'setting',
              position: 'middle',
              marginLeft: 6,
              marginTop: 7,
              marginBottom: 0,
              marginRight: 0,
              paddingLeft: 0,
              paddingTop: 0,
              paddingRight: 0,
              paddingBottom: 0,
              type: 'icon_font',
              content: { family: 'icomoon', code: '\ue902' },
              size: 14,
              color: color,
              activeColor: color,
              backgroundColor: 'transparent',
              activeBackgroundColor: 'rgba(22, 119, 255, 0.15)'
            },
            {
              id: 'close',
              position: 'middle',
              marginLeft: 6,
              marginTop: 7,
              marginRight: 0,
              marginBottom: 0,
              paddingLeft: 0,
              paddingTop: 0,
              paddingRight: 0,
              paddingBottom: 0,
              type: 'icon_font',
              content: { family: 'icomoon', code: '\ue900' },
              size: 14,
              color: color,
              activeColor: color,
              backgroundColor: 'transparent',
              activeBackgroundColor: 'rgba(22, 119, 255, 0.15)'
            }
          ]
        },
        MA: {
          lines: [
            { color: '#FF6D00' },
            { color: '#2196F3' },
            { color: '#4CAF50' },
            { color: '#9C27B0' }
          ]
        }
      }
    })
  })

  createEffect(() => {
    widget?.setLocale(locale())
  })

  createEffect(() => {
    widget?.setTimezone(timezone().key)
  })

  createEffect(() => {
    if (styles()) {
      widget?.setStyles(styles())
      setWidgetDefaultStyles(lodashClone(widget!.getStyles()))
    }
  })

  return (
    <>
      <i class="icon-close klinecharts-pro-load-icon"/>
      <Show when={symbolSearchModalVisible()}>
        <SymbolSearchModal
          locale={props.locale}
          datafeed={props.datafeed}
          onSymbolSelected={symbol => { setSymbol(symbol) }}
          onClose={() => { setSymbolSearchModalVisible(false) }}/>
      </Show>
      <Show when={indicatorModalVisible()}>
        <IndicatorModal
          locale={props.locale}
          mainIndicators={mainIndicators()}
          subIndicators={subIndicators()}
          onClose={() => { setIndicatorModalVisible(false) }}
          onMainIndicatorChange={data => {
            const newMainIndicators = [...mainIndicators()]
            if (data.added) {
              createIndicator(widget, data.name, true, { id: 'candle_pane' })
              newMainIndicators.push(data.name)
            } else {
              widget?.removeIndicator({ paneId: 'candle_pane', name: data.name })
              newMainIndicators.splice(newMainIndicators.indexOf(data.name), 1)
            }
            setMainIndicators(newMainIndicators)
          }}
          onSubIndicatorChange={data => {
            const newSubIndicators = { ...subIndicators() }
            if (data.added) {
              const paneId = createIndicator(widget, data.name)
              if (paneId) {
                // @ts-expect-error
                newSubIndicators[data.name] = paneId
              }
            } else {
              if (data.paneId) {
                widget?.removeIndicator({ paneId: data.paneId, name: data.name })
                // @ts-expect-error
                delete newSubIndicators[data.name]
              }
            }
            setSubIndicators(newSubIndicators)
          }}/>
      </Show>
      <Show when={timezoneModalVisible()}>
        <TimezoneModal
          locale={props.locale}
          timezone={timezone()}
          onClose={() => { setTimezoneModalVisible(false) }}
          onConfirm={setTimezone}
        />
      </Show>
      <Show when={settingModalVisible()}>
        <SettingModal
          locale={props.locale}
          currentStyles={utils.clone(widget!.getStyles())}
          onClose={() => { setSettingModalVisible(false) }}
          onChange={style => {
            widget?.setStyles(style)
          }}
          onRestoreDefault={(options: SelectDataSourceItem[]) => {
            const style = {}
            options.forEach(option => {
              const key = option.key
              lodashSet(style, key, utils.formatValue(widgetDefaultStyles(), key))
            })
            widget?.setStyles(style)
          }}
        />
      </Show>
      <Show when={screenshotUrl().length > 0}>
        <ScreenshotModal
          locale={props.locale}
          url={screenshotUrl()}
          onClose={() => { setScreenshotUrl('') }}
        />
      </Show>
      <Show when={indicatorSettingModalParams().visible}>
        <IndicatorSettingModal
          locale={props.locale}
          params={indicatorSettingModalParams()}
          onClose={() => { setIndicatorSettingModalParams({ visible: false, indicatorName: '', paneId: '', calcParams: [] }) }}
          onConfirm={(params)=> {
            const modalParams = indicatorSettingModalParams()
            widget?.overrideIndicator({ name: modalParams.indicatorName, calcParams: params, paneId: modalParams.paneId })
          }}
        />
      </Show>
      <PeriodBar
        locale={props.locale}
        symbol={symbol()}
        spread={drawingBarVisible()}
        period={period()}
        periods={props.periods}
        onMenuClick={async () => {
          try {
            await startTransition(() => setDrawingBarVisible(!drawingBarVisible()))
            widget?.resize()
          } catch (e) {}    
        }}
        onSymbolClick={() => { setSymbolSearchModalVisible(!symbolSearchModalVisible()) }}
        onPeriodChange={setPeriod}
        onIndicatorClick={() => { setIndicatorModalVisible((visible => !visible)) }}
        onTimezoneClick={() => { setTimezoneModalVisible((visible => !visible)) }}
        onSettingClick={() => { setSettingModalVisible((visible => !visible)) }}
        onScreenshotClick={() => {
          if (widget) {
            const url = widget.getConvertPictureUrl(true, 'jpeg', props.theme === 'dark' ? '#151517' : '#ffffff')
            setScreenshotUrl(url)
          }
        }}
      />
      <div
        class="klinecharts-pro-content">
        <Show when={loadingVisible()}>
          <Loading/>
        </Show>
        <Show when={drawingBarVisible()}>
          <DrawingBar
            locale={props.locale}
            onDrawingItemClick={overlay => { widget?.createOverlay(overlay) }}
            onModeChange={mode => { widget?.overrideOverlay({ mode: mode as OverlayMode }) }}
            onLockChange={lock => { widget?.overrideOverlay({ lock }) }}
            onVisibleChange={visible => { widget?.overrideOverlay({ visible }) }}
            onRemoveClick={(groupId) => { widget?.removeOverlay({ groupId }) }}/>
        </Show>
        <div
          ref={widgetRef}
          class='klinecharts-pro-widget'
          data-drawing-bar-visible={drawingBarVisible()}/>
      </div>
    </>
  )
}

export default ChartProComponent