import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import App from './App';

afterEach(() => {
  jest.restoreAllMocks();
  sessionStorage.clear();
});

test('disables autocomplete on every login and registration input', () => {
  const { container } = render(<App />);

  expect([...container.querySelectorAll('input')].every((input) => input.autocomplete === 'off')).toBe(true);
  fireEvent.click(screen.getByRole('button', { name: 'Premier lancement ? Créer le compte' }));

  expect([...container.querySelectorAll('input')].every((input) => input.autocomplete === 'off')).toBe(true);
  expect(screen.getByLabelText('Nom')).toHaveAttribute('autocomplete', 'off');
});

test('shows an actionable message when authentication cannot reach the API', async () => {
  jest.spyOn(global, 'fetch').mockRejectedValue(new TypeError('Failed to fetch'));
  render(<App />);

  fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'ada@example.com' } });
  fireEvent.change(screen.getByLabelText('Mot de passe'), { target: { value: 'password' } });
  fireEvent.click(screen.getByRole('button', { name: 'Se connecter' }));

  expect(await screen.findByRole('alert')).toHaveTextContent(
    'Impossible de joindre le serveur API. Vérifiez son URL et sa configuration CORS.'
  );
});

test('disables autocomplete on student form and search inputs', async () => {
  sessionStorage.setItem('cms_session', JSON.stringify({
    token: 'test-token',
    user: { nom: 'Test' },
  }));
  jest.spyOn(global, 'fetch').mockResolvedValue({
    ok: true,
    json: async () => [],
  });

  render(<App />);

  const search = await screen.findByRole('searchbox', { name: 'Rechercher' });
  await waitFor(() => {
    expect(screen.getByLabelText('Nom')).toHaveAttribute('autocomplete', 'off');
  });
  expect(search).toHaveAttribute('autocomplete', 'off');
  expect(screen.getByLabelText('Âge')).toHaveAttribute('autocomplete', 'off');
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
