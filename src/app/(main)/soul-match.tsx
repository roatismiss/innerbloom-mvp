import { useRouter } from 'expo-router';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function SoulMatchScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      <Text style={s.title}>Soul Match</Text>
      <TouchableOpacity
        style={s.btn}
        activeOpacity={0.85}
        onPress={() => router.push('/match')}
      >
        <Text style={s.btnText}>BEGIN</Text>
      </TouchableOpacity>
    </View>
  );
}

const s = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#fff8f6',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  title: {
    fontFamily: 'NunitoSans_600SemiBold',
    fontSize: 32,
    lineHeight: 40,
    color: '#281814',
    letterSpacing: -0.32,
    marginBottom: 32,
  },
  btn: {
    backgroundColor: '#e8836b',
    paddingHorizontal: 48,
    paddingVertical: 16,
    borderRadius: 9999,
    shadowColor: '#994531',
    shadowOpacity: 0.20,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
  },
  btnText: {
    fontFamily: 'NunitoSans_600SemiBold',
    fontSize: 14,
    lineHeight: 20,
    color: '#641e0e',
    letterSpacing: 0.8,
  },
});
