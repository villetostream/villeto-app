"use client";

import { useMemo, useState, useEffect } from "react";
import { Building2, Search, ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { AppUser } from "@/queries/departments/get-all-departments";
import {
  EmployeeLegalEntityAssignment,
  useAssignEmployeeLegalEntity,
  useEmployeeLegalEntityAssignments,
  useLegalEntities,
} from "@/queries/legal-entities";
import { useGetAllUsersApi } from "@/queries/users/get-all-users";
import { getApiErrorMessage } from "@/lib/types/api-error";

interface AssignmentRow {
  user: AppUser;
  assignment: EmployeeLegalEntityAssignment | null;
  loading: boolean;
  failed: boolean;
}

function currentPrimary(assignments: EmployeeLegalEntityAssignment[] = []) {
  const now = Date.now();
  return (
    assignments.find((assignment) => {
      if (assignment.assignmentType !== "primary") return false;
      if (assignment.status === "cancelled" || assignment.status === "ended") return false;
      const starts = new Date(assignment.effectiveFrom).getTime();
      const ends = assignment.effectiveTo
        ? new Date(assignment.effectiveTo).getTime()
        : Number.POSITIVE_INFINITY;
      return starts <= now && now < ends;
    }) ?? null
  );
}

export function EntityAssignmentsTab({ canManage }: { canManage: boolean }) {
  const usersQuery = useGetAllUsersApi({ params: { page: 1, limit: 1000, status: "all" } });
  const entitiesQuery = useLegalEntities();
  const users = useMemo(() => usersQuery.data?.data ?? [], [usersQuery.data?.data]);
  const assignmentQueries = useEmployeeLegalEntityAssignments(
    users.map((user) => user.userId),
    { enabled: users.length > 0 },
  );
  const assignMutation = useAssignEmployeeLegalEntity();
  
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "unassigned" | "assigned">("unassigned");
  const [page, setPage] = useState(1);
  const limit = 10;

  const [selected, setSelected] = useState<AssignmentRow | null>(null);
  const [legalEntityId, setLegalEntityId] = useState("");
  const [effectiveFrom, setEffectiveFrom] = useState(() => new Date().toISOString().slice(0, 10));
  const [reason, setReason] = useState("");

  const rows = useMemo<AssignmentRow[]>(
    () =>
      users.map((user, index) => {
        const query = assignmentQueries[index];
        return {
          user,
          assignment: currentPrimary(query?.data?.data),
          loading: Boolean(query?.isLoading),
          failed: Boolean(query?.isError),
        };
      }),
    [assignmentQueries, users],
  );

  // Reset page when filter or search changes
  useEffect(() => {
    setPage(1);
  }, [search, filter]);

  const filteredRows = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return rows.filter((row) => {
      if (filter === "unassigned" && (row.assignment || row.loading || row.failed)) return false;
      if (filter === "assigned" && !row.assignment) return false;
      if (!needle) return true;
      const name = `${row.user.firstName ?? ""} ${row.user.lastName ?? ""}`.toLowerCase();
      return name.includes(needle) || row.user.email?.toLowerCase().includes(needle);
    });
  }, [filter, rows, search]);

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / limit));
  
  const paginatedRows = useMemo(() => {
    const start = (page - 1) * limit;
    return filteredRows.slice(start, start + limit);
  }, [filteredRows, page]);

  const openAssignment = (row: AssignmentRow) => {
    setSelected(row);
    setLegalEntityId(row.assignment?.legalEntity?.legalEntityId ?? "");
    setEffectiveFrom(new Date().toISOString().slice(0, 10));
    setReason("");
  };

  const closeDialog = () => {
    if (assignMutation.isPending) return;
    setSelected(null);
  };

  const saveAssignment = async () => {
    if (!selected || !legalEntityId || !effectiveFrom) return;
    if (selected.assignment && !reason.trim()) {
      toast.error("Enter a reason for changing the employee's primary entity.");
      return;
    }
    try {
      await assignMutation.mutateAsync({
        userId: selected.user.userId,
        legalEntityId,
        effectiveFrom: new Date(`${effectiveFrom}T00:00:00.000Z`).toISOString(),
        reason: reason.trim() || undefined,
      });
      toast.success("Primary legal entity assigned.");
      setSelected(null);
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Could not assign the legal entity."));
    }
  };

  const entities = entitiesQuery.data?.data ?? [];
  const activeEntities = entities.filter((entity) => entity.status === "active");
  const isLoading = usersQuery.isLoading || entitiesQuery.isLoading;
  const unresolvedCount = rows.filter((row) => !row.loading && !row.failed && !row.assignment).length;

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 pb-6">
      <div className="rounded-[12px] border border-[#ffde9e] bg-[#fff8eb] px-4 py-3">
        <div className="flex items-start gap-3">
          <Building2 className="mt-0.5 h-5 w-5 text-[#b35f00]" />
          <div>
            <p className="text-[14px] font-semibold text-[#0b100e]">
              {unresolvedCount} employee{unresolvedCount === 1 ? "" : "s"} need a primary legal entity
            </p>
            <p className="mt-0.5 text-[12px] text-[#66706b]">
              The primary entity is used automatically for employee expenses and other employee-owned transactions.
            </p>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#84908a]" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search employees"
            className="pl-9 h-10 border-black/[0.1] rounded-[9px]"
          />
        </div>
        <Select value={filter} onValueChange={(value) => setFilter(value as typeof filter)}>
          <SelectTrigger className="w-full sm:w-[190px] h-10 border-black/[0.1] rounded-[9px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="unassigned">Needs assignment</SelectItem>
            <SelectItem value="assigned">Assigned</SelectItem>
            <SelectItem value="all">All employees</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="min-h-0 flex-1 overflow-auto rounded-[12px] border border-black/[0.08] bg-white flex flex-col">
        <div className="flex-1 overflow-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="sticky top-0 z-10 bg-[#f4f7f5] text-[11px] uppercase tracking-[0.1em] text-[#84908a]">
              <tr>
                <th className="px-5 py-3 font-bold border-b border-black/[0.06]">Employee</th>
                <th className="px-5 py-3 font-bold border-b border-black/[0.06]">Role</th>
                <th className="px-5 py-3 font-bold border-b border-black/[0.06]">Primary legal entity</th>
                <th className="px-5 py-3 font-bold border-b border-black/[0.06]">Status</th>
                <th className="px-5 py-3 text-right font-bold border-b border-black/[0.06]">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/[0.06]">
              {isLoading ? (
                Array.from({ length: 5 }).map((_, index) => (
                  <tr key={index}><td colSpan={5} className="px-5 py-4"><Skeleton className="h-6 w-full" /></td></tr>
                ))
              ) : paginatedRows.length === 0 ? (
                <tr><td colSpan={5} className="px-6 py-16 text-center text-[#84908a]">No employees match this view.</td></tr>
              ) : (
                paginatedRows.map((row) => (
                  <tr key={row.user.userId} className="hover:bg-[#f9fdfc] transition-colors">
                    <td className="px-5 py-3">
                      <p className="text-[13px] font-semibold text-[#0b100e]">{row.user.firstName} {row.user.lastName}</p>
                      <p className="text-[12px] text-[#66706b]">{row.user.email}</p>
                    </td>
                    <td className="px-5 py-3 text-[13px] text-[#66706b]">{row.user.jobTitle || row.user.position || "—"}</td>
                    <td className="px-5 py-3 text-[13px] font-semibold text-[#0b100e]">
                      {row.loading ? "Checking…" : row.failed ? "Could not load" : row.assignment?.legalEntity?.legalName || "Not assigned"}
                    </td>
                    <td className="px-5 py-3">
                      {row.loading ? null : row.failed ? (
                        <Badge variant="destructive">Error</Badge>
                      ) : row.assignment ? (
                        <Badge variant="active" className="capitalize">Assigned</Badge>
                      ) : (
                        <Badge variant="pending" className="capitalize">Needs assignment</Badge>
                      )}
                    </td>
                    <td className="px-5 py-3 text-right">
                      {canManage && !row.loading && !row.failed && (
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => openAssignment(row)}
                          className="h-8 rounded-[8px] border-black/[0.1] text-[#0b100e] hover:bg-[#f4f7f5]"
                        >
                          {row.assignment ? "Change" : "Assign"}
                        </Button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        
        {!isLoading && filteredRows.length > 0 && (
          <div className="flex items-center justify-between border-t border-black/[0.06] px-5 py-3 bg-white mt-auto">
            <p className="text-[12px] text-[#66706b]">
              Showing <span className="font-semibold text-[#0b100e]">{(page - 1) * limit + 1}</span> to <span className="font-semibold text-[#0b100e]">{Math.min(page * limit, filteredRows.length)}</span> of <span className="font-semibold text-[#0b100e]">{filteredRows.length}</span> employees
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="h-8 rounded-[8px] px-2.5"
              >
                <ChevronLeft className="h-4 w-4" />
                <span className="sr-only">Previous</span>
              </Button>
              <div className="text-[13px] font-medium text-[#0b100e] px-2">
                Page {page} of {totalPages}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="h-8 rounded-[8px] px-2.5"
              >
                <ChevronRight className="h-4 w-4" />
                <span className="sr-only">Next</span>
              </Button>
            </div>
          </div>
        )}
      </div>

      <Dialog open={Boolean(selected)} onOpenChange={(open) => !open && closeDialog()}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle className="text-[18px] text-[#0b100e]">
              {selected?.assignment ? "Change primary legal entity" : "Assign primary legal entity"}
            </DialogTitle>
            <DialogDescription>
              {selected ? `${selected.user.firstName} ${selected.user.lastName}` : "Select an employee"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="legal-entity" className="text-[#0b100e]">Legal entity</Label>
              <Select value={legalEntityId} onValueChange={setLegalEntityId}>
                <SelectTrigger id="legal-entity" className="h-10 border-black/[0.1] rounded-[9px]">
                  <SelectValue placeholder="Select a legal entity" />
                </SelectTrigger>
                <SelectContent>
                  {activeEntities.map((entity) => (
                    <SelectItem key={entity.legalEntityId} value={entity.legalEntityId}>
                      {entity.legalName} ({entity.code})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="effective-from" className="text-[#0b100e]">Effective from</Label>
              <Input 
                id="effective-from" 
                type="date" 
                value={effectiveFrom} 
                onChange={(event) => setEffectiveFrom(event.target.value)} 
                className="h-10 border-black/[0.1] rounded-[9px]"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="assignment-reason" className="text-[#0b100e]">
                Reason {selected?.assignment ? <span className="text-[#d33d44]">*</span> : <span className="text-[#84908a] font-normal">(optional)</span>}
              </Label>
              <Input
                id="assignment-reason"
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                placeholder={selected?.assignment ? "Why is this employee moving entities?" : "Assignment context"}
                className="h-10 border-black/[0.1] rounded-[9px]"
              />
            </div>
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={closeDialog} 
              disabled={assignMutation.isPending}
              className="rounded-[8px] h-10 border-black/[0.1]"
            >
              Cancel
            </Button>
            <Button 
              onClick={saveAssignment} 
              disabled={!legalEntityId || !effectiveFrom || assignMutation.isPending}
              className="rounded-[8px] h-10 bg-[#0ea894] hover:bg-[#087f70] text-white"
            >
              {assignMutation.isPending ? "Saving…" : "Save assignment"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
