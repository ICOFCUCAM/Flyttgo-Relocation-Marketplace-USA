import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import {
  fetchKpiTimeseries,
  fetchCountryBreakdown,
  fetchAcquisitionFunnel,
  fetchDriverCohorts,
} from '../../services/adminAnalytics';

const KEY_TIMESERIES = ['admin', 'analytics', 'timeseries'] as const;
const KEY_COUNTRIES  = ['admin', 'analytics', 'countries']  as const;
const KEY_FUNNEL     = ['admin', 'analytics', 'funnel']     as const;
const KEY_COHORTS    = ['admin', 'analytics', 'cohorts']    as const;

export function useKpiTimeseries() {
  return useQuery({
    queryKey: KEY_TIMESERIES,
    queryFn:  fetchKpiTimeseries,
    refetchInterval: 60_000,
  });
}

export function useCountryBreakdown() {
  return useQuery({
    queryKey: KEY_COUNTRIES,
    queryFn:  fetchCountryBreakdown,
    refetchInterval: 60_000,
  });
}

export function useAcquisitionFunnel() {
  return useQuery({
    queryKey: KEY_FUNNEL,
    queryFn:  fetchAcquisitionFunnel,
    refetchInterval: 60_000,
  });
}

export function useDriverCohorts() {
  return useQuery({
    queryKey: KEY_COHORTS,
    queryFn:  fetchDriverCohorts,
    refetchInterval: 5 * 60_000,    // cohorts move slowly
  });
}

/**
 * Subscribes to live changes on bookings + driver_applications +
 * driver_profiles and invalidates every analytics query the moment
 * a row mutates. Cheap — the views aggregate small tables; the
 * dashboard refresh feels real-time without polling more aggressively.
 */
export function useAdminAnalyticsRealtime(): void {
  const qc = useQueryClient();
  useEffect(() => {
    const invalidate = () => {
      qc.invalidateQueries({ queryKey: ['admin', 'analytics'] });
      qc.invalidateQueries({ queryKey: ['adminDashboard'] });
    };

    const channel = supabase
      .channel('admin-analytics')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bookings'             }, invalidate)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'driver_applications'  }, invalidate)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'driver_profiles'      }, invalidate)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'commission_ledger'    }, invalidate)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [qc]);
}
