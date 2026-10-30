import { useRef, useState } from 'react';
import { Modal, StyleSheet, View, type GestureResponderEvent } from 'react-native';
import { Image } from 'expo-image';
import type { ImagePickerAsset } from 'expo-image-picker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button } from '@/components/ui/button';
import { IconButton } from '@/components/ui/icon-button';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { Text } from '@/components/ui/text';
import { colors, radius } from '@/constants/theme';
import type { PhotoEdit } from '@/lib/photos';

type Shape = 'original' | 'landscape' | 'square';

const SHAPES: { value: Shape; label: string }[] = [
  { value: 'original', label: 'Original' },
  { value: 'landscape', label: 'Liggende' },
  { value: 'square', label: 'Kvadrat' },
];

const MAX_ZOOM = 4;

const clamp = (value: number, max: number) => Math.min(max, Math.max(-max, value));

type PhotoEditorProps = {
  assets: ImagePickerAsset[];
  /** Ett valg per bilde, i samme rekkefølge. null betyr at bildet lastes opp som det er. */
  onDone: (edits: (PhotoEdit | null)[]) => void;
  onCancel: () => void;
};

/** Enkel beskjæring før opplasting, ett bilde om gangen: dra bildet i rammen, zoom, roter og velg form. Virker likt på mobil og PC. */
export function PhotoEditor({ assets, onDone, onCancel }: PhotoEditorProps) {
  const [edits, setEdits] = useState<(PhotoEdit | null)[]>([]);
  const index = edits.length;
  const last = index === assets.length - 1;

  const done = (edit: PhotoEdit | null) => {
    if (last) onDone([...edits, edit]);
    else setEdits([...edits, edit]);
  };

  return (
    <Modal visible animationType="slide" onRequestClose={onCancel}>
      <Editor
        key={index}
        asset={assets[index]}
        progress={assets.length > 1 ? `${index + 1} av ${assets.length}` : undefined}
        confirmLabel={last ? 'Last opp' : 'Neste bilde'}
        onDone={done}
        onCancel={onCancel}
      />
    </Modal>
  );
}

type EditorProps = {
  asset: ImagePickerAsset;
  /** F.eks. «2 av 3» når eieren har valgt flere bilder. */
  progress?: string;
  confirmLabel: string;
  onDone: (edit: PhotoEdit | null) => void;
  onCancel: () => void;
};

function Editor({ asset, progress, confirmLabel, onDone, onCancel }: EditorProps) {
  const insets = useSafeAreaInsets();
  const [stage, setStage] = useState({ width: 0, height: 0 });
  const [shape, setShape] = useState<Shape>('original');
  const [rotation, setRotation] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const drag = useRef({ pageX: 0, pageY: 0, x: 0, y: 0 });

  // Uten mål kan ikke bildet beskjæres, så da lastes det opp som det er
  const editable = asset.width > 0 && asset.height > 0;
  // Målene i det roterte bildet, som er det ImageManipulator beskjærer
  const turned = rotation % 180 !== 0;
  const imageWidth = turned ? asset.height : asset.width;
  const imageHeight = turned ? asset.width : asset.height;
  const ratio = shape === 'square' ? 1 : shape === 'landscape' ? 4 / 3 : imageWidth / imageHeight;
  const frameWidth = Math.min(stage.width, stage.height * ratio);
  const frameHeight = frameWidth / ratio;
  // Skjermpunkter per piksel. Med zoom 1 dekker bildet akkurat rammen.
  const scale = Math.max(frameWidth / imageWidth, frameHeight / imageHeight) * zoom;
  const x = clamp(offset.x, (imageWidth * scale - frameWidth) / 2);
  const y = clamp(offset.y, (imageHeight * scale - frameHeight) / 2);

  const zoomTo = (value: number) => {
    const next = Math.min(MAX_ZOOM, Math.max(1, value));
    // Det som er midt i rammen, blir der
    setOffset({ x: (x * next) / zoom, y: (y * next) / zoom });
    setZoom(next);
  };

  const rotate = () => {
    setRotation((rotation + 90) % 360);
    setZoom(1);
    setOffset({ x: 0, y: 0 });
  };

  const confirm = () => {
    if (shape === 'original' && rotation === 0 && zoom === 1) return onDone(null);
    const width = frameWidth / scale;
    const height = frameHeight / scale;
    const originX = Math.max(0, Math.round((imageWidth - width) / 2 - x / scale));
    const originY = Math.max(0, Math.round((imageHeight - height) / 2 - y / scale));
    onDone({
      rotate: rotation,
      crop: {
        originX,
        originY,
        width: Math.min(Math.round(width), imageWidth - originX),
        height: Math.min(Math.round(height), imageHeight - originY),
      },
    });
  };

  const startDrag = (event: GestureResponderEvent) => {
    drag.current = { pageX: event.nativeEvent.pageX, pageY: event.nativeEvent.pageY, x, y };
  };

  const moveDrag = (event: GestureResponderEvent) => {
    setOffset({
      x: drag.current.x + event.nativeEvent.pageX - drag.current.pageX,
      y: drag.current.y + event.nativeEvent.pageY - drag.current.pageY,
    });
  };

  const displayWidth = asset.width * scale;
  const displayHeight = asset.height * scale;

  return (
    <View style={[styles.screen, { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 16 }]}>
      <View style={styles.header}>
        <IconButton icon="close" variant="soft" accessibilityLabel="Avbryt" onPress={onCancel} />
        <View style={styles.title}>
          <Text variant="subheading" color="#FFFFFF" align="center">Beskjær bildet</Text>
          {progress && <Text variant="caption" color={colors.border} align="center">{progress}</Text>}
        </View>
        <View style={styles.headerSpacer} />
      </View>

      <View style={styles.stage} onLayout={(event) => setStage(event.nativeEvent.layout)}>
        {editable && frameWidth > 0 ? (
          <View
            style={[styles.frame, { width: frameWidth, height: frameHeight }]}
            onStartShouldSetResponder={() => true}
            onMoveShouldSetResponder={() => true}
            onResponderTerminationRequest={() => false}
            onResponderGrant={startDrag}
            onResponderMove={moveDrag}
            accessibilityLabel="Dra for å flytte bildet i rammen"
          >
            <Image
              source={{ uri: asset.uri }}
              style={{
                position: 'absolute',
                width: displayWidth,
                height: displayHeight,
                left: (frameWidth - displayWidth) / 2 + x,
                top: (frameHeight - displayHeight) / 2 + y,
                transform: [{ rotate: `${rotation}deg` }],
              }}
              contentFit="fill"
              draggable={false}
            />
          </View>
        ) : (
          <Image source={{ uri: asset.uri }} style={styles.fill} contentFit="contain" />
        )}
      </View>

      <View style={styles.footer}>
        {editable && (
          <>
            <View style={styles.tools}>
              <IconButton icon="remove" variant="soft" accessibilityLabel="Zoom ut" onPress={() => zoomTo(zoom / 1.25)} />
              <IconButton icon="add" variant="soft" accessibilityLabel="Zoom inn" onPress={() => zoomTo(zoom * 1.25)} />
              <IconButton icon="refresh" variant="soft" accessibilityLabel="Roter en kvart runde" onPress={rotate} />
            </View>
            <SegmentedControl
              options={SHAPES}
              value={shape}
              onChange={(value) => {
                setShape(value);
                setOffset({ x: 0, y: 0 });
              }}
            />
          </>
        )}
        <Button title={confirmLabel} icon="checkmark" onPress={confirm} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, paddingHorizontal: 16, backgroundColor: colors.ink },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  title: { flex: 1 },
  headerSpacer: { width: 40 },
  stage: { flex: 1, alignItems: 'center', justifyContent: 'center', marginVertical: 16 },
  frame: { overflow: 'hidden', borderRadius: radius.sm, backgroundColor: '#000000' },
  fill: { width: '100%', height: '100%' },
  footer: { gap: 14, width: '100%', maxWidth: 560, alignSelf: 'center' },
  tools: { flexDirection: 'row', justifyContent: 'center', gap: 16 },
});
