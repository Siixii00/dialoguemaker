"use client";

import { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  DndContext,
  DragOverlay,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
  DragOverEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

interface SequenceItem {
  id: string;
  sequence_id: string;
  item_type: "background" | "character" | "dialogue";
  content: string;
  duration: number;
  display_order: number;
  character_name: string | null;
}

interface Sequence {
  id: string;
  chapter_item_id: string;
  title: string;
  description: string | null;
  items: SequenceItem[];
}

interface PreviewState {
  background: string | null;
  character: string | null;
  characterName: string;
  dialogue: string;
}

function SortableItemCard({
  item,
  index,
  isSelected,
  onSelect,
  onDelete,
}: {
  item: SequenceItem;
  index: number;
  isSelected: boolean;
  onSelect: () => void;
  onDelete: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const itemTypeLabel = (type: string) => {
    switch (type) {
      case "background":
        return "場景底圖";
      case "character":
        return "人物立繪";
      case "dialogue":
        return "對話文字";
      default:
        return type;
    }
  };

  const itemTypeIcon = (type: string) => {
    switch (type) {
      case "background":
        return "landscape";
      case "character":
        return "person";
      case "dialogue":
        return "chat";
      default:
        return "layers";
    }
  };

  const itemTypeColor = (type: string) => {
    switch (type) {
      case "background":
        return "bg-emerald-500/20 border-emerald-500/50";
      case "character":
        return "bg-violet-500/20 border-violet-500/50";
      case "dialogue":
        return "bg-amber-500/20 border-amber-500/50";
      default:
        return "bg-slate-500/20 border-slate-500/50";
    }
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`rounded-xl p-4 cursor-pointer transition-all ${
        itemTypeColor(item.item_type)
      } ${isSelected ? "ring-2 ring-primary" : ""} ${
        isDragging ? "shadow-xl scale-105" : "hover:shadow-lg"
      }`}
      onClick={onSelect}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div
            {...attributes}
            {...listeners}
            className="text-muted hover:text-primary cursor-grab active:cursor-grabbing"
          >
            <span className="material-symbols-outlined">drag_indicator</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="bg-black/30 px-2 py-1 rounded text-xs font-display">
              {index + 1}
            </span>
            <span className="material-symbols-outlined text-primary">
              {itemTypeIcon(item.item_type)}
            </span>
          </div>
          <div className="flex flex-col">
            <span className="text-text-light text-sm font-display">
              {itemTypeLabel(item.item_type)}
            </span>
            {item.item_type === "dialogue" && (
              <span className="text-muted text-xs truncate max-w-[150px]">
                {item.content.substring(0, 30)}...
              </span>
            )}
            {item.item_type === "character" && item.character_name && (
              <span className="text-muted text-xs truncate">
                {item.character_name}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="bg-black/30 px-2 py-1 rounded text-xs font-display">
            {item.duration / 1000}s
          </span>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            className="text-muted hover:text-red-400 transition-colors"
          >
            <span className="material-symbols-outlined">delete</span>
          </button>
        </div>
      </div>
      {item.item_type !== "dialogue" && item.content && (
        <div className="mt-3 rounded overflow-hidden">
          <img
            src={item.content}
            className="w-full h-20 object-cover"
            alt="preview"
          />
        </div>
      )}
    </div>
  );
}

function NewElementCard({
  type,
  onDragStart,
}: {
  type: "background" | "character" | "dialogue";
  onDragStart: (type: "background" | "character" | "dialogue") => void;
}) {
  const itemTypeLabel = (type: string) => {
    switch (type) {
      case "background":
        return "場景底圖";
      case "character":
        return "人物立繪";
      case "dialogue":
        return "對話文字";
      default:
        return type;
    }
  };

  const itemTypeIcon = (type: string) => {
    switch (type) {
      case "background":
        return "landscape";
      case "character":
        return "person";
      case "dialogue":
        return "chat";
      default:
        return "layers";
    }
  };

  const itemTypeColor = (type: string) => {
    switch (type) {
      case "background":
        return "bg-emerald-600 hover:bg-emerald-500";
      case "character":
        return "bg-violet-600 hover:bg-violet-500";
      case "dialogue":
        return "bg-amber-600 hover:bg-amber-500";
      default:
        return "bg-slate-600 hover:bg-slate-500";
    }
  };

  return (
    <div
      draggable
      onDragStart={() => onDragStart(type)}
      className={`${itemTypeColor(type)} rounded-xl p-4 cursor-grab active:cursor-grabbing transition-all hover:scale-105 hover:shadow-xl flex items-center gap-3`}
    >
      <span className="material-symbols-outlined text-white text-2xl">
        {itemTypeIcon(type)}
      </span>
      <span className="text-white font-display">{itemTypeLabel(type)}</span>
    </div>
  );
}

export default function EditorPage() {
  const params = useParams();
  const router = useRouter();
  const sequenceId = params.id as string;

  const [sequence, setSequence] = useState<Sequence | null>(null);
  const [loading, setLoading] = useState(false);
  const [previewState, setPreviewState] = useState<PreviewState>({
    background: null,
    character: null,
    characterName: "",
    dialogue: "",
  });
  const [selectedItem, setSelectedItem] = useState<SequenceItem | null>(null);
  const [editingItem, setEditingItem] = useState<SequenceItem | null>(null);
  const [activeDragId, setActiveDragId] = useState<string | null>(null);
  const [activeDragType, setActiveDragType] = useState<
    "background" | "character" | "dialogue" | null
  >(null);

  const bgInputRef = useRef<HTMLInputElement>(null);
  const charInputRef = useRef<HTMLInputElement>(null);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    fetchSequence();
  }, [sequenceId]);

  const fetchSequence = async () => {
    try {
      const res = await fetch(`/api/sequences?id=${sequenceId}`);
      const data = await res.json();
      setSequence(data);
      updatePreview(data.items);
    } catch (error) {
      console.error("Failed to fetch sequence:", error);
    }
  };

  const updatePreview = (items: SequenceItem[]) => {
    const bg = items.find((item) => item.item_type === "background");
    const char = items.find((item) => item.item_type === "character");
    const dialogue = items.find((item) => item.item_type === "dialogue");

    setPreviewState({
      background: bg?.content || null,
      character: char?.content || null,
      characterName: char?.character_name || "",
      dialogue: dialogue?.content || "",
    });
  };

  const handleImageUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    type: "background" | "character"
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      const data = await res.json();

      if (type === "background") {
        setPreviewState((prev) => ({ ...prev, background: data.url }));
        if (editingItem?.item_type === "background") {
          setEditingItem((prev) => prev ? { ...prev, content: data.url } : null);
        }
      } else {
        setPreviewState((prev) => ({ ...prev, character: data.url }));
        if (editingItem?.item_type === "character") {
          setEditingItem((prev) => prev ? { ...prev, content: data.url } : null);
        }
      }
    } catch (error) {
      console.error("Upload error:", error);
    }
    setLoading(false);
  };

  const addItem = async (type: "background" | "character" | "dialogue") => {
    if (!sequence) return;

    try {
      const newItemData: any = {
        sequenceId: sequence.id,
        itemType: type,
        content: type === "dialogue" ? "新對話文字..." : "",
        duration: 3000,
        displayOrder: sequence.items.length,
      };

      if (type === "character") {
        newItemData.characterName = "角色名稱";
      }

      const res = await fetch("/api/sequence-items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newItemData),
      });

      const newItem = await res.json();
      setSequence((prev) =>
        prev ? { ...prev, items: [...prev.items, newItem] } : null
      );
      setEditingItem(newItem);
      setSelectedItem(newItem);
    } catch (error) {
      console.error("Error adding item:", error);
    }
  };

  const updateItem = async () => {
    if (!editingItem) return;

    try {
      await fetch("/api/sequence-items", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editingItem.id,
          content: editingItem.content,
          duration: editingItem.duration,
          displayOrder: editingItem.display_order,
          characterName: editingItem.character_name,
        }),
      });

      fetchSequence();
      setEditingItem(null);
    } catch (error) {
      console.error("Error updating item:", error);
    }
  };

  const deleteItem = async (itemId: string) => {
    try {
      await fetch(`/api/sequence-items?id=${itemId}`, { method: "DELETE" });
      fetchSequence();
      if (selectedItem?.id === itemId) setSelectedItem(null);
      if (editingItem?.id === itemId) setEditingItem(null);
    } catch (error) {
      console.error("Error deleting item:", error);
    }
  };

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    setActiveDragId(active.id as string);
    
    if (typeof active.id === "string" && active.id.startsWith("new-")) {
      const type = active.id.replace("new-", "") as "background" | "character" | "dialogue";
      setActiveDragType(type);
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveDragId(null);
    setActiveDragType(null);

    if (!over || !sequence) return;

    if (typeof active.id === "string" && active.id.startsWith("new-")) {
      const type = active.id.replace("new-", "") as "background" | "character" | "dialogue";
      await addItem(type);
      return;
    }

    if (active.id !== over.id) {
      const oldIndex = sequence.items.findIndex(
        (item) => item.id === active.id
      );
      const newIndex = sequence.items.findIndex(
        (item) => item.id === over.id
      );

      const newItems = arrayMove(sequence.items, oldIndex, newIndex);

      newItems.forEach((item, idx) => {
        item.display_order = idx;
      });

      setSequence((prev) => prev ? { ...prev, items: newItems } : null);

      try {
        for (const item of newItems) {
          await fetch("/api/sequence-items", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              id: item.id,
              content: item.content,
              duration: item.duration,
              displayOrder: item.display_order,
              characterName: item.character_name,
            }),
          });
        }
      } catch (error) {
        console.error("Error reordering:", error);
        fetchSequence();
      }
    }
  };

  const updateSequenceTitle = async (newTitle: string) => {
    if (!sequence) return;

    try {
      const formData = new FormData();
      formData.append("id", sequence.id);
      formData.append("title", newTitle);
      formData.append("description", sequence.description || "");

      await fetch("/api/sequences", { method: "PUT", body: formData });
      setSequence((prev) => prev ? { ...prev, title: newTitle } : null);
    } catch (error) {
      console.error("Error updating sequence:", error);
    }
  };

  if (!sequence) {
    return (
      <div className="bg-black text-text-light font-body h-screen flex items-center justify-center">
        <p className="text-muted">載入中...</p>
      </div>
    );
  }

  return (
    <div className="bg-black text-text-light font-body h-screen overflow-hidden relative flex">
      <div className="flex-1 relative overflow-hidden">
        <div
          className="absolute inset-0 bg-cover"
          style={{
            backgroundColor: "#1F252F",
            backgroundImage: previewState.background
              ? `url('${previewState.background}')`
              : "none",
          }}
        />

        <div
          className="absolute bottom-[200px] left-[5%] h-[400px] z-10 pointer-events-none transition-all duration-300"
          style={{
            opacity: previewState.character ? 1 : 0,
            transform: previewState.character
              ? "translateX(0)"
              : "translateX(-50px)",
          }}
        >
          {previewState.character && (
            <img
              className="h-full object-contain drop-shadow-2xl"
              src={previewState.character}
              alt="Character"
            />
          )}
        </div>

        <div className="absolute bottom-0 left-0 right-0 z-20 p-8">
          <div className="w-full max-w-[1000px] mx-auto relative pointer-events-auto">
            {previewState.characterName && (
              <div className="absolute -top-12 left-8 bg-primary z-30 px-6 py-3 shadow-lg">
                <h2 className="font-display font-bold text-text-dark text-xl">
                  {previewState.characterName}
                </h2>
              </div>
            )}

            <div className="relative bg-surface backdrop-blur-md border-t-2 border-primary shadow-2xl min-h-[240px] w-full flex flex-col p-10">
              <div className="flex-grow overflow-y-auto">
                <p className="text-xl text-text-light leading-relaxed font-body">
                  {previewState.dialogue || "對話文字將顯示在此..."}
                </p>
              </div>
              <div className="absolute bottom-8 right-10 animate-bounce">
                <svg className="w-8 h-8 diamond" viewBox="0 0 24 24">
                  <path d="M12 4L20 12L12 20L4 12L12 4Z" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        <button
          onClick={() => router.push(`/play/${sequenceId}`)}
          className="absolute top-4 right-4 z-50 edit-btn px-4 py-2 rounded-full font-display text-sm flex items-center gap-2"
        >
          <span className="material-symbols-outlined">play_circle</span>
          <span>預覽播放</span>
        </button>

        <button
          onClick={() => router.push("/chapters")}
          className="absolute top-4 left-4 z-50 text-muted hover:text-primary flex items-center gap-2 bg-black/40 backdrop-blur-sm rounded-full px-4 py-2 border border-white/10"
        >
          <span className="material-symbols-outlined">arrow_back</span>
          <span className="font-display text-sm uppercase">返回</span>
        </button>
      </div>

      <div className="w-[420px] h-full edit-panel overflow-y-auto z-50">
        <div className="p-6 space-y-6">
          <div className="flex justify-between border-b border-primary/20 pb-4">
            <h3 className="font-display text-xl text-primary">時間軸編輯器</h3>
          </div>

          <div className="space-y-2">
            <label className="font-display text-sm text-primary">序列名稱</label>
            <input
              type="text"
              value={sequence.title}
              onChange={(e) => updateSequenceTitle(e.target.value)}
              className="edit-input w-full px-4 py-2 rounded"
            />
          </div>

          <div className="border-t border-primary/20 pt-4">
            <h4 className="font-display text-sm text-primary mb-4">
              拖放新增元素
            </h4>
            <DndContext sensors={sensors} collisionDetection={closestCenter}>
              <div className="grid grid-cols-3 gap-3 mb-6">
                <div
                  draggable
                  onDragStart={() => setActiveDragType("background")}
                  className="bg-emerald-600 hover:bg-emerald-500 rounded-xl p-3 cursor-grab active:cursor-grabbing transition-all hover:scale-105 flex flex-col items-center gap-2"
                >
                  <span className="material-symbols-outlined text-white text-xl">
                    landscape
                  </span>
                  <span className="text-white text-xs font-display">場景</span>
                </div>
                <div
                  draggable
                  onDragStart={() => setActiveDragType("character")}
                  className="bg-violet-600 hover:bg-violet-500 rounded-xl p-3 cursor-grab active:cursor-grabbing transition-all hover:scale-105 flex flex-col items-center gap-2"
                >
                  <span className="material-symbols-outlined text-white text-xl">
                    person
                  </span>
                  <span className="text-white text-xs font-display">人物</span>
                </div>
                <div
                  draggable
                  onDragStart={() => setActiveDragType("dialogue")}
                  className="bg-amber-600 hover:bg-amber-500 rounded-xl p-3 cursor-grab active:cursor-grabbing transition-all hover:scale-105 flex flex-col items-center gap-2"
                >
                  <span className="material-symbols-outlined text-white text-xl">
                    chat
                  </span>
                  <span className="text-white text-xs font-display">對話</span>
                </div>
              </div>
            </DndContext>
          </div>

          <div className="border-t border-primary/20 pt-4">
            <h4 className="font-display text-sm text-primary mb-4">
              序列項目（拖放排序）
            </h4>

            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={sequence.items.map((item) => item.id)}
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-3 min-h-[100px]">
                  {sequence.items.length === 0 ? (
                    <div className="bg-surface/20 rounded-xl p-6 text-center border border-dashed border-primary/30">
                      <p className="text-muted text-sm mb-2">
                        尚未添加任何項目
                      </p>
                      <p className="text-muted/50 text-xs">
                        拖放上方元素卡片到此處
                      </p>
                    </div>
                  ) : (
                    sequence.items.map((item, index) => (
                      <SortableItemCard
                        key={item.id}
                        item={item}
                        index={index}
                        isSelected={selectedItem?.id === item.id}
                        onSelect={() => {
                          setSelectedItem(item);
                          setEditingItem(item);
                        }}
                        onDelete={() => deleteItem(item.id)}
                      />
                    ))
                  )}
                </div>
              </SortableContext>

              <DragOverlay>
                {activeDragId && sequence.items.find((item) => item.id === activeDragId) ? (
                  <div className="opacity-80">
                    <SortableItemCard
                      item={sequence.items.find((item) => item.id === activeDragId)!}
                      index={sequence.items.findIndex((item) => item.id === activeDragId)}
                      isSelected={false}
                      onSelect={() => {}}
                      onDelete={() => {}}
                    />
                  </div>
                ) : null}
              </DragOverlay>
            </DndContext>
          </div>

          {editingItem && (
            <div className="border-t border-primary/20 pt-4">
              <div className="flex justify-between items-center mb-4">
                <h4 className="font-display text-sm text-primary">
                  編輯項目
                </h4>
                <button
                  onClick={() => setEditingItem(null)}
                  className="text-muted hover:text-primary"
                >
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="font-display text-xs text-primary">
                    顯示時間（毫秒）
                  </label>
                  <input
                    type="number"
                    value={editingItem.duration}
                    onChange={(e) =>
                      setEditingItem((prev) =>
                        prev
                          ? { ...prev, duration: parseInt(e.target.value) || 3000 }
                          : null
                      )
                    }
                    className="edit-input w-full px-4 py-2 rounded"
                    min={500}
                    step={500}
                  />
                </div>

                {editingItem.item_type === "background" && (
                  <div className="space-y-2">
                    <label className="font-display text-xs text-primary">
                      場景底圖
                    </label>
                    <input
                      ref={bgInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => handleImageUpload(e, "background")}
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => bgInputRef.current?.click()}
                        className="edit-btn px-4 py-2 rounded flex-1"
                      >
                        {loading ? "上傳中..." : "上傳圖片"}
                      </button>
                    </div>
                    {editingItem.content && (
                      <img
                        src={editingItem.content}
                        className="w-full h-32 object-cover rounded mt-2"
                        alt="Background preview"
                      />
                    )}
                  </div>
                )}

                {editingItem.item_type === "character" && (
                  <>
                    <div className="space-y-2">
                      <label className="font-display text-xs text-primary">
                        角色名稱
                      </label>
                      <input
                        type="text"
                        value={editingItem.character_name || ""}
                        onChange={(e) =>
                          setEditingItem((prev) =>
                            prev
                              ? { ...prev, character_name: e.target.value }
                              : null
                          )
                        }
                        className="edit-input w-full px-4 py-2 rounded"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="font-display text-xs text-primary">
                        人物立繪
                      </label>
                      <input
                        ref={charInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => handleImageUpload(e, "character")}
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={() => charInputRef.current?.click()}
                          className="edit-btn px-4 py-2 rounded flex-1"
                        >
                          {loading ? "上傳中..." : "上傳圖片"}
                        </button>
                      </div>
                      {editingItem.content && (
                        <img
                          src={editingItem.content}
                          className="w-full h-32 object-cover rounded mt-2"
                          alt="Character preview"
                        />
                      )}
                    </div>
                  </>
                )}

                {editingItem.item_type === "dialogue" && (
                  <div className="space-y-2">
                    <label className="font-display text-xs text-primary">
                      對話文字
                    </label>
                    <textarea
                      value={editingItem.content}
                      onChange={(e) =>
                        setEditingItem((prev) =>
                          prev ? { ...prev, content: e.target.value } : null
                        )
                      }
                      className="edit-input w-full px-4 py-3 rounded h-32 resize-none"
                    />
                  </div>
                )}

                <button
                  onClick={updateItem}
                  className="edit-btn w-full px-4 py-3 rounded font-display flex items-center justify-center gap-2"
                >
                  <span className="material-symbols-outlined">save</span>
                  保存修改
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {activeDragType && (
        <div
          className="fixed inset-0 z-[100] bg-primary/10 backdrop-blur-sm flex items-center justify-center"
          onDragOver={(e) => e.preventDefault()}
          onDrop={() => {
            addItem(activeDragType);
            setActiveDragType(null);
          }}
        >
          <div className="text-center">
            <span className="material-symbols-outlined text-primary text-6xl mb-4">
              add_circle
            </span>
            <p className="text-primary font-display text-lg">
              放開以新增元素
            </p>
          </div>
        </div>
      )}
    </div>
  );
}