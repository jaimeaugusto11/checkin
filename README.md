# Gestor de Convidados de Palestra (Next.js + Firebase + Tailwind + shadcn)

Funcionalidades principais:
- Gestão de convidados (CRUD, importação CSV, pesquisa).
- Geração automática de QR Code único por convidado (com assinatura HMAC).
- Envio de convite por e-mail com QR Code (via Resend).
- Página de *Scan* no telemóvel para leitura do QR (câmara) e *check-in* instantâneo.
- Registo de presença com data/hora e histórico de reenvio.
- Interface moderna com Tailwind + componentes estilo shadcn.
- Regras de segurança do Firestore e autenticação Firebase (Google/Email).
- Exportação CSV.

## Setup

1) **Clonar & instalar**  
```bash
pnpm i   # ou npm i / yarn
```

2) **Firebase**
- Criar um projeto no Firebase, ativar **Authentication** (Google e/ou Email), **Firestore** e **Storage**.
- Criar um **Service Account** (Project Settings > Service Accounts > Generate new private key).
- Preencher `.env.local` com credenciais (ver `.env.example`). **No FIREBASE_PRIVATE_KEY substitua \n por quebras de linha reais**.

3) **Resend (emails)**
- Criar conta, gerar `RESEND_API_KEY`.
- Ajustar `EMAIL_FROM`, `EMAIL_REPLY_TO` e `EVENT_NAME` em `.env.local`.

4) **Executar**
```bash
pnpm dev
```
Abrir http://localhost:3000

5) **Deploy**
- Vercel recomendado. Configure as variáveis de ambiente.
- Base de dados Firestore fica no Firebase.

## Firestore

Coleção: `guests/{guestId}`  
Campos: `fullName, email, phone, org, role, status, createdAt, updatedAt, checkInAt, inviteSentAt, token`

## Regras Firestore (exemplo)
```
// Somente utilizadores autenticados podem ler/escrever.
// Adapte para o seu caso (claims de admin, etc).
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /guests/{id} {
      allow read, write: if request.auth != null;
    }
  }
}
```

## Segurança do QR
O QR codifica `token` assinado em HMAC. O *check-in* valida a assinatura no servidor antes de marcar presença.

