# Teyvat Elegance Design System

## 視覺風格概述
「提瓦特典雅 (Teyvat Elegance)」是一款致敬《原神》美學的遊戲介面設計系統。它結合了高貴的金色裝飾、深邃的半透明毛玻璃層次，以及溫潤的羊皮紙質感，旨在為玩家營造一種充滿歷史感且精緻的幻想冒險氛圍。

---

## 核心色調 (Color Palette)

### 1. 品牌與強調色
- **Resonant Gold (#D3BC8E)**: 核心金色。用於按鈕、活動狀態、邊框裝飾與菱形點綴。象徵古代文明的餘輝。
- **Sunset Ochre (#C29A5B)**: 深金色。用於按鈕懸停狀態與主標題的漸變效果。

### 2. 表面與容器色
- **Abyssal Slate (#1F252F)**: 深色基調。用於對話框與導航欄。通常配合 `85%` 透明度與 `backdrop-blur-md` (12px) 毛玻璃效果使用。
- **Ancient Parchment (#F4ECD8)**: 淺色基調。用於章節選擇卡片、手冊背景。帶有輕微的紙張噪點質感。
- **Eclipsed Shadow (#2B333E)**: 次級表面色。用於輸入框、清單背景或更深的陰影層次。

### 3. 文字色
- **Celestial White (#ECE5D8)**: 高對比文字。用於深色背景上的正文與對話文字，提供柔和不刺眼的閱讀體驗。
- **Abyssal Black (#2B333E)**: 低對比文字。用於羊皮紙背景上的標題與描述文字。
- **Muted Slate (#8A95A5)**: 輔助文字。用於註釋、分界線或非活動狀態。

---

##  typography (字體規範)

- **標題 (Headings)**: `Cinzel`, Serif.
  - 用於章節名稱、角色姓名與主要標籤。
  - 特點：全大寫呈現，具備莊重的紀念碑感。
- **內文 (Body)**: `Lora`, Serif.
  - 用於遊戲對話、故事描述。
  - 特點：優雅的襯線，優化長篇閱讀的視覺疲勞。

---

## 對話介面構成 (Active Dialogue UI)

### 1. 對話面板 (Dialogue Panel)
- **結構**：位於螢幕底部，全寬或寬度 1200px 居中。
- **樣式**：`Abyssal Slate` 背景，85% 透明度，頂部 2px `Resonant Gold` 實線邊框。
- **裝飾**：四個角落配置 24px 的金色菱形幾何圖案。

### 2. 姓名標籤 (Nameplate)
- **位置**：懸浮於對話框左上方。
- **樣式**：`Resonant Gold` 背景，深色文字，左側帶有裝飾性的內縮缺口。

### 3. 角色立繪 (Character Portrait)
- **佈局**：位於對話框後方，底部對齊對話面板上緣。
- **效果**：左右偏移以留出中間視角，邊緣帶有柔和的環境遮擋渲染。

### 4. 交互元素
- **Next Indicator**: 位於對話右下角的動態金色菱形，提示玩家點擊繼續。
- **Control Bar**: 頂部透明導航，包含 LOG、AUTO、SKIP 等功能鍵，採用細邊框膠囊造型。

---

## 材質與特效 (Materials)

- **Frosted Glass**: `backdrop-blur-md` 結合半透明深色層，模擬精緻的玻璃透光感。
- **Geometric Accents**: 使用 45 度旋轉的菱形 (Diamond) 作為視覺母題，貫穿所有邊框與圖標。
- **Soft Glow**: 金色元素在啟用狀態下帶有淺淡的 `#D3BC8E` 外發光。