import { useState } from 'react';
import { FlatList, Modal, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { Image } from 'expo-image';

import { colors, spacing } from '../../lib/theme';

const imageBaseUrl = 'https://splithub.ru/assets/img/products/';

export const photoUrl = (name: string) => (/^https?:\/\//.test(name) ? name : `${imageBaseUrl}${name}`);

type Props = { photos: string[]; height?: number };

// Product photos: swipe between them, tap to open full screen (the website's lightbox).
export function PhotoGallery({ photos, height = 300 }: Props) {
  const { width } = useWindowDimensions();
  const [index, setIndex] = useState(0);
  const [fullscreen, setFullscreen] = useState(false);
  const slideWidth = width - spacing.lg * 2;
  if (!photos.length) return null;

  return (
    <View>
      <FlatList
        data={photos}
        horizontal
        keyExtractor={(item, i) => `${i}-${item}`}
        onMomentumScrollEnd={(e) => setIndex(Math.round(e.nativeEvent.contentOffset.x / slideWidth))}
        pagingEnabled
        renderItem={({ item }) => (
          <Pressable accessibilityLabel="Открыть фото на весь экран" onPress={() => setFullscreen(true)}>
            <Image contentFit="contain" source={{ uri: photoUrl(item) }} style={[styles.image, { height, width: slideWidth }]} />
          </Pressable>
        )}
        showsHorizontalScrollIndicator={false}
      />
      {photos.length > 1 ? (
        <View style={styles.dots}>
          {photos.map((_, i) => <View key={i} style={[styles.dot, i === index && styles.dotActive]} />)}
        </View>
      ) : null}
      <Modal animationType="fade" onRequestClose={() => setFullscreen(false)} visible={fullscreen}>
        <View style={styles.fullscreen}>
          <FlatList
            data={photos}
            horizontal
            initialScrollIndex={index}
            getItemLayout={(_, i) => ({ index: i, length: width, offset: width * i })}
            keyExtractor={(item, i) => `full-${i}-${item}`}
            pagingEnabled
            renderItem={({ item }) => (
              <Image contentFit="contain" source={{ uri: photoUrl(item) }} style={{ height: '100%', width }} />
            )}
            showsHorizontalScrollIndicator={false}
          />
          <Pressable accessibilityLabel="Закрыть фото" hitSlop={12} onPress={() => setFullscreen(false)} style={styles.close}>
            <Text style={styles.closeText}>✕</Text>
          </Pressable>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  image: {
    backgroundColor: colors.card,
    borderRadius: 18,
  },
  dots: {
    flexDirection: 'row',
    gap: 6,
    justifyContent: 'center',
    marginTop: spacing.sm,
  },
  dot: {
    backgroundColor: colors.border,
    borderRadius: 4,
    height: 8,
    width: 8,
  },
  dotActive: {
    backgroundColor: colors.accent,
  },
  fullscreen: {
    backgroundColor: '#000000',
    flex: 1,
  },
  close: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 22,
    height: 44,
    justifyContent: 'center',
    position: 'absolute',
    right: spacing.lg,
    top: spacing.xl,
    width: 44,
  },
  closeText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '900',
  },
});
