import { Dialog as ChakraDialog, Portal } from "@chakra-ui/react"
import { CloseButton } from "./close-button"
import * as React from "react"

interface DialogContentProps extends ChakraDialog.ContentProps {
  portalled?: boolean
  portalRef?: React.RefObject<HTMLElement | null>
  backdrop?: boolean
}

export const DialogContent = React.forwardRef<
  HTMLDivElement,
  DialogContentProps
>(function DialogContent(props, ref) {
  const {
    children,
    portalled = true,
    portalRef,
    backdrop = true,
    ...rest
  } = props

  return (
    <Portal disabled={!portalled} container={portalRef}>
      {backdrop && (
        <ChakraDialog.Backdrop
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(0, 0, 0, 0.75)",
            backdropFilter: "blur(6px)",
            WebkitBackdropFilter: "blur(6px)",
            zIndex: 1400,
          }}
        />
      )}
      <ChakraDialog.Positioner
        style={{
          position: "fixed",
          inset: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "100svh",
          width: "100%",
          padding: "1rem",
          zIndex: 1500,
          pointerEvents: "none",
        }}
      >
        <ChakraDialog.Content
          ref={ref}
          my="auto"
          bg="#0F1D33"
          color="fg"
          borderWidth="1px"
          borderColor="border.subtle"
          rounded="2xl"
          shadow="2xl"
          style={{
            backgroundColor: "#0F1D33",
            color: "#F4F6F9",
            border: "1px solid rgba(255, 255, 255, 0.12)",
            boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.8)",
            borderRadius: "1rem",
            pointerEvents: "auto",
          }}
          {...rest}
          asChild={false}
        >
          {children}
        </ChakraDialog.Content>
      </ChakraDialog.Positioner>
    </Portal>
  )
})

export const DialogCloseTrigger = React.forwardRef<
  HTMLButtonElement,
  ChakraDialog.CloseTriggerProps
>(function DialogCloseTrigger(props, ref) {
  return (
    <ChakraDialog.CloseTrigger
      position="absolute"
      top="2"
      insetEnd="2"
      {...props}
      asChild
    >
      <CloseButton size="sm" ref={ref}>
        {props.children}
      </CloseButton>
    </ChakraDialog.CloseTrigger>
  )
})

export const DialogRoot = React.forwardRef<
  HTMLDivElement,
  ChakraDialog.RootProps
>(function DialogRoot(props, ref) {
  return <ChakraDialog.Root placement="center" {...props} />
})

export const DialogFooter = ChakraDialog.Footer
export const DialogHeader = ChakraDialog.Header
export const DialogBody = ChakraDialog.Body
export const DialogBackdrop = React.forwardRef<
  HTMLDivElement,
  ChakraDialog.BackdropProps
>(function DialogBackdrop(props, ref) {
  return (
    <ChakraDialog.Backdrop
      ref={ref}
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(0, 0, 0, 0.75)",
        backdropFilter: "blur(6px)",
        WebkitBackdropFilter: "blur(6px)",
        zIndex: 1400,
      }}
      {...props}
    />
  )
})
export const DialogTitle = ChakraDialog.Title
export const DialogDescription = ChakraDialog.Description
export const DialogTrigger = ChakraDialog.Trigger
export const DialogActionTrigger = ChakraDialog.ActionTrigger
