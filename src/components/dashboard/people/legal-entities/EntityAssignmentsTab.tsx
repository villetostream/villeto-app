"use client";

import { useMemo, useState } from "react";
import { Building2, Search } from "lucide-react";
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

  const visibleRows = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return rows.filter((row) => {
      if (filter === "unassigned" && (row.assignment || row.loading || row.failed)) return false;
      if (filter === "assigned" && !row.assignment) return false;
      if (!needle) return true;
      const name = `${row.user.firstName ?? ""} ${row.user.lastName ?? ""}`.toLowerCase();
      return name.includes(needle) || row.user.email?.toLowerCase().includes(needle);
    });
  }, [filter, rows, search]);

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
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
        <div className="flex items-start gap-3">
          <Building2 className="mt-0.5 h-5 w-5 text-amber-700" />
          <div>
            <p className="text-sm font-semibold text-amber-950">
              {unresolvedCount} employee{unresolvedCount === 1 ? "" : "s"} need a primary legal entity
            </p>
            <p className="mt-0.5 text-xs text-amber-800">
              The primary entity is used automatically for employee expenses and other employee-owned transactions.
            </p>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search employees"
            className="pl-9"
          />
        </div>
        <Select value={filter} onValueChange={(value) => setFilter(value as typeof filter)}>
          <SelectTrigger className="w-full sm:w-[190px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="unassigned">Needs assignment</SelectItem>
            <SelectItem value="assigned">Assigned</SelectItem>
            <SelectItem value="all">All employees</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="min-h-0 overflow-auto rounded-xl border bg-white">
        <table className="w-full text-left text-sm">
          <thead className="sticky top-0 z-10 bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
            <tr>
              <th className="px-4 py-3 font-semibold">Employee</th>
              <th className="px-4 py-3 font-semibold">Role</th>
              <th className="px-4 py-3 font-semibold">Primary legal entity</th>
              <th className="px-4 py-3 font-semibold">Status</th>
              <th className="px-4 py-3 text-right font-semibold">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {isLoading && Array.from({ length: 5 }).map((_, index) => (
              <tr key={index}><td colSpan={5} className="px-4 py-4"><Skeleton className="h-6 w-full" /></td></tr>
            ))}
            {!isLoading && visibleRows.map((row) => (
              <tr key={row.user.userId} className="hover:bg-gray-50/70">
                <td className="px-4 py-3">
                  <p className="font-medium text-gray-950">{row.user.firstName} {row.user.lastName}</p>
                  <p className="text-xs text-gray-500">{row.user.email}</p>
                </td>
                <td className="px-4 py-3 text-gray-600">{row.user.jobTitle || row.user.position || "—"}</td>
                <td className="px-4 py-3 font-medium text-gray-800">
                  {row.loading ? "Checking…" : row.failed ? "Could not load" : row.assignment?.legalEntity?.legalName || "Not assigned"}
                </td>
                <td className="px-4 py-3">
                  {row.loading ? null : row.failed ? (
                    <Badge variant="destructive">Error</Badge>
                  ) : row.assignment ? (
                    <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100">Assigned</Badge>
                  ) : (
                    <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100">Needs assignment</Badge>
                  )}
                </td>
                <td className="px-4 py-3 text-right">
                  {canManage && !row.loading && !row.failed && (
                    <Button variant="outline" size="sm" onClick={() => openAssignment(row)}>
                      {row.assignment ? "Change" : "Assign"}
                    </Button>
                  )}
                </td>
              </tr>
            ))}
            {!isLoading && visibleRows.length === 0 && (
              <tr><td colSpan={5} className="px-6 py-16 text-center text-gray-500">No employees match this view.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <Dialog open={Boolean(selected)} onOpenChange={(open) => !open && closeDialog()}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>{selected?.assignment ? "Change primary legal entity" : "Assign primary legal entity"}</DialogTitle>
            <DialogDescription>
              {selected ? `${selected.user.firstName} ${selected.user.lastName}` : "Select an employee"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="legal-entity">Legal entity</Label>
              <Select value={legalEntityId} onValueChange={setLegalEntityId}>
                <SelectTrigger id="legal-entity"><SelectValue placeholder="Select a legal entity" /></SelectTrigger>
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
              <Label htmlFor="effective-from">Effective from</Label>
              <Input id="effective-from" type="date" value={effectiveFrom} onChange={(event) => setEffectiveFrom(event.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="assignment-reason">
                Reason {selected?.assignment ? "(required)" : "(optional)"}
              </Label>
              <Input
                id="assignment-reason"
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                placeholder={selected?.assignment ? "Why is this employee moving entities?" : "Assignment context"}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeDialog} disabled={assignMutation.isPending}>Cancel</Button>
            <Button onClick={saveAssignment} disabled={!legalEntityId || !effectiveFrom || assignMutation.isPending}>
              {assignMutation.isPending ? "Saving…" : "Save assignment"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
