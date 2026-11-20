import * as React from 'react';
import {
    Avatar,
    Box,
    Button,
    Chip,
    FormControl,
    InputLabel,
    MenuItem,
    Select,
    TextField,
    Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import EditIcon from '@mui/icons-material/Edit';
import { useFormContext } from 'react-hook-form';
import { useTranslate, useRecordContext } from 'react-admin';

const ALLOWED_COLORS = ['Default', 'Blue', 'Green', 'Yellow', 'Orange', 'Red', 'Pink', 'Navy', 'White', 'Purple', 'Black'];
const COLOR_HEX_MAP: Record<string, string> = {
    Default: '#94A3B8',
    Blue: '#1B2BFF',
    Green: '#16A34A',
    Yellow: '#F59E0B',
    Orange: '#EA580C',
    Red: '#DC2626',
    Pink: '#EC4899',
    Navy: '#101D35',
    White: '#FFFFFF',
    Purple: '#9333EA',
    Black: '#0F172A',
};
const SIZES = ['xs', 's', 'm', 'l', 'xl', 'xxl'];

interface VariantEntry {
    color: string;
    sizes: Record<string, string>;
    imageUrl: string;
}

const defaultEntry = (): VariantEntry => ({ color: '', sizes: {}, imageUrl: '' });

const fileToBase64 = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });

const VariantsEditor = () => {
    const { setValue, getValues } = useFormContext();
    const record = useRecordContext();
    const translate = useTranslate();
    const [entries, setEntries] = React.useState<VariantEntry[]>([]);
    const initializedRef = React.useRef(false);

    React.useEffect(() => {
        if (initializedRef.current) return;
        const formVals = getValues();
        const existingVariants = formVals?.variants || record?.variants;
        const existingColorImages = formVals?.colorImages || record?.colorImages;
        if (!existingVariants) {
            return;
        }
        let parsedVariants: { color: string; size: string; stock: number }[] = [];
        let parsedColorImages: any = null;
        try {
            parsedVariants = typeof existingVariants === 'string' ? JSON.parse(existingVariants) : existingVariants;
            if (existingColorImages) {
                parsedColorImages = typeof existingColorImages === 'string' ? JSON.parse(existingColorImages) : existingColorImages;
            }
        } catch { return; }
        if (!Array.isArray(parsedVariants) || parsedVariants.length === 0) {
            return;
        }

        const getColorImage = (color: string): string => {
            if (!parsedColorImages) return '';
            if (Array.isArray(parsedColorImages)) {
                const ci = parsedColorImages.find((c: any) => c && c.color === color);
                return ci?.imageURL || ci?.imageUrl || '';
            }
            if (typeof parsedColorImages === 'object') {
                return (parsedColorImages as Record<string, string>)[color] || '';
            }
            return '';
        };

        const grouped: Record<string, { color: string; sizes: Record<string, string>; imageUrl: string }> = {};
        parsedVariants.forEach((v) => {
            if (!grouped[v.color]) {
                grouped[v.color] = { color: v.color, sizes: {}, imageUrl: getColorImage(v.color) };
            }
            grouped[v.color].sizes[v.size] = String(v.stock);
        });
        const loaded = Object.values(grouped);
        setEntries(loaded);
        initializedRef.current = true;
    }, [record?.variants, record?.colorImages, getValues]);

    const syncForm = React.useCallback((current: VariantEntry[]) => {
        const variants: { color: string; size: string; stock: number }[] = [];
        const colorImages: { color: string; imageURL?: string }[] = [];
        current.forEach((e) => {
            if (!e.color) return;
            const hasImage = e.imageUrl.trim().length > 0;
            if (hasImage) colorImages.push({ color: e.color, imageURL: e.imageUrl });
            Object.entries(e.sizes).forEach(([size, stock]) => {
                const s = parseInt(stock, 10);
                if (!isNaN(s) && s >= 0) {
                    variants.push({ color: e.color, size, stock: s });
                }
            });
        });
        setValue('variants', variants.length > 0 ? JSON.stringify(variants) : null, { shouldDirty: true });
        setValue('colorImages', colorImages.length > 0 ? JSON.stringify(colorImages) : null, { shouldDirty: true });
    }, [setValue]);

    const updateEntry = (idx: number, patch: Partial<VariantEntry>) => {
        setEntries((prev) => {
            const next = [...prev];
            next[idx] = { ...next[idx], ...patch };
            syncForm(next);
            return next;
        });
    };

    const toggleSize = (idx: number, size: string) => {
        setEntries((prev) => {
            const next = [...prev];
            const entry = { ...next[idx] };
            if (entry.sizes[size] !== undefined) {
                const { [size]: _, ...rest } = entry.sizes;
                entry.sizes = rest;
            } else {
                entry.sizes = { ...entry.sizes, [size]: '0' };
            }
            next[idx] = entry;
            syncForm(next);
            return next;
        });
    };

    const setStock = (idx: number, size: string, val: string) => {
        updateEntry(idx, { sizes: { ...entries[idx].sizes, [size]: val } });
    };

    const addEntry = () => {
        setEntries((prev) => {
            const next = [...prev, defaultEntry()];
            syncForm(next);
            return next;
        });
    };

    const removeEntry = (idx: number) => {
        setEntries((prev) => {
            const next = prev.filter((_, i) => i !== idx);
            syncForm(next);
            return next;
        });
    };

    return (
        <Box sx={{ my: 2 }}>
            <Typography variant="subtitle1" sx={{ mb: 1.5, fontWeight: 700, color: 'text.primary' }}>
                {translate("pos.products.variants.heading")}
            </Typography>
            {entries.map((entry, idx) => (
                <Box
                    key={idx}
                    sx={{
                        border: '1px solid',
                        borderColor: 'divider',
                        borderRadius: '12px',
                        p: 2.5,
                        mb: 2,
                        position: 'relative',
                        backgroundColor: 'background.paper',
                        boxShadow: '0 1px 3px rgba(16, 29, 53, 0.04)',
                    }}
                >
                    <Button
                        size="small"
                        color="error"
                        onClick={() => removeEntry(idx)}
                        sx={{ position: 'absolute', top: 8, right: 8, minWidth: 0, p: 0.75, borderRadius: '8px' }}
                    >
                        <DeleteOutlineIcon fontSize="small" />
                    </Button>

                    <FormControl size="small" sx={{ minWidth: 160, mb: 2 }}>
                        <InputLabel>{translate("pos.products.variants.color")}</InputLabel>
                        <Select
                            value={entry.color}
                            label={translate("pos.products.variants.color")}
                            onChange={(e) => updateEntry(idx, { color: e.target.value })}
                        >
                            {ALLOWED_COLORS.map((c) => (
                                <MenuItem key={c} value={c}>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                        <Box
                                            sx={{
                                                width: 14,
                                                height: 14,
                                                borderRadius: '50%',
                                                backgroundColor: COLOR_HEX_MAP[c] || '#ccc',
                                                border: '1px solid rgba(0,0,0,0.15)',
                                            }}
                                        />
                                        <span>{c}</span>
                                    </Box>
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>

                    <Box sx={{ mb: 2 }}>
                        <Typography variant="caption" sx={{ display: 'block', mb: 0.75, color: 'text.secondary', fontWeight: 600 }}>
                            {translate("pos.products.variants.sizes")}
                        </Typography>
                        <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap' }}>
                            {Array.from(new Set([...SIZES, ...Object.keys(entry.sizes)])).map((size) => {
                                const checked = entry.sizes[size] !== undefined;
                                return (
                                    <Chip
                                        key={size}
                                        label={size.toUpperCase()}
                                        size="small"
                                        variant={checked ? 'filled' : 'outlined'}
                                        color={checked ? 'primary' : 'default'}
                                        onClick={() => toggleSize(idx, size)}
                                        sx={{ cursor: 'pointer', fontWeight: 600, borderRadius: '6px' }}
                                    />
                                );
                            })}
                        </Box>
                    </Box>

                    {Object.keys(entry.sizes).length > 0 && (
                        <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap', mb: 2 }}>
                            {Object.keys(entry.sizes).map((size) => (
                                <TextField
                                    key={size}
                                    label={`${translate("pos.products.variants.stock_size")} (${size.toUpperCase()})`}
                                    type="number"
                                    size="small"
                                    value={entry.sizes[size]}
                                    onChange={(e) => setStock(idx, size, e.target.value)}
                                    slotProps={{ htmlInput: { min: 0 } }}
                                    sx={{ width: 140 }}
                                />
                            ))}
                        </Box>
                    )}

                    <Typography variant="caption" sx={{ display: 'block', mb: 0.75, color: 'text.secondary', fontWeight: 600 }}>
                        {translate("pos.products.variants.color_image")}
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center' }}>
                        {entry.imageUrl && (
                            <Avatar
                                src={entry.imageUrl}
                                alt={entry.color}
                                variant="rounded"
                                sx={{ width: 48, height: 48, border: '1px solid #E5E7EB' }}
                            />
                        )}
                        <Button
                            variant="outlined"
                            size="small"
                            component="label"
                            startIcon={entry.imageUrl ? <EditIcon /> : <AddIcon />}
                            sx={{ borderRadius: '8px' }}
                        >
                            {entry.imageUrl ? translate("pos.common.change") : translate("pos.common.upload")}
                            <input
                                type="file"
                                accept="image/*"
                                hidden
                                onChange={async (e) => {
                                    const file = e.target.files?.[0];
                                    if (!file) return;
                                    const b64 = await fileToBase64(file);
                                    updateEntry(idx, { imageUrl: b64 });
                                    e.target.value = '';
                                }}
                            />
                        </Button>
                        {entry.imageUrl && (
                            <Button
                                size="small"
                                color="error"
                                onClick={() => updateEntry(idx, { imageUrl: '' })}
                                sx={{ borderRadius: '8px' }}
                            >
                                {translate("pos.common.remove")}
                            </Button>
                        )}
                    </Box>
                </Box>
            ))}

            <Button
                startIcon={<AddIcon />}
                onClick={addEntry}
                size="small"
                variant="outlined"
                sx={{
                    borderStyle: 'dashed',
                    borderRadius: '8px',
                    fontWeight: 600,
                    px: 2,
                    py: 1,
                }}
            >
                {translate("pos.products.variants.add_color_variant")}
            </Button>
        </Box>
    );
};

export default VariantsEditor;
