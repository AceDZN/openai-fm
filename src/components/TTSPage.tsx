"use client";
import React, { useState } from "react";
import {
  getRandomLibrarySet,
  getRandomVoice,
  LIBRARY,
  TUTORS,
  VOICES,
} from "../lib/library";
import { Block } from "./ui/Block";
import { Footer } from "./ui/Footer";

import { Header } from "./ui/Header";
import { DevMode } from "./ui/DevMode";

import { Regenerate, Shuffle, Star } from "./ui/Icons";
import { useBodyScrollable } from "@/hooks/useBodyScrollable";
import { Button, ButtonLED } from "./ui/Button";
import { appStore } from "@/lib/store";
import BrowserNotSupported from "./ui/BrowserNotSupported";

const EXPRESSIVE_VOICES = ["ash", "ballad", "coral", "sage", "verse"];

export default function TtsPage() {
  const [devMode, setDevMode] = useState(false);
  const isScrollable = useBodyScrollable();

  return (
    <div
      data-scrollable={isScrollable}
      className="flex flex-col gap-x-3 min-h-screen px-5 pt-6 pb-32 md:pb-24 selection:bg-primary/20"
    >
      <Header devMode={devMode} setDevMode={setDevMode} />
      {devMode ? <DevMode /> : <Board />}
      <Footer devMode={devMode} />
    </div>
  );
}

const Board = () => {
  const voice = appStore.useState((state) => state.voice);
  const input = appStore.useState((state) => state.input);
  const inputDirty = appStore.useState((state) => state.inputDirty);
  const prompt = appStore.useState((state) => state.prompt);
  const speed = appStore.useState((state) => state.speed);
  const selectedEntry = appStore.useState((state) => state.selectedEntry);
  const librarySet = appStore.useState((state) => state.librarySet);
  const browserNotSupported = appStore.useState(
    () => !("serviceWorker" in navigator)
  );

  const handleRefreshLibrarySet = () => {
    const nextSet = getRandomLibrarySet();

    appStore.setState((draft) => {
      draft.librarySet = nextSet;

      // When the user has changes, don't update the script.
      if (!draft.inputDirty) {
        draft.input = nextSet[0].input;
      }

      draft.prompt = nextSet[0].prompt;
      draft.selectedEntry = nextSet[0];
      draft.latestAudioUrl = null;
    });
  };

  const handlePresetSelect = (name: string) => {
    const entry = LIBRARY[name];

    appStore.setState((draft) => {
      // When the user has changes, don't update the script.
      if (!inputDirty) {
        draft.input = entry.input;
      }

      draft.prompt = entry.prompt;
      draft.selectedEntry = entry;
      draft.latestAudioUrl = null;
    });
  };

  const handleTutorSelect = (name: string) => {
    const entry = LIBRARY[name];

    appStore.setState((draft) => {
      if (!inputDirty) {
        draft.input = entry.input;
      }

      draft.voice = entry.voice;
      draft.prompt = entry.prompt;
      draft.selectedEntry = entry;
      draft.latestAudioUrl = null;
    });
  };

  return (
    <main className="flex-1 flex flex-col gap-x-3 w-full max-w-(--page-max-width) mx-auto">
      {browserNotSupported && (
        <BrowserNotSupported
          open={browserNotSupported}
          onOpenChange={() => { }}
        />
      )}
      <div className="flex flex-row">
        <Block title="Tutors">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
            {TUTORS.map((entry) => (
              <Button
                key={entry.name}
                block
                color="default"
                onClick={() => handleTutorSelect(entry.name)}
                selected={selectedEntry?.name === entry.name}
                className="aspect-4/3 sm:aspect-2/1 md:aspect-4/3 min-h-[40px] max-h-[70px] flex-col items-start justify-between relative"
              >
                <span className="break-words pr-1">{entry.name}</span>
                <div className="absolute left-[0.93rem] bottom-[0.93rem]">
                  <ButtonLED />
                </div>
              </Button>
            ))}
          </div>
        </Block>
      </div>
      <div className="flex flex-row">
        <Block title="Voice">
          <div className="grid grid-cols-12 gap-3">
            {VOICES.map((newVoice) => (
              <div
                key={newVoice}
                className="col-span relative"
              >
                <Button
                  block
                  color="default"
                  onClick={() => {
                    appStore.setState((draft) => {
                      draft.voice = newVoice;
                      draft.latestAudioUrl = null;
                    });
                  }}
                  selected={newVoice === voice}
                  className="aspect-4/3 sm:aspect-2/1 lg:aspect-2.5/1 xl:aspect-square min-h-[60px] max-h-[60px] flex-col items-start justify-between relative"
                >
                  <span>
                    {newVoice[0].toUpperCase()}
                    {newVoice.substring(1)}
                  </span>
                  <div className="absolute left-[0.93rem] bottom-[0.93rem]">
                    <ButtonLED />
                  </div>
                  {EXPRESSIVE_VOICES.includes(newVoice) && (
                    <div className="absolute right-[13px] bottom-[10.5px]">
                      <Star className="w-[12px] h-[12px]" />
                    </div>
                  )}
                </Button>
              </div>
            ))}
            <div className="col-span">
              <Button
                block
                color="neutral"
                onClick={() => {
                  const randomVoice = getRandomVoice(voice);
                  appStore.setState((draft) => {
                    draft.voice = randomVoice;
                    draft.latestAudioUrl = null;
                  });
                }}
                className="aspect-4/3 sm:aspect-2/1 lg:aspect-2.5/1 xl:aspect-square  min-h-[60px] max-h-[60px]"
                aria-label="Select random voice"
              >
                <Shuffle />
              </Button>
            </div>
          </div>
        </Block>
      </div>

      <div className="flex flex-col md:flex-row gap-3">
        <Block title="Vibe">
          <div className="flex flex-col gap-3">
            <div className="grid grid-cols-3 sm:grid-cols-6 md:grid-cols-6 lg:grid-cols-6 gap-2">
              {librarySet.map((entry) => (
                <Button
                  key={entry.name}
                  block
                  color="default"
                  onClick={() => handlePresetSelect(entry.name)}
                  selected={selectedEntry?.name === entry.name}
                  className="min-h-[36px] max-h-[48px] flex-col items-start justify-center relative text-[12px]"
                >
                  <span className="break-words pr-1">{entry.name}</span>
                </Button>
              ))}
              <Button
                block
                color="neutral"
                onClick={handleRefreshLibrarySet}
                className="min-h-[36px] max-h-[48px] flex-col items-center justify-center text-center relative text-[12px]"
                aria-label="Generate new list of vibes"
              >
                <Regenerate />
              </Button>
            </div>
            <Block title="Speed">
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min={0.5}
                  max={2}
                  step={0.05}
                  value={speed}
                  onChange={({ target }) => {
                    appStore.setState((draft) => {
                      draft.speed = parseFloat(target.value);
                      draft.latestAudioUrl = null;
                    });
                  }}
                  className="flex-1 accent-primary h-2 cursor-pointer"
                />
                <button
                  onClick={() => {
                    appStore.setState((draft) => {
                      draft.speed = 1.0;
                      draft.latestAudioUrl = null;
                    });
                  }}
                  className="text-[12px] tabular-nums min-w-[3.5rem] text-center rounded-md bg-screen px-2 py-1 shadow-textarea cursor-pointer hover:opacity-70 transition-opacity"
                >
                  {speed.toFixed(2)}x
                </button>
              </div>
            </Block>
            <textarea
              id="input"
              rows={8}
              maxLength={999}
              className="w-full resize-none outline-none focus:outline-none bg-screen p-4 rounded-lg shadow-textarea text-[16px] md:text-[14px]"
              value={prompt}
              onChange={({ target }) => {
                appStore.setState((draft) => {
                  draft.selectedEntry = null;
                  draft.prompt = target.value;
                  draft.latestAudioUrl = null;
                });
              }}
              required
            />
          </div>
        </Block>
        <Block title="Script">
          <div className="relative flex flex-col h-full w-full">
            <textarea
              id="prompt"
              rows={8}
              maxLength={999}
              className="w-full h-full min-h-[220px] resize-none outline-none focus:outline-none bg-screen p-4 rounded-lg shadow-textarea text-[16px] md:text-[14px]"
              value={input}
              onChange={({ target }) => {
                const nextValue = target.value;

                appStore.setState((draft) => {
                  draft.inputDirty =
                    !!nextValue && selectedEntry?.input !== nextValue;
                  draft.input = nextValue;
                  draft.latestAudioUrl = null;
                });
              }}
            />
            {inputDirty && (
              <span
                className="absolute bottom-[-27px] sm:bottom-3 left-4 z-10 cursor-pointer uppercase hover:text-current/70 transition-colors"
                onClick={() => {
                  appStore.setState((draft) => {
                    draft.inputDirty = false;
                    draft.input = selectedEntry?.input ?? input;
                    draft.latestAudioUrl = null;
                  });
                }}
              >
                Reset
              </span>
            )}
            <span className="absolute bottom-3 right-4 z-10 opacity-30 hidden sm:block">
              {input.length}
            </span>
          </div>
        </Block>
      </div>
    </main>
  );
};
