"use client";

import { useState, useEffect, useCallback } from "react";
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

interface DisplayState {
  background: string | null;
  character: string | null;
  characterName: string;
  dialogue: string;
}

export default function PlaySequencePage() {
  const params = useParams();
  const router = useRouter();
  const sequenceId = params.id as string;

  const [sequence, setSequence] = useState<Sequence | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [displayState, setDisplayState] = useState<DisplayState>({
    background: null,
    character: null,
    characterName: "",
    dialogue: "",
  });

  useEffect(() => {
    fetchSequence();
  }, [sequenceId]);

  const fetchSequence = async () => {
    try {
      const res = await fetch(`/api/sequences?id=${sequenceId}`);
      const data = await res.json();
      setSequence(data);

      const initialBg = data.items.find((item: SequenceItem) => item.item_type === "background");
      const initialChar = data.items.find((item: SequenceItem) => item.item_type === "character");
      
      setDisplayState({
        background: initialBg?.content || null,
        character: initialChar?.content || null,
        characterName: initialChar?.character_name || "",
        dialogue: "",
      });
    } catch (error) {
      console.error("Failed to fetch sequence:", error);
    }
  };

  const processNextItem = useCallback(() => {
    if (!sequence || currentIndex >= sequence.items.length) {
      setIsPlaying(false);
      return;
    }

    const item = sequence.items[currentIndex];

    switch (item.item_type) {
      case "background":
        setDisplayState((prev) => ({ ...prev, background: item.content }));
        break;
      case "character":
        setDisplayState((prev) => ({
          ...prev,
          character: item.content,
          characterName: item.character_name || "",
        }));
        break;
      case "dialogue":
        setDisplayState((prev) => ({ ...prev, dialogue: item.content }));
        break;
    }

    setCurrentIndex((prev) => prev + 1);
  }, [sequence, currentIndex]);

  useEffect(() => {
    if (!isPlaying || !sequence) return;

    if (currentIndex >= sequence.items.length) {
      setIsPlaying(false);
      return;
    }

    const item = sequence.items[currentIndex];
    const timer = setTimeout(processNextItem, item.duration);

    return () => clearTimeout(timer);
  }, [isPlaying, currentIndex, sequence, processNextItem]);

  const startPlayback = () => {
    if (!sequence) return;
    setCurrentIndex(0);
    setIsPlaying(true);
    processNextItem();
  };

  const pausePlayback = () => {
    setIsPlaying(false);
  };

  const skipToEnd = () => {
    if (!sequence) return;
    
    const bgItem = sequence.items.findLast((item) => item.item_type === "background");
    const charItem = sequence.items.findLast((item) => item.item_type === "character");
    const dialogueItem = sequence.items.findLast((item) => item.item_type === "dialogue");

    setDisplayState({
      background: bgItem?.content || null,
      character: charItem?.content || null,
      characterName: charItem?.character_name || "",
      dialogue: dialogueItem?.content || "",
    });
    setCurrentIndex(sequence.items.length);
    setIsPlaying(false);
  };

  if (!sequence) {
    return (
      <div className="bg-black text-text-light font-body h-screen flex items-center justify-center">
        <p className="text-muted">載入中...</p>
      </div>
    );
  }

  return (
    <div className="bg-black text-text-light font-body h-screen overflow-hidden relative">
      <div
        id="bg"
        className="absolute inset-0 bg-cover transition-all duration-500"
        style={{
          backgroundColor: "#1F252F",
          backgroundImage: displayState.background ? `url('${displayState.background}')` : "none",
        }}
      />

      <div
        id="char-container"
        className="absolute bottom-[200px] left-[5%] h-[400px] z-10 pointer-events-none transition-all duration-300"
        style={{
          opacity: displayState.character ? 1 : 0,
          transform: displayState.character ? "translateX(0)" : "translateX(-50px)",
        }}
      >
        {displayState.character && (
          <img
            id="char-preview"
            className="h-full object-contain drop-shadow-2xl"
            src={displayState.character}
            alt="Character"
          />
        )}
      </div>

      <div className="absolute inset-0 z-20 flex flex-col justify-between p-8 pointer-events-none">
        <div className="flex justify-between w-full pointer-events-auto">
          <button
            onClick={() => router.push("/chapters")}
            className="text-muted hover:text-primary flex items-center gap-2 bg-black/40 backdrop-blur-sm rounded-full px-4 py-2 border border-white/10"
          >
            <span className="material-symbols-outlined">arrow_back</span>
            <span className="font-display text-sm uppercase">返回</span>
          </button>
          <div className="flex gap-4">
            <button
              onClick={isPlaying ? pausePlayback : startPlayback}
              className="text-muted hover:text-primary flex items-center gap-2 bg-black/40 backdrop-blur-sm rounded-full px-4 py-2 border border-white/10"
            >
              <span className="material-symbols-outlined">{isPlaying ? "pause" : "play_circle"}</span>
              <span className="font-display text-sm uppercase">{isPlaying ? "暫停" : "播放"}</span>
            </button>
            <button
              onClick={skipToEnd}
              className="text-muted hover:text-primary flex items-center gap-2 bg-black/40 backdrop-blur-sm rounded-full px-4 py-2 border border-white/10"
            >
              <span className="material-symbols-outlined">fast_forward</span>
              <span className="font-display text-sm uppercase">跳過</span>
            </button>
          </div>
        </div>

        <div className="w-full max-w-[1200px] mx-auto relative pointer-events-auto mb-8">
          {displayState.characterName && (
            <div className="absolute -top-12 left-8 bg-primary z-30 px-6 py-3 shadow-lg">
              <h2 className="font-display font-bold text-text-dark text-xl">
                {displayState.characterName}
              </h2>
            </div>
          )}

          <div className="relative bg-surface backdrop-blur-md border-t-2 border-primary shadow-2xl min-h-[240px] w-full flex flex-col p-10">
            <div className="flex-grow overflow-y-auto">
              <p className="text-xl text-text-light leading-relaxed font-body">
                {displayState.dialogue}
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

      <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 z-30 bg-black/60 backdrop-blur-sm rounded-full px-6 py-2 border border-white/10">
        <div className="flex items-center gap-4">
          <span className="text-muted text-sm font-display">
            {sequence.title}
          </span>
          <div className="flex gap-1">
            {sequence.items.map((item, index) => (
              <div
                key={item.id}
                className={`w-2 h-2 rounded-full ${
                  index < currentIndex
                    ? "bg-primary"
                    : index === currentIndex
                    ? "bg-white"
                    : "bg-muted/50"
                }`}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
