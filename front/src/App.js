import { useCallback, useEffect, useState } from 'react';
import './App.css';

const emptyForm = {
  nom: '',
  email: '',
  age: '',
};

function App() {
  const [etudiants, setEtudiants] = useState([]);
  const [erreur, setErreur] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState(emptyForm);

  const apiBaseUrl = (process.env.REACT_APP_API_URL || window.location.origin).replace(/\/+$/, '');

  const fetchEtudiants = useCallback(async () => {
    try {
      setErreur('');
      const response = await fetch(`${apiBaseUrl}/api/etudiants`);
      if (!response.ok) {
        throw new Error('Impossible de charger les étudiants');
      }
      const data = await response.json();
      setEtudiants(Array.isArray(data) ? data : []);
    } catch (error) {
      setErreur(error.message);
    } finally {
      setIsLoading(false);
    }
  }, [apiBaseUrl]);

  useEffect(() => {
    fetchEtudiants();
  }, [fetchEtudiants]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    const payload = {
      nom: formData.nom.trim(),
      email: formData.email.trim(),
      age: Number(formData.age),
    };

    if (!payload.nom || !payload.email || Number.isNaN(payload.age) || payload.age <= 0) {
      setErreur('Veuillez remplir correctement le nom, l’email et l’âge.');
      return;
    }

    try {
      setIsSubmitting(true);
      setErreur('');

      const response = await fetch(`${apiBaseUrl}/api/etudiants`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(data?.message || 'Impossible de créer l’étudiant');
      }

      setFormData(emptyForm);
      await fetchEtudiants();
    } catch (error) {
      setErreur(error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      const response = await fetch(`${apiBaseUrl}/api/etudiants/${id}`, {
        method: 'DELETE',
      });

      const data = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(data?.message || 'Impossible de supprimer l’étudiant');
      }

      setEtudiants((students) => students.filter((student) => student._id !== id));
    } catch (error) {
      setErreur(error.message);
    }
  };

  return (
    <main className="App">
      <h1>Gestion des étudiants</h1>

      <form className="etudiant-form" onSubmit={handleSubmit}>
        <label className="field">
          <span>Nom</span>
          <input
            type="text"
            name="nom"
            value={formData.nom}
            onChange={handleChange}
            placeholder="Nom complet"
          />
        </label>

        <label className="field">
          <span>Email</span>
          <input
            type="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            placeholder="email@exemple.com"
          />
        </label>

        <label className="field">
          <span>Âge</span>
          <input
            type="number"
            min="1"
            name="age"
            value={formData.age}
            onChange={handleChange}
            placeholder="25"
          />
        </label>

        <button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Ajout...' : 'Ajouter l’étudiant'}
        </button>
      </form>

      {erreur && <p role="alert" className="error">{erreur}</p>}

      {isLoading ? (
        <p>Chargement des étudiants...</p>
      ) : etudiants.length === 0 ? (
        <p>Aucun étudiant pour le moment.</p>
      ) : (
        <ul className="student-list">
          {etudiants.map((etudiant) => (
            <li key={etudiant._id} className="student-item">
              <div>
                <strong>{etudiant.nom}</strong>
                <span>{etudiant.email}</span>
                <span>{etudiant.age} ans</span>
              </div>
              <button type="button" onClick={() => handleDelete(etudiant._id)}>
                Supprimer
              </button>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}

export default App;
