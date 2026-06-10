"use client"

import DepartmentForm from '@/components/dashboard/people/depts/DepartmentForm'
import withPermissions from '@/components/permissions/permission-protected-routes'
import React from 'react'

const Page = () => {
    return (
        <DepartmentForm />
    )
}

export default withPermissions(Page, [])
