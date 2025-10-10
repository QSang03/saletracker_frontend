'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { X, Search, Users } from 'lucide-react'
import { getAccessToken } from '@/lib/auth'

interface Employee {
  id: number
  username: string
  fullName: string
  departmentName?: string
}

interface Department {
  id: number
  name: string
  employees: Employee[]
}

interface EmployeeFilterModalProps {
  isOpen: boolean
  onClose: () => void
  onApply: (employeeIds: number[], employees: {id: number, name: string}[]) => void
  selectedEmployeeIds: number[]
  isAdmin: boolean
  isManager: boolean
  isViewRole: boolean
  managedDepartments?: number[]
}

export function EmployeeFilterModal({
  isOpen,
  onClose,
  onApply,
  selectedEmployeeIds,
  isAdmin,
  isManager,
  isViewRole,
  managedDepartments = [],
}: EmployeeFilterModalProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [tempSelectedIds, setTempSelectedIds] = useState<number[]>(selectedEmployeeIds)
  const [departments, setDepartments] = useState<Department[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Fetch departments and employees
  useEffect(() => {
    if (!isOpen) return

    const fetchEmployees = async () => {
      setLoading(true)
      setError(null)

      try {
        const token = getAccessToken()
        if (!token) {
          throw new Error('No access token')
        }

        // Fetch departments with users - use filter-options endpoint like manager-order
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/orders/filter-options`,
          {
            headers: {
              'Authorization': `Bearer ${token}`,
            },
          }
        )

        if (!response.ok) {
          throw new Error('Failed to fetch filter options')
        }

        const data = await response.json()
        
        // data.departments has format: [{ value: number, label: string, users: [{ value: number, label: string }] }]
        let filteredDepartments = data.departments || []
        
        if (isManager && !isAdmin && !isViewRole && managedDepartments.length > 0) {
          // Manager (not Admin or View): chỉ hiển thị nhân viên trong phòng ban họ quản lý
          filteredDepartments = filteredDepartments.filter((dept: any) => 
            managedDepartments.includes(dept.value)
          )
        }
        // Admin và View: lấy tất cả departments (không filter)
        
        // Map to our interface
        const mappedDepartments: Department[] = filteredDepartments.map((dept: any) => ({
          id: dept.value,
          name: dept.label,
          employees: (dept.users || []).map((user: any) => ({
            id: user.value,
            username: user.label,
            fullName: user.label,
            departmentName: dept.label,
          })),
        }))

        setDepartments(mappedDepartments)
      } catch (err) {
        console.error('Error fetching employees:', err)
        setError('Không thể tải danh sách nhân viên')
      } finally {
        setLoading(false)
      }
    }

    fetchEmployees()
  }, [isOpen, isAdmin, isManager, isViewRole, managedDepartments])

  // Reset temp selection when modal opens
  useEffect(() => {
    if (isOpen) {
      setTempSelectedIds(selectedEmployeeIds)
    }
  }, [isOpen, selectedEmployeeIds])

  // Flatten all employees and deduplicate by ID (1 person can be in multiple departments)
  const allEmployees = useMemo(() => {
    const employeeMap = new Map<number, Employee>()
    departments.forEach(dept => {
      dept.employees.forEach(emp => {
        if (!employeeMap.has(emp.id)) {
          employeeMap.set(emp.id, emp)
        }
      })
    })
    return Array.from(employeeMap.values())
  }, [departments])

  // Filter employees by search term
  const filteredEmployees = useMemo(() => {
    if (!searchTerm.trim()) return allEmployees

    const term = searchTerm.toLowerCase()
    return allEmployees.filter(emp => 
      emp.fullName.toLowerCase().includes(term) ||
      emp.username.toLowerCase().includes(term) ||
      emp.departmentName?.toLowerCase().includes(term)
    )
  }, [allEmployees, searchTerm])

  const handleToggleEmployee = (employeeId: number) => {
    setTempSelectedIds(prev => {
      if (prev.includes(employeeId)) {
        return prev.filter(id => id !== employeeId)
      } else {
        return [...prev, employeeId]
      }
    })
  }

  const handleSelectAll = () => {
    setTempSelectedIds(allEmployees.map(emp => emp.id))
  }

  const handleDeselectAll = () => {
    setTempSelectedIds([])
  }

  const handleApply = () => {
    const selectedEmployeesList = allEmployees
      .filter(emp => tempSelectedIds.includes(emp.id))
      .map(emp => ({ id: emp.id, name: emp.fullName }))
    onApply(tempSelectedIds, selectedEmployeesList)
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-blue-600" />
            <h2 className="text-lg font-semibold">Chọn nhân viên</h2>
            {tempSelectedIds.length > 0 && (
              <span className="text-sm text-gray-500">
                ({tempSelectedIds.length} đã chọn)
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search */}
        <div className="p-4 border-b">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Tìm kiếm nhân viên..."
              className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 px-4 py-2 border-b bg-gray-50">
          <button
            onClick={handleSelectAll}
            className="text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            Chọn tất cả
          </button>
          <span className="text-gray-300">|</span>
          <button
            onClick={handleDeselectAll}
            className="text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            Bỏ chọn tất cả
          </button>
        </div>

        {/* Employee list */}
        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-gray-500">Đang tải...</div>
            </div>
          ) : error ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-red-500">{error}</div>
            </div>
          ) : filteredEmployees.length === 0 ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-gray-500">Không tìm thấy nhân viên</div>
            </div>
          ) : (
            <div className="space-y-2">
              {departments.map(dept => {
                const deptEmployees = filteredEmployees.filter(
                  emp => emp.departmentName === dept.name
                )
                
                if (deptEmployees.length === 0) return null

                return (
                  <div key={dept.id} className="mb-4">
                    <div className="font-medium text-sm text-gray-700 mb-2 flex items-center gap-2">
                      <Users className="w-4 h-4" />
                      {dept.name}
                      <span className="text-xs text-gray-500">
                        ({deptEmployees.length})
                      </span>
                    </div>
                    <div className="space-y-1 ml-6">
                      {deptEmployees.map(employee => {
                        const isSelected = tempSelectedIds.includes(employee.id)
                        return (
                          <label
                            key={employee.id}
                            className={`flex items-center gap-3 p-2 rounded cursor-pointer transition-colors ${
                              isSelected
                                ? 'bg-blue-50 border border-blue-200'
                                : 'hover:bg-gray-50 border border-transparent'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => handleToggleEmployee(employee.id)}
                              className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                            />
                            <div className="flex-1 min-w-0">
                              <div className="font-medium text-sm truncate">
                                {employee.fullName}
                              </div>
                              <div className="text-xs text-gray-500 truncate">
                                {employee.username}
                              </div>
                            </div>
                          </label>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 p-4 border-t bg-gray-50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          >
            Hủy
          </button>
          <button
            onClick={handleApply}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Áp dụng
          </button>
        </div>
      </div>
    </div>
  )
}

