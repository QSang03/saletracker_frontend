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

    // Gọi trực tiếp API contacts từ frontend
    const CONTACTS_API_BASE_URL = process.env.NEXT_PUBLIC_CONTACTS_API_URL || 'http://192.168.117.19:5555';
    const contactsUrl = `${CONTACTS_API_BASE_URL}/contacts?page=1&limit=1000&user_id=${userId}`;
    
    console.log('Calling contacts API:', contactsUrl);
    console.log('Auth header:', authHeader ? 'Present' : 'Missing');
    console.log('Auth header value:', authHeader);
    
    // Thử với X-Master-Key như trong useOrders.ts
    const headers: any = {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      'X-Master-Key': process.env.NEXT_PUBLIC_MASTER_KEY || '',
    };
    
    console.log('Request headers:', headers);
    
    const contactsResponse = await fetch(contactsUrl, {
      headers,
    });

    if (!contactsResponse.ok) {
      console.error('Contacts API response not ok:', contactsResponse.status, contactsResponse.statusText);
      throw new Error(`Contacts API error: ${contactsResponse.status} ${contactsResponse.statusText}`);
    }

    const contactsData = await contactsResponse.json();
    console.log('Contacts data received:', contactsData);

    if (!contactsData.success || !contactsData.data) {
      throw new Error('Invalid contacts API response format');
    }

    const contacts = contactsData.data;
    if (!contacts || contacts.length === 0) {
      return NextResponse.json(
        { error: 'No contacts found' },
        { status: 404 }
      );
    }

    // Lọc bỏ những tên có cấu trúc User_ + số
    const filteredContacts = contacts.filter((contact: any) => {
      const displayName = contact.display_name || contact.name || '';
      // Bỏ qua nếu tên bắt đầu bằng "User_" và theo sau là số
      return !displayName.match(/^User_\d+$/);
    });

    console.log(`Filtered ${contacts.length - filteredContacts.length} contacts with User_ pattern`);
    console.log(`Remaining contacts: ${filteredContacts.length}`);

    // Tạo Excel file từ contacts data
    const ExcelJS = require('exceljs');
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Danh sách khách hàng từ danh bạ');

    // Định nghĩa cột (không có header tự động)
    worksheet.columns = [
      { key: 'name', width: 30 },
      { key: 'salutation', width: 20 },
      { key: 'greeting', width: 50 },
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
    worksheet.mergeCells(`A${titleRow.number}:C${titleRow.number}`);

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
    worksheet.mergeCells(`A${dateRow.number}:C${dateRow.number}`);

    // Dòng trống
    worksheet.addRow([]);

    // Header row
    const headerRow = worksheet.addRow(['Tên hiển thị Zalo', 'Xưng hô', 'Tin nhắn chào']);
    
    // Chỉ style cho 3 cột đầu tiên (A, B, C)
    for (let col = 1; col <= 3; col++) {
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
      // Tạo row với dữ liệu
      const rowData = [
        contact.display_name || contact.name || 'Chưa có tên',
        '',
        ''
      ];
      const excelRow = worksheet.addRow(rowData);
      
      // Chỉ style cho 3 cột đầu tiên (A, B, C)
      for (let col = 1; col <= 3; col++) {
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
    worksheet.mergeCells(`A${worksheet.rowCount}:C${worksheet.rowCount}`);

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
    return NextResponse.json(
      { error: 'Failed to import from contacts', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
