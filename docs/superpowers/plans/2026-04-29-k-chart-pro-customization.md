# KLineChartPro 定制需求实施计划

> **目标：** 对 k-chart-pro 源码进行 5 项定制修改，满足特定的 K 线图展示需求。
>
> **范围：** 仅修改 `/Users/quan/dev/open_tools/k-chart-pro/src/` 目录下的源码文件。

---

## 环境准备

```bash
cd /Users/quan/dev/open_tools/k-chart-pro
npm install
```

---

## 任务一：修改默认副图指标为 VOL + MACD + KDJ

**涉及文件：**
- `/Users/quan/dev/open_tools/k-chart-pro/src/KLineChartPro.tsx`

**步骤 1.1：** 打开 `KLineChartPro.tsx`，定位到第 71 行：

```tsx
subIndicators={options.subIndicators ?? ['VOL']}
```

**步骤 1.2：** 将默认值 `'VOL'` 改为 `'VOL', 'MACD', 'KDJ'`：

```tsx
subIndicators={options.subIndicators ?? ['VOL', 'MACD', 'KDJ']}
```

**步骤 1.3：** 验证编译：

```bash
npm run build-core
```

预期：编译成功，无错误。

---

## 任务二：隐藏指定周期按钮（保留 1H / D / W / M）

**涉及文件：**
- `/Users/quan/dev/open_tools/k-chart-pro/src/KLineChartPro.tsx`

**步骤 2.1：** 打开 `KLineChartPro.tsx`，定位到第 55-67 行（`periods` 属性默认数组）。

**步骤 2.2：** 删除以下周期对象：
- `{ multiplier: 1, timespan: 'minute', text: '1m' }`
- `{ multiplier: 5, timespan: 'minute', text: '5m' }`
- `{ multiplier: 15, timespan: 'minute', text: '15m' }`
- `{ multiplier: 2, timespan: 'hour', text: '2H' }`
- `{ multiplier: 4, timespan: 'hour', text: '4H' }`
- `{ multiplier: 1, timespan: 'year', text: 'Y' }`

保留：
- `{ multiplier: 1, timespan: 'hour', text: '1H' }`
- `{ multiplier: 1, timespan: 'day', text: 'D' }`
- `{ multiplier: 1, timespan: 'week', text: 'W' }`
- `{ multiplier: 1, timespan: 'month', text: 'M' }`

修改后代码应为：

```tsx
periods={
  options.periods ?? [
    { multiplier: 1, timespan: 'hour', text: '1H' },
    { multiplier: 1, timespan: 'day', text: 'D' },
    { multiplier: 1, timespan: 'week', text: 'W' },
    { multiplier: 1, timespan: 'month', text: 'M' }
  ]
}
```

**步骤 2.3：** 验证编译：

```bash
npm run build-core
```

预期：编译成功。

---

## 任务三：移除水印（Watermark）

**涉及文件：**
- `/Users/quan/dev/open_tools/k-chart-pro/src/KLineChartPro.tsx`
- `/Users/quan/dev/open_tools/k-chart-pro/src/ChartProComponent.tsx`

### 3.1 修改默认值

**步骤 3.1.1：** 在 `KLineChartPro.tsx` 中，定位第 49 行：

```tsx
watermark={options.watermark ?? (Logo as Node)}
```

**步骤 3.1.2：** 改为：

```tsx
watermark={options.watermark}
```

这样当调用方不传入 `watermark` 时，默认为 `undefined`（即不显示水印）。

### 3.2 添加空值保护

**步骤 3.2.1：** 在 `ChartProComponent.tsx` 中，定位第 251-263 行：

```tsx
if (widget) {
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
```

**步骤 3.2.2：** 在 `if (widget)` 内部、创建水印之前，增加对 `props.watermark` 的空值判断：

```tsx
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
```

**步骤 3.3：** 验证编译：

```bash
npm run build-core
```

预期：编译成功。

---

## 任务四：MA 指标参数改为 5/10/20/60，并同步图例颜色

**涉及文件：**
- `/Users/quan/dev/open_tools/k-chart-pro/src/ChartProComponent.tsx`

### 4.1 修改 `createIndicator` 函数以支持自定义参数

**步骤 4.1.1：** 定位第 45 行的函数签名：

```tsx
function createIndicator (widget: Nullable<Chart>, indicatorName: string, isStack?: boolean, paneOptions?: PaneOptions): Nullable<string> {
```

**步骤 4.1.2：** 增加可选的 `calcParams` 参数：

```tsx
function createIndicator (widget: Nullable<Chart>, indicatorName: string, isStack?: boolean, paneOptions?: PaneOptions, calcParams?: Array<any>): Nullable<string> {
```

**步骤 4.1.3：** 在 `widget?.createIndicator({...})` 调用中（第 49 行），加入 `calcParams`：

```tsx
return widget?.createIndicator({
  name: indicatorName,
  calcParams,
  createTooltipDataSource: ({ indicator, chart }) => {
```

### 4.2 为主图 MA 传入 [5, 10, 20, 60]

**步骤 4.2.1：** 定位第 271-273 行：

```tsx
mainIndicators().forEach(indicator => {
  createIndicator(widget, indicator, true, { id: 'candle_pane' })
})
```

**步骤 4.2.2：** 改为：

```tsx
mainIndicators().forEach(indicator => {
  const params = indicator === 'MA' ? [5, 10, 20, 60] : undefined
  createIndicator(widget, indicator, true, { id: 'candle_pane' }, params)
})
```

### 4.3 同步 MA 图例（Legend）颜色

**步骤 4.3.1：** 在 `createIndicator` 函数内部，定位 `legends: []`（第 67 行）。

**步骤 4.3.2：** 将其替换为动态生成，使 MA 的 tooltip 图例显示对应颜色：

```tsx
const maColors = ['#FF6D00', '#2196F3', '#4CAF50', '#9C27B0']
return {
  name: indicator.shortName ?? indicator.name,
  calcParamsText: Array.isArray(indicator.calcParams) ? indicator.calcParams.join(', ') : '',
  features: icons,
  legends: indicator.name === 'MA'
    ? indicator.calcParams?.map((param, i) => ({
        color: maColors[i % maColors.length],
        title: `MA${param}`,
        value: ''
      })) ?? []
    : []
}
```

> **说明：** `value: ''` 由 klinecharts 在渲染时根据当前光标位置的指标值自动填充。

### 4.4 同步 MA 线条颜色

**步骤 4.4.1：** 定位 `createEffect(() => { const t = theme() ... })`（约第 360 行）。

**步骤 4.4.2：** 在 `widget?.setStyles({ indicator: { tooltip: { features: [...] } } })` 之后，追加 MA 线条样式：

```tsx
widget?.setStyles({
  indicator: {
    tooltip: {
      features: [
        // ... 原有 features 代码保持不变 ...
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
```

**步骤 4.5：** 验证编译：

```bash
npm run build-core
```

预期：编译成功。

---

## 任务五：确保 MA Tooltip 显示功能图标

**说明：** 经检查，`createIndicator` 函数（第 51-66 行）已为所有指标（包括 MA）的 tooltip 添加了 `features`（可见/隐藏、设置、关闭 3 个图标）。因此本需求**无需额外修改**，现有代码已满足。

---

## 最终验证

**步骤 6.1：** 完整编译：

```bash
cd /Users/quan/dev/open_tools/k-chart-pro
npm run build
```

预期：
- `build-core` 成功
- `build-dts` 成功
- `dist/` 目录生成更新后的文件

**步骤 6.2：** 若项目中存在演示/测试页面，启动开发服务器查看效果：

```bash
npm run docs:dev
```

或根据项目实际使用的示例应用进行验证。

---

## 回滚方案

所有修改均为源码级别的默认值或参数调整，未引入新依赖。如需回滚：

```bash
cd /Users/quan/dev/open_tools/k-chart-pro
git checkout -- src/KLineChartPro.tsx src/ChartProComponent.tsx
```

即可恢复原始状态。
