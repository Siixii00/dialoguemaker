import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { uploadToCatbox } from '@/lib/catbox';
import { randomUUID } from 'crypto';

export async function GET() {
  try {
    const result = await db.execute('SELECT * FROM dialogues ORDER BY updated_at DESC');
    return NextResponse.json(result.rows);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch dialogues' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const characterName = formData.get('characterName') as string;
    const dialogueText = formData.get('dialogueText') as string;
    const characterImageFile = formData.get('characterImage') as File | null;
    const backgroundImageFile = formData.get('backgroundImage') as File | null;

    let characterImageUrl = formData.get('characterImageUrl') as string | null;
    let backgroundImageUrl = formData.get('backgroundImageUrl') as string | null;

    if (characterImageFile && characterImageFile.size > 0) {
      characterImageUrl = await uploadToCatbox(characterImageFile);
    }

    if (backgroundImageFile && backgroundImageFile.size > 0) {
      backgroundImageUrl = await uploadToCatbox(backgroundImageFile);
    }

    const id = randomUUID();
    const now = Math.floor(Date.now() / 1000);

    await db.execute({
      sql: 'INSERT INTO dialogues (id, character_name, dialogue_text, character_image, background_image, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
      args: [id, characterName, dialogueText, characterImageUrl || null, backgroundImageUrl || null, now, now],
    });

    return NextResponse.json({ id, characterName, dialogueText, characterImage: characterImageUrl, backgroundImage: backgroundImageUrl });
  } catch (error) {
    console.error('Error creating dialogue:', error);
    return NextResponse.json({ error: 'Failed to create dialogue' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const formData = await request.formData();
    const id = formData.get('id') as string;
    const characterName = formData.get('characterName') as string;
    const dialogueText = formData.get('dialogueText') as string;
    const characterImageFile = formData.get('characterImage') as File | null;
    const backgroundImageFile = formData.get('backgroundImage') as File | null;

    let characterImageUrl = formData.get('characterImageUrl') as string | null;
    let backgroundImageUrl = formData.get('backgroundImageUrl') as string | null;

    if (characterImageFile && characterImageFile.size > 0) {
      characterImageUrl = await uploadToCatbox(characterImageFile);
    }

    if (backgroundImageFile && backgroundImageFile.size > 0) {
      backgroundImageUrl = await uploadToCatbox(backgroundImageFile);
    }

    const now = Math.floor(Date.now() / 1000);

    await db.execute({
      sql: 'UPDATE dialogues SET character_name = ?, dialogue_text = ?, character_image = ?, background_image = ?, updated_at = ? WHERE id = ?',
      args: [characterName, dialogueText, characterImageUrl || null, backgroundImageUrl || null, now, id],
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating dialogue:', error);
    return NextResponse.json({ error: 'Failed to update dialogue' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Missing id parameter' }, { status: 400 });
    }

    await db.execute({
      sql: 'DELETE FROM dialogues WHERE id = ?',
      args: [id],
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete dialogue' }, { status: 500 });
  }
}