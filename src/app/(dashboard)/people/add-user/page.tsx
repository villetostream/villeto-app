"use client"
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { logger } from "@/lib/logger";

import FormSectionHeader from "@/components/dashboard/people/FormSectionHeader";
import withPermissions from "@/components/permissions/permission-protected-routes";
import { useGetAllRolesApi } from "@/queries/role/get-all-roles";
import { Department, useGetAllDepartmentsApi } from "@/queries/departments/get-all-departments";
import FormFieldSelect from "@/components/form fields/formFieldSelect";
import FormFieldInput from "@/components/form fields/formFieldInput";
import { UserFormData, userSchema } from "@/lib/schemas/schemas";
import { Form } from "@/components/ui/form";
import { useInviteUserApi } from "@/queries/users/invite-user";
import { useUpdateUserApi } from "@/queries/users/update-user";
import { useGetAUsersApi } from "@/queries/users/get-a-user";
import { useEffect, useMemo } from "react";
import { useGetAllUsersApi } from "@/queries/users/get-all-users";
import toast from "react-hot-toast";

// Zod schema matching the API request body


interface _AddSingleUserProps {
    initialData?: Partial<UserFormData>; // For edit mode
    isEditing?: boolean;
}

function AddSingleUser() {
    const router = useRouter();
    const allRoles = useGetAllRolesApi();
    const allDepts = useGetAllDepartmentsApi();

    //id getter
    const searchparams = useSearchParams()
    const id = searchparams.get("id");
    const isEdit = !!id

    //user query
    const user = useGetAUsersApi(id ?? "", { enabled: isEdit })
    const allUsers = useGetAllUsersApi();
    //mutations
    const inviteUser = useInviteUserApi();
    const updateUser = useUpdateUserApi()

    const departmentOptions = useMemo(() => {
        return (
            allDepts?.data?.data
                .map((dept: Department) => ({
                    label: dept.departmentName,
                    value: dept.departmentId.toString(),
                })) || []
        );
    }, [allDepts?.data?.data]);
    const form = useForm<UserFormData>({
        resolver: zodResolver(userSchema),
        defaultValues: {
            firstName: "",
            lastName: "",
            email: "",
            phone: "",
            location: "",
            cardIssued: false,
            jobTitle: "",
            departmentId: "",
            roleId: "",
        },
    });
    const {
        handleSubmit,
        formState: { errors, isSubmitting },
        setValue,
        reset,
        control,
    } = form

    useEffect(() => {
        if (user?.data) {
            const data = user?.data.data
            logger.log({ data })
            reset({
                firstName: data.firstName,
                lastName: data.lastName,
                email: data.email,
                phone: data?.phone ?? "",
                cardIssued: data?.cardIssued ?? false,
                jobTitle: data?.jobTitle ?? "",
                departmentId: data?.departmentId ?? "",
                roleId: data?.role?.roleId ?? "",
                id: data?.userId
            })
        }
    }, [user?.data, reset])


    const cardIssued = useWatch({ control, name: "cardIssued" });
    const location = useWatch({ control, name: "location" });

    logger.log({ cardIssued })
    // Handle form submission
    const onSubmit = async (data: UserFormData) => {
        try {
            const mutation = isEdit ? updateUser : inviteUser;

            await mutation.mutateAsync(data);

            const promises = [allUsers.refetch()];
            if (user.isEnabled && typeof user.refetch === "function") {
                // Ignore the result to avoid type mismatch
                void user.refetch();
            }
            await Promise.all(promises);

            toast.success(`User ${isEdit ? "Updated" : "Invited"}!`);


            router.push("/people");
        } catch (error) {
            logger.error("Error saving user:", error);
            // Handle error (show toast, set form error, etc.)
        }
    };

    // Helper function to handle Select changes
    const handleSelectChange = (field: keyof UserFormData) => (value: string) => {
        setValue(field, value, { shouldValidate: true });
    };

    return (
        <Form {...form}>
            <div className=" h-fit rounded-lg p-7 bg-sidebar-accent/20 border border-accent">

                <div className="max-w-[968px] space-y-10">
                    <div className="flex items-center gap-4">
                        <FormSectionHeader
                            title={isEdit ? "Edit User" : "Add Single User"}
                            description={isEdit ? "Update user information" : "Choose an option to invite a new user to Villeto"}
                        />
                    </div>

                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 ">
                        <div>
                            <h3 className="mb-4 text-lg font-semibold">User Information</h3>
                            <div className="grid gap-6 md:grid-cols-2">

                                <FormFieldInput
                                    name="firstName"
                                    placeholder="Type first name"
                                    control={control}
                                    label="First Name"
                                />


                                <FormFieldInput
                                    name="lastName"
                                    placeholder="Type Last name"
                                    control={control}
                                    label="Last Name"
                                />
                                <FormFieldInput
                                    name="email"
                                    placeholder="Type email address"
                                    control={control}
                                    label="Email"
                                    type="email Address"
                                />
                                <FormFieldInput
                                    name="phone"
                                    placeholder="Type phone number"
                                    control={control}
                                    label="Phone Number"
                                    type="tel"
                                />

                                <FormFieldSelect
                                    name="roleId"
                                    placeholder="Select role"
                                    values={(allRoles.data?.data ?? [])
                                        .slice()
                                        .sort((a, b) => (a.name || "").localeCompare(b.name || ""))
                                        .map((role) => ({
                                        label: role.name,
                                        value: role.roleId
                                    }))}
                                    control={control}
                                    label="User Type/Role"
                                />


                            </div>
                        </div>


                        <div>
                            <h3 className="mb-4 text-lg font-semibold">Work Information</h3>
                            <div className="grid gap-6 md:grid-cols-2">

                                <FormFieldSelect
                                    name="departmentId"
                                    placeholder="Select department"
                                    values={departmentOptions}
                                    control={control}
                                    label="Department"
                                />

                                <div className="space-y-2">
                                    <Label htmlFor="location">Location*</Label>
                                    <Select
                                        value={location}
                                        onValueChange={handleSelectChange("location")}
                                    >
                                        <SelectTrigger id="location" className="w-full">
                                            <SelectValue placeholder="Select location" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="New York City">New York City</SelectItem>
                                            <SelectItem value="San Francisco">San Francisco</SelectItem>
                                            <SelectItem value="Chicago">Chicago</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    {errors.location && (
                                        <p className="text-sm text-red-600">{errors.location.message}</p>
                                    )}
                                </div>
                                <FormFieldInput
                                    name="jobTitle"
                                    placeholder="e.g Software Engineer"
                                    control={control}
                                    label="Job Title"
                                />

                            </div>
                        </div>

                        <div>
                            <h3 className="mb-4 text-lg font-semibold">Corporate Card</h3>
                            <div className="flex items-center justify-between rounded-lg border p-4">
                                <div>
                                    <p className="font-medium">Issue Corporate Card</p>
                                    <p className="text-sm text-muted-foreground">
                                        Automatically issue a corporate card upon account creation
                                    </p>
                                </div>
                                <Switch
                                    checked={cardIssued}
                                    onCheckedChange={(checked) =>
                                        setValue("cardIssued", checked, { shouldValidate: true })
                                    }
                                />
                            </div>
                        </div>

                        <div className="flex justify-end gap-3">
                            <Button
                                type="button"
                                variant="outline"
                                size={"md"}

                                onClick={() => router.push("/people")}
                                disabled={isSubmitting}
                            >
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                className="px-7"
                                size={"md"}
                                disabled={isSubmitting}
                            >
                                {isSubmitting ? "Saving..." : (isEdit ? "Update User" : "Invite User")}
                            </Button>
                        </div>
                    </form>
                </div>

            </div >
        </Form>
    );
}

export default withPermissions(AddSingleUser, []);
