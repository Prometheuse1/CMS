import { useEffect, useState } from 'react';
import './App.css';

function App() {
  const [etudiants, setEtudiants] = useState([]);
  const [erreur, setErreur] = useState('');

  useEffect(() => {
    const controller = new AbortController();

    fetch('http://localhost:5000/api/etudiants', {
      signal: controller.signal,
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error('Impossible de charger les étudiants');
        }
        return response.json();
      })
      .then((data) => setEtudiants(data))
      .catch((error) => {
        if (error.name !== 'AbortError') {
          setErreur(error.message);
        }
      });

    return () => controller.abort();
  }, []);

  return (
    <main className="App">
      <h1>Gestion des étudiants</h1>
      {erreur && <p role="alert">{erreur}</p>}
      <ul>
        {etudiants.map((etudiant) => (
          <li key={etudiant._id}>
            {etudiant.nom} — {etudiant.email}
          </li>
        ))}
      </ul>
    </main>
  );
}

export default App;
