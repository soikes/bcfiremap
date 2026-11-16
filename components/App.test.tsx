import { QueryClient } from '@tanstack/react-query';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, mock } from 'bun:test';
import { PROVINCIAL_URL, provincialCollector } from '../collectors/provincial';
import { BANS_API_PATH } from '../constants/api';
import { LOAD_FAILED_MESSAGE } from '../hooks/useLoadStatus';
import { BCWS_2022_FEED } from '../test/bcws2022';
import { camera, clickMap } from '../test/fakeMapLibre';
import App from './App';

/** A point inside the test feed's ban area, and one outside every ban. */
const INSIDE = [49.5, -119.5] as const;
const OUTSIDE = [58, -125] as const;

type Reply = () => Promise<unknown>;

const realFetch = globalThis.fetch;

const answers = (body: unknown): Reply => async () => ({ ok: true, status: 200, json: async () => body });
const unreachable: Reply = async () => {
  throw new TypeError('Failed to fetch');
};
const hangs: Reply = () => new Promise(() => {});

const SERVER_EMPTY = answers({ bans: [], sources: [] });
const BCWS_FEED = answers(BCWS_2022_FEED);

/** Answers each URL the app requests (or each URL starting with a given one) with the given reply, and anything else as unreachable. */
const route = (replies: Record<string, Reply>) => {
  const reply = (url: string) => replies[url] ?? replies[Object.keys(replies).find(key => url.startsWith(key)) ?? ''] ?? unreachable;
  globalThis.fetch = mock(async (url: string) => reply(url)()) as unknown as typeof fetch;
};

/** Renders the whole app with a query client that doesn't retry unless told to. */
const clients: QueryClient[] = [];

const renderApp = (retry: { retry: number; retryDelay: number } | { retry: false } = { retry: false }) => {
  const client = new QueryClient({ defaultOptions: { queries: retry } });
  clients.push(client);
  render(<App client={client} collectors={[provincialCollector]} />);
};

/** A reply that fails the first `failures` times and then answers with `body`. */
const failsThenAnswers = (failures: number, body: unknown): Reply => {
  let calls = 0;
  return async () => {
    calls += 1;
    if (calls <= failures) throw new TypeError('Failed to fetch');
    return { ok: true, status: 200, json: async () => body };
  };
};

/** True while the loading spinner is showing. */
const spinning = () => screen.queryByRole('status', { name: 'Loading ban data' }) !== null;

/** The text of the failed-load toast, or null when it isn't showing; waitFor checks compare these plain values, because a failed check on a happy-dom element prints the whole element, which is slow enough to delay the app's timers. */
const toast = () => screen.queryByText(LOAD_FAILED_MESSAGE)?.textContent ?? null;

afterEach(async () => {
  cleanup();
  await Promise.all(clients.map(client => client.cancelQueries()));
  clients.forEach(client => client.clear());
  clients.length = 0;
  globalThis.fetch = realFetch;
});

describe('App when every source loads', () => {
  it('shows no spinner or toast once loaded, and lists the bans at a tapped point', async () => {
    route({ [PROVINCIAL_URL]: BCWS_FEED, [BANS_API_PATH]: SERVER_EMPTY });
    renderApp();

    await waitFor(() => expect(spinning()).toBe(false));
    clickMap(...INSIDE);

    expect(toast()).toBeNull();
    expect(screen.getByText('6 fire restrictions in effect')).toBeInTheDocument();
    expect(screen.queryByText(/bans may be missing\./)).not.toBeInTheDocument();
  });

  it('shows no panel at a point outside every ban area', async () => {
    route({ [PROVINCIAL_URL]: BCWS_FEED, [BANS_API_PATH]: SERVER_EMPTY });
    renderApp();
    await waitFor(() => expect(spinning()).toBe(false));

    clickMap(...OUTSIDE);

    expect(screen.queryByText(/fire restrictions? (in effect|found)/)).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Close' })).not.toBeInTheDocument();
  });
});

describe('App location search', () => {
  const SEARCH_URL = 'https://nominatim.openstreetmap.org/search';

  it('selects a searched place, fits the map to the bans there and lists them', async () => {
    route({
      [PROVINCIAL_URL]: BCWS_FEED,
      [BANS_API_PATH]: SERVER_EMPTY,
      [SEARCH_URL]: answers([{ display_name: 'Test Town, BC', lat: String(INSIDE[0]), lon: String(INSIDE[1]) }]),
    });
    renderApp();
    await waitFor(() => expect(spinning()).toBe(false));

    await userEvent.setup().type(screen.getByRole('searchbox'), 'Test Town{Enter}');

    expect(await screen.findByText('6 fire restrictions in effect')).toBeInTheDocument();
    expect(camera.fitBounds).toHaveLength(1);
    expect(camera.flyTo).toEqual([]);
  });

  it('flies to a searched place that has no bans and shows no panel', async () => {
    route({
      [PROVINCIAL_URL]: BCWS_FEED,
      [BANS_API_PATH]: SERVER_EMPTY,
      [SEARCH_URL]: answers([{ display_name: 'Far North, BC', lat: String(OUTSIDE[0]), lon: String(OUTSIDE[1]) }]),
    });
    renderApp();
    await waitFor(() => expect(spinning()).toBe(false));

    await userEvent.setup().type(screen.getByRole('searchbox'), 'Far North{Enter}');

    await waitFor(() => expect(camera.flyTo).toHaveLength(1));
    expect(screen.queryByRole('button', { name: 'Close' })).not.toBeInTheDocument();
  });

  it('does not move the map when the user taps it', async () => {
    route({ [PROVINCIAL_URL]: BCWS_FEED, [BANS_API_PATH]: SERVER_EMPTY });
    renderApp();
    await waitFor(() => expect(spinning()).toBe(false));

    clickMap(...INSIDE);

    expect(camera.fitBounds).toEqual([]);
    expect(camera.flyTo).toEqual([]);
  });
});

describe('App while sources are loading', () => {
  it('spins while requests are in flight, without a toast', async () => {
    route({ [PROVINCIAL_URL]: hangs, [BANS_API_PATH]: hangs });
    renderApp();

    await waitFor(() => expect(spinning()).toBe(true));
    expect(toast()).toBeNull();
  });

  it('stops spinning once every source has answered', async () => {
    route({ [PROVINCIAL_URL]: BCWS_FEED, [BANS_API_PATH]: SERVER_EMPTY });
    renderApp();

    await waitFor(() => expect(spinning()).toBe(false));
    expect(toast()).toBeNull();
  });

  it('says in the panel that the data is loading', async () => {
    route({ [PROVINCIAL_URL]: hangs, [BANS_API_PATH]: hangs });
    renderApp();

    clickMap(...INSIDE);

    expect(screen.getByText('Loading ban data…')).toBeInTheDocument();
  });
});

describe('App when a source fails', () => {
  it('shows the toast, keeps the map, and warns in the panel when the BC Wildfire Service fails', async () => {
    route({ [PROVINCIAL_URL]: unreachable, [BANS_API_PATH]: SERVER_EMPTY });
    renderApp();

    await waitFor(() => expect(toast()).toBe(LOAD_FAILED_MESSAGE));
    expect(spinning()).toBe(false);
    expect(screen.getByTestId('map')).toBeInTheDocument();

    clickMap(...INSIDE);

    expect(screen.getByText('No fire restrictions found in the sources that loaded')).toBeInTheDocument();
    expect(screen.getByText("⚠ Some sources couldn't be checked, so bans may be missing.")).toBeInTheDocument();
    expect(screen.getByText('BC Wildfire Service: unavailable')).toBeInTheDocument();
  });

  it('still shows the provincial bans when the server is down, with the toast and a warning', async () => {
    route({ [PROVINCIAL_URL]: BCWS_FEED, [BANS_API_PATH]: unreachable });
    renderApp();

    await waitFor(() => expect(toast()).toBe(LOAD_FAILED_MESSAGE));

    clickMap(...INSIDE);

    expect(screen.getByText('6 fire restrictions in effect')).toBeInTheDocument();
    expect(screen.getByText("⚠ Some sources couldn't be checked, so bans may be missing.")).toBeInTheDocument();
  });

  it('treats an ArcGIS error answer as a failed source', async () => {
    route({ [PROVINCIAL_URL]: answers({ error: { code: 500, message: 'Service unavailable' } }), [BANS_API_PATH]: SERVER_EMPTY });
    renderApp();

    await waitFor(() => expect(toast()).toBe(LOAD_FAILED_MESSAGE));
  });

  it('waits for the source that is still loading before showing the toast', async () => {
    route({ [PROVINCIAL_URL]: unreachable, [BANS_API_PATH]: hangs });
    renderApp();
    clickMap(...INSIDE);
    expect(await screen.findByText('BC Wildfire Service: unavailable')).toBeInTheDocument();

    expect(spinning()).toBe(true);
    expect(toast()).toBeNull();
  });

  it('shows one toast when everything fails, and falls back to the empty map', async () => {
    route({});
    renderApp();

    await waitFor(() => expect(toast()).toBe(LOAD_FAILED_MESSAGE));
    expect(screen.getAllByText(LOAD_FAILED_MESSAGE)).toHaveLength(1);
    expect(screen.getByTestId('map')).toBeInTheDocument();

    clickMap(...INSIDE);

    expect(screen.getByText('No fire restrictions found in the sources that loaded')).toBeInTheDocument();
  });

  it('does not crash when both sources answer with garbage', async () => {
    route({ [PROVINCIAL_URL]: answers('<html>Bad Gateway</html>'), [BANS_API_PATH]: answers({}) });
    renderApp();

    await waitFor(() => expect(toast()).toBe(LOAD_FAILED_MESSAGE));
    expect(screen.getByTestId('map')).toBeInTheDocument();
  });
});

describe('App while a source is retried', () => {
  /** How many times the query with this key has failed so far. */
  const failures = (queryKey: string[]) => clients[0].getQueryCache().find({ queryKey })?.state.fetchFailureCount ?? 0;

  it('shows the source as loading in the panel while a failed load is retried', async () => {
    route({ [PROVINCIAL_URL]: unreachable, [BANS_API_PATH]: SERVER_EMPTY });
    renderApp({ retry: 1, retryDelay: 60_000 });
    await waitFor(() => expect(failures(['bans', provincialCollector.id])).toBe(1));

    clickMap(...INSIDE);

    expect(screen.getByText('BC Wildfire Service: loading…')).toBeInTheDocument();
    expect(screen.getByText('Loading ban data…')).toBeInTheDocument();
    expect(spinning()).toBe(true);
  });

  it('keeps spinning, without a toast, while a request to the server is retried', async () => {
    route({ [PROVINCIAL_URL]: BCWS_FEED, [BANS_API_PATH]: unreachable });
    renderApp({ retry: 1, retryDelay: 60_000 });
    await waitFor(() => expect(failures(['server-bans'])).toBe(1));

    clickMap(...INSIDE);

    expect(screen.getByText('BC Fire Bans server: loading…')).toBeInTheDocument();
    expect(spinning()).toBe(true);
    expect(toast()).toBeNull();
  });
});

describe('App when a retry settles', () => {
  it('shows no toast and the bans when the retry succeeds', async () => {
    route({ [PROVINCIAL_URL]: failsThenAnswers(1, BCWS_2022_FEED), [BANS_API_PATH]: SERVER_EMPTY });
    renderApp({ retry: 1, retryDelay: 0 });

    await waitFor(() => expect(spinning()).toBe(false));
    expect(toast()).toBeNull();
    clickMap(...INSIDE);
    expect(screen.getByText('6 fire restrictions in effect')).toBeInTheDocument();
  });

  it('shows the toast once the retries have run out', async () => {
    route({ [PROVINCIAL_URL]: unreachable, [BANS_API_PATH]: SERVER_EMPTY });
    renderApp({ retry: 2, retryDelay: 0 });

    await waitFor(() => expect(toast()).toBe(LOAD_FAILED_MESSAGE));
    expect(spinning()).toBe(false);
  });
});
