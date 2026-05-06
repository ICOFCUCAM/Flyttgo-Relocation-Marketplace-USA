import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  listMyOrganizations, listMyOrgMemberships, listRelocationRequests,
  listOrgInvites, listOrgInvoices, listOrgContracts,
  approveRelocationRequest, rejectRelocationRequest, dispatchRelocationRequest,
  createOrgInvite, revokeOrgInvite,
  type OrganizationRole, type RelocationRequestRow,
} from '../../lib/organizations-store';

const orgsKey       = (uid: string | null | undefined) => ['corp', 'orgs', uid ?? 'anon'] as const;
const membersKey    = (uid: string | null | undefined) => ['corp', 'memberships', uid ?? 'anon'] as const;
const requestsKey   = (orgId: string | null) => ['corp', 'requests', orgId ?? 'none'] as const;
const invitesKey    = (orgId: string | null) => ['corp', 'invites',  orgId ?? 'none'] as const;
const invoicesKey   = (orgId: string | null) => ['corp', 'invoices', orgId ?? 'none'] as const;
const contractsKey  = (orgId: string | null) => ['corp', 'contracts', orgId ?? 'none'] as const;

export function useMyOrganizations(userId: string | null | undefined) {
  return useQuery({
    queryKey: orgsKey(userId),
    queryFn:  () => listMyOrganizations(userId as string),
    enabled:  !!userId,
  });
}

export function useMyOrgMemberships(userId: string | null | undefined) {
  return useQuery({
    queryKey: membersKey(userId),
    queryFn:  () => listMyOrgMemberships(userId as string),
    enabled:  !!userId,
  });
}

export function useOrgRelocationRequests(orgId: string | null) {
  return useQuery({
    queryKey: requestsKey(orgId),
    queryFn:  () => listRelocationRequests(orgId as string),
    enabled:  !!orgId,
  });
}

export function useOrgInvites(orgId: string | null) {
  return useQuery({
    queryKey: invitesKey(orgId),
    queryFn:  () => listOrgInvites(orgId as string),
    enabled:  !!orgId,
  });
}

export function useOrgInvoices(orgId: string | null) {
  return useQuery({
    queryKey: invoicesKey(orgId),
    queryFn:  () => listOrgInvoices(orgId as string),
    enabled:  !!orgId,
  });
}

export function useOrgContracts(orgId: string | null) {
  return useQuery({
    queryKey: contractsKey(orgId),
    queryFn:  () => listOrgContracts(orgId as string),
    enabled:  !!orgId,
  });
}

/* ── Mutations ─────────────────────────────────────────────────── */

function invalidateRequests(qc: ReturnType<typeof useQueryClient>, orgId: string | null) {
  qc.invalidateQueries({ queryKey: requestsKey(orgId) });
}

function invalidateInvites(qc: ReturnType<typeof useQueryClient>, orgId: string | null) {
  qc.invalidateQueries({ queryKey: invitesKey(orgId) });
}

export function useApproveRelocationRequest(orgId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ req, userId }: { req: RelocationRequestRow; userId: string }) =>
      approveRelocationRequest(req.id, userId),
    onSuccess: () => invalidateRequests(qc, orgId),
  });
}

export function useRejectRelocationRequest(orgId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ req, userId, comment }: { req: RelocationRequestRow; userId: string; comment: string }) =>
      rejectRelocationRequest(req.id, userId, comment),
    onSuccess: () => invalidateRequests(qc, orgId),
  });
}

export function useDispatchRelocationRequest(orgId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (req: RelocationRequestRow) => dispatchRelocationRequest(req.id),
    onSuccess:  () => invalidateRequests(qc, orgId),
  });
}

export function useCreateOrgInvite(orgId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ email, role }: { email: string; role: OrganizationRole }) =>
      createOrgInvite(orgId as string, email, role),
    onSuccess: () => invalidateInvites(qc, orgId),
  });
}

export function useRevokeOrgInvite(orgId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (inviteId: string) => revokeOrgInvite(inviteId),
    onSuccess:  () => invalidateInvites(qc, orgId),
  });
}
