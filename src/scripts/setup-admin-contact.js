import fs from 'fs';
import path from 'path';

const ADMIN_DIR = path.resolve('../leathermart-admin');
console.log('Targeting admin directory:', ADMIN_DIR);

if (!fs.existsSync(ADMIN_DIR)) {
  console.error('Admin directory does not exist:', ADMIN_DIR);
  process.exit(1);
}

// ==========================================
// 1. Update src/types/index.ts
// ==========================================
const typesPath = path.join(ADMIN_DIR, 'src/types/index.ts');
let typesContent = fs.readFileSync(typesPath, 'utf8');

if (!typesContent.includes('export interface ContactMessage')) {
  const contactTypes = `
// Contact Us Inquiries
export type ContactMessageStatus = 'new' | 'in_progress' | 'resolved' | 'spam';

export interface ContactMessage {
  id: string;
  name: string;
  email: string;
  phone?: string;
  subject: string;
  message: string;
  status: ContactMessageStatus;
  adminNotes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ContactQueryParams {
  page?: number;
  limit?: number;
  status?: string;
  search?: string;
  startDate?: string;
  endDate?: string;
}
`;
  typesContent += contactTypes;
  fs.writeFileSync(typesPath, typesContent, 'utf8');
  console.log('[Admin] Added ContactMessage types to src/types/index.ts');
}

// ==========================================
// 2. Update src/components/common/Badge.tsx for contact statuses
// ==========================================
const badgePath = path.join(ADMIN_DIR, 'src/components/common/Badge.tsx');
let badgeContent = fs.readFileSync(badgePath, 'utf8');

if (!badgeContent.includes("case 'resolved':")) {
  badgeContent = badgeContent.replace(
    "case 'published':",
    "case 'resolved':\n    case 'published':"
  );
  badgeContent = badgeContent.replace(
    "case 'draft':",
    "case 'new':\n      return <Badge variant=\"sky\" dot className={className}>New</Badge>;\n    case 'in_progress':\n      return <Badge variant=\"amber\" dot className={className}>In Progress</Badge>;\n    case 'spam':\n      return <Badge variant=\"rose\" className={className}>Spam</Badge>;\n    case 'draft':"
  );
  fs.writeFileSync(badgePath, badgeContent, 'utf8');
  console.log('[Admin] Updated Badge.tsx for contact statuses');
}

// ==========================================
// 3. Create src/lib/api/contact.ts
// ==========================================
const apiContactPath = path.join(ADMIN_DIR, 'src/lib/api/contact.ts');
const apiContactContent = `import { apiClient } from './client';
import { ContactMessage, ContactQueryParams } from '@/types';

export interface ContactListResult {
  data: ContactMessage[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalCount: number;
    limit: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}

export const contactApi = {
  listMessages: async (params: ContactQueryParams = {}): Promise<ContactListResult> => {
    const res = await apiClient.get('/admin/contact-messages', { params });
    return res.data;
  },

  getMessage: async (id: string): Promise<ContactMessage> => {
    const res = await apiClient.get(\`/admin/contact-messages/\${id}\`);
    return res.data.data;
  },

  updateMessage: async (
    id: string,
    payload: { status?: string; adminNotes?: string }
  ): Promise<ContactMessage> => {
    const res = await apiClient.patch(\`/admin/contact-messages/\${id}\`, payload);
    return res.data.data;
  },

  deleteMessage: async (id: string): Promise<{ id: string }> => {
    const res = await apiClient.delete(\`/admin/contact-messages/\${id}\`);
    return res.data.data;
  },
};
`;
fs.writeFileSync(apiContactPath, apiContactContent, 'utf8');
console.log('[Admin] Created src/lib/api/contact.ts');

// ==========================================
// 4. Create ContactMessageDetailModal.tsx
// ==========================================
const contactModalDir = path.join(ADMIN_DIR, 'src/pages/contact-messages');
if (!fs.existsSync(contactModalDir)) {
  fs.mkdirSync(contactModalDir, { recursive: true });
}

const detailModalPath = path.join(contactModalDir, 'ContactMessageDetailModal.tsx');
const detailModalContent = `import React, { useState, useEffect } from 'react';
import { Modal } from '@/components/common/Modal';
import { Button } from '@/components/common/Button';
import { StatusBadge } from '@/components/common/Badge';
import { Select } from '@/components/forms/Select';
import { Textarea } from '@/components/forms/Textarea';
import { ContactMessage, ContactMessageStatus } from '@/types';
import { formatDate } from '@/lib/utils';
import {
  Mail,
  Phone,
  User,
  Calendar,
  Tag,
  Save,
  ExternalLink,
  MessageSquare,
  FileEdit,
} from 'lucide-react';

interface ContactMessageDetailModalProps {
  message: ContactMessage | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: (id: string, updates: { status: ContactMessageStatus; adminNotes: string }) => Promise<void>;
  isUpdating: boolean;
}

export const ContactMessageDetailModal: React.FC<ContactMessageDetailModalProps> = ({
  message,
  isOpen,
  onClose,
  onUpdate,
  isUpdating,
}) => {
  const [status, setStatus] = useState<ContactMessageStatus>('new');
  const [adminNotes, setAdminNotes] = useState('');

  useEffect(() => {
    if (message) {
      setStatus(message.status);
      setAdminNotes(message.adminNotes || '');
    }
  }, [message]);

  if (!message) return null;

  const handleSave = async () => {
    await onUpdate(message.id, { status, adminNotes });
  };

  const mailtoUrl = \`mailto:\${encodeURIComponent(message.email)}?subject=\${encodeURIComponent(
    \`Re: \${message.subject} [Atelier Valenti Milano]\`
  )}\`;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Client Concierge Inquiry"
      size="lg"
      footer={
        <div className="flex items-center justify-between w-full">
          <a
            href={mailtoUrl}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border border-theme text-primary hover:bg-surface-hover transition-colors"
          >
            <Mail className="w-3.5 h-3.5 text-amber-500" />
            Reply via Email
            <ExternalLink className="w-3 h-3 text-muted" />
          </a>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={onClose}>
              Close
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleSave}
              isLoading={isUpdating}
              icon={<Save className="w-3.5 h-3.5" />}
            >
              Save Changes
            </Button>
          </div>
        </div>
      }
    >
      <div className="space-y-6">
        {/* Header Summary Card */}
        <div className="p-4 rounded-xl bg-surface-subtle border border-theme space-y-3">
          <div className="flex items-start justify-between gap-4">
            <div>
              <span className="text-[10px] font-mono uppercase tracking-wider text-muted block">
                Subject
              </span>
              <h3 className="text-base font-bold font-serif-luxury text-primary mt-0.5">
                {message.subject}
              </h3>
            </div>
            <StatusBadge status={message.status} />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 pt-3 border-t border-theme text-xs">
            <div>
              <span className="text-muted block text-[10px] uppercase font-mono">Client</span>
              <div className="flex items-center gap-1.5 font-medium text-primary mt-0.5">
                <User className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
                <span className="truncate">{message.name}</span>
              </div>
            </div>

            <div>
              <span className="text-muted block text-[10px] uppercase font-mono">Email</span>
              <div className="flex items-center gap-1.5 font-medium text-primary mt-0.5">
                <Mail className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
                <a
                  href={\`mailto:\${message.email}\`}
                  className="truncate text-amber-500 hover:underline"
                >
                  {message.email}
                </a>
              </div>
            </div>

            <div>
              <span className="text-muted block text-[10px] uppercase font-mono">Phone</span>
              <div className="flex items-center gap-1.5 font-medium text-primary mt-0.5">
                <Phone className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
                <span>{message.phone || 'Not provided'}</span>
              </div>
            </div>

            <div>
              <span className="text-muted block text-[10px] uppercase font-mono">Submitted</span>
              <div className="flex items-center gap-1.5 font-medium text-primary mt-0.5">
                <Calendar className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
                <span>{formatDate(message.createdAt)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Message Body */}
        <div className="space-y-2">
          <div className="flex items-center gap-1.5 text-xs font-bold text-primary uppercase font-mono tracking-wider">
            <MessageSquare className="w-3.5 h-3.5 text-amber-500" />
            Inquiry Message
          </div>
          <div className="p-4 rounded-xl bg-surface border border-theme text-xs sm:text-sm text-secondary whitespace-pre-wrap leading-relaxed max-h-60 overflow-y-auto">
            {message.message}
          </div>
        </div>

        {/* Status & Internal Admin Notes */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-theme">
          <div className="md:col-span-1 space-y-2">
            <label className="text-xs font-bold text-primary uppercase font-mono tracking-wider flex items-center gap-1.5">
              <Tag className="w-3.5 h-3.5 text-amber-500" />
              Inquiry Status
            </label>
            <Select
              value={status}
              onChange={(e) => setStatus(e.target.value as ContactMessageStatus)}
              wrapperClassName="w-full"
            >
              <option value="new">New (Unread)</option>
              <option value="in_progress">In Progress</option>
              <option value="resolved">Resolved</option>
              <option value="spam">Spam / Junk</option>
            </Select>
            <p className="text-[10px] text-muted leading-tight">
              Keep client inquiries organized by lifecycle stage.
            </p>
          </div>

          <div className="md:col-span-2 space-y-2">
            <label className="text-xs font-bold text-primary uppercase font-mono tracking-wider flex items-center gap-1.5">
              <FileEdit className="w-3.5 h-3.5 text-amber-500" />
              Internal Atelier Notes
            </label>
            <Textarea
              value={adminNotes}
              onChange={(e) => setAdminNotes(e.target.value)}
              placeholder="e.g. Spoke with client via telephone; preparing custom sizing quote..."
              rows={3}
              className="w-full text-xs"
            />
          </div>
        </div>
      </div>
    </Modal>
  );
};
`;
fs.writeFileSync(detailModalPath, detailModalContent, 'utf8');
console.log('[Admin] Created ContactMessageDetailModal.tsx');

// ==========================================
// 5. Create ContactMessagesList.tsx
// ==========================================
const listPath = path.join(contactModalDir, 'ContactMessagesList.tsx');
const listContent = `import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { contactApi } from '@/lib/api/contact';
import { ContactMessage, ContactMessageStatus } from '@/types';
import { DataTable, Column } from '@/components/tables/DataTable';
import { StatusBadge } from '@/components/common/Badge';
import { Button } from '@/components/common/Button';
import { RefreshButton } from '@/components/common/RefreshButton';
import { Input } from '@/components/forms/Input';
import { Select } from '@/components/forms/Select';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { ContactMessageDetailModal } from './ContactMessageDetailModal';
import { useToast } from '@/context/ToastContext';
import { useAuth } from '@/context/AuthContext';
import { formatDate } from '@/lib/utils';
import {
  Inbox,
  Search,
  Filter,
  Eye,
  Trash2,
  Calendar,
  Mail,
  User,
} from 'lucide-react';

export const ContactMessagesList: React.FC = () => {
  const toast = useToast();
  const { hasRole } = useAuth();
  const queryClient = useQueryClient();

  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const [activeMessage, setActiveMessage] = useState<ContactMessage | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Fetch paginated messages
  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ['admin-contact-messages', page, statusFilter, searchInput, startDate, endDate],
    queryFn: () =>
      contactApi.listMessages({
        page,
        limit: 15,
        status: statusFilter,
        search: searchInput,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
      }),
  });

  const messages = data?.data || [];
  const pagination = data?.pagination;

  // Update Status / Notes Mutation
  const updateMutation = useMutation({
    mutationFn: ({
      id,
      updates,
    }: {
      id: string;
      updates: { status: ContactMessageStatus; adminNotes: string };
    }) => contactApi.updateMessage(id, updates),
    onSuccess: (updated) => {
      toast.success('Inquiry updated successfully.');
      queryClient.invalidateQueries({ queryKey: ['admin-contact-messages'] });
      setActiveMessage(updated);
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to update inquiry.');
    },
  });

  // Delete Mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) => contactApi.deleteMessage(id),
    onSuccess: () => {
      toast.success('Contact message deleted successfully.');
      queryClient.invalidateQueries({ queryKey: ['admin-contact-messages'] });
      setDeletingId(null);
      if (activeMessage && activeMessage.id === deletingId) {
        setActiveMessage(null);
      }
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to delete contact message.');
    },
  });

  const handleUpdate = async (
    id: string,
    updates: { status: ContactMessageStatus; adminNotes: string }
  ) => {
    await updateMutation.mutateAsync({ id, updates });
  };

  const columns: Column<ContactMessage>[] = [
    {
      key: 'name',
      header: 'Client & Subject',
      render: (item) => (
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-primary">{item.name}</span>
            {item.status === 'new' && (
              <span className="w-2 h-2 rounded-full bg-sky-500 animate-pulse" />
            )}
          </div>
          <p className="text-xs text-secondary line-clamp-1 font-medium">{item.subject}</p>
          <div className="flex items-center gap-2 text-[11px] text-muted">
            <Mail className="w-3 h-3 text-amber-500 flex-shrink-0" />
            <span className="truncate max-w-[180px]">{item.email}</span>
            {item.phone && (
              <>
                <span>•</span>
                <span>{item.phone}</span>
              </>
            )}
          </div>
        </div>
      ),
    },
    {
      key: 'message',
      header: 'Message Excerpt',
      render: (item) => (
        <div className="max-w-xs sm:max-w-md">
          <p className="text-xs text-secondary line-clamp-2 leading-relaxed">
            {item.message}
          </p>
          {item.adminNotes && (
            <span className="inline-block mt-1 text-[10px] text-amber-500/90 font-mono italic">
              Note: {item.adminNotes}
            </span>
          )}
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (item) => <StatusBadge status={item.status} />,
    },
    {
      key: 'createdAt',
      header: 'Submitted',
      render: (item) => (
        <span className="text-xs font-mono text-muted whitespace-nowrap">
          {formatDate(item.createdAt)}
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      render: (item) => (
        <div className="flex items-center justify-end gap-1.5">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setActiveMessage(item)}
            title="View inquiry details"
            icon={<Eye className="w-3.5 h-3.5 text-amber-500" />}
          >
            Review
          </Button>
          {hasRole(['super_admin', 'store_manager']) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setDeletingId(item.id)}
              className="text-rose-500 hover:text-rose-600 hover:bg-rose-500/10"
              title="Delete message"
              icon={<Trash2 className="w-3.5 h-3.5" />}
            />
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold font-serif-luxury text-primary tracking-wide">
            Contact Inquiries
          </h1>
          <p className="text-xs text-muted mt-1">
            Review and respond to client inquiries, sizing questions, and bespoke requests.
          </p>
        </div>
        <RefreshButton onClick={() => refetch()} isLoading={isFetching} />
      </div>

      {/* Filter & Search Bar */}
      <div className="p-4 rounded-2xl bg-surface border border-theme shadow-xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:flex lg:flex-wrap lg:items-center gap-3">
          {/* Search */}
          <div className="flex-1 min-w-[200px]">
            <Input
              value={searchInput}
              onChange={(e) => {
                setSearchInput(e.target.value);
                setPage(1);
              }}
              placeholder="Search by client name, email, or subject..."
              icon={<Search className="w-4 h-4 text-muted" />}
              className="text-xs"
            />
          </div>

          {/* Status Filter */}
          <div className="w-full sm:w-44">
            <Select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              wrapperClassName="w-full"
            >
              <option value="">All Statuses</option>
              <option value="new">New (Unread)</option>
              <option value="in_progress">In Progress</option>
              <option value="resolved">Resolved</option>
              <option value="spam">Spam</option>
            </Select>
          </div>

          {/* Start Date */}
          <div className="w-full sm:w-36">
            <Input
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                setPage(1);
              }}
              className="text-xs"
            />
          </div>

          {/* End Date */}
          <div className="w-full sm:w-36">
            <Input
              type="date"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                setPage(1);
              }}
              className="text-xs"
            />
          </div>

          {/* Reset Filters */}
          {(statusFilter || searchInput || startDate || endDate) && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setStatusFilter('');
                setSearchInput('');
                setStartDate('');
                setEndDate('');
                setPage(1);
              }}
            >
              Reset Filters
            </Button>
          )}
        </div>
      </div>

      {/* Inquiries Table */}
      <DataTable
        columns={columns}
        data={messages}
        isLoading={isLoading}
        emptyTitle="No Contact Inquiries"
        emptyDescription="Client inquiries submitted through the storefront Contact Us modal will appear here."
      />

      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-between text-xs text-muted pt-2">
          <span>
            Showing page {pagination.currentPage} of {pagination.totalPages} ({pagination.totalCount} inquiries)
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={!pagination.hasPrevPage}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={!pagination.hasNextPage}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      {/* Detail / Response Modal */}
      <ContactMessageDetailModal
        message={activeMessage}
        isOpen={Boolean(activeMessage)}
        onClose={() => setActiveMessage(null)}
        onUpdate={handleUpdate}
        isUpdating={updateMutation.isPending}
      />

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={Boolean(deletingId)}
        onClose={() => setDeletingId(null)}
        onConfirm={() => deletingId && deleteMutation.mutate(deletingId)}
        title="Delete Contact Inquiry"
        message="Are you sure you want to delete this client message? This action is permanent and cannot be undone."
        confirmText="Delete Message"
        confirmVariant="danger"
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
};
`;
fs.writeFileSync(listPath, listContent, 'utf8');
console.log('[Admin] Created ContactMessagesList.tsx');

// ==========================================
// 6. Update Sidebar.tsx navigation
// ==========================================
const sidebarPath = path.join(ADMIN_DIR, 'src/components/layout/Sidebar.tsx');
let sidebarContent = fs.readFileSync(sidebarPath, 'utf8');

if (!sidebarContent.includes("href: '/contact-messages'")) {
  sidebarContent = sidebarContent.replace(
    "{ label: 'Bespoke Commissions', href: '/commissions', icon: FileText },",
    "{ label: 'Contact Inquiries', href: '/contact-messages', icon: Inbox },\n        { label: 'Bespoke Commissions', href: '/commissions', icon: FileText },"
  );
  if (!sidebarContent.includes('Inbox,')) {
    sidebarContent = sidebarContent.replace(
      'import {',
      'import {\n  Inbox,'
    );
  }
  fs.writeFileSync(sidebarPath, sidebarContent, 'utf8');
  console.log('[Admin] Updated Sidebar.tsx navigation with Contact Inquiries');
}

// ==========================================
// 7. Update App.tsx routes
// ==========================================
const appPath = path.join(ADMIN_DIR, 'src/App.tsx');
let appContent = fs.readFileSync(appPath, 'utf8');

if (!appContent.includes('/contact-messages')) {
  appContent = appContent.replace(
    "import { CommissionList } from '@/pages/commissions/CommissionList';",
    "import { CommissionList } from '@/pages/commissions/CommissionList';\nimport { ContactMessagesList } from '@/pages/contact-messages/ContactMessagesList';"
  );
  appContent = appContent.replace(
    '<Route path="/commissions" element={<CommissionList />} />',
    '<Route path="/contact-messages" element={<ContactMessagesList />} />\n                    <Route path="/commissions" element={<CommissionList />} />'
  );
  fs.writeFileSync(appPath, appContent, 'utf8');
  console.log('[Admin] Updated App.tsx routes with /contact-messages');
}

console.log('--- Admin Panel Contact Setup Complete! ---');
