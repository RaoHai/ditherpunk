# Ditherpunk

**A tiny, offline pixel darkroom. Less color. More character.**

Ditherpunk turns images and original procedural landscapes into two-color pixel art. A single HTML file, no build step, no runtime dependencies, no uploads, no analytics.

[Live demo](https://raohai.github.io/ditherpunk/) · [Download index.html](https://github.com/RaoHai/ditherpunk/releases/latest)

## 中文

像素风格的本地点阵暗房。下载 `index.html` 后双击即可使用。

- 8 幅原创程序风景：山湖余晖、富士春晓、沙海落日、海角灯塔、极光之夜、雾隐松林、雨后都市、月球来信。
- Bayer 2/4/8、近似蓝噪声、Floyd–Steinberg、Atkinson、白噪声、阈值，共 8 种算法。
- 1–16px 细胞、亮度、对比度、线性空间、8 套双色油墨和自定义颜色。
- 文件上传、拖放、粘贴图片。支持浏览器能够解码的图片格式。
- 普通导出：多种宽度，16:9、原图比例、1:1、4:5 居中裁剪。
- **X 完美导出**：默认 516×290；支持测量 JSON、CSS 尺寸和 DPR 校准。
- **1-bit 索引 PNG**：保存两个调色板颜色，压缩不改变任何像素。无需依赖第三方编码器。

### X 校准

1. 在 X 开发者工具中选中图片的 `data-testid="tweetPhoto"` 外层节点。
2. 展开应用里的“如何校准”，复制测量命令到开发者工具 Console。
3. 将复制的 JSON 粘贴回应用，点击“应用测量值”。
4. 调整点阵，点击“X 完美导出”，把得到的 PNG 文件上传到 X。

**“完美”指本地文件像素无损和目标尺寸匹配，不保证绕过 X 的处理。** X 可能缩放、转码或在小数坐标绘制。DPR、浏览器缩放、窗口大小也会影响显示。1px 点阵对这些变化尤其敏感。X 显示模拟只是当前浏览器中的缩放预览，不是 X 服务器模拟，也不复制 X 的小数页面定位。

## Run

Open `index.html` directly, or serve this directory:

```sh
python -m http.server 8000
```

Everything is processed locally. The GitHub links navigate externally only when clicked. The illustrations are generated from deterministic seeds; no downloaded photos, fonts, or asset services are required.

## Implementation

- Center-crop and resample the source once, then compute cell luminance and dither at the **final export resolution**.
- Edge cells can be partial. Atkinson uses its six-neighbor 1/8 error kernel.
- The blue-noise option is a ranked high-pass random tile, an approximation rather than a full void-and-cluster construction.
- Encode a two-entry PNG palette, 1-bit pixel rows, CRC-32 chunks, and zlib-compressed IDAT via `CompressionStream`.
- Browsers without `CompressionStream` use valid stored DEFLATE blocks; the file is larger but still indexed and lossless.
- Input limit: 30 MB / 40 million decoded pixels. Output limit: 16,777,216 pixels and 8192 per side. Large images can take longer because processing runs on the main thread.

The interface is in Chinese, with English section labels. Recent Chromium, Firefox, and Safari are the target browsers; automated verification currently uses Chromium.

## Tests

Node.js 20+ is recommended for the development tools. The app itself does not require Node.

```sh
npm ci
npx playwright install chromium
npm test
```

Tests exercise all scenes and algorithms, 1px/partial edge cells, image import, invalid measurements, DPR calibration, mobile layout, and lossless pixel equivalence of downloaded PNG files (including the fallback encoder).

## License

MIT. The code and eight procedural landscape illustrations are included under the same license. Images you import retain their original rights.
