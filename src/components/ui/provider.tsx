"use client";

import { ChakraProvider } from "@chakra-ui/react";
import { clmSystem } from "@/theme";
import { ColorModeProvider, type ColorModeProviderProps } from "./color-mode";

export function Provider(props: ColorModeProviderProps) {
  return (
    <ChakraProvider value={clmSystem}>
      <ColorModeProvider {...props} />
    </ChakraProvider>
  );
}
