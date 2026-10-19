import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import type { ImagePickerAsset } from 'expo-image-picker';
import { deleteObject, getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { storage } from './firebase';
import { shortId } from './salons';

/** Må stemme med validPhotos() i firestore.rules. */
export const MAX_PHOTOS = 8;

// Lengste side. Store nok for salongsiden på PC, og bare et par hundre kB hver.
const MAX_SIDE = 1600;

/** Gjør bildet mindre, laster det opp og gir adressen det vises fra. */
export async function uploadSalonPhoto(salonId: string, asset: ImagePickerAsset) {
  const context = ImageManipulator.manipulate(asset.uri);
  // Bredde og høyde kan være 0 hvis systemet ikke vet dem. Da lagres bildet bare som JPEG.
  if (Math.max(asset.width, asset.height) > MAX_SIDE) {
    context.resize(asset.width >= asset.height ? { width: MAX_SIDE } : { height: MAX_SIDE });
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
