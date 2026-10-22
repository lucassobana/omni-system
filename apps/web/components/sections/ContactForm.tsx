"use client";

import { useState, type FormEvent } from "react";
import { z } from "zod";
import {
  Box,
  Grid,
  GridItem,
  Text,
  Container,
  Input,
  Textarea,
  Button,
  Stack,
} from "@chakra-ui/react";

import { Reveal } from "../layout/Reveal";
import { SectionHeading } from "../layout/SectionHeading";
import { company, services } from "../../config/site";
import {
  isLeadDeliveryConfigured,
  submitLead,
  type LeadPayload,
} from "../../lib/lead";

const schema = z.object({
  name: z.string().trim().min(2, "Informe seu nome.").max(100),
  companyName: z.string().trim().max(120).optional().or(z.literal("")),
  phone: z
    .string()
    .trim()
    .min(10, "Informe um telefone válido com DDD.")
    .max(20, "Telefone muito longo."),
  email: z.string().trim().email("Informe um e-mail válido.").max(255),
  service: z.string().trim().min(1, "Selecione um serviço."),
  message: z
    .string()
    .trim()
    .min(10, "Descreva brevemente a necessidade.")
    .max(1000),
});

type Errors = Partial<Record<keyof LeadPayload, string>>;

export function ContactForm() {
  const [errors, setErrors] = useState<Errors>({});
  const [notice, setNotice] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setNotice(null);
    setIsSubmitting(true);

    const formData = new FormData(event.currentTarget);
    const raw = {
      name: String(formData.get("name") ?? ""),
      companyName: String(formData.get("companyName") ?? ""),
      phone: String(formData.get("phone") ?? ""),
      email: String(formData.get("email") ?? ""),
      service: String(formData.get("service") ?? ""),
      message: String(formData.get("message") ?? ""),
    };

    const result = schema.safeParse(raw);
    if (!result.success) {
      const nextErrors: Errors = {};
      for (const issue of result.error.issues) {
        const key = issue.path[0] as keyof LeadPayload;
        if (!nextErrors[key]) nextErrors[key] = issue.message;
      }
      setErrors(nextErrors);
      setIsSubmitting(false);
      return;
    }

    setErrors({});

    if (!isLeadDeliveryConfigured) {
      setNotice(
        "O envio automático ainda não está configurado. Por enquanto, entre em contato pelo WhatsApp, telefone ou e-mail informados nesta página.",
      );
      setIsSubmitting(false);
      return;
    }

    try {
      await submitLead({
        ...result.data,
        companyName: result.data.companyName ?? "",
      });
      setNotice(
        "Mensagem enviada com sucesso! Entraremos em contato em breve.",
      );
      event.currentTarget.reset();
    } catch {
      // Removida a declaração da variável de erro (error) para satisfazer o ESLint
      setNotice(
        "Ocorreu um erro ao enviar a mensagem. Tente novamente mais tarde.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  // Estilo inline reaproveitável para todas as labels (sem erros no TypeScript)
  const labelStyle = {
    display: "block",
    fontSize: "0.875rem",
    fontWeight: 500,
    marginBottom: "8px",
  };

  return (
    <Box
      as="section"
      id="contato"
      borderTopWidth="1px"
      borderColor="border"
      bg="secondary"
      py={{ base: 20, sm: 28, lg: 32 }}
    >
      <Container maxW="7xl" px={{ base: 4, sm: 6, lg: 8 }}>
        <Grid
          templateColumns={{ base: "1fr", lg: "0.85fr 1.15fr" }}
          gap={{ base: 12, lg: 20 }}
        >
          <GridItem>
            <Reveal>
              <SectionHeading
                eyebrow="Contato"
                title="Solicite um orçamento."
                description="Preencha o formulário e nossa equipe entrará em contato para entender a sua necessidade."
              />
              <Stack as="dl" gap={5} mt={10} fontSize="sm">
                <Box>
                  <Text as="dt" fontWeight="semibold" color="fg">
                    Telefone
                  </Text>
                  <Text as="dd" color="mutedForeground">
                    {company.phone}
                  </Text>
                </Box>
                <Box>
                  <Text as="dt" fontWeight="semibold" color="fg">
                    E-mail
                  </Text>
                  <Text as="dd" color="mutedForeground">
                    {company.email}
                  </Text>
                </Box>
                <Box>
                  <Text as="dt" fontWeight="semibold" color="fg">
                    Endereço
                  </Text>
                  <Text as="dd" color="mutedForeground">
                    {company.address} — {company.city}
                  </Text>
                </Box>
              </Stack>
            </Reveal>
          </GridItem>

          <GridItem>
            <Reveal delay={120}>
              <Box
                borderRadius="lg"
                borderWidth="1px"
                borderColor="border"
                bg="card"
                p={{ base: 6, sm: 8 }}
                boxShadow="sm"
              >
                {/* O formulário agora é uma tag nativa envolvendo o Grid, resolvendo o erro do onSubmit */}
                <form noValidate onSubmit={handleSubmit}>
                  <Grid
                    gap={5}
                    templateColumns={{ base: "1fr", sm: "repeat(2, 1fr)" }}
                  >
                    <GridItem>
                      <label htmlFor="name" style={labelStyle}>
                        Nome*
                      </label>
                      <Input
                        id="name"
                        name="name"
                        autoComplete="name"
                        h={11}
                        bg="bg"
                        borderColor={errors.name ? "destructive" : "border"}
                      />
                      {errors.name && (
                        <Text
                          color="destructive"
                          fontSize="xs"
                          mt={1}
                          fontWeight="medium"
                        >
                          {errors.name}
                        </Text>
                      )}
                    </GridItem>

                    <GridItem>
                      <label htmlFor="companyName" style={labelStyle}>
                        Empresa
                      </label>
                      <Input
                        id="companyName"
                        name="companyName"
                        autoComplete="organization"
                        h={11}
                        bg="bg"
                        borderColor="border"
                      />
                    </GridItem>

                    <GridItem>
                      <label htmlFor="phone" style={labelStyle}>
                        Telefone / WhatsApp*
                      </label>
                      <Input
                        id="phone"
                        name="phone"
                        type="tel"
                        inputMode="tel"
                        autoComplete="tel"
                        h={11}
                        bg="bg"
                        borderColor={errors.phone ? "destructive" : "border"}
                      />
                      {errors.phone && (
                        <Text
                          color="destructive"
                          fontSize="xs"
                          mt={1}
                          fontWeight="medium"
                        >
                          {errors.phone}
                        </Text>
                      )}
                    </GridItem>

                    <GridItem>
                      <label htmlFor="email" style={labelStyle}>
                        E-mail*
                      </label>
                      <Input
                        id="email"
                        name="email"
                        type="email"
                        autoComplete="email"
                        h={11}
                        bg="bg"
                        borderColor={errors.email ? "destructive" : "border"}
                      />
                      {errors.email && (
                        <Text
                          color="destructive"
                          fontSize="xs"
                          mt={1}
                          fontWeight="medium"
                        >
                          {errors.email}
                        </Text>
                      )}
                    </GridItem>

                    <GridItem colSpan={{ base: 1, sm: 2 }}>
                      <label htmlFor="service" style={labelStyle}>
                        Serviço de interesse*
                      </label>

                      {/* Envolvemos o select nativo com o Box estilizado do Chakra UI */}
                      <Box
                        h={11}
                        w="full"
                        borderRadius="md"
                        borderWidth="1px"
                        borderColor={errors.service ? "destructive" : "border"}
                        bg="bg"
                        px={3}
                        overflow="hidden"
                      >
                        <select
                          id="service"
                          name="service"
                          defaultValue=""
                          style={{
                            width: "100%",
                            height: "100%",
                            outline: "none",
                            backgroundColor: "transparent",
                            color: "inherit",
                            fontSize: "0.875rem",
                          }}
                        >
                          <option value="">Selecione uma opção</option>
                          {services.map((service) => (
                            <option key={service.title} value={service.title}>
                              {service.title}
                            </option>
                          ))}
                          <option value="Outro">Outro</option>
                        </select>
                      </Box>
                      {errors.service && (
                        <Text
                          color="destructive"
                          fontSize="xs"
                          mt={1}
                          fontWeight="medium"
                        >
                          {errors.service}
                        </Text>
                      )}
                    </GridItem>

                    <GridItem colSpan={{ base: 1, sm: 2 }}>
                      <label htmlFor="message" style={labelStyle}>
                        Mensagem*
                      </label>
                      <Textarea
                        id="message"
                        name="message"
                        rows={5}
                        maxLength={1000}
                        bg="bg"
                        borderColor={errors.message ? "destructive" : "border"}
                      />
                      {errors.message && (
                        <Text
                          color="destructive"
                          fontSize="xs"
                          mt={1}
                          fontWeight="medium"
                        >
                          {errors.message}
                        </Text>
                      )}
                    </GridItem>
                  </Grid>

                  <Button
                    type="submit"
                    mt={7}
                    w={{ base: "full", sm: "auto" }}
                    h="3.5rem"
                    px={8}
                    bg="linear-gradient(140deg, #141e2bff 0%, #193752ff 55%, #1e4a6bff 100%)"
                    color="fg"
                    _hover={{ bg: "brand.trust" }}
                    loading={isSubmitting}
                  >
                    Solicitar orçamento
                  </Button>

                  {notice && (
                    <Text
                      aria-live="polite"
                      mt={4}
                      fontSize="sm"
                      lineHeight="relaxed"
                      color="mutedForeground"
                    >
                      {notice}
                    </Text>
                  )}
                </form>
              </Box>
            </Reveal>
          </GridItem>
        </Grid>
      </Container>
    </Box>
  );
}
