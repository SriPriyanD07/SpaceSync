'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../../context/AuthContext';
import { useToast } from '../../../context/ToastContext';
import { api } from '../../../services/api';
import { Resource, ResourceType, ResourceStatus } from '../../../types';
import { RESOURCE_TYPE_LABELS, RESOURCE_STATUS_CONFIG, formatDateOnly } from '../../../utils/format';
import {
  Building2,
  Plus,
  Edit2,
  Trash2,
  Search,
  CheckCircle2,
  AlertCircle,
  MapPin,
  Users,
  ChevronLeft,
} from 'lucide-react';
import { Modal } from '../../../components/ui/Modal';
import { LoadingSkeleton } from '../../../components/ui/LoadingSkeleton';

export default function AdminResourcesPage() {
  const { isAuthenticated, isAdmin, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const toast = useToast();

  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Create / Edit Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingResource, setEditingResource] = useState<Resource | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    type: 'meeting_room' as ResourceType,
    location: '',
    capacity: 4,
    description: '',
    status: 'active' as ResourceStatus,
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!authLoading) {
      if (!isAuthenticated || !isAdmin) {
        router.push('/dashboard');
        return;
      }
      fetchResources();
    }
  }, [authLoading, isAuthenticated, isAdmin, router]);

  const fetchResources = async () => {
    try {
      setLoading(true);
      const res = await api.get<{ data: Resource[] }>('/resources?limit=100');
      setResources(res.data || []);
    } catch (err: any) {
      toast.error(err.message || 'Failed to fetch resources');
    } finally {
      setLoading(false);
    }
  };

  const openCreateModal = () => {
    setEditingResource(null);
    setFormData({
      name: '',
      type: 'meeting_room',
      location: 'Building A, Floor 2',
      capacity: 6,
      description: '',
      status: 'active',
    });
    setIsModalOpen(true);
  };

  const openEditModal = (r: Resource) => {
    setEditingResource(r);
    setFormData({
      name: r.name,
      type: r.type,
      location: r.location,
      capacity: r.capacity,
      description: r.description,
      status: r.status,
    });
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editingResource) {
        await api.patch(`/resources/${editingResource.id}`, formData);
        toast.success(`Resource "${formData.name}" updated successfully.`);
      } else {
        await api.post('/resources', formData);
        toast.success(`Resource "${formData.name}" created successfully.`);
      }
      setIsModalOpen(false);
      await fetchResources();
    } catch (err: any) {
      toast.error(err.message || 'Failed to save resource');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleStatus = async (r: Resource) => {
    const newStatus: ResourceStatus = r.status === 'active' ? 'maintenance' : 'active';
    try {
      await api.patch(`/resources/${r.id}`, { status: newStatus });
      toast.success(`Status updated to ${newStatus}`);
      await fetchResources();
    } catch (err: any) {
      toast.error(err.message || 'Failed to toggle resource status');
    }
  };

  const filtered = resources.filter((r) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      r.name.toLowerCase().includes(q) ||
      r.location.toLowerCase().includes(q) ||
      r.type.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 mb-1">
            <Link href="/admin" className="hover:text-indigo-600 flex items-center gap-1">
              <ChevronLeft className="w-3.5 h-3.5" /> Back to Admin Hub
            </Link>
          </div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
            Resource Provisioning & Management
          </h1>
          <p className="text-slate-500 text-sm">
            Add, update, or deactivate shared meeting spaces, equipment, and workstations.
          </p>
        </div>

        <button
          onClick={openCreateModal}
          className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs flex items-center justify-center gap-2 shadow-sm transition-all"
        >
          <Plus className="w-4 h-4" /> Provision New Resource
        </button>
      </div>

      {/* Filter / Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
        <div className="relative flex-1 max-w-md">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
            <Search className="w-4 h-4" />
          </div>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by resource name, building location, or type..."
            className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-300 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          />
        </div>
        <div className="text-xs text-slate-500 font-medium">
          Total: <strong>{filtered.length}</strong> items
        </div>
      </div>

      {/* Resources Table */}
      {loading ? (
        <LoadingSkeleton className="h-64 rounded-2xl" />
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/70 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-semibold">
                <tr>
                  <th className="py-3.5 px-4">Resource Name</th>
                  <th className="py-3.5 px-4">Type</th>
                  <th className="py-3.5 px-4">Location</th>
                  <th className="py-3.5 px-4">Capacity</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {filtered.map((r) => {
                  const statusConfig = RESOURCE_STATUS_CONFIG[r.status];
                  return (
                    <tr key={r.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3.5 px-4 font-bold text-slate-900">
                        {r.name}
                        {r.description && (
                          <div className="text-[11px] font-normal text-slate-500 line-clamp-1">
                            {r.description}
                          </div>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="font-medium text-slate-800">
                          {RESOURCE_TYPE_LABELS[r.type] || r.type}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">{r.location}</td>
                      <td className="py-3.5 px-4 font-semibold">{r.capacity}</td>
                      <td className="py-3.5 px-4">
                        <button
                          onClick={() => handleToggleStatus(r)}
                          title="Click to toggle status"
                          className={`inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${statusConfig.bg} ${statusConfig.text} ${statusConfig.border}`}
                        >
                          {statusConfig.label}
                        </button>
                      </td>
                      <td className="py-3.5 px-4 text-right space-x-2">
                        <button
                          onClick={() => openEditModal(r)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                          title="Edit Resource"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <Link
                          href={`/resources/${r.id}`}
                          className="inline-block px-2.5 py-1 rounded-lg text-[11px] font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 transition-colors"
                        >
                          Availability
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add / Edit Resource Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingResource ? 'Edit Resource' : 'Provision New Resource'}
        maxWidth="lg"
      >
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Resource Name
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g. Focus Pod 02, Chemistry Spectrometer"
              className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Resource Type
              </label>
              <select
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value as ResourceType })}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              >
                <option value="meeting_room">Meeting Room</option>
                <option value="conference_room">Conference Room</option>
                <option value="training_room">Training Room</option>
                <option value="workstation">Workstation</option>
                <option value="projector">Projector</option>
                <option value="lab_equipment">Lab Equipment</option>
                <option value="study_space">Study Space</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Capacity
              </label>
              <input
                type="number"
                required
                min={1}
                value={formData.capacity}
                onChange={(e) => setFormData({ ...formData, capacity: parseInt(e.target.value, 10) || 1 })}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Location / Desk / Room #
            </label>
            <input
              type="text"
              required
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              placeholder="e.g. Science Wing Room 104"
              className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Status
            </label>
            <select
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value as ResourceStatus })}
              className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            >
              <option value="active">Active (Available for booking)</option>
              <option value="maintenance">Maintenance (Temporarily locked)</option>
              <option value="inactive">Inactive (Archived)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Description & Amenities
            </label>
            <textarea
              rows={3}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Specify displays, microphones, software licenses, or specific lab protocols..."
              className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs"
            >
              {saving ? 'Saving...' : editingResource ? 'Save Changes' : 'Create Resource'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
