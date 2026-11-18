/** Initiales de l'ID public : nom puis prénom, sans accent ni espace. */
export function filaxInitials(lastName: string, firstName: string) {
  const initial = (value: string, fallback: string) => {
    const letter = value.trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "").match(/[a-z]/i)?.[0];
    return (letter ?? fallback).toUpperCase();
  };
  return `${initial(lastName, "X")}${initial(firstName, "X")}`;
}

/** ID local de l'espace d'essai ; il ne vaut ni vérification ni session authentifiée. */
export function discoveryFilaxId(lastName: string, firstName: string, random = () => Math.random()) {
  const digits = Math.floor(random() * 10_000).toString().padStart(4, "0");
  return `FLX-${digits}-${filaxInitials(lastName, firstName)}`;
}
