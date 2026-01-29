"use client";

import { ChakraProvider } from "@chakra-ui/react";
import { clmSystem } from "@/theme";
import { ColorModeProvider, type ColorModeProviderProps } from "./color-mode";
import { Toaster } from "./toaster";

export function Provider(props: ColorModeProviderProps) {
  return (
    <ChakraProvider value={clmSystem}>
      <ColorModeProvider {...props} />
      <Toaster />
    </ChakraProvider>
  );
}
