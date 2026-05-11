import { useState, useEffect, useCallback, useRef } from 'react';
import { Box, Typography, Select, MenuItem, FormControl, InputLabel, Button } from '@mui/material';
import { IconSparkles } from '@tabler/icons-react';
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, arrayMove } from '@dnd-kit/sortable';
import { listTemplates, getTemplate, saveTemplateOverride } from '../../../api/smartpos/documents';
import BlockPalette from '../../../components/smartpos/documents/editor/BlockPalette';
import BlockConfigPanel from '../../../components/smartpos/documents/editor/BlockConfigPanel';
import TemplatePreviewPanel from '../../../components/smartpos/documents/editor/TemplatePreviewPanel';
import TemplateAssistantChat from '../../../components/smartpos/documents/editor/TemplateAssistantChat';

const BLOCK_LABELS: Record<string, string> = {
  header: 'Header',
  meta: 'Meta',
  items: 'Items Table',
  totals: 'Totals',
  signature: 'Signature',
  terms: 'Terms & Conditions',
  footer: 'Footer',
};

const DEFAULT_ORDER = ['header', 'meta', 'items', 'totals', 'signature', 'terms', 'footer'];

export default function TemplateEditorPage() {
  const [docType, setDocType] = useState<string>('');
  const [templateList, setTemplateList] = useState<{ documentType: string; name: string }[]>([]);
  const [blocks, setBlocks] = useState<string[]>(DEFAULT_ORDER);
  const [blockConfigs, setBlockConfigs] = useState<Record<string, Record<string, unknown>>>({});
  const [selectedBlock, setSelectedBlock] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [showAssistant, setShowAssistant] = useState(false);
  const [, setPreviewRefresh] = useState(0);
  const handleSaveRef = useRef<() => void>(() => {});

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        handleSaveRef.current();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        setPreviewRefresh((n) => n + 1);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  // Load available templates
  useEffect(() => {
    listTemplates()
      .then((list) => setTemplateList(list.map((t) => ({ documentType: t.documentType, name: t.name }))))
      .catch((err) => console.error('Failed to load templates', err));
  }, []);

  // Load template config when docType changes
  useEffect(() => {
    if (!docType) return;
    getTemplate(docType)
      .then(() => {
        // Try to parse stored config from the template body HTML
        // If no config stored, use defaults
        setBlocks(DEFAULT_ORDER);
        setBlockConfigs({});
        setSelectedBlock(null);
      })
      .catch(() => {
        // New template type — use defaults
        setBlocks(DEFAULT_ORDER);
        setBlockConfigs({});
        setSelectedBlock(null);
      });
  }, [docType]);

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setBlocks((items) => {
        const oldIndex = items.indexOf(String(active.id));
        const newIndex = items.indexOf(String(over.id));
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  }, []);

  const handleBlockConfigChange = useCallback(
    (blockId: string) => (config: Record<string, unknown>) => {
      setBlockConfigs((prev) => ({ ...prev, [blockId]: config }));
    },
    [],
  );

  const handleSave = async () => {
    if (!docType) return;
    setSaving(true);
    try {
      const config = {
        blocks: blocks.map((id) => ({ type: id, ...blockConfigs[id] })),
      };
      await saveTemplateOverride(docType, JSON.stringify(config));
    } catch (e) {
      console.error('Failed to save template', e);
    } finally {
      setSaving(false);
    }
  };
  handleSaveRef.current = handleSave;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 80px)', p: 2, gap: 2 }}>
      {/* Top bar: doctype selector + save */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        <FormControl size="small" sx={{ minWidth: 220 }}>
          <InputLabel>Document Type</InputLabel>
          <Select value={docType} label="Document Type" onChange={(e) => setDocType(e.target.value)}>
            {templateList.map((t) => (
              <MenuItem key={t.documentType} value={t.documentType}>{t.name}</MenuItem>
            ))}
          </Select>
        </FormControl>
        <Button variant="contained" disabled={!docType || saving} onClick={handleSave}
          sx={{ bgcolor: '#4f46e5', '&:hover': { bgcolor: '#4338ca' }, textTransform: 'none' }}>
          {saving ? 'Saving...' : 'Save Template'}
        </Button>
        <Button onClick={() => setShowAssistant(!showAssistant)} startIcon={<IconSparkles size={16} />}
          variant={showAssistant ? 'contained' : 'outlined'} size="small">
          AI Assistant
        </Button>
      </Box>

      {/* Three-panel layout */}
      <Box sx={{ display: 'flex', flex: 1, gap: 2, overflow: 'hidden' }}>
        {/* Left panel: Block Palette */}
        <Box sx={{ width: 240, minWidth: 240, overflow: 'auto', borderRight: '1px solid #e2e8f0', pr: 1 }}>
          <Typography variant="subtitle2" sx={{ mb: 1.5, color: '#888' }}>Blocks</Typography>
          {!docType ? (
            <Typography sx={{ fontSize: '0.8rem', color: '#aaa' }}>Select a document type to start</Typography>
          ) : (
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={blocks} strategy={verticalListSortingStrategy}>
                {blocks.map((blockId) => (
                  <BlockPalette
                    key={blockId}
                    blockId={blockId}
                    label={BLOCK_LABELS[blockId] ?? blockId}
                    isSelected={selectedBlock === blockId}
                    onSelect={() => setSelectedBlock(blockId)}
                  />
                ))}
              </SortableContext>
            </DndContext>
          )}
        </Box>

        {/* Center panel: Block Configuration */}
        <Box sx={{ width: 300, minWidth: 300, overflow: 'auto', borderRight: '1px solid #e2e8f0' }}>
          <Typography variant="subtitle2" sx={{ mb: 1, p: 2, pb: 0, color: '#888' }}>Configuration</Typography>
          {selectedBlock ? (
            <BlockConfigPanel
              blockId={selectedBlock}
              config={blockConfigs[selectedBlock] ?? {}}
              onChange={handleBlockConfigChange(selectedBlock)}
            />
          ) : (
            <Typography sx={{ p: 2, fontSize: '0.8rem', color: '#aaa' }}>Select a block to configure its options</Typography>
          )}
        </Box>

        {/* Assistant panel */}
        {showAssistant && (
          <Box sx={{ width: 300, minWidth: 300, overflow: 'auto', borderRight: '1px solid #e2e8f0', p: 2 }}>
            <TemplateAssistantChat
              documentType={docType}
              currentConfig={JSON.stringify({ blocks: blocks.map((id) => ({ type: id, ...blockConfigs[id] })) })}
              onApplyConfig={(newConfig) => {
                setBlockConfigs((prev) => {
                  const merged = { ...prev };
                  for (const [key, val] of Object.entries(newConfig)) {
                    if (val && typeof val === 'object' && !Array.isArray(val)) {
                      merged[key] = val as Record<string, unknown>;
                    }
                  }
                  return merged;
                });
              }}
            />
          </Box>
        )}

        {/* Right panel: Live Preview */}
        <Box sx={{ flex: 1, overflow: 'auto' }}>
          <Typography variant="subtitle2" sx={{ mb: 1, color: '#888' }}>Preview</Typography>
          {docType ? (
            <TemplatePreviewPanel
              documentType={docType}
              config={{ blocks: blocks.map((id) => ({ type: id, ...blockConfigs[id] })) }}
            />
          ) : (
            <Typography sx={{ fontSize: '0.8rem', color: '#aaa' }}>Select a document type to preview</Typography>
          )}
        </Box>
      </Box>
    </Box>
  );
}
