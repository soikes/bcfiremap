import { QueryClient } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, mock } from 'bun:test';
import { PROVINCIAL_URL, provincialCollector } from '../collectors/provincial';
import { BANS_API_PATH } from '../constants/api';
import { BCWS_2022_FEED } from '../test/bcws2022';
import { clickMap } from '../test/fakeMapLibre';

/** A point inside the test feed's ban area, and one outside every ban. */
const INSIDE = [49.5, -119.5] as const;
const OUTSIDE = [58, -125] as const;

mock.module('../collectors/constants/browser', () => ({ BROWSER_COLLECTORS: [provincialCollector] }));

const { default: App } = await import('./App');

type Reply = () => Promise<unknown>;

const realFetch = globalThis.fetch;

const answers = (body: unknown): Reply => async () => ({ ok: true, status: 200, json: async () => body });
const unreachable: Reply = async () => {
  throw new TypeError('Failed to fetch');
};
const hangs: Reply = () => new Promise(() => {});

const SERVER_EMPTY = answers({ bans: [], sources: [] });
const BCWS_FEED = answers(BCWS_2022_FEED);

/** Answers each URL the app requests with the given reply, and anything else as unreachable. */
const route = (replies: Record<string, Reply>) => {
  globalThis.fetch = mock(async (url: string) => (replies[url] ?? unreachable)()) as unknown as typeof fetch;
};

/** Renders the whole app with a query client that doesn't retry unless told to. */
const clients: QueryClient[] = [];

const renderApp = (retry: { retry: number; retryDelay: number } | { retry: false } = { retry: false }) => {
  const client = new QueryClient({ defaultOptions: { queries: retry } });
  clients.push(client);
  render(<App client={client} />);
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

/** The source banner, or null when it isn't shown. */
const banner = () => screen.queryByRole('status', { hidden: true });

/** The source banner's rows as text, or an empty list when it isn't shown; waitFor checks compare these strings, because a failed check on a happy-dom element prints the whole element, which is slow enough to delay the app's timers. */
const bannerRows = () => [...(banner()?.querySelectorAll('li') ?? [])].map(row => row.textContent);

/** The state class of each banner row, in order. */
const bannerStates = () =>
  [...(banner()?.querySelectorAll('li') ?? [])].map(row => row.className.replace('source-banner-row source-banner-', ''));

afterEach(async () => {
  await Promise.all(clients.map(client => client.cancelQueries()));
  clients.forEach(client => client.clear());
  clients.length = 0;
  globalThis.fetch = realFetch;
});

describe('App when every source loads', () => {
  it('shows no banner once loaded, and lists the bans at a tapped point', async () => {
    route({ [PROVINCIAL_URL]: BCWS_FEED, [BANS_API_PATH]: SERVER_EMPTY });
    renderApp();

    await waitFor(() => expect(bannerRows()).toEqual([]));
    clickMap(...INSIDE);

    expect(screen.getByText('6 fire bans in effect')).toBeInTheDocument();
    expect(screen.queryByText(/bans may be missing/)).not.toBeInTheDocument();
  });

  it('shows no panel at a point outside every ban area', async () => {
    route({ [PROVINCIAL_URL]: BCWS_FEED, [BANS_API_PATH]: SERVER_EMPTY });
    renderApp();
    await waitFor(() => expect(bannerRows()).toEqual([]));

    clickMap(...OUTSIDE);

    expect(screen.queryByText(/fire bans? (in effect|found)/)).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Close' })).not.toBeInTheDocument();
  });
});

describe('App while sources are loading', () => {
  it('names every source whose request is in flight', async () => {
    route({ [PROVINCIAL_URL]: hangs, [BANS_API_PATH]: hangs });
    renderApp();

    await waitFor(() =>
      expect(bannerRows()).toEqual(['Loading ban data from BC Wildfire Service…', 'Loading ban data from BC Fire Bans server…']),
    );
    expect(bannerStates()).toEqual(['loading', 'loading']);
  });

  it('removes a source\'s row once it answers', async () => {
    route({ [PROVINCIAL_URL]: hangs, [BANS_API_PATH]: SERVER_EMPTY });
    renderApp();

    await waitFor(() => expect(bannerRows()).toEqual(['Loading ban data from BC Wildfire Service…']));
  });

  it('says in the panel that the data is loading', async () => {
    route({ [PROVINCIAL_URL]: hangs, [BANS_API_PATH]: hangs });
    renderApp();

    clickMap(...INSIDE);

    expect(screen.getByText('Loading ban data…')).toBeInTheDocument();
  });
});

describe('App when a source fails', () => {
  it('names the BC Wildfire Service in the banner, keeps the map, and warns in the panel', async () => {
    route({ [PROVINCIAL_URL]: unreachable, [BANS_API_PATH]: SERVER_EMPTY });
    renderApp();

    await waitFor(() =>
      expect(bannerRows()).toEqual(["⚠ Couldn't load BC Wildfire Service. Bans may be missing from the map."]),
    );
    expect(bannerStates()).toEqual(['failed']);
    expect(screen.getByTestId('map')).toBeInTheDocument();

    clickMap(...INSIDE);

    expect(screen.getByText('No fire bans found in the sources that loaded')).toBeInTheDocument();
    expect(screen.getByText("⚠ Some sources couldn't be checked, so bans may be missing.")).toBeInTheDocument();
    expect(screen.getByText('BC Wildfire Service: unavailable')).toBeInTheDocument();
  });

  it('still shows the provincial bans when the server is down, with a warning', async () => {
    route({ [PROVINCIAL_URL]: BCWS_FEED, [BANS_API_PATH]: unreachable });
    renderApp();

    await waitFor(() =>
      expect(bannerRows()).toEqual(["⚠ Couldn't load BC Fire Bans server. Bans may be missing from the map."]),
    );

    clickMap(...INSIDE);

    expect(screen.getByText('6 fire bans in effect')).toBeInTheDocument();
    expect(screen.getByText("⚠ Some sources couldn't be checked, so bans may be missing.")).toBeInTheDocument();
  });

  it('treats an ArcGIS error answer as a failed source', async () => {
    route({ [PROVINCIAL_URL]: answers({ error: { code: 500, message: 'Service unavailable' } }), [BANS_API_PATH]: SERVER_EMPTY });
    renderApp();

    await waitFor(() =>
      expect(bannerRows()).toEqual(["⚠ Couldn't load BC Wildfire Service. Bans may be missing from the map."]),
    );
  });

  it('shows the failed source and the loading one in separate rows', async () => {
    route({ [PROVINCIAL_URL]: unreachable, [BANS_API_PATH]: hangs });
    renderApp();

    await waitFor(() =>
      expect(bannerRows()).toEqual([
        "⚠ Couldn't load BC Wildfire Service. Bans may be missing from the map.",
        'Loading ban data from BC Fire Bans server…',
      ]),
    );
  });
});

describe('App when everything fails', () => {
  it('falls back to the empty map and names both sources in the banner', async () => {
    route({});
    renderApp();

    await waitFor(() =>
      expect(bannerRows()).toEqual([
        "⚠ Couldn't load BC Wildfire Service. Bans may be missing from the map.",
        "⚠ Couldn't load BC Fire Bans server. Bans may be missing from the map.",
      ]),
    );
    expect(screen.getByTestId('map')).toBeInTheDocument();

    clickMap(...INSIDE);

    expect(screen.getByText('No fire bans found in the sources that loaded')).toBeInTheDocument();
  });

  it('does not crash when both sources answer with garbage', async () => {
    route({ [PROVINCIAL_URL]: answers('<html>Bad Gateway</html>'), [BANS_API_PATH]: answers({}) });
    renderApp();

    await waitFor(() =>
      expect(bannerRows()).toEqual([
        "⚠ Couldn't load BC Wildfire Service. Bans may be missing from the map.",
        "⚠ Couldn't load BC Fire Bans server. Bans may be missing from the map.",
      ]),
    );
    expect(screen.getByTestId('map')).toBeInTheDocument();
  });
});

describe('App while a source is retried', () => {
  it('updates one banner from loading to retrying to missing as the attempts fail', async () => {
    let calls = 0;
    const slowlyFails: Reply = async () => {
      calls += 1;
      await new Promise(resolve => setTimeout(resolve, 100));
      throw new TypeError(`Failed to fetch (attempt ${calls})`);
    };
    route({ [PROVINCIAL_URL]: slowlyFails, [BANS_API_PATH]: SERVER_EMPTY });
    renderApp({ retry: 1, retryDelay: 200 });

    await waitFor(() => expect(bannerRows()).toEqual(['Loading ban data from BC Wildfire Service…']));
    await waitFor(() => expect(bannerRows()).toEqual(["Couldn't load ban data from BC Wildfire Service. Retrying…"]));
    await waitFor(() =>
      expect(bannerRows()).toEqual(["⚠ Couldn't load BC Wildfire Service. Bans may be missing from the map."]),
    );
  });

  it('removes the banner and shows the bans when the retry succeeds', async () => {
    route({ [PROVINCIAL_URL]: failsThenAnswers(1, BCWS_2022_FEED), [BANS_API_PATH]: SERVER_EMPTY });
    renderApp({ retry: 1, retryDelay: 300 });

    await waitFor(() => expect(bannerRows()).toEqual(["Couldn't load ban data from BC Wildfire Service. Retrying…"]));

    await waitFor(() => expect(bannerRows()).toEqual([]));
    clickMap(...INSIDE);
    expect(screen.getByText('6 fire bans in effect')).toBeInTheDocument();
  });

  it('says the source is being retried in the panel while the retry is pending', async () => {
    route({ [PROVINCIAL_URL]: unreachable, [BANS_API_PATH]: SERVER_EMPTY });
    renderApp({ retry: 1, retryDelay: 5000 });
    await waitFor(() => expect(bannerRows()).toEqual(["Couldn't load ban data from BC Wildfire Service. Retrying…"]));

    clickMap(...INSIDE);

    expect(screen.getByText('Loading ban data…')).toBeInTheDocument();
    expect(screen.getByText("BC Wildfire Service: couldn't load, retrying…")).toBeInTheDocument();
  });

  it('gives a source being retried and another still loading separate rows', async () => {
    route({ [PROVINCIAL_URL]: unreachable, [BANS_API_PATH]: hangs });
    renderApp({ retry: 1, retryDelay: 5000 });

    await waitFor(() =>
      expect(bannerRows()).toEqual([
        "Couldn't load ban data from BC Wildfire Service. Retrying…",
        'Loading ban data from BC Fire Bans server…',
      ]),
    );
    expect(bannerStates()).toEqual(['retrying', 'loading']);
  });

  it('names the server in the banner while a request to it is retried', async () => {
    route({ [PROVINCIAL_URL]: BCWS_FEED, [BANS_API_PATH]: unreachable });
    renderApp({ retry: 1, retryDelay: 5000 });

    await waitFor(() => expect(bannerRows()).toEqual(["Couldn't load ban data from BC Fire Bans server. Retrying…"]));
  });
});
