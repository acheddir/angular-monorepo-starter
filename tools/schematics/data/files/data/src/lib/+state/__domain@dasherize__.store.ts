import { signalStore, withMethods, withState } from "@ngrx/signals";

interface <%= classify(domain) %>State {
  /* TODO: add state properties */
}

const initialState: <%= classify(domain) %>State = {
  /* TODO: add initial state values */
}

export const <%= classify(domain) %>Store = signalStore(
  { providedIn: 'root' },
  withState(initialState),
  withMethods((store) => ({
    /* TODO: add store methods */
  })
));
