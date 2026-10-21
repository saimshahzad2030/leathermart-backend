import fs from 'fs';
import path from 'path';

const ADMIN_DIR = path.resolve('../leathermart-admin');
const MODALS_DIR = path.join(ADMIN_DIR, 'src/components/modals');

if (!fs.existsSync(MODALS_DIR)) {
  fs.mkdirSync(MODALS_DIR, { recursive: true });
}

// 1. ManageSizesModal.tsx
const manageSizesModalContent = `import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { sizesApi } from '@/lib/api/sizes';
import { ProductSize } from '@/types';
import { Modal } from '@/components/common/Modal';
import { Button } from '@/components/common/Button';
import { Input } from '@/components/forms/Input';
import { FormField } from '@/components/forms/FormField';
import { Switch } from '@/components/forms/Switch';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { useToast } from '@/context/ToastContext';
import { Plus, Edit2, Trash2, Search, CheckCircle2, XCircle, AlertTriangle, RefreshCw } from 'lucide-react';

interface ManageSizesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSizesUpdated?: () => void;
}

export const ManageSizesModal: React.FC<ManageSizesModalProps> = ({
  isOpen,
  onClose,
  onSizesUpdated,
}) => {
  const toast = useToast();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState('');
  const [editingSize, setEditingSize] = useState<ProductSize | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<ProductSize | null>(null);

  // Form states
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [sortOrder, setSortOrder] = useState<number>(10);
  const [isActive, setIsActive] = useState<boolean>(true);
  const [formError, setFormError] = useState('');

  const { data: sizes = [], isLoading, refetch } = useQuery({
    queryKey: ['admin-sizes', search],
    queryFn: () => sizesApi.listSizes({ search: search.trim() || undefined }),
    enabled: isOpen,
  });

  const invalidateQueries = () => {
    queryClient.invalidateQueries({ queryKey: ['admin-sizes'] });
    if (onSizesUpdated) onSizesUpdated();
  };

  const createMutation = useMutation({
    mutationFn: sizesApi.createSize,
    onSuccess: () => {
      toast.show('success', 'Product size created successfully');
      resetForm();
      invalidateQueries();
    },
    onError: (err: any) => {
      const msg = err.response?.data?.message || err.message || 'Failed to create size';
      setFormError(msg);
      toast.show('error', msg);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => sizesApi.updateSize(id, data),
    onSuccess: () => {
      toast.show('success', 'Product size updated successfully');
      resetForm();
      invalidateQueries();
    },
    onError: (err: any) => {
      const msg = err.response?.data?.message || err.message || 'Failed to update size';
      setFormError(msg);
      toast.show('error', msg);
    },
  });

  const toggleMutation = useMutation({
    mutationFn: sizesApi.toggleActive,
    onSuccess: (updated) => {
      toast.show('success', \`Size '\${updated.name}' is now \${updated.isActive ? 'active' : 'inactive'}\`);
      invalidateQueries();
    },
    onError: (err: any) => {
      const msg = err.response?.data?.message || err.message || 'Failed to toggle status';
      toast.show('error', msg);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: sizesApi.deleteSize,
    onSuccess: () => {
      toast.show('success', 'Product size deleted successfully');
      setDeleteTarget(null);
      invalidateQueries();
    },
    onError: (err: any) => {
      const msg = err.response?.data?.message || err.message || 'Failed to delete size';
      toast.show('error', msg);
      setDeleteTarget(null);
    },
  });

  const resetForm = () => {
    setEditingSize(null);
    setName('');
    setSlug('');
    setDescription('');
    setSortOrder(sizes.length * 10 + 10);
    setIsActive(true);
    setFormError('');
    setIsFormOpen(false);
  };

  const handleStartCreate = () => {
    resetForm();
    setIsFormOpen(true);
  };

  const handleStartEdit = (s: ProductSize) => {
    setEditingSize(s);
    setName(s.name);
    setSlug(s.slug);
    setDescription(s.description || '');
    setSortOrder(s.sortOrder ?? 10);
    setIsActive(s.isActive);
    setFormError('');
    setIsFormOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setFormError('Size name or label is required');
      return;
    }

    setFormError('');
    const payload = {
      name: name.trim(),
      slug: slug.trim() || undefined,
      description: description.trim() || undefined,
      sortOrder: Number(sortOrder) || 10,
      isActive,
    };

    if (editingSize) {
      updateMutation.mutate({ id: editingSize.id, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const filteredSizes = sizes.filter((s) =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.slug.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title="Manage Product Sizes"
        subtitle="Configure reusable garment sizing, bespoke custom sizes, and sort ordering"
        maxWidth="2xl"
      >
        <div className="space-y-5">
          {/* Top toolbar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-muted absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search sizes (e.g. M, 48 EU, Custom)..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-surface-subtle border border-theme rounded-xl pl-9 pr-3 py-2 text-xs text-primary focus:outline-none focus:ring-1 focus:ring-amber-500"
              />
            </div>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => refetch()}
                leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
              >
                Refresh
              </Button>
              <Button
                type="button"
                variant="primary"
                size="sm"
                onClick={handleStartCreate}
                leftIcon={<Plus className="w-3.5 h-3.5" />}
              >
                Add Size
              </Button>
            </div>
          </div>

          {/* Inline Create / Edit Drawer */}
          {isFormOpen && (
            <form onSubmit={handleSave} className="p-4 rounded-xl border border-amber-500/30 bg-surface-subtle/70 space-y-4 animate-in fade-in">
              <div className="flex items-center justify-between pb-2 border-b border-theme">
                <h4 className="text-xs font-bold uppercase tracking-wider text-amber-500">
                  {editingSize ? \`Edit Size: \${editingSize.name}\` : 'Create New Size'}
                </h4>
                <button
                  type="button"
                  onClick={resetForm}
                  className="text-xs text-muted hover:text-primary"
                >
                  Cancel
                </button>
              </div>

              {formError && (
                <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-500 text-xs">
                  {formError}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <FormField label="Size Label / Name" required>
                  <Input
                    placeholder="e.g. 48 (EU M) or XL or Custom Made"
                    value={name}
                    onChange={(e) => {
                      setName(e.target.value);
                      if (!editingSize && !slug) {
                        setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''));
                      }
                    }}
                    className="text-xs h-9"
                    required
                  />
                </FormField>

                <FormField label="Slug (Identifier)">
                  <Input
                    placeholder="e.g. 48-eu-m"
                    value={slug}
                    onChange={(e) => setSlug(e.target.value)}
                    className="text-xs h-9 font-mono"
                  />
                </FormField>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <FormField label="Measurement Context / Notes">
                    <Input
                      placeholder="e.g. Chest 96-100cm, Shoulder 45cm"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      className="text-xs h-9"
                    />
                  </FormField>
                </div>

                <FormField label="Sort Order">
                  <Input
                    type="number"
                    value={sortOrder}
                    onChange={(e) => setSortOrder(Number(e.target.value))}
                    className="text-xs h-9 font-mono"
                  />
                </FormField>
              </div>

              <div className="flex items-center justify-between pt-2">
                <div className="flex items-center gap-2">
                  <Switch checked={isActive} onChange={setIsActive} />
                  <span className="text-xs text-secondary font-medium">
                    {isActive ? 'Active (available for new products)' : 'Inactive (disabled for new products)'}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <Button type="button" variant="outline" size="sm" onClick={resetForm}>
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    variant="primary"
                    size="sm"
                    isLoading={createMutation.isPending || updateMutation.isPending}
                  >
                    {editingSize ? 'Update Size' : 'Save Size'}
                  </Button>
                </div>
              </div>
            </form>
          )}

          {/* Sizes List Table */}
          <div className="border border-theme rounded-xl overflow-hidden">
            <div className="max-h-96 overflow-y-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-surface-subtle sticky top-0 border-b border-theme text-muted uppercase font-mono tracking-wider text-[10px]">
                  <tr>
                    <th className="py-2.5 px-3">Order</th>
                    <th className="py-2.5 px-3">Size Label</th>
                    <th className="py-2.5 px-3">Identifier</th>
                    <th className="py-2.5 px-3">Products</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-theme">
                  {isLoading ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-muted">
                        Loading size catalog...
                      </td>
                    </tr>
                  ) : filteredSizes.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-muted">
                        No product sizes found matching search.
                      </td>
                    </tr>
                  ) : (
                    filteredSizes.map((s) => (
                      <tr key={s.id} className="hover:bg-surface-subtle/50 transition-colors">
                        <td className="py-2.5 px-3 font-mono text-muted">{s.sortOrder}</td>
                        <td className="py-2.5 px-3 font-semibold text-primary">
                          {s.name}
                          {s.description && (
                            <span className="block text-[11px] font-normal text-muted truncate max-w-xs">
                              {s.description}
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 font-mono text-muted text-[11px]">{s.slug}</td>
                        <td className="py-2.5 px-3">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-mono bg-surface-subtle border border-theme text-secondary">
                            {s.productCount ?? 0} {s.productCount === 1 ? 'product' : 'products'}
                          </span>
                        </td>
                        <td className="py-2.5 px-3">
                          <button
                            type="button"
                            onClick={() => toggleMutation.mutate(s.id)}
                            className="inline-flex items-center gap-1.5 cursor-pointer hover:opacity-80 transition-opacity"
                            title="Click to toggle status"
                          >
                            {s.isActive ? (
                              <span className="inline-flex items-center gap-1 text-[11px] text-emerald-500 font-medium">
                                <CheckCircle2 className="w-3.5 h-3.5" /> Active
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[11px] text-rose-400 font-medium">
                                <XCircle className="w-3.5 h-3.5" /> Inactive
                              </span>
                            )}
                          </button>
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              type="button"
                              onClick={() => handleStartEdit(s)}
                              className="p-1 rounded text-muted hover:text-amber-500 transition-colors"
                              title="Edit size"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeleteTarget(s)}
                              className="p-1 rounded text-muted hover:text-rose-500 transition-colors"
                              title="Delete size"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </Modal>

      {/* Delete Confirmation Dialog with Safeguard */}
      <ConfirmDialog
        isOpen={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => {
          if (deleteTarget) deleteMutation.mutate(deleteTarget.id);
        }}
        title="Delete Product Size"
        message={
          deleteTarget?.productCount && deleteTarget.productCount > 0
            ? \`WARNING: '\${deleteTarget.name}' is currently assigned to \${deleteTarget.productCount} product(s). To preserve catalog integrity, you cannot delete a size that is in use. Deactivate it instead to prevent new assignments.\`
            : \`Are you sure you want to permanently delete size '\${deleteTarget?.name}'? This action cannot be undone.\`
        }
        confirmText={deleteTarget?.productCount && deleteTarget.productCount > 0 ? 'Cannot Delete (In Use)' : 'Delete Size'}
        variant={deleteTarget?.productCount && deleteTarget.productCount > 0 ? 'warning' : 'danger'}
        isLoading={deleteMutation.isPending}
      />
    </>
  );
};
`;
fs.writeFileSync(path.join(MODALS_DIR, 'ManageSizesModal.tsx'), manageSizesModalContent, 'utf8');
console.log('✓ Created ManageSizesModal.tsx');

// 2. ManageColorsModal.tsx
const manageColorsModalContent = `import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { colorsApi } from '@/lib/api/colors';
import { ProductColor } from '@/types';
import { Modal } from '@/components/common/Modal';
import { Button } from '@/components/common/Button';
import { Input } from '@/components/forms/Input';
import { FormField } from '@/components/forms/FormField';
import { Switch } from '@/components/forms/Switch';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { useToast } from '@/context/ToastContext';
import { Plus, Edit2, Trash2, Search, CheckCircle2, XCircle, RefreshCw } from 'lucide-react';

interface ManageColorsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onColorsUpdated?: () => void;
}

export const ManageColorsModal: React.FC<ManageColorsModalProps> = ({
  isOpen,
  onClose,
  onColorsUpdated,
}) => {
  const toast = useToast();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState('');
  const [editingColor, setEditingColor] = useState<ProductColor | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<ProductColor | null>(null);

  // Form states
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [hex, setHex] = useState('#11100F');
  const [sortOrder, setSortOrder] = useState<number>(10);
  const [isActive, setIsActive] = useState<boolean>(true);
  const [formError, setFormError] = useState('');

  const { data: colors = [], isLoading, refetch } = useQuery({
    queryKey: ['admin-colors', search],
    queryFn: () => colorsApi.listColors({ search: search.trim() || undefined }),
    enabled: isOpen,
  });

  const invalidateQueries = () => {
    queryClient.invalidateQueries({ queryKey: ['admin-colors'] });
    if (onColorsUpdated) onColorsUpdated();
  };

  const createMutation = useMutation({
    mutationFn: colorsApi.createColor,
    onSuccess: () => {
      toast.show('success', 'Product color created successfully');
      resetForm();
      invalidateQueries();
    },
    onError: (err: any) => {
      const msg = err.response?.data?.message || err.message || 'Failed to create color';
      setFormError(msg);
      toast.show('error', msg);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => colorsApi.updateColor(id, data),
    onSuccess: () => {
      toast.show('success', 'Product color updated successfully');
      resetForm();
      invalidateQueries();
    },
    onError: (err: any) => {
      const msg = err.response?.data?.message || err.message || 'Failed to update color';
      setFormError(msg);
      toast.show('error', msg);
    },
  });

  const toggleMutation = useMutation({
    mutationFn: colorsApi.toggleActive,
    onSuccess: (updated) => {
      toast.show('success', \`Color '\${updated.name}' is now \${updated.isActive ? 'active' : 'inactive'}\`);
      invalidateQueries();
    },
    onError: (err: any) => {
      const msg = err.response?.data?.message || err.message || 'Failed to toggle status';
      toast.show('error', msg);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: colorsApi.deleteColor,
    onSuccess: () => {
      toast.show('success', 'Product color deleted successfully');
      setDeleteTarget(null);
      invalidateQueries();
    },
    onError: (err: any) => {
      const msg = err.response?.data?.message || err.message || 'Failed to delete color';
      toast.show('error', msg);
      setDeleteTarget(null);
    },
  });

  const resetForm = () => {
    setEditingColor(null);
    setName('');
    setSlug('');
    setHex('#11100F');
    setSortOrder(colors.length * 10 + 10);
    setIsActive(true);
    setFormError('');
    setIsFormOpen(false);
  };

  const handleStartCreate = () => {
    resetForm();
    setIsFormOpen(true);
  };

  const handleStartEdit = (c: ProductColor) => {
    setEditingColor(c);
    setName(c.name);
    setSlug(c.slug);
    setHex(c.hex || '#11100F');
    setSortOrder(c.sortOrder ?? 10);
    setIsActive(c.isActive);
    setFormError('');
    setIsFormOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setFormError('Color name is required');
      return;
    }
    if (!hex.trim() || !/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(hex.trim())) {
      setFormError('Please enter a valid hex color code (e.g. #11100F)');
      return;
    }

    setFormError('');
    const payload = {
      name: name.trim(),
      slug: slug.trim() || undefined,
      hex: hex.trim().toUpperCase(),
      sortOrder: Number(sortOrder) || 10,
      isActive,
    };

    if (editingColor) {
      updateMutation.mutate({ id: editingColor.id, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const filteredColors = colors.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.slug.toLowerCase().includes(search.toLowerCase()) ||
    c.hex.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title="Manage Product Colors"
        subtitle="Maintain luxury leather palette, hex color swatches, and active status"
        maxWidth="2xl"
      >
        <div className="space-y-5">
          {/* Top toolbar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-muted absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search colors (e.g. Black, Cognac, #8B4513)..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-surface-subtle border border-theme rounded-xl pl-9 pr-3 py-2 text-xs text-primary focus:outline-none focus:ring-1 focus:ring-amber-500"
              />
            </div>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => refetch()}
                leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
              >
                Refresh
              </Button>
              <Button
                type="button"
                variant="primary"
                size="sm"
                onClick={handleStartCreate}
                leftIcon={<Plus className="w-3.5 h-3.5" />}
              >
                Add Color
              </Button>
            </div>
          </div>

          {/* Inline Create / Edit Drawer */}
          {isFormOpen && (
            <form onSubmit={handleSave} className="p-4 rounded-xl border border-amber-500/30 bg-surface-subtle/70 space-y-4 animate-in fade-in">
              <div className="flex items-center justify-between pb-2 border-b border-theme">
                <h4 className="text-xs font-bold uppercase tracking-wider text-amber-500">
                  {editingColor ? \`Edit Color: \${editingColor.name}\` : 'Create New Color'}
                </h4>
                <button
                  type="button"
                  onClick={resetForm}
                  className="text-xs text-muted hover:text-primary"
                >
                  Cancel
                </button>
              </div>

              {formError && (
                <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-500 text-xs">
                  {formError}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <FormField label="Color Name" required>
                  <Input
                    placeholder="e.g. Obsidian Black or Tuscan Cognac"
                    value={name}
                    onChange={(e) => {
                      setName(e.target.value);
                      if (!editingColor && !slug) {
                        setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''));
                      }
                    }}
                    className="text-xs h-9"
                    required
                  />
                </FormField>

                <FormField label="Slug (Identifier)">
                  <Input
                    placeholder="e.g. obsidian-black"
                    value={slug}
                    onChange={(e) => setSlug(e.target.value)}
                    className="text-xs h-9 font-mono"
                  />
                </FormField>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
                <div className="sm:col-span-2">
                  <FormField label="Hex Color Code" required>
                    <div className="flex items-center gap-2">
                      <div className="relative">
                        <input
                          type="color"
                          value={hex}
                          onChange={(e) => setHex(e.target.value.toUpperCase())}
                          className="w-10 h-9 rounded-xl border border-theme bg-transparent cursor-pointer p-0.5"
                        />
                      </div>
                      <Input
                        placeholder="#11100F"
                        value={hex}
                        onChange={(e) => setHex(e.target.value.toUpperCase())}
                        className="text-xs h-9 font-mono flex-1"
                        required
                      />
                      <div
                        className="w-9 h-9 rounded-xl border border-theme shadow-xs flex-shrink-0"
                        style={{ backgroundColor: hex }}
                        title="Live swatch preview"
                      />
                    </div>
                  </FormField>
                </div>

                <FormField label="Sort Order">
                  <Input
                    type="number"
                    value={sortOrder}
                    onChange={(e) => setSortOrder(Number(e.target.value))}
                    className="text-xs h-9 font-mono"
                  />
                </FormField>
              </div>

              <div className="flex items-center justify-between pt-2">
                <div className="flex items-center gap-2">
                  <Switch checked={isActive} onChange={setIsActive} />
                  <span className="text-xs text-secondary font-medium">
                    {isActive ? 'Active (available for products)' : 'Inactive (disabled for new products)'}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <Button type="button" variant="outline" size="sm" onClick={resetForm}>
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    variant="primary"
                    size="sm"
                    isLoading={createMutation.isPending || updateMutation.isPending}
                  >
                    {editingColor ? 'Update Color' : 'Save Color'}
                  </Button>
                </div>
              </div>
            </form>
          )}

          {/* Colors List Table */}
          <div className="border border-theme rounded-xl overflow-hidden">
            <div className="max-h-96 overflow-y-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-surface-subtle sticky top-0 border-b border-theme text-muted uppercase font-mono tracking-wider text-[10px]">
                  <tr>
                    <th className="py-2.5 px-3">Swatch</th>
                    <th className="py-2.5 px-3">Color Name</th>
                    <th className="py-2.5 px-3">Hex / Slug</th>
                    <th className="py-2.5 px-3">Products</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-theme">
                  {isLoading ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-muted">
                        Loading color palette...
                      </td>
                    </tr>
                  ) : filteredColors.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-muted">
                        No product colors found matching search.
                      </td>
                    </tr>
                  ) : (
                    filteredColors.map((c) => (
                      <tr key={c.id} className="hover:bg-surface-subtle/50 transition-colors">
                        <td className="py-2.5 px-3">
                          <div
                            className="w-6 h-6 rounded-lg border border-theme shadow-xs"
                            style={{ backgroundColor: c.hex }}
                          />
                        </td>
                        <td className="py-2.5 px-3 font-semibold text-primary">{c.name}</td>
                        <td className="py-2.5 px-3 font-mono text-muted text-[11px]">
                          <span className="text-primary font-bold">{c.hex}</span>
                          <span className="block text-[10px] text-muted">{c.slug}</span>
                        </td>
                        <td className="py-2.5 px-3">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-mono bg-surface-subtle border border-theme text-secondary">
                            {c.productCount ?? 0} {c.productCount === 1 ? 'product' : 'products'}
                          </span>
                        </td>
                        <td className="py-2.5 px-3">
                          <button
                            type="button"
                            onClick={() => toggleMutation.mutate(c.id)}
                            className="inline-flex items-center gap-1.5 cursor-pointer hover:opacity-80 transition-opacity"
                            title="Click to toggle status"
                          >
                            {c.isActive ? (
                              <span className="inline-flex items-center gap-1 text-[11px] text-emerald-500 font-medium">
                                <CheckCircle2 className="w-3.5 h-3.5" /> Active
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[11px] text-rose-400 font-medium">
                                <XCircle className="w-3.5 h-3.5" /> Inactive
                              </span>
                            )}
                          </button>
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              type="button"
                              onClick={() => handleStartEdit(c)}
                              className="p-1 rounded text-muted hover:text-amber-500 transition-colors"
                              title="Edit color"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeleteTarget(c)}
                              className="p-1 rounded text-muted hover:text-rose-500 transition-colors"
                              title="Delete color"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </Modal>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => {
          if (deleteTarget) deleteMutation.mutate(deleteTarget.id);
        }}
        title="Delete Product Color"
        message={
          deleteTarget?.productCount && deleteTarget.productCount > 0
            ? \`WARNING: '\${deleteTarget.name}' is currently assigned to \${deleteTarget.productCount} product(s). To preserve catalog integrity, you cannot delete a color in active use. Deactivate it instead.\`
            : \`Are you sure you want to permanently delete color '\${deleteTarget?.name}'? This action cannot be undone.\`
        }
        confirmText={deleteTarget?.productCount && deleteTarget.productCount > 0 ? 'Cannot Delete (In Use)' : 'Delete Color'}
        variant={deleteTarget?.productCount && deleteTarget.productCount > 0 ? 'warning' : 'danger'}
        isLoading={deleteMutation.isPending}
      />
    </>
  );
};
`;
fs.writeFileSync(path.join(MODALS_DIR, 'ManageColorsModal.tsx'), manageColorsModalContent, 'utf8');
console.log('✓ Created ManageColorsModal.tsx');

// 3. ManagePoliciesModal.tsx
const managePoliciesModalContent = `import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { policiesApi } from '@/lib/api/policies';
import { ProductPolicy } from '@/types';
import { Modal } from '@/components/common/Modal';
import { Button } from '@/components/common/Button';
import { Input } from '@/components/forms/Input';
import { Textarea } from '@/components/forms/Textarea';
import { FormField } from '@/components/forms/FormField';
import { Switch } from '@/components/forms/Switch';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { useToast } from '@/context/ToastContext';
import { Plus, Edit2, Trash2, Search, CheckCircle2, XCircle, RefreshCw, ListOrdered, X } from 'lucide-react';

interface ManagePoliciesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPoliciesUpdated?: () => void;
}

export const ManagePoliciesModal: React.FC<ManagePoliciesModalProps> = ({
  isOpen,
  onClose,
  onPoliciesUpdated,
}) => {
  const toast = useToast();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState('');
  const [editingPolicy, setEditingPolicy] = useState<ProductPolicy | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<ProductPolicy | null>(null);

  // Form states
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [bulletPoints, setBulletPoints] = useState<string[]>([]);
  const [newBullet, setNewBullet] = useState('');
  const [sortOrder, setSortOrder] = useState<number>(10);
  const [isActive, setIsActive] = useState<boolean>(true);
  const [formError, setFormError] = useState('');

  const { data: policies = [], isLoading, refetch } = useQuery({
    queryKey: ['admin-policies', search],
    queryFn: () => policiesApi.listPolicies({ search: search.trim() || undefined }),
    enabled: isOpen,
  });

  const invalidateQueries = () => {
    queryClient.invalidateQueries({ queryKey: ['admin-policies'] });
    if (onPoliciesUpdated) onPoliciesUpdated();
  };

  const createMutation = useMutation({
    mutationFn: policiesApi.createPolicy,
    onSuccess: () => {
      toast.show('success', 'Policy created successfully');
      resetForm();
      invalidateQueries();
    },
    onError: (err: any) => {
      const msg = err.response?.data?.message || err.message || 'Failed to create policy';
      setFormError(msg);
      toast.show('error', msg);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => policiesApi.updatePolicy(id, data),
    onSuccess: () => {
      toast.show('success', 'Policy updated successfully');
      resetForm();
      invalidateQueries();
    },
    onError: (err: any) => {
      const msg = err.response?.data?.message || err.message || 'Failed to update policy';
      setFormError(msg);
      toast.show('error', msg);
    },
  });

  const toggleMutation = useMutation({
    mutationFn: policiesApi.toggleActive,
    onSuccess: (updated) => {
      toast.show('success', \`Policy '\${updated.name}' is now \${updated.isActive ? 'active' : 'inactive'}\`);
      invalidateQueries();
    },
    onError: (err: any) => {
      const msg = err.response?.data?.message || err.message || 'Failed to toggle status';
      toast.show('error', msg);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: policiesApi.deletePolicy,
    onSuccess: () => {
      toast.show('success', 'Policy deleted successfully');
      setDeleteTarget(null);
      invalidateQueries();
    },
    onError: (err: any) => {
      const msg = err.response?.data?.message || err.message || 'Failed to delete policy';
      toast.show('error', msg);
      setDeleteTarget(null);
    },
  });

  const resetForm = () => {
    setEditingPolicy(null);
    setName('');
    setSlug('');
    setDescription('');
    setBulletPoints([]);
    setNewBullet('');
    setSortOrder(policies.length * 10 + 10);
    setIsActive(true);
    setFormError('');
    setIsFormOpen(false);
  };

  const handleStartCreate = () => {
    resetForm();
    setIsFormOpen(true);
  };

  const handleStartEdit = (p: ProductPolicy) => {
    setEditingPolicy(p);
    setName(p.name);
    setSlug(p.slug);
    setDescription(p.description || '');
    setBulletPoints(Array.isArray(p.bulletPoints) ? [...p.bulletPoints] : []);
    setNewBullet('');
    setSortOrder(p.sortOrder ?? 10);
    setIsActive(p.isActive);
    setFormError('');
    setIsFormOpen(true);
  };

  const handleAddBullet = () => {
    if (!newBullet.trim()) return;
    setBulletPoints([...bulletPoints, newBullet.trim()]);
    setNewBullet('');
  };

  const handleRemoveBullet = (index: number) => {
    setBulletPoints(bulletPoints.filter((_, idx) => idx !== index));
  };

  const handleUpdateBullet = (index: number, val: string) => {
    const copy = [...bulletPoints];
    copy[index] = val;
    setBulletPoints(copy);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setFormError('Policy name is required');
      return;
    }
    if (!description.trim()) {
      setFormError('Policy description is required');
      return;
    }

    setFormError('');
    const payload = {
      name: name.trim(),
      slug: slug.trim() || undefined,
      description: description.trim(),
      bulletPoints: bulletPoints.filter((b) => b && b.trim().length > 0),
      sortOrder: Number(sortOrder) || 10,
      isActive,
    };

    if (editingPolicy) {
      updateMutation.mutate({ id: editingPolicy.id, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const filteredPolicies = policies.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.slug.toLowerCase().includes(search.toLowerCase()) ||
    p.description.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title="Manage Reusable Product Policies"
        subtitle="Manage shipping, returns, warranty, and bespoke care policies attached across products"
        maxWidth="2xl"
      >
        <div className="space-y-5">
          {/* Top toolbar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-muted absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search policies (e.g. Shipping, Returns, Warranty)..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-surface-subtle border border-theme rounded-xl pl-9 pr-3 py-2 text-xs text-primary focus:outline-none focus:ring-1 focus:ring-amber-500"
              />
            </div>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => refetch()}
                leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
              >
                Refresh
              </Button>
              <Button
                type="button"
                variant="primary"
                size="sm"
                onClick={handleStartCreate}
                leftIcon={<Plus className="w-3.5 h-3.5" />}
              >
                Add Policy
              </Button>
            </div>
          </div>

          {/* Inline Create / Edit Drawer */}
          {isFormOpen && (
            <form onSubmit={handleSave} className="p-4 rounded-xl border border-amber-500/30 bg-surface-subtle/70 space-y-4 animate-in fade-in">
              <div className="flex items-center justify-between pb-2 border-b border-theme">
                <h4 className="text-xs font-bold uppercase tracking-wider text-amber-500">
                  {editingPolicy ? \`Edit Policy: \${editingPolicy.name}\` : 'Create New Reusable Policy'}
                </h4>
                <button
                  type="button"
                  onClick={resetForm}
                  className="text-xs text-muted hover:text-primary"
                >
                  Cancel
                </button>
              </div>

              {formError && (
                <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-500 text-xs">
                  {formError}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <FormField label="Policy Name / Title" required>
                  <Input
                    placeholder="e.g. Shipping & White-Glove Delivery"
                    value={name}
                    onChange={(e) => {
                      setName(e.target.value);
                      if (!editingPolicy && !slug) {
                        setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''));
                      }
                    }}
                    className="text-xs h-9"
                    required
                  />
                </FormField>

                <FormField label="Slug (Stable Identifier)">
                  <Input
                    placeholder="e.g. shipping-delivery"
                    value={slug}
                    onChange={(e) => setSlug(e.target.value)}
                    className="text-xs h-9 font-mono"
                  />
                </FormField>
              </div>

              <FormField label="Main Policy Narrative Description" required>
                <Textarea
                  placeholder="Comprehensive description displayed on product detail accordions..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  className="text-xs"
                  required
                />
              </FormField>

              {/* Repeatable Bullet Points Section */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-primary flex items-center gap-1.5">
                  <ListOrdered className="w-3.5 h-3.5 text-amber-500" />
                  Key Highlights / Bullet Points (Optional)
                </label>
                <div className="space-y-2">
                  {bulletPoints.map((bullet, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <span className="text-[10px] font-mono text-muted w-4">{idx + 1}.</span>
                      <Input
                        value={bullet}
                        onChange={(e) => handleUpdateBullet(idx, e.target.value)}
                        placeholder="Bullet point detail..."
                        className="text-xs h-8 flex-1"
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveBullet(idx)}
                        className="text-muted hover:text-rose-500 p-1 transition-colors"
                        title="Remove bullet"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                  <div className="flex items-center gap-2 pt-1">
                    <Input
                      value={newBullet}
                      onChange={(e) => setNewBullet(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddBullet();
                        }
                      }}
                      placeholder="Add another highlight bullet..."
                      className="text-xs h-8 flex-1"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleAddBullet}
                      leftIcon={<Plus className="w-3 h-3" />}
                    >
                      Add Point
                    </Button>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <FormField label="Sort Order">
                  <Input
                    type="number"
                    value={sortOrder}
                    onChange={(e) => setSortOrder(Number(e.target.value))}
                    className="text-xs h-9 font-mono"
                  />
                </FormField>

                <div className="flex items-center gap-2 pt-4">
                  <Switch checked={isActive} onChange={setIsActive} />
                  <span className="text-xs text-secondary font-medium">
                    {isActive ? 'Active (available for products)' : 'Inactive (disabled for new products)'}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-theme">
                <Button type="button" variant="outline" size="sm" onClick={resetForm}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  isLoading={createMutation.isPending || updateMutation.isPending}
                >
                  {editingPolicy ? 'Update Policy' : 'Save Policy'}
                </Button>
              </div>
            </form>
          )}

          {/* Policies List */}
          <div className="border border-theme rounded-xl overflow-hidden">
            <div className="max-h-96 overflow-y-auto divide-y divide-theme">
              {isLoading ? (
                <div className="py-8 text-center text-muted text-xs">Loading policies...</div>
              ) : filteredPolicies.length === 0 ? (
                <div className="py-8 text-center text-muted text-xs">No policies found matching search.</div>
              ) : (
                filteredPolicies.map((p) => (
                  <div key={p.id} className="p-3.5 hover:bg-surface-subtle/50 transition-colors flex items-start justify-between gap-3">
                    <div className="space-y-1 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-primary text-xs">{p.name}</span>
                        <span className="font-mono text-[10px] text-muted">({p.slug})</span>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-surface-subtle border border-theme text-secondary">
                          {p.productCount ?? 0} {p.productCount === 1 ? 'product' : 'products'}
                        </span>
                        {p.isActive ? (
                          <span className="inline-flex items-center gap-0.5 text-[10px] text-emerald-500 font-medium">
                            <CheckCircle2 className="w-3 h-3" /> Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-0.5 text-[10px] text-rose-400 font-medium">
                            <XCircle className="w-3 h-3" /> Inactive
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted line-clamp-2 leading-relaxed">{p.description}</p>
                      {Array.isArray(p.bulletPoints) && p.bulletPoints.length > 0 && (
                        <div className="flex items-center gap-1.5 pt-0.5 text-[11px] text-amber-500 font-mono">
                          <span>• {p.bulletPoints.length} highlight {p.bulletPoints.length === 1 ? 'bullet' : 'bullets'} configured</span>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-1 flex-shrink-0 pt-0.5">
                      <button
                        type="button"
                        onClick={() => toggleMutation.mutate(p.id)}
                        className="p-1 rounded text-muted hover:text-primary transition-colors text-xs font-mono"
                        title="Toggle active status"
                      >
                        {p.isActive ? 'Deactivate' : 'Activate'}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleStartEdit(p)}
                        className="p-1.5 rounded text-muted hover:text-amber-500 transition-colors"
                        title="Edit policy"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleteTarget(p)}
                        className="p-1.5 rounded text-muted hover:text-rose-500 transition-colors"
                        title="Delete policy"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </Modal>

      {/* Delete Confirmation Dialog with Safeguard */}
      <ConfirmDialog
        isOpen={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => {
          if (deleteTarget) deleteMutation.mutate(deleteTarget.id);
        }}
        title="Delete Product Policy"
        message={
          deleteTarget?.productCount && deleteTarget.productCount > 0
            ? \`WARNING: '\${deleteTarget.name}' is currently attached to \${deleteTarget.productCount} product(s). To maintain published storefront information, you cannot delete a policy in active use. Deactivate it instead.\`
            : \`Are you sure you want to permanently delete policy '\${deleteTarget?.name}'? This action cannot be undone.\`
        }
        confirmText={deleteTarget?.productCount && deleteTarget.productCount > 0 ? 'Cannot Delete (In Use)' : 'Delete Policy'}
        variant={deleteTarget?.productCount && deleteTarget.productCount > 0 ? 'warning' : 'danger'}
        isLoading={deleteMutation.isPending}
      />
    </>
  );
};
`;
fs.writeFileSync(path.join(MODALS_DIR, 'ManagePoliciesModal.tsx'), managePoliciesModalContent, 'utf8');
console.log('✓ Created ManagePoliciesModal.tsx');
