import { spacing } from './theme';

type VerticalInsets = {
  bottom: number;
  top: number;
};

export function tabScreenPadding(insets: VerticalInsets) {
  return {
    paddingBottom: insets.bottom + 96,
    paddingTop: insets.top + spacing.lg,
  };
}

export function stackScreenPadding(insets: VerticalInsets) {
  return {
    paddingBottom: insets.bottom + 80,
  };
}
