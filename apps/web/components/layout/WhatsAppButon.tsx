"use client";

import { MessageCircle } from "lucide-react";
import { Link } from "@chakra-ui/react";

import { company, whatsappUrl } from "../../config/site";

export function WhatsAppButton() {
  return (
    <Link
      href={whatsappUrl()}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`Conversar com ${company.name} pelo WhatsApp`}
      position="fixed"
      bottom={5}
      right={5}
      zIndex={50}
      display="flex"
      alignItems="center"
      justifyContent="center"
      w={14}
      h={14}
      borderRadius="full"
      bg="brand.security"
      color="brand.iceForeground"
      boxShadow="xl"
      transition="transform 0.3s, background-color 0.3s"
      _hover={{ transform: "translateY(-2px)", bg: "brand.trust" }}
    >
      <MessageCircle size={24} aria-hidden="true" />
    </Link>
  );
}
