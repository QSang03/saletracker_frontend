"use client";
import React from "react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface SearchAndFilterControlsProps {
  searchTerm: string;
  setSearchTerm: (value: string) => void;
  statusFilter: string;
  setStatusFilter: (value: string) => void;
  conversationTypeFilter: string;
  setConversationTypeFilter: (value: string) => void;
  dateFilter: string;
  setDateFilter: (value: string) => void;
  itemsPerPage: number;
  handleItemsPerPageChange: (value: number) => void;
}

const SearchAndFilterControls: React.FC<SearchAndFilterControlsProps> = ({
  searchTerm,
  setSearchTerm,
  statusFilter,
  setStatusFilter,
  conversationTypeFilter,
  setConversationTypeFilter,
  dateFilter,
  setDateFilter,
  itemsPerPage,
  handleItemsPerPageChange,
}) => {
  return (
    <div className="bg-white rounded-lg shadow-sm border p-4 mb-4">
      <div className="flex flex-wrap gap-4 items-center">
        <Input 
          placeholder="Tìm kiếm..." 
          className="w-64"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Chọn trạng thái" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tất cả trạng thái</SelectItem>
            <SelectItem value="urgent">Cần báo gấp</SelectItem>
            <SelectItem value="reminder">Cần nhắc nhở</SelectItem>
            <SelectItem value="normal">Bình thường</SelectItem>
          </SelectContent>
        </Select>
        <Select value={conversationTypeFilter} onValueChange={setConversationTypeFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Chọn loại hội thoại" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tất cả loại</SelectItem>
            <SelectItem value="group">Nhóm</SelectItem>
            <SelectItem value="private">Cá nhân</SelectItem>
          </SelectContent>
        </Select>
        <Input 
          type="date" 
          className="w-48"
          value={dateFilter}
          onChange={(e) => setDateFilter(e.target.value)}
          placeholder="Lọc theo ngày"
        />
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-600">Dòng/trang</span>
          <Select value={itemsPerPage.toString()} onValueChange={(value) => handleItemsPerPageChange(parseInt(value))}>
            <SelectTrigger className="w-20">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="5">5</SelectItem>
              <SelectItem value="10">10</SelectItem>
              <SelectItem value="20">20</SelectItem>
              <SelectItem value="50">50</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
};

export default SearchAndFilterControls;

