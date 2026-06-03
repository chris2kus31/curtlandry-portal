"use client";

import React, { useCallback, useRef, useState } from "react";
import {
  Box,
  Button,
  HStack,
  Input,
  Spinner,
  Text,
  VStack,
} from "@chakra-ui/react";
import { LuUpload, LuX } from "react-icons/lu";
import { useColorModeValue } from "@/components/ui/color-mode";
import { mediaService } from "@/lib/api/media-service";
import { toaster } from "@/components/ui/toaster";

interface ImagePickerProps {
  value: string;
  onChange: (url: string) => void;
  siteId?: number | null;
  /** "16/9" | "4/3" | "1/1" etc. */
  aspectRatio?: string;
  /** Max width of the preview tile. Default ~ a sensible thumbnail. */
  maxWidth?: string;
  label?: string;
}

/**
 * Single-image picker with click + drag/drop upload. Stores the resulting
 * public URL on the form (caller owns the state). Once uploaded, shows the
 * image with replace / remove controls.
 */
export function ImagePicker({
  value,
  onChange,
  siteId,
  aspectRatio = "16/9",
  maxWidth = "360px",
  label = "Click or drop an image",
}: ImagePickerProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  const dropBg = useColorModeValue("gray.50", "gray.700");
  const dropBgHover = useColorModeValue("blue.50", "blue.900");
  const dropBorder = useColorModeValue("gray.300", "gray.600");
  const dropBorderActive = useColorModeValue("blue.400", "blue.300");
  const subdued = useColorModeValue("gray.600", "gray.400");

  const handleFile = useCallback(
    async (file: File) => {
      if (!file.type.startsWith("image/")) {
        toaster.create({
          title: "Unsupported file",
          description: "Only image files are allowed.",
          type: "error",
          duration: 4000,
        });
        return;
      }
      setIsUploading(true);
      setProgress(0);
      try {
        const asset = await mediaService.upload(file, {
          siteId: siteId ?? null,
          onProgress: setProgress,
        });
        onChange(asset.public_url);
        toaster.create({
          title: "Image uploaded",
          type: "success",
          duration: 2000,
        });
      } catch (err) {
        toaster.create({
          title: "Upload failed",
          description: err instanceof Error ? err.message : "Unknown error",
          type: "error",
          duration: 5000,
        });
      } finally {
        setIsUploading(false);
        setProgress(0);
      }
    },
    [onChange, siteId],
  );

  const onPick = () => inputRef.current?.click();

  if (value) {
    return (
      <VStack align="stretch" gap={2}>
        <Box
          position="relative"
          borderRadius="md"
          overflow="hidden"
          borderWidth="1px"
          borderColor={dropBorder}
          style={{ aspectRatio }}
          width="100%"
          maxW={maxWidth}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={value}
            alt="hero preview"
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              display: "block",
            }}
          />
        </Box>
        <HStack>
          <Button size="sm" variant="outline" onClick={onPick} px={4}>
            <LuUpload /> Replace
          </Button>
          <Button
            size="sm"
            variant="ghost"
            colorPalette="red"
            onClick={() => onChange("")}
            px={4}
          >
            <LuX /> Remove
          </Button>
        </HStack>
        <Input
          ref={inputRef}
          type="file"
          accept="image/*"
          display="none"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) handleFile(f);
            e.target.value = "";
          }}
        />
      </VStack>
    );
  }

  return (
    <Box
      onClick={onPick}
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragging(true);
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setIsDragging(false);
        const f = e.dataTransfer.files?.[0];
        if (f) handleFile(f);
      }}
      cursor="pointer"
      borderWidth="2px"
      borderStyle="dashed"
      borderColor={isDragging ? dropBorderActive : dropBorder}
      borderRadius="md"
      bg={isDragging ? dropBgHover : dropBg}
      px={6}
      py={8}
      transition="all 0.15s ease"
      style={{ aspectRatio }}
      width="100%"
      maxW={maxWidth}
      display="flex"
      alignItems="center"
      justifyContent="center"
    >
      <VStack gap={2}>
        {isUploading ? (
          <>
            <Spinner />
            <Text fontSize="sm" color={subdued}>
              Uploading… {progress}%
            </Text>
          </>
        ) : (
          <>
            <LuUpload size={28} />
            <Text fontSize="sm" fontWeight={500}>
              {label}
            </Text>
            <Text fontSize="xs" color={subdued}>
              JPG, PNG, WEBP, GIF, SVG · up to 10 MB
            </Text>
          </>
        )}
      </VStack>
      <Input
        ref={inputRef}
        type="file"
        accept="image/*"
        display="none"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handleFile(f);
          e.target.value = "";
        }}
      />
    </Box>
  );
}
