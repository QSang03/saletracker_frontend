import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState, useEffect } from "react";
import { MultiSelectCombobox } from "@/components/ui/MultiSelectCombobox";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";
import { getAccessToken } from "@/lib/auth";
import { ServerResponseAlert } from "@/components/ui/loading/ServerResponseAlert";

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

export default function EditDebtConfigModal({
	open,
	onClose,
	debtConfigId,
	onSave,
	onShowAlert,
}: {
	open: boolean;
	onClose: () => void;
	debtConfigId: string | null;
	onSave?: (result: boolean) => void;
	onShowAlert?: (alert: { type: 'success' | 'error'; message: string }) => void;
}) {
	const [customerCode, setCustomerCode] = useState("");
	const [customerName, setCustomerName] = useState("");
	const [customerType, setCustomerType] = useState("cash");
	const [schedule, setSchedule] = useState<number[] | string>("");
	const [showConfirm, setShowConfirm] = useState(false);
	const [loading, setLoading] = useState(false);
	const [alert, setAlert] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

	useEffect(() => {
		if (open && debtConfigId) {
			setLoading(true);
			const token = getAccessToken();
			fetch(`${process.env.NEXT_PUBLIC_API_URL || ""}/debt-configs/${debtConfigId}`, {
				headers: {
					"Content-Type": "application/json",
					Authorization: token ? `Bearer ${token}` : "",
				},
			})
				.then(res => res.json())
				.then(data => {
					setCustomerCode(data.customer_code || "");
					setCustomerName(data.customer_name || "");
					setCustomerType(data.customer_type || "cash");
					if (data.customer_type === "fixed") {
						setSchedule(Array.isArray(data.day_of_week) ? data.day_of_week : []);
					} else {
						setSchedule(data.gap_day !== null && data.gap_day !== undefined ? String(data.gap_day) : "");
					}
				})
				.finally(() => setLoading(false));
		}
	}, [open, debtConfigId]);

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
				data.gap_day = gap >= 0 ? gap : null;
				data.day_of_week = null;
			}
			const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || ""}/debt-configs/${debtConfigId}`, {
				method: "PATCH",
				headers: {
					"Content-Type": "application/json",
					Authorization: token ? `Bearer ${token}` : "",
				},
				body: JSON.stringify(data),
			});
			if (res.ok) {
				if (onShowAlert) onShowAlert({ type: 'success', message: 'Cập nhật cấu hình công nợ thành công!' });
				else setAlert({ type: 'success', message: 'Cập nhật cấu hình công nợ thành công!' });
				if (onSave) onSave(true);
				onClose(); // Đóng modal sau khi cập nhật thành công
			} else {
				const errorText = await res.text();
				if (onShowAlert) onShowAlert({ type: 'error', message: 'Cập nhật cấu hình công nợ thất bại!' });
				else setAlert({ type: 'error', message: 'Cập nhật cấu hình công nợ thất bại!' });
				if (onSave) onSave(false);
			}
		} catch (error) {
			console.error("EditDebtConfigModal - Exception:", error);
			if (onShowAlert) onShowAlert({ type: 'error', message: 'Cập nhật cấu hình công nợ thất bại!' });
			else setAlert({ type: 'error', message: 'Cập nhật cấu hình công nợ thất bại!' });
			if (onSave) onSave(false);
		}
	};

	const handleCancel = () => {
		setShowConfirm(false);
	};

	return (
		<Dialog open={open} onOpenChange={onClose}>
			<DialogContent className="max-w-md">
				<DialogHeader>
					<DialogTitle>Sửa Cấu Hình Công Nợ</DialogTitle>
				</DialogHeader>
				{loading ? (
					<div className="py-8 text-center">Đang tải dữ liệu...</div>
				) : (
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
									placeholder="Nhập lịch thanh toán (0 = Nhắc Mỗi Ngày, 1-10 = Cách X ngày)"
									value={typeof schedule === "string" ? schedule : ""}
									onChange={e => setSchedule(e.target.value)}
									min={0}
									max={MAX_GAP_DAY}
								/>
							)}
						</div>
					</div>
				)}
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
					title="Xác nhận sửa cấu hình công nợ"
					message="Bạn có chắc chắn muốn lưu thay đổi này?"
					onConfirm={handleConfirm}
					onCancel={handleCancel}
				/>
				{alert && (
					<ServerResponseAlert
						type={alert.type}
						message={alert.message}
						onClose={() => setAlert(null)}
					/>
				)}
			</DialogContent>
		</Dialog>
	);
}
