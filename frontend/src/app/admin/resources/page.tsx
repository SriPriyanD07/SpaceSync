'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../../context/AuthContext';
import { useToast } from '../../../context/ToastContext';
import { api } from '../../../services/api';
import { Resource, ResourceType, ResourceStatus } from '../../../types';
import { RESOURCE_TYPE_LABELS, RESOURCE_STATUS_CONFIG } from '../../../utils/format';
import {
  Plus,
  Edit2,
  Search,
  ChevronLeft,
  ArrowUpRight,
  X,
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
  const [selectedType, setSelectedType] = useState<string>('all');

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
        toast.success(`Resource "${formData.name}" updated.`);
      } else {
        await api.post('/resources', formData);
        toast.success(`Resource "${formData.name}" provisioned.`);
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
    if (selectedType !== 'all' && r.type !== selectedType) return false;
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      r.name.toLowerCase().includes(q) ||
      r.location.toLowerCase().includes(q) ||
      r.type.toLowerCase().includes(q)
    );
  });

  const activeCount = resources.filter((r) => r.status === 'active').length;
  const maintenanceCount = resources.filter((r) => r.status === 'maintenance').length;
  const uniqueLocations = new Set(resources.map((r) => r.location.split(',')[0].trim())).size;

  return (
    <div className="space-y-12 animate-in fade-in duration-300 max-w-7xl mx-auto pb-16">
      {/* Top Breadcrumb & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 border-b border-neutral-200 pb-8">
        <div>
          <div className="flex items-center gap-2 font-mono text-[11px] text-neutral-400 uppercase tracking-widest mb-3">
            <Link href="/admin" className="hover:text-neutral-900 transition-colors flex items-center gap-1">
              <ChevronLeft className="w-3.5 h-3.5" /> ADMIN OPERATIONS
            </Link>
            <span>/</span>
            <span className="text-neutral-900">INVENTORY</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-light tracking-tight text-neutral-950 font-serif">
            Resource Provisioning
          </h1>
          <p className="text-neutral-500 text-sm mt-1 max-w-2xl font-sans">
            Catalog of physical meeting rooms, private focus pods, workstations, and laboratory apparatus.
          </p>
        </div>

        <button
          onClick={openCreateModal}
          className="inline-flex items-center justify-center gap-2 px-5 py-3 bg-neutral-950 text-white font-mono text-xs uppercase tracking-widest hover:bg-neutral-800 transition-all cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-3.5 h-3.5" /> Provision Asset
        </button>
      </div>

      {/* Summary KPI Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 border border-neutral-200 bg-white">
        <div className="p-6 border-r border-b lg:border-b-0 border-neutral-200">
          <div className="font-mono text-[10px] text-neutral-400 uppercase tracking-widest">Total Inventory</div>
          <div className="text-3xl font-light text-neutral-950 mt-1 font-mono">{resources.length}</div>
          <div className="text-xs text-neutral-500 mt-1">Configured resources</div>
        </div>
        <div className="p-6 border-b lg:border-b-0 lg:border-r border-neutral-200">
          <div className="font-mono text-[10px] text-neutral-400 uppercase tracking-widest">Operational (Live)</div>
          <div className="text-3xl font-light text-emerald-700 mt-1 font-mono">{activeCount}</div>
          <div className="text-xs text-neutral-500 mt-1">Available for reservation</div>
        </div>
        <div className="p-6 border-r border-neutral-200">
          <div className="font-mono text-[10px] text-neutral-400 uppercase tracking-widest">Under Maintenance</div>
          <div className="text-3xl font-light text-amber-700 mt-1 font-mono">{maintenanceCount}</div>
          <div className="text-xs text-neutral-500 mt-1">Temporarily locked</div>
        </div>
        <div className="p-6">
          <div className="font-mono text-[10px] text-neutral-400 uppercase tracking-widest">Facility Zones</div>
          <div className="text-3xl font-light text-neutral-950 mt-1 font-mono">{uniqueLocations}</div>
          <div className="text-xs text-neutral-500 mt-1">Active wings & floors</div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="space-y-4">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 border border-neutral-200 bg-white p-3">
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-neutral-400">
              <Search className="w-4 h-4" />
            </div>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by asset name, building, floor or category..."
              className="w-full pl-10 pr-4 py-2 bg-transparent text-xs text-neutral-900 placeholder:text-neutral-400 focus:outline-none font-mono"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-neutral-400 hover:text-neutral-700"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-1 overflow-x-auto border-t md:border-t-0 border-neutral-100 pt-2 md:pt-0">
            {[
              { id: 'all', label: 'ALL' },
              { id: 'meeting_room', label: 'MEETING' },
              { id: 'conference_room', label: 'CONF' },
              { id: 'workstation', label: 'PODS' },
              { id: 'lab_equipment', label: 'LAB' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setSelectedType(tab.id)}
                className={`px-3 py-1.5 font-mono text-[10px] uppercase tracking-wider transition-colors cursor-pointer whitespace-nowrap ${
                  selectedType === tab.id
                    ? 'bg-neutral-950 text-white'
                    : 'text-neutral-600 hover:bg-neutral-100'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* High-density Architectural Table */}
      {loading ? (
        <LoadingSkeleton className="h-96 w-full" />
      ) : filtered.length === 0 ? (
        <div className="border border-neutral-200 bg-white p-12 text-center">
          <p className="font-mono text-xs uppercase tracking-widest text-neutral-400">No assets match criteria</p>
          <button
            onClick={() => {
              setSearch('');
              setSelectedType('all');
            }}
            className="mt-4 font-mono text-xs text-neutral-900 underline uppercase tracking-wider cursor-pointer"
          >
            Clear filters
          </button>
        </div>
      ) : (
        <div className="border border-neutral-200 bg-white overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-neutral-50/80 border-b border-neutral-200 font-mono text-[10px] uppercase tracking-widest text-neutral-500">
                <tr>
                  <th className="py-3 px-4 w-12 text-neutral-400">REF</th>
                  <th className="py-3 px-4 font-normal">ASSET NAME & SPEC</th>
                  <th className="py-3 px-4 font-normal">CLASSIFICATION</th>
                  <th className="py-3 px-4 font-normal">LOCATION SPEC</th>
                  <th className="py-3 px-4 font-normal text-right">CAPACITY</th>
                  <th className="py-3 px-4 font-normal">STATUS</th>
                  <th className="py-3 px-4 font-normal text-right">ACTIONS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {filtered.map((r, idx) => {
                  const statusConfig = RESOURCE_STATUS_CONFIG[r.status];
                  return (
                    <tr key={r.id} className="hover:bg-neutral-50/60 transition-colors group">
                      <td className="py-4 px-4 font-mono text-[11px] text-neutral-400">
                        {String(idx + 1).padStart(2, '0')}
                      </td>
                      <td className="py-4 px-4">
                        <div className="font-medium text-neutral-950">{r.name}</div>
                        {r.description && (
                          <div className="text-[11px] text-neutral-500 line-clamp-1 max-w-sm mt-0.5">
                            {r.description}
                          </div>
                        )}
                      </td>
                      <td className="py-4 px-4">
                        <span className="font-mono text-[11px] text-neutral-600 uppercase">
                          {RESOURCE_TYPE_LABELS[r.type] || r.type}
                        </span>
                      </td>
                      <td className="py-4 px-4 font-mono text-[11px] text-neutral-600">
                        {r.location}
                      </td>
                      <td className="py-4 px-4 text-right font-mono text-[11px] text-neutral-900">
                        {r.capacity} pax
                      </td>
                      <td className="py-4 px-4">
                        <button
                          onClick={() => handleToggleStatus(r)}
                          title="Click to toggle status"
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-mono uppercase tracking-wider border cursor-pointer transition-all ${
                            r.status === 'active'
                              ? 'bg-neutral-50 text-neutral-900 border-neutral-300 hover:border-neutral-950'
                              : 'bg-amber-50 text-amber-800 border-amber-300 hover:bg-amber-100'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              r.status === 'active' ? 'bg-emerald-600' : 'bg-amber-600'
                            }`}
                          />
                          {statusConfig.label}
                        </button>
                      </td>
                      <td className="py-4 px-4 text-right space-x-3">
                        <button
                          onClick={() => openEditModal(r)}
                          className="font-mono text-[11px] text-neutral-600 hover:text-neutral-950 underline cursor-pointer transition-colors"
                        >
                          EDIT
                        </button>
                        <Link
                          href={`/resources/${r.id}`}
                          className="font-mono text-[11px] text-neutral-900 hover:text-neutral-600 inline-flex items-center gap-0.5"
                        >
                          TIMELINE <ArrowUpRight className="w-3 h-3" />
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
        title={editingResource ? 'EDIT RESOURCE SPEC' : 'PROVISION ASSET'}
        maxWidth="lg"
      >
        <form onSubmit={handleSave} className="space-y-5 pt-2">
          <div>
            <label className="block font-mono text-[10px] uppercase tracking-widest text-neutral-500 mb-1.5">
              Resource Designation / Name *
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g. Focus Pod 02, Chemistry Spectrometer"
              className="w-full px-3.5 py-2.5 border border-neutral-300 text-xs text-neutral-900 focus:outline-none focus:border-neutral-950 font-sans"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-mono text-[10px] uppercase tracking-widest text-neutral-500 mb-1.5">
                Asset Classification *
              </label>
              <select
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value as ResourceType })}
                className="w-full px-3.5 py-2.5 border border-neutral-300 text-xs bg-white text-neutral-900 focus:outline-none focus:border-neutral-950 font-mono"
              >
                <option value="meeting_room">Meeting Room</option>
                <option value="conference_room">Conference Room</option>
                <option value="training_room">Training Room</option>
                <option value="workstation">Workstation Pod</option>
                <option value="projector">AV / Projector</option>
                <option value="lab_equipment">Lab Equipment</option>
                <option value="study_space">Study Space</option>
              </select>
            </div>

            <div>
              <label className="block font-mono text-[10px] uppercase tracking-widest text-neutral-500 mb-1.5">
                Seating / Capacity *
              </label>
              <input
                type="number"
                required
                min={1}
                value={formData.capacity}
                onChange={(e) => setFormData({ ...formData, capacity: parseInt(e.target.value, 10) || 1 })}
                className="w-full px-3.5 py-2.5 border border-neutral-300 text-xs text-neutral-900 focus:outline-none focus:border-neutral-950 font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-mono text-[10px] uppercase tracking-widest text-neutral-500 mb-1.5">
                Physical Location Spec *
              </label>
              <input
                type="text"
                required
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                placeholder="e.g. Building B, Floor 3"
                className="w-full px-3.5 py-2.5 border border-neutral-300 text-xs text-neutral-900 focus:outline-none focus:border-neutral-950 font-sans"
              />
            </div>

            <div>
              <label className="block font-mono text-[10px] uppercase tracking-widest text-neutral-500 mb-1.5">
                Operational Status *
              </label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as ResourceStatus })}
                className="w-full px-3.5 py-2.5 border border-neutral-300 text-xs bg-white text-neutral-900 focus:outline-none focus:border-neutral-950 font-mono"
              >
                <option value="active">Active (Available)</option>
                <option value="maintenance">Maintenance (Locked)</option>
                <option value="inactive">Archived</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block font-mono text-[10px] uppercase tracking-widest text-neutral-500 mb-1.5">
              Description & Hardware Amenities
            </label>
            <textarea
              rows={3}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="e.g. 4K OLED display, Logitech Rally PTZ camera, USB-C docking station..."
              className="w-full px-3.5 py-2.5 border border-neutral-300 text-xs text-neutral-900 focus:outline-none focus:border-neutral-950 font-sans"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-neutral-200">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 font-mono text-xs uppercase tracking-wider text-neutral-500 hover:text-neutral-900 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2.5 font-mono text-xs uppercase tracking-widest bg-neutral-950 text-white hover:bg-neutral-800 disabled:opacity-50 cursor-pointer transition-colors"
            >
              {saving ? 'Saving...' : editingResource ? 'Save Changes' : 'Provision Asset'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

