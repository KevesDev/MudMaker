import { ClientProfileBook } from "../prefs";
import { ADAPTERS } from "./playLayout";

/** The one set of saved worlds of this window; the preferences store restores and saves it. */
export const clientProfiles = new ClientProfileBook(ADAPTERS.map((adapter) => adapter.value));
