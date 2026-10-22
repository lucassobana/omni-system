"use client";

import { motion, useReducedMotion } from "framer-motion";
import { Box } from "@chakra-ui/react";
import type { ReactNode } from "react";

interface RevealProps {
  children: ReactNode;
  delay?: number;
  as?: React.ElementType; // Permite passar "div", "li", "section", etc.
}

// 1. O componente animado DEVE ser criado fora da função de renderização
const MotionBox = motion.create(Box);

export function Reveal({ children, delay = 0, as = "div" }: RevealProps) {
  const shouldReduceMotion = useReducedMotion();

  // Converte o delay de milissegundos (ex: 120) para segundos (0.12) para o Framer Motion
  const delayInSeconds = delay / 1000;

  return (
    <MotionBox
      as={as}
      initial={{
        opacity: shouldReduceMotion ? 1 : 0,
        y: shouldReduceMotion ? 0 : 24,
      }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "0px 0px -8% 0px", amount: 0.12 }}
      transition={{
        duration: 0.7,
        ease: "easeOut",
        delay: shouldReduceMotion ? 0 : delayInSeconds,
      }}
    >
      {children}
    </MotionBox>
  );
}
