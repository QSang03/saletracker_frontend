// hooks/useCampaignFilters.ts
import { useState, useEffect, useCallback, useMemo } from "react";
import { campaignAPI } from "@/lib/campaign-api";
import { CampaignType, CampaignStatus } from "@/types";

interface FilterOptions {
  departments: Array<{ value: number; label: string }>; // ✅ SỬA: value là number
  employees: Array<{ value: number; label: string }>; // ✅ SỬA: value là number
  campaignTypes: Array<{ value: string; label: string }>;
  statuses: Array<{ value: string; label: string }>;
}

// ✅ SỬA: Interface cho raw employee data
interface RawEmployee {
  value: number;
  label: string;
  departmentIds?: number[]; // Thêm thông tin departments của employee
}

export const useCampaignFilters = () => {
  const [departments, setDepartments] = useState<
    Array<{ value: number; label: string }>
  >([]);
  const [allEmployees, setAllEmployees] = useState<RawEmployee[]>([]); // ✅ Lưu tất cả employees
  const [loading, setLoading] = useState(false);
  const [selectedDepartments, setSelectedDepartments] = useState<
    (string | number)[]
  >([]);

  // Campaign types options (static)
  const campaignTypeOptions = useMemo(
    () => [
      { value: CampaignType.HOURLY_KM, label: "Chương trình KM 1 giờ" },
      { value: CampaignType.DAILY_KM, label: "Chương trình KM 1 ngày" },
      {
        value: CampaignType.THREE_DAY_KM,
        label: "Chương trình KM trong 3 ngày",
      },
      {
        value: CampaignType.WEEKLY_SP,
        label: "Chương trình gửi SP 1 tuần / lần",
      },
      {
        value: CampaignType.WEEKLY_BBG,
        label: "Chương trình gửi BBG 1 tuần / lần",
      },
    ],
    []
  );

  // Status options (static)
  const statusOptions = useMemo(
    () => [
      { value: CampaignStatus.DRAFT, label: "Bản nháp" },
      { value: CampaignStatus.SCHEDULED, label: "Đã lên lịch" },
      { value: CampaignStatus.RUNNING, label: "Đang chạy" },
      { value: CampaignStatus.PAUSED, label: "Tạm dừng" },
      { value: CampaignStatus.COMPLETED, label: "Hoàn thành" },
      { value: CampaignStatus.ARCHIVED, label: "Đã lưu trữ" },
    ],
    []
  );

  // ✅ SỬA: Filtered employees based on selected departments
  const filteredEmployees = useMemo(() => {
    if (selectedDepartments.length === 0 || selectedDepartments.length > 1) {
      // Nếu không chọn hoặc chọn nhiều department, trả về tất cả employees
      return allEmployees;
    }

    const selectedDeptId = Number(selectedDepartments[0]);
    // Filter employees theo department được chọn
    return allEmployees.filter(
      (emp) => emp.departmentIds && emp.departmentIds.includes(selectedDeptId)
    );
  }, [allEmployees, selectedDepartments]);

  // ✅ SỬA: Memoized options object
  const options = useMemo(
    () => ({
      departments,
      employees: filteredEmployees,
      campaignTypes: campaignTypeOptions,
      statuses: statusOptions,
    }),
    [departments, filteredEmployees, campaignTypeOptions, statusOptions]
  );

  // ✅ SỬA: Load departments only once
  const loadDepartments = useCallback(async () => {
    try {
      const departmentsData = await campaignAPI.getDepartmentsForFilter();
      setDepartments(departmentsData);
    } catch (error) {
      console.error("Error loading departments:", error);
    }
  }, []);

  // ✅ SỬA: Load ALL employees only once
  const loadAllEmployees = useCallback(async () => {
    try {
      setLoading(true);
      // Gọi API lấy tất cả employees với thông tin department
      const employeesData = await campaignAPI.getAllUsersForFilter(); // ✅ API mới
      setAllEmployees(employeesData);
    } catch (error) {
      console.error("Error loading employees:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  // ✅ SỬA: Load initial data only once
  useEffect(() => {
    loadDepartments();
    loadAllEmployees();
  }, [loadDepartments, loadAllEmployees]);

  // ✅ SỬA: Handle department change - no refetch needed
  const handleDepartmentChange = useCallback(
    (departments: (string | number)[]) => {
      setSelectedDepartments(departments);
    },
    [selectedDepartments]
  );

  return {
    options,
    loading,
    selectedDepartments,
    handleDepartmentChange,
    // ✅ Bỏ refetch vì không cần thiết nữa
  };
};
