'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { api } from '../../services/api';
import { Resource, ResourceType, ResourceStatus } from '../../types';
import { RESOURCE_TYPE_LABELS, RESOURCE_STATUS_CONFIG } from '../../utils/format';
import {
  Search,
  SlidersHorizontal,
  MapPin,
  Users,
  Calendar,
  X,
  Sparkles,
  ArrowUpDown,
} from 'lucide-react';
import { CardSkeleton } from '../../components/ui/LoadingSkeleton';
import { EmptyState } from '../../components/ui/EmptyState';

export default function ResourceDiscoveryPage() {
  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters state
  const [search, setSearch] = useState('');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [selectedLocation, setSelectedLocation] = useState<string>('all');
  const [minCapacity, setMinCapacity] = useState<number>(0);
  const [sortBy, setSortBy] = useState<'name' | 'capacity_desc' | 'capacity_asc'>('name');

  useEffect(() => {
    fetchResources();
  }, []);

  const fetchResources = async () => {
    try {
      setLoading(true);
      const res = await api.get<{ data: Resource[] }>('/resources?limit=100');
      setResources(res.data || []);
    } catch (err) {
      console.error('Failed to fetch resources', err);
    } finally {
      setLoading(false);
    }
  };

  // Unique locations for filter dropdown
  const uniqueLocations = useMemo(() => {
    const locs = new Set<string>();
    resources.forEach((r) => {
      if (r.location) locs.add(r.location);
    });
    return Array.from(locs);
  }, [resources]);

  // Filtered and sorted resources
  const filteredResources = useMemo(() => {
    return resources
      .filter((r) => {
        if (selectedType !== 'all' && r.type !== selectedType) return false;
        if (selectedLocation !== 'all' && r.location !== selectedLocation) return false;
        if (minCapacity > 0 && r.capacity < minCapacity) return false;
        if (search.trim()) {
          const query = search.toLowerCase();
          const matchName = r.name.toLowerCase().includes(query);
          const matchDesc = r.description?.toLowerCase().includes(query);
          const matchLoc = r.location?.toLowerCase().includes(query);
          if (!matchName && !matchDesc && !matchLoc) return false;
        }
        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'name') return a.name.localeCompare(b.name);
        if (sortBy === 'capacity_desc') return b.capacity - a.capacity;
        if (sortBy === 'capacity_asc') return a.capacity - b.capacity;
        return 0;
      });
  }, [resources, selectedType, selectedLocation, minCapacity, search, sortBy]);

  const clearFilters = () => {
    setSearch('');
    setSelectedType('all');
    setSelectedLocation('all');
    setMinCapacity(0);
    setSortBy('name');
  };

  const resourceTypes: Array<{ key: string; label: string }> = [
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
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Page Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
          Explore Shared Resources
        </h1>
        <p className="text-slate-500 text-sm max-w-2xl">
          Discover and book available conference rooms, computer workstations, scientific equipment, and private study pods.
        </p>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
        {/* Search input & Sort */}
        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
              <Search className="w-4 h-4" />
            </div>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, location, or equipment specs..."
              className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-colors"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <div className="relative min-w-[170px]">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-xs font-semibold text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              >
                <option value="name">Sort by Name (A-Z)</option>
                <option value="capacity_desc">Capacity: High to Low</option>
                <option value="capacity_asc">Capacity: Low to High</option>
              </select>
            </div>
          </div>
        </div>

        {/* Type Filter Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none text-xs">
          {resourceTypes.map((t) => {
            const active = selectedType === t.key;
            return (
              <button
                key={t.key}
                onClick={() => setSelectedType(t.key)}
                className={`px-3 py-1.5 rounded-xl whitespace-nowrap font-semibold transition-all ${
                  active
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {t.label}
              </button>
            );
          })}
        </div>

        {/* Sub-Filters: Location & Capacity */}
        <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1.5 text-slate-500">
              <MapPin className="w-3.5 h-3.5" />
              <select
                value={selectedLocation}
                onChange={(e) => setSelectedLocation(e.target.value)}
                className="bg-transparent border border-slate-300 rounded-lg px-2 py-1 text-slate-700 font-medium"
              >
                <option value="all">All Locations</option>
                {uniqueLocations.map((loc) => (
                  <option key={loc} value={loc}>
                    {loc}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-1.5 text-slate-500">
              <Users className="w-3.5 h-3.5" />
              <select
                value={minCapacity}
                onChange={(e) => setMinCapacity(Number(e.target.value))}
                className="bg-transparent border border-slate-300 rounded-lg px-2 py-1 text-slate-700 font-medium"
              >
                <option value={0}>Any Capacity</option>
                <option value={2}>At least 2 people</option>
                <option value={6}>At least 6 people</option>
                <option value={15}>At least 15 people</option>
                <option value={30}>At least 30 people</option>
              </select>
            </div>
          </div>

          {(search || selectedType !== 'all' || selectedLocation !== 'all' || minCapacity > 0) && (
            <button
              onClick={clearFilters}
              className="text-xs font-semibold text-rose-600 hover:text-rose-700 underline"
            >
              Reset Filters
            </button>
          )}
        </div>
      </div>

      {/* Results Header */}
      <div className="flex items-center justify-between text-xs text-slate-500 px-1">
        <span>
          Showing <strong>{filteredResources.length}</strong> of {resources.length} resources
        </span>
      </div>

      {/* Resource Cards Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
        </div>
      ) : filteredResources.length === 0 ? (
        <EmptyState
          title="No matching resources"
          description="Try adjusting your search criteria or resetting filters."
          action={
            <button
              onClick={clearFilters}
              className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-semibold"
            >
              Reset Filters
            </button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredResources.map((res) => {
            const statusConfig = RESOURCE_STATUS_CONFIG[res.status];
            return (
              <div
                key={res.id}
                className="bg-white rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-md hover:border-indigo-300 transition-all flex flex-col justify-between overflow-hidden"
              >
                <div className="p-6 space-y-4">
                  {/* Card Header */}
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-[11px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-slate-100 text-slate-700">
                      {RESOURCE_TYPE_LABELS[res.type] || res.type}
                    </span>
                    <span
                      className={`text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${statusConfig.bg} ${statusConfig.text} ${statusConfig.border}`}
                    >
                      {statusConfig.label}
                    </span>
                  </div>

                  {/* Title and description */}
                  <div>
                    <h3 className="text-lg font-bold text-slate-900 leading-snug">{res.name}</h3>
                    <p className="text-xs text-slate-500 mt-1.5 line-clamp-2 leading-relaxed">
                      {res.description || 'Modern organization shared asset.'}
                    </p>
                  </div>

                  {/* Specs */}
                  <div className="space-y-2 pt-2 text-xs text-slate-600 border-t border-slate-100">
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-indigo-500 shrink-0" />
                      <span className="font-medium text-slate-700">{res.location}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4 text-indigo-500 shrink-0" />
                      <span>
                        Capacity: <strong>{res.capacity}</strong> {res.capacity === 1 ? 'person / workstation' : 'attendees'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Card Action */}
                <div className="p-4 bg-slate-50/70 border-t border-slate-100">
                  <Link
                    href={`/resources/${res.id}`}
                    className="w-full py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs flex items-center justify-center gap-2 transition-all shadow-xs"
                  >
                    <Calendar className="w-3.5 h-3.5" />
                    Check Availability & Reserve
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
