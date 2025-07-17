import React, { useState } from "react";

interface ChangePasswordProps {
  userId: number;
  token: string;
  passwordDefault: string;
  onSuccess?: () => void;
}

export const ChangePasswordModal: React.FC<ChangePasswordProps> = ({
  userId,
  token,
  passwordDefault,
  onSuccess,
}) => {
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess(false);
    if (!newPassword.trim() || !confirmPassword.trim()) {
      setError("Vui lòng nhập đầy đủ thông tin.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Mật khẩu nhập lại không khớp.");
      return;
    }
    if (newPassword.trim().length < 6) {
      setError("Mật khẩu phải có ít nhất 6 ký tự.");
      return;
    }
    setLoading(true);
    try {
      const requestBody = {
        currentPassword: passwordDefault,
        password: newPassword.trim(),
      };
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/users/${userId}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(requestBody),
        }
      );
      if (!res.ok) {
        const data = await res.json();
        setError(data.message || "Đổi mật khẩu thất bại.");
      } else {
        setSuccess(true);
        setNewPassword("");
        setConfirmPassword("");
        if (onSuccess) onSuccess();
      }
    } catch (err) {
      setError("Có lỗi xảy ra. Vui lòng thử lại.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl shadow-lg p-6 w-full max-w-sm mx-auto">
      <h2 className="text-lg font-bold mb-2 text-center">Đổi mật khẩu mới</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block mb-1 font-medium">Mật khẩu mới</label>
          <input
            type="password"
            className="w-full px-3 py-2 border rounded-lg"
            value={newPassword}
            onChange={e => setNewPassword(e.target.value)}
            autoFocus
            minLength={6}
            required
          />
        </div>
        <div>
          <label className="block mb-1 font-medium">Nhập lại mật khẩu mới</label>
          <input
            type="password"
            className="w-full px-3 py-2 border rounded-lg"
            value={confirmPassword}
            onChange={e => setConfirmPassword(e.target.value)}
            minLength={6}
            required
          />
        </div>
        {error && <div className="text-red-500 text-sm">{error}</div>}
        {success && <div className="text-green-600 text-sm">Đổi mật khẩu thành công!</div>}
        <button
          type="submit"
          className="w-full py-2 px-4 bg-gradient-to-r from-pink-500 to-indigo-500 text-white rounded-lg font-semibold hover:scale-[1.03] transition-all"
          disabled={loading}
        >
          {loading ? "Đang xử lý..." : "Đổi mật khẩu"}
        </button>
      </form>
    </div>
  );
};
