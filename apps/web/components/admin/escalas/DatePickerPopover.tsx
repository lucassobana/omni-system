"use client";

import { Box, Text, Portal } from "@chakra-ui/react";
import { PopoverRoot, PopoverTrigger, PopoverContent, PopoverBody, PopoverArrow } from "@chakra-ui/react";
import { Calendar as CalendarIcon } from "lucide-react";
import { DayPicker } from "react-day-picker";
import { ptBR } from "date-fns/locale";
import { format, parseISO } from "date-fns";
import "react-day-picker/style.css"; // Ensure standard styles are loaded

import { useState } from "react";

interface DatePickerPopoverProps {
  value: string; // ISO format YYYY-MM-DD
  onChange: (date: string) => void;
  minDate?: string;
  maxDate?: string;
}

export function DatePickerPopover({ value, onChange, minDate, maxDate }: DatePickerPopoverProps) {
  const [open, setOpen] = useState(false);

  const selected = value ? parseISO(value) : undefined;
  const min = minDate ? parseISO(minDate) : undefined;
  const max = maxDate ? parseISO(maxDate) : undefined;
  
  const disabled = [];
  if (min) disabled.push({ before: min });
  if (max) disabled.push({ after: max });

  const handleSelect = (date: Date | undefined) => {
    if (date) {
      onChange(format(date, "yyyy-MM-dd"));
      setOpen(false);
    }
  };

  return (
    <Box position="relative" w="full">
      <PopoverRoot open={open} onOpenChange={(e) => setOpen(e.open)}>
        <PopoverTrigger asChild>
          <Box
            as="button"
            display="flex"
            alignItems="center"
            gap={2}
            bg="bg.surface"
            borderWidth="1px"
            borderColor="border.subtle"
            px={3}
            py={1.5}
            rounded="lg"
            width="full"
            _hover={{ borderColor: "border.emphasized" }}
            transition="all 0.2s"
            textAlign="left"
          >
            <CalendarIcon size={14} color="var(--chakra-colors-fg-muted)" />
            <Text fontSize="sm" color={selected ? "fg" : "fg.muted"}>
              {selected ? format(selected, "dd/MM/yyyy") : "Selecionar data"}
            </Text>
          </Box>
        </PopoverTrigger>
        
        <PopoverContent
          position="absolute"
          top="calc(100% + 4px)"
          left="0"
          bg="brand.deep"
          borderColor="border"
          shadow="2xl"
          rounded="xl"
          w="full"
          minW="260px"
          p={2}
          color="white"
          zIndex={9999}
        >
          <PopoverArrow bg="brand.deep" />
          <PopoverBody p={0}>
            <style>{`
              .rdp-root {
                --rdp-day-height: 32px;
                --rdp-day-width: 32px;
                --rdp-day_button-height: 32px;
                --rdp-day_button-width: 32px;
                --rdp-day_button-border-radius: 6px;
                --rdp-accent-color: var(--chakra-colors-brand-security);
                --rdp-accent-background-color: var(--chakra-colors-brand-security);
                --rdp-today-color: var(--chakra-colors-brand-security);
                --rdp-selected-border: none;
                --rdp-nav_button-width: 28px;
                --rdp-nav_button-height: 28px;
                margin: 0;
              }
              .rdp-day_button {
                border-radius: 6px;
                color: var(--chakra-colors-fg);
              }
              .rdp-day_button:hover:not(:disabled) {
                background-color: var(--chakra-colors-accent);
              }
              .rdp-selected .rdp-day_button {
                background-color: var(--chakra-colors-brand-security) !important;
                color: var(--chakra-colors-fg) !important;
                font-weight: 600;
              }
              .rdp-weekday {
                font-weight: 600;
                font-size: 0.75rem;
                text-transform: uppercase;
                color: var(--chakra-colors-brand-metal);
                padding-bottom: 0.5rem;
              }
              .rdp-month_caption {
                font-size: 0.95rem;
                font-weight: 600;
                color: var(--chakra-colors-fg);
              }
              .rdp-button_next, .rdp-button_previous {
                color: var(--chakra-colors-mutedForeground);
                border-radius: 6px;
              }
              .rdp-button_next:hover:not(:disabled), .rdp-button_previous:hover:not(:disabled) {
                background-color: var(--chakra-colors-accent);
                color: var(--chakra-colors-fg);
              }
              .rdp-chevron {
                fill: currentColor;
              }
              .rdp-outside {
                color: var(--chakra-colors-mutedForeground);
                opacity: 0.5;
              }
            `}</style>
          <DayPicker
            mode="single"
            selected={selected}
            onSelect={handleSelect}
            locale={ptBR}
            disabled={disabled}
            defaultMonth={selected || min || undefined}
          />
        </PopoverBody>
        </PopoverContent>
      </PopoverRoot>
    </Box>
  );
}
