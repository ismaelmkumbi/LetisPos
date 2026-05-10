import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Box, Typography, IconButton } from '@mui/material';
import { IconGripVertical, IconSettings } from '@tabler/icons-react';

interface BlockPaletteProps {
  blockId: string;
  label: string;
  isSelected: boolean;
  onSelect: () => void;
}

export default function BlockPalette({ blockId, label, isSelected, onSelect }: BlockPaletteProps) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: blockId });

  return (
    <Box
      ref={setNodeRef}
      sx={{
        display: 'flex', alignItems: 'center', gap: 1, p: 1.5, mb: 1,
        border: isSelected ? '2px solid #4f46e5' : '1px solid #e2e8f0',
        borderRadius: 2, background: isSelected ? '#f0f4ff' : '#fff', cursor: 'grab',
        transform: CSS.Transform.toString(transform), transition,
        '&:hover': { borderColor: '#4f46e5' },
      }}
      onClick={onSelect}
    >
      <IconButton size="small" {...attributes} {...listeners} sx={{ cursor: 'grab' }}>
        <IconGripVertical size={14} />
      </IconButton>
      <Typography sx={{ flex: 1, fontSize: '0.8rem', fontWeight: 500 }}>{label}</Typography>
      <IconSettings size={14} color={isSelected ? '#4f46e5' : '#888'} />
    </Box>
  );
}
