import { HStack, Image, Spacer, Text, VStack } from '@expo/ui/swift-ui';
import {
  activityBackgroundTint,
  font,
  foregroundStyle,
  monospacedDigit,
  padding,
} from '@expo/ui/swift-ui/modifiers';
import { createLiveActivity, type LiveActivityEnvironment } from 'expo-widgets';

/** Content state sent to the Live Activity. Props are JSON-serialized, so times are epoch ms. */
export type RunActivityProps = {
  paused: boolean;
  distanceKm: string;
  pace: string;
  /** Virtual start time: now - elapsed. The system timer counts up from here. */
  timerStartMs: number;
  /** Set while paused so the timer stays frozen at the elapsed time. */
  pausedAtMs: number | null;
};

/*
 * Runs in the widget extension's isolated runtime: only @expo/ui/swift-ui components,
 * no hooks, no module-scope values. Lowercase name keeps the React Compiler away from it.
 */
const runActivityLayout = (props: RunActivityProps, environment: LiveActivityEnvironment) => {
  'widget';
  const accent = environment.isLuminanceReduced ? '#FFFFFF' : '#D5FA5B';
  const muted = '#A2A6A8';
  const timerStart = new Date(props.timerStartMs);
  const timerEnd = new Date(props.timerStartMs + 24 * 60 * 60 * 1000);
  const pauseTime = props.pausedAtMs === null ? undefined : new Date(props.pausedAtMs);
  const status = props.paused ? '일시 정지' : '러닝 중';
  const icon = props.paused ? 'pause.circle.fill' : 'figure.run';

  const timer = (size: number) => (
    <Text
      timerInterval={{ lower: timerStart, upper: timerEnd }}
      countsDown={false}
      pauseTime={pauseTime}
      modifiers={[font({ size, weight: 'bold' }), monospacedDigit(), foregroundStyle('#F4F5F0')]}
    />
  );

  return {
    banner: (
      <HStack
        spacing={12}
        modifiers={[padding({ all: 16 }), activityBackgroundTint('#0C0D0F')]}>
        <VStack alignment="leading" spacing={4}>
          <HStack spacing={6}>
            <Image systemName={icon} color={accent} size={14} />
            <Text modifiers={[font({ size: 13, weight: 'semibold' }), foregroundStyle(accent)]}>
              {`PACE · ${status}`}
            </Text>
          </HStack>
          <Text modifiers={[font({ size: 30, weight: 'heavy' }), monospacedDigit(), foregroundStyle('#F4F5F0')]}>
            {`${props.distanceKm} km`}
          </Text>
        </VStack>
        <Spacer />
        <VStack alignment="trailing" spacing={4}>
          {timer(22)}
          <Text modifiers={[font({ size: 12 }), monospacedDigit(), foregroundStyle(muted)]}>
            {`${props.pace} /km`}
          </Text>
        </VStack>
      </HStack>
    ),
    compactLeading: (
      <HStack spacing={4}>
        <Image systemName={icon} color={accent} size={13} />
        <Text modifiers={[font({ size: 13, weight: 'semibold' }), monospacedDigit(), foregroundStyle(accent)]}>
          {props.distanceKm}
        </Text>
      </HStack>
    ),
    compactTrailing: timer(13),
    minimal: <Image systemName={icon} color={accent} size={13} />,
    expandedLeading: (
      <VStack alignment="leading" spacing={2} modifiers={[padding({ leading: 4 })]}>
        <Text modifiers={[font({ size: 12 }), foregroundStyle(muted)]}>거리</Text>
        <Text modifiers={[font({ size: 24, weight: 'heavy' }), monospacedDigit(), foregroundStyle(accent)]}>
          {`${props.distanceKm} km`}
        </Text>
      </VStack>
    ),
    expandedTrailing: (
      <VStack alignment="trailing" spacing={2} modifiers={[padding({ trailing: 4 })]}>
        <Text modifiers={[font({ size: 12 }), foregroundStyle(muted)]}>시간</Text>
        {timer(24)}
      </VStack>
    ),
    expandedBottom: (
      <HStack modifiers={[padding({ horizontal: 4 })]}>
        <Image systemName={icon} color={accent} size={13} />
        <Text modifiers={[font({ size: 13, weight: 'semibold' }), foregroundStyle(accent)]}>{status}</Text>
        <Spacer />
        <Text modifiers={[font({ size: 13 }), monospacedDigit(), foregroundStyle(muted)]}>
          {`페이스 ${props.pace} /km`}
        </Text>
      </HStack>
    ),
  };
};

export const RunActivity = createLiveActivity<RunActivityProps>('PaceRunActivity', runActivityLayout);
