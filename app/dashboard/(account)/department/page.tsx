"use client";

import { useEffect, useState, useMemo } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LoadingSpinner } from "@/components/ui/custom/loading-spinner";
import { ServerResponseAlert } from "@/components/ui/loading/ServerResponseAlert";
import DepartmentTable from "@/components/department/DepartmentTable";
import DepartmentCreateModal from "@/components/department/DepartmentCreateModal";
import EditDepartmentModal from "@/components/department/EditDepartmentModal";
import RestoreDepartmentModal from "@/components/department/RestoreDepartmentModal";
import PaginatedTable from "@/components/ui/pagination/PaginatedTable";
import { Department } from "@/types";
import { getAccessToken } from "@/lib/auth";

export default function DepartmentPage() {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedDepartment, setSelectedDepartment] = useState<Department | null>(null);
  const [showRestoreModal, setShowRestoreModal] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [alert, setAlert] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // Pagination & filter state
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const fetchDepartments = async () => {
    setIsLoading(true);
    try {
      const token = getAccessToken
        ? getAccessToken()
        : localStorage.getItem("access_token");
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/departments`,
        {
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        }
      );
      if (res.ok) {
        const data = await res.json();
        setDepartments(Array.isArray(data) ? data : data.data || []);
      }
    } catch (err) {
      setAlert({ type: "error", message: "Lỗi tải danh sách phòng ban!" });
    }
    setIsLoading(false);
  };

  // Xóa phòng ban
  const handleDeleteDepartment = async (dep: Department) => {
    const token = getAccessToken
      ? getAccessToken()
      : localStorage.getItem("access_token");
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/departments/${dep.id}`,
        {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        }
      );
      if (res.ok) {
        setAlert({ type: "success", message: "Xóa phòng ban thành công!" });
        fetchDepartments();
      } else {
        const data = await res.json();
        setAlert({
          type: "error",
          message: data.message || "Xóa phòng ban thất bại!",
        });
      }
    } catch {
      setAlert({ type: "error", message: "Xóa phòng ban thất bại!" });
    }
  };

  useEffect(() => {
    fetchDepartments();
  }, []);

  // Filter & phân trang ở frontend
  const filteredDepartments = useMemo(() => {
    return Array.isArray(departments)
      ? departments.filter((dep) =>
          dep.name.toLowerCase().includes(search.toLowerCase())
        )
      : [];
  }, [departments, search]);

  const pagedDepartments = useMemo(() => {
    const start = (page - 1) * pageSize;
    return Array.isArray(filteredDepartments)
      ? filteredDepartments.slice(start, start + pageSize)
      : [];
  }, [filteredDepartments, page, pageSize]);

  return (
    <div className="flex flex-col gap-4 pt-0 pb-4 min-h-[calc(100vh-4rem)]">
      <Card className="w-full flex-1">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-xl font-bold">
            🏢 Quản lý phòng ban
          </CardTitle>
          <div className="flex gap-2">
            <Button
              variant="gradient"
              onClick={() => setShowRestoreModal(true)}
            >
              Danh sách phòng ban đã xóa
            </Button>
            <Button variant="add" onClick={() => setShowCreateModal(true)}>
              + Tạo phòng ban
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {alert && (
            <ServerResponseAlert
              type={alert.type}
              message={alert.message}
              onClose={() => setAlert(null)}
            />
          )}
          {isLoading ? (
            <div className="flex justify-center py-8">
              <LoadingSpinner size={32} />
            </div>
          ) : (
            <PaginatedTable
              enableSearch
              page={page}
              pageSize={pageSize}
              total={filteredDepartments.length}
              onPageChange={setPage}
              onFilterChange={({ search }) => {
                setSearch(search);
                setPage(1);
              }}
              pageSizeOptions={[5, 10, 20, 50]}
            >
              <DepartmentTable
                departments={pagedDepartments}
                expectedRowCount={pageSize}
                startIndex={(page - 1) * pageSize}
                onEdit={(dep) => {
                  setSelectedDepartment(dep);
                  setShowEditModal(true);
                }}
                onDelete={handleDeleteDepartment}
              />
            </PaginatedTable>
          )}
        </CardContent>
      </Card>
      <DepartmentCreateModal
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreated={fetchDepartments}
      />
      <EditDepartmentModal
        open={showEditModal}
        onClose={() => setShowEditModal(false)}
        department={selectedDepartment}
        onUpdated={fetchDepartments}
      />
      <RestoreDepartmentModal
        open={showRestoreModal}
        onClose={() => setShowRestoreModal(false)}
        onRestored={fetchDepartments}
      />
    </div>
  );
}