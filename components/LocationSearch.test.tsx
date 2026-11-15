import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, mock } from 'bun:test';
import { LocationSearch } from './LocationSearch';

const realFetch = globalThis.fetch;
const answer = (body: unknown) => {
  const fetchMock = mock(async (_url: string) => ({ ok: true, status: 200, json: async () => body }));
  globalThis.fetch = fetchMock as unknown as typeof fetch;
  return fetchMock;
};
const setGeolocation = (value: unknown) => Object.defineProperty(navigator, 'geolocation', { value, configurable: true });

const KAMLOOPS = { display_name: 'Kamloops, BC', lat: '50.67', lon: '-120.33' };
const KELOWNA = { display_name: 'Kelowna, BC', lat: '49.89', lon: '-119.5' };

afterEach(() => {
  globalThis.fetch = realFetch;
  setGeolocation(undefined);
});

/** Renders the search and returns the callback it reports locations to. */
const setup = () => {
  const onLocate = mock();
  render(<LocationSearch onLocate={onLocate} />);
  return { onLocate, user: userEvent.setup() };
};

const searchFor = async (user: ReturnType<typeof userEvent.setup>, text: string) => {
  await user.type(screen.getByRole('searchbox', { name: 'Search for a place' }), text);
  await user.click(screen.getByRole('button', { name: 'Search' }));
};

describe('LocationSearch place search', () => {
  it('goes straight to a single match', async () => {
    answer([KAMLOOPS]);
    const { onLocate, user } = setup();
    await searchFor(user, 'Kamloops');
    await waitFor(() => expect(onLocate).toHaveBeenCalledWith({ latitude: 50.67, longitude: -120.33 }));
    expect(screen.queryByRole('list')).not.toBeInTheDocument();
  });

  it('lists several matches and reports the one picked', async () => {
    answer([KAMLOOPS, KELOWNA]);
    const { onLocate, user } = setup();
    await searchFor(user, 'K');
    expect(await screen.findByRole('button', { name: 'Kelowna, BC' })).toBeInTheDocument();
    expect(onLocate).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: 'Kelowna, BC' }));

    expect(onLocate).toHaveBeenCalledWith({ latitude: 49.89, longitude: -119.5 });
    expect(screen.queryByRole('list')).not.toBeInTheDocument();
  });

  it('says so when nothing is found', async () => {
    answer([]);
    const { onLocate, user } = setup();
    await searchFor(user, 'Nowhere');
    expect(await screen.findByText('No places found in British Columbia')).toBeInTheDocument();
    expect(onLocate).not.toHaveBeenCalled();
  });

  it('says so when the search fails', async () => {
    globalThis.fetch = mock(async () => {
      throw new TypeError('Failed to fetch');
    }) as unknown as typeof fetch;
    const { onLocate, user } = setup();
    await searchFor(user, 'Kamloops');
    expect(await screen.findByText('Place search isn’t available right now')).toBeInTheDocument();
    expect(onLocate).not.toHaveBeenCalled();
  });

  it('does not search for blank text', async () => {
    const fetchMock = answer([]);
    const { user } = setup();
    await user.type(screen.getByRole('searchbox'), '   ');
    expect(screen.getByRole('button', { name: 'Search' })).toBeDisabled();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe('LocationSearch my location', () => {
  it('reports the device position', async () => {
    setGeolocation({ getCurrentPosition: (ok: (p: unknown) => void) => ok({ coords: { latitude: 49.2, longitude: -123.1 } }) });
    const { onLocate, user } = setup();
    await user.click(screen.getByRole('button', { name: 'My location' }));
    await waitFor(() => expect(onLocate).toHaveBeenCalledWith({ latitude: 49.2, longitude: -123.1 }));
  });

  it('says so when location access is blocked', async () => {
    setGeolocation({ getCurrentPosition: (_ok: unknown, fail: (e: unknown) => void) => fail({ code: 1, PERMISSION_DENIED: 1, message: 'denied' }) });
    const { onLocate, user } = setup();
    await user.click(screen.getByRole('button', { name: 'My location' }));
    expect(await screen.findByText(/^Location access was blocked/)).toBeInTheDocument();
    expect(onLocate).not.toHaveBeenCalled();
  });
});
