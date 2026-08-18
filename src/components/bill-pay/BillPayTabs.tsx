"use client";

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RecurringBillsTable } from "./RecurringBillsTable";
import { RegisteredVendorsTable } from "./RegisteredVendorsTable";
import { OtherSourcesTable } from "./OtherSourcesTable";

interface BillPayTabsProps {
  activeTab: string;
  setActiveTab: (val: string) => void;
}

export function BillPayTabs({ activeTab, setActiveTab }: BillPayTabsProps) {
  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0 overflow-hidden">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 shrink-0">
        <TabsList className="bg-[#f5f7f6] p-1 h-10 rounded-[10px] inline-flex max-w-full overflow-x-auto overflow-y-hidden whitespace-nowrap scrollbar-hide shrink-0">
          <TabsTrigger 
            value="recurring" 
            className="data-[state=active]:bg-white data-[state=active]:text-[#0b100e] data-[state=active]:shadow-sm text-[#68726d] rounded-[6px] px-4 text-[13px] font-semibold h-full flex items-center"
          >
            Recurring Bills
          </TabsTrigger>
          <TabsTrigger 
            value="registered" 
            className="data-[state=active]:bg-white data-[state=active]:text-[#0b100e] data-[state=active]:shadow-sm text-[#68726d] rounded-[6px] px-4 text-[13px] font-semibold h-full flex items-center"
          >
            Registered Vendors
          </TabsTrigger>
          <TabsTrigger 
            value="other" 
            className="data-[state=active]:bg-white data-[state=active]:text-[#0b100e] data-[state=active]:shadow-sm text-[#68726d] rounded-[6px] px-4 text-[13px] font-semibold h-full flex items-center"
          >
            Other sources
          </TabsTrigger>
        </TabsList>
        <div id="tab-actions" className="flex items-center gap-2" />
      </div>
      
      <TabsContent value="recurring" className="flex-1 flex flex-col min-h-0 overflow-hidden mt-4">
        <RecurringBillsTable />
      </TabsContent>
      
      <TabsContent value="registered" className="flex-1 flex flex-col min-h-0 overflow-hidden mt-4">
        <RegisteredVendorsTable />
      </TabsContent>
      
      <TabsContent value="other" className="flex-1 flex flex-col min-h-0 overflow-hidden mt-4">
        <OtherSourcesTable />
      </TabsContent>
    </Tabs>
  );
}
