import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState, useEffect } from "react";
import { MultiSelectCombobox } from "@/components/ui/MultiSelectCombobox";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";
import { getAccessToken } from "@/lib/auth";

const CUSTOMER_TYPES = [
	{ label: "Cố Định", value: "fixed" },
	{ label: "Không Cố Định", value: "non-fixed" },
	{ label: "Tiền Mặt", value: "cash" },
];

const WEEKDAYS = [
	{ label: "Thứ 2", value: 2 },
	{ label: "Thứ 3", value: 3 },
	{ label: "Thứ 4", value: 4 },
	{ label: "Thứ 5", value: 5 },
	{ label: "Thứ 6", value: 6 },
	{ label: "Thứ 7", value: 7 },
];

const MAX_GAP_DAY = 10;

export default function AddManualDebtModal({
	open,
	onClose,
	onSave,
}: {
	open: boolean;
	onClose: () => void;
	onSave?: (result: boolean) => void;
}) {
	const [customerCode, setCustomerCode] = useState("");
	const [customerName, setCustomerName] = useState("");
	const [customerType, setCustomerType] = useState("cash");
	const [schedule, setSchedule] = useState<number[] | string>("");
	const [showConfirm, setShowConfirm] = useState(false);

	const handleSaveClick = () => {
		setShowConfirm(true);
	};

	const handleConfirm = async () => {
		setShowConfirm(false);
		const data: any = {
			customer_code: customerCode,
			customer_name: customerName,
			customer_type: customerType,
		};
		try {
			const token = getAccessToken();
			if (customerType === "fixed") {
				const days = Array.isArray(schedule) ? schedule.slice().sort((a, b) => a - b) : [];
				data.day_of_week = days;
				data.gap_day = null;
			} else {
				const gap = Math.min(Number(schedule) || 0, MAX_GAP_DAY);
				data.gap_day = gap > 0 ? gap : null;
				data.day_of_week = null;
			}
			const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || ""}/debt-configs`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Authorization: token ? `Bearer ${token}` : "",
				},
				body: JSON.stringify(data),
			});
			if (res.ok) {
				if (onSave) onSave(true);
			} else {
				const error = await res.json().catch(() => ({}));
				console.error("Lỗi tạo debt_configs:", error);
				if (onSave) onSave(false);
			}
		} catch {
			if (onSave) onSave(false);
		}
	};

	const handleCancel = () => {
		setShowConfirm(false);
	};

	useEffect(() => {
		if (open) {
			setCustomerCode("");
			setCustomerName("");
			setCustomerType("cash");
			setSchedule("");
		}
	}, [open]);

	return (
		<Dialog open={open} onOpenChange={onClose}>
			<DialogContent className="max-w-md">
				<DialogHeader>
					<DialogTitle>Thêm Công Nợ Thủ Công</DialogTitle>
				</DialogHeader>
				<div className="space-y-4 mt-2">
					<div>
						<label className="block mb-1 font-medium">Mã Khách Hàng</label>
						<Input
							placeholder="Nhập mã khách hàng"
							value={customerCode}
							onChange={(e) => setCustomerCode(e.target.value)}
						/>
					</div>
					<div>
						<label className="block mb-1 font-medium">Tên Zalo Khách Hàng (chính xác)</label>
						<Input
							placeholder="Nhập tên Zalo khách hàng"
							value={customerName}
							onChange={e => setCustomerName(e.target.value)}
						/>
					</div>
					<div>
						<label className="block mb-1 font-medium">Loại Khách Hàng</label>
						<Select value={customerType} onValueChange={setCustomerType}>
							<SelectTrigger className="w-full">
								<SelectValue placeholder="Chọn loại khách hàng" />
							</SelectTrigger>
							<SelectContent>
								{CUSTOMER_TYPES.map((opt) => (
									<SelectItem key={opt.value} value={opt.value}>
										{opt.label}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>
					<div>
						<label className="block mb-1 font-medium">Lịch Thanh Toán</label>
						{customerType === "fixed" ? (
							<MultiSelectCombobox
								options={WEEKDAYS}
								value={Array.isArray(schedule) ? schedule : []}
								onChange={(val) => setSchedule(val as number[])}
								placeholder="Chọn các thứ trong tuần"
							/>
						) : (
							<Input
								type="number"
								placeholder="Nhập lịch thanh toán (số ngày, tối đa 10)"
								value={typeof schedule === "string" ? schedule : ""}
								onChange={e => setSchedule(e.target.value)}
								max={MAX_GAP_DAY}
							/>
						)}
					</div>
				</div>
				<div className="flex justify-end gap-2 mt-6">
					<Button variant="outline" onClick={onClose}>
						Hủy
					</Button>
					<Button variant="gradient" onClick={handleSaveClick}>
						Lưu
					</Button>
				</div>
				<ConfirmDialog
					isOpen={showConfirm}
					title="Xác nhận thêm công nợ thủ công"
					message="Bạn có chắc chắn muốn thêm công nợ này?"
					onConfirm={handleConfirm}
					onCancel={handleCancel}
				/>
			</DialogContent>
		</Dialog>
	);
}

