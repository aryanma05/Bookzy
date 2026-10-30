import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import type { ImagePickerAsset } from 'expo-image-picker';
import { deleteObject, getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { storage } from './firebase';
import { shortId } from './salons';

/** Må stemme med validPhotos() i firestore.rules. */
export const MAX_PHOTOS = 8;

// Lengste side. Store nok for salongsiden på PC, og bare et par hundre kB hver.
const MAX_SIDE = 1600;

/** Småbildene av tjenestene vises bare noen få cm store. */
export const THUMBNAIL_SIDE = 400;

/** Det eieren valgte i beskjæringen. Utsnittet er i piksler i det roterte bildet. */
export type PhotoEdit = {
  rotate: number;
  crop: { originX: number; originY: number; width: number; height: number };
};

/** Gjør bildet mindre, laster det opp og gir adressen det vises fra. */
export async function uploadSalonPhoto(salonId: string, asset: ImagePickerAsset, maxSide = MAX_SIDE, edit?: PhotoEdit | null) {
  const context = ImageManipulator.manipulate(asset.uri);
  if (edit) context.rotate(edit.rotate).crop(edit.crop);
  // Bredde og høyde kan være 0 hvis systemet ikke vet dem. Da lagres bildet bare som JPEG.
  const { width, height } = edit ? edit.crop : asset;
  if (Math.max(width, height) > maxSide) {
    context.resize(width >= height ? { width: maxSide } : { height: maxSide });
  }
  const image = await (await context.renderAsync()).saveAsync({ format: SaveFormat.JPEG, compress: 0.8 });
  const blob = await (await fetch(image.uri)).blob();

  const file = ref(storage, `salons/${salonId}/${shortId()}${shortId()}.jpg`);
  await uploadBytes(file, blob, { contentType: 'image/jpeg' });
  return getDownloadURL(file);
}

/** Sletter filen i Storage. Eksempelbilder fra andre nettsider hoppes over. */
export async function deleteSalonPhoto(url: string) {
  let file;
  try {
    file = ref(storage, url);
  } catch {
    return;
  }
  await deleteObject(file);
}
