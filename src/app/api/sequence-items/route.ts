import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { randomUUID } from "crypto";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const sequenceId = searchParams.get("sequenceId");
  const id = searchParams.get("id");

  try {
    if (id) {
      const result = await db.execute({
        sql: `SELECT * FROM sequence_items WHERE id = ?`,
        args: [id],
      });

      if (result.rows.length === 0) {
        return NextResponse.json({ error: "Item not found" }, { status: 404 });
      }

      return NextResponse.json(result.rows[0]);
    }

    if (sequenceId) {
      const result = await db.execute({
        sql: `SELECT * FROM sequence_items WHERE sequence_id = ? ORDER BY display_order ASC`,
        args: [sequenceId],
      });

      return NextResponse.json(result.rows);
    }

    const result = await db.execute({
      sql: `SELECT * FROM sequence_items ORDER BY display_order ASC`,
    });

    return NextResponse.json(result.rows);
  } catch (error) {
    console.error("Error fetching sequence items:", error);
    return NextResponse.json({ error: "Failed to fetch sequence items" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sequenceId, itemType, content, duration, displayOrder, characterName } = body;

    if (!sequenceId || !itemType || !content) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    if (!["background", "character", "dialogue"].includes(itemType)) {
      return NextResponse.json({ error: "Invalid item type" }, { status: 400 });
    }

    const id = randomUUID();

    await db.execute({
      sql: `INSERT INTO sequence_items (id, sequence_id, item_type, content, duration, display_order, character_name) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      args: [id, sequenceId, itemType, content, duration || 3000, displayOrder || 0, characterName || null],
    });

    return NextResponse.json({
      id,
      sequence_id: sequenceId,
      item_type: itemType,
      content,
      duration: duration || 3000,
      display_order: displayOrder || 0,
      character_name: characterName || null,
    });
  } catch (error) {
    console.error("Error creating sequence item:", error);
    return NextResponse.json({ error: "Failed to create sequence item" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, content, duration, displayOrder, characterName } = body;

    if (!id) {
      return NextResponse.json({ error: "Missing item id" }, { status: 400 });
    }

    await db.execute({
      sql: `UPDATE sequence_items SET content = ?, duration = ?, display_order = ?, character_name = ? WHERE id = ?`,
      args: [content, duration, displayOrder, characterName || null, id],
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating sequence item:", error);
    return NextResponse.json({ error: "Failed to update sequence item" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "Missing item id" }, { status: 400 });
  }

  try {
    await db.execute({
      sql: `DELETE FROM sequence_items WHERE id = ?`,
      args: [id],
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting sequence item:", error);
    return NextResponse.json({ error: "Failed to delete sequence item" }, { status: 500 });
  }
}
