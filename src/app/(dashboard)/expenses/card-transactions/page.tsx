import React from 'react'
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { TransactionTable } from "@/components/dashboard/TransactionTable";

const Page = () => {
    return (

        <div className="flex flex-col h-full">
            <DashboardHeader />
            <div className="flex-1 px-6 pb-6">
                <TransactionTable />
            </div>
        </div>
    )
}

export default Page