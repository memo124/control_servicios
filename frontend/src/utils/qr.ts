import QRCode from 'qrcode';

export async function drawQrToCanvas(
  canvas: HTMLCanvasElement,
  text: string,
  margin = 2,
): Promise<void> {
  const isDark = document.documentElement.getAttribute('data-theme') !== 'light';
  const size = canvas.width;

  await QRCode.toCanvas(canvas, text, {
    width: size,
    margin,
    errorCorrectionLevel: 'M',
    color: {
      dark: isDark ? '#f8fafc' : '#0f172a',
      light: isDark ? '#0f172a' : '#ffffff',
    },
  });
}
