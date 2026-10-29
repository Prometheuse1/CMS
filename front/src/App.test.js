import { render, screen } from '@testing-library/react';
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
