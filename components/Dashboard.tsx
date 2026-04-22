'use client';

import { useState, useMemo } from 'react';
import { FetchUpdatesResponse } from '@/lib/types';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Button } from './ui/button';
import ProductImpactMatrix from './views/ProductImpactMatrix';
import TeamActionBoard from './views/TeamActionBoard';
import RegulatoryFeed from './views/RegulatoryFeed';
import FTAImpactTracker from './views/FTAImpactTracker';
import ComplianceCalendar from './views/ComplianceCalendar';
import DeniedPartyScreening from './views/DeniedPartyScreening';

interface DashboardProps {
  data: FetchUpdatesResponse;
  searchQuery: string;
}

export default function Dashboard({ data, searchQuery }: DashboardProps) {
  const [activeTab, setActiveTab] = useState('feed');

  const filteredChanges = useMemo(() => {
    if (!searchQuery.trim()) return data.changes;

    const query = searchQuery.toLowerCase();
    return data.changes.filter((change) =>
      change.title.toLowerCase().includes(query) ||
      change.summary.toLowerCase().includes(query) ||
      change.source.toLowerCase().includes(query) ||
      change.fullText.toLowerCase().includes(query)
    );
  }, [data.changes, searchQuery]);

  const exportToCSV = () => {
    const headers = [
      'ID', 'Source', 'Title', 'Summary', 'Severity', 'Priority', 'Effort',
      'Publish Date', 'Effective Date', 'Teams', 'Product Modules', 'URL'
    ];

    const rows = filteredChanges.map((change) => [
      change.id,
      change.source,
      `"${change.title.replace(/"/g, '""')}"`,
      `"${change.summary.replace(/"/g, '""')}"`,
      change.severity,
      change.priority,
      change.effort,
      change.publishDate,
      change.effectiveDate || '',
      `"${change.teams.join(', ')}"`,
      `"${change.productModules.join(', ')}"`,
      change.url
    ]);

    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `regulatory-changes-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="pb-8">
      <div className="flex items-center justify-between mb-4">
        <div className="text-sm text-muted-foreground">
          {searchQuery ? (
            <span>
              Showing {filteredChanges.length} of {data.changes.length} changes
            </span>
          ) : (
            <span>Showing all {data.changes.length} changes</span>
          )}
        </div>
        <Button onClick={exportToCSV} variant="outline" size="sm">
          📥 Export CSV
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-6 mb-6">
          <TabsTrigger value="feed">
            Regulatory Feed
            {filteredChanges.length !== data.changes.length && (
              <span className="ml-1 text-xs">({filteredChanges.length})</span>
            )}
          </TabsTrigger>
          <TabsTrigger value="dps" className="text-red-400">
            DPS Screening
          </TabsTrigger>
          <TabsTrigger value="matrix">Product Impact</TabsTrigger>
          <TabsTrigger value="teams">Team Actions</TabsTrigger>
          <TabsTrigger value="fta">FTA Tracker</TabsTrigger>
          <TabsTrigger value="calendar">Calendar</TabsTrigger>
        </TabsList>

        <TabsContent value="feed" className="mt-0">
          <RegulatoryFeed changes={filteredChanges} />
        </TabsContent>

        <TabsContent value="dps" className="mt-0">
          <DeniedPartyScreening changes={filteredChanges} />
        </TabsContent>

        <TabsContent value="matrix" className="mt-0">
          <ProductImpactMatrix changes={filteredChanges} />
        </TabsContent>

        <TabsContent value="teams" className="mt-0">
          <TeamActionBoard changes={filteredChanges} />
        </TabsContent>

        <TabsContent value="fta" className="mt-0">
          <FTAImpactTracker changes={filteredChanges} />
        </TabsContent>

        <TabsContent value="calendar" className="mt-0">
          <ComplianceCalendar changes={filteredChanges} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
