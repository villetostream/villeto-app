"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Search } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useVendorNetworkList } from "@/queries/vendors/vendor-network";
import { useAuthStore } from "@/stores/auth-stores";
import { getString } from "@/lib/types/api-error";

export function FindVendorDialog({
  open,
  onClose,
  onInvite,
}: {
  open: boolean;
  onClose: () => void;
  onInvite: (email: string) => void;
}) {
  const router = useRouter();
  const canManageEntities = useAuthStore((state) =>
    state.can("vendor.entity_configuration", "manage"),
  );
  const [search, setSearch] = useState("");
  const [searchedTerm, setSearchedTerm] = useState("");
  const [page, setPage] = useState(1);
  const directory = useVendorNetworkList(
    { search: searchedTerm, page, limit: 5 },
    open && !!searchedTerm,
  );
  const currentSearch = search.trim();
  const isCurrentSearch = !!searchedTerm && searchedTerm === currentSearch;
  const reviewed =
    isCurrentSearch && directory.isSuccess && !directory.isFetching;
  const vendors = reviewed ? directory.data?.data?.data || [] : [];
  const meta = directory.data?.data?.meta;

  const searchDirectory = () => {
    if (currentSearch.length < 2 || directory.isFetching) return;
    setPage(1);
    if (searchedTerm === currentSearch && page === 1) void directory.refetch();
    else setSearchedTerm(currentSearch);
  };

  return (
    <Dialog open={open} onOpenChange={(value) => !value && onClose()}>
      <DialogContent className="sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle>Find a vendor</DialogTitle>
          <DialogDescription>
            Search your organization’s directory before sending an invitation.
            Existing vendors can be linked to another legal entity without being
            invited again.
          </DialogDescription>
        </DialogHeader>
        <form
          className="flex items-end gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            searchDirectory();
          }}
        >
          <div className="min-w-0 flex-1 space-y-2">
            <label
              htmlFor="vendor-directory-search"
              className="text-sm font-medium"
            >
              Vendor name, email or registration number
            </label>
            <input
              id="vendor-directory-search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search the organization directory"
              className="h-10 w-full rounded-lg border px-3 text-sm focus:outline-none focus:border-[#087f70]"
            />
          </div>
          <button
            type="submit"
            disabled={currentSearch.length < 2 || directory.isFetching}
            className="flex h-10 items-center gap-2 rounded-lg bg-[#087f70] px-4 text-sm font-semibold text-white disabled:opacity-50"
          >
            {directory.isFetching ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Search className="h-4 w-4" />
            )}
            Search
          </button>
        </form>

        <div
          aria-live="polite"
          className="max-h-[45vh] space-y-3 overflow-y-auto"
        >
          {!searchedTerm && (
            <p className="text-sm text-muted-foreground">
              Enter at least two characters to find an existing vendor.
            </p>
          )}
          {searchedTerm && !isCurrentSearch && (
            <p className="text-sm text-muted-foreground">
              Search again to check the updated details.
            </p>
          )}
          {isCurrentSearch && directory.isFetching && (
            <p className="text-sm text-muted-foreground">
              Searching the organization directory…
            </p>
          )}
          {isCurrentSearch && directory.isError && (
            <div
              role="alert"
              className="rounded-lg border border-red-200 p-3 text-sm text-red-700"
            >
              Could not search the directory. Please try Search again before
              inviting a new vendor.
            </div>
          )}
          {reviewed && (
            <>
              <p className="text-sm text-muted-foreground">
                {meta?.totalCount
                  ? `${meta.totalCount} matching vendor${meta.totalCount === 1 ? "" : "s"}`
                  : "No matching vendors found."}
              </p>
              {vendors.map((vendor) => {
                const vendorId = getString(vendor.vendorId);
                return (
                  <div key={vendorId} className="rounded-lg border p-3">
                    <p className="font-semibold">
                      {getString(vendor.displayName) ||
                        getString(vendor.legalName)}
                    </p>
                    <p className="break-all text-sm text-muted-foreground">
                      {getString(vendor.email)}
                    </p>
                    {getString(vendor.registrationNumber) && (
                      <p className="text-xs text-muted-foreground">
                        Registration: {getString(vendor.registrationNumber)}
                      </p>
                    )}
                    <button
                      type="button"
                      className="mt-3 text-sm font-semibold text-[#087f70] underline"
                      onClick={() => {
                        onClose();
                        router.push(
                          `/vendors/${vendorId}${canManageEntities ? "/configuration" : ""}`,
                        );
                      }}
                    >
                      Use existing vendor
                    </button>
                  </div>
                );
              })}
              {(meta?.totalPages || 0) > 1 && (
                <div className="flex items-center justify-between text-sm">
                  <button
                    disabled={page <= 1}
                    onClick={() => setPage(page - 1)}
                    className="disabled:opacity-50"
                  >
                    Previous results
                  </button>
                  <span>
                    Page {page} of {meta?.totalPages}
                  </span>
                  <button
                    disabled={page >= (meta?.totalPages || 1)}
                    onClick={() => setPage(page + 1)}
                    className="disabled:opacity-50"
                  >
                    Next results
                  </button>
                </div>
              )}
            </>
          )}
        </div>

        {reviewed && (
          <div className="space-y-3 border-t pt-4">
            <p className="text-sm text-muted-foreground">
              {vendors.length
                ? "None of these vendors match? Invite a new supplier after checking the results."
                : "If the vendor is new to your organization, send one onboarding invitation."}
            </p>
            <button
              type="button"
              className="h-10 w-full rounded-lg border border-[#087f70] text-sm font-semibold text-[#087f70]"
              onClick={() =>
                onInvite(
                  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(currentSearch)
                    ? currentSearch
                    : "",
                )
              }
            >
              Invite a new vendor
            </button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
