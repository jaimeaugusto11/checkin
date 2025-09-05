"use client";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function CheckinPage() {
  const params = useSearchParams();
  const token = params.get("token") || "";
  const [message, setMessage] = useState<string>("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (token) {
      setBusy(true);
      fetch("/api/checkin", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token }) })
      .then(async r => {
        const j = await r.json();
        if (r.ok) setMessage(j.already ? "✅ Já estava presente" : "✅ Presença registada");
        else setMessage("❌ " + (j.error || "Falha no check-in"));
      })
      .catch(()=>setMessage("❌ Falha no check-in"))
      .finally(()=>setBusy(false));
    }
  }, [token]);

  return (
    <div className="container-page py-8">
      <Card>
        <CardHeader><CardTitle>Check-in</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-gray-600">Se chegou aqui através do seu QR de convidado, aguarde a validação.</p>
          <div className="text-lg">{busy ? "A validar..." : message}</div>
          <a href="/" className="underline text-sm text-gray-600">Voltar</a>
        </CardContent>
      </Card>
    </div>
  );
}
