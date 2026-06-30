import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { randomUUID } from "crypto";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const chapterItemId = searchParams.get("chapterItemId");
  const id = searchParams.get("id");

  try {
    if (id) {
      const result = await db.execute({
        sql: `SELECT ds.*, 
              COALESCE(
                json_group_array(
                  json_object(
                    'id', si.id,
                    'item_type', si.item_type,
                    'content', si.content,
                    'duration', si.duration,
                    'display_order', si.display_order,
                    'character_name', si.character_name
                  )
                ), '[]'
              ) as items
              FROM dialogue_sequences ds
              LEFT JOIN sequence_items si ON ds.id = si.sequence_id
              WHERE ds.id = ?
              GROUP BY ds.id`,
        args: [id],
      });

      if (result.rows.length === 0) {
        return NextResponse.json({ error: "Sequence not found" }, { status: 404 });
      }

      const row = result.rows[0];
      const sequence = {
        ...row,
        items: JSON.parse(row.items as string || "[]").sort((a: any, b: any) => a.display_order - b.display_order),
      };

      return NextResponse.json(sequence);
    }

    if (chapterItemId) {
      const result = await db.execute({
        sql: `SELECT ds.*, 
              COALESCE(
                json_group_array(
                  json_object(
                    'id', si.id,
                    'item_type', si.item_type,
                    'content', si.content,
                    'duration', si.duration,
                    'display_order', si.display_order,
                    'character_name', si.character_name
                  )
                ), '[]'
              ) as items
              FROM dialogue_sequences ds
              LEFT JOIN sequence_items si ON ds.id = si.sequence_id
              WHERE ds.chapter_item_id = ?
              GROUP BY ds.id`,
        args: [chapterItemId],
      });

      const sequences = result.rows.map((row) => ({
        ...row,
        items: JSON.parse(row.items as string || "[]").sort((a: any, b: any) => a.display_order - b.display_order),
      }));

      return NextResponse.json(sequences);
    }

    const result = await db.execute({
      sql: `SELECT ds.*, 
            COALESCE(
              json_group_array(
                json_object(
                  'id', si.id,
                  'item_type', si.item_type,
                  'content', si.content,
                  'duration', si.duration,
                  'display_order', si.display_order,
                  'character_name', si.character_name
                )
              ), '[]'
            ) as items
            FROM dialogue_sequences ds
            LEFT JOIN sequence_items si ON ds.id = si.sequence_id
            GROUP BY ds.id`,
    });

    const sequences = result.rows.map((row) => ({
      ...row,
      items: JSON.parse(row.items as string || "[]").sort((a: any, b: any) => a.display_order - b.display_order),
    }));

    return NextResponse.json(sequences);
  } catch (error) {
    console.error("Error fetching sequences:", error);
    return NextResponse.json({ error: "Failed to fetch sequences" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const chapterItemId = formData.get("chapterItemId") as string;
    const title = formData.get("title") as string;
    const description = formData.get("description") as string | null;

    if (!chapterItemId || !title) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const id = randomUUID();

    await db.execute({
      sql: `INSERT INTO dialogue_sequences (id, chapter_item_id, title, description) VALUES (?, ?, ?, ?)`,
      args: [id, chapterItemId, title, description || null],
    });

    return NextResponse.json({ id, chapterItemId, title, description, items: [] });
  } catch (error) {
    console.error("Error creating sequence:", error);
    return NextResponse.json({ error: "Failed to create sequence" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const formData = await request.formData();
    const id = formData.get("id") as string;
    const title = formData.get("title") as string;
    const description = formData.get("description") as string | null;

    if (!id) {
      return NextResponse.json({ error: "Missing sequence id" }, { status: 400 });
    }

    await db.execute({
      sql: `UPDATE dialogue_sequences SET title = ?, description = ?, updated_at = strftime('%s', 'now') WHERE id = ?`,
      args: [title, description || null, id],
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating sequence:", error);
    return NextResponse.json({ error: "Failed to update sequence" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "Missing sequence id" }, { status: 400 });
  }

  try {
    await db.execute({
      sql: `DELETE FROM dialogue_sequences WHERE id = ?`,
      args: [id],
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting sequence:", error);
    return NextResponse.json({ error: "Failed to delete sequence" }, { status: 500 });
  }
}
