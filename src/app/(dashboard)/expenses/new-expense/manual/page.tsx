"use client";
import withPermissions from "@/components/permissions/permission-protected-routes";
import { ManualExpenseForm } from '@/components/expenses/ManualExpenseForm'
import React from 'react'

const Page = () => {
    return (
        <ManualExpenseForm />
    )
}

export default withPermissions(Page, [
  { resource: "expense.report", action: "create" },
]);
