import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { randomUUID } from 'crypto';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const chapterId = searchParams.get('chapterId');

    if (chapterId) {
      const result = await db.execute({
        sql: 'SELECT * FROM chapter_items WHERE chapter_id = ? ORDER BY order_index ASC',
        args: [chapterId],
      });
      return NextResponse.json(result.rows);
    }

    const result = await db.execute('SELECT * FROM chapter_items ORDER BY order_index ASC');
    return NextResponse.json(result.rows);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch chapter items' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { chapterId, chapterNum, chapterTitle, chapterDesc, orderIndex } = body;

    const id = randomUUID();

    await db.execute({
      sql: 'INSERT INTO chapter_items (id, chapter_id, chapter_num, chapter_title, chapter_desc, order_index) VALUES (?, ?, ?, ?, ?, ?)',
      args: [id, chapterId, chapterNum || null, chapterTitle, chapterDesc || null, orderIndex || 0],
    });

    return NextResponse.json({ id, chapterId, chapterNum, chapterTitle, chapterDesc, orderIndex });
  } catch (error) {
    console.error('Error creating chapter item:', error);
    return NextResponse.json({ error: 'Failed to create chapter item' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Missing id parameter' }, { status: 400 });
    }

    await db.execute({ sql: 'DELETE FROM chapter_items WHERE id = ?', args: [id] });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete chapter item' }, { status: 500 });
  }
}