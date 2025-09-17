import { NextRequest, NextResponse } from 'next/server';
const ExcelJS = require('exceljs'); // Import here for Next.js API route

export async function GET(request: NextRequest) {
  try {
    // Tạo Excel file mẫu
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Mẫu danh sách khách hàng');

    // Định nghĩa cột (không có header tự động)
    worksheet.columns = [
      { key: 'name', width: 30 },
      { key: 'salutation', width: 20 },
      { key: 'greeting', width: 50 },
    ];

    // Title row với styling đẹp - chỉ style cho 3 cột đầu
    const titleRow = worksheet.addRow(['MẪU DANH SÁCH KHÁCH HÀNG']);
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
    const dateTimeString = `Ngày tạo: ${now.toLocaleDateString('vi-VN')} ${now.toLocaleTimeString('vi-VN')}`;
    const dateRow = worksheet.addRow([dateTimeString]);
    const dateCell = dateRow.getCell(1); // Get cell A1 (which is A2 in the sheet)
    dateCell.font = { name: 'Arial', size: 11, color: { argb: '404040' } };
    dateCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'F2F2F2' } }; // Xám nhạt
    dateCell.alignment = { horizontal: 'center', vertical: 'middle' };
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

    // Thêm dữ liệu mẫu
    const sampleData = [
      ['Nguyễn Văn A', 'Anh', 'Chào anh A! Chúc anh ngày mới vui vẻ!'],
      ['Trần Thị B', 'Chị', 'Chào chị B! Chúc chị ngày mới tràn đầy năng lượng!'],
      ['Lê Văn C', 'Anh', 'Chào anh C! Chúc anh ngày mới tốt lành!'],
    ];

    sampleData.forEach((rowData, index) => {
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
    const footerRow = worksheet.addRow([`Tổng số khách hàng: ${sampleData.length}`]);
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
    const filename = `mau-danh-sach-khach-hang-${new Date().toISOString().split('T')[0]}.xlsx`;

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': buffer.byteLength.toString(),
      },
    });
  } catch (error) {
    console.error('Error generating template:', error);
    return NextResponse.json(
      { error: 'Failed to generate template', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
