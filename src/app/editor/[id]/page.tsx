"use client";

import { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";

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

  const bgInputRef = useRef<HTMLInputElement>(null);
  const charInputRef = useRef<HTMLInputElement>(null);

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

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: "background" | "character") => {
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

  const moveItem = async (itemId: string, direction: "up" | "down") => {
    if (!sequence) return;

    const items = [...sequence.items];
    const index = items.findIndex((item) => item.id === itemId);

    if (direction === "up" && index > 0) {
      [items[index], items[index - 1]] = [items[index - 1], items[index]];
    } else if (direction === "down" && index < items.length - 1) {
      [items[index], items[index + 1]] = [items[index + 1], items[index]];
    }

    items.forEach((item, idx) => {
      item.display_order = idx;
    });

    try {
      for (const item of items) {
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
      fetchSequence();
    } catch (error) {
      console.error("Error moving item:", error);
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
            backgroundImage: previewState.background ? `url('${previewState.background}')` : "none",
          }}
        />

        <div
          className="absolute bottom-[200px] left-[5%] h-[400px] z-10 pointer-events-none transition-all duration-300"
          style={{
            opacity: previewState.character ? 1 : 0,
            transform: previewState.character ? "translateX(0)" : "translateX(-50px)",
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
            <div className="flex justify-between items-center mb-4">
              <h4 className="font-display text-sm text-primary">序列項目</h4>
              <div className="flex gap-2">
                <button
                  onClick={() => addItem("background")}
                  className="edit-btn px-3 py-1 rounded text-xs flex items-center gap-1"
                >
                  <span className="material-symbols-outlined text-sm">landscape</span>
                  場景
                </button>
                <button
                  onClick={() => addItem("character")}
                  className="edit-btn px-3 py-1 rounded text-xs flex items-center gap-1"
                >
                  <span className="material-symbols-outlined text-sm">person</span>
                  人物
                </button>
                <button
                  onClick={() => addItem("dialogue")}
                  className="edit-btn px-3 py-1 rounded text-xs flex items-center gap-1"
                >
                  <span className="material-symbols-outlined text-sm">chat</span>
                  對話
                </button>
              </div>
            </div>

            <div className="space-y-2">
              {sequence.items.length === 0 ? (
                <p className="text-muted text-sm">尚未添加任何項目，點擊上方按鈕開始添加</p>
              ) : (
                sequence.items.map((item, index) => (
                  <div
                    key={item.id}
                    className={`bg-surface/40 rounded-lg p-3 cursor-pointer transition-all ${
                      selectedItem?.id === item.id ? "border border-primary" : "border border-white/5"
                    }`}
                    onClick={() => {
                      setSelectedItem(item);
                      setEditingItem(item);
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="text-muted text-xs">{index + 1}</span>
                        <span className="material-symbols-outlined text-primary text-sm">
                          {itemTypeIcon(item.item_type)}
                        </span>
                        <div>
                          <span className="text-text-light text-sm">{itemTypeLabel(item.item_type)}</span>
                          {item.item_type === "dialogue" && (
                            <span className="text-muted text-xs ml-2 truncate max-w-[120px]">
                              {item.content.substring(0, 20)}...
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-muted text-xs">{item.duration / 1000}s</span>
                        <div className="flex gap-1">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              moveItem(item.id, "up");
                            }}
                            className="text-muted hover:text-primary"
                            disabled={index === 0}
                          >
                            <span className="material-symbols-outlined text-sm">keyboard_arrow_up</span>
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              moveItem(item.id, "down");
                            }}
                            className="text-muted hover:text-primary"
                            disabled={index === sequence.items.length - 1}
                          >
                            <span className="material-symbols-outlined text-sm">keyboard_arrow_down</span>
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteItem(item.id);
                            }}
                            className="text-muted hover:text-red-400"
                          >
                            <span className="material-symbols-outlined text-sm">close</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {editingItem && (
            <div className="border-t border-primary/20 pt-4">
              <div className="flex justify-between items-center mb-4">
                <h4 className="font-display text-sm text-primary">
                  編輯 {itemTypeLabel(editingItem.item_type)}
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
                  <label className="font-display text-xs text-primary">顯示時間（毫秒）</label>
                  <input
                    type="number"
                    value={editingItem.duration}
                    onChange={(e) =>
                      setEditingItem((prev) =>
                        prev ? { ...prev, duration: parseInt(e.target.value) || 3000 } : null
                      )
                    }
                    className="edit-input w-full px-4 py-2 rounded"
                    min={500}
                    step={500}
                  />
                </div>

                {editingItem.item_type === "background" && (
                  <div className="space-y-2">
                    <label className="font-display text-xs text-primary">場景底圖</label>
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
                        className="edit-btn px-4 py-2 rounded"
                      >
                        {loading ? "上傳中..." : "上傳圖片"}
                      </button>
                    </div>
                    {editingItem.content && (
                      <img
                        src={editingItem.content}
                        className="max-w-[100px] max-h-[60px] rounded mt-2"
                        alt="Background preview"
                      />
                    )}
                  </div>
                )}

                {editingItem.item_type === "character" && (
                  <>
                    <div className="space-y-2">
                      <label className="font-display text-xs text-primary">角色名稱</label>
                      <input
                        type="text"
                        value={editingItem.character_name || ""}
                        onChange={(e) =>
                          setEditingItem((prev) =>
                            prev ? { ...prev, character_name: e.target.value } : null
                          )
                        }
                        className="edit-input w-full px-4 py-2 rounded"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="font-display text-xs text-primary">人物立繪</label>
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
                          className="edit-btn px-4 py-2 rounded"
                        >
                          {loading ? "上傳中..." : "上傳圖片"}
                        </button>
                      </div>
                      {editingItem.content && (
                        <img
                          src={editingItem.content}
                          className="max-w-[100px] max-h-[60px] rounded mt-2"
                          alt="Character preview"
                        />
                      )}
                    </div>
                  </>
                )}

                {editingItem.item_type === "dialogue" && (
                  <div className="space-y-2">
                    <label className="font-display text-xs text-primary">對話文字</label>
                    <textarea
                      value={editingItem.content}
                      onChange={(e) =>
                        setEditingItem((prev) =>
                          prev ? { ...prev, content: e.target.value } : null
                        )
                      }
                      className="edit-input w-full px-4 py-3 rounded h-24 resize-none"
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
    </div>
  );
}