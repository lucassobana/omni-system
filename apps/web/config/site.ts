/**
 * ARQUIVO CENTRAL DE CONFIGURAÇÃO
 * Altere aqui todas as informações da empresa, serviços, links e textos.
 * Placeholders no formato [PREENCHER] devem ser substituídos.
 */

export const company = {
  name: "OMNI Segurança Privada",
  legalName: "[INSERIR RAZÃO SOCIAL]",
  cnpj: "[INSERIR CNPJ]",
  phone: "[TELEFONE]",
  whatsapp: "[WHATSAPP]",
  whatsappMessage:
    "Olá! Gostaria de solicitar um orçamento de segurança privada.",
  email: "[EMAIL]",
  address: "[ENDEREÇO]",
  city: "[CIDADE/UF]",
  instagram: "[INSTAGRAM]",
  linkedin: "[LINKEDIN]",
  federalPoliceAuthorization: "[INSERIR Nº DE AUTORIZAÇÃO DA POLÍCIA FEDERAL]",
} as const;

export const WHATSAPP_NUMBER = company.whatsapp;

export const whatsappUrl = () =>
  `https://wa.me/${WHATSAPP_NUMBER.replace(/\D/g, "")}?text=${encodeURIComponent(
    company.whatsappMessage,
  )}`;

export const LAW_URL =
  "https://www.planalto.gov.br/ccivil_03/_ato2023-2026/2024/lei/l14967.htm";

export const nav = [
  { label: "Início", href: "#inicio" },
  { label: "A empresa", href: "#empresa" },
  { label: "Serviços", href: "#servicos" },
  { label: "Conformidade", href: "#conformidade" },
  { label: "Estrutura", href: "#estrutura" },
  { label: "Contato", href: "#contato" },
] as const;

export const institutional = {
  aboutTitle: "Uma empresa estruturada para proteger com responsabilidade.",
  aboutText: [
    "[INSERIR TEXTO INSTITUCIONAL DA EMPRESA]",
    "[INSERIR FILOSOFIA DE TRABALHO / MISSÃO DA EMPRESA]",
  ],
  aboutHighlights: [
    "Empresa autorizada pela Polícia Federal",
    "Atuação alinhada à Lei nº 14.967/2024",
    "Estrutura operacional própria",
    "Profissionais preparados e capacitados",
    "Atendimento personalizado a cada cliente",
  ],
};

export const services = [
  {
    icon: "Building2",
    title: "[SERVIÇO 01]",
    description: "[DESCRIÇÃO CURTA DO SERVIÇO 01]",
  },
  {
    icon: "ShieldCheck",
    title: "[SERVIÇO 02]",
    description: "[DESCRIÇÃO CURTA DO SERVIÇO 02]",
  },
  {
    icon: "Car",
    title: "[SERVIÇO 03]",
    description: "[DESCRIÇÃO CURTA DO SERVIÇO 03]",
  },
  {
    icon: "Users",
    title: "[SERVIÇO 04]",
    description: "[DESCRIÇÃO CURTA DO SERVIÇO 04]",
  },
] as const;

export const differentials = [
  {
    icon: "BadgeCheck",
    title: "Autorização da Polícia Federal",
    description:
      "Empresa autorizada a operar no segmento de segurança privada perante a Polícia Federal.",
  },
  {
    icon: "Scale",
    title: "Conformidade com a Lei nº 14.967/2024",
    description:
      "Atuação alinhada ao Estatuto da Segurança Privada e da Segurança das Instituições Financeiras.",
  },
  {
    icon: "Building2",
    title: "Estrutura profissional",
    description:
      "Recursos operacionais organizados para dar suporte à execução dos serviços contratados.",
  },
  {
    icon: "Headset",
    title: "Atendimento personalizado",
    description:
      "Cada operação é planejada a partir da realidade e das necessidades do cliente.",
  },
  {
    icon: "GraduationCap",
    title: "Profissionais preparados",
    description:
      "Equipe formada de acordo com as exigências legais aplicáveis à atividade.",
  },
  {
    icon: "ShieldCheck",
    title: "Responsabilidade em primeiro lugar",
    description:
      "Compromisso com segurança, discrição e conduta profissional em todas as operações.",
  },
] as const;

export const processSteps = [
  {
    number: "01",
    title: "Entendimento",
    description: "Conhecemos a necessidade do cliente.",
  },
  {
    number: "02",
    title: "Avaliação",
    description: "Analisamos o cenário e as necessidades de segurança.",
  },
  {
    number: "03",
    title: "Proposta",
    description: "Apresentamos uma solução adequada.",
  },
  {
    number: "04",
    title: "Proteção",
    description: "Iniciamos a operação conforme o planejamento acordado.",
  },
] as const;
