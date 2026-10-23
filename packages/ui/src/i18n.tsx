// Library entry points intentionally expose catalogues, hooks and providers together.
/* oxlint-disable react-refresh/only-export-components */
import { createInstance } from "i18next";
import { createContext, useContext, useEffect, useState } from "react";
import type { ReactNode } from "react";
import { I18nProvider } from "react-aria-components";
import { I18nextProvider, useTranslation } from "react-i18next";

const en = {
  cropHint:
    "Drag the photo or use arrow keys to choose the visible area. Shift + arrow moves faster.",
  cropFrame: "Photo crop",
  cropZoom: "Photo zoom",
  cropFit: "Fit to frame",
  cropApply: "Apply crop",
  cropLoadError: "The photo could not be loaded for cropping.",
  cancel: "Cancel",
  geometryPosition: "Position",
  geometrySize: "Dimensions",
  geometryWidth: "Width",
  geometryHeight: "Height",
  geometryRotation: "Rotation",
  positionMove: "Movement",
  positionStep: "Step: 1 mm",
  positionAlign: "Alignment",
  positionLayers: "Layer order",
  layerHigher: "Forward",
  layerLower: "Backward",
  dragLayer: "Drag layer",
  layerHint: "Top layers appear first. Drag the handle to reorder.",
  layerPosition: "Layer position",
  zoomOut: "Zoom out",
  zoomIn: "Zoom in",
  zoomHint: "100% fits the project to the workspace.",
  fitted: "The whole project is already fitted and centered.",
  pan: "Pan view",
  cutLine: "Cut / print boundary",
  safeLine: "Safe margin",
  bleedLine: "Bleed",
  galleryFull:
    "The photo limit is reached or this batch is too large. Remove unused photos. A full gallery allows replacing a file used only once.",
  removePhoto: "Remove from gallery",
  cropWarning: "Content outside the safe margin may be cropped.",
  safeAreaError:
    "Move or resize content into the safe area. Locked content requires a product configuration change.",
  editAction: "Edit",
  editHint: "Open the selected element’s properties.",
  rotateAction: "Rotate",
  rotateHint: "Set an angle in degrees, or drag the round rotation handle above the element.",
  flipHint: "Mirror the image horizontally.",
  duplicateHint: "Create an editable copy of this element.",
  removeHint: "Remove this element from the design. Undo restores it.",
  print: "Print",
  engraving: "Engraving",
  project: "Project",
  closePanel: "Close panel",
  settings: "Settings",
  advanced: "Advanced",
  photosEmpty: "Upload your first photo to make this design yours.",
  loading: "Loading…",
  photo: "Photo",
  addText: "Add text",
  images: "Images",
  artwork: "Artwork",
  templates: "Templates",
  undo: "Undo",
  redo: "Redo",
  confirm: "Confirm design",
  confirming: "Preparing files…",
  ready: "Design ready",
  controls: "Design controls",
  message: "Your message",
  font: "Font",
  size: "Text size (mm)",
  color: "Color",
  duplicate: "Duplicate",
  remove: "Delete",
  forward: "Bring forward",
  backward: "Send backward",
  fit: "Show whole project",
  flat: "2D design",
  mockup: "Mockup",
  mug: "3D preview",
  elements: "Elements",
  empty: "Add an element to begin.",
  panel: "Edit design",
  replace: "Replace selected photo",
  upload: "Add photos",
  vectorUpload: "Upload SVG",
  rotate: "Rotation (degrees)",
  width: "Width (mm)",
  height: "Height (mm)",
  x: "X (mm)",
  y: "Y (mm)",
  flipX: "Flip horizontally",
  flipY: "Flip vertically",
  alignLeft: "Align left",
  alignCenter: "Center horizontally",
  alignTop: "Align top",
  alignMiddle: "Center vertically",
  alignBottom: "Align bottom",
  alignRight: "Align right",
  lineHeight: "Line spacing",
  letterSpacing: "Letter spacing (mm)",
  zoom: "Zoom",
  error: "Unable to finish. Your design is preserved; correct the issue and retry.",
  no3d: "3D preview unavailable. Use the flat preview.",
  save: "Save design JSON",
  reopen: "Open design JSON",
  canvasLabel: "Design canvas. Use the element list and controls to edit with a keyboard.",
  crop: "Crop image",
  cropX: "Crop X (0–1)",
  cropY: "Crop Y (0–1)",
  cropWidth: "Crop width (0–1)",
  cropHeight: "Crop height (0–1)",
  moveLeft: "Move left",
  moveUp: "Move up",
  moveDown: "Move down",
  moveRight: "Move right",
  text: "Text",
  justify: "Justify",
  alignment: "Text alignment",
  left: "Left",
  center: "Center",
  right: "Right",
  sides: "Product sides and decoration areas",
  preview: "Design preview",
  locked: "Locked",
  emptyText: "Empty text",
  resetCrop: "Reset crop",
  snap: "Snap to edges and centers",
  layerMoved: "{{name}}. Layer position {{position}} of {{total}}.",
  layerPositionAnnouncement: "Layer position {{position}} of {{total}}.",
  galleryCount_one: "{{count}} photo of {{limit}}",
  galleryCount_few: "{{count}} photos of {{limit}}",
  galleryCount_many: "{{count}} photos of {{limit}}",
  galleryCount_other: "{{count}} photos of {{limit}}",
  pendingUploads_one: "Uploading {{count}} photo…",
  pendingUploads_few: "Uploading {{count}} photos…",
  pendingUploads_many: "Uploading {{count}} photos…",
  pendingUploads_other: "Uploading {{count}} photos…",
  photoLabel: "Photo {{id}}",
  removePhotoLabel: "Remove photo {{id}} from gallery",
  artworkLabel: "Artwork {{id}}",
  yourArtwork: "Your artwork",
  zoomControls: "Design controls: zoom",
  mugCanvasLabel:
    "Rotatable mug preview. Drag or use arrow keys to rotate; scroll or press plus/minus to zoom.",
  issueRequiredField: "{{label}} is required.",
  issueLowImageDpi: "Image resolution is below 300 effective DPI.",
  issueNonDurableAsset: "Upload this photo before confirming the design.",
  issueMissingFont: "The configured font is unavailable.",
  issueMissingAsset: "A photo is missing. Upload it again.",
  issueProhibitedAsset: "This photo format is not allowed.",
  issueProhibitedColor: "This color is not allowed.",
  issueProhibitedElement: "This element type is not allowed in this area.",
  issueUnsafeVector: "The artwork contains unsupported SVG geometry.",
  issueTemplatePermission: "Protected template content was changed. Restore the template.",
  issueGuidedElement: "Use the elements provided by this template.",
  issueInvalidConfiguration: "The product configuration is invalid. Contact the store.",
  issueInvalidDocument: "The design file is invalid. Open a valid design file.",
  issueUnsupportedSchema: "This design file version is unsupported.",
  issueConfigurationMismatch: "This design belongs to a different product or product version.",
  issueAreaMismatch: "The design areas do not match this product.",
  issueDuplicateSide: "Product side identifiers must be unique. Contact the store.",
  issueDuplicateArea: "Product area identifiers must be unique. Contact the store.",
  issueDuplicateElement: "Element identifiers must be unique.",
  issueInvalidBoundary: "The product boundary is invalid. Contact the store.",
  issueInvalidSlot: "A template field refers to an unavailable element. Contact the store.",
  issueInvalidMug: "The 3D preview configuration is invalid. Contact the store.",
  issueInvalidCrop: "The crop must fit inside the photo.",
  uploadUnsupportedType: "This file format is not supported. Choose another file.",
  uploadTooLarge: "This file is too large. Choose a smaller file.",
  uploadInvalidImage: "This photo could not be read. Choose another photo.",
  uploadInvalidSvg: "This SVG file could not be imported. Choose another file.",
  uploadFailed: "The file could not be uploaded. Try again.",
  resourceError: "A design resource could not be loaded. Try again.",
  uploadInvalidReplacement:
    "The selected photo can no longer be replaced. Select it and try again.",
  uploadGalleryCapacity: "The gallery is full. Remove unused photos and try again.",
  uploadNotPermitted: "Uploading photos is not permitted in this area.",
  uploadEngravingVectorRequired: "Engraving requires SVG artwork. Choose an SVG file.",
} as const;
const pl: FabrioTranslations = {
  cropHint:
    "Przeciągnij zdjęcie lub użyj strzałek, aby wybrać kadr. Shift + strzałka przesuwa szybciej.",
  cropFrame: "Kadr zdjęcia",
  cropZoom: "Powiększenie zdjęcia",
  cropFit: "Dopasuj do ramki",
  cropApply: "Zastosuj kadr",
  cropLoadError: "Nie udało się wczytać zdjęcia do kadrowania.",
  cancel: "Anuluj",
  geometryPosition: "Pozycja",
  geometrySize: "Rozmiar",
  geometryWidth: "Szerokość",
  geometryHeight: "Wysokość",
  geometryRotation: "Obrót",
  positionMove: "Przesuwanie",
  positionStep: "Krok: 1 mm",
  positionAlign: "Wyrównanie",
  positionLayers: "Kolejność warstw",
  layerHigher: "Wyżej",
  layerLower: "Niżej",
  dragLayer: "Przeciągnij warstwę",
  layerHint: "Warstwy na wierzchu są pierwsze. Przeciągnij uchwyt, aby zmienić kolejność.",
  layerPosition: "Pozycja warstwy",
  zoomOut: "Pomniejsz",
  zoomIn: "Powiększ",
  zoomHint: "100% dopasowuje projekt do miejsca pracy.",
  fitted: "Cały projekt jest już dopasowany i wyśrodkowany.",
  pan: "Przesuń widok",
  cutLine: "Linia cięcia / nadruku",
  safeLine: "Margines bezpieczeństwa",
  bleedLine: "Spad",
  galleryFull:
    "Osiągnięto limit zdjęć lub wybrano zbyt wiele plików. Usuń nieużywane zdjęcia. Przy pełnej galerii można zastąpić plik używany tylko raz.",
  removePhoto: "Usuń z galerii",
  cropWarning: "Zawartość poza marginesem bezpieczeństwa może zostać przycięta.",
  safeAreaError:
    "Przenieś lub zmniejsz zawartość do bezpiecznego obszaru. Zablokowany element wymaga poprawy konfiguracji produktu.",
  editAction: "Edytuj",
  editHint: "Otwórz właściwości zaznaczonego elementu.",
  rotateAction: "Obróć",
  rotateHint: "Wpisz kąt w stopniach lub przeciągnij okrągły uchwyt obrotu nad elementem.",
  flipHint: "Odbij zdjęcie w poziomie, jak w lustrze.",
  duplicateHint: "Utwórz edytowalną kopię tego elementu.",
  removeHint: "Usuń element z projektu. Możesz przywrócić go akcją Cofnij.",
  print: "Nadruk",
  engraving: "Grawer",
  project: "Projekt",
  closePanel: "Zamknij panel",
  settings: "Ustawienia",
  advanced: "Zaawansowane",
  photosEmpty: "Dodaj pierwsze zdjęcie i stwórz coś swojego.",
  loading: "Wczytywanie…",
  photo: "Zdjęcie",
  addText: "Dodaj tekst",
  images: "Zdjęcia",
  artwork: "Grafiki",
  templates: "Szablony",
  undo: "Cofnij",
  redo: "Ponów",
  confirm: "Zatwierdź projekt",
  confirming: "Przygotowywanie…",
  ready: "Projekt gotowy",
  controls: "Narzędzia projektu",
  message: "Twój tekst",
  font: "Czcionka",
  size: "Rozmiar tekstu (mm)",
  color: "Kolor",
  duplicate: "Powiel",
  remove: "Usuń",
  forward: "Przenieś wyżej",
  backward: "Przenieś niżej",
  fit: "Pokaż cały projekt",
  flat: "Projekt 2D",
  mockup: "Podgląd",
  mug: "Podgląd 3D",
  elements: "Elementy",
  empty: "Dodaj pierwszy element.",
  panel: "Edytuj element",
  replace: "Zastąp zaznaczone zdjęcie",
  upload: "Dodaj zdjęcia",
  vectorUpload: "Dodaj SVG",
  rotate: "Obrót (stopnie)",
  width: "Szerokość (mm)",
  height: "Wysokość (mm)",
  x: "X (mm)",
  y: "Y (mm)",
  flipX: "Odbij poziomo",
  flipY: "Odbij pionowo",
  alignLeft: "Wyrównaj do lewej",
  alignCenter: "Wyśrodkuj poziomo",
  alignTop: "Wyrównaj do góry",
  alignMiddle: "Wyśrodkuj pionowo",
  alignBottom: "Wyrównaj do dołu",
  alignRight: "Wyrównaj do prawej",
  lineHeight: "Interlinia",
  letterSpacing: "Odstępy liter (mm)",
  zoom: "Zoom",
  error: "Nie udało się ukończyć. Projekt zachowano; popraw błąd i spróbuj ponownie.",
  no3d: "Podgląd 3D niedostępny. Wróć do edycji.",
  save: "Pobierz projekt JSON",
  reopen: "Wczytaj projekt JSON",
  canvasLabel: "Projekt. Użyj listy elementów i narzędzi do edycji klawiaturą.",
  crop: "Kadruj zdjęcie",
  cropX: "Kadr X (0–1)",
  cropY: "Kadr Y (0–1)",
  cropWidth: "Szerokość kadru (0–1)",
  cropHeight: "Wysokość kadru (0–1)",
  moveLeft: "Przesuń w lewo",
  moveUp: "Przesuń w górę",
  moveDown: "Przesuń w dół",
  moveRight: "Przesuń w prawo",
  text: "Tekst",
  justify: "Wyjustuj",
  alignment: "Wyrównanie tekstu",
  left: "Do lewej",
  center: "Do środka",
  right: "Do prawej",
  sides: "Strony i obszary produktu",
  preview: "Podgląd projektu",
  locked: "Zablokowany",
  emptyText: "Pusty tekst",
  resetCrop: "Usuń kadrowanie",
  snap: "Przyciągaj do krawędzi i środków",
  layerMoved: "{{name}}. Pozycja warstwy {{position}} z {{total}}.",
  layerPositionAnnouncement: "Pozycja warstwy {{position}} z {{total}}.",
  galleryCount_one: "{{count}} zdjęcie z {{limit}}",
  galleryCount_few: "{{count}} zdjęcia z {{limit}}",
  galleryCount_many: "{{count}} zdjęć z {{limit}}",
  galleryCount_other: "{{count}} zdjęcia z {{limit}}",
  pendingUploads_one: "Przesyłanie {{count}} zdjęcia…",
  pendingUploads_few: "Przesyłanie {{count}} zdjęć…",
  pendingUploads_many: "Przesyłanie {{count}} zdjęć…",
  pendingUploads_other: "Przesyłanie {{count}} zdjęcia…",
  photoLabel: "Zdjęcie {{id}}",
  removePhotoLabel: "Usuń zdjęcie {{id}} z galerii",
  artworkLabel: "Grafika {{id}}",
  yourArtwork: "Twój projekt",
  zoomControls: "Narzędzia projektu: powiększenie",
  mugCanvasLabel:
    "Obrotowy podgląd kubka. Przeciągnij lub użyj strzałek, aby obrócić; przewiń lub naciśnij plus/minus, aby zmienić powiększenie.",
  issueRequiredField: "Pole {{label}} jest wymagane.",
  issueLowImageDpi: "Rozdzielczość zdjęcia jest niższa niż 300 efektywnych DPI.",
  issueNonDurableAsset: "Prześlij zdjęcie przed zatwierdzeniem projektu.",
  issueMissingFont: "Skonfigurowana czcionka jest niedostępna.",
  issueMissingAsset: "Brakuje zdjęcia. Prześlij je ponownie.",
  issueProhibitedAsset: "Ten format zdjęcia jest niedozwolony.",
  issueProhibitedColor: "Ten kolor jest niedozwolony.",
  issueProhibitedElement: "Ten typ elementu jest niedozwolony w tym obszarze.",
  issueUnsafeVector: "Grafika zawiera nieobsługiwaną geometrię SVG.",
  issueTemplatePermission: "Zmieniono chronioną zawartość szablonu. Przywróć szablon.",
  issueGuidedElement: "Użyj elementów dostępnych w tym szablonie.",
  issueInvalidConfiguration: "Konfiguracja produktu jest nieprawidłowa. Skontaktuj się ze sklepem.",
  issueInvalidDocument: "Plik projektu jest nieprawidłowy. Otwórz poprawny plik projektu.",
  issueUnsupportedSchema: "Ta wersja pliku projektu jest nieobsługiwana.",
  issueConfigurationMismatch: "Projekt dotyczy innego produktu lub innej wersji produktu.",
  issueAreaMismatch: "Obszary projektu nie odpowiadają temu produktowi.",
  issueDuplicateSide:
    "Identyfikatory stron produktu muszą być unikalne. Skontaktuj się ze sklepem.",
  issueDuplicateArea:
    "Identyfikatory obszarów produktu muszą być unikalne. Skontaktuj się ze sklepem.",
  issueDuplicateElement: "Identyfikatory elementów muszą być unikalne.",
  issueInvalidBoundary: "Granica obszaru produktu jest nieprawidłowa. Skontaktuj się ze sklepem.",
  issueInvalidSlot: "Pole szablonu wskazuje niedostępny element. Skontaktuj się ze sklepem.",
  issueInvalidMug: "Konfiguracja podglądu 3D jest nieprawidłowa. Skontaktuj się ze sklepem.",
  issueInvalidCrop: "Kadr musi mieścić się w zdjęciu.",
  uploadUnsupportedType: "Ten format pliku jest nieobsługiwany. Wybierz inny plik.",
  uploadTooLarge: "Ten plik jest zbyt duży. Wybierz mniejszy plik.",
  uploadInvalidImage: "Nie udało się odczytać zdjęcia. Wybierz inne zdjęcie.",
  uploadInvalidSvg: "Nie udało się zaimportować pliku SVG. Wybierz inny plik.",
  uploadFailed: "Nie udało się przesłać pliku. Spróbuj ponownie.",
  resourceError: "Nie udało się wczytać zasobu projektu. Spróbuj ponownie.",
  uploadInvalidReplacement:
    "Nie można już zastąpić zaznaczonego zdjęcia. Zaznacz je i spróbuj ponownie.",
  uploadGalleryCapacity: "Galeria jest pełna. Usuń nieużywane zdjęcia i spróbuj ponownie.",
  uploadNotPermitted: "Przesyłanie zdjęć jest niedozwolone w tym obszarze.",
  uploadEngravingVectorRequired: "Grawer wymaga grafiki SVG. Wybierz plik SVG.",
};

/** All translation entries in a flat catalogue. Hosts can override individual entries. */
export type FabrioTranslations = { [K in keyof typeof en]: string };
/** Bundled English and Polish catalogues. */
export const fabrioTranslations = { en, pl };

/** Partial catalogues indexed by BCP 47 language tag, without an i18next namespace. */
export type FabrioTranslationResources = Record<string, Partial<FabrioTranslations>>;

type PluralKey<K> = K extends `${infer Base}_${"one" | "few" | "many" | "other"}` ? Base : K;
export type FabrioTranslationKey = PluralKey<keyof typeof en>;
type Entry<K extends FabrioTranslationKey> = K extends keyof typeof en
  ? (typeof en)[K]
  : `${K}_other` extends keyof typeof en
    ? (typeof en)[`${K}_other`]
    : never;
type ParametersIn<S extends string> = S extends `${string}{{${infer P}}}${infer Rest}`
  ? P | ParametersIn<Rest>
  : never;
type TranslationParams<K extends FabrioTranslationKey> = {
  [P in ParametersIn<Entry<K>>]: P extends "count" ? number : string | number;
};
/** Translation function with required interpolation parameters inferred from the bundled catalogue. */
export type FabrioTranslate = <K extends FabrioTranslationKey>(
  key: K,
  ...args: [ParametersIn<Entry<K>>] extends [never]
    ? [params?: Record<string, never>]
    : [params: TranslationParams<K>]
) => string;

type TranslationContext = { instance: ReturnType<typeof createInstance>; locale: string };
const Context = createContext<TranslationContext | null>(null);
const catalogs = (resources: FabrioTranslationResources = {}) => {
  const merged: Record<string, { fabrio: Partial<FabrioTranslations> }> = {
    en: { fabrio: { ...en } },
    pl: { fabrio: { ...pl } },
  };
  for (const [language, entries] of Object.entries(resources)) {
    const tag = Intl.getCanonicalLocales(language)[0]!;
    merged[tag] = { fabrio: { ...merged[tag]?.fabrio, ...entries } };
  }
  return merged;
};

/**
 * Provides isolated, synchronous translations and React Aria locale handling.
 * Locale defaults to English. Changing locale preserves the provider's i18next instance.
 */
export function FabrioI18nProvider({
  locale,
  resources,
  children,
}: {
  locale?: string;
  resources?: FabrioTranslationResources;
  children: ReactNode;
}) {
  const language = Intl.getCanonicalLocales(locale ?? "en")[0] ?? "en";
  const [instance] = useState(() => {
    const value = createInstance();
    void value.init({
      lng: language,
      fallbackLng: "en",
      ns: ["fabrio"],
      defaultNS: "fabrio",
      resources: catalogs(resources),
      initAsync: false,
      interpolation: { escapeValue: false },
      react: { useSuspense: false },
    });
    return value;
  });
  useEffect(() => {
    for (const existing of Object.keys(instance.store.data)) {
      instance.removeResourceBundle(existing, "fabrio");
    }
    for (const [tag, bundle] of Object.entries(catalogs(resources))) {
      instance.addResourceBundle(tag, "fabrio", bundle.fabrio);
    }
    void instance.changeLanguage(language);
  }, [instance, language, resources]);
  return (
    <Context.Provider value={{ instance, locale: language }}>
      <I18nextProvider i18n={instance} defaultNS="fabrio">
        <I18nProvider locale={language}>{children}</I18nProvider>
      </I18nextProvider>
    </Context.Provider>
  );
}

/** Checks internally whether the standalone editor already has a translation provider. */
export const useHasFabrioI18n = () => useContext(Context) !== null;

/** Reads the current locale and translates a typed Fabrio catalogue key. */
export function useFabrioTranslation(): { locale: string; dir: "ltr" | "rtl"; t: FabrioTranslate } {
  const context = useContext(Context);
  if (!context) throw new Error("Fabrio UI panels require FabrioI18nProvider.");
  const { i18n } = useTranslation("fabrio", {
    i18n: context.instance,
    useSuspense: false,
  });
  // The local callable cast keeps a consumer's global CustomTypeOptions out of this API.
  const fixedTranslate = i18n.getFixedT(context.locale, "fabrio") as unknown as (
    key: string,
    options?: Record<string, unknown>,
  ) => string;
  const translate = (key: string, params?: Record<string, string | number>) => {
    if (!params) return fixedTranslate(key);
    const formatter = new Intl.NumberFormat(context.locale);
    // i18next's replace option separates displayed values from the numeric count used for plural rules.
    const replace = Object.fromEntries(
      Object.entries(params).map(([name, value]) => [
        name,
        typeof value === "number" ? formatter.format(value) : value,
      ]),
    );
    return fixedTranslate(key, { ...params, replace });
  };
  return { locale: context.locale, dir: i18n.dir(context.locale), t: translate as FabrioTranslate };
}

/** Supplies English only when an editor has no external Fabrio provider. */
export function FabrioI18nBoundary({ children }: { children: ReactNode }) {
  const provided = useHasFabrioI18n();
  return provided ? children : <FabrioI18nProvider>{children}</FabrioI18nProvider>;
}
