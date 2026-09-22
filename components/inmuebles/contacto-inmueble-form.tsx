"use client";

import { useState } from "react";

import { crearContactoInmueble } from "@/lib/actions/contactos";
import { ContactoForm } from "@/components/clientes/contacto-form";
import { ClientePicker } from "@/components/shared/cliente-picker";
import { Field } from "@/components/shared/form";

type Persona = { id: string; label: string };

/**
 * Contact about a property. The person defaults to the owner; whoever is
 * picked also gets the note in their history and their «último contacto» updated.
 */
export function ContactoInmuebleForm({
  inmuebleId,
  propietario,
}: {
  inmuebleId: string;
  propietario: Persona | null;
}) {
  const [persona, setPersona] = useState<Persona | null>(propietario);

  return (
    <ContactoForm
      registrar={({ nota }) => crearContactoInmueble(inmuebleId, { nota, clienteId: persona?.id ?? "" })}
    >
      <Field
        label="Persona contactada"
        optional
        hint={
          persona
            ? "La nota también aparecerá en su ficha y se actualizará su último contacto."
            : "Sin persona, el contacto queda solo en el historial del inmueble."
        }
      >
        <ClientePicker
          value={persona?.id ?? null}
          valueLabel={persona?.label}
          onChange={setPersona}
          placeholder="Buscar cliente…"
        />
      </Field>
    </ContactoForm>
  );
}
