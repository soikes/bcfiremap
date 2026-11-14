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

mock.module('../collectors/browser', () => ({ BROWSER_COLLECTORS: [provincialCollector] }));

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
const renderApp = (retry: { retry: number; retryDelay: number } | { retry: false } = { retry: false }) => {
  render(<App client={new QueryClient({ defaultOptions: { queries: retry } })} />);
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

afterEach(() => {
  globalThis.fetch = realFetch;
});

describe('App when every source loads', () => {
  it('shows no banner, and lists the bans at a tapped point', async () => {
    route({ [PROVINCIAL_URL]: BCWS_FEED, [BANS_API_PATH]: SERVER_EMPTY });
    renderApp();

    clickMap(...INSIDE);

    expect(await screen.findByText('6 fire bans in effect')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.queryByText(/bans may be missing/)).not.toBeInTheDocument();
  });

  it('says there are no bans at a point outside every ban area', async () => {
    route({ [PROVINCIAL_URL]: BCWS_FEED, [BANS_API_PATH]: SERVER_EMPTY });
    renderApp();
    await screen.findByTestId('map');
    await waitFor(() => expect(globalThis.fetch).toHaveBeenCalledTimes(2));

    clickMap(...OUTSIDE);

    expect(await screen.findByText('No fire bans found at this location')).toBeInTheDocument();
  });
});

describe('App when a source fails', () => {
  it('names the BC Wildfire Service in a banner, keeps the map, and warns in the panel', async () => {
    route({ [PROVINCIAL_URL]: unreachable, [BANS_API_PATH]: SERVER_EMPTY });
    renderApp();

    expect(await screen.findByRole('alert')).toHaveTextContent(
      "Couldn't load BC Wildfire Service. Bans may be missing from the map.",
    );
    expect(screen.getByTestId('map')).toBeInTheDocument();

    clickMap(...INSIDE);

    expect(screen.getByText('No fire bans found in the sources that loaded')).toBeInTheDocument();
    expect(screen.getByText("⚠ Some sources couldn't be checked, so bans may be missing.")).toBeInTheDocument();
    expect(screen.getByText('BC Wildfire Service: unavailable')).toBeInTheDocument();
  });

  it('still shows the provincial bans when the server is down, with a warning', async () => {
    route({ [PROVINCIAL_URL]: BCWS_FEED, [BANS_API_PATH]: unreachable });
    renderApp();

    expect(await screen.findByRole('alert')).toHaveTextContent("Couldn't load BC Fire Bans server.");

    clickMap(...INSIDE);

    expect(await screen.findByText('6 fire bans in effect')).toBeInTheDocument();
    expect(screen.getByText("⚠ Some sources couldn't be checked, so bans may be missing.")).toBeInTheDocument();
  });

  it('treats an ArcGIS error answer as a failed source', async () => {
    route({ [PROVINCIAL_URL]: answers({ error: { code: 500, message: 'Service unavailable' } }), [BANS_API_PATH]: SERVER_EMPTY });
    renderApp();

    expect(await screen.findByRole('alert')).toHaveTextContent("Couldn't load BC Wildfire Service.");
  });
});

describe('App when everything fails', () => {
  it('falls back to the empty map and names both sources in the banner', async () => {
    route({});
    renderApp();

    expect(await screen.findByRole('alert')).toHaveTextContent(
      "Couldn't load BC Wildfire Service and BC Fire Bans server.",
    );
    expect(screen.getByTestId('map')).toBeInTheDocument();

    clickMap(...INSIDE);

    expect(screen.getByText('No fire bans found in the sources that loaded')).toBeInTheDocument();
  });

  it('does not crash when both sources answer with garbage', async () => {
    route({ [PROVINCIAL_URL]: answers('<html>Bad Gateway</html>'), [BANS_API_PATH]: answers({}) });
    renderApp();

    expect(await screen.findByRole('alert')).toHaveTextContent(
      "Couldn't load BC Wildfire Service and BC Fire Bans server.",
    );
    expect(screen.getByTestId('map')).toBeInTheDocument();
  });
});

describe('App while sources are loading', () => {
  it('shows no banner and says the data is loading', async () => {
    route({ [PROVINCIAL_URL]: hangs, [BANS_API_PATH]: hangs });
    renderApp();

    clickMap(...INSIDE);

    expect(screen.getByText('Loading ban data…')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});

describe('App while a source is retried', () => {
  it('shows a retrying banner, then removes it and shows the bans when the retry succeeds', async () => {
    route({ [PROVINCIAL_URL]: failsThenAnswers(1, BCWS_2022_FEED), [BANS_API_PATH]: SERVER_EMPTY });
    renderApp({ retry: 1, retryDelay: 300 });

    expect(await screen.findByRole('alert')).toHaveTextContent(
      "⚠ Couldn't load ban data from BC Wildfire Service. Retrying…",
    );

    await waitFor(() => expect(screen.queryByRole('alert')).not.toBeInTheDocument());
    clickMap(...INSIDE);
    expect(screen.getByText('6 fire bans in effect')).toBeInTheDocument();
  });

  it('says the source is being retried in the panel while the retry is pending', async () => {
    route({ [PROVINCIAL_URL]: unreachable, [BANS_API_PATH]: SERVER_EMPTY });
    renderApp({ retry: 1, retryDelay: 5000 });
    await screen.findByRole('alert');

    clickMap(...INSIDE);

    expect(screen.getByText('Loading ban data…')).toBeInTheDocument();
    expect(screen.getByText("BC Wildfire Service: couldn't load, retrying…")).toBeInTheDocument();
  });

  it('switches from the retrying message to the missing-bans message once the retries run out', async () => {
    route({ [PROVINCIAL_URL]: unreachable, [BANS_API_PATH]: SERVER_EMPTY });
    renderApp({ retry: 1, retryDelay: 200 });

    expect(await screen.findByRole('alert')).toHaveTextContent('Retrying…');

    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent(
        "⚠ Couldn't load BC Wildfire Service. Bans may be missing from the map.",
      ),
    );
    expect(screen.getByRole('alert')).not.toHaveTextContent('Retrying…');
  });

  it('names the server in the retrying banner while a request to it is retried', async () => {
    route({ [PROVINCIAL_URL]: BCWS_FEED, [BANS_API_PATH]: unreachable });
    renderApp({ retry: 1, retryDelay: 5000 });

    expect(await screen.findByRole('alert')).toHaveTextContent(
      "⚠ Couldn't load ban data from BC Fire Bans server. Retrying…",
    );
  });
});
