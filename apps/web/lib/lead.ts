export type LeadPayload = {
  name: string;
  companyName?: string;
  phone: string;
  email: string;
  service: string;
  message: string;
};

export type JobApplicationPayload = {
  name: string;
  phone: string;
  email: string;
  area: string;
  message?: string;
  resumeFile?: File;
};

// Quando você configurar seu sistema de e-mails (como Resend ou SendGrid), mude isso para true
export const isLeadDeliveryConfigured = false;

export async function submitLead(payload: LeadPayload) {
  // Aqui entrará a lógica real de envio (fetch para sua API)
  console.log("Lead recebido:", payload);

  // Simulando um tempo de rede
  await new Promise((resolve) => setTimeout(resolve, 1000));
}

export async function submitJobApplication(payload: JobApplicationPayload) {
  console.log("Candidatura recebida:", payload);
  await new Promise((resolve) => setTimeout(resolve, 1000));
}
