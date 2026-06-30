import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { uploadToCatbox } from '@/lib/catbox';
import { randomUUID } from 'crypto';

export async function GET() {
  try {
    const chaptersResult = await db.execute('SELECT * FROM chapters ORDER BY updated_at DESC');
    const itemsResult = await db.execute('SELECT * FROM chapter_items ORDER BY order_index ASC');
    
    const chapters = chaptersResult.rows.map(chapter => ({
      ...chapter,
      items: itemsResult.rows.filter(item => item.chapter_id === chapter.id),
    }));

    return NextResponse.json(chapters);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch chapters' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const pageTitle = formData.get('pageTitle') as string;
    const pageSubtitle = formData.get('pageSubtitle') as string;
    const backgroundImageFile = formData.get('backgroundImage') as File | null;

    let backgroundImageUrl = formData.get('backgroundImageUrl') as string | null;

    if (backgroundImageFile && backgroundImageFile.size > 0) {
      backgroundImageUrl = await uploadToCatbox(backgroundImageFile);
    }

    const id = randomUUID();
    const now = Math.floor(Date.now() / 1000);

    await db.execute({
      sql: 'INSERT INTO chapters (id, page_title, page_subtitle, background_image, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
      args: [id, pageTitle, pageSubtitle || null, backgroundImageUrl || null, now, now],
    });

    return NextResponse.json({ id, pageTitle, pageSubtitle, backgroundImage: backgroundImageUrl });
  } catch (error) {
    console.error('Error creating chapter:', error);
    return NextResponse.json({ error: 'Failed to create chapter' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Missing id parameter' }, { status: 400 });
    }

    await db.execute({ sql: 'DELETE FROM chapter_items WHERE chapter_id = ?', args: [id] });
    await db.execute({ sql: 'DELETE FROM chapters WHERE id = ?', args: [id] });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete chapter' }, { status: 500 });
  }
}