import { QueryClient } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, mock } from 'bun:test';
import { ReactNode } from 'react';
import { PROVINCIAL_URL, provincialCollector } from './collectors/provincial';
import { SERVER_BANS_URL } from './hooks/useBans';
import { BCWS_2022_FEED } from './test/bcws2022';

interface FakeMapProps {
  onClick: (e: { lngLat: { lat: number; lng: number } }) => void;
  children?: ReactNode;
}

/** Stand-in for the MapLibre map: buttons that click inside and outside the test feed's area, plus the layers. */
function FakeMap({ onClick, children }: FakeMapProps) {
  return (
    <div data-testid="map">
      <button type="button" onClick={() => onClick({ lngLat: { lat: 49.5, lng: -119.5 } })}>
        tap inside
      </button>
      <button type="button" onClick={() => onClick({ lngLat: { lat: 58, lng: -125 } })}>
        tap outside
      </button>
      {children}
    </div>
  );
}

mock.module('react-map-gl/maplibre', () => ({
  default: FakeMap,
  Source: ({ children }: { children?: ReactNode }) => <>{children}</>,
  Layer: () => null,
}));

mock.module('./collectors/browser', () => ({ BROWSER_COLLECTORS: [provincialCollector] }));

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
  return userEvent.setup();
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
    route({ [PROVINCIAL_URL]: BCWS_FEED, [SERVER_BANS_URL]: SERVER_EMPTY });
    const user = renderApp();

    await user.click(screen.getByText('tap inside'));

    expect(await screen.findByText('6 fire bans in effect')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.queryByText(/bans may be missing/)).not.toBeInTheDocument();
  });

  it('says there are no bans at a point outside every ban area', async () => {
    route({ [PROVINCIAL_URL]: BCWS_FEED, [SERVER_BANS_URL]: SERVER_EMPTY });
    const user = renderApp();
    await screen.findByText('tap inside');
    await waitFor(() => expect(globalThis.fetch).toHaveBeenCalledTimes(2));

    await user.click(screen.getByText('tap outside'));

    expect(await screen.findByText('No fire bans found at this location')).toBeInTheDocument();
  });
});

describe('App when a source fails', () => {
  it('names the BC Wildfire Service in a banner, keeps the map, and warns in the panel', async () => {
    route({ [PROVINCIAL_URL]: unreachable, [SERVER_BANS_URL]: SERVER_EMPTY });
    const user = renderApp();

    expect(await screen.findByRole('alert')).toHaveTextContent(
      "Couldn't load BC Wildfire Service. Bans may be missing from the map.",
    );
    expect(screen.getByTestId('map')).toBeInTheDocument();

    await user.click(screen.getByText('tap inside'));

    expect(screen.getByText('No fire bans found in the sources that loaded')).toBeInTheDocument();
    expect(screen.getByText("⚠ Some sources couldn't be checked, so bans may be missing.")).toBeInTheDocument();
    expect(screen.getByText('BC Wildfire Service: unavailable')).toBeInTheDocument();
  });

  it('still shows the provincial bans when the server is down, with a warning', async () => {
    route({ [PROVINCIAL_URL]: BCWS_FEED, [SERVER_BANS_URL]: unreachable });
    const user = renderApp();

    expect(await screen.findByRole('alert')).toHaveTextContent("Couldn't load BC Fire Bans server.");

    await user.click(screen.getByText('tap inside'));

    expect(await screen.findByText('6 fire bans in effect')).toBeInTheDocument();
    expect(screen.getByText("⚠ Some sources couldn't be checked, so bans may be missing.")).toBeInTheDocument();
  });

  it('treats an ArcGIS error answer as a failed source', async () => {
    route({ [PROVINCIAL_URL]: answers({ error: { code: 500, message: 'Service unavailable' } }), [SERVER_BANS_URL]: SERVER_EMPTY });
    renderApp();

    expect(await screen.findByRole('alert')).toHaveTextContent("Couldn't load BC Wildfire Service.");
  });
});

describe('App when everything fails', () => {
  it('falls back to the empty map and names both sources in the banner', async () => {
    route({});
    const user = renderApp();

    expect(await screen.findByRole('alert')).toHaveTextContent(
      "Couldn't load BC Wildfire Service and BC Fire Bans server.",
    );
    expect(screen.getByTestId('map')).toBeInTheDocument();

    await user.click(screen.getByText('tap inside'));

    expect(screen.getByText('No fire bans found in the sources that loaded')).toBeInTheDocument();
  });

  it('does not crash when both sources answer with garbage', async () => {
    route({ [PROVINCIAL_URL]: answers('<html>Bad Gateway</html>'), [SERVER_BANS_URL]: answers({}) });
    renderApp();

    expect(await screen.findByRole('alert')).toHaveTextContent(
      "Couldn't load BC Wildfire Service and BC Fire Bans server.",
    );
    expect(screen.getByTestId('map')).toBeInTheDocument();
  });
});

describe('App while sources are loading', () => {
  it('shows no banner and says the data is loading', async () => {
    route({ [PROVINCIAL_URL]: hangs, [SERVER_BANS_URL]: hangs });
    const user = renderApp();

    await user.click(screen.getByText('tap inside'));

    expect(screen.getByText('Loading ban data…')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});

describe('App while a source is retried', () => {
  it('shows a retrying banner, then removes it and shows the bans when the retry succeeds', async () => {
    route({ [PROVINCIAL_URL]: failsThenAnswers(1, BCWS_2022_FEED), [SERVER_BANS_URL]: SERVER_EMPTY });
    const user = renderApp({ retry: 1, retryDelay: 300 });

    expect(await screen.findByRole('alert')).toHaveTextContent(
      "⚠ Couldn't load ban data from BC Wildfire Service. Retrying…",
    );

    await waitFor(() => expect(screen.queryByRole('alert')).not.toBeInTheDocument());
    await user.click(screen.getByText('tap inside'));
    expect(screen.getByText('6 fire bans in effect')).toBeInTheDocument();
  });

  it('says the source is being retried in the panel while the retry is pending', async () => {
    route({ [PROVINCIAL_URL]: unreachable, [SERVER_BANS_URL]: SERVER_EMPTY });
    const user = renderApp({ retry: 1, retryDelay: 5000 });
    await screen.findByRole('alert');

    await user.click(screen.getByText('tap inside'));

    expect(screen.getByText('Loading ban data…')).toBeInTheDocument();
    expect(screen.getByText("BC Wildfire Service: couldn't load, retrying…")).toBeInTheDocument();
  });

  it('switches from the retrying message to the missing-bans message once the retries run out', async () => {
    route({ [PROVINCIAL_URL]: unreachable, [SERVER_BANS_URL]: SERVER_EMPTY });
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
    route({ [PROVINCIAL_URL]: BCWS_FEED, [SERVER_BANS_URL]: unreachable });
    renderApp({ retry: 1, retryDelay: 5000 });

    expect(await screen.findByRole('alert')).toHaveTextContent(
      "⚠ Couldn't load ban data from BC Fire Bans server. Retrying…",
    );
  });
});
