"use client";
import React, { useState } from "react";
import { Scanner } from "@yudiel/react-qr-scanner";

export default function QrCodeReader() {
  const [result, setResult] = useState<string>("");

  return (
    <div style={{ textAlign: "center", padding: "20px" }}>
      <h2>Leitor de QR Code</h2>

      {/* Componente do Scanner */}
      <Scanner
        onScan={(detectedCodes) => {
          if (detectedCodes.length > 0) {
            setResult(detectedCodes[0].rawValue);
          }
        }}
        {...({ onError: (error: any) => console.error("Erro:", error) } as any)}
        allowMultiple={false} // só lê 1 QR por vez
        components={{
          audio: true, // som ao detectar
          finder: true, // mira no centro
        }}
        style={{ width: 300, height: 300 }}
      />

      {/* Resultado do QR Code */}
      <div style={{ marginTop: "20px" }}>
        <h3>Resultado:</h3>
        <p>{result || "Aponte a câmera para um QR Code"}</p>
      </div>
    </div>
  );
}
