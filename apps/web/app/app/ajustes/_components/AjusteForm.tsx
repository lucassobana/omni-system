"use client";

import { Box, Button, Field, Flex, Input, NativeSelect, Stack, Textarea } from "@chakra-ui/react";
import { CheckCircle2 } from "lucide-react";
import { useActionState, useEffect, useRef, useState } from "react";
import { solicitarAjustePonto } from "../actions";

export function AjusteForm() {
  const [success, setSuccess] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const [isPending, startTransition] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSuccess(false);
    startTransition(true);

    const formData = new FormData(e.currentTarget);
    
    try {
      await solicitarAjustePonto(formData);
      setSuccess(true);
      formRef.current?.reset();
    } catch (error) {
      console.error(error);
    } finally {
      startTransition(false);
    }
  }

  // Limpa a mensagem de sucesso depois de um tempo
  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => setSuccess(false), 5000);
      return () => clearTimeout(timer);
    }
  }, [success]);

  return (
    <Box bg="card" p={5} rounded="2xl" shadow="sm" borderWidth="1px" borderColor="border">
      <form ref={formRef} onSubmit={handleSubmit}>
        <Stack gap={4}>
          <Field.Root>
            <Field.Label>Data da Ocorrência</Field.Label>
            <Input type="date" name="date" required size="lg" bg="input" borderColor="border" />
          </Field.Root>

          <Flex gap={4}>
            <Field.Root flex="1" required>
              <Field.Label>Tipo</Field.Label>
              <NativeSelect.Root size="lg">
                <NativeSelect.Field name="type" bg="input" borderColor="border">
                  <option value="clock_in">Entrada</option>
                  <option value="clock_out">Saída</option>
                </NativeSelect.Field>
                <NativeSelect.Indicator />
              </NativeSelect.Root>
            </Field.Root>

            <Field.Root flex="1" required>
              <Field.Label>Horário Sugerido</Field.Label>
              <Input type="time" name="time" required size="lg" bg="input" borderColor="border" />
            </Field.Root>
          </Flex>

          <Field.Root>
            <Field.Label>Justificativa</Field.Label>
            <Textarea 
              name="justification" 
              placeholder="Ex: Esqueci de registrar na hora, celular sem bateria..." 
              required 
              size="lg"
              rows={3}
              bg="input"
              borderColor="border"
            />
          </Field.Root>

          {success && (
            <Flex bg="green.900/30" p={3} rounded="lg" align="center" gap={2} color="green.400" borderWidth="1px" borderColor="green.900">
              <CheckCircle2 size={18} />
              <Box fontSize="sm" fontWeight="medium">Solicitação enviada ao supervisor!</Box>
            </Flex>
          )}

          <Button 
            type="submit" 
            bg="primary" 
            color="primaryForeground"
            size="lg" 
            w="full" 
            mt={2}
            loading={isPending}
            loadingText="Enviando..."
            _hover={{ opacity: 0.9 }}
          >
            Enviar Solicitação
          </Button>
        </Stack>
      </form>
    </Box>
  );
}
