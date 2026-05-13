"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Box,
  Card,
  Heading,
  HStack,
  Text,
  VStack,
  Badge,
  Skeleton,
  IconButton,
  Input,
  SimpleGrid,
  Flex,
  Textarea,
} from "@chakra-ui/react";
import { useColorModeValue } from "@/components/ui/color-mode";
import { toaster } from "@/components/ui/toaster";
import {
  LuGlobe,
  LuPlus,
  LuArrowLeft,
  LuPencil,
  LuTrash2,
  LuEye,
  LuEyeOff,
  LuFileText,
  LuChevronDown,
  LuChevronUp,
  LuSave,
  LuExternalLink,
} from "react-icons/lu";
import { siteService } from "@/lib/api";
import type {
  Site,
  SitePage,
  SitePageSection,
  SchemaField,
} from "@/lib/api/site-service";

type View = "sites" | "pages" | "sections";

export default function SitesAdminPage() {
  const [view, setView] = useState<View>("sites");
  const [sites, setSites] = useState<Site[]>([]);
  const [pages, setPages] = useState<SitePage[]>([]);
  const [sections, setSections] = useState<SitePageSection[]>([]);
  const [selectedSite, setSelectedSite] = useState<Site | null>(null);
  const [selectedPage, setSelectedPage] = useState<SitePage | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<number | null>(null);

  const cardBg = useColorModeValue("white", "gray.900");
  const borderColor = useColorModeValue("gray.200", "gray.700");
  const mutedText = useColorModeValue("gray.500", "gray.400");

  // Load sites
  const loadSites = useCallback(async () => {
    try {
      setLoading(true);
      const data = await siteService.getSites();
      setSites(data);
    } catch {
      toaster.create({ title: "Failed to load sites", type: "error" });
    } finally {
      setLoading(false);
    }
  }, []);

  // Load pages for a site
  const loadPages = useCallback(async (siteId: number) => {
    try {
      setLoading(true);
      const data = await siteService.getPages(siteId);
      setPages(data);
    } catch {
      toaster.create({ title: "Failed to load pages", type: "error" });
    } finally {
      setLoading(false);
    }
  }, []);

  // Load sections for a page
  const loadSections = useCallback(async (pageId: number) => {
    try {
      setLoading(true);
      const data = await siteService.getSections(pageId);
      setSections(data);
    } catch {
      toaster.create({ title: "Failed to load sections", type: "error" });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSites();
  }, [loadSites]);

  const openSite = (site: Site) => {
    setSelectedSite(site);
    setView("pages");
    loadPages(site.id);
  };

  const openPage = (page: SitePage) => {
    setSelectedPage(page);
    setView("sections");
    loadSections(page.id);
  };

  const goBack = () => {
    if (view === "sections") {
      setView("pages");
      setSelectedPage(null);
      if (selectedSite) loadPages(selectedSite.id);
    } else if (view === "pages") {
      setView("sites");
      setSelectedSite(null);
      loadSites();
    }
  };

  const togglePagePublished = async (page: SitePage) => {
    if (!selectedSite) return;
    try {
      await siteService.updatePage(selectedSite.id, page.id, {
        is_published: !page.is_published,
      });
      setPages((prev) =>
        prev.map((p) =>
          p.id === page.id ? { ...p, is_published: !p.is_published } : p
        )
      );
      toaster.create({
        title: page.is_published ? "Page unpublished" : "Page published",
        type: "success",
      });
    } catch {
      toaster.create({ title: "Failed to update page", type: "error" });
    }
  };

  const saveSectionContent = async (
    section: SitePageSection,
    newContent: Record<string, unknown>
  ) => {
    try {
      setSaving(section.id);
      await siteService.updateSection(section.id, { content: newContent });
      setSections((prev) =>
        prev.map((s) =>
          s.id === section.id ? { ...s, content: newContent } : s
        )
      );
      toaster.create({
        title: `"${section.label}" saved`,
        type: "success",
      });
    } catch {
      toaster.create({ title: "Failed to save section", type: "error" });
    } finally {
      setSaving(null);
    }
  };

  const toggleSectionVisibility = async (section: SitePageSection) => {
    try {
      await siteService.updateSection(section.id, {
        is_visible: !section.is_visible,
      });
      setSections((prev) =>
        prev.map((s) =>
          s.id === section.id ? { ...s, is_visible: !s.is_visible } : s
        )
      );
    } catch {
      toaster.create({ title: "Failed to toggle visibility", type: "error" });
    }
  };

  // Breadcrumb
  const breadcrumb = () => {
    const parts: string[] = ["Sites"];
    if (selectedSite) parts.push(selectedSite.name);
    if (selectedPage) parts.push(selectedPage.title);
    return parts.join(" / ");
  };

  return (
    <Box p={{ base: 4, md: 6 }} maxW="1200px" mx="auto">
      {/* Header */}
      <Flex align="center" mb={6} gap={3}>
        {view !== "sites" && (
          <IconButton
            aria-label="Go back"
            variant="ghost"
            size="sm"
            onClick={goBack}
          >
            <LuArrowLeft />
          </IconButton>
        )}
        <Box flex={1}>
          <Heading size="lg" fontFamily="heading">
            {breadcrumb()}
          </Heading>
          <Text color={mutedText} fontSize="sm">
            {view === "sites" && "Manage your microsites and landing pages"}
            {view === "pages" && `${selectedSite?.domain || selectedSite?.slug}`}
            {view === "sections" && "Edit section content"}
          </Text>
        </Box>
        {selectedSite?.domain && view === "pages" && (
          <IconButton
            aria-label="Open site"
            variant="outline"
            size="sm"
            asChild
          >
            <a
              href={`https://${selectedSite.domain}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              <LuExternalLink />
            </a>
          </IconButton>
        )}
      </Flex>

      {/* Sites List */}
      {view === "sites" && (
        <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} gap={4}>
          {loading
            ? Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} height="150px" borderRadius="lg" />
              ))
            : sites.map((site) => (
                <Card.Root
                  key={site.id}
                  bg={cardBg}
                  borderWidth="1px"
                  borderColor={borderColor}
                  cursor="pointer"
                  onClick={() => openSite(site)}
                  _hover={{ borderColor: "brand.500", shadow: "md" }}
                  transition="all 0.2s"
                >
                  <Card.Body p={5}>
                    <Flex align="start" justify="space-between">
                      <Box>
                        <Heading size="md" mb={1}>
                          {site.name}
                        </Heading>
                        <Text fontSize="sm" color={mutedText}>
                          {site.domain || site.slug}
                        </Text>
                      </Box>
                      <Badge
                        colorPalette={
                          site.status === "active" ? "green" : "gray"
                        }
                        px={4}
                      >
                        {site.status}
                      </Badge>
                    </Flex>
                    {site.description && (
                      <Text fontSize="sm" color={mutedText} mt={3} lineClamp={2}>
                        {site.description}
                      </Text>
                    )}
                    <HStack mt={4} gap={4}>
                      <HStack gap={1}>
                        <LuFileText size={14} />
                        <Text fontSize="xs" color={mutedText}>
                          {site.pages_count} pages
                        </Text>
                      </HStack>
                    </HStack>
                  </Card.Body>
                </Card.Root>
              ))}
        </SimpleGrid>
      )}

      {/* Pages List */}
      {view === "pages" && (
        <VStack align="stretch" gap={3}>
          {loading
            ? Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} height="70px" borderRadius="lg" />
              ))
            : pages.map((page) => (
                <Card.Root
                  key={page.id}
                  bg={cardBg}
                  borderWidth="1px"
                  borderColor={borderColor}
                >
                  <Card.Body p={4}>
                    <Flex align="center" gap={3}>
                      <Box
                        flex={1}
                        cursor="pointer"
                        onClick={() => openPage(page)}
                      >
                        <HStack gap={2}>
                          <Heading size="sm">{page.title}</Heading>
                          <Badge
                            colorPalette={
                              page.is_published ? "green" : "yellow"
                            }
                            size="sm"
                            px={4}
                          >
                            {page.is_published ? "Published" : "Draft"}
                          </Badge>
                        </HStack>
                        <Text fontSize="xs" color={mutedText}>
                          /{page.slug} &middot; {page.sections_count} sections
                        </Text>
                      </Box>
                      <HStack gap={1}>
                        <IconButton
                          aria-label="Toggle published"
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            togglePagePublished(page);
                          }}
                        >
                          {page.is_published ? (
                            <LuEye />
                          ) : (
                            <LuEyeOff />
                          )}
                        </IconButton>
                        <IconButton
                          aria-label="Edit sections"
                          variant="ghost"
                          size="sm"
                          onClick={() => openPage(page)}
                        >
                          <LuPencil />
                        </IconButton>
                      </HStack>
                    </Flex>
                  </Card.Body>
                </Card.Root>
              ))}
        </VStack>
      )}

      {/* Sections Editor */}
      {view === "sections" && (
        <VStack align="stretch" gap={4}>
          {loading
            ? Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} height="200px" borderRadius="lg" />
              ))
            : sections.map((section) => (
                <SectionEditor
                  key={section.id}
                  section={section}
                  saving={saving === section.id}
                  onSave={(content) => saveSectionContent(section, content)}
                  onToggleVisibility={() => toggleSectionVisibility(section)}
                  cardBg={cardBg}
                  borderColor={borderColor}
                  mutedText={mutedText}
                />
              ))}
        </VStack>
      )}
    </Box>
  );
}

// Section Editor Component
function SectionEditor({
  section,
  saving,
  onSave,
  onToggleVisibility,
  cardBg,
  borderColor,
  mutedText,
}: {
  section: SitePageSection;
  saving: boolean;
  onSave: (content: Record<string, unknown>) => void;
  onToggleVisibility: () => void;
  cardBg: string;
  borderColor: string;
  mutedText: string;
}) {
  const [expanded, setExpanded] = useState(true);
  const [localContent, setLocalContent] = useState<Record<string, unknown>>(
    section.content ?? {}
  );
  const [dirty, setDirty] = useState(false);

  const updateField = (key: string, value: unknown) => {
    setLocalContent((prev) => ({ ...prev, [key]: value }));
    setDirty(true);
  };

  const handleSave = () => {
    onSave(localContent);
    setDirty(false);
  };

  const fields = section.schema?.fields ?? [];

  return (
    <Card.Root
      bg={cardBg}
      borderWidth="1px"
      borderColor={borderColor}
      opacity={section.is_visible ? 1 : 0.6}
    >
      <Card.Body p={0}>
        {/* Section Header */}
        <Flex
          align="center"
          p={4}
          cursor="pointer"
          onClick={() => setExpanded(!expanded)}
          borderBottomWidth={expanded ? "1px" : 0}
          borderColor={borderColor}
        >
          <Box flex={1}>
            <HStack gap={2}>
              <Heading size="sm">{section.label}</Heading>
              <Badge size="sm" variant="outline" colorPalette="gray" px={4}>
                {section.key}
              </Badge>
              {!section.is_visible && (
                <Badge size="sm" colorPalette="yellow" px={4}>
                  Hidden
                </Badge>
              )}
              {dirty && (
                <Badge size="sm" colorPalette="orange" px={4}>
                  Unsaved
                </Badge>
              )}
            </HStack>
          </Box>
          <HStack gap={1}>
            <IconButton
              aria-label="Toggle visibility"
              variant="ghost"
              size="xs"
              onClick={(e) => {
                e.stopPropagation();
                onToggleVisibility();
              }}
            >
              {section.is_visible ? <LuEye /> : <LuEyeOff />}
            </IconButton>
            {dirty && (
              <IconButton
                aria-label="Save"
                variant="solid"
                colorPalette="green"
                size="xs"
                loading={saving}
                onClick={(e) => {
                  e.stopPropagation();
                  handleSave();
                }}
              >
                <LuSave />
              </IconButton>
            )}
            {expanded ? <LuChevronUp /> : <LuChevronDown />}
          </HStack>
        </Flex>

        {/* Fields */}
        {expanded && (
          <VStack align="stretch" p={4} gap={4}>
            {fields.length > 0 ? (
              fields.map((field) => (
                <FieldRenderer
                  key={field.key}
                  field={field}
                  value={localContent[field.key]}
                  onChange={(val) => updateField(field.key, val)}
                  mutedText={mutedText}
                />
              ))
            ) : (
              <Box>
                <Text fontSize="sm" color={mutedText} mb={2}>
                  Raw JSON (no schema defined)
                </Text>
                <Textarea
                  value={JSON.stringify(localContent, null, 2)}
                  onChange={(e) => {
                    try {
                      const parsed = JSON.parse(e.target.value);
                      setLocalContent(parsed);
                      setDirty(true);
                    } catch {
                      /* ignore parse errors while typing */
                    }
                  }}
                  fontFamily="mono"
                  fontSize="sm"
                  rows={10}
                  px={4}
                />
              </Box>
            )}

            {fields.length > 0 && dirty && (
              <Flex justify="flex-end">
                <IconButton
                  aria-label="Save changes"
                  variant="solid"
                  colorPalette="green"
                  size="sm"
                  loading={saving}
                  onClick={handleSave}
                >
                  <LuSave />
                </IconButton>
              </Flex>
            )}
          </VStack>
        )}
      </Card.Body>
    </Card.Root>
  );
}

// Field Renderer — renders the right input based on schema field type
function FieldRenderer({
  field,
  value,
  onChange,
  mutedText,
}: {
  field: SchemaField;
  value: unknown;
  onChange: (val: unknown) => void;
  mutedText: string;
}) {
  switch (field.type) {
    case "text":
      return (
        <Box>
          <Text fontSize="sm" fontWeight="medium" mb={1}>
            {field.label}
          </Text>
          <Input
            value={(value as string) ?? ""}
            onChange={(e) => onChange(e.target.value)}
            size="sm"
            px={4}
          />
        </Box>
      );

    case "textarea":
      return (
        <Box>
          <Text fontSize="sm" fontWeight="medium" mb={1}>
            {field.label}
          </Text>
          <Textarea
            value={(value as string) ?? ""}
            onChange={(e) => onChange(e.target.value)}
            size="sm"
            rows={4}
            px={4}
          />
        </Box>
      );

    case "url":
      return (
        <Box>
          <Text fontSize="sm" fontWeight="medium" mb={1}>
            {field.label}
          </Text>
          <Input
            value={(value as string) ?? ""}
            onChange={(e) => onChange(e.target.value)}
            size="sm"
            px={4}
            placeholder="https://..."
          />
        </Box>
      );

    case "image":
      return (
        <Box>
          <Text fontSize="sm" fontWeight="medium" mb={1}>
            {field.label}
          </Text>
          <Input
            value={(value as string) ?? ""}
            onChange={(e) => onChange(e.target.value)}
            size="sm"
            px={4}
            placeholder="Image URL"
          />
          {typeof value === "string" && value.length > 0 ? (
            <Box
              mt={2}
              borderRadius="md"
              overflow="hidden"
              maxW="200px"
              borderWidth="1px"
              borderColor="gray.200"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={value}
                alt={field.label}
                style={{
                  width: "100%",
                  height: "auto",
                  display: "block",
                }}
              />
            </Box>
          ) : null}
        </Box>
      );

    case "color":
      return (
        <Box>
          <Text fontSize="sm" fontWeight="medium" mb={1}>
            {field.label}
          </Text>
          <HStack gap={2}>
            <input
              type="color"
              value={(value as string) ?? "#000000"}
              onChange={(e) => onChange(e.target.value)}
              style={{ width: 40, height: 32, border: "none", cursor: "pointer" }}
            />
            <Input
              value={(value as string) ?? ""}
              onChange={(e) => onChange(e.target.value)}
              size="sm"
              px={4}
              maxW="120px"
              fontFamily="mono"
            />
          </HStack>
        </Box>
      );

    case "list":
      return (
        <ListFieldRenderer
          field={field}
          value={value as Record<string, unknown>[] | undefined}
          onChange={onChange}
          mutedText={mutedText}
        />
      );

    default:
      return (
        <Box>
          <Text fontSize="sm" fontWeight="medium" mb={1}>
            {field.label} ({field.type})
          </Text>
          <Input
            value={String(value ?? "")}
            onChange={(e) => onChange(e.target.value)}
            size="sm"
            px={4}
          />
        </Box>
      );
  }
}

// List Field Renderer — handles arrays of objects
function ListFieldRenderer({
  field,
  value,
  onChange,
  mutedText,
}: {
  field: SchemaField;
  value: Record<string, unknown>[] | undefined;
  onChange: (val: unknown) => void;
  mutedText: string;
}) {
  const items = value ?? [];
  const itemFields = field.item_fields ?? [];

  const addItem = () => {
    const newItem: Record<string, unknown> = {};
    for (const f of itemFields) {
      newItem[f.key] = "";
    }
    onChange([...items, newItem]);
  };

  const updateItem = (index: number, key: string, val: unknown) => {
    const updated = items.map((item, i) =>
      i === index ? { ...item, [key]: val } : item
    );
    onChange(updated);
  };

  const removeItem = (index: number) => {
    onChange(items.filter((_, i) => i !== index));
  };

  return (
    <Box>
      <Flex align="center" justify="space-between" mb={2}>
        <Text fontSize="sm" fontWeight="medium">
          {field.label} ({items.length})
        </Text>
        <IconButton
          aria-label="Add item"
          variant="ghost"
          size="xs"
          onClick={addItem}
        >
          <LuPlus />
        </IconButton>
      </Flex>
      <VStack align="stretch" gap={3}>
        {items.map((item, index) => (
          <Card.Root key={index} variant="outline" size="sm">
            <Card.Body p={3}>
              <Flex justify="space-between" mb={2}>
                <Text fontSize="xs" color={mutedText}>
                  Item {index + 1}
                </Text>
                <IconButton
                  aria-label="Remove item"
                  variant="ghost"
                  size="xs"
                  colorPalette="red"
                  onClick={() => removeItem(index)}
                >
                  <LuTrash2 />
                </IconButton>
              </Flex>
              <VStack align="stretch" gap={2}>
                {itemFields.map((subField) => (
                  <Box key={subField.key}>
                    <Text fontSize="xs" color={mutedText} mb={0.5}>
                      {subField.label}
                    </Text>
                    {subField.type === "textarea" ? (
                      <Textarea
                        value={(item[subField.key] as string) ?? ""}
                        onChange={(e) =>
                          updateItem(index, subField.key, e.target.value)
                        }
                        size="sm"
                        rows={2}
                        px={4}
                      />
                    ) : (
                      <Input
                        value={(item[subField.key] as string) ?? ""}
                        onChange={(e) =>
                          updateItem(index, subField.key, e.target.value)
                        }
                        size="sm"
                        px={4}
                      />
                    )}
                  </Box>
                ))}
              </VStack>
            </Card.Body>
          </Card.Root>
        ))}
      </VStack>
    </Box>
  );
}
