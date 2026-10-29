import { act, render, screen } from '@testing-library/react';
import App from './App';

afterEach(() => {
  jest.restoreAllMocks();
});

test('renders students returned by the API', async () => {
  jest.spyOn(global, 'fetch').mockResolvedValue({
    ok: true,
    json: async () => [{ _id: '1', nom: 'Ada Lovelace', email: 'ada@example.com' }],
  });

  render(<App />);

  expect(await screen.findByText('Ada Lovelace — ada@example.com')).toBeInTheDocument();
});

test('displays an error when the API request fails', async () => {
  jest.spyOn(global, 'fetch').mockResolvedValue({ ok: false });

  render(<App />);

  expect(await screen.findByRole('alert')).toHaveTextContent(
    'Impossible de charger les étudiants'
  );
});

test('removes a trailing slash from the API URL', async () => {
  const originalApiUrl = process.env.REACT_APP_API_URL;
  process.env.REACT_APP_API_URL = 'https://api.example.com/';
  jest.spyOn(global, 'fetch').mockResolvedValue({
    ok: true,
    json: async () => [],
  });

  try {
    await act(async () => {
      render(<App />);
    });

    expect(global.fetch).toHaveBeenCalledWith(
      'https://api.example.com/api/etudiants',
      expect.objectContaining({ signal: expect.any(AbortSignal) })
    );
  } finally {
    if (originalApiUrl === undefined) {
      delete process.env.REACT_APP_API_URL;
    } else {
      process.env.REACT_APP_API_URL = originalApiUrl;
    }
  }
});
