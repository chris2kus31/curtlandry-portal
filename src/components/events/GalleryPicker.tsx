"use client";

import React, { useCallback, useRef, useState } from "react";
import {
  Box,
  Button,
  HStack,
  IconButton,
  Input,
  Progress,
  SimpleGrid,
  Spinner,
  Text,
  VStack,
} from "@chakra-ui/react";
import { LuGripVertical, LuPlus, LuTrash2, LuUpload } from "react-icons/lu";
import { useColorModeValue } from "@/components/ui/color-mode";
import { mediaService, extractUploadErrorMessage } from "@/lib/api/media-service";
import { toaster } from "@/components/ui/toaster";

interface GalleryPickerProps {
  value: string[];
  onChange: (urls: string[]) => void;
  siteId?: number | null;
}

/**
 * Multi-image gallery picker. Supports:
 *  - drag/drop or click to add (one or many files at once)
 *  - reorder via native HTML5 drag handle on each tile
 *  - remove individual images
 */
export function GalleryPicker({ value, onChange, siteId }: GalleryPickerProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadingCount, setUploadingCount] = useState(0);
  const [progressByName, setProgressByName] = useState<Record<string, number>>(
    {},
  );
  const dragFromIdx = useRef<number | null>(null);

  const dropBg = useColorModeValue("gray.50", "gray.700");
  const dropBgHover = useColorModeValue("blue.50", "blue.900");
  const dropBorder = useColorModeValue("gray.300", "gray.600");
  const dropBorderActive = useColorModeValue("blue.400", "blue.300");
  const tileBorder = useColorModeValue("gray.200", "gray.700");
  const tileBg = useColorModeValue("white", "gray.800");
  const subdued = useColorModeValue("gray.600", "gray.400");

  const handleFiles = useCallback(
    async (files: FileList | File[]) => {
      const list = Array.from(files).filter((f) => f.type.startsWith("image/"));
      if (!list.length) return;
      setUploadingCount((c) => c + list.length);

      const uploaded: string[] = [];
      await Promise.all(
        list.map(async (file) => {
          try {
            const asset = await mediaService.upload(file, {
              siteId: siteId ?? null,
              onProgress: (p) =>
                setProgressByName((s) => ({ ...s, [file.name]: p })),
            });
            uploaded.push(asset.public_url);
          } catch (err) {
            toaster.create({
              title: `Failed to upload ${file.name}`,
              description: extractUploadErrorMessage(err),
              type: "error",
              duration: 6000,
            });
          } finally {
            setUploadingCount((c) => c - 1);
            setProgressByName((s) => {
              const next = { ...s };
              delete next[file.name];
              return next;
            });
          }
        }),
      );

      if (uploaded.length) {
        onChange([...value, ...uploaded]);
      }
    },
    [onChange, siteId, value],
  );

  const onPick = () => inputRef.current?.click();

  const remove = (idx: number) => {
    const next = [...value];
    next.splice(idx, 1);
    onChange(next);
  };

  const onTileDragStart = (idx: number) => (e: React.DragEvent) => {
    dragFromIdx.current = idx;
    e.dataTransfer.effectAllowed = "move";
  };
  const onTileDragOver = (e: React.DragEvent) => {
    if (dragFromIdx.current == null) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };
  const onTileDrop = (toIdx: number) => (e: React.DragEvent) => {
    e.preventDefault();
    const from = dragFromIdx.current;
    dragFromIdx.current = null;
    if (from == null || from === toIdx) return;
    const next = [...value];
    const [moved] = next.splice(from, 1);
    next.splice(toIdx, 0, moved);
    onChange(next);
  };

  const inFlight = Object.entries(progressByName);

  return (
    <VStack align="stretch" gap={3}>
      {value.length > 0 && (
        <SimpleGrid columns={{ base: 3, md: 4, lg: 5 }} gap={3}>
          {value.map((url, idx) => (
            <Box
              key={`${url}-${idx}`}
              position="relative"
              borderWidth="1px"
              borderColor={tileBorder}
              borderRadius="md"
              overflow="hidden"
              bg={tileBg}
              style={{ aspectRatio: "1/1" }}
              maxW="180px"
              draggable
              onDragStart={onTileDragStart(idx)}
              onDragOver={onTileDragOver}
              onDrop={onTileDrop(idx)}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={url}
                alt={`gallery ${idx + 1}`}
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                  display: "block",
                }}
              />
              <HStack
                position="absolute"
                top={1}
                left={1}
                right={1}
                justify="space-between"
              >
                <Box
                  bg="blackAlpha.700"
                  color="white"
                  borderRadius="full"
                  px={2}
                  py={1}
                  cursor="grab"
                  fontSize="xs"
                  display="flex"
                  alignItems="center"
                  gap={1}
                  _active={{ cursor: "grabbing" }}
                >
                  <LuGripVertical size={12} /> {idx + 1}
                </Box>
                <IconButton
                  aria-label="Remove image"
                  size="2xs"
                  variant="solid"
                  colorPalette="red"
                  onClick={() => remove(idx)}
                >
                  <LuTrash2 />
                </IconButton>
              </HStack>
            </Box>
          ))}
        </SimpleGrid>
      )}

      <Box
        onClick={onPick}
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(e) => {
          // Only treat as a file drop if no tile drag is in progress.
          if (dragFromIdx.current != null) return;
          e.preventDefault();
          setIsDragging(false);
          if (e.dataTransfer.files?.length) handleFiles(e.dataTransfer.files);
        }}
        cursor="pointer"
        borderWidth="2px"
        borderStyle="dashed"
        borderColor={isDragging ? dropBorderActive : dropBorder}
        borderRadius="md"
        bg={isDragging ? dropBgHover : dropBg}
        px={6}
        py={6}
        textAlign="center"
        transition="all 0.15s ease"
      >
        <VStack gap={1}>
          {uploadingCount > 0 ? (
            <>
              <Spinner />
              <Text fontSize="sm" color={subdued}>
                Uploading {uploadingCount}{" "}
                image{uploadingCount === 1 ? "" : "s"}…
              </Text>
            </>
          ) : (
            <>
              <HStack>
                <LuPlus />
                <Text fontSize="sm" fontWeight={500}>
                  Click or drop images to add
                </Text>
              </HStack>
              <Text fontSize="xs" color={subdued}>
                You can drop multiple at once · drag tiles to reorder
              </Text>
            </>
          )}
        </VStack>

        {inFlight.length > 0 && (
          <VStack mt={3} gap={1} align="stretch">
            {inFlight.map(([name, p]) => (
              <Box key={name}>
                <Text fontSize="xs" truncate>
                  {name}
                </Text>
                <Progress.Root value={p} size="xs">
                  <Progress.Track>
                    <Progress.Range />
                  </Progress.Track>
                </Progress.Root>
              </Box>
            ))}
          </VStack>
        )}
      </Box>

      {value.length > 0 && (
        <HStack>
          <Button size="sm" variant="outline" onClick={onPick} px={4}>
            <LuUpload /> Add more
          </Button>
        </HStack>
      )}

      <Input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        display="none"
        onChange={(e) => {
          if (e.target.files?.length) handleFiles(e.target.files);
          e.target.value = "";
        }}
      />
    </VStack>
  );
}
