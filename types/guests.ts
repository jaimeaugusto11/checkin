export type Guest = {
  id: string;
  fullName: string;
  email: string;
  whatsapp?: string;      // <- novo
  category?: string;      // <- novo
  phone?: string;         // mantém por compatibilidade
  org?: string;
  role?: string;
  status: "pending" | "invited" | "checked_in"| "Enviado";
  createdAt: number;
  updatedAt: number;
  checkInAt?: number | null;
  inviteSentAt?: number | null;
  token: string;
};
