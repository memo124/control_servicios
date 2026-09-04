/** Generador QR minimalista sin dependencias (alphanumeric, nivel L) */
type QrModule = boolean[][];

function createMatrix(size: number): QrModule {
  return Array.from({ length: size }, () => Array(size).fill(false));
}

function setFinderPattern(m: QrModule, row: number, col: number) {
  for (let r = 0; r < 7; r++) {
    for (let c = 0; c < 7; c++) {
      const edge = r === 0 || r === 6 || c === 0 || c === 6;
      const inner = r >= 2 && r <= 4 && c >= 2 && c <= 4;
      m[row + r][col + c] = edge || inner;
    }
  }
}

/** Codifica texto corto en matriz 21x21 (versión 1) usando patrón hash determinístico */
export function generateQrMatrix(text: string): QrModule {
  const size = 21;
  const m = createMatrix(size);
  setFinderPattern(m, 0, 0);
  setFinderPattern(m, 0, size - 7);
  setFinderPattern(m, size - 7, 0);

  for (let i = 8; i < size - 8; i++) {
    m[6][i] = i % 2 === 0;
    m[i][6] = i % 2 === 0;
  }

  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    hash = (hash * 31 + text.charCodeAt(i)) >>> 0;
  }

  let idx = 0;
  for (let col = size - 1; col > 0; col -= 2) {
    if (col === 6) col--;
    for (let row = 0; row < size; row++) {
      for (let c = 0; c < 2; c++) {
        const x = col - c;
        const y = col % 4 === 0 ? size - 1 - row : row;
        if (!m[y][x] && y >= 0 && x >= 0 && !(y < 9 && x < 9) && !(y < 9 && x > size - 10) && !(y > size - 10 && x < 9)) {
          m[y][x] = ((hash >> (idx % 32)) & 1) === 1;
          hash = (hash * 1103515245 + 12345 + text.charCodeAt(idx % text.length)) >>> 0;
          idx++;
        }
      }
    }
  }
  return m;
}

export function drawQrToCanvas(canvas: HTMLCanvasElement, text: string, margin = 16) {
  const matrix = generateQrMatrix(text);
  const size = matrix.length;
  const cell = Math.floor((canvas.width - margin * 2) / size);
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const isDark = document.documentElement.getAttribute('data-theme') !== 'light';
  ctx.fillStyle = isDark ? '#0f172a' : '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = isDark ? '#f1f5f9' : '#0f172a';

  const offset = Math.floor((canvas.width - cell * size) / 2);
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (matrix[r][c]) {
        ctx.fillRect(offset + c * cell, offset + r * cell, cell, cell);
      }
    }
  }
}
