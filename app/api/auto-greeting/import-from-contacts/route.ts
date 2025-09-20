import { NextRequest, NextResponse } from 'next/server';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export async function POST(request: NextRequest) {
  try {
    // Get authorization header from the incoming request
    const authHeader = request.headers.get('authorization');
    const body = await request.json();
    const userId = body.userId;
    
    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    // Gọi trực tiếp API greeting-contacts từ frontend
    const CONTACTS_API_BASE_URL = process.env.NEXT_PUBLIC_CONTACTS_API_URL || 'http://192.168.117.224:5555';
    const contactsUrl = `${CONTACTS_API_BASE_URL}/greeting-contacts?page=1&limit=1000&user_id=${userId}`;
    
    
    const headers: any = {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      'X-Master-Key': process.env.NEXT_PUBLIC_MASTER_KEY || 'nkcai',
    };
    
    
    // Tạo timeout promise
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Request timeout after 15 seconds')), 15000);
    });
    
    // Tạo fetch promise
    const fetchPromise = fetch(contactsUrl, {
      headers,
    });
    
    // Race between fetch and timeout
    const contactsResponse = await Promise.race([fetchPromise, timeoutPromise]) as Response;

    if (!contactsResponse.ok) {
      console.error('Greeting-contacts API response not ok:', contactsResponse.status, contactsResponse.statusText);
      
      // Bắt các lỗi cụ thể từ API
      if (contactsResponse.status === 401 || contactsResponse.status === 403) {
        throw new Error('Tài khoản chưa được liên kết với Zalo hoặc không có quyền truy cập');
      } else if (contactsResponse.status === 404) {
        throw new Error('Không tìm thấy tài khoản Zalo hoặc danh bạ trống');
      } else if (contactsResponse.status >= 500) {
        throw new Error('Lỗi server từ API Zalo. Vui lòng thử lại sau');
      } else {
        throw new Error(`Lỗi API Zalo: ${contactsResponse.status} ${contactsResponse.statusText}`);
      }
    }

    const contactsData = await contactsResponse.json();

    if (!contactsData.success || !contactsData.data) {
      throw new Error('Dữ liệu từ API Zalo không hợp lệ');
    }

    const contacts = contactsData.data;
    if (!contacts || contacts.length === 0) {
      return NextResponse.json(
        { error: 'Không tìm thấy danh bạ nào trong tài khoản Zalo' },
        { status: 404 }
      );
    }

    // No need to filter User_ patterns since greeting-contacts already provides filtered data
    const filteredContacts = contacts;


    // Lấy danh sách khách hàng đã có trong hệ thống để ưu tiên trạng thái isActive
    const existingCustomersResponse = await fetch(`${API_BASE_URL}/auto-greeting/customers?userId=${userId}`, {
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        ...(authHeader && { 'Authorization': authHeader }),
      },
    });
    
    let existingCustomersMap = new Map();
    if (existingCustomersResponse.ok) {
      const existingCustomersData = await existingCustomersResponse.json();
      if (existingCustomersData && existingCustomersData.length > 0) {
        existingCustomersData.forEach((customer: any) => {
          if (customer.zaloDisplayName) {
            existingCustomersMap.set(customer.zaloDisplayName.toLowerCase().trim(), customer.isActive);
          }
        });
      }
    }
    

    // Tạo Excel file từ contacts data
    const ExcelJS = require('exceljs');
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Danh sách khách hàng từ danh bạ');

    // Định nghĩa cột (không có header tự động) - thêm cột ẩn zalo_id và cột Trạng thái
    worksheet.columns = [
      { key: 'name', width: 30 },
      { key: 'salutation', width: 20 },
      { key: 'greeting', width: 50 },
      { key: 'isActive', width: 15 }, // Cột Trạng thái
      { key: 'zalo_id', width: 0, hidden: true }, // Cột ẩn chứa zalo_conversation_id
    ];

    // Title row với styling đẹp - chỉ style cho 3 cột đầu
    const titleRow = worksheet.addRow(['DANH SÁCH KHÁCH HÀNG TỪ DANH BẠ ZALO']);
    const titleCell = titleRow.getCell(1); // Get cell A1
    titleCell.font = { name: 'Arial', size: 18, bold: true, color: { argb: 'FFFFFF' } };
    titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '2F75B5' } }; // Xanh dương đậm
    titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
    titleRow.height = 35;
    titleCell.border = {
      top: { style: 'medium', color: { argb: '1F4E78' } },
      left: { style: 'medium', color: { argb: '1F4E78' } },
      bottom: { style: 'medium', color: { argb: '1F4E78' } },
      right: { style: 'medium', color: { argb: '1F4E78' } }
    };
    worksheet.mergeCells(`A${titleRow.number}:D${titleRow.number}`);

    // Date row với styling nhẹ nhàng - chỉ style cho 3 cột đầu
    const now = new Date();
    const dateTimeString = `Ngày xuất: ${now.toLocaleDateString('vi-VN')} ${now.toLocaleTimeString('vi-VN')}`;
    const dateRow = worksheet.addRow([dateTimeString]);
    const dateCell = dateRow.getCell(1); // Get cell A1 (which is A2 in the sheet)
    dateCell.font = { name: 'Arial', size: 11, color: { argb: '404040' } };
    dateCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'F2F2F2' } }; // Xám nhạt
    dateCell.alignment = { horizontal: 'center', vertical: 'middle' }; // Changed to center
    dateRow.height = 25;
    dateCell.border = {
      top: { style: 'thin', color: { argb: 'D9D9D9' } },
      left: { style: 'thin', color: { argb: 'D9D9D9' } },
      bottom: { style: 'thin', color: { argb: 'D9D9D9' } },
      right: { style: 'thin', color: { argb: 'D9D9D9' } }
    };
    worksheet.mergeCells(`A${dateRow.number}:D${dateRow.number}`);

    // Dòng trống
    worksheet.addRow([]);

    // Header row - bao gồm cột ẩn zalo_id
    const headerRow = worksheet.addRow(['Tên hiển thị Zalo', 'Xưng hô', 'Tin nhắn chào', 'Trạng thái', 'Zalo ID']);
    
    // Style cho 4 cột hiển thị đầu tiên (A, B, C, D), cột E (zalo_id) sẽ ẩn
    for (let col = 1; col <= 4; col++) {
      const cell = headerRow.getCell(col);
      cell.font = { name: 'Arial', size: 12, bold: true, color: { argb: 'FFFFFF' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '4472C4' } };
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
      cell.border = {
        top: { style: 'thin', color: { argb: '000000' } },
        left: { style: 'thin', color: { argb: '000000' } },
        bottom: { style: 'thin', color: { argb: '000000' } },
        right: { style: 'thin', color: { argb: '000000' } }
      };
    }

    // Thêm dữ liệu
    filteredContacts.forEach((contact: any, index: number) => {
      const displayName = contact.display_name || 'Chưa có tên';
      const normalizedName = displayName.toLowerCase().trim();
      
      // Ưu tiên trạng thái từ hệ thống (không dùng contact_is_active từ API)
      let isActiveStatus = '';
      const systemIsActive = existingCustomersMap.get(normalizedName);
      if (systemIsActive !== undefined) {
        // Ưu tiên: Trạng thái từ hệ thống
        isActiveStatus = systemIsActive === 1 ? 'Kích hoạt' : 'Chưa kích hoạt';
      }
      // Không dùng contact_is_active từ API vì đó là trạng thái khác
      // Nếu không có trong hệ thống, isActiveStatus sẽ là chuỗi rỗng ''
      
      
      // Tạo row với dữ liệu bao gồm zalo_conversation_id
      const rowData = [
        displayName,
        '',
        '',
        isActiveStatus, // Cột Trạng thái - ưu tiên hệ thống
        contact.zalo_conversation_id || '' // Thêm zalo_id vào cột ẩn
      ];
      const excelRow = worksheet.addRow(rowData);
      
      // Style cho 4 cột hiển thị đầu tiên (A, B, C, D)
      for (let col = 1; col <= 4; col++) {
        const cell = excelRow.getCell(col);
        cell.font = { name: 'Arial', size: 10 };
        cell.alignment = { vertical: 'middle', horizontal: 'left', wrapText: true };
        cell.border = {
          top: { style: 'thin', color: { argb: 'D3D3D3' } },
          left: { style: 'thin', color: { argb: 'D3D3D3' } },
          bottom: { style: 'thin', color: { argb: 'D3D3D3' } },
          right: { style: 'thin', color: { argb: 'D3D3D3' } }
        };
        
        // Alternating row colors
        if (index % 2 === 0) {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'F2F2F2' } };
        } else {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFF' } };
        }
      }
      
      excelRow.height = 20;
    });

    // Footer row với styling đẹp
    const footerRow = worksheet.addRow([`Tổng số khách hàng: ${filteredContacts.length}`]);
    const footerCell = footerRow.getCell(1); // Get cell A1 của footer row
    footerCell.font = { name: 'Arial', size: 12, bold: true, color: { argb: '2F75B5' } }; // Màu xanh dương
    footerCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'D9E1F2' } }; // Nền xanh nhạt
    footerCell.alignment = { horizontal: 'center', vertical: 'middle' };
    footerRow.height = 25; // Tăng chiều cao
    footerCell.border = {
      top: { style: 'thin', color: { argb: 'A6A6A6' } },
      left: { style: 'thin', color: { argb: 'A6A6A6' } },
      bottom: { style: 'thin', color: { argb: 'A6A6A6' } },
      right: { style: 'thin', color: { argb: 'A6A6A6' } }
    };
    worksheet.mergeCells(`A${worksheet.rowCount}:D${worksheet.rowCount}`);

    // Auto-fit columns
    worksheet.columns.forEach((column: any) => {
      if (column.width) {
        column.width = Math.max(column.width, 15);
      }
    });

    // Freeze panes
    worksheet.views = [{ state: 'frozen', ySplit: 4 }];

    const buffer = await workbook.xlsx.writeBuffer();
    const filename = `danh-sach-khach-hang-tu-danh-ba-${new Date().toISOString().split('T')[0]}.xlsx`;

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': buffer.byteLength.toString(),
      },
    });
  } catch (error) {
    console.error('Error importing from contacts:', error);
    
    // Bắt các lỗi cụ thể
    let errorMessage = 'Đã xảy ra lỗi không xác định';
    
    if (error instanceof Error) {
      if (error.message.includes('Request timeout after 15 seconds')) {
        errorMessage = 'Kết nối đến server Zalo bị timeout. Vui lòng thử lại sau.';
      } else if (error.name === 'AbortError' || error.message.includes('aborted')) {
        errorMessage = 'Kết nối đến server Zalo bị timeout. Vui lòng thử lại sau.';
      } else if (error.message.includes('Connect Timeout') || error.message.includes('timeout')) {
        errorMessage = 'Kết nối đến server Zalo bị timeout. Vui lòng thử lại sau.';
      } else if (error.message.includes('fetch failed') || error.message.includes('ECONNREFUSED')) {
        errorMessage = 'Không thể kết nối đến server Zalo. Vui lòng kiểm tra kết nối mạng hoặc liên hệ admin.';
      } else if (error.message.includes('ENOTFOUND') || error.message.includes('DNS')) {
        errorMessage = 'Không tìm thấy server Zalo. Vui lòng kiểm tra cấu hình mạng.';
      } else {
        errorMessage = error.message;
      }
    }
    
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
