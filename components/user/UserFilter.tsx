import { Department } from '@/types';

interface UserFilterProps {
  departments: Department[];
  selectedDepartment: number | null;
  onSelectDepartment: (id: number | null) => void;
  onSearch: (term: string) => void;
  disabled?: boolean;
}

export default function UserFilter({
  departments,
  selectedDepartment,
  onSelectDepartment,
  onSearch,
  disabled = false
}: UserFilterProps) {
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onSearch(e.target.value);
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 w-full">
      <div>
        <label className="block mb-2">Lọc theo phòng ban</label>
        <select
          value={selectedDepartment || ''}
          onChange={e => onSelectDepartment(
            e.target.value ? Number(e.target.value) : null
          )}
          disabled={disabled}
          className="w-full p-2 border rounded"
        >
          <option value="">Tất cả phòng ban</option>
          {departments.map(dept => (
            <option key={dept.id} value={dept.id}>
              {dept.name}
            </option>
          ))}
        </select>
      </div>
      
      <div>
        <label className="block mb-2">Tìm kiếm</label>
        <input
          type="text"
          placeholder="Tìm theo tên hoặc email..."
          onChange={handleSearchChange}
          className="w-full p-2 border rounded"
        />
      </div>
    </div>
  );
}
