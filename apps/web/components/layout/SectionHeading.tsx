"use client";

import { Heading, Text, VStack } from "@chakra-ui/react";
import type { ReactNode } from "react";

interface SectionHeadingProps {
  eyebrow?: string;
  title: ReactNode;
  description?: ReactNode;
  align?: "left" | "center";
  tone?: "light" | "dark";
}

export function SectionHeading({
  eyebrow,
  title,
  description,
  align = "left",
  tone = "light",
}: SectionHeadingProps) {
  const isDark = tone === "dark";

  return (
    <VStack
      align={align === "center" ? "center" : "flex-start"}
      textAlign={align}
      maxW="3xl"
      mx={align === "center" ? "auto" : undefined}
      gap={4}
    >
      {eyebrow && (
        <Text
          fontSize="xs"
          fontWeight="bold"
          textTransform="uppercase"
          letterSpacing="0.22em"
          color={isDark ? "brand.ice" : "brand.security"}
        >
          {eyebrow}
        </Text>
      )}
      <Heading
        as="h2"
        fontSize={{ base: "3xl", sm: "4xl", lg: "5xl" }}
        fontWeight="bold"
        lineHeight="1.1"
        letterSpacing="tight"
        color={isDark ? "brand.iceForeground" : "fg"}
      >
        {title}
      </Heading>
      {description && (
        <Text
          fontSize={{ base: "base", sm: "lg" }}
          lineHeight="relaxed"
          color={isDark ? "whiteAlpha.800" : "mutedForeground"}
          mt={1}
        >
          {description}
        </Text>
      )}
    </VStack>
  );
}
