import { workspaceQueryKey } from "@/features/entity-workspace/store";

import { useQuery } from "@tanstack/react-query";
import { useAxios } from "../useAxios";
import { API_KEYS } from "@/lib/constants/apis";

export type PersonalExpenseStatus =
  | "draft"
  | "pending"
  | "approved"
  | "declined"
  | "rejected"
  | "paid";

export type PersonalExpenseRow = {
  id: number;
  date: string;
  vendor: string;
  category: string;
  amount: number;
  hasReceipt: boolean;
  status: PersonalExpenseStatus;
  reportName?: string;
  description?: string;
  groupId?: string; // For grouping multiple expenses with same report name
  isGrouped?: boolean; // True if this is a grouped entry
  groupedExpenses?: PersonalExpenseRow[]; // Array of individual expenses in the group
  totalAmount?: number; // Total amount for grouped expenses
};

interface IProps {
  page?: number;
  pageSize?: number;
  sort?: string;
  filter?: string;
}

export const useGetPersonalExpense = (props: IProps) => {
  const axios = useAxios();
  const { page = 1, pageSize = 10, sort, filter } = props;

  const getPersonalExpenses = async () => {
    const params = new URLSearchParams({
      page: page.toString(),
      pageSize: pageSize.toString(),
    });

    if (sort) {
      params.append("sort", sort);
    }

    if (filter) {
      params.append("filter", filter);
    }

    const response = await axios.get(
      `${API_KEYS.EXPENSE.PERSONAL_EXPENSES}?${params.toString()}`,
    );
    return response.data;
  };

  return useQuery({
    queryKey: workspaceQueryKey([
      "personal-expenses",
      page,
      pageSize,
      sort,
      filter,
    ]),
    queryFn: getPersonalExpenses,
  });
};
