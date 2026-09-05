'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api } from '../../services/api';
import { Resource, ResourceType, ResourceStatus } from '../../types';
import { RESOURCE_TYPE_LABELS, RESOURCE_STATUS_CONFIG } from '../../utils/format';
import { Search, X, ArrowUpRight, Filter } from 'lucide-react';
import { LoadingSkeleton } from '../../components/ui/LoadingSkeleton';
import { EmptyState } from '../../components/ui/EmptyState';

export default function ResourceDiscoveryPage() {
  const router = useRouter();
  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);

  // Filter state
  const [search, setSearch] = useState('');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [selectedLocation, setSelectedLocation] = useState<string>('all');
  const [minCapacity, setMinCapacity] = useState<number>(0);

  useEffect(() => {
    fetchResources();
  }, []);

  const fetchResources = async () => {
    try {
      setLoading(true);
      const res = await api.get<{ data: Resource[] }>('/resources?limit=100');
      setResources(res.data || []);
    } catch (err) {
      console.error('Failed to load resources', err);
    } finally {
      setLoading(false);
    }
  };

  const uniqueLocations = useMemo(() => {
    const set = new Set<string>();
    resources.forEach((r) => {
      if (r.location) set.add(r.location);
    });
    return Array.from(set);
  }, [resources]);

  const filteredResources = useMemo(() => {
    return resources.filter((r) => {
      if (selectedType !== 'all' && r.type !== selectedType) return false;
      if (selectedLocation !== 'all' && r.location !== selectedLocation) return false;
      if (minCapacity > 0 && r.capacity < minCapacity) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        const matchName = r.name.toLowerCase().includes(q);
        const matchDesc = r.description?.toLowerCase().includes(q);
        const matchLoc = r.location?.toLowerCase().includes(q);
        if (!matchName && !matchDesc && !matchLoc) return false;
      }
      return true;
    });
  }, [resources, selectedType, selectedLocation, minCapacity, search]);

  const clearFilters = () => {
    setSearch('');
    setSelectedType('all');
    setSelectedLocation('all');
    setMinCapacity(0);
  };

  const resourceTypes = [
    { key: 'all', label: 'All Resources' },
    { key: 'meeting_room', label: 'Meeting Rooms' },
    { key: 'conference_room', label: 'Conference Rooms' },
    { key: 'training_room', label: 'Training Rooms' },
    { key: 'workstation', label: 'Workstations' },
    { key: 'projector', label: 'Projectors' },
    { key: 'lab_equipment', label: 'Lab Equipment' },
    { key: 'study_space', label: 'Study Spaces' },
  ];

  return (
    <div className="space-y-12 py-6 animate-in fade-in duration-300">
      {/* Header */}
      <section className="space-y-3 border-b border-neutral-200 pb-8">
        <div className="font-mono text-[10px] tracking-widest text-neutral-400 uppercase">
          DIRECTORY // SHARED INFRASTRUCTURE
        </div>
        <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-charcoal-900 uppercase">
          EXPLORE RESOURCES.
        </h1>
        <p className="text-neutral-500 font-sans text-sm max-w-xl leading-relaxed">
          Find and reserve meeting rooms, high-performance GPUs, specialized research benches, and quiet work pods.
        </p>
      </section>

      {/* Filter and Search Bar: Minimalist Technical Toolbar */}
      <section className="space-y-4">
        {/* Search Input */}
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-neutral-400 font-mono text-xs">
            SEARCH //
          </div>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Type name, campus location, or equipment specs..."
            className="w-full pl-24 pr-10 py-3 border border-neutral-300 focus:border-charcoal-900 text-sm focus:outline-none transition-colors font-sans bg-white"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-neutral-400 hover:text-charcoal-900"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Category Filter Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none font-mono text-xs">
          {resourceTypes.map((t) => {
            const active = selectedType === t.key;
            return (
              <button
                key={t.key}
                onClick={() => setSelectedType(t.key)}
                className={`px-3 py-1.5 uppercase tracking-wider transition-colors whitespace-nowrap border ${
                  active
                    ? 'border-charcoal-900 bg-charcoal-900 text-white font-bold'
                    : 'border-neutral-200 bg-white text-neutral-600 hover:border-neutral-400'
                }`}
              >
                {t.label}
              </button>
            );
          })}
        </div>

        {/* Secondary Sub-Filters */}
        <div className="flex flex-wrap items-center justify-between gap-4 font-mono text-xs pt-2">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2 text-neutral-500">
              <span>LOCATION:</span>
              <select
                value={selectedLocation}
                onChange={(e) => setSelectedLocation(e.target.value)}
                className="bg-white border border-neutral-300 px-2.5 py-1 text-charcoal-800 text-xs focus:outline-none"
              >
                <option value="all">ALL LOCATIONS</option>
                {uniqueLocations.map((loc) => (
                  <option key={loc} value={loc}>
                    {loc.toUpperCase()}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2 text-neutral-500">
              <span>MIN CAPACITY:</span>
              <select
                value={minCapacity}
                onChange={(e) => setMinCapacity(Number(e.target.value))}
                className="bg-white border border-neutral-300 px-2.5 py-1 text-charcoal-800 text-xs focus:outline-none"
              >
                <option value={0}>ANY</option>
                <option value={2}>2+ PERSONS</option>
                <option value={6}>6+ PERSONS</option>
                <option value={15}>15+ PERSONS</option>
                <option value={30}>30+ PERSONS</option>
              </select>
            </div>
          </div>

          {(search || selectedType !== 'all' || selectedLocation !== 'all' || minCapacity > 0) && (
            <button
              onClick={clearFilters}
              className="text-neutral-500 hover:text-charcoal-900 underline text-[11px]"
            >
              CLEAR FILTERS
            </button>
          )}
        </div>
      </section>

      {/* Resource Directory Table (Replacing Generic Cards) */}
      <section className="space-y-2">
        <div className="flex justify-between items-baseline font-mono text-[10px] text-neutral-400 uppercase tracking-widest px-1">
          <span>DIRECTORY LEDGER</span>
          <span>SHOWING {filteredResources.length} OF {resources.length} RECORDS</span>
        </div>

        {loading ? (
          <div className="space-y-4">
            <LoadingSkeleton className="h-14 w-full" />
            <LoadingSkeleton className="h-14 w-full" />
            <LoadingSkeleton className="h-14 w-full" />
          </div>
        ) : filteredResources.length === 0 ? (
          <EmptyState
            title="No matching resources"
            description="Adjust your search query or reset filter parameters to view available assets."
            action={
              <button
                onClick={clearFilters}
                className="px-4 py-2 bg-charcoal-900 text-white font-mono text-xs uppercase"
              >
                Reset Filters
              </button>
            }
          />
        ) : (
          <div className="border border-neutral-200 bg-white overflow-x-auto">
            <table className="w-full text-left font-mono text-xs">
              <thead className="bg-neutral-50 border-b border-neutral-200 text-neutral-400 uppercase tracking-widest text-[10px]">
                <tr>
                  <th className="py-3 px-4">RESOURCE NAME</th>
                  <th className="py-3 px-4">CLASSIFICATION</th>
                  <th className="py-3 px-4">CAMPUS LOCATION</th>
                  <th className="py-3 px-4">CAPACITY</th>
                  <th className="py-3 px-4">STATUS</th>
                  <th className="py-3 px-4 text-right">ACTION</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {filteredResources.map((r) => {
                  const statusConfig = RESOURCE_STATUS_CONFIG[r.status];
                  return (
                    <tr
                      key={r.id}
                      onClick={() => router.push(`/resources/${r.id}`)}
                      className="hover:bg-neutral-50 cursor-pointer transition-colors group"
                    >
                      <td className="py-4 px-4 font-sans">
                        <div className="font-bold text-charcoal-900 text-sm group-hover:text-charcoal-950 flex items-center gap-1.5">
                          {r.name}
                          <ArrowUpRight className="w-3.5 h-3.5 text-neutral-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                        {r.description && (
                          <div className="text-xs text-neutral-500 line-clamp-1 mt-0.5">
                            {r.description}
                          </div>
                        )}
                      </td>
                      <td className="py-4 px-4 text-neutral-500 uppercase">
                        {RESOURCE_TYPE_LABELS[r.type] || r.type}
                      </td>
                      <td className="py-4 px-4 text-neutral-400">{r.location}</td>
                      <td className="py-4 px-4 text-charcoal-800 font-semibold">{r.capacity}</td>
                      <td className="py-4 px-4">
                        <span
                          className={`font-mono text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 border ${statusConfig.bg} ${statusConfig.text} ${statusConfig.border}`}
                        >
                          {statusConfig.label}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-right">
                        <span className="font-mono text-xs uppercase tracking-wider text-charcoal-900 font-bold group-hover:underline">
                          View Availability →
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
