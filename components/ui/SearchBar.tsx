import { useState } from "react";

interface SearchBarProps {
  placeholder: string;
  onSearch: (term: string) => void;
}

export default function SearchBar({
  placeholder,
  onSearch
}: SearchBarProps) {
  const [searchTerm, setSearchTerm] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
    onSearch(e.target.value);
  };

  return (
    <div className="relative">
      <input
        type="text"
        placeholder={placeholder}
        value={searchTerm}
        onChange={handleChange}
        className="w-full p-2 pl-10 border rounded"
      />
      <div className="absolute left-3 top-2.5 text-gray-400">
        🔍
      </div>
    </div>
  );
}
