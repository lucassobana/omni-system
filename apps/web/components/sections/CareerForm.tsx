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
  Flex
} from "@chakra-ui/react";
import { UploadCloud } from "lucide-react";

import { Reveal } from "../layout/Reveal";
import { SectionHeading } from "../layout/SectionHeading";
import { company } from "../../config/site";
import {
  isLeadDeliveryConfigured,
  submitJobApplication,
  type JobApplicationPayload,
} from "../../lib/lead";

const schema = z.object({
  name: z.string().trim().min(2, "Informe seu nome.").max(100),
  phone: z.string().trim().min(10, "Informe um telefone válido.").max(20),
  email: z.string().trim().email("Informe um e-mail válido.").max(255),
  area: z.string().trim().min(1, "Selecione uma área de interesse."),
  message: z.string().trim().max(1000).optional(),
});

type Errors = Partial<Record<keyof JobApplicationPayload, string>>;

export function CareerForm() {
  const [errors, setErrors] = useState<Errors>({});
  const [notice, setNotice] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const areas = ["Vigilância Patrimonial", "Limpeza e Conservação", "Recepção e Portaria", "Administrativo", "Outro"];

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setNotice(null);
    setIsSubmitting(true);

    const formData = new FormData(event.currentTarget);
    const raw = {
      name: String(formData.get("name") ?? ""),
      phone: String(formData.get("phone") ?? ""),
      email: String(formData.get("email") ?? ""),
      area: String(formData.get("area") ?? ""),
      message: String(formData.get("message") ?? ""),
    };

    const result = schema.safeParse(raw);
    const nextErrors: Errors = {};

    if (!result.success) {
      for (const issue of result.error.issues) {
        const key = issue.path[0] as keyof JobApplicationPayload;
        if (!nextErrors[key]) nextErrors[key] = issue.message;
      }
    }

    if (!selectedFile) {
      nextErrors.resumeFile = "Por favor, anexe o seu currículo.";
    }

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      setIsSubmitting(false);
      return;
    }

    setErrors({});

    if (!isLeadDeliveryConfigured) {
      setNotice(
        "O envio automático ainda não está configurado. Por enquanto, entre em contato pelo WhatsApp, telefone ou e-mail informados nesta página."
      );
      setIsSubmitting(false);
      return;
    }

    try {
      if (result.success) {
        await submitJobApplication({
          ...result.data,
          resumeFile: selectedFile as File,
        });
        setNotice("Currículo enviado com sucesso! Boa sorte no processo seletivo.");
        event.currentTarget.reset();
        setSelectedFile(null);
      }
    } catch {
      setNotice("Ocorreu um erro ao enviar o currículo. Tente novamente mais tarde.");
    } finally {
      setIsSubmitting(false);
    }
  }

  const labelStyle = {
    display: "block",
    fontSize: "0.875rem",
    fontWeight: 500,
    marginBottom: "8px",
  };

  return (
    <Box
      as="section"
      id="carreira"
      borderTopWidth="1px"
      borderColor="border"
      bg="bg"
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
                eyebrow="Trabalhe Conosco"
                title="Junte-se à nossa equipe."
                description="Estamos sempre em busca de talentos para fortalecer nossa operação. Envie seu currículo e faça parte da Omni Segurança Privada."
              />
              <Stack as="dl" gap={5} mt={10} fontSize="sm">
                <Box>
                  <Text as="dt" fontWeight="semibold" color="fg">
                    Dúvidas sobre vagas?
                  </Text>
                  <Text as="dd" color="mutedForeground">
                    Entre em contato pelo RH: {company.email}
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
                <form noValidate onSubmit={handleSubmit}>
                  <Grid
                    gap={5}
                    templateColumns={{ base: "1fr", sm: "repeat(2, 1fr)" }}
                  >
                    <GridItem colSpan={{ base: 1, sm: 2 }}>
                      <label htmlFor="career-name" style={labelStyle}>
                        Nome completo*
                      </label>
                      <Input
                        id="career-name"
                        name="name"
                        autoComplete="name"
                        h={11}
                        bg="bg"
                        borderColor={errors.name ? "destructive" : "border"}
                      />
                      {errors.name && (
                        <Text color="destructive" fontSize="xs" mt={1} fontWeight="medium">
                          {errors.name}
                        </Text>
                      )}
                    </GridItem>

                    <GridItem>
                      <label htmlFor="career-phone" style={labelStyle}>
                        Telefone / WhatsApp*
                      </label>
                      <Input
                        id="career-phone"
                        name="phone"
                        type="tel"
                        inputMode="tel"
                        autoComplete="tel"
                        h={11}
                        bg="bg"
                        borderColor={errors.phone ? "destructive" : "border"}
                      />
                      {errors.phone && (
                        <Text color="destructive" fontSize="xs" mt={1} fontWeight="medium">
                          {errors.phone}
                        </Text>
                      )}
                    </GridItem>

                    <GridItem>
                      <label htmlFor="career-email" style={labelStyle}>
                        E-mail*
                      </label>
                      <Input
                        id="career-email"
                        name="email"
                        type="email"
                        autoComplete="email"
                        h={11}
                        bg="bg"
                        borderColor={errors.email ? "destructive" : "border"}
                      />
                      {errors.email && (
                        <Text color="destructive" fontSize="xs" mt={1} fontWeight="medium">
                          {errors.email}
                        </Text>
                      )}
                    </GridItem>

                    <GridItem colSpan={{ base: 1, sm: 2 }}>
                      <label htmlFor="career-area" style={labelStyle}>
                        Área de interesse*
                      </label>
                      <Box
                        h={11}
                        w="full"
                        borderRadius="md"
                        borderWidth="1px"
                        borderColor={errors.area ? "destructive" : "border"}
                        bg="bg"
                        px={3}
                        overflow="hidden"
                      >
                        <select
                          id="career-area"
                          name="area"
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
                          {areas.map((a) => (
                            <option key={a} value={a}>
                              {a}
                            </option>
                          ))}
                        </select>
                      </Box>
                      {errors.area && (
                        <Text color="destructive" fontSize="xs" mt={1} fontWeight="medium">
                          {errors.area}
                        </Text>
                      )}
                    </GridItem>

                    <GridItem colSpan={{ base: 1, sm: 2 }}>
                      <label htmlFor="career-resume" style={labelStyle}>
                        Anexar Currículo (PDF ou DOCX)*
                      </label>
                      <Flex
                        align="center"
                        justify="center"
                        direction="column"
                        gap={3}
                        p={6}
                        borderWidth={2}
                        borderStyle="dashed"
                        borderColor={errors.resumeFile ? "destructive" : "border"}
                        borderRadius="md"
                        bg="bg"
                        position="relative"
                        _hover={{ borderColor: "ring" }}
                        transition="all 0.2s"
                        cursor="pointer"
                      >
                        <Input
                          id="career-resume"
                          type="file"
                          accept=".pdf,.doc,.docx"
                          position="absolute"
                          top={0}
                          left={0}
                          w="full"
                          h="full"
                          opacity={0}
                          cursor="pointer"
                          onChange={(e) => {
                            if (e.target.files && e.target.files.length > 0) {
                              setSelectedFile(e.target.files[0]);
                              setErrors(prev => ({ ...prev, resumeFile: undefined }));
                            }
                          }}
                        />
                        <UploadCloud size={32} color="var(--chakra-colors-mutedForeground)" />
                        <Text fontSize="sm" color={selectedFile ? "fg" : "mutedForeground"} textAlign="center">
                          {selectedFile ? (
                            <strong>{selectedFile.name}</strong>
                          ) : (
                            "Clique ou arraste seu arquivo aqui."
                          )}
                        </Text>
                      </Flex>
                      {errors.resumeFile && (
                        <Text color="destructive" fontSize="xs" mt={1} fontWeight="medium">
                          {errors.resumeFile}
                        </Text>
                      )}
                    </GridItem>

                    <GridItem colSpan={{ base: 1, sm: 2 }}>
                      <label htmlFor="career-message" style={labelStyle}>
                        Mensagem ou carta de apresentação (Opcional)
                      </label>
                      <Textarea
                        id="career-message"
                        name="message"
                        rows={3}
                        maxLength={1000}
                        bg="bg"
                        borderColor={errors.message ? "destructive" : "border"}
                      />
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
                    Enviar Currículo
                  </Button>

                  {notice && (
                    <Text
                      aria-live="polite"
                      mt={4}
                      fontSize="sm"
                      lineHeight="relaxed"
                      color={notice.includes("erro") ? "destructive" : "mutedForeground"}
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
