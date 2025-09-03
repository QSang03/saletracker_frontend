import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId } = await params;
    
    // Thay vì trả về 404, redirect đến một fallback avatar hoặc trả về JSON response
    // Có thể sử dụng một service như DiceBear để tạo avatar dựa trên userId
    const fallbackAvatarUrl = `https://api.dicebear.com/7.x/initials/svg?seed=${userId}&backgroundColor=4f46e5&textColor=ffffff`;
    
    // Redirect đến fallback avatar với encoding đúng
    const response = NextResponse.redirect(fallbackAvatarUrl);
    response.headers.set('Content-Type', 'image/svg+xml; charset=utf-8');
    return response;
    
    // Hoặc nếu muốn trả về JSON response:
    // return NextResponse.json({ 
    //   avatarUrl: fallbackAvatarUrl,
    //   userId: userId 
    // }, {
    //   headers: {
    //     'Content-Type': 'application/json; charset=utf-8'
    //   }
    // });
    
  } catch (error) {
    console.error('Avatar API error:', error);
    return NextResponse.json({ error: 'Failed to generate avatar' }, { status: 500 });
  }
}
