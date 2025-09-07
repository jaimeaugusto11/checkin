"use client";
import { Suspense } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import CheckinContent from "./CheckinContent";

function CheckinFallback() {
  return (
    <div className="container-page py-8">
      <Card>
        <CardHeader>
          <CardTitle>Check-in</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-gray-600">
            Se chegou aqui através do seu QR de convidado, aguarde a validação.
          </p>
          <div className="text-lg">🔄 A carregar...</div>
          <a href="/" className="underline text-sm text-gray-600">
            Voltar
          </a>
        </CardContent>
      </Card>
    </div>
  );
}

export default function CheckinPage() {
  return (
    <Suspense fallback={<CheckinFallback />}>
      <CheckinContent />
    </Suspense>
  );
}
