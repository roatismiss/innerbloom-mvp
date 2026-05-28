import * as ImageManipulator from 'expo-image-manipulator';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
} from 'react-native-reanimated';
import Svg, { Circle, Defs, Mask, Rect } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const C = {
  primary:            '#994531',
  primaryContainer:   '#e8836b',
  onPrimaryContainer: '#641e0e',
  onSurface:          '#281814',
  outline:            '#88726d',
} as const;

interface Props {
  uri: string;
  onCrop: (croppedUri: string) => void;
  onCancel: () => void;
}

export function AvatarCropModal({ uri, onCrop, onCancel }: Props) {
  const { width: W, height: H } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const R = Math.min(W, H) * 0.38;

  const [naturalW, setNaturalW] = useState(1);
  const [naturalH, setNaturalH] = useState(1);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    Image.getSize(uri, (w, h) => {
      setNaturalW(w);
      setNaturalH(h);
    });
  }, [uri]);

  // Initial scale: image fills the circle (no empty space inside the ring)
  const diameter = R * 2;
  const fitScale = Math.max(diameter / naturalW, diameter / naturalH);

  // Gesture state
  const panX      = useSharedValue(0);
  const panY      = useSharedValue(0);
  const zoom      = useSharedValue(1);
  const savedPanX = useSharedValue(0);
  const savedPanY = useSharedValue(0);
  const savedZoom = useSharedValue(1);

  const panGesture = Gesture.Pan()
    .onUpdate((e) => {
      panX.value = savedPanX.value + e.translationX;
      panY.value = savedPanY.value + e.translationY;
    })
    .onEnd(() => {
      savedPanX.value = panX.value;
      savedPanY.value = panY.value;
    });

  const pinchGesture = Gesture.Pinch()
    .onUpdate((e) => {
      zoom.value = Math.max(0.8, Math.min(5, savedZoom.value * e.scale));
    })
    .onEnd(() => {
      savedZoom.value = zoom.value;
    });

  const composed = Gesture.Simultaneous(panGesture, pinchGesture);

  const imgDispW = naturalW * fitScale;
  const imgDispH = naturalH * fitScale;

  const imageStyle = useAnimatedStyle(() => ({
    width:  imgDispW,
    height: imgDispH,
    position: 'absolute',
    left: W / 2 - imgDispW / 2,
    top:  H / 2 - imgDispH / 2,
    transform: [
      { translateX: panX.value },
      { translateY: panY.value },
      { scale: zoom.value },
    ],
  }));

  async function handleConfirm() {
    if (saving) return;
    setSaving(true);
    try {
      const totalScale = fitScale * zoom.value;
      const cropDiameter = (diameter) / totalScale;

      const originX = Math.max(
        0,
        naturalW / 2 - panX.value / totalScale - cropDiameter / 2,
      );
      const originY = Math.max(
        0,
        naturalH / 2 - panY.value / totalScale - cropDiameter / 2,
      );
      const size = Math.min(
        cropDiameter,
        naturalW - originX,
        naturalH - originY,
      );

      const result = await ImageManipulator.manipulateAsync(
        uri,
        [
          { crop: { originX, originY, width: size, height: size } },
          { resize: { width: 480, height: 480 } },
        ],
        { compress: 0.88, format: ImageManipulator.SaveFormat.JPEG },
      );
      onCrop(result.uri);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal visible animationType="fade" statusBarTranslucent>
      <View style={[s.root, { width: W, height: H }]}>

        {/* Draggable / zoomable image */}
        <GestureDetector gesture={composed}>
          <Animated.Image source={{ uri }} style={imageStyle} resizeMode="cover" />
        </GestureDetector>

        {/* Dark mask with circular hole */}
        <Svg style={StyleSheet.absoluteFill} pointerEvents="none">
          <Defs>
            <Mask id="hole">
              <Rect width={W} height={H} fill="white" />
              <Circle cx={W / 2} cy={H / 2} r={R} fill="black" />
            </Mask>
          </Defs>
          <Rect width={W} height={H} fill="rgba(0,0,0,0.62)" mask="url(#hole)" />
        </Svg>

        {/* Circle guide ring */}
        <View
          pointerEvents="none"
          style={[
            s.ring,
            {
              width: R * 2 + 4,
              height: R * 2 + 4,
              borderRadius: R + 2,
              left: W / 2 - R - 2,
              top: H / 2 - R - 2,
            },
          ]}
        />

        {/* Instruction */}
        <View style={[s.topHint, { top: insets.top + 16 }]}>
          <Text style={s.hintText}>Move & pinch to position your face</Text>
        </View>

        {/* Bottom actions */}
        <View style={[s.footer, { paddingBottom: insets.bottom + 16 }]}>
          <TouchableOpacity style={s.cancelBtn} onPress={onCancel} activeOpacity={0.75}>
            <Text style={s.cancelText}>Cancel</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={s.useBtn}
            onPress={handleConfirm}
            activeOpacity={0.85}
            disabled={saving}
          >
            {saving
              ? <ActivityIndicator color={C.onPrimaryContainer} />
              : <Text style={s.useText}>Use Photo</Text>
            }
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  root: { backgroundColor: '#000', overflow: 'hidden' },

  ring: {
    position: 'absolute',
    borderWidth: 2.5,
    borderColor: 'rgba(255,255,255,0.9)',
  },

  topHint: {
    position: 'absolute',
    alignSelf: 'center',
    backgroundColor: 'rgba(0,0,0,0.45)',
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 9999,
  },
  hintText: {
    color: 'rgba(255,255,255,0.88)',
    fontFamily: 'NunitoSans_400Regular',
    fontSize: 13,
  },

  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    paddingHorizontal: 24,
    paddingTop: 20,
    gap: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelBtn: {
    flex: 1,
    height: 52,
    borderRadius: 9999,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelText: {
    fontFamily: 'NunitoSans_600SemiBold',
    fontSize: 14,
    color: 'rgba(255,255,255,0.85)',
    letterSpacing: 0.5,
  },
  useBtn: {
    flex: 1,
    height: 52,
    borderRadius: 9999,
    backgroundColor: C.primaryContainer,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: C.primary,
    shadowOpacity: 0.25,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  useText: {
    fontFamily: 'NunitoSans_600SemiBold',
    fontSize: 14,
    color: C.onPrimaryContainer,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
});
