"use client";

import { useDeleteDepartmentApi } from "@/queries/departments/delete-department";
import { Department, useGetAllDepartmentsApi } from "@/queries/departments/get-all-departments";
import { STATE_KEYS } from "@/lib/constants/state_key";
import { useState } from "react";
import toast from "react-hot-toast";



export const useDepartmentHook = (_id?: string) => {


    const [selected, setSelected] = useState<Department | null>(null);
    const [state, setState] = useState<string | null>(null);
    const deleteDept = useDeleteDepartmentApi();
    const allDepts = useGetAllDepartmentsApi()


    // const form = useForm({
    //   resolver: zodResolver(userSchema),


    // });


    // const {
    //   reset

    // } = form;
    // // In your useUserHook, update the useEffect:
    // useEffect(() => {
    //   let isMounted = true;

    //   const fetchUserData = async () => {
    //     if (selected) {
    //       try {


    //         if (!isMounted) return; // Prevent state updates if unmounted

    //         const value = selected
    //         console.log({ value })
    //         reset({
    //           id: value?.id || "",
    //           firstName: value?.firstName || "",
    //           lastName: value?.lastName || "",
    //           email: value?.email || "",
    //           roleIds: value?.roles?.map((role: Role) => role.id.toString()) || [],
    //           dateOfBirth: value?.dateOfBirth ? format(value.dateOfBirth, "yyyy-MM-dd") : "",
    //           phone: value?.phone ? `${value.phone.countryCode}${value.phone.number}` : defaultValue.phone

    //         });
    //       } catch (error) {
    //         console.error("Failed to fetch user data:", error);
    //         // Handle error appropriately
    //       }
    //     } else {
    //       reset({
    //         id: null,
    //         firstName: "",
    //         lastName: "",
    //         email: "",
    //         roleIds: [],
    //         phone: "",
    //         dateOfBirth: ""
    //       });
    //     }
    //   };

    //   fetchUserData();

    //   return () => {
    //     isMounted = false;
    //   };
    // }, [selected]);

    // const onSubmit = async (value: z.infer<typeof userSchema>) => {
    //   const { ...formData } = value;
    //   try {
    //     const isEdit = !!value.id;
    //     const mutation = isEdit ? updateUser : createUser;

    //     //console.log(typeof value.phone)
    //     const phoneNumber = parsePhoneNumber(value.phone)
    //     const date = (typeof value.dateOfBirth === "string")
    //       ? value.dateOfBirth
    //       : new Intl.DateTimeFormat('en-CA', {
    //         day: '2-digit',
    //         month: '2-digit',
    //         year: 'numeric'
    //       }).format(formData.dateOfBirth as Date);

    //     const payload = {

    //       ...formData,

    //       dateOfBirth: date,
    //       phone: {
    //         countryCode: `+${phoneNumber.countryCallingCode}`,
    //         number: phoneNumber.nationalNumber
    //       },
    //       roleIds: formData.roleIds.map((id) => Number(id))
    //     };


    //     const response = await mutation.mutateAsync({ ...payload } as UserProfile);


    //     toast.success(`User ${isEdit ? "updated" : "created"}!`)
    //     users.refetch();
    //     setChannelCentralState(null)
    //     // roleUsers.refetch()
    //     close();
    //   } catch (error: unknown) {
    //     const errorMessage =
    //       error?.response?.data?.message ||
    //       error.message ||
    //       "An unexpected error occurred";
    //     console.error("Error submitting form:", errorMessage);
    //     toast.error(errorMessage);
    //   }
    // };

    const handleDeleteAction = async () => {
        try {


            const payload = selected?.departmentId ?? 0;

            await deleteDept.mutateAsync(payload.toString());



            toast.success(`Department ${selected?.departmentName} deleted!`)


            allDepts.refetch();
            setSelected(null)
            setState(STATE_KEYS.SUCCESS)

        } catch (_error: unknown) {

        }
    };



    return {
        selected,
        setSelected,
        handleDeleteAction,
        state,
        setState,
        actionIsLoading: deleteDept.isPending
    };
};

export type UseDepartmentHookType = ReturnType<typeof useDepartmentHook>;
