'use client';

import { useEffect, useState } from 'react';
import { FetchUpdatesResponse } from '@/lib/types';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import Dashboard from '@/components/Dashboard';
import ComplianceSummary from '@/components/ComplianceSummary';
import LoadingState from '@/components/LoadingState';
import ErrorState from '@/components/ErrorState';

export default function Home() {
  const [data, setData] = useState<FetchUpdatesResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/fetch-updates');
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      const result = await response.json();
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch('/api/fetch-updates');
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        const result = await response.json();
        setData(result);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error occurred');
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  if (loading) {
    return <LoadingState />;
  }

  if (error || !data) {
    return <ErrorState error={error || 'No data received'} onRetry={fetchData} />;
  }

  return (
    <div className="min-h-screen bg-background">
      <Header
        data={data}
        onRefresh={fetchData}
        onSearch={setSearchQuery}
        searchQuery={searchQuery}
      />
      <main className="container mx-auto px-6 py-6">
        <ComplianceSummary data={data} />
        <Dashboard data={data} searchQuery={searchQuery} />
      </main>
      <Footer timestamp={data.timestamp} dataSource={data.dataSource} />
    </div>
  );
}
