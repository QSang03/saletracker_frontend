import React from 'react';

export const metadata = {
  title: 'Không tìm thấy',
};

export default function NotFoundPage() {
  return (
    <main style={{padding: 40, fontFamily: 'Inter, sans-serif', textAlign: 'center'}}>
      <h1 style={{fontSize: 36, marginBottom: 12}}>404 — Không tìm thấy trang</h1>
      <p style={{color: '#6b7280'}}>Xin lỗi, trang bạn yêu cầu không tồn tại hoặc đã bị di chuyển.</p>
    </main>
  );
}
