import QRCode from "qrcode";

/**
 * Gera uma DataURL (base64) de um QRCode em PNG.
 * Exemplo de retorno: data:image/png;base64,iVBORw0KGgoAAA...
 */
export async function generateQrPngDataUrl(text: string): Promise<string> {
  try {
    return await QRCode.toDataURL(text, {
      errorCorrectionLevel: "H",
      type: "image/png",
      margin: 2,
      width: 300,
      color: {
        dark: "#000000",
        light: "#ffffff",
      },
    });
  } catch (err) {
    console.error("Erro ao gerar QRCode:", err);
    throw new Error("Falha ao gerar QR Code");
  }
}
