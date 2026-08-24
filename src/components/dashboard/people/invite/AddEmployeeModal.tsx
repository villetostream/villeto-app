"use client";

import React, { useState, useMemo, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useGetAllDepartmentsApi } from "@/queries/departments/get-all-departments";
import { useImportReferences, useValidateManualEmployee, useSubmitManualEmployee, ManualEmployee } from "@/queries/users/bulk-manual";
import { useGetDirectoryUsersApi } from "@/queries/users/get-all-users";
import { Popover, PopoverContent, PopoverTrigger, PopoverAnchor } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { X, Loader2, AlertCircle, ChevronDown, Check, CalendarIcon } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { format, parseISO } from "date-fns";

interface AddEmployeeModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const INITIAL_STATE: ManualEmployee = {
    employee_external_id: "",
    first_name: "",
    last_name: "",
    email: "",
    manager_external_id: "",
    department_external_id: "",
    department_name: "",
    job_title: "",
    management_level: "",
    job_grade: "",
    business_unit: "",
    location: "",
    employment_type: "",
    status: "Active",
    effective_date: "",
};

// Custom Combobox that allows typing anything while showing options
function CreatableCombobox({ 
    value, 
    onChange, 
    options, 
    placeholder,
    isLoading = false
}: { 
    value: string; 
    onChange: (val: string) => void; 
    options: string[]; 
    placeholder: string;
    isLoading?: boolean;
}) {
    const [open, setOpen] = useState(false);

    // Filter options based on input
    const filteredOptions = useMemo(() => {
        if (!value) return options;
        const exactMatch = options.find(o => o?.toLowerCase?.() === value.toLowerCase());
        if (exactMatch) return options; // Don't hide other options if an exact match is selected
        const lowerVal = value.toLowerCase();
        return options.filter(opt => opt?.toLowerCase?.().includes(lowerVal));
    }, [value, options]);

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverAnchor asChild>
                <div className="relative w-full">
                    <PopoverTrigger asChild>
                        <div className="absolute inset-y-0 right-0 flex items-center pr-3 cursor-pointer">
                            <ChevronDown className="w-4 h-4 text-[#84908a]" />
                        </div>
                    </PopoverTrigger>
                    <Input 
                        placeholder={placeholder} 
                        value={value} 
                        onChange={(e) => {
                            onChange(e.target.value);
                            setOpen(true);
                        }}
                        onFocus={() => setOpen(true)}
                        className="h-[46px] rounded-[10px] border-black/[0.08] bg-white text-[14px] pr-10 w-full"
                    />
                </div>
            </PopoverAnchor>
            
            {/* The dropdown list */}
            {open && (
                <PopoverContent 
                    className="w-[--radix-popover-trigger-width] p-1.5 rounded-[12px] border-black/[0.08] shadow-lg bg-white" 
                    align="start"
                    sideOffset={4}
                    onOpenAutoFocus={(e) => e.preventDefault()} // Don't steal focus from input
                >
                    <div className="max-h-[200px] overflow-y-auto scrollbar-thin scrollbar-thumb-black/10 scrollbar-track-transparent">
                        {isLoading ? (
                            <div className="px-3 py-4 text-center text-[13px] text-[#66706b] flex items-center justify-center gap-2">
                                <Loader2 className="w-4 h-4 animate-spin" /> Loading...
                            </div>
                        ) : filteredOptions.length > 0 ? (
                            filteredOptions.map((opt, i) => (
                                <div 
                                    key={i}
                                    onClick={() => {
                                        onChange(opt);
                                        setOpen(false);
                                    }}
                                    className={cn(
                                        "px-3 py-2 text-[13px] rounded-[8px] cursor-pointer flex items-center justify-between",
                                        "hover:bg-[#f0faf8] hover:text-[#087f70] transition-colors",
                                        value === opt ? "bg-[#f0faf8] text-[#087f70] font-medium" : "text-[#0b100e]"
                                    )}
                                >
                                    {opt}
                                    {value === opt && <Check className="w-3.5 h-3.5" />}
                                </div>
                            ))
                        ) : (
                            <div className="px-3 py-4 text-center text-[13px] text-[#66706b]">
                                No options found
                            </div>
                        )}
                    </div>
                </PopoverContent>
            )}
        </Popover>
    );
}

export function AddEmployeeModal({ isOpen, onClose }: AddEmployeeModalProps) {
    const [formData, setFormData] = useState<ManualEmployee>(INITIAL_STATE);
    const [duplicateMode, setDuplicateMode] = useState<boolean>(false);
    const [isSuccess, setIsSuccess] = useState<boolean>(false);
    const [successAction, setSuccessAction] = useState<"added" | "updated">("added");
    const [validationError, setValidationError] = useState<string | null>(null);

    const { data: departmentsRes, isLoading: loadingDepts } = useGetAllDepartmentsApi();
    const { data: jobGradesRes, isLoading: loadingGrades } = useImportReferences("job_grades", isOpen);
    const { data: mgmtLevelsRes, isLoading: loadingLevels } = useImportReferences("management_levels", isOpen);
    const { data: dirUsersRes, isLoading: loadingDirUsers } = useGetDirectoryUsersApi({ enabled: isOpen, params: { status: "all" } });

    const validateMutation = useValidateManualEmployee();
    const submitMutation = useSubmitManualEmployee();

    // Robust extraction: Handle { data: { jobGrades: [] } } responses
    const departments = Array.isArray(departmentsRes?.data) ? departmentsRes.data : (Array.isArray(departmentsRes) ? departmentsRes : []);
    const jobGrades = jobGradesRes?.data?.jobGrades || (Array.isArray(jobGradesRes?.data) ? jobGradesRes.data : (Array.isArray(jobGradesRes) ? jobGradesRes : []));
    const mgmtLevels = mgmtLevelsRes?.data?.managementLevels || (Array.isArray(mgmtLevelsRes?.data) ? mgmtLevelsRes.data : (Array.isArray(mgmtLevelsRes) ? mgmtLevelsRes : []));
    const dirUsers = Array.isArray(dirUsersRes?.data) ? dirUsersRes.data : (Array.isArray(dirUsersRes) ? dirUsersRes : []);

    // Reset on open/close
    useEffect(() => {
        if (!isOpen) {
            setFormData(INITIAL_STATE);
            setDuplicateMode(false);
            setIsSuccess(false);
            setValidationError(null);
        }
    }, [isOpen]);

    const handleChange = (field: keyof ManualEmployee, value: string) => {
        setFormData(prev => {
            const next = { ...prev, [field]: value };
            
            // Auto-fill department name/id based on the other
            if (field === "department_external_id") {
                const found = departments.find(d => d.departmentExternalId === value || d.code === value || d.departmentId === value);
                if (found) next.department_name = found.departmentName;
            }
            if (field === "department_name") {
                const found = departments.find(d => d.departmentName === value);
                if (found) next.department_external_id = found.departmentExternalId || found.code || found.departmentId || "";
            }

            // Auto-fill form if employee ID or email exactly matches a directory user
            if ((field === "employee_external_id" || field === "email") && value) {
                const foundUser = dirUsers.find((u: any) => {
                    if (field === "employee_external_id") return u.employeeExternalId === value;
                    if (field === "email") return u.email?.toLowerCase() === value.toLowerCase();
                    return false;
                });
                if (foundUser) {
                    next.employee_external_id = foundUser.employeeExternalId || next.employee_external_id;
                    next.first_name = foundUser.firstName || next.first_name;
                    next.last_name = foundUser.lastName || next.last_name;
                    next.email = foundUser.email || next.email;
                    
                    // Attempt to resolve manager external ID
                    if (foundUser.managerId) {
                        const mngr = dirUsers.find(u => u.userId === foundUser.managerId);
                        if (mngr && mngr.employeeExternalId) {
                            next.manager_external_id = mngr.employeeExternalId;
                        }
                    } else if (foundUser.manager && typeof foundUser.manager === 'object' && 'employeeExternalId' in foundUser.manager) {
                        next.manager_external_id = foundUser.manager.employeeExternalId || "";
                    }

                    // Attempt to resolve department robustly
                    const deptId = foundUser.departmentId || (foundUser as any).department_id || foundUser.department?.departmentId;
                    const deptName = foundUser.department?.departmentName || (foundUser as any).department?.name || (foundUser as any).department_name;
                    const deptExtId = foundUser.department?.departmentExternalId || (foundUser as any).department?.department_external_id;

                    if (deptId) {
                        const foundDept = departments.find(d => d.departmentId === deptId || d.code === deptId || d.departmentExternalId === deptId);
                        if (foundDept) {
                            next.department_external_id = foundDept.departmentExternalId || foundDept.code || foundDept.departmentId || "";
                            next.department_name = foundDept.departmentName || "";
                        } else {
                            next.department_external_id = deptExtId || deptId || "";
                            next.department_name = deptName || "";
                        }
                    } else if (deptName) {
                        next.department_external_id = deptExtId || "";
                        next.department_name = deptName;
                    }

                    next.job_title = foundUser.jobTitle || next.job_title;
                    next.management_level = foundUser.managementLevel || next.management_level;
                    next.business_unit = foundUser.businessUnit || next.business_unit;
                    next.location = foundUser.location || next.location;
                    next.employment_type = foundUser.employmentType || next.employment_type;
                    
                    // Newly added missing fields
                    next.status = foundUser.employeeStatus || (foundUser as any).employee_status || foundUser.status || next.status;
                    next.effective_date = foundUser.effectiveDate ? foundUser.effectiveDate.substring(0, 10) : next.effective_date;
                    
                    // Job grade robustly - prioritizing 'code' as the UI uses code
                    const jgId = foundUser.jobGradeId || (foundUser as any).job_grade_id;
                    let jgCodeOrName = foundUser.jobGrade?.code || foundUser.jobGrade?.name;
                    
                    if (typeof (foundUser as any).jobGrade === 'string') jgCodeOrName = (foundUser as any).jobGrade;
                    if (typeof (foundUser as any).job_grade === 'string') jgCodeOrName = jgCodeOrName || (foundUser as any).job_grade;
                    if ((foundUser as any).job_grade?.code || (foundUser as any).job_grade?.name) {
                        jgCodeOrName = jgCodeOrName || (foundUser as any).job_grade.code || (foundUser as any).job_grade.name;
                    }
                    
                    if (jgId && typeof jobGrades[0] === 'object') {
                        // If jobGrades is an array of objects
                        const foundGrade = jobGrades.find((g: any) => g.id === jgId || g.jobGradeId === jgId);
                        next.job_grade = foundGrade?.code || foundGrade?.name || jgCodeOrName || jgId;
                    } else {
                        next.job_grade = jgCodeOrName || jgId || next.job_grade;
                    }
                }
            }
            
            return next;
        });
        if (validationError) setValidationError(null);
    };

    const formatErrorMessages = (msgData: any): string => {
        if (Array.isArray(msgData)) {
            return msgData.map(msg => {
                if (typeof msg !== 'string') return String(msg);
                const parts = msg.split(': ');
                let rawError = parts.length > 1 ? parts[1] : parts[0];
                rawError = rawError.charAt(0).toUpperCase() + rawError.slice(1);
                return rawError.replace(/_/g, ' ');
            }).join(" • ");
        }
        return String(msgData || "Validation failed");
    };

    const handleInitialSubmit = async () => {
        if (!formData.first_name || !formData.last_name || !formData.email) {
            toast.error("First Name, Last Name, and Email are required.");
            return;
        }

        try {
            setValidationError(null);
            const res = await validateMutation.mutateAsync({ employees: [formData] });
            
            if (res.data.valid) {
                // If valid, just submit normally
                await submitFinal();
            } else {
                // Check if it's a duplicate or hard error
                const errors = res.data.errors || [];
                const duplicates = res.data.duplicates || [];
                
                const hasDuplicates = duplicates.length > 0 || errors.some((e: any) => e.message.toLowerCase().includes("duplicate") || e.message.toLowerCase().includes("already belongs"));
                const hardErrors = errors.filter((e: any) => !e.message.toLowerCase().includes("duplicate") && !e.message.toLowerCase().includes("already belongs"));

                if (hardErrors.length > 0) {
                    setValidationError(hardErrors[0].message);
                } else if (hasDuplicates) {
                    setDuplicateMode(true);
                } else {
                    setValidationError("Validation failed.");
                }
            }
        } catch (error: any) {
            const formatted = formatErrorMessages(error?.response?.data?.message);
            setValidationError(formatted);
        }
    };

    const submitFinal = async (strategy?: "skip_existing" | "update_existing") => {
        try {
            await submitMutation.mutateAsync({ employees: [formData], duplicateStrategy: strategy });
            toast.success(strategy === "update_existing" ? "Employee updated successfully" : "Employee added successfully");
            setSuccessAction(strategy === "update_existing" ? "updated" : "added");
            setIsSuccess(true);
        } catch (error: any) {
            const formatted = formatErrorMessages(error?.response?.data?.message);
            setValidationError(formatted);
        }
    };

    const isLoading = validateMutation.isPending || submitMutation.isPending;
    const isFormValid = Boolean(
        String(formData.first_name || '').trim() && 
        String(formData.last_name || '').trim() && 
        String(formData.email || '').trim() && 
        String(formData.department_external_id || '').trim() &&
        String(formData.department_name || '').trim() &&
        String(formData.job_grade || '').trim() &&
        String(formData.effective_date || '').trim()
    );

    if (duplicateMode) {
        return (
            <Dialog open={isOpen} onOpenChange={onClose}>
                <DialogContent className="sm:max-w-[425px] rounded-[18px] p-6 bg-white border border-black/[0.08] shadow-2xl">
                    <DialogHeader>
                        <DialogTitle className="text-[18px] font-bold text-[#0b100e]">Duplicate Found</DialogTitle>
                    </DialogHeader>
                    <div className="py-4">
                        <div className="flex items-start gap-3 p-4 bg-amber-50 rounded-[12px] border border-amber-200">
                            <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                            <p className="text-[13px] text-amber-800 leading-relaxed">
                                An employee with this ID or email already exists in the system. Would you like to update their existing record with this new information?
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3 justify-end pt-4 border-t border-black/[0.06]">
                        <Button variant="outline" onClick={() => setDuplicateMode(false)} disabled={isLoading} className="rounded-[10px] h-[42px] text-[13px] font-semibold">
                            Cancel
                        </Button>
                        <Button onClick={() => submitFinal("update_existing")} disabled={isLoading} className="rounded-[10px] h-[42px] bg-[#0ea894] hover:bg-[#0c9785] text-white text-[13px] font-semibold shadow-[0_8px_20px_-10px_rgba(14,168,148,0.7)]">
                            {isLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                            Update Existing Record
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        );
    }

    if (isSuccess) {
        return (
            <Dialog open={isOpen} onOpenChange={onClose}>
                <DialogContent className="sm:max-w-[425px] rounded-[24px] p-8 bg-white border border-black/[0.08] shadow-2xl flex flex-col items-center text-center">
                    <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mb-4 border-[4px] border-green-50">
                        <Check className="w-8 h-8 text-green-600" />
                    </div>
                    <DialogTitle className="text-[20px] font-bold text-[#0b100e] mb-2">
                        {successAction === "updated" ? "Employee Updated" : "Employee Added"}
                    </DialogTitle>
                    <p className="text-[14px] text-[#66706b] mb-8">
                        {formData.first_name} {formData.last_name} has been successfully {successAction === "updated" ? "updated in" : "added to"} your directory.
                    </p>
                    <div className="flex items-center gap-3 w-full">
                        <Button 
                            variant="outline" 
                            onClick={onClose} 
                            className="flex-1 rounded-[10px] h-[46px] text-[14px] font-semibold"
                        >
                            Close
                        </Button>
                        <Button 
                            onClick={() => {
                                setFormData(INITIAL_STATE);
                                setIsSuccess(false);
                                setDuplicateMode(false);
                            }} 
                            className="flex-1 rounded-[10px] h-[46px] bg-[#0ea894] hover:bg-[#0c9785] text-white text-[14px] font-semibold shadow-[0_8px_20px_-10px_rgba(14,168,148,0.7)]"
                        >
                            Add Another
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        );
    }

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[600px] p-0 overflow-hidden rounded-[24px] bg-white border border-black/[0.08] shadow-2xl">
                <DialogHeader className="px-6 py-5 border-b border-black/[0.06] bg-[#f9faf9]">
                    <DialogTitle className="text-[20px] font-bold text-[#0b100e]">Add New Employee</DialogTitle>
                    <p className="text-[13px] text-[#66706b] mt-1">Add an employee to your directory where you invite them</p>
                </DialogHeader>

                <div className="p-6 max-h-[60vh] overflow-y-auto scrollbar-thin scrollbar-thumb-black/10 scrollbar-track-transparent">
                    {validationError && (
                        <div className="mb-6 p-3 bg-red-50 border border-red-200 rounded-[10px] flex items-center gap-2">
                            <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
                            <p className="text-[13px] text-red-700 font-medium">{validationError}</p>
                        </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-5 gap-y-6">
                        <div className="col-span-full">
                            <Label className="text-[13px] font-medium text-[#464f4b] mb-1.5 block">Employee I.D</Label>
                            <CreatableCombobox 
                                placeholder="Enter employee I.D" 
                                value={formData.employee_external_id || ""} 
                                onChange={(val) => handleChange("employee_external_id", val)}
                                options={dirUsers.map(u => u.employeeExternalId).filter(Boolean) as string[]}
                                isLoading={loadingDirUsers}
                            />
                        </div>

                        <div>
                            <Label className="text-[13px] font-medium text-[#464f4b] mb-1.5 block">First Name <span className="text-red-500">*</span></Label>
                            <Input 
                                placeholder="Enter first name" 
                                value={formData.first_name} 
                                onChange={(e) => handleChange("first_name", e.target.value)}
                                className="h-[46px] rounded-[10px] border-black/[0.08] bg-white text-[14px]"
                            />
                        </div>

                        <div>
                            <Label className="text-[13px] font-medium text-[#464f4b] mb-1.5 block">Last Name <span className="text-red-500">*</span></Label>
                            <Input 
                                placeholder="Enter last name" 
                                value={formData.last_name} 
                                onChange={(e) => handleChange("last_name", e.target.value)}
                                className="h-[46px] rounded-[10px] border-black/[0.08] bg-white text-[14px]"
                            />
                        </div>

                        <div className="col-span-full">
                            <Label className="text-[13px] font-medium text-[#464f4b] mb-1.5 block">Email Address <span className="text-red-500">*</span></Label>
                            <Input 
                                placeholder="Enter email address" 
                                type="email"
                                value={formData.email} 
                                onChange={(e) => handleChange("email", e.target.value)}
                                className="h-[46px] rounded-[10px] border-black/[0.08] bg-white text-[14px]"
                            />
                        </div>

                        <div className="col-span-full">
                            <Label className="text-[13px] font-medium text-[#464f4b] mb-1.5 block">Manager I.D</Label>
                            <Input 
                                placeholder="Enter or select" 
                                value={formData.manager_external_id} 
                                onChange={(e) => handleChange("manager_external_id", e.target.value)}
                                className="h-[46px] rounded-[10px] border-black/[0.08] bg-white text-[14px]"
                            />
                        </div>

                        <div>
                            <Label className="text-[13px] font-medium text-[#464f4b] mb-1.5 block">Department ID</Label>
                            <CreatableCombobox 
                                placeholder="Enter or select ID" 
                                value={formData.department_external_id || ""} 
                                onChange={(val) => handleChange("department_external_id", val)}
                                options={departments.map(d => d.departmentExternalId || d.code || d.departmentId).filter(Boolean) as string[]}
                                isLoading={loadingDepts}
                            />
                        </div>

                        <div>
                            <Label className="text-[13px] font-medium text-[#464f4b] mb-1.5 block">Department</Label>
                            <CreatableCombobox 
                                placeholder="Enter or select department" 
                                value={formData.department_name || ""} 
                                onChange={(val) => handleChange("department_name", val)}
                                options={departments.map(d => d.departmentName).filter(Boolean) as string[]}
                                isLoading={loadingDepts}
                            />
                        </div>

                        <div className="col-span-full">
                            <Label className="text-[13px] font-medium text-[#464f4b] mb-1.5 block">Job Title</Label>
                            <Input 
                                placeholder="Enter job title" 
                                value={formData.job_title} 
                                onChange={(e) => handleChange("job_title", e.target.value)}
                                className="h-[46px] rounded-[10px] border-black/[0.08] bg-white text-[14px]"
                            />
                        </div>

                        <div>
                            <Label className="text-[13px] font-medium text-[#464f4b] mb-1.5 block">Management level</Label>
                            <CreatableCombobox 
                                placeholder="Select or type" 
                                value={formData.management_level || ""} 
                                onChange={(val) => handleChange("management_level", val)}
                                options={mgmtLevels.map((l: any) => typeof l === 'string' ? l : (l?.name || l?.code || ""))}
                                isLoading={loadingLevels}
                            />
                        </div>

                        <div>
                            <Label className="text-[13px] font-medium text-[#464f4b] mb-1.5 block">Job grade</Label>
                            <CreatableCombobox 
                                placeholder="Select or type" 
                                value={formData.job_grade || ""} 
                                onChange={(val) => handleChange("job_grade", val)}
                                options={jobGrades.map((g: any) => typeof g === 'string' ? g : (g?.code || g?.name || ""))}
                                isLoading={loadingGrades}
                            />
                        </div>

                        <div>
                            <Label className="text-[13px] font-medium text-[#464f4b] mb-1.5 block">Business unit</Label>
                            <Input 
                                placeholder="Enter business unit" 
                                value={formData.business_unit} 
                                onChange={(e) => handleChange("business_unit", e.target.value)}
                                className="h-[46px] rounded-[10px] border-black/[0.08] bg-white text-[14px]"
                            />
                        </div>

                        <div>
                            <Label className="text-[13px] font-medium text-[#464f4b] mb-1.5 block">Location</Label>
                            <Input 
                                placeholder="Enter location" 
                                value={formData.location} 
                                onChange={(e) => handleChange("location", e.target.value)}
                                className="h-[46px] rounded-[10px] border-black/[0.08] bg-white text-[14px]"
                            />
                        </div>

                        <div>
                            <Label className="text-[13px] font-medium text-[#464f4b] mb-1.5 block">Employee type</Label>
                            <CreatableCombobox 
                                placeholder="Select or type" 
                                value={formData.employment_type || ""} 
                                onChange={(val) => handleChange("employment_type", val)}
                                options={["Full-Time", "Part-Time", "Contract", "Internship"]}
                            />
                        </div>

                        <div className="flex flex-col gap-1.5">
                            <Label className="text-[13px] font-medium text-[#464f4b]">Employment date</Label>
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button
                                        variant="outline"
                                        className={cn(
                                            "h-[46px] rounded-[10px] border-black/[0.08] bg-white text-[14px] w-full justify-start text-left font-normal hover:bg-transparent",
                                            !formData.effective_date && "text-[#84908a]"
                                        )}
                                    >
                                        <CalendarIcon className="mr-3 h-4 w-4 text-[#84908a]" />
                                        {formData.effective_date ? format(parseISO(formData.effective_date), "MMM d, yyyy") : <span>Select date</span>}
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0 rounded-[12px] border-black/[0.08] shadow-lg" align="start">
                                    <Calendar
                                        mode="single"
                                        selected={formData.effective_date ? parseISO(formData.effective_date) : undefined}
                                        onSelect={(date) => {
                                            handleChange("effective_date", date ? format(date, "yyyy-MM-dd") : "");
                                        }}
                                        initialFocus
                                    />
                                </PopoverContent>
                            </Popover>
                        </div>

                        <div>
                            <Label className="text-[13px] font-medium text-[#464f4b] mb-1.5 block">Status</Label>
                            <CreatableCombobox 
                                placeholder="Select or type" 
                                value={formData.status || ""} 
                                onChange={(val) => handleChange("status", val)}
                                options={["Active", "Terminated", "Inactive", "On leave"]}
                            />
                        </div>
                    </div>
                </div>

                <div className="p-6 border-t border-black/[0.06] bg-[#f9faf9] flex justify-end">
                    <Button 
                        onClick={handleInitialSubmit}
                        disabled={isLoading || !isFormValid}
                        className={cn(
                            "w-full sm:w-auto h-[46px] rounded-[10px] text-white text-[14px] font-semibold px-8 transition-all",
                            (isLoading || !isFormValid) 
                                ? "bg-[#84908a]/50 cursor-not-allowed shadow-none" 
                                : "bg-[#0ea894] hover:bg-[#0c9785] shadow-[0_8px_20px_-10px_rgba(14,168,148,0.7)] hover:translate-y-[-1px]"
                        )}
                    >
                        {isLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                        Add New Employee
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
