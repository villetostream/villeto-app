"use client";

import { useState, useMemo } from "react";
import { Search, Loader2 } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { useGetSpendProgramSettingsCategories } from "@/queries/procurement/policies";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

export interface StepCategoriesProps {
  categoryIds: string[];
  onChange: (patch: Partial<{ categoryIds: string[] }>) => void;
}

export function StepCategories({ categoryIds, onChange }: StepCategoriesProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  
  const { data, isLoading, error } = useGetSpendProgramSettingsCategories();

  const allCategories = useMemo(() => {
    if (!data?.data?.categories) return [];
    return data.data.categories;
  }, [data?.data]);

  const filteredCategories = useMemo(() => {
    if (!searchTerm) return allCategories;
    const lower = searchTerm.toLowerCase();
    return allCategories.filter((c) => 
      c.name?.toLowerCase().includes(lower)
    );
  }, [allCategories, searchTerm]);

  const isAllSelected = allCategories.length > 0 && categoryIds.length === allCategories.length;
  const isIndeterminate = categoryIds.length > 0 && categoryIds.length < allCategories.length;

  const toggleAll = () => {
    if (isAllSelected) {
      onChange({ categoryIds: [] });
    } else {
      onChange({ categoryIds: allCategories.map((c) => c.categoryId) });
    }
  };

  const toggleCategory = (id: string) => {
    if (categoryIds.includes(id)) {
      onChange({ categoryIds: categoryIds.filter((cid) => cid !== id) });
    } else {
      onChange({ categoryIds: [...categoryIds, id] });
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center p-8">
        <Loader2 className="w-6 h-6 animate-spin text-[#087f70]" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 text-red-600 rounded-lg text-sm">
        Failed to load categories. Please try again.
      </div>
    );
  }

  const selectedCategoriesList = allCategories.filter(c => categoryIds.includes(c.categoryId));

  return (
    <div className="flex flex-col h-full max-w-4xl mx-auto">
      <div className="sticky top-0 bg-white z-10 pt-8 pb-4">
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-[#10231d]">Choose categories</h2>
          <p className="text-sm text-[#68726d] mt-1">
            Select the procurement categories this Spend Program will govern.
          </p>
        </div>

        <div className="space-y-2 relative">
          <label className="text-[14px] font-semibold text-[#10231d]">
            Which category should this program apply to?
          </label>
          
          <Popover open={isOpen} onOpenChange={setIsOpen}>
            <PopoverTrigger asChild>
              <button
                type="button"
                className="w-full flex items-center justify-between gap-2 h-12 px-4 bg-white border border-black/[0.08] rounded-xl text-[14px] text-left transition-colors hover:border-black/[0.15] focus:outline-none focus:ring-2 focus:ring-[#087f70]/20 focus:border-[#087f70]"
              >
                <span className="text-[#84908a]">Select categories...</span>
                <svg 
                  width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" 
                  className={`text-[#84908a] transition-transform ${isOpen ? "rotate-180" : ""}`}
                >
                  <path d="m6 9 6 6 6-6"/>
                </svg>
              </button>
            </PopoverTrigger>
            
            <PopoverContent align="start" className="w-[--radix-popover-trigger-width] p-0 bg-white border border-black/[0.08] rounded-xl shadow-[0_4px_24px_rgba(0,0,0,0.06)]" sideOffset={8}>
              <div className="p-3 border-b border-black/[0.04]">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#84908a]" />
                  <Input
                    placeholder="Search categories..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9 h-9 text-[13px] rounded-lg bg-[#f9faf9] border-black/[0.08]"
                  />
                </div>
              </div>
              <div className="max-h-[300px] overflow-y-auto py-1">
                {filteredCategories.length === 0 ? (
                  <p className="text-[13px] text-[#84908a] text-center py-4">No categories found.</p>
                ) : (
                  <>
                    {(() => {
                      const inSettingsCats = filteredCategories.filter(c => c.inSettings);
                      const otherCats = filteredCategories.filter(c => !c.inSettings);
                      
                      const renderCategory = (category: any) => {
                        const isSelected = categoryIds.includes(category.categoryId);
                        const isUnavailable = category.hasSpendProgram && !isSelected;
                        return (
                          <div
                            key={category.categoryId}
                            className={`flex items-center justify-between gap-3 px-4 py-2.5 transition-colors ${isUnavailable ? "opacity-60 cursor-not-allowed bg-black/[0.02]" : "hover:bg-[#f9faf9] cursor-pointer"}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              if (!isUnavailable) toggleCategory(category.categoryId);
                            }}
                          >
                            <div className="flex items-center gap-3">
                              <Checkbox
                                checked={isSelected}
                                disabled={isUnavailable}
                                className="rounded-[4px] data-[state=checked]:bg-[#087f70] data-[state=checked]:border-[#087f70] pointer-events-none"
                              />
                              <span className={`text-[14px] ${isUnavailable ? "text-[#84908a]" : "text-[#10231d]"}`}>
                                {category.name}
                              </span>
                            </div>
                            {isUnavailable && (
                              <span className="text-[10px] font-medium px-2 py-0.5 rounded bg-black/[0.05] text-[#68726d]">
                                Already attached
                              </span>
                            )}
                          </div>
                        );
                      };

                      return (
                        <div className="flex flex-col">
                          {inSettingsCats.length > 0 && (
                            <div className="py-1">
                              <div className="px-4 py-2 bg-[#f4f7f5] text-[11px] font-bold text-[#68726d] uppercase tracking-wider sticky top-0 z-10">
                                In Policy Settings
                              </div>
                              {inSettingsCats.map(renderCategory)}
                            </div>
                          )}
                          
                          {otherCats.length > 0 && (
                            <div className="py-1">
                              <div className="px-4 py-2 bg-[#f9faf9] border-t border-black/[0.04] sticky top-0 z-10">
                                <div className="text-[11px] font-bold text-[#68726d] uppercase tracking-wider">
                                  Other Categories
                                </div>
                                <div className="text-[10px] text-[#84908a] mt-0.5 leading-tight">
                                  Selecting these will automatically add them to your policy governance settings.
                                </div>
                              </div>
                              {otherCats.map(renderCategory)}
                            </div>
                          )}
                        </div>
                      );
                    })()}
                  </>
                )}
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </div>

      <div className="mt-6">
        {/* Selected Categories Chips */}
        <div className="p-5 border border-black/[0.04] bg-[#fcfcfc] rounded-xl min-h-[120px]">
          <h4 className="text-[11px] font-bold text-[#84908a] uppercase tracking-wider mb-3">
            Selected Categories ({categoryIds.length})
          </h4>
          
          {categoryIds.length === 0 ? (
            <p className="text-[13px] text-[#a0a8a5] italic">No categories selected yet.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {selectedCategoriesList.map(cat => (
                <span
                  key={cat.categoryId}
                  className="inline-flex items-center gap-1.5 h-8 pl-3 pr-1.5 rounded-full bg-[#f0fbf9] border border-[#08b6a3]/20 text-[#087f70] text-[13px] font-medium transition-all hover:bg-[#e0f6f4]"
                >
                  {cat.name}
                  <button
                    type="button"
                    onClick={() => toggleCategory(cat.categoryId)}
                    className="w-5 h-5 rounded-full flex items-center justify-center hover:bg-[#087f70]/10 transition-colors"
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M18 6 6 18"/><path d="m6 6 12 12"/>
                    </svg>
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
