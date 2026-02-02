import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
import { LibraryEntry } from "./types";
import { DEFAULT_VOICE, getRandomLibrarySet } from "./library";

export interface AppState {
  voice: string;
  input: string;
  inputDirty: boolean;
  prompt: string;
  codeView: string;
  selectedEntry: LibraryEntry | null;
  librarySet: LibraryEntry[];
  latestAudioUrl: string | null;
}

const INITIAL_STATE: AppState = {
  voice: DEFAULT_VOICE,
  input: "",
  inputDirty: false,
  prompt: "",
  codeView: "py",
  selectedEntry: null,
  librarySet: [],
  latestAudioUrl: null,
};

class AppStore {
  private store = create(immer(() => INITIAL_STATE));

  constructor() {
    this.store.setState((draft) => {
      const randomSet = getRandomLibrarySet();
      draft.librarySet = randomSet;
      draft.selectedEntry = randomSet[0];
      draft.input = randomSet[0].input;
      draft.prompt = randomSet[0].prompt;
    });
  }

  useState = this.store;
  setState = this.store.setState;
  getState = this.store.getState;
  subscribe = this.store.subscribe;
}

export const appStore = new AppStore() as Readonly<AppStore>;
